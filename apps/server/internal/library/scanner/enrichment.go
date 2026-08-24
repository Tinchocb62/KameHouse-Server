package scanner

import (
	"context"
	"encoding/json"
	"fmt"
	"kamehouse/internal/api/metadata_provider"
	"kamehouse/internal/database/db"
	"kamehouse/internal/database/models"
	"kamehouse/internal/database/models/dto"
	"sync"
	"time"

	"github.com/samber/lo"
	apiMetadata "kamehouse/internal/api/metadata"
)

// enrichWorkerResult holds the output of a single media enrichment job.
type enrichWorkerResult struct {
	seasons  []*models.LibrarySeason
	episodes []*models.LibraryEpisode
}

// enrichMediaMetadata fetches additional metadata (seasons, episodes) for TV shows
// using a concurrent worker pool to avoid the 2-3 minute sequential bottleneck.
func (scn *Scanner) enrichMediaMetadata(ctx context.Context, libraryMediaIdMap map[int]uint, movieIds map[int]bool, localFiles []*dto.LocalFile) error {
	if scn.MetadataProviderRef == nil {
		return nil
	}

	// Collect TV show IDs to enrich (skip movies).
	type enrichJob struct {
		tmdbID int
		libId  uint
	}
	var jobs []enrichJob
	seen := make(map[int]bool)
	for tmdbMediaId, libId := range libraryMediaIdMap {
		if movieIds[tmdbMediaId] || movieIds[tmdbMediaId-1_000_000] {
			continue
		}
		if tmdbMediaId <= 0 || seen[tmdbMediaId] {
			continue
		}
		seen[tmdbMediaId] = true
		jobs = append(jobs, enrichJob{tmdbID: tmdbMediaId, libId: libId})
	}

	if len(jobs) == 0 {
		return nil
	}

	// Fan-out: distribute jobs to a bounded worker pool.
	// 3 workers = enough parallelism for the rate-limited providers without hammering APIs.
	const maxWorkers = 3

	jobCh := make(chan enrichJob, len(jobs))
	resultCh := make(chan enrichWorkerResult, len(jobs))

	for _, j := range jobs {
		jobCh <- j
	}
	close(jobCh)

	provider := scn.MetadataProviderRef
	tagger := metadata_provider.NewIntelligenceTagger()

	var wg sync.WaitGroup
	numWorkers := maxWorkers
	if len(jobs) < maxWorkers {
		numWorkers = len(jobs)
	}

	for w := 0; w < numWorkers; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for job := range jobCh {
				if ctx.Err() != nil {
					return
				}
				result := scn.enrichSingleMedia(ctx, job.tmdbID, job.libId, provider, tagger, localFiles)
				resultCh <- result
			}
		}()
	}

	// Close result channel once all workers are done.
	go func() {
		wg.Wait()
		close(resultCh)
	}()

	// Fan-in: collect results.
	var allSeasons []*models.LibrarySeason
	var allEpisodes []*models.LibraryEpisode
	for res := range resultCh {
		allSeasons = append(allSeasons, res.seasons...)
		allEpisodes = append(allEpisodes, res.episodes...)
	}

	// Batch-persist all at once.
	if len(allSeasons) > 0 {
		scn.Logger.Info().Int("count", len(allSeasons)).Msg("scanner: Persisting seasons batch")
		if err := db.UpsertLibrarySeasonBatch(scn.Database, allSeasons, 20); err != nil {
			scn.Logger.Warn().Err(err).Msg("scanner: Failed to persist seasons batch")
		}
	}
	if len(allEpisodes) > 0 {
		scn.Logger.Info().Int("count", len(allEpisodes)).Msg("scanner: Persisting episodes batch")
		if err := db.UpsertLibraryEpisodeBatch(scn.Database, allEpisodes, 50); err != nil {
			scn.Logger.Warn().Err(err).Msg("scanner: Failed to persist episodes batch")
		}
	}

	return nil
}

