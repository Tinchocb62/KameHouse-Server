package scanner

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestMapAniListFallbackToAniZip(t *testing.T) {
	animapServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer animapServer.Close()

	anizipServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"mappings":{"anilist_id":123}}`))
	}))
	defer anizipServer.Close()

	oldAnimap := animapBaseURL
	oldAnizip := anizipBaseURL
	animapBaseURL = animapServer.URL
	anizipBaseURL = anizipServer.URL
	t.Cleanup(func() {
		animapBaseURL = oldAnimap
		anizipBaseURL = oldAnizip
	})

	id, err := mapAniListIDFromTMDB(context.Background(), 999)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if id != 123 {
		t.Fatalf("expected AniList ID 123, got %d", id)
	}
}
