package anime

import (
	"context"
	"fmt"
	"kamehouse/internal/database/db"
	"kamehouse/internal/database/models"
	"kamehouse/internal/database/models/dto"
	"strings"
	"sync"

	"github.com/rs/zerolog"
)

// ─────────────────────────────────────────────────────────────────────────────
// Content tagging types
// ─────────────────────────────────────────────────────────────────────────────

// ContentTag classifies an episode's narrative role.
type ContentTag string

const (
	TagFiller  ContentTag = "FILLER"  // Non-canon padding content
	TagEpic    ContentTag = "EPIC"    // Outstanding episode (score > 8.5 / 85 on 0-100 scale)
	TagCanon   ContentTag = "CANON"   // Default canon episode
	TagSpecial ContentTag = "SPECIAL" // OVA / special / movie
)

// ArcName is the narrative saga an episode belongs to.
type ArcName = string

// EpisodeIntelligence carries computed intelligence about a single episode.
type EpisodeIntelligence struct {
	Rating   float64    `json:"rating"` // 0–10 (derived from LibraryMedia.Score ÷ 10)
	IsFiller bool       `json:"isFiller"`
	ArcName  ArcName    `json:"arcName"` // Empty string when unknown
	Tag      ContentTag `json:"tag"`
	Vibes    []string   `json:"vibes"` // Emotional or thematic tags (e.g., "EPIC", "CHILL", "TEARS")
}

// SmartMetadataResult wraps episode metadata enriched with intelligence data.
type SmartMetadataResult struct {
	*EpisodeMetadata
	Intelligence *EpisodeIntelligence `json:"intelligence"`
}

// ─────────────────────────────────────────────────────────────────────────────
// FillerChecker — local interface to avoid circular import (fillermanager→anime)
// ─────────────────────────────────────────────────────────────────────────────

// FillerChecker is satisfied by *fillermanager.FillerManager.
type FillerChecker interface {
	IsEpisodeFiller(mediaID int, episodeNumber int) bool
}

// ─────────────────────────────────────────────────────────────────────────────
// Dragon Ball arc map — static episode ranges keyed by TMDB media ID
// Range: [from, to] inclusive episode numbers.
// ─────────────────────────────────────────────────────────────────────────────

type arcRange struct {
	from int
	to   int
	name ArcName
}

// dragonBallArcs maps TMDB media IDs to their ordered arc slices.
// IDs: Dragon Ball (12609), Dragon Ball Z (12971), Dragon Ball GT (12697)
// Dragon Ball Super (62715), Dragon Ball Daima (236994)
var dragonBallArcs = map[int][]arcRange{
	// ─── Dragon Ball (12609) ──────────────────────────────────────────
	12609: {
		{1, 13, "Saga de Pilaf"},
		{14, 28, "21° Torneo de Artes Marciales"},
		{29, 68, "Saga de la Patrulla Roja"},
		{69, 82, "Saga de Uranai Baba"},
		{83, 101, "22° Torneo de Artes Marciales"},
		{102, 122, "Saga de Piccolo Daimaku"},
		{123, 153, "Saga de Piccolo Jr."},
	},
	// ─── Dragon Ball Z (12971) ────────────────────────────────────────
	12971: {
		{1, 35, "Saga de los Saiyajin"},
		{36, 107, "Saga de Freezer"},
		{108, 117, "Saga de Garlic Jr."},
		{118, 139, "Saga de los Androides"},
		{140, 194, "Saga de Cell"},
		{195, 199, "Torneo del Otro Mundo"},
		{200, 291, "Saga de Majin Buu"},
	},
	// ─── Dragon Ball GT (12697) ───────────────────────────────────────
	12697: {
		{1, 16, "Saga de las Esferas Definitivas"},
		{17, 40, "Saga de Baby"},
		{41, 47, "Saga de Super 17"},
		{48, 64, "Saga de los Dragones Malignos"},
	},
	// ─── Dragon Ball Super (62715) ────────────────────────────────────
	62715: {
		{1, 14, "Saga de la Batalla de los Dioses"},
		{15, 27, "Saga de la Resurrección de F"},
		{28, 46, "Saga del Universo 6"},
		{47, 76, "Saga de Goku Black"},
		{77, 131, "Saga de Supervivencia Universal"},
	},
	// ─── Dragon Ball Daima (236994) ───────────────────────────────────
	236994: {
		{1, 10, "El Misterio del Mundo Demonio"},
		{11, 20, "La Travesía en el Mundo Demonio"},
	},
}

