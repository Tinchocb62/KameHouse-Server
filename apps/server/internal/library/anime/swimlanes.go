package anime

import (
	"context"
	"fmt"
	"kamehouse/internal/database/db"
	"kamehouse/internal/database/models"
	"time"

	"kamehouse/internal/util/cache"
)

var curatedHomeCache = cache.NewCache[*CuratedHomeResponse](30 * time.Minute)
var dynamicTagLanesCache = cache.NewCache[[]*CuratedSwimlane](30 * time.Minute)

func InvalidateCuratedHomeCache() {
	curatedHomeCache.Clear()
	dynamicTagLanesCache.Clear()
}

func GetCuratedHome(_ context.Context, database *db.Database) (*CuratedHomeResponse, error) {
	cacheKey := "curated_home"
	if cached, ok := curatedHomeCache.Get(cacheKey); ok && cached != nil {
		return cached, nil
	}

	svc := NewIntelligenceService(database, nil, nil)
	resp, err := svc.GetCuratedSwimlanes(context.Background())
	if err != nil {
		return nil, err
	}

	curatedHomeCache.Set(cacheKey, resp)
	return resp, nil
}

func (s *IntelligenceService) buildEpisodeSwimlaneByTag(id, title, tag string) *CuratedSwimlane {
	query := fmt.Sprintf(`%%"%s"%%`, tag)
	var episodes []models.LibraryEpisode
	if err := s.db.Gorm().
		Where("tags LIKE ?", query).
		Order("episode_number ASC").
		Limit(20).
		Find(&episodes).Error; err != nil || len(episodes) == 0 {
		return nil
	}

	mediaIDs := make([]uint, 0, len(episodes))
	for _, ep := range episodes {
		mediaIDs = append(mediaIDs, ep.LibraryMediaID)
	}

	var mediaList []models.LibraryMedia
	if err := s.db.Gorm().
		Omit("description", "synonyms", "audio_tracks", "subtitle_tracks").
		Where("id IN (?)", mediaIDs).
		Find(&mediaList).Error; err != nil {
		return nil
	}

	mediaMap := make(map[uint]*models.LibraryMedia)
	for i := range mediaList {
		mediaMap[mediaList[i].ID] = &mediaList[i]
	}

	lane := &CuratedSwimlane{
		ID:      id,
		Title:   title,
		Type:    "episode_tag",
		Entries: make([]*LibraryCollectionEntry, 0, len(episodes)),
	}

	added := make(map[uint]bool)
	for i := range episodes {
		ep := &episodes[i]
		if added[ep.ID] {
			continue
		}
		media, ok := mediaMap[ep.LibraryMediaID]
		if !ok {
			continue
		}
		if media.PosterImage == "" || media.GetPreferredTitle() == "" {
			continue
		}
		added[ep.ID] = true
		lane.Entries = append(lane.Entries, &LibraryCollectionEntry{
			Media:            media,
			MediaID:          int(media.ID),
			Episode:          ep,
			AvailabilityType: "FULL_LOCAL",
		})
	}

	if len(lane.Entries) == 0 {
		return nil
	}
	return lane
}

func (s *IntelligenceService) buildEpisodeSwimlaneByName(id, name string) *CuratedSwimlane {
	var episodes []models.LibraryEpisode
	if err := s.db.Gorm().
		Where("suggested_swimlane = ?", name).
		Order("episode_number ASC").
		Limit(20).
		Find(&episodes).Error; err != nil || len(episodes) == 0 {
		return nil
	}

	title := name
	if episodes[0].SuggestedSwimlane != "" {
		title = episodes[0].SuggestedSwimlane
	}

	mediaIDs := make([]uint, 0, len(episodes))
	for _, ep := range episodes {
		mediaIDs = append(mediaIDs, ep.LibraryMediaID)
	}

	var mediaList []models.LibraryMedia
	if err := s.db.Gorm().
		Omit("description", "synonyms", "audio_tracks", "subtitle_tracks").
		Where("id IN (?)", mediaIDs).
		Find(&mediaList).Error; err != nil {
		return nil
	}

	mediaMap := make(map[uint]*models.LibraryMedia)
	for i := range mediaList {
		mediaMap[mediaList[i].ID] = &mediaList[i]
	}

	lane := &CuratedSwimlane{
		ID:      id,
		Title:   title,
		Type:    "episode_tag",
		Entries: make([]*LibraryCollectionEntry, 0, len(episodes)),
	}

	added := make(map[uint]bool)
	for i := range episodes {
		ep := &episodes[i]
		if added[ep.ID] {
			continue
		}
		media, ok := mediaMap[ep.LibraryMediaID]
		if !ok {
			continue
		}
		if media.PosterImage == "" || media.GetPreferredTitle() == "" {
			continue
		}
		added[ep.ID] = true
		lane.Entries = append(lane.Entries, &LibraryCollectionEntry{
			Media:            media,
			MediaID:          int(media.ID),
			Episode:          ep,
			AvailabilityType: "FULL_LOCAL",
		})
	}

	if len(lane.Entries) == 0 {
		return nil
	}
	return lane
}

