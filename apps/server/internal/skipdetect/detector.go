package skipdetect

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/rs/zerolog"
	ffprobe "gopkg.in/vansante/go-ffprobe.v2"
	"gorm.io/gorm/clause"

	"kamehouse/internal/database/db"
	"kamehouse/internal/database/models"
	"kamehouse/internal/events"
	"kamehouse/internal/util/filecache"
)

// protectedSources son las fuentes de skip times que NUNCA se sobrescriben con
// una detección automática: marcas manuales del usuario y resultados previos de
// AnimeThemes (ya medidos sobre el archivo real). El scan reemplaza filas de baja
// confianza (heuristic/propagated/fpcross/subtitle) o episodios sin fila.
//
// "aniskip" es un caso intermedio: son marcas de la comunidad tomadas sobre OTRA
// release (broadcast TV, otro corte), así que pueden venir corridas segundos
// respecto de los archivos del usuario. Solo el Método A (AnimeThemes, medido
// sobre el archivo real) puede reemplazarlas; B y C no las tocan. Ver buildRows.
var protectedSources = map[string]bool{
	"manual":      true,
	"animethemes": true,
}

// detResult es el resultado de detección para un episodio, listo para persistir.
type detResult struct {
	OpStart, OpEnd  float64
	EdOffset, EdEnd float64
	Confidence      float64
	Source          string
}

// episodeFile es un episodio local con su duración y su track de audio resueltos.
type episodeFile struct {
	Path          string
	EpisodeNumber int
	Duration      float64
	// AudioIdx es el track de audio a huellar (índice relativo, `-map 0:a:N`).
	// -1 = dejar que ffmpeg elija.
	AudioIdx int
}

// japaneseLangTags son las etiquetas de idioma con las que un track japonés
// puede venir marcado en un contenedor.
var japaneseLangTags = map[string]bool{"jpn": true, "ja": true, "jp": true, "japanese": true}

// preferredAudioIndex devuelve el track de audio que conviene huellar: el
// japonés si el archivo tiene uno, o -1 para dejar elegir a ffmpeg.
//
// La referencia de AnimeThemes es SIEMPRE el audio japonés original, pero los
// dubs suelen re-grabar la OP/ED en su idioma: el track latino de Dragon Ball Z
// y GT tiene los openings cantados en español y no matchea nunca (GT hasta
// rotula un track como "Opening y Endings [Traducidos]"). Encima, la elección
// automática de ffmpeg no es estable ni entre episodios de la misma serie, así
// que sin esto el Método A daba resultados no deterministas.
func preferredAudioIndex(ctx context.Context, path string) int {
	probeCtx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()

	data, err := ffprobe.ProbeURL(probeCtx, path)
	if err != nil {
		return -1
	}

	audioIdx := 0
	for _, s := range data.Streams {
		if s.CodecType != "audio" {
			continue
		}
		if japaneseLangTags[strings.ToLower(strings.TrimSpace(s.Tags.Language))] {
			return audioIdx
		}
		audioIdx++
	}
	return -1
}

// Detector orquesta la cadena de detección de intros/outros para una serie.
type Detector struct {
	db          *db.Database
	logger      *zerolog.Logger
	ws          events.WSEventManagerInterface
	cacheDir    string
	ffmpegPath  string
	ffprobePath string

	scanMu     sync.Mutex
	isScanning map[int]bool

	batchMu      sync.Mutex
	batchRunning bool // scan de biblioteca completa en curso (uno a la vez)

	attemptedMu sync.Mutex
	attempted   map[int]bool // trigger oportunista: máx. una vez por media por run

	athClient  AnimeThemesClient // Método A (puede ser nil → cae a Método B)
	fileCacher *filecache.Cacher // Método C: extracción on-demand de subs (puede ser nil)
}

// AnimeThemesClient es el subconjunto del cliente de AnimeThemes que el detector
// necesita. Se define como interfaz para no acoplar el paquete al cliente HTTP
// concreto y poder testear el orquestador con un fake.
type AnimeThemesClient interface {
	GetThemesByMALID(ctx context.Context, malID int) ([]Theme, error)
	DownloadAudio(ctx context.Context, url, destPath string) error
}

