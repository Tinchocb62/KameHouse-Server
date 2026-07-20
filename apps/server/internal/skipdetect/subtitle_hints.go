package skipdetect

import (
	"bufio"
	"context"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

	"kamehouse/internal/mediastream/videofile"
)

// Parámetros del Método C.
const (
	subOpZoneSec       = 360.0 // primeros 6 min: zona donde puede empezar la OP
	subEdZoneSec       = 480.0 // últimos 8 min: zona del ED
	subClusterMergeGap = 20.0  // eventos de karaoke a <=20s se funden (tolera pausas instrumentales)
	subMinDialogueGap  = 60.0  // hueco de diálogo >=60s = probable OP
	subMaxOnDemand     = 2     // máx. episodios a extraer subs on-demand por scan (control de costo)
	subOverlapBoost    = 0.10  // +confianza cuando un hint corrobora una ventana A/B
	subStandaloneConf  = 0.60  // confianza de una fila derivada solo de subtítulos
)

// karaokeStyleRe detecta estilos/effects de OP/ED por nombre.
var karaokeStyleRe = regexp.MustCompile(`(?i)\b(op|ed|opening|ending|kara|karaoke|song|insert)\b`)

// karaokeTagRe detecta tags de karaoke en el texto de un evento (\k, \kf, \ko, \K).
var karaokeTagRe = regexp.MustCompile(`\\[kK][fo]?\d`)

// SubHint son pistas de intro/outro extraídas de los subtítulos ASS de un
// episodio: ventanas directas (bloques de karaoke con estilo OP/ED) y un hueco
// de diálogo largo que suele coincidir con la OP. Cada ventana es [start, end]
// en segundos, o nil si no se detectó.
type SubHint struct {
	OpWindow  *[2]float64
	EdWindow  *[2]float64
	GapWindow *[2]float64
}

type assEvent struct {
	start, end  float64
	style, text string
	effect      string
	isKaraoke   bool
}

// subtitleHints (Método C) parsea los .ass de cada episodio para obtener pistas
// de OP/ED. Usa subs ya extraídos en cache; si faltan y hay fileCacher, los
// extrae on-demand para hasta subMaxOnDemand episodios (control de costo).
func (d *Detector) subtitleHints(ctx context.Context, episodes []episodeFile) map[int]SubHint {
	out := make(map[int]SubHint)
	onDemandUsed := 0

	for _, ep := range episodes {
		select {
		case <-ctx.Done():
			return out
		default:
		}

		assPath := d.locateASS(ep.Path)
		if assPath == "" && d.fileCacher != nil && onDemandUsed < subMaxOnDemand {
			if d.extractSubsOnDemand(ep.Path) {
				onDemandUsed++
				assPath = d.locateASS(ep.Path)
			} else {
				onDemandUsed++ // contá el intento aunque falle, para acotar el costo
			}
		}
		if assPath == "" {
			continue
		}

		f, err := os.Open(assPath)
		if err != nil {
			continue
		}
		hint := ParseASSHints(f, ep.Duration)
		f.Close()

		if hint.OpWindow != nil || hint.EdWindow != nil || hint.GapWindow != nil {
			out[ep.EpisodeNumber] = hint
		}
	}
	return out
}

// locateASS devuelve la ruta del primer .ass extraído para el archivo, o "".
func (d *Detector) locateASS(videoPath string) string {
	hash, err := videofile.GetHashFromPath(videoPath)
	if err != nil {
		return ""
	}
	subsDir := videofile.GetFileSubsCacheDir(d.cacheDir, hash)
	matches, err := filepath.Glob(filepath.Join(subsDir, "*.ass"))
	if err != nil || len(matches) == 0 {
		return ""
	}
	return matches[0]
}

// extractSubsOnDemand corre la extracción de attachments (subs) para un archivo
// que nunca se reprodujo. Devuelve true si se ejecutó sin error.
func (d *Detector) extractSubsOnDemand(videoPath string) bool {
	hash, err := videofile.GetHashFromPath(videoPath)
	if err != nil {
		return false
	}
	extractor := videofile.NewMediaInfoExtractor(d.fileCacher, d.logger)
	mi, err := extractor.GetInfo(d.ffprobePath, videoPath)
	if err != nil {
		return false
	}
	if err := videofile.ExtractAttachment(d.ffmpegPath, videoPath, hash, mi, d.cacheDir, d.logger); err != nil {
		d.logger.Debug().Err(err).Str("path", videoPath).Msg("skipdetect: extracción on-demand de subs falló")
		return false
	}
	return true
}

