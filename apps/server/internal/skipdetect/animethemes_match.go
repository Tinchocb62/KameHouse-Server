package skipdetect

import (
	"context"
	"path/filepath"
	"strconv"
	"strings"
)

// Parámetros de aceptación del matching contra AnimeThemes.
const (
	athEpisodeProbeSec = 390.0 // ventana del episodio que se huella para buscar la OP (primeros 6.5 min)
	athOutroProbeSec   = 480.0 // ventana del final que se huella para buscar el ED (últimos 8 min)
	// athMinCoverage es la fracción del theme que debe aparecer en el episodio.
	// Estaba en 0.60 y rechazaba EDs reales cuando el episodio solapa narración
	// (el avance del próximo capítulo) sobre el tramo final del tema: ahí el
	// fingerprint diverge y la coincidencia queda corta aunque el ED esté entero.
	// Los eps 4-60 de Dragon Ball Z son un corte distinto (1452 s vs 1479 s) y dan
	// 55.5 s de los 97.2 s del ED (0.57) con score 1.00 y arrancando en 1352.3, o
	// sea exactamente donde arranca en los episodios que sí pasaban: perdían por
	// 2.8 s. Bajar a 0.50 los recupera sin abrir la puerta a falsos: un theme
	// ajeno ni siquiera produce ventana (da OK=false), y siguen actuando
	// minMatchedSeconds, athMinScore y ValidOpWindow/ValidEdWindow.
	athMinCoverage = 0.50
	// athMinScore es la densidad mínima del match. Estaba en 0.55 y descartaba
	// positivos verdaderos sin aportar protección: medido contra la librería, un
	// theme que NO está en el episodio no da score bajo, da OK=false y score 0.00
	// (CompareFingerprints ya lo corta antes con minPeakMatches/minDensity/
	// minMatchedSeconds). No hay falsos positivos entre 0.00 y 0.52 contra los que
	// defenderse. En cambio, másters de audio ruidosos sí caen ahí: los eps 1-22 de
	// Dragon Ball GT dan 0.52 con el OP arrancando en 0.0 y 94% de cobertura —
	// match indiscutible que 0.55 tiraba a la basura. Las barreras reales son la
	// cobertura (athMinCoverage) y ValidOpWindow/ValidEdWindow.
	athMinScore = 0.40
	athMatchED  = true // habilita el matching de endings
)

type themeFingerprint struct {
	fp  []int
	dur float64
}

// animeThemesScan (Método A) ubica la OP/ED de cada episodio correlacionando el
// audio oficial del theme (AnimeThemes) contra el episodio. Funciona por episodio
// individual (no necesita la temporada completa) y no se confunde con recaps.
func (d *Detector) animeThemesScan(ctx context.Context, fpcalcBin string, malID int, episodes []episodeFile, need map[int]bool) map[int]detResult {
	themes, err := d.athClient.GetThemesByMALID(ctx, malID)
	if err != nil {
		d.logger.Warn().Err(err).Int("malId", malID).Msg("skipdetect: fallo al consultar AnimeThemes")
		return nil
	}
	if len(themes) == 0 {
		return nil
	}

	var opThemes, edThemes []Theme
	for _, t := range themes {
		switch strings.ToUpper(t.Type) {
		case "OP":
			opThemes = append(opThemes, t)
		case "ED":
			edThemes = append(edThemes, t)
		}
	}

	byNum := make(map[int]episodeFile, len(episodes))
	for _, ep := range episodes {
		byNum[ep.EpisodeNumber] = ep
	}

	// Cache de fingerprints de themes por URL de audio (dedupe de descargas).
	fpCache := make(map[string]*themeFingerprint)
	themeFP := func(t Theme) *themeFingerprint {
		if tf, ok := fpCache[t.AudioURL]; ok {
			return tf
		}
		dest := filepath.Join(d.cacheDir, "animethemes", strconv.Itoa(malID), t.Slug+".ogg")
		if err := d.athClient.DownloadAudio(ctx, t.AudioURL, dest); err != nil {
			d.logger.Warn().Err(err).Str("url", t.AudioURL).Msg("skipdetect: fallo al descargar audio de theme")
			fpCache[t.AudioURL] = nil
			return nil
		}
		fp, dur, err := FingerprintFile(ctx, fpcalcBin, dest, 0)
		if err != nil {
			d.logger.Warn().Err(err).Str("path", dest).Msg("skipdetect: fallo al huellar theme")
			fpCache[t.AudioURL] = nil
			return nil
		}
		tf := &themeFingerprint{fp: fp, dur: dur}
		fpCache[t.AudioURL] = tf
		return tf
	}

	results := make(map[int]detResult)
	for epNum := range need {
		select {
		case <-ctx.Done():
			return results
		default:
		}
		ep, ok := byNum[epNum]
		if !ok {
			continue
		}

		var r detResult

		// ── OP ──
		// Vía ffmpeg (no fpcalc directo) porque fpcalc no sabe elegir track de
		// audio y en archivos multi-audio hay que huellar el japonés.
		if epFP, _, err := FingerprintRange(ctx, fpcalcBin, d.ffmpegPath, ep.Path, 0, athEpisodeProbeSec, ep.AudioIdx); err == nil {
			if start, end, score, ok := bestThemeMatch(epFP, 0, opThemes, epNum, themeFP); ok && ValidOpWindow(start, end) {
				r.OpStart = start
				r.OpEnd = end
				r.Confidence = athConfidence(score)
				r.Source = "animethemes"
			}
		}

		// ── ED ──
		if athMatchED && len(edThemes) > 0 {
			windowStart := ep.Duration - athOutroProbeSec
			if edFP, _, err := FingerprintRange(ctx, fpcalcBin, d.ffmpegPath, ep.Path, windowStart, athOutroProbeSec, ep.AudioIdx); err == nil {
				if start, end, score, ok := bestThemeMatch(edFP, windowStart, edThemes, epNum, themeFP); ok && ValidEdWindow(start, end, ep.Duration) {
					r.EdOffset = start
					r.EdEnd = end
					if r.Source == "" {
						r.Confidence = athConfidence(score)
						r.Source = "animethemes"
					}
				}
			}
		}

		if r.OpEnd > 0 || r.EdOffset > 0 {
			results[epNum] = r
		}
	}
	return results
}