// resolveArc returns the narrative arc name for a given media ID and episode number.
// Returns an empty string when no arc data is available.
func resolveArc(mediaID, episodeNum int) ArcName {
	arcs, ok := dragonBallArcs[mediaID]
	if !ok {
		return ""
	}
	for _, a := range arcs {
		if episodeNum >= a.from && episodeNum <= a.to {
			return a.name
		}
	}
	return ""
}

// epicScoreThreshold: LibraryMedia.Score is 0–100; ÷10 maps to 0–10. 85 → 8.5.
const epicScoreThreshold = 85

// ─────────────────────────────────────────────────────────────────────────────
// IntelligenceService
// ─────────────────────────────────────────────────────────────────────────────

// IntelligenceService computes and caches episode-level content intelligence.
type IntelligenceService struct {
	db     *db.Database
	fm     FillerChecker // may be nil when filler data is not yet loaded
	logger *zerolog.Logger
	// cache stores *EpisodeIntelligence keyed by "mediaID:episodeNum".
	// sync.Map gives lock-free reads — critical for the < 10 ms SLA.
	cache sync.Map
}

// NewIntelligenceService constructs the service.
// fm may be nil; when nil, filler detection is skipped gracefully.
func NewIntelligenceService(database *db.Database, fm FillerChecker, logger *zerolog.Logger) *IntelligenceService {
	return &IntelligenceService{
		db:     database,
		fm:     fm,
		logger: logger,
	}
}

// cacheKey produces a deterministic string key for the in-memory cache.
func cacheKey(mediaID, episodeNum int) string { return fmt.Sprintf("%d:%d", mediaID, episodeNum) }

// GetSmartMetadata returns episode metadata enriched with intelligence data.
// Cache hit path is a single sync.Map.Load — O(1) and well under 10 ms.
// On any external data failure, it falls back to TagCanon without panicking.
func (s *IntelligenceService) GetSmartMetadata(
	_ context.Context,
	mediaID int,
	episodeNum int,
	base *EpisodeMetadata,
) (*SmartMetadataResult, error) {
	key := cacheKey(mediaID, episodeNum)

	// ── Fast path: cache hit ──────────────────────────────────────────
	if v, ok := s.cache.Load(key); ok {
		return &SmartMetadataResult{
			EpisodeMetadata: base,
			Intelligence:    v.(*EpisodeIntelligence),
		}, nil
	}

	// ── Slow path: compute, always succeeds ──────────────────────────
	intel := s.computeIntelligence(mediaID, episodeNum, base)
	s.cache.Store(key, intel)

	return &SmartMetadataResult{
		EpisodeMetadata: base,
		Intelligence:    intel,
	}, nil
}

// computeIntelligence derives EpisodeIntelligence from available data.
// It is guaranteed to never panic: each sub-step is wrapped in a defer recover.
func (s *IntelligenceService) computeIntelligence(mediaID, episodeNum int, base *EpisodeMetadata) (intel *EpisodeIntelligence) {
	// Safe default — Canon, unrated, no filler, no arc.
	intel = &EpisodeIntelligence{
		Rating:   0,
		IsFiller: false,
		ArcName:  "",
		Tag:      TagCanon,
		Vibes:    make([]string, 0),
	}

	// ── Filler detection ─────────────────────────────────────────────
	if s.fm != nil {
		func() {
			defer func() { recover() }() //nolint:errcheck
			isFiller := s.fm.IsEpisodeFiller(mediaID, episodeNum)
			if isFiller {
				intel.IsFiller = true
				intel.Tag = TagFiller
			}
		}()
	}

	// Propagate IsFiller from base EpisodeMetadata when fillermanager is absent.
	if base != nil && base.IsFiller && !intel.IsFiller {
		intel.IsFiller = true
		intel.Tag = TagFiller
	}

	// ── Rating + Epic detection ───────────────────────────────────────
	func() {
		defer func() { recover() }() //nolint:errcheck
		var media models.LibraryMedia
		if err := s.db.Gorm().Where("id = ?", mediaID).First(&media).Error; err != nil {
			return
		}
		if media.Score > 0 {
			intel.Rating = float64(media.Score) / 10.0
		}
		// Override to Epic only when not already classified as Filler.
		if media.Score >= epicScoreThreshold && intel.Tag != TagFiller {
			intel.Tag = TagEpic
		}
	}()

	// ── Arc grouping ─────────────────────────────────────────────────
	intel.ArcName = resolveArc(mediaID, episodeNum)

	// ── Vibe derivation ──────────────────────────────────────────────
	intel.Vibes = s.deriveVibes(mediaID, episodeNum, base, intel)

	return intel
}

