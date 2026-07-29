package skipdetect

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"kamehouse/internal/database/models"
)

// batchMediaID es el mediaId sentinela con el que se emiten los eventos
// SKIP_SCAN_STATUS del scan de biblioteca completa. Los ids reales son siempre
// positivos, así que el frontend puede distinguir el progreso del batch del de
// una serie individual.
const batchMediaID = -1

// perSeriesScanTimeout acota cada serie dentro del batch: una serie trabada
// (archivos en disco lento, ffmpeg colgado) no debe matar el batch entero.
const perSeriesScanTimeout = 30 * time.Minute

type librarySeries struct {
	MediaID int
	Title   string
}

// IsLibraryScanning indica si hay un scan de biblioteca completa en curso.
func (d *Detector) IsLibraryScanning() bool {
	d.batchMu.Lock()
	defer d.batchMu.Unlock()
	return d.batchRunning
}

// ScanLibrary corre la cadena de detección (C → A → B) para todas las series con
// archivos locales, secuencialmente: el fingerprinting es CPU-bound y paralelizar
// series solo alarga la latencia de cada una. Las películas se excluyen (no
// tienen OP/ED). Solo un batch a la vez; los episodios con fuentes protegidas se
// respetan igual que en ScanSeries.
func (d *Detector) ScanLibrary(ctx context.Context) error {
	d.batchMu.Lock()
	if d.batchRunning {
		d.batchMu.Unlock()
		return errors.New("a library-wide skip scan is already in progress")
	}
	d.batchRunning = true
	d.batchMu.Unlock()
	defer func() {
		d.batchMu.Lock()
		d.batchRunning = false
		d.batchMu.Unlock()
	}()

	d.emitBatch("initializing", "Enumerando series de la biblioteca...", -1)

	series, err := d.listLibrarySeries()
	if err != nil {
		d.logger.Error().Err(err).Msg("skipdetect: fallo al enumerar la biblioteca para el scan batch")
		d.emitBatch("error", "Error al enumerar la biblioteca.", -1)
		return err
	}
	if len(series) == 0 {
		d.emitBatch("done", "No hay series con archivos locales para escanear.", 100)
		return nil
	}

	scanned := 0
	for i, s := range series {
		select {
		case <-ctx.Done():
			d.emitBatch("error", "Escaneo de biblioteca cancelado.", -1)
			return ctx.Err()
		default:
		}

		pct := int(float64(i) / float64(len(series)) * 100)
		d.emitBatch("matching", fmt.Sprintf("Serie %d de %d: %s", i+1, len(series), s.Title), pct)

		sCtx, cancel := context.WithTimeout(ctx, perSeriesScanTimeout)
		if err := d.ScanSeries(sCtx, s.MediaID); err != nil {
			// "ya hay un scan en curso" o fallos puntuales de una serie: se loguea
			// y el batch sigue con la siguiente.
			d.logger.Warn().Err(err).Int("mediaId", s.MediaID).Str("title", s.Title).
				Msg("skipdetect: scan de serie falló durante el batch de biblioteca")
		} else {
			scanned++
		}
		cancel()
	}

	d.emitBatch("done", fmt.Sprintf("Biblioteca escaneada: %d de %d series procesadas.", scanned, len(series)), 100)
	return nil
}

func (d *Detector) emitBatch(status, message string, percent int) {
	d.emit(batchMediaID, status, message, percent)
}

// listLibrarySeries enumera las series (no películas) con archivos locales,
// resolviendo el título vía library_media para los mensajes de progreso.
func (d *Detector) listLibrarySeries() ([]librarySeries, error) {
	type ref struct {
		MediaID        int
		LibraryMediaId uint
	}
	var refs []ref
	if err := d.db.Gorm().Model(&models.LocalFile{}).
		Select("media_id, library_media_id").
		Where("media_id > 0").
		Group("media_id, library_media_id").
		Scan(&refs).Error; err != nil {
		return nil, err
	}

	// media_id → un library_media_id > 0 (si existe) para resolver tipo y título.
	lmByMedia := make(map[int]uint, len(refs))
	for _, r := range refs {
		if cur, ok := lmByMedia[r.MediaID]; !ok || cur == 0 {
			lmByMedia[r.MediaID] = r.LibraryMediaId
		}
	}

	var lmIDs []uint
	for _, id := range lmByMedia {
		if id > 0 {
			lmIDs = append(lmIDs, id)
		}
	}
	lms := make(map[uint]models.LibraryMedia, len(lmIDs))
	if len(lmIDs) > 0 {
		var rows []models.LibraryMedia
		if err := d.db.Gorm().Where("id IN ?", lmIDs).Find(&rows).Error; err != nil {
			return nil, err
		}
		for _, lm := range rows {
			lms[lm.ID] = lm
		}
	}

	out := make([]librarySeries, 0, len(lmByMedia))
	for mediaID, lmID := range lmByMedia {
		title := fmt.Sprintf("media %d", mediaID)
		if lm, ok := lms[lmID]; ok {
			if strings.EqualFold(lm.Type, "MOVIE") || strings.EqualFold(lm.Format, "MOVIE") {
				continue // las películas no tienen OP/ED que detectar
			}
			switch {
			case lm.TitleSpanish != "":
				title = lm.TitleSpanish
			case lm.TitleEnglish != "":
				title = lm.TitleEnglish
			case lm.TitleRomaji != "":
				title = lm.TitleRomaji
			case lm.TitleOriginal != "":
				title = lm.TitleOriginal
			}
		}
		out = append(out, librarySeries{MediaID: mediaID, Title: title})
	}

	sort.Slice(out, func(i, j int) bool { return out[i].MediaID < out[j].MediaID })
	return out, nil
}
