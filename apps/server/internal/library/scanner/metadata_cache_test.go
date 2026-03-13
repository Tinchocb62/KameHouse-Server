package scanner

import (
	"context"
	"reflect"
	"testing"

	"kamehouse/internal/database/models/dto"
	librarymetadata "kamehouse/internal/library/metadata"
)

type fakeProvider struct {
	id      string
	results []*dto.NormalizedMedia
	err     error
	calls   *[]string
}

func (p *fakeProvider) GetProviderID() string {
	return p.id
}

func (p *fakeProvider) GetName() string {
	return p.id
}

func (p *fakeProvider) SearchMedia(ctx context.Context, query string) ([]*dto.NormalizedMedia, error) {
	if p.calls != nil {
		*p.calls = append(*p.calls, p.id)
	}
	if p.err != nil {
		return nil, p.err
	}
	return p.results, nil
}

func (p *fakeProvider) GetMediaDetails(ctx context.Context, id string) (*dto.NormalizedMedia, error) {
	return nil, librarymetadata.ErrNotFound
}

func TestMetadataCacheProviderOrder(t *testing.T) {
	var calls []string
	providers := []librarymetadata.Provider{
		&fakeProvider{id: "anilist", err: librarymetadata.ErrNotFound, calls: &calls},
		&fakeProvider{id: "tmdb", err: librarymetadata.ErrNotFound, calls: &calls},
		&fakeProvider{id: "anidb", err: librarymetadata.ErrNotFound, calls: &calls},
	}

	cache := newMetadataFetchCache()
	_, _ = cache.FetchOnce(context.Background(), "Test Title", providers, nil)

	expected := []string{"tmdb", "anidb", "anilist"}
	if !reflect.DeepEqual(calls, expected) {
		t.Fatalf("expected order %v, got %v", expected, calls)
	}
}

func TestMetadataCacheConfidenceThreshold(t *testing.T) {
	cache := newMetadataFetchCache()

	tmdbTitle := "Random Title"
	anilistTitle := "Naruto"
	tmdbResult := &dto.NormalizedMedia{
		ID: -1,
		Title: &dto.NormalizedMediaTitle{
			English: &tmdbTitle,
		},
	}
	anilistResult := &dto.NormalizedMedia{
		ID: 123,
		Title: &dto.NormalizedMediaTitle{
			English: &anilistTitle,
		},
	}

	providers := []librarymetadata.Provider{
		&fakeProvider{id: "tmdb", results: []*dto.NormalizedMedia{tmdbResult}},
		&fakeProvider{id: "anilist", results: []*dto.NormalizedMedia{anilistResult}},
	}

	res, err := cache.FetchOnce(context.Background(), "Naruto", providers, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if res == nil || res.ID != 123 {
		t.Fatalf("expected AniList result, got %#v", res)
	}
}
