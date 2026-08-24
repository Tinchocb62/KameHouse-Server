package metadata_provider

import (
	"testing"

	"kamehouse/internal/api/tmdb"

	"github.com/stretchr/testify/assert"
)

func TestNewProvider_FallbackToJikan(t *testing.T) {
	// Without TMDB client
	prov := NewProvider(&NewProviderImplOptions{})
	assert.NotNil(t, prov)
	_, ok := prov.(*JikanProviderImpl)
	assert.True(t, ok, "Expected JikanProviderImpl when no TMDB client is provided")

	// With TMDB client but empty API key
	emptyTmdb := tmdb.NewClient("")
	provEmpty := NewProvider(&NewProviderImplOptions{
		TMDBClient: emptyTmdb,
	})
	assert.NotNil(t, provEmpty)
	_, okEmpty := provEmpty.(*JikanProviderImpl)
	assert.True(t, okEmpty, "Expected JikanProviderImpl when TMDB client has empty API key")

	// With configured TMDB client
	configuredTmdb := tmdb.NewClient("some_test_key_12345")
	provRouting := NewProvider(&NewProviderImplOptions{
		TMDBClient: configuredTmdb,
	})
	assert.NotNil(t, provRouting)
	_, okRouting := provRouting.(*RoutingProvider)
	assert.True(t, okRouting, "Expected RoutingProvider when TMDB client has API key configured")

	// Explicit AniList provider
	provAniList := NewProvider(&NewProviderImplOptions{
		DefaultProvider: "anilist",
		TMDBClient:      configuredTmdb,
	})
	assert.NotNil(t, provAniList)
	_, okAniList := provAniList.(*AniListProviderImpl)
	assert.True(t, okAniList, "Expected AniListProviderImpl when defaultProvider is anilist")

	// Explicit Jikan provider with TMDB configured
	provJikan := NewProvider(&NewProviderImplOptions{
		DefaultProvider: "jikan",
		TMDBClient:      configuredTmdb,
	})
	assert.NotNil(t, provJikan)
	_, okJikan := provJikan.(*JikanProviderImpl)
	assert.True(t, okJikan, "Expected JikanProviderImpl when defaultProvider is jikan")
}