// enrichSingleMedia fetches metadata for one TV show and returns its seasons and episodes.
// This function is designed to be called concurrently from multiple goroutines.
func (scn *Scanner) enrichSingleMedia(
	ctx context.Context,
	positiveTmdbId int,
	libMediaId uint,
	provider metadata_provider.Provider,
	tagger *metadata_provider.IntelligenceTagger,
	localFiles []*dto.LocalFile,
) enrichWorkerResult {
	scn.Logger.Info().Int("tmdbID", positiveTmdbId).Msg("scanner: Fetching enriched episode metadata")

	animeMeta, err := provider.GetAnimeMetadata(positiveTmdbId)
	if err != nil {
		scn.Logger.Debug().Err(err).Int("tmdbID", positiveTmdbId).Msg("scanner: Enrichment skipped (provider error or missing API key)")
		return enrichWorkerResult{}
	}
	if animeMeta == nil {
		return enrichWorkerResult{}
	}

	// Update LibraryMedia with AniDB and MAL IDs.
	if animeMeta.Mappings != nil {
		_ = db.UpdateLibraryMediaMappings(scn.Database, libMediaId, animeMeta.Mappings.AnidbId, animeMeta.Mappings.MyanimelistId)
	}

	episodesBySeason := make(map[int][]*apiMetadata.EpisodeMetadata)
	for _, ep := range animeMeta.Episodes {
		episodesBySeason[ep.SeasonNumber] = append(episodesBySeason[ep.SeasonNumber], ep)
	}

	var seasons []*models.LibrarySeason
	var episodes []*models.LibraryEpisode

	for seasonNum, eps := range episodesBySeason {
		if ctx.Err() != nil {
			return enrichWorkerResult{}
		}

		seasonTitle := fmt.Sprintf("Season %d", seasonNum)
		if seasonNum == 0 {
			seasonTitle = "Specials"
		}

		var seasonImage string
		seasonDescription := ""
		if scn.TMDBClient != nil {
			if sDetails, err := scn.TMDBClient.GetTVSeason(ctx, positiveTmdbId, seasonNum); err == nil {
				seasonTitle = sDetails.Name
				seasonDescription = sDetails.Overview
				if sDetails.PosterPath != "" {
					seasonImage = "https://image.tmdb.org/t/p/w500" + sDetails.PosterPath
				}
			}
		}

		seasons = append(seasons, &models.LibrarySeason{
			LibraryMediaID: libMediaId,
			SeasonNumber:   seasonNum,
			Title:          seasonTitle,
			Description:    seasonDescription,
			Image:          seasonImage,
		})

		for _, ep := range eps {
			sagaId := ep.SagaId
			sagaName := ep.SagaName

			// If sagaId or sagaName is empty, populate from Dragon Ball local saga definitions
			if sagaId == "" || sagaName == "" {
				dbSagas := GetDragonBallSagas(positiveTmdbId)
				epNum := ep.EpisodeNumber
				if ep.AbsoluteEpisodeNumber > 0 {
					epNum = ep.AbsoluteEpisodeNumber
				}
				for _, s := range dbSagas {
					if epNum >= s.startEp && epNum <= s.endEp {
						sagaId = s.id
						sagaName = s.name
						break
					}
				}
			}

			libEp := &models.LibraryEpisode{
				LibraryMediaID: libMediaId,
				EpisodeNumber:  ep.EpisodeNumber,
				SeasonNumber:   ep.SeasonNumber,
				Type:           "REGULAR",
				Title:          ep.Title,
				Description:    ep.Overview,
				Image:          ep.Image,
				RuntimeMinutes: ep.Length,
				SagaId:         sagaId,
				SagaName:       sagaName,
				AbsoluteNumber: ep.AbsoluteEpisodeNumber,
			}

			if ep.IsFiller {
				libEp.Type = "FILLER"
			}
			if seasonNum == 0 {
				libEp.Type = "SPECIAL"
			}

			if ep.AirDate != "" {
				if parsedDate, parseErr := time.Parse(time.DateOnly, ep.AirDate); parseErr == nil {
					libEp.AirDate = parsedDate
				}
			}

			// Intelligence & Tagging V2
			analysis := tagger.Analyze(fmt.Sprintf("%d_%d_%d", positiveTmdbId, ep.SeasonNumber, ep.EpisodeNumber), libEp.Title, libEp.Description, false)
			libEp.Tags = analysis.GetTagsAsJSON()
			libEp.DominantVibe = analysis.DominantVibe
			libEp.SuggestedSwimlane = analysis.SuggestedSwimlane

			// Extract languages from local files (read-only, safe for concurrent access).
			var audioLangs []string
			var subtitleLangs []string
			for _, lf := range localFiles {
				if lf.MediaID == positiveTmdbId && lf.Metadata != nil && lf.Metadata.Episode == ep.EpisodeNumber && lf.GetSeasonNumber() == ep.SeasonNumber {
					if lf.TechnicalInfo != nil {
						for _, a := range lf.TechnicalInfo.AudioStreams {
							if a.Language != "" {
								audioLangs = append(audioLangs, a.Language)
							}
						}
						for _, s := range lf.TechnicalInfo.SubtitleStreams {
							if s.Language != "" {
								subtitleLangs = append(subtitleLangs, s.Language)
							}
						}
					}
				}
			}

			audioLangs = lo.Uniq(audioLangs)
			subtitleLangs = lo.Uniq(subtitleLangs)

			if len(audioLangs) > 0 {
				if b, err := json.Marshal(audioLangs); err == nil {
					libEp.AudioTracks = b
				}
			}
			if len(subtitleLangs) > 0 {
				if b, err := json.Marshal(subtitleLangs); err == nil {
					libEp.SubtitleTracks = b
				}
			}

			episodes = append(episodes, libEp)
		}
	}

	return enrichWorkerResult{seasons: seasons, episodes: episodes}
}

func (scn *Scanner) resolveSagasForMediaSync(ctx context.Context, tvID int) []sagaResolution {
	if scn.TMDBClient == nil {
		return nil
	}

	tmdbGroups, err := scn.TMDBClient.GetEpisodeGroups(ctx, tvID)
	if err != nil || len(tmdbGroups) == 0 {
		return nil
	}

	sagas := make([]sagaResolution, 0, len(tmdbGroups))
	accumulated := 0

	for _, g := range tmdbGroups {
		startEp := accumulated + 1
		endEp := accumulated + g.Episodes
		accumulated += g.Episodes

		sagas = append(sagas, sagaResolution{
			id:      g.ID,
			name:    g.Name,
			startEp: startEp,
			endEp:   endEp,
		})
	}

	return sagas
}

