package skipdetect

import (
	"context"
	"fmt"
	"sort"
)

// crossChunkLen es la ventana (en segundos) que se huella al inicio y al final de
// cada episodio para el matching cross-episodio. Para archivos cortos se acota a
// la mitad de la duración.
const crossChunkLen = 300.0

func chunkLenFor(duration float64) float64 {
	if duration < 600.0 {
		return duration / 2.0
	}
	return crossChunkLen
}

type epFingerprint struct {
	introFP  []int
	outroFP  []int
	duration float64
}

// crossEpisodeScan (Método B) detecta OP/ED comparando la huella de audio de cada
// episodio contra la de sus vecinos: la intro y el outro son el único tramo que se
// repite casi idéntico entre episodios. Solo procesa los episodios en `need` más
// los vecinos que necesita para compararlos. Requiere ≥2 episodios huellados.
func (d *Detector) crossEpisodeScan(ctx context.Context, fpcalcBin string, mediaID int, episodes []episodeFile, need map[int]bool) map[int]detResult {
	byNum := make(map[int]episodeFile, len(episodes))
	for _, ep := range episodes {
		byNum[ep.EpisodeNumber] = ep
	}

	// Conjunto a huellar: cada episodio en `need` y sus vecinos (ep-1, ep+1, ep+2),
	// que son los que se comparan entre sí.
	toFingerprint := make(map[int]bool)
	for epNum := range need {
		toFingerprint[epNum] = true
		for _, n := range neighborsOf(epNum) {
			if _, ok := byNum[n]; ok {
				toFingerprint[n] = true
			}
		}
	}

	fps := make(map[int]*epFingerprint)
	total := len(toFingerprint)
	done := 0
	for epNum := range toFingerprint {
		select {
		case <-ctx.Done():
			return nil
		default:
		}
		ep := byNum[epNum]
		done++
		d.emit(mediaID, "fingerprinting", fmt.Sprintf("Generando huella de audio (episodio %d)...", ep.EpisodeNumber), int(float64(done)/float64(total)*100))

		chunk := chunkLenFor(ep.Duration)
		// Vía ffmpeg con track explícito: este método compara episodios ENTRE SÍ,
		// así que si la autoselección de ffmpeg eligiera un track distinto en cada
		// uno, se compararían idiomas distintos y no habría subsecuencia común.
		introFP, _, err := FingerprintRange(ctx, fpcalcBin, d.ffmpegPath, ep.Path, 0, chunk, ep.AudioIdx)
		if err != nil {
			d.logger.Warn().Err(err).Str("path", ep.Path).Msg("skipdetect: fallo al huellar intro")
			continue
		}
		outroFP, _, err := FingerprintRange(ctx, fpcalcBin, d.ffmpegPath, ep.Path, ep.Duration-chunk, chunk, ep.AudioIdx)
		if err != nil {
			d.logger.Warn().Err(err).Str("path", ep.Path).Msg("skipdetect: fallo al huellar outro")
			continue
		}
		fps[epNum] = &epFingerprint{introFP: introFP, outroFP: outroFP, duration: ep.Duration}
	}

	if len(fps) < 2 {
		return nil
	}

	results := make(map[int]detResult)
	for epNum := range need {
		cur, ok := fps[epNum]
		if !ok {
			continue
		}

		var introStarts, introEnds, outroStarts, outroEnds []float64
		introNeighbors, outroNeighbors := 0, 0

		for _, n := range neighborsOf(epNum) {
			nb, found := fps[n]
			if !found {
				continue
			}
			if mw := CompareFingerprints(cur.introFP, nb.introFP); mw.OK && ValidOpWindow(mw.Start1, mw.End1) {
				introStarts = append(introStarts, mw.Start1)
				introEnds = append(introEnds, mw.End1)
				introNeighbors++
			}
			if mw := CompareFingerprints(cur.outroFP, nb.outroFP); mw.OK {
				chunk := chunkLenFor(cur.duration)
				absStart := (cur.duration - chunk) + mw.Start1
				absEnd := (cur.duration - chunk) + mw.End1
				if ValidEdWindow(absStart, absEnd, cur.duration) {
					outroStarts = append(outroStarts, absStart)
					outroEnds = append(outroEnds, absEnd)
					outroNeighbors++
				}
			}
		}

		var r detResult
		if len(introStarts) > 0 {
			r.OpStart = median(introStarts)
			r.OpEnd = median(introEnds)
			r.Confidence = confidenceFor(introNeighbors)
			r.Source = "fpcross"
		}
		if len(outroStarts) > 0 {
			r.EdOffset = median(outroStarts)
			r.EdEnd = median(outroEnds)
			if r.Source == "" {
				r.Confidence = confidenceFor(outroNeighbors)
				r.Source = "fpcross"
			}
		}
		if r.OpEnd > 0 || r.EdOffset > 0 {
			results[epNum] = r
		}
	}
	return results
}

func neighborsOf(epNum int) []int {
	return []int{epNum - 1, epNum + 1, epNum + 2}
}

func confidenceFor(neighbors int) float64 {
	c := 0.5 + float64(neighbors)*0.15
	if c > 1.0 {
		c = 1.0
	}
	return c
}

// median devuelve la mediana de una copia ordenada de xs (no muta el input).
func median(xs []float64) float64 {
	cp := append([]float64(nil), xs...)
	sort.Float64s(cp)
	return cp[len(cp)/2]
}