// ParseASSHints parsea el bloque [Events] de un subtítulo ASS y devuelve pistas
// de OP/ED: ventanas directas a partir de clusters de karaoke, y un hueco de
// diálogo largo en los primeros minutos (probable OP).
func ParseASSHints(r io.Reader, fileDur float64) SubHint {
	events := parseASSEvents(r)
	var hint SubHint

	// Ventana directa por clusters de karaoke, clasificada por posición.
	var karaoke []assEvent
	for _, e := range events {
		if e.isKaraoke {
			karaoke = append(karaoke, e)
		}
	}
	if op := spanOf(filterZone(karaoke, 0, subOpZoneSec)); op != nil {
		hint.OpWindow = op
	}
	if fileDur > 0 {
		if ed := spanOf(filterZone(karaoke, fileDur-subEdZoneSec, fileDur)); ed != nil {
			hint.EdWindow = ed
		}
	}

	// Hueco de diálogo: buscar >=60s sin diálogo (no-karaoke) en los primeros 8 min.
	hint.GapWindow = dialogueGap(events, subEdZoneSec)

	return hint
}

func parseASSEvents(r io.Reader) []assEvent {
	var events []assEvent
	scanner := bufio.NewScanner(r)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)

	inEvents := false
	var idxStart, idxEnd, idxStyle, idxEffect, idxText, nfields int
	idxStart, idxEnd, idxStyle, idxEffect, idxText = -1, -1, -1, -1, -1

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if strings.HasPrefix(line, "[") {
			inEvents = strings.EqualFold(line, "[Events]")
			continue
		}
		if !inEvents {
			continue
		}
		if strings.HasPrefix(line, "Format:") {
			cols := strings.Split(strings.TrimSpace(line[len("Format:"):]), ",")
			nfields = len(cols)
			for i, c := range cols {
				switch strings.ToLower(strings.TrimSpace(c)) {
				case "start":
					idxStart = i
				case "end":
					idxEnd = i
				case "style":
					idxStyle = i
				case "effect":
					idxEffect = i
				case "text":
					idxText = i
				}
			}
			continue
		}
		if !strings.HasPrefix(line, "Dialogue:") {
			continue
		}
		if idxStart < 0 || idxEnd < 0 || idxText < 0 {
			continue
		}

		// Text es el último campo y puede contener comas → split acotado a nfields.
		body := strings.TrimSpace(line[len("Dialogue:"):])
		parts := strings.SplitN(body, ",", nfields)
		if len(parts) < nfields {
			continue
		}

		start, ok1 := parseASSTime(parts[idxStart])
		end, ok2 := parseASSTime(parts[idxEnd])
		if !ok1 || !ok2 {
			continue
		}
		ev := assEvent{start: start, end: end, text: parts[idxText]}
		if idxStyle >= 0 && idxStyle < len(parts) {
			ev.style = parts[idxStyle]
		}
		if idxEffect >= 0 && idxEffect < len(parts) {
			ev.effect = parts[idxEffect]
		}
		ev.isKaraoke = karaokeStyleRe.MatchString(ev.style) ||
			karaokeStyleRe.MatchString(ev.effect) ||
			karaokeTagRe.MatchString(ev.text)
		events = append(events, ev)
	}
	return events
}

// parseASSTime convierte "H:MM:SS.cc" a segundos.
func parseASSTime(s string) (float64, bool) {
	s = strings.TrimSpace(s)
	parts := strings.Split(s, ":")
	if len(parts) != 3 {
		return 0, false
	}
	h, err1 := strconv.Atoi(parts[0])
	m, err2 := strconv.Atoi(parts[1])
	sec, err3 := strconv.ParseFloat(parts[2], 64)
	if err1 != nil || err2 != nil || err3 != nil {
		return 0, false
	}
	return float64(h)*3600 + float64(m)*60 + sec, true
}

// filterZone devuelve los eventos cuyo inicio cae dentro de [lo, hi].
func filterZone(events []assEvent, lo, hi float64) []assEvent {
	var out []assEvent
	for _, e := range events {
		if e.start >= lo && e.start <= hi {
			out = append(out, e)
		}
	}
	return out
}