// New construye un Detector. ffmpegPath/ffprobePath caen a los binarios del PATH
// si vienen vacíos. athClient puede ser nil (la cadena arranca en Método B).
// fileCacher puede ser nil (Método C solo usa subs ya extraídos, sin on-demand).
func New(database *db.Database, logger *zerolog.Logger, ws events.WSEventManagerInterface, cacheDir, ffmpegPath, ffprobePath string, athClient AnimeThemesClient, fileCacher *filecache.Cacher) *Detector {
	if ffmpegPath == "" {
		ffmpegPath = "ffmpeg"
	}
	if ffprobePath == "" {
		ffprobePath = "ffprobe"
	}
	return &Detector{
		db:          database,
		logger:      logger,
		ws:          ws,
		cacheDir:    cacheDir,
		ffmpegPath:  ffmpegPath,
		ffprobePath: ffprobePath,
		isScanning:  make(map[int]bool),
		attempted:   make(map[int]bool),
		athClient:   athClient,
		fileCacher:  fileCacher,
	}
}

func (d *Detector) setScanning(mediaID int, scanning bool) {
	d.scanMu.Lock()
	defer d.scanMu.Unlock()
	d.isScanning[mediaID] = scanning
}

// IsScanning indica si ya hay un scan en curso para esta serie.
func (d *Detector) IsScanning(mediaID int) bool {
	d.scanMu.Lock()
	defer d.scanMu.Unlock()
	return d.isScanning[mediaID]
}

// MarkAttemptedOnce devuelve true la primera vez que se llama para un mediaID y
// false en las siguientes. Lo usa el trigger oportunista para lanzar un scan de
// fondo una sola vez por serie por run del servidor.
func (d *Detector) MarkAttemptedOnce(mediaID int) bool {
	d.attemptedMu.Lock()
	defer d.attemptedMu.Unlock()
	if d.attempted[mediaID] {
		return false
	}
	d.attempted[mediaID] = true
	return true
}

func (d *Detector) emit(mediaID int, status, message string, percent int) {
	payload := map[string]any{
		"mediaId": mediaID,
		"status":  status,
		"message": message,
	}
	if percent >= 0 {
		payload["percent"] = percent
	}
	d.ws.SendEvent("SKIP_SCAN_STATUS", payload)
}

