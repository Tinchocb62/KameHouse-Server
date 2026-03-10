package core

import (
	"kamehouse/internal/api/metadata_provider"
	"kamehouse/internal/platforms/anilist_platform"
	"kamehouse/internal/platforms/offline_platform"

	"github.com/spf13/viper"
)

// SetOfflineMode changes the offline mode.
// It updates the config and active AniList platform.
func (a *App) SetOfflineMode(enabled bool) {
	// Update the config
	a.Config.Server.Offline = enabled
	viper.Set("server.offline", enabled)
	err := viper.WriteConfig()
	if err != nil {
		a.Logger.Err(err).Msg("app: Failed to write config after setting offline mode")
	}
	a.Logger.Info().Bool("enabled", enabled).Msg("app: Offline mode set")
	a.isOfflineRef.Set(enabled)

	if a.Metadata.AnilistPlatformRef.IsPresent() {
		a.Metadata.AnilistPlatformRef.Get().Close()
	}
	if a.Metadata.ProviderRef.IsPresent() {
		a.Metadata.ProviderRef.Get().Close()
	}

	// Update the platform and metadata provider
	if enabled {
		if a.NakamaManager.IsConnectedToHost() || a.NakamaManager.IsHost() {
			a.NakamaManager.Stop()
		}

		anilistPlatform, _ := offline_platform.NewOfflinePlatform(a.LocalManager, a.Metadata.AnilistClientRef, a.Logger)
		a.Metadata.AnilistPlatformRef.Set(anilistPlatform)
		a.Metadata.ProviderRef.Set(a.LocalManager.GetOfflineMetadataProvider())
	} else {
		// DEVNOTE: We don't handle local platform since the feature doesn't allow offline mode
		anilistPlatform := anilist_platform.NewAnilistPlatform(a.Metadata.AnilistClientRef, a.ExtensionBankRef, a.Logger, a.Database)
		a.Metadata.AnilistPlatformRef.Set(anilistPlatform)
		a.Metadata.ProviderRef.Set(metadata_provider.NewProvider(&metadata_provider.NewProviderImplOptions{
			Logger:           a.Logger,
			FileCacher:       a.FileCacher,
			ExtensionBankRef: a.ExtensionBankRef,
			Database:         a.Database,
		}))
		a.InitOrRefreshAnilistData()
	}
	a.AddOnRefreshAnilistCollectionFunc("anilist-platform", func() {
		a.Metadata.AnilistPlatformRef.Get().ClearCache()
	})

	a.InitOrRefreshModules()
}
