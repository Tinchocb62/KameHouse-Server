package scanner

import (
	"kamehouse/internal/database/models/dto"
	"kamehouse/internal/events"
)

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