// spanOf devuelve el rango [min start, max end] del cluster contiguo más largo
// (por span temporal) de una serie de eventos, fundiendo los separados por
// <=subClusterMergeGap. A diferencia de tomar el min/max global, esto descarta un
// evento suelto muy alejado (p. ej. un insert-song aislado) sin inflar la
// ventana. La OP/ED real es un bloque de karaoke contiguo, así que su span cae
// naturalmente en un solo cluster. Devuelve nil si no hay eventos.
func spanOf(events []assEvent) *[2]float64 {
	if len(events) == 0 {
		return nil
	}
	sortByStart(events)

	var best *[2]float64
	bestSpan := -1.0
	clusterStart := events[0].start
	clusterEnd := events[0].end
	flush := func() {
		if span := clusterEnd - clusterStart; span > bestSpan {
			bestSpan = span
			w := [2]float64{clusterStart, clusterEnd}
			best = &w
		}
	}
	for _, e := range events[1:] {
		if e.start-clusterEnd <= subClusterMergeGap {
			if e.end > clusterEnd {
				clusterEnd = e.end
			}
		} else {
			flush()
			clusterStart = e.start
			clusterEnd = e.end
		}
	}
	flush()
	return best
}

// dialogueGap busca el mayor hueco (>=subMinDialogueGap) sin diálogo no-karaoke
// dentro de [0, zoneSec]. Devuelve la ventana del hueco, o nil.
func dialogueGap(events []assEvent, zoneSec float64) *[2]float64 {
	var dlg []assEvent
	for _, e := range events {
		if !e.isKaraoke && e.start <= zoneSec {
			dlg = append(dlg, e)
		}
	}
	if len(dlg) == 0 {
		return nil
	}
	sortByStart(dlg)

	var best *[2]float64
	bestGap := subMinDialogueGap
	prevEnd := 0.0
	for _, e := range dlg {
		if gap := e.start - prevEnd; gap >= bestGap {
			bestGap = gap
			w := [2]float64{prevEnd, e.start}
			best = &w
		}
		if e.end > prevEnd {
			prevEnd = e.end
		}
	}
	return best
}

func sortByStart(events []assEvent) {
	for i := 1; i < len(events); i++ {
		for j := i; j > 0 && events[j].start < events[j-1].start; j-- {
			events[j], events[j-1] = events[j-1], events[j]
		}
	}
}

// mergeSubtitleHints corrobora/refina los resultados de A/B con los hints, y
// agrega filas "subtitle" para episodios sin otro resultado pero con una ventana
// directa de OP válida.
func (d *Detector) mergeSubtitleHints(results map[int]detResult, hints map[int]SubHint, episodes []episodeFile) {
	byNum := make(map[int]episodeFile, len(episodes))
	for _, ep := range episodes {
		byNum[ep.EpisodeNumber] = ep
	}

	for epNum, hint := range hints {
		if r, has := results[epNum]; has {
			// Corroboración: si un hint solapa la ventana OP de A/B, sube confianza.
			if r.OpEnd > 0 {
				opHint := hint.OpWindow
				if opHint == nil {
					opHint = hint.GapWindow
				}
				if opHint != nil && overlapFraction(r.OpStart, r.OpEnd, opHint[0], opHint[1]) >= 0.70 {
					r.Confidence = capConf(r.Confidence + subOverlapBoost)
					results[epNum] = r
				}
			}
			continue
		}

		// Sin resultado A/B: derivar fila directa desde la ventana OP de subtítulos.
		if hint.OpWindow != nil && ValidOpWindow(hint.OpWindow[0], hint.OpWindow[1]) {
			r := detResult{
				OpStart:    hint.OpWindow[0],
				OpEnd:      hint.OpWindow[1],
				Confidence: subStandaloneConf,
				Source:     "subtitle",
			}
			if hint.EdWindow != nil {
				if ep, ok := byNum[epNum]; ok && ValidEdWindow(hint.EdWindow[0], hint.EdWindow[1], ep.Duration) {
					r.EdOffset = hint.EdWindow[0]
					r.EdEnd = hint.EdWindow[1]
				}
			}
			results[epNum] = r
		}
	}
}

// overlapFraction devuelve la fracción de [aStart,aEnd] cubierta por [bStart,bEnd].
func overlapFraction(aStart, aEnd, bStart, bEnd float64) float64 {
	lo := aStart
	if bStart > lo {
		lo = bStart
	}
	hi := aEnd
	if bEnd < hi {
		hi = bEnd
	}
	ov := hi - lo
	if ov <= 0 {
		return 0
	}
	span := aEnd - aStart
	if span <= 0 {
		return 0
	}
	return ov / span
}

func capConf(c float64) float64 {
	if c > 1.0 {
		return 1.0
	}
	return c
}
