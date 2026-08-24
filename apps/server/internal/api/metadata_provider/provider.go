// Package metadata_provider provides client integrations for fetching, caching,
// and wrapping anime metadata (e.g., from TMDB or Jikan).
package metadata_provider

import (
	"kamehouse/internal/api/anilist"
	"kamehouse/internal/api/jikan"
	"kamehouse/internal/api/metadata"
	"kamehouse/internal/api/tmdb"
	"kamehouse/internal/database/db"
	"kamehouse/internal/platforms/platform"
	"strconv"
	"testing"

	"github.com/rs/zerolog"
)

type Provider interface {
	GetAnimeMetadata(id int) (*metadata.AnimeMetadata, error)
	GetAnimeMetadataWrapper(baseAnime *platform.UnifiedMedia, animeMetadata *metadata.AnimeMetadata) AnimeMetadataWrapper
	SetUseFallbackProvider(v bool)
	ClearCache()
	Close() error
}

type AnimeMetadataWrapper interface {
	GetEpisodeMetadata(ep string) metadata.EpisodeMetadata
}

type ProviderImpl struct {
}

func (p *ProviderImpl) GetAnimeMetadata(id int) (*metadata.AnimeMetadata, error) {
	return nil, nil
}

func (p *ProviderImpl) GetAnimeMetadataWrapper(baseAnime *platform.UnifiedMedia, animeMetadata *metadata.AnimeMetadata) AnimeMetadataWrapper {
	return NewSimpleAnimeMetadataWrapper(animeMetadata)
}

func (p *ProviderImpl) SetUseFallbackProvider(v bool) {}
func (p *ProviderImpl) ClearCache()                   {}
func (p *ProviderImpl) Close() error                  { return nil }

// SimpleAnimeMetadataWrapper is a lightweight, flat wrapper that looks up episode metadata by plain episode number.
// It is used by TMDB, Jikan, and AniList providers whose metadata map uses
// plain string keys ("77") rather than composite keys.
type SimpleAnimeMetadataWrapper struct {
	metadata *metadata.AnimeMetadata
}

func NewSimpleAnimeMetadataWrapper(am *metadata.AnimeMetadata) AnimeMetadataWrapper {
	return &SimpleAnimeMetadataWrapper{metadata: am}
}

func (w *SimpleAnimeMetadataWrapper) GetEpisodeMetadata(ep string) metadata.EpisodeMetadata {
	if w == nil || w.metadata == nil {
		return metadata.EpisodeMetadata{}
	}
	// Direct key lookup (e.g., "77")
	if epMeta, found := w.metadata.FindEpisode(ep); found {
		return *epMeta
	}
	// Fallback: search by EpisodeNumber if ep is a numeric string
	epNum, err := strconv.Atoi(ep)
	if err != nil {
		return metadata.EpisodeMetadata{}
	}
	for _, epMeta := range w.metadata.Episodes {
		if epMeta.EpisodeNumber == epNum {
			return *epMeta
		}
	}
	return metadata.EpisodeMetadata{}
}

// NewProviderImplOptions configures the metadata provider.
type NewProviderImplOptions struct {
	Database         *db.Database
	Logger           *zerolog.Logger
	FileCacher       interface{}
	ExtensionBankRef interface{}
	// If set, enables real episode metadata enrichment via TMDB.
	TMDBClient      *tmdb.Client
	DefaultProvider string
	DisableTMDB     bool
}

type RoutingProvider struct {
	jikanProvider *JikanProviderImpl
	tmdbProvider  *TMDBProviderImpl
	database      *db.Database
}

func NewRoutingProvider(jikanProv *JikanProviderImpl, tmdbProv *TMDBProviderImpl, database *db.Database) *RoutingProvider {
	return &RoutingProvider{
		jikanProvider: jikanProv,
		tmdbProvider:  tmdbProv,
		database:      database,
	}
}

func (p *RoutingProvider) GetAnimeMetadata(id int) (*metadata.AnimeMetadata, error) {
	if p.database != nil && p.tmdbProvider != nil {
		if m, err := db.GetLibraryMediaByID(p.database, uint(id)); err == nil && m != nil {
			if m.Type == "MOVIE" || m.Type == "SHOW" {
				meta, err := p.tmdbProvider.GetAnimeMetadata(id)
				if err == nil && meta != nil {
					return meta, nil
				}
			}
		}
	}
	if p.jikanProvider != nil {
		return p.jikanProvider.GetAnimeMetadata(id)
	}
	return nil, nil
}

func (p *RoutingProvider) GetAnimeMetadataWrapper(baseAnime *platform.UnifiedMedia, animeMetadata *metadata.AnimeMetadata) AnimeMetadataWrapper {
	if p.database != nil && baseAnime != nil && p.tmdbProvider != nil {
		if m, err := db.GetLibraryMediaByID(p.database, uint(baseAnime.ID)); err == nil && m != nil {
			if m.Type == "MOVIE" || m.Type == "SHOW" {
				return p.tmdbProvider.GetAnimeMetadataWrapper(baseAnime, animeMetadata)
			}
		}
	}
	if p.jikanProvider != nil {
		return p.jikanProvider.GetAnimeMetadataWrapper(baseAnime, animeMetadata)
	}
	return NewSimpleAnimeMetadataWrapper(animeMetadata)
}

func (p *RoutingProvider) SetUseFallbackProvider(v bool) {
	if p.jikanProvider != nil {
		p.jikanProvider.SetUseFallbackProvider(v)
	}
	if p.tmdbProvider != nil {
		p.tmdbProvider.SetUseFallbackProvider(v)
	}
}

func (p *RoutingProvider) ClearCache() {
	if p.jikanProvider != nil {
		p.jikanProvider.ClearCache()
	}
	if p.tmdbProvider != nil {
		p.tmdbProvider.ClearCache()
	}
}

func (p *RoutingProvider) Close() error {
	if p.jikanProvider != nil {
		_ = p.jikanProvider.Close()
	}
	if p.tmdbProvider != nil {
		_ = p.tmdbProvider.Close()
	}
	return nil
}

func NewProvider(opts *NewProviderImplOptions) Provider {
	if opts != nil {
		if opts.DefaultProvider == "anilist" {
			aniClient := anilist.NewClient(opts.Logger)
			return NewAniListProviderImpl(aniClient, opts.Database, opts.Logger, opts.TMDBClient)
		}

		jikanClient := jikan.NewClient(opts.Logger)
		jikanProv := NewJikanProviderImpl(jikanClient, opts.Database, opts.Logger, opts.TMDBClient)
		if !opts.DisableTMDB && opts.TMDBClient != nil && opts.TMDBClient.HasApiKey() && opts.DefaultProvider != "jikan" {
			tmdbProv := NewTMDBProviderImpl(opts.TMDBClient, opts.Database, opts.Logger)
			return NewRoutingProvider(jikanProv, tmdbProv, opts.Database)
		}
		return jikanProv
	}
	return &ProviderImpl{}
}

func GetFakeProvider(t *testing.T, database *db.Database) Provider {
	return &ProviderImpl{}
}