// DeriveSeriesVibes categorizes the "feel" of a series based on genres and score.
func (s *IntelligenceService) DeriveSeriesVibes(media *models.LibraryMedia) []string {
	vibes := make([]string, 0)
	if media == nil {
		return vibes
	}

	hasGenre := func(g string) bool {
		return strings.Contains(strings.ToLower(string(media.Genres)), strings.ToLower(g))
	}

	score := float64(media.Score)
	rating := score / 10.0

	if score >= epicScoreThreshold {
		vibes = append(vibes, "EPIC")
	}

	if hasGenre("Drama") || hasGenre("Romance") {
		if rating > 7.5 {
			vibes = append(vibes, "EMOTIONAL")
		}
	}

	if hasGenre("Action") || hasGenre("Adventure") {
		if rating > 8.0 {
			vibes = append(vibes, "HYPED")
		}
	}

	if hasGenre("Comedy") || hasGenre("Slice of Life") {
		vibes = append(vibes, "CHILL")
	}

	if hasGenre("Horror") || hasGenre("Psychological") || hasGenre("Thriller") {
		vibes = append(vibes, "INTENSE")
	}

	return vibes
}

// deriveVibes categorizes the "feel" of an episode based on genres, score, and tags.
func (s *IntelligenceService) deriveVibes(mediaID, _ int, _ *EpisodeMetadata, _ *EpisodeIntelligence) []string {
	var media models.LibraryMedia
	if err := s.db.Gorm().Where("id = ?", mediaID).First(&media).Error; err != nil {
		return make([]string, 0)
	}
	return s.DeriveSeriesVibes(&media)
}

// InvalidateCache removes all cached intelligence for a given media.
// Call this after filler data is refreshed for that media entry.
func (s *IntelligenceService) InvalidateCache(mediaID int) {
	s.cache.Range(func(k, _ any) bool {
		if key, ok := k.(string); ok {
			prefix := fmt.Sprintf("%d:", mediaID)
			if len(key) >= len(prefix) && key[:len(prefix)] == prefix {
				s.cache.Delete(k)
			}
		}
		return true
	})
}

// ─────────────────────────────────────────────────────────────────────────────
// Curated swimlane types & response
// ─────────────────────────────────────────────────────────────────────────────

// CuratedSwimlane represents a single content row on the home screen.
type CuratedSwimlane struct {
	ID      string                    `json:"id"`
	Title   string                    `json:"title"`
	Type    string                    `json:"type"` // "local_library"|"epic_moments"|"trending"|"essential_cinema"
	Entries []*LibraryCollectionEntry `json:"entries"`
}

// CuratedHomeResponse is returned by GetCuratedSwimlanes.
type CuratedHomeResponse struct {
	Swimlanes []*CuratedSwimlane `json:"swimlanes"`
}

