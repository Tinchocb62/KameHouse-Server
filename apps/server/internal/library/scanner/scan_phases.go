package scanner

import (
	"context"
	"runtime"
	"strconv"
	"sync"

	"kamehouse/internal/database/models/dto"
	"kamehouse/internal/events"
	librarymetadata "kamehouse/internal/library/metadata"
)

// scanEnrichmentPhase runs optional metadata enrichers (FanArt, OMDb) in parallel.
func (scn *Scanner) scanEnrichmentPhase(ctx context.Context, localFiles []*dto.LocalFile, mc *MediaContainer, tmdbProvider *librarymetadata.TMDBProvider) {
	if scn.FanArtEnricher == nil && scn.OMDbEnricher == nil {
		return
	}

	scn.Logger.Info().Msg("scanner: running optional metadata enrichers")
	normalizedMap := make(map[int]*dto.NormalizedMedia)
	for _, nm := range mc.NormalizedMedia {
		normalizedMap[nm.ID] = nm
	}

	mediaGroups := make(map[int][]*dto.LocalFile)
	for _, lf := range localFiles {
		if lf.MediaID != 0 {
			mediaGroups[lf.MediaID] = append(mediaGroups[lf.MediaID], lf)
		}
	}

	enrichWorkers := runtime.NumCPU()
	if enrichWorkers < 2 {
		enrichWorkers = 2
	}
	if enrichWorkers > 8 {
		enrichWorkers = 8
	}

	mIdChan := make(chan int, len(mediaGroups))
	for mID := range mediaGroups {
		mIdChan <- mID
	}
	close(mIdChan)

	var enrichWg sync.WaitGroup
	for i := 0; i < enrichWorkers; i++ {
		enrichWg.Add(1)
		go func() {
			defer enrichWg.Done()
			for mID := range mIdChan {
				matchedMedia, ok := normalizedMap[mID]
				if !ok {
					continue
				}

				if scn.FanArtEnricher != nil {
					isMovie := matchedMedia.ID >= 1_000_000 || (matchedMedia.Format != nil && *matchedMedia.Format == dto.MediaFormatMovie)
					if isMovie {
						realTmdbId := matchedMedia.ID
						if realTmdbId >= 1_000_000 {
							realTmdbId -= 1_000_000
						}
						_ = scn.FanArtEnricher.EnrichMovie(ctx, matchedMedia, realTmdbId)
					} else {
						tvdbID := ""
						if matchedMedia.TvdbId != nil {
							tvdbID = strconv.Itoa(*matchedMedia.TvdbId)
						}
						if tvdbID == "" && tmdbProvider != nil {
							extIds, err := tmdbProvider.GetClient().GetTVExternalIDs(ctx, matchedMedia.ID)
							if err == nil && extIds.TvdbID != "" {
								tvdbID = extIds.TvdbID
							}
						}
						if tvdbID != "" {
							_ = scn.FanArtEnricher.EnrichTV(ctx, matchedMedia, tvdbID)
						}
					}
				}

				if scn.OMDbEnricher != nil {
					if matchedMedia.Title != nil && matchedMedia.Title.UserPreferred != nil {
						year := 0
						if matchedMedia.Year != nil {
							year = *matchedMedia.Year
						}
						_ = scn.OMDbEnricher.EnrichByTitle(ctx, matchedMedia, *matchedMedia.Title.UserPreferred, year)
					}
				}

			}
		}()
	}
	enrichWg.Wait()
}

// scanFinalizePhase sends completion events, merges skipped files, and logs scan summary.
func (scn *Scanner) scanFinalizePhase(
	localFiles []*dto.LocalFile,
	skippedLfs map[string]*dto.LocalFile,
	sortedLibraryPaths []string,
	mc *MediaContainer,
	mf *MediaFetcher,
) []*dto.LocalFile {
	if scn.WSEventManager != nil {
		scn.WSEventManager.SendEvent(events.EventScanProgress, 90)
		scn.WSEventManager.SendEvent(events.EventScanStatus, "Verifying file integrity...")
		scn.WSEventManager.SendEvent(events.EventScanProgressDetailed, map[string]interface{}{
			"stage":   "integrity-check",
			"message": "Verifying file integrity and merging results...",
		})
	}

	if len(skippedLfs) > 0 {
		for _, sf := range skippedLfs {
			if sf == nil {
				continue
			}
			localFiles = append(localFiles, sf)
		}
	}

	scn.ScanSummaryLogger.HydrateData(localFiles, mc.NormalizedMedia, nil)

	scn.addRemainingShelvedFiles(skippedLfs, sortedLibraryPaths)

	scn.Logger.Info().Msg("scanner: Scan completed")
	if scn.WSEventManager != nil {
		scn.WSEventManager.SendEvent(events.EventScanProgress, 100)
		scn.WSEventManager.SendEvent(events.EventScanStatus, "Scan completed")
	}

	if scn.ScanLogger != nil {
		scn.ScanLogger.logger.Info().
			Int("count", len(localFiles)).
			Int("unknownMediaCount", len(mf.UnknownMediaIds)).
			Msg("Scan completed")
	}

	if scn.EventDispatcher != nil {
		scn.EventDispatcher.Publish(events.Event{
			Topic: "library.scan",
			Payload: map[string]any{
				"status":          "FINISH",
				"total_processed": len(localFiles),
			},
		})
	}

	return localFiles
}