// bestThemeMatch compara el fingerprint del episodio contra todos los themes
// candidatos (cuyo rango de episodios incluye epNum) y devuelve la mejor ventana
// absoluta (start/end en segundos del archivo, sumando windowOffset) y su score.
// Alinea el theme sobre el episodio vía Start1-Start2 y usa la duración del theme
// como largo de la ventana (ground truth más preciso que el borde del match).
func bestThemeMatch(epFP []int, windowOffset float64, themes []Theme, epNum int, themeFP func(Theme) *themeFingerprint) (start, end, score float64, ok bool) {
	bestScore := -1.0
	for _, t := range themes {
		if !episodeInRange(t.Episodes, epNum) {
			continue
		}
		tf := themeFP(t)
		if tf == nil || tf.dur <= 0 {
			continue
		}
		mw := CompareFingerprints(epFP, tf.fp)
		if !mw.OK || mw.MatchedSeconds < athMinCoverage*tf.dur || mw.Score < athMinScore {
			continue
		}
		s := mw.Start1 - mw.Start2 // alinear el inicio del theme sobre el episodio
		if s < 0 {
			s = 0
		}
		if mw.Score > bestScore {
			bestScore = mw.Score
			start = windowOffset + s
			end = windowOffset + s + tf.dur
			score = mw.Score
			ok = true
		}
	}
	return start, end, score, ok
}

func athConfidence(score float64) float64 {
	c := 0.75 + 0.25*score
	if c > 1.0 {
		c = 1.0
	}
	return c
}

// episodeInRange indica si epNum cae dentro del rango de episodios de un entry de
// AnimeThemes. Formatos: "" (todos), "1", "1-101", "1, 3-5". Un rango vacío o no
// parseable se interpreta como "aplica a todos" (permisivo: el fingerprint es la
// barrera real).
func episodeInRange(spec string, epNum int) bool {
	spec = strings.TrimSpace(spec)
	if spec == "" {
		return true
	}
	matchedAny := false
	for _, part := range strings.Split(spec, ",") {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		if lo, hi, err := parseRangePart(part); err == nil {
			matchedAny = true
			if epNum >= lo && epNum <= hi {
				return true
			}
		}
	}
	// Si el spec traía tokens pero ninguno parseó, no lo descartamos.
	return !matchedAny
}

func parseRangePart(part string) (lo, hi int, err error) {
	if idx := strings.Index(part, "-"); idx > 0 {
		lo, err = strconv.Atoi(strings.TrimSpace(part[:idx]))
		if err != nil {
			return 0, 0, err
		}
		hi, err = strconv.Atoi(strings.TrimSpace(part[idx+1:]))
		if err != nil {
			return 0, 0, err
		}
		if hi < lo {
			lo, hi = hi, lo
		}
		return lo, hi, nil
	}
	n, err := strconv.Atoi(part)
	if err != nil {
		return 0, 0, err
	}
	return n, n, nil
}
