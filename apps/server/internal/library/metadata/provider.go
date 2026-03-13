package metadata

import (
	"context"
	"errors"

	"kamehouse/internal/database/models/dto"
)

// ErrNotFound is returned by providers when no matching results are found.
var ErrNotFound = errors.New("metadata: not found")

// Provider represents a generic source of media metadata (AniList, TMDb, TVDB, etc.)
type Provider interface {
	// GetProviderID returns the unique identifier for this provider (e.g., "anilist", "tmdb")
	GetProviderID() string

	// GetName returns the human-readable name of the provider
	GetName() string

	// SearchMedia performs a search query and returns a list of normalized media results
	SearchMedia(ctx context.Context, query string) ([]*dto.NormalizedMedia, error)

	// GetMediaDetails fetches the full details for a specific media ID
	GetMediaDetails(ctx context.Context, id string) (*dto.NormalizedMedia, error)
}
