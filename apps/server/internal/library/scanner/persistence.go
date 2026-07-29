package scanner

import (
	"encoding/json"
	"fmt"
	"kamehouse/internal/api/metadata_provider"
	"kamehouse/internal/database/db"
	"kamehouse/internal/database/models"
	"kamehouse/internal/database/models/dto"
	"path/filepath"
)

// persistMatchedMedia saves LibraryMedia records to the database and maps their IDs back to LocalFiles.
func (scn *Scanner) persistMatchedMedia(allMatchedIds map[int]struct{}, movieIds map[int]bool, normalizedMedia []*dto.NormalizedMedia, localFiles []*dto.LocalFile) map[int]uint {
	libraryMediaIdMap := make(map[int]uint)
	mediaBatch := make([]*models.LibraryMedia, 0, len(allMatchedIds))
	tagger := metadata_provider.NewIntelligenceTagger()

	normalizedMap := make(map[int]*dto.NormalizedMedia)
	for _, nm := range normalizedMedia {
		normalizedMap[nm.ID] = nm
	}

	// Every tmdb id involved in this scan, whether or not we end up writing it.
	// The ID mapping below needs all of them, not just the ones in the batch.
	allTmdbIds := make([]int, 0, len(allMatchedIds))
	for id := range allMatchedIds {
		realTmdbId := id
		if movieIds[id] {
			realTmdbId = id - 1_000_000
		}
		allTmdbIds = append(allTmdbIds, realTmdbId)
	}

	// A partial scan (fast mode) only hydrates metadata for the files it actually
	// scanned, so normalizedMap covers a subset of allMatchedIds. The upsert below
	// is UpdateAll, so writing a bare stub for the rest would wipe the poster,
	// titles and description of records that were already enriched.
	alreadyPersisted := make(map[string]bool)
	if scn.Database != nil && len(allTmdbIds) > 0 {
		var persisted []*models.LibraryMedia
		scn.Database.Gorm().Where("tmdb_id IN ?", allTmdbIds).Find(&persisted)
		for _, m := range persisted {
			alreadyPersisted[fmt.Sprintf("%d_%s", m.TmdbID, m.Type)] = true
		}
	}

	for id := range allMatchedIds {
		realTmdbId := id
		if movieIds[id] {
			realTmdbId = id - 1_000_000
		}

		mediaType := "SHOW"
		if movieIds[id] {
			mediaType = "MOVIE"
		}

		// Nothing fresh to write and the record already exists: leave it untouched.
		if _, hasMetadata := normalizedMap[id]; !hasMetadata && alreadyPersisted[fmt.Sprintf("%d_%s", realTmdbId, mediaType)] {
			continue
		}

		newMedia := &models.LibraryMedia{
			Type:   mediaType,
			TmdbID: realTmdbId,
		}

		if nm, ok := normalizedMap[id]; ok {
			if nm.Title != nil {
				if nm.Title.Romaji != nil {
					newMedia.TitleRomaji = *nm.Title.Romaji
				}
				if nm.Title.English != nil {
					newMedia.TitleEnglish = *nm.Title.English
				}
				if nm.Title.Spanish != nil {
					newMedia.TitleSpanish = *nm.Title.Spanish
				}
				if nm.Title.Native != nil {
					newMedia.TitleOriginal = *nm.Title.Native
				}
			}
			if nm.Format != nil {
				newMedia.Format = string(*nm.Format)
			}
			if nm.Year != nil {
				newMedia.Year = *nm.Year
			}
			if nm.Episodes != nil {
				newMedia.TotalEpisodes = *nm.Episodes
			}
			if nm.CoverImage != nil && nm.CoverImage.Large != nil {
				newMedia.PosterImage = *nm.CoverImage.Large
			}
			if nm.BannerImage != nil {
				newMedia.BannerImage = *nm.BannerImage
			}
			if nm.Description != nil {
				newMedia.Description = *nm.Description
			}
			if nm.MetadataStatus != nil {
				newMedia.MetadataStatus = *nm.MetadataStatus
			}
			if nm.LogoImage != nil {
				newMedia.LogoImage = *nm.LogoImage
			}
			if nm.ThumbImage != nil {
				newMedia.ThumbImage = *nm.ThumbImage
			}
			if nm.ClearArtImage != nil {
				newMedia.ClearArtImage = *nm.ClearArtImage
			}
			if nm.Score != nil {
				newMedia.Score = *nm.Score
			}
			if len(nm.Genres) > 0 {
				genreStrs := make([]string, 0, len(nm.Genres))
				for _, g := range nm.Genres {
					if g != nil {
						genreStrs = append(genreStrs, *g)
					}
				}
				if jb, err := json.Marshal(genreStrs); err == nil {
					newMedia.Genres = jb
				}
			}

			// Intelligence & Tagging V2
			analysis := tagger.Analyze(fmt.Sprintf("%d", realTmdbId), newMedia.GetPreferredTitle(), newMedia.Description, newMedia.Type == "MOVIE")
			newMedia.Tags = analysis.GetTagsAsJSON()
			newMedia.DominantVibe = analysis.DominantVibe
			newMedia.SuggestedSwimlane = analysis.SuggestedSwimlane
		}

		if newMedia.TitleRomaji == "" && newMedia.TitleEnglish == "" && newMedia.TitleSpanish == "" && newMedia.TitleOriginal == "" {
			var fallbackTitle string
			for _, lf := range localFiles {
				if lf.MediaID == id {
					if lf.ParsedData != nil && lf.ParsedData.Title != "" {
						fallbackTitle = lf.ParsedData.Title
					} else {
						fallbackTitle = filepath.Base(filepath.Dir(lf.Path))
					}
					break
				}
			}
			if fallbackTitle != "" {
				newMedia.TitleEnglish = fallbackTitle
			} else {
				newMedia.TitleEnglish = fmt.Sprintf("TMDB Media %d", realTmdbId)
			}
		}

		mediaBatch = append(mediaBatch, newMedia)
	}

	upsertOk := true
	if len(mediaBatch) > 0 {
		scn.Logger.Debug().Int("batchSize", len(mediaBatch)).Int("skipped", len(allMatchedIds)-len(mediaBatch)).Msg("scanner: Persisting matched media batch")
		err := db.UpsertLibraryMediaBatch(scn.Database, mediaBatch, 10)
		if err != nil {
			scn.Logger.Error().Err(err).Msg("scanner: Failed to bulk upsert LibraryMedia batch, skipping ID mapping")
			upsertOk = false
		}
	}

	// Map over every id in the scan, not just the batch: records left untouched
	// above still need their association with local files.
	if upsertOk && scn.Database != nil && len(allTmdbIds) > 0 {
		var insertedMedia []*models.LibraryMedia
		scn.Database.Gorm().Where("tmdb_id IN ?", allTmdbIds).Find(&insertedMedia)

		scn.Logger.Debug().Int("insertedCount", len(insertedMedia)).Msg("scanner: Retrieved persisted LibraryMedia records")

		for _, m := range insertedMedia {
			mapKey := m.TmdbID
			if m.Type == "MOVIE" {
				mapKey = m.TmdbID + 1_000_000
			}
			libraryMediaIdMap[mapKey] = m.ID
		}
	}

	missingAssocCount := 0
	for _, lf := range localFiles {
		if lf.MediaID != 0 {
			if libId, ok := libraryMediaIdMap[lf.MediaID]; ok {
				lf.LibraryMediaId = libId
			} else {
				missingAssocCount++
				scn.Logger.Trace().
					Str("path", lf.Path).
					Int("mediaID", lf.MediaID).
					Msg("scanner: Local file matched media but failed to find internal LibraryMedia association")
			}
		}
	}

	if missingAssocCount > 0 {
		scn.Logger.Warn().Int("missingCount", missingAssocCount).Msg("scanner: Some local files matched media but failed to associate with a database record")
	} else {
		scn.Logger.Debug().Msg("scanner: All matched local files successfully associated with LibraryMedia records")
	}

	return libraryMediaIdMap
}