// GetContinueWatching returns a list of media the user is currently watching,
// suggesting the next episode if the current one is almost finished.
func (s *IntelligenceService) GetContinueWatching(ctx context.Context, userID uint) ([]dto.ContinueWatchingItem, error) {
	var history []models.WatchHistory

	subQuery := s.db.Gorm().
		Select("media_id, MAX(updated_at) as latest").
		Table("watch_histories").
		Where("account_id = ?", userID).
		Group("media_id")

	if err := s.db.Gorm().
		Table("watch_histories").
		Joins("JOIN (?) as latest_history ON watch_histories.media_id = latest_history.media_id AND watch_histories.updated_at = latest_history.latest", subQuery).
		Where("account_id = ?", userID).
		Order("updated_at DESC").
		Limit(20).
		Find(&history).Error; err != nil {
		return nil, err
	}

	if len(history) == 0 {
		return []dto.ContinueWatchingItem{}, nil
	}

	allLocalFiles, _, err := db.GetLocalFiles(s.db)
	if err != nil {
		return nil, err
	}

	fileMap := make(map[int]map[int]bool)
	for _, lf := range allLocalFiles {
		if lf.MediaID == 0 {
			continue
		}
		if _, ok := fileMap[lf.MediaID]; !ok {
			fileMap[lf.MediaID] = make(map[int]bool)
		}
		fileMap[lf.MediaID][lf.Metadata.Episode] = true
	}

	// Extract unique media IDs
	mediaIDs := make([]uint, 0, len(history))
	for _, h := range history {
		mediaIDs = append(mediaIDs, uint(h.MediaID))
	}

	// 1. Batch-fetch all parent LibraryMedia
	var mediaList []models.LibraryMedia
	if err := s.db.Gorm().Where("id IN (?)", mediaIDs).Find(&mediaList).Error; err != nil {
		return nil, err
	}
	mediaMap := make(map[uint]*models.LibraryMedia)
	for i := range mediaList {
		mediaMap[mediaList[i].ID] = &mediaList[i]
	}

	// 2. Batch-fetch all episodes for these media
	var episodeList []models.LibraryEpisode
	if err := s.db.Gorm().Where("library_media_id IN (?)", mediaIDs).Find(&episodeList).Error; err != nil {
		return nil, err
	}

	// Map episodes by media_id -> season_id -> episode_num for high performance lookups
	episodeMap := make(map[string]*models.LibraryEpisode)
	for i := range episodeList {
		key := fmt.Sprintf("%d_%d_%d", episodeList[i].LibraryMediaID, episodeList[i].SeasonNumber, episodeList[i].EpisodeNumber)
		episodeMap[key] = &episodeList[i]
	}

	items := make([]dto.ContinueWatchingItem, 0, len(history))

	for _, h := range history {
		progress := 0.0
		if h.Duration > 0 {
			progress = h.CurrentTime / h.Duration
		}

		media, ok := mediaMap[uint(h.MediaID)]
		if !ok {
			continue
		}

		// Find current episode in memory
		var currentEpisode *models.LibraryEpisode
		for i := range episodeList {
			if episodeList[i].LibraryMediaID == uint(h.MediaID) && episodeList[i].EpisodeNumber == h.EpisodeNumber {
				currentEpisode = &episodeList[i]
				break
			}
		}
		if currentEpisode == nil {
			continue
		}

		item := dto.ContinueWatchingItem{
			Media:           media,
			Episode:         currentEpisode,
			Progress:        progress,
			LastPlaybackPos: h.CurrentTime,
			IsNextEpisode:   false,
		}

		if progress >= 0.9 {
			// Find next episode in the same season: currentEpisode.EpisodeNumber + 1
			nextKey := fmt.Sprintf("%d_%d_%d", uint(h.MediaID), currentEpisode.SeasonNumber, currentEpisode.EpisodeNumber+1)
			nextEpisode, found := episodeMap[nextKey]
			if !found {
				// Try season + 1, episode 1
				nextKey = fmt.Sprintf("%d_%d_%d", uint(h.MediaID), currentEpisode.SeasonNumber+1, 1)
				nextEpisode, found = episodeMap[nextKey]
			}

			if found {
				if hasFile := fileMap[int(h.MediaID)][nextEpisode.EpisodeNumber]; hasFile {
					item.Episode = nextEpisode
					item.Progress = 0
					item.IsNextEpisode = true
				}
				// If next episode file is not available, we keep the current episode at 90%
				// instead of continuing and omitting the series entirely (Bug #15)
			}
			// If next episode is not found (e.g. series completed), we keep the current episode
			// instead of continuing and omitting the series entirely (Bug #15)
		}

		items = append(items, item)
	}

	return items, nil
}