func (s *IntelligenceService) buildLocalLibraryLane() *CuratedSwimlane {
	var media []*models.LibraryMedia
	hasFiles := s.db.Gorm().Model(&models.LocalFile{}).Select("1").
		Where("library_media_id = library_media.id AND library_media_id > 0").Limit(1)
	if err := s.db.Gorm().
		Omit("description", "synonyms", "audio_tracks", "subtitle_tracks").
		Where("EXISTS (?)", hasFiles).
		Order("updated_at DESC").
		Limit(40).
		Find(&media).Error; err != nil || len(media) == 0 {
		return nil
	}
	lane := &CuratedSwimlane{
		ID:      "local_library",
		Title:   "Tu Videoteca Local",
		Type:    "local_library",
		Entries: make([]*LibraryCollectionEntry, 0, len(media)),
	}
	for _, m := range media {
		if m.PosterImage == "" || m.GetPreferredTitle() == "" {
			continue
		}
		lane.Entries = append(lane.Entries, &LibraryCollectionEntry{
			Media:            m,
			MediaID:          int(m.ID),
			AvailabilityType: "FULL_LOCAL",
		})
	}
	if len(lane.Entries) == 0 {
		return nil
	}
	return lane
}

func (s *IntelligenceService) buildEpicMomentsLane() *CuratedSwimlane {
	var media []*models.LibraryMedia
	hasFiles := s.db.Gorm().Model(&models.LocalFile{}).Select("1").
		Where("library_media_id = library_media.id AND library_media_id > 0").Limit(1)
	if err := s.db.Gorm().
		Omit("description", "synonyms", "audio_tracks", "subtitle_tracks").
		Where("EXISTS (?) AND score >= ?", hasFiles, epicScoreThreshold).
		Order("score DESC").
		Limit(40).
		Find(&media).Error; err != nil || len(media) == 0 {
		return nil
	}
	lane := &CuratedSwimlane{
		ID:      "epic_moments",
		Title:   "Sagas Legendarias y Épicas",
		Type:    "epic_moments",
		Entries: make([]*LibraryCollectionEntry, 0, len(media)),
	}
	for _, m := range media {
		if m.PosterImage == "" || m.GetPreferredTitle() == "" {
			continue
		}
		lane.Entries = append(lane.Entries, &LibraryCollectionEntry{
			Media:            m,
			MediaID:          int(m.ID),
			AvailabilityType: "HYBRID",
		})
	}
	if len(lane.Entries) == 0 {
		return nil
	}
	return lane
}

func (s *IntelligenceService) buildEssentialCinemaLane() *CuratedSwimlane {
	var media []*models.LibraryMedia
	hasFiles := s.db.Gorm().Model(&models.LocalFile{}).Select("1").
		Where("library_media_id = library_media.id AND library_media_id > 0").Limit(1)
	if err := s.db.Gorm().
		Omit("description", "synonyms", "audio_tracks", "subtitle_tracks").
		Where("EXISTS (?) AND format IN ?", hasFiles, []string{"MOVIE", "OVA", "SPECIAL"}).
		Order("score DESC").
		Limit(30).
		Find(&media).Error; err != nil || len(media) == 0 {
		return nil
	}
	lane := &CuratedSwimlane{
		ID:      "essential_cinema",
		Title:   "Cine Esencial: Películas Dragon Ball",
		Type:    "essential_cinema",
		Entries: make([]*LibraryCollectionEntry, 0, len(media)),
	}
	for _, m := range media {
		if m.PosterImage == "" || m.GetPreferredTitle() == "" {
			continue
		}
		lane.Entries = append(lane.Entries, &LibraryCollectionEntry{
			Media:            m,
			MediaID:          int(m.ID),
			AvailabilityType: "FULL_LOCAL",
		})
	}
	if len(lane.Entries) == 0 {
		return nil
	}
	return lane
}

func (s *IntelligenceService) buildTrendingLane() *CuratedSwimlane {
	var media []*models.LibraryMedia
	hasFiles := s.db.Gorm().Model(&models.LocalFile{}).Select("1").
		Where("library_media_id = library_media.id AND library_media_id > 0").Limit(1)
	if err := s.db.Gorm().
		Omit("description", "synonyms", "audio_tracks", "subtitle_tracks").
		Where("EXISTS (?) AND format = ?", hasFiles, "TV").
		Order("created_at DESC").
		Limit(20).
		Find(&media).Error; err != nil || len(media) == 0 {
		return nil
	}
	lane := &CuratedSwimlane{
		ID:      "trending",
		Title:   "Series Dragon Ball: Tu Colección",
		Type:    "trending",
		Entries: make([]*LibraryCollectionEntry, 0, len(media)),
	}
	for _, m := range media {
		if m.PosterImage == "" || m.GetPreferredTitle() == "" {
			continue
		}
		lane.Entries = append(lane.Entries, &LibraryCollectionEntry{
			Media:            m,
			MediaID:          int(m.ID),
			AvailabilityType: "FULL_LOCAL",
		})
	}
	if len(lane.Entries) == 0 {
		return nil
	}
	return lane
}
