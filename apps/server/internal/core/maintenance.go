package core

import (
	"context"
	"fmt"
	"kamehouse/internal/database/db"
	"kamehouse/internal/maintenance"
	"kamehouse/internal/notifier"
	"time"
)

func (a *App) startMaintenanceScheduler() {
	scheduler := maintenance.NewScheduler(a.Logger)

	// 1. metadata-cache-sweep
	scheduler.Add(maintenance.Job{
		Name:         "metadata-cache-sweep",
		Interval:     24 * time.Hour,
		InitialDelay: 5 * time.Minute,
		Run: func(ctx context.Context) {
			deleted, err := db.DeleteExpiredMetadataCache(a.Database)
			if err != nil {
				a.Logger.Error().Err(err).Msg("maintenance: Failed to sweep metadata cache")
			} else if deleted > 0 {
				a.Logger.Info().Int64("count", deleted).Msg("maintenance: Swept expired metadata cache entries")
			}
		},
	})

	// 2. videofiles-prune
	scheduler.Add(maintenance.Job{
		Name:         "videofiles-prune",
		Interval:     24 * time.Hour,
		InitialDelay: 15 * time.Minute,
		Run: func(ctx context.Context) {
			activeHashes := a.MediastreamRepository.ActiveVideoFileHashes()
			inUse := func(hash string) bool {
				_, exists := activeHashes[hash]
				return exists
			}

			freedBytes, err := a.FileCacher.PruneMediastreamVideoFilesByAge(7*24*time.Hour, inUse)
			if err != nil {
				a.Logger.Error().Err(err).Msg("maintenance: Failed to prune videofiles cache")
			} else if freedBytes > 100*1024*1024 { // Notify only if > 100 MiB freed
				a.Logger.Info().Int64("freedBytes", freedBytes).Msg("maintenance: Pruned old videofiles cache")
				notifier.Global().Notify(notifier.TypeSystem, "Mantenimiento",
					fmt.Sprintf("Se liberaron %d MiB de caché de video.", freedBytes/(1024*1024)))
			}
		},
	})

	// 3. log-trim
	scheduler.Add(maintenance.Job{
		Name:         "log-trim",
		Interval:     24 * time.Hour,
		InitialDelay: 30 * time.Minute,
		Run: func(ctx context.Context) {
			TrimLogEntries(a.Config.Logs.Dir, a.Logger)
		},
	})

	// 4. db-cleanup
	scheduler.Add(maintenance.Job{
		Name:         "db-cleanup",
		Interval:     7 * 24 * time.Hour,
		InitialDelay: 1 * time.Hour,
		Run: func(ctx context.Context) {
			a.Database.RunDatabaseCleanup()
			a.Database.Checkpoint()
		},
	})

	scheduler.Start(a.shutdownCtx)
}