// GetCuratedSwimlanes returns the curated home swimlanes, including DB Intelligence lanes.
func (s *IntelligenceService) GetCuratedSwimlanes(_ context.Context) (*CuratedHomeResponse, error) {
	resp := &CuratedHomeResponse{
		Swimlanes: make([]*CuratedSwimlane, 0, 45),
	}

	// 1. Standard Collection Entry Points (Top priority)
	if lane := s.buildLocalLibraryLane(); lane != nil {
		resp.Swimlanes = append(resp.Swimlanes, lane)
	}

	if lane := s.buildEpicMomentsLane(); lane != nil {
		resp.Swimlanes = append(resp.Swimlanes, lane)
	}

	if lane := s.buildTrendingLane(); lane != nil {
		resp.Swimlanes = append(resp.Swimlanes, lane)
	}

	// 2. Curated Episode-level lanes by LibraryEpisode.suggested_swimlane
	// These values exactly match the output of IntelligenceTagger.suggestSwimlane().
	// Using LIKE '%substring%' queries so small encoding differences don't block results.
	epNameLanes := []struct {
		ID   string
		Name string // exact match with the suggestSwimlane() output
	}{
		// ── Combate y Transformaciones ──────────────────────────────────────────
		{"capitulos_imperdibles", "Capítulos Imperdibles: Las Batallas Más Épicas"},
		{"eleva_tu_ki_ep", "¡Eleva tu Ki!: Batallas que rompieron los límites"},
		{"transformaciones_saiyajin", "Más Allá del Límite: Transformaciones Saiyajin"},
		{"forma_final_villano", "Cuando el Villano Alcanza su Forma Final"},
		{"tecnicas_sacrificio", "El Último Recurso: Técnicas de Sacrificio"},
		{"tecnicas_letales", "Técnicas Letales: Sin Vuelta Atrás"},
		{"fusion_ha", "¡Fusión HA!: Las Uniones Más Poderosas"},
		{"espadachines", "Espadachines y Guerreros con Armas"},
		// ── Torneos ─────────────────────────────────────────────────────────────
		{"torneos_artes_marciales", "¡Fuera del Ring!: Los Grandes Torneos"},
		{"torneo_uranai_baba", "El Misterioso Torneo de Uranai Baba"},
		{"juegos_cell", "Los Juegos de Cell: El Torneo del Terror"},
		{"torneo_mas_alla", "Torneo del Más Allá: Combates en el Otro Mundo"},
		{"torneo_poder", "Torneo del Poder: Supervivencia Universal"},
		// ── Sagas y Facciones ───────────────────────────────────────────────────
		{"imperio_freezer", "El Imperio de Freezer: El Tirano del Universo"},
		{"patrulla_roja", "La Patrulla Roja: Androides y Cell"},
		{"saiyajins_legendarios", "Saiyajins Legendarios: El Poder Berserker"},
		{"los_saiyajins", "Los Saiyajins: La Raza Guerrera Más Poderosa"},
		{"los_tsufurujin", "Los Tsufurujin: La Venganza de Baby"},
		{"dragones_malignos", "Los Dragones Malignos: La Amenaza Final de GT"},
		{"dioses_destruccion", "Dioses y Entidades Supremas del Universo"},
		{"patrulla_galactica", "La Patrulla Galáctica: Policías del Cosmos"},
		{"guerreras_poderosas", "Guerreras Indomables del Universo"},
		{"nuevas_generaciones", "El Futuro: Las Nuevas Generaciones de Guerreros"},
		{"los_namekuseijin", "Los Namekuseijin: Guardianes de las Esferas"},
		// ── Sci-Fi y Aventura ───────────────────────────────────────────────────
		{"guardianes_tiempo", "Guardianes del Tiempo: Crónicas del Futuro"},
		{"cronicas_supervivencia", "Crónicas de Supervivencia: El Futuro en Llamas"},
		{"cruce_universos", "Multiverso: El Cruce de Universos"},
		{"invasion_tierra", "¡La Tierra Bajo Ataque! Invasiones Alienígenas"},
		{"viajes_espacio", "Más Allá de las Estrellas: Aventura Espacial"},
		{"busqueda_esferas", "Deseos Prohibidos y Dragones Sagrados"},
		// ── Magia y Sobrenatural ────────────────────────────────────────────────
		{"artes_oscuras_ep", "Artes Oscuras: Magia y Demonios"},
		{"maldicion_mini", "¡Encogidos! La Maldición Mini de Daima"},
		// ── Drama y Emociones ───────────────────────────────────────────────────
		{"sacrificio_heroico", "Cuando los Héroes lo Dan Todo: Sacrificios"},
		{"tension_absoluta", "Tensión Absoluta: Al Borde del Abismo"},
		{"romance_boda", "Amor en el Universo Dragon Ball"},
		{"gran_saiyaman", "Gran Saiyaman: El Héroe Enmascarado"},
		{"humor_relleno", "Momentos para Reír: El Lado Cómico del Universo"},
		// ── Entrenamiento ───────────────────────────────────────────────────────
		{"entrenamiento_divino", "Entrenamiento Divino: El Camino de los Dioses"},
		{"entrenamiento_extremo", "El Camino del Guerrero: Entrenamientos"},
		// ── Películas ───────────────────────────────────────────────────────────
		{"esencia_cinema_ep", "Esencia de Cinema: Películas Legendarias"},
	}

	for _, l := range epNameLanes {
		if lane := s.buildEpisodeSwimlaneByName(l.ID, l.Name); lane != nil {
			resp.Swimlanes = append(resp.Swimlanes, lane)
		}
	}

	// 2.2 Dynamic Tag-based swimlanes (Tags with >= 50 episodes)
	if tagLanes := s.BuildDynamicTagLanes(); len(tagLanes) > 0 {
		resp.Swimlanes = append(resp.Swimlanes, tagLanes...)
	}

	// 3. Essential Cinema (Beautiful closing row focusing on Movies and OVAs)
	if lane := s.buildEssentialCinemaLane(); lane != nil {
		resp.Swimlanes = append(resp.Swimlanes, lane)
	}

	return resp, nil
}