// ScanSeries detecta y persiste skip times para todos los episodios locales de
// mediaID. Cadena: (C hints ASS) → (A AnimeThemes) → (B cross-episodio). No pisa
// fuentes protegidas (manual/animethemes); las filas aniskip solo ceden ante el
// Método A. Emite eventos SKIP_SCAN_STATUS.
func (d *Detector) ScanSeries(ctx context.Context, mediaID int) error {
	if d.IsScanning(mediaID) {
		return errors.New("a skip scan is already in progress for this series")
	}
	d.setScanning(mediaID, true)
	defer d.setScanning(mediaID, false)

	d.emit(mediaID, "initializing", "Iniciando escaneo de marcas de skip...", -1)

	fpcalcBin, err := EnsureFpcalcBinary(d.cacheDir, d.logger)
	if err != nil {
		d.logger.Error().Err(err).Msg("skipdetect: no se pudo asegurar el binario fpcalc")
		d.emit(mediaID, "error", "Error al descargar fpcalc: "+err.Error(), -1)
		return err
	}

	episodes, malID, err := d.loadEpisodes(ctx, mediaID)
	if err != nil {
		d.emit(mediaID, "error", "Error al cargar episodios de la serie.", -1)
		return err
	}
	if len(episodes) == 0 {
		d.emit(mediaID, "done", "No hay episodios locales para escanear.", -1)
		return nil
	}

	// Episodios que necesitan detección: sin fila o con fuente de baja confianza.
	// Las filas "aniskip" van en un set aparte: solo el Método A puede mejorarlas.
	existing := d.existingSkipTimes(mediaID)
	need := make(map[int]bool)
	aniskipOnly := make(map[int]bool)
	for _, ep := range episodes {
		row, has := existing[ep.EpisodeNumber]
		switch {
		case !has || (!protectedSources[row.Source] && row.Source != "aniskip"):
			need[ep.EpisodeNumber] = true
		case row.Source == "aniskip":
			aniskipOnly[ep.EpisodeNumber] = true
		}
	}
	if len(need) == 0 && len(aniskipOnly) == 0 {
		d.emit(mediaID, "done", "Todos los episodios ya tienen marcas confiables.", -1)
		return nil
	}

	results := make(map[int]detResult)

	// Método C: hints de subtítulos (pre-pass, corrigen/corroboran A y B).
	hints := d.subtitleHints(ctx, episodes)

	// Método A: AnimeThemes (primario). Resuelve episodios y los quita de `need`.
	// También reintenta los episodios con marcas aniskip: si el theme oficial
	// matchea sobre el archivo real, esa medición reemplaza a la de la comunidad.
	if d.athClient != nil && malID > 0 {
		d.emit(mediaID, "matching", "Buscando openings/endings oficiales (AnimeThemes)...", -1)
		needA := make(map[int]bool, len(need)+len(aniskipOnly))
		for ep := range need {
			needA[ep] = true
		}
		for ep := range aniskipOnly {
			needA[ep] = true
		}
		aResults := d.animeThemesScan(ctx, fpcalcBin, malID, episodes, needA)
		for ep, r := range aResults {
			results[ep] = r
			delete(need, ep)
		}
	}

	// Método B: cross-episodio (fallback) sobre lo que quedó en `need`.
	if len(need) > 0 {
		bResults := d.crossEpisodeScan(ctx, fpcalcBin, mediaID, episodes, need)
		for ep, r := range bResults {
			if _, taken := results[ep]; !taken {
				results[ep] = r
			}
		}
	}

	// Merge con hints C: corroboración (+confianza) o fila directa "subtitle".
	d.mergeSubtitleHints(results, hints, episodes)

	rows := d.buildRows(mediaID, results, existing)
	if len(rows) > 0 {
		if err := d.db.Gorm().Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "media_id"}, {Name: "episode_number"}},
			DoUpdates: clause.AssignmentColumns([]string{"op_start", "op_end", "ed_offset", "ed_end", "source", "confidence"}),
		}).Create(&rows).Error; err != nil {
			d.logger.Error().Err(err).Msg("skipdetect: fallo al guardar skip times detectados")
			d.emit(mediaID, "error", "Error al guardar los resultados en la base de datos.", -1)
			return err
		}
	}

	d.ws.SendEvent("invalidate-queries", map[string]any{"queryKeys": []string{"skip-times"}})
	d.emit(mediaID, "done", fmt.Sprintf("Escaneo completado. Se detectaron marcas para %d episodios.", len(rows)), 100)
	return nil
}

