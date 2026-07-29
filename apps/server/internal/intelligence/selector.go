package intelligence

import (
	"context"
	"encoding/json"
	"fmt"
	"kamehouse/internal/database/db"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/rs/zerolog"
)

// Selector es el motor de selección inteligente de archivos.
type Selector struct {
	db        *db.Database
	cache     *ResultCache
	logger    *zerolog.Logger
	weights   ScoringWeights
}

// NewSelector crea un nuevo selector inteligente.
func NewSelector(database *db.Database, logger *zerolog.Logger) *Selector {
	return &Selector{
		db:       database,
		cache:    NewResultCache(10*time.Minute, 500),
		logger:   logger,
		weights:  DefaultWeights(),
	}
}

// GetWeights retorna los pesos actuales de puntuación.
func (s *Selector) GetWeights() ScoringWeights {
	return s.weights
}

// GetCacheStats retorna estadísticas de la caché.
func (s *Selector) GetCacheStats() CacheStats {
	return s.cache.Stats()
}

// SelectBestSource retorna el archivo ganador para un título/episodio.
func (s *Selector) SelectBestSource(
	ctx context.Context,
	tmdbID int,
	episodeNumber int,
	preferredLangs []string,
) (*SelectionResult, error) {
	// 1. Buscar en caché
	cacheKey := fmt.Sprintf("%d-%d", tmdbID, episodeNumber)
	if cached, ok := s.cache.Get(cacheKey); ok {
		s.logger.Debug().Int("tmdbId", tmdbID).Msg("intelligence: cache hit")
		return cached, nil
	}

	// 2. Buscar fuentes en DB local
	localSources := s.getLocalSources(tmdbID, episodeNumber)
	s.logger.Debug().
		Int("tmdbId", tmdbID).
		Int("episode", episodeNumber).
		Int("localSources", len(localSources)).
		Msg("intelligence: found local sources")

	if len(localSources) == 0 {
		return nil, fmt.Errorf("intelligence: no sources found for TMDB ID %d, episode %d", tmdbID, episodeNumber)
	}

	// 4. Puntuar y ordenar
	result := s.scoreAndRank(localSources, preferredLangs)

	// 5. Guardar en caché
	s.cache.Set(cacheKey, result)

	s.logger.Info().
		Int("tmdbId", tmdbID).
		Int("episode", episodeNumber).
		Float64("score", result.TotalScore).
		Str("winner", result.Winner.FilePath).
		Msg("intelligence: selected best source")

	return result, nil
}

// getLocalSources obtiene fuentes de archivos locales desde la DB.
func (s *Selector) getLocalSources(tmdbID int, episodeNumber int) []*MediaCandidate {
	// Buscar el LibraryMedia por TMDB ID
	var media struct {
		ID uint
	}
	if err := s.db.Gorm().
		Table("library_media").
		Where("tmdb_id = ?", tmdbID).
		Select("id").
		Scan(&media).Error; err != nil {
		return nil
	}

	// Buscar archivos locales asociados
	var dbFiles []struct {
		Path          string
		FileSize      int64  `gorm:"column:file_size"`
		TechnicalInfo []byte `gorm:"column:technical_info"`
		ParsedData    []byte `gorm:"column:parsed_data"`
	}
	err := s.db.Gorm().
		Table("local_file").
		Where("media_id = ? AND library_media_id = ?", tmdbID, media.ID).
		Select("path, file_size, technical_info, parsed_data").
		Scan(&dbFiles).Error
	if err != nil {
		return nil
	}

	var candidates []*MediaCandidate
	for _, lf := range dbFiles {
		// Validar si corresponde al número de episodio solicitado
		if episodeNumber > 0 && lf.ParsedData != nil {
			var parsedInfo struct {
				Episode      string   `json:"episode"`
				EpisodeRange []string `json:"episodeRange"`
			}
			if err := json.Unmarshal(lf.ParsedData, &parsedInfo); err == nil {
				// Solo filtrar si realmente se pudo parsear el episodio y no coincide
				if parsedInfo.Episode != "" || len(parsedInfo.EpisodeRange) > 0 {
					match := false
					epStr := strconv.Itoa(episodeNumber)
					if parsedInfo.Episode == epStr {
						match = true
					} else {
						for _, rangeEp := range parsedInfo.EpisodeRange {
							if rangeEp == epStr {
								match = true
								break
							}
						}
					}
					if !match {
						continue
					}
				}
			}
		}

		candidate := s.buildCandidateFromDb(lf.Path, lf.FileSize, lf.TechnicalInfo)
		if candidate != nil {
			candidates = append(candidates, candidate)
		}
	}

	return candidates
}

