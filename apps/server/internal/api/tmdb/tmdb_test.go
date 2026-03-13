package tmdb

import (
	"context"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
)

func TestRetryAfterHandling(t *testing.T) {
	var calls int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		count := atomic.AddInt32(&calls, 1)
		if count == 1 {
			w.Header().Set("Retry-After", "1")
			w.WriteHeader(http.StatusTooManyRequests)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"page":1,"results":[{"id":1,"name":"Naruto","genre_ids":[16]}],"total_pages":1,"total_results":1}`))
	}))
	defer server.Close()

	oldBase := baseURL
	baseURL = server.URL
	t.Cleanup(func() { baseURL = oldBase })

	client := NewClient("token")
	res, err := client.SearchTV(context.Background(), "Naruto")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(res) != 1 || res[0].ID != 1 {
		t.Fatalf("unexpected result: %#v", res)
	}
	if atomic.LoadInt32(&calls) < 2 {
		t.Fatalf("expected at least 2 calls, got %d", calls)
	}
}