// loadEpisodes carga los episodios locales de la serie con su duración resuelta
// (TechnicalInfo o ffprobe como fallback) y el MAL id de la serie si existe.
func (d *Detector) loadEpisodes(ctx context.Context, mediaID int) ([]episodeFile, int, error) {
	localFiles, err := db.GetLocalFilesByMediaID(d.db, mediaID)
	if err != nil {
		return nil, 0, err
	}

	ffprobe.SetFFProbeBinPath(d.ffprobePath)

	var episodes []episodeFile
	for _, lf := range localFiles {
		epNum := lf.GetEpisodeNumber()
		if epNum <= 0 {
			continue
		}
		var duration float64
		if lf.TechnicalInfo != nil {
			duration = lf.TechnicalInfo.Duration.Seconds()
		}
		if duration == 0 {
			probeCtx, cancel := context.WithTimeout(ctx, 15*time.Second)
			if data, perr := ffprobe.ProbeURL(probeCtx, lf.Path); perr == nil {
				duration = data.Format.DurationSeconds
			}
			cancel()
		}
		if duration == 0 {
			duration = 1440.0 // default 24 min si el probe falla
		}
		// El layout de tracks cambia entre series (y no se puede asumir dentro de
		// una), así que se resuelve por archivo.
		episodes = append(episodes, episodeFile{
			Path:          lf.Path,
			EpisodeNumber: epNum,
			Duration:      duration,
			AudioIdx:      preferredAudioIndex(ctx, lf.Path),
		})
	}

	sort.Slice(episodes, func(i, j int) bool {
		return episodes[i].EpisodeNumber < episodes[j].EpisodeNumber
	})

	// mediaID es el id externo (derivado de TMDB) con el que se indexan
	// local_file.media_id y episode_skip_times.media_id, NO la PK de
	// library_media: los dos espacios de ids no se solapan, así que buscar
	// `library_media.id = mediaID` nunca encuentra la serie y dejaba malID en 0
	// (lo que desactivaba silenciosamente el Método A). Resolvemos la serie por
	// la FK que ya traen los archivos, que vale igual para series y para
	// películas (cuyo id externo va prefijado) sin depender de esa convención.
	var libraryMediaID uint
	for _, lf := range localFiles {
		if lf.LibraryMediaId > 0 {
			libraryMediaID = lf.LibraryMediaId
			break
		}
	}

	var malID int
	if libraryMediaID > 0 {
		var lm models.LibraryMedia
		if err := d.db.Gorm().Where("id = ?", libraryMediaID).First(&lm).Error; err == nil {
			malID = lm.MyanimelistId
		}
	}
	if malID <= 0 {
		d.logger.Warn().Int("mediaId", mediaID).Uint("libraryMediaId", libraryMediaID).
			Msg("skipdetect: sin MAL id para la serie; se omite el Método A (AnimeThemes)")
	}

	return episodes, malID, nil
}

func (d *Detector) existingSkipTimes(mediaID int) map[int]models.EpisodeSkipTime {
	var rows []models.EpisodeSkipTime
	_ = d.db.Gorm().Where("media_id = ?", mediaID).Find(&rows).Error
	out := make(map[int]models.EpisodeSkipTime, len(rows))
	for _, r := range rows {
		out[r.EpisodeNumber] = r
	}
	return out
}

// buildRows convierte los resultados en filas EpisodeSkipTime, descartando (belt
// and suspenders) cualquier episodio cuya fila actual sea de fuente protegida.
// Las filas "aniskip" solo ceden ante el Método A (source "animethemes"): está
// medido sobre el archivo real del usuario, mientras que las marcas de la
// comunidad pueden venir de otra release/corte y quedar corridas segundos.
func (d *Detector) buildRows(mediaID int, results map[int]detResult, existing map[int]models.EpisodeSkipTime) []models.EpisodeSkipTime {
	var rows []models.EpisodeSkipTime
	for ep, r := range results {
		if row, has := existing[ep]; has {
			if protectedSources[row.Source] {
				continue
			}
			if row.Source == "aniskip" {
				if r.Source != "animethemes" {
					continue
				}
				// A puede haber resuelto solo la OP o solo el ED: conservar el
				// lado que no midió en vez de borrar la marca de la comunidad.
				if r.OpEnd <= 0 && row.OpEnd > 0 {
					r.OpStart, r.OpEnd = row.OpStart, row.OpEnd
				}
				if r.EdOffset <= 0 && row.EdOffset > 0 {
					r.EdOffset, r.EdEnd = row.EdOffset, row.EdEnd
				}
			}
		}
		if r.OpEnd <= 0 && r.EdOffset <= 0 {
			continue
		}
		rows = append(rows, models.EpisodeSkipTime{
			MediaID:       mediaID,
			EpisodeNumber: ep,
			OpStart:       r.OpStart,
			OpEnd:         r.OpEnd,
			EdOffset:      r.EdOffset,
			EdEnd:         r.EdEnd,
			Source:        r.Source,
			Confidence:    r.Confidence,
		})
	}
	return rows
}