func (s *Selector) buildCandidateFromDb(path string, fileSize int64, technicalInfoBytes []byte) *MediaCandidate {
	candidate := &MediaCandidate{
		FilePath:  path,
		FileSize:  uint64(fileSize),
		Container: strings.TrimPrefix(strings.ToLower(filepath.Ext(path)), "."),
	}

	// Iniciar con valores por defecto del nombre de archivo por si falla el parseo de technicalInfo
	filename := strings.ToLower(filepath.Base(path))
	candidate.Resolution = inferResolutionFromFilename(filename)
	candidate.Codec = inferCodecFromFilename(filename)
	candidate.AudioLangs = inferAudioLangsFromFilename(filename)

	if len(technicalInfoBytes) > 0 {
		var techInfo struct {
			Bitrate     int64 `json:"bitrate"`
			VideoStream *struct {
				Codec  string `json:"codec"`
				Height int    `json:"height"`
				Width  int    `json:"width"`
			} `json:"videoStream"`
			AudioStreams []struct {
				Codec    string `json:"codec"`
				Language string `json:"language"`
			} `json:"audioStreams"`
		}
		if err := json.Unmarshal(technicalInfoBytes, &techInfo); err == nil {
			if techInfo.Bitrate > 0 {
				candidate.Bitrate = uint32(techInfo.Bitrate)
			}
			if techInfo.VideoStream != nil {
				if techInfo.VideoStream.Height > 0 {
					candidate.Resolution = techInfo.VideoStream.Height
				}
				if techInfo.VideoStream.Codec != "" {
					candidate.Codec = techInfo.VideoStream.Codec
				}
			}
			if len(techInfo.AudioStreams) > 0 {
				var langs []string
				for _, aud := range techInfo.AudioStreams {
					if aud.Language != "" {
						langs = append(langs, aud.Language)
					}
				}
				if len(langs) > 0 {
					candidate.AudioLangs = langs
				}
			}
		}
	}

	return candidate
}



// scoreAndRank evalúa y ordena los candidatos.
func (s *Selector) scoreAndRank(candidates []*MediaCandidate, preferredLangs []string) *SelectionResult {
	type scoredCandidate struct {
		candidate *MediaCandidate
		score     float64
	}

	scored := make([]scoredCandidate, len(candidates))
	for i, c := range candidates {
		scored[i] = scoredCandidate{
			candidate: c,
			score:     ScoreCandidate(c, preferredLangs, s.weights),
		}
	}

	// Ordenar por puntaje descendente
	sort.Slice(scored, func(i, j int) bool {
		return scored[i].score > scored[j].score
	})

	winner := scored[0].candidate
	totalScore := scored[0].score

	// Generar razón de la selección
	reason := generateReason(winner, preferredLangs)

	allCandidates := make([]*MediaCandidate, len(scored))
	for i, s := range scored {
		allCandidates[i] = s.candidate
	}

	return &SelectionResult{
		Winner:        winner,
		AllCandidates: allCandidates,
		TotalScore:    totalScore,
		Reason:        reason,
	}
}

// generateReason genera una descripción legible de por qué se seleccionó un archivo.
func generateReason(winner *MediaCandidate, preferredLangs []string) string {
	parts := []string{}

	// Resolución
	switch {
	case winner.Resolution >= 2160:
		parts = append(parts, "4K Ultra HD")
	case winner.Resolution >= 1080:
		parts = append(parts, "1080p Full HD")
	case winner.Resolution >= 720:
		parts = append(parts, "720p HD")
	default:
		parts = append(parts, fmt.Sprintf("%dp", winner.Resolution))
	}

	// Códec
	if winner.Codec != "" {
		parts = append(parts, strings.ToUpper(winner.Codec))
	}

	// Idioma de audio
	if len(winner.AudioLangs) > 0 && len(preferredLangs) > 0 {
		for _, lang := range winner.AudioLangs {
			for _, pref := range preferredLangs {
				if normalizeLang(lang) == normalizeLang(pref) {
					parts = append(parts, fmt.Sprintf("Audio %s", strings.ToUpper(lang)))
				}
			}
		}
	}

	return strings.Join(parts, " | ")
}

// inferResolutionFromFilename infiere la resolución del nombre de archivo.
func inferResolutionFromFilename(filename string) int {
	if strings.Contains(filename, "2160p") || strings.Contains(filename, "4k") || strings.Contains(filename, "uhd") {
		return 2160
	}
	if strings.Contains(filename, "1080p") || strings.Contains(filename, "1080") {
		return 1080
	}
	if strings.Contains(filename, "720p") || strings.Contains(filename, "720") {
		return 720
	}
	if strings.Contains(filename, "480p") || strings.Contains(filename, "480") {
		return 480
	}
	return 1080 // Default a 1080p
}

// inferCodecFromFilename infiere el códec del nombre de archivo.
func inferCodecFromFilename(filename string) string {
	if strings.Contains(filename, "av1") || strings.Contains(filename, "av01") {
		return "av1"
	}
	if strings.Contains(filename, "hevc") || strings.Contains(filename, "h265") || strings.Contains(filename, "x265") {
		return "hevc"
	}
	if strings.Contains(filename, "h264") || strings.Contains(filename, "x264") || strings.Contains(filename, "avc") {
		return "h264"
	}
	if strings.Contains(filename, "vp9") {
		return "vp9"
	}
	if strings.Contains(filename, "vp8") {
		return "vp8"
	}
	return "h264" // Default a H264
}

// inferAudioLangsFromFilename infiere los idiomas de audio del nombre de archivo.
func inferAudioLangsFromFilename(filename string) []string {
	var langs []string

	if strings.Contains(filename, "spa") || strings.Contains(filename, "es-spanish") || strings.Contains(filename, "latino") {
		langs = append(langs, "spa")
	}
	if strings.Contains(filename, "eng") || strings.Contains(filename, "english") {
		langs = append(langs, "eng")
	}
	if strings.Contains(filename, "jpn") || strings.Contains(filename, "japanese") || strings.Contains(filename, "jap") {
		langs = append(langs, "jpn")
	}

	if len(langs) == 0 {
		langs = append(langs, "unk")
	}

	return langs
}



// ParseHeightFromResolution convierte una cadena de resolución a altura en píxeles.
func ParseHeightFromResolution(res string) int {
	res = strings.TrimSuffix(res, "p")
	res = strings.TrimSuffix(res, "P")
	height, _ := strconv.Atoi(res)
	return height
}
