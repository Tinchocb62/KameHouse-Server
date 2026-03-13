package scanner

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"kamehouse/internal/constants"
	"kamehouse/internal/library/metadata"
	httputil "kamehouse/internal/util/http"
	"kamehouse/internal/util/httpclient"
)

const mappingTimeout = 10 * time.Second

var (
	animapBaseURL = constants.InternalMetadataURL
	anizipBaseURL = "https://api.ani.zip"
)

func mapAniListIDFromTMDB(ctx context.Context, tmdbID int) (int, error) {
	if tmdbID <= 0 {
		return 0, metadata.ErrNotFound
	}
	return mapAniListID(ctx, "themoviedb", tmdbID)
}

func mapAniListIDFromAniDB(ctx context.Context, anidbID int) (int, error) {
	if anidbID <= 0 {
		return 0, metadata.ErrNotFound
	}
	return mapAniListID(ctx, "anidb", anidbID)
}

func mapAniListID(ctx context.Context, from string, id int) (int, error) {
	ctx, cancel := context.WithTimeout(ctx, mappingTimeout)
	defer cancel()

	if anilistID, err := fetchAnimapAniListID(ctx, from, id); err == nil && anilistID > 0 {
		return anilistID, nil
	}
	if anilistID, err := fetchAniZipAniListID(ctx, from, id); err == nil && anilistID > 0 {
		return anilistID, nil
	}
	return 0, metadata.ErrNotFound
}

type animapResponse struct {
	Mappings struct {
		AnilistID int `json:"anilist_id,omitempty"`
	} `json:"mappings,omitempty"`
}

func fetchAnimapAniListID(ctx context.Context, from string, id int) (int, error) {
	url := fmt.Sprintf("%s/entry?%s_id=%d", animapBaseURL, from, id)
	headers := map[string]string{
		"X-KameHouse-Version": "KameHouse/" + constants.Version,
	}
	body, status, err := getWithRetry(ctx, url, headers)
	if err != nil {
		return 0, err
	}
	if status == http.StatusNotFound {
		return 0, metadata.ErrNotFound
	}
	if status < 200 || status >= 300 {
		return 0, fmt.Errorf("animap status %d", status)
	}
	var resp animapResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return 0, err
	}
	if resp.Mappings.AnilistID <= 0 {
		return 0, metadata.ErrNotFound
	}
	return resp.Mappings.AnilistID, nil
}

type anizipResponse struct {
	Mappings struct {
		AnilistID int `json:"anilist_id,omitempty"`
	} `json:"mappings,omitempty"`
}

func fetchAniZipAniListID(ctx context.Context, from string, id int) (int, error) {
	url := fmt.Sprintf("%s/v1/episodes?%s_id=%d", anizipBaseURL, from, id)
	body, status, err := getWithRetry(ctx, url, nil)
	if err != nil {
		return 0, err
	}
	if status == http.StatusNotFound {
		return 0, metadata.ErrNotFound
	}
	if status < 200 || status >= 300 {
		return 0, fmt.Errorf("anizip status %d", status)
	}
	var resp anizipResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return 0, err
	}
	if resp.Mappings.AnilistID <= 0 {
		return 0, metadata.ErrNotFound
	}
	return resp.Mappings.AnilistID, nil
}

func getWithRetry(ctx context.Context, url string, headers map[string]string) ([]byte, int, error) {
	client := httputil.NewFastClient()
	delay := time.Second
	var lastErr error

	for attempt := 0; attempt < 3; attempt++ {
		if err := ctx.Err(); err != nil {
			return nil, 0, err
		}

		req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
		if err != nil {
			return nil, 0, err
		}
		for k, v := range headers {
			req.Header.Set(k, v)
		}

		resp, err := client.Do(req)
		if err != nil {
			lastErr = err
		} else {
			body, readErr := readBody(resp)
			if resp.StatusCode == http.StatusTooManyRequests {
				if attempt == 2 {
					return nil, resp.StatusCode, errors.New("rate limited")
				}
				retryAfter, ok := httpclient.ParseRetryAfter(resp.Header, time.Now())
				if !ok {
					retryAfter = delay
					delay *= 2
				}
				sleepWithContext(ctx, retryAfter)
				continue
			}
			if readErr != nil {
				lastErr = readErr
			} else {
				return body, resp.StatusCode, nil
			}
		}

		if attempt < 2 {
			sleepWithContext(ctx, delay)
			delay *= 2
		}
	}

	return nil, 0, lastErr
}

func readBody(resp *http.Response) ([]byte, error) {
	if resp == nil || resp.Body == nil {
		return nil, errors.New("nil response body")
	}
	defer resp.Body.Close()
	return io.ReadAll(resp.Body)
}

func sleepWithContext(ctx context.Context, d time.Duration) {
	if d <= 0 {
		return
	}
	timer := time.NewTimer(d)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return
	case <-timer.C:
		return
	}
}
