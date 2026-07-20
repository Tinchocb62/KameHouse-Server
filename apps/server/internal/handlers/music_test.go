package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"testing"

	"github.com/labstack/echo/v4"
)

func newTestContext(e *echo.Echo, query url.Values) (echo.Context, *httptest.ResponseRecorder) {
	req := httptest.NewRequest(http.MethodGet, "/?"+query.Encode(), nil)
	rec := httptest.NewRecorder()
	return e.NewContext(req, rec), rec
}

func TestHandleScanBackgroundMusic(t *testing.T) {
	dir := t.TempDir()
	// Archivos de audio válidos + uno que debe ignorarse.
	for _, name := range []string{"b-song.mp3", "a-tune.flac", "notes.txt", "cover.jpg"} {
		if err := os.WriteFile(filepath.Join(dir, name), []byte("x"), 0o644); err != nil {
			t.Fatal(err)
		}
	}

	e := echo.New()
	e.HTTPErrorHandler = CustomHTTPErrorHandler
	h := &Handler{}

	c, rec := newTestContext(e, url.Values{"dir": {dir}})
	if err := h.HandleScanBackgroundMusic(c); err != nil {
		t.Fatalf("handler returned error: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var resp APIResponse[BackgroundMusicScanResponse]
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if len(resp.Data.Tracks) != 2 {
		t.Fatalf("expected 2 audio tracks, got %d (%+v)", len(resp.Data.Tracks), resp.Data.Tracks)
	}
	// Debe venir ordenado alfabéticamente por nombre.
	if resp.Data.Tracks[0].Name != "a-tune" || resp.Data.Tracks[1].Name != "b-song" {
		t.Fatalf("tracks not sorted: %+v", resp.Data.Tracks)
	}
	if resp.Data.Tracks[1].File != "b-song.mp3" {
		t.Fatalf("expected file name preserved, got %q", resp.Data.Tracks[1].File)
	}
}

func TestHandleScanBackgroundMusic_MissingDir(t *testing.T) {
	e := echo.New()
	h := &Handler{}
	c, _ := newTestContext(e, url.Values{})
	err := h.HandleScanBackgroundMusic(c)
	he, ok := err.(*echo.HTTPError)
	if !ok || he.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 HTTPError, got %v", err)
	}
}

func TestHandleStreamBackgroundMusic_PathTraversal(t *testing.T) {
	e := echo.New()
	h := &Handler{}
	// Un intento de path traversal debe rechazarse antes de tocar el disco.
	c, _ := newTestContext(e, url.Values{"dir": {t.TempDir()}, "file": {"../secret.mp3"}})
	err := h.HandleStreamBackgroundMusic(c)
	he, ok := err.(*echo.HTTPError)
	if !ok || he.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 HTTPError for traversal, got %v", err)
	}
}

func TestHandleStreamBackgroundMusic_ServesFile(t *testing.T) {
	dir := t.TempDir()
	content := []byte("ID3-fake-audio-bytes")
	if err := os.WriteFile(filepath.Join(dir, "song.mp3"), content, 0o644); err != nil {
		t.Fatal(err)
	}

	e := echo.New()
	e.HTTPErrorHandler = CustomHTTPErrorHandler
	h := &Handler{}

	c, rec := newTestContext(e, url.Values{"dir": {dir}, "file": {"song.mp3"}})
	if err := h.HandleStreamBackgroundMusic(c); err != nil {
		t.Fatalf("handler returned error: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if rec.Body.String() != string(content) {
		t.Fatalf("served body mismatch")
	}
}

func TestHandleStreamBackgroundMusic_RejectsNonAudio(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "notes.txt"), []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	e := echo.New()
	h := &Handler{}
	c, _ := newTestContext(e, url.Values{"dir": {dir}, "file": {"notes.txt"}})
	err := h.HandleStreamBackgroundMusic(c)
	he, ok := err.(*echo.HTTPError)
	if !ok || he.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 HTTPError for non-audio, got %v", err)
	}
}
