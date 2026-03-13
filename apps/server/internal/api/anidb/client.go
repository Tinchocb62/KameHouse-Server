package anidb

import (
	"context"
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"time"

	httputil "kamehouse/internal/util/http"
	"kamehouse/internal/util/httpclient"

	"go.felesatra.moe/anidb"

	"github.com/rs/zerolog"
)

type Client struct {
	client      *anidb.Client
	logger      *zerolog.Logger
	username    string
	password    string
	httpClient  *http.Client
	rateLimiter chan struct{}
}

type AnimeInfo struct {
	ID             int
	Title          string
	TitleJapanese  string
	TitleRomaji    string
	Type           string
	Episodes       int
	StartDate      time.Time
	EndDate        time.Time
	Summary        string
	Image          string
	Genres         []string
	EpisodesDetail []EpisodeInfo
}

type EpisodeInfo struct {
	Number        int
	Title         string
	TitleJapanese string
	AirDate       time.Time
	Rating        float64
}

type SearchResult struct {
	ID         int
	Title      string
	TitleShort string
	Type       string
	Episodes   int
}

func NewClient(username, password string, logger *zerolog.Logger) *Client {
	client := &anidb.Client{
		Name:    "kamehouse",
		Version: 1,
	}

	return &Client{
		client:      client,
		logger:      logger,
		username:    username,
		password:    password,
		httpClient:  httputil.NewFastClient(),
		rateLimiter: make(chan struct{}, 2),
	}
}

func (c *Client) GetAnime(ctx context.Context, aid int) (*AnimeInfo, error) {
	anime, err := c.requestAnime(ctx, aid)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch anime %d: %w", aid, err)
	}

	return c.convertAnime(anime), nil
}

func (c *Client) SearchByTitle(ctx context.Context, title string) ([]SearchResult, error) {
	c.logger.Debug().Str("title", title).Msg("anidb: searching by title is not implemented, use GetAnimeByTitle")
	return nil, fmt.Errorf("search by title not implemented, use GetAnimeByTitle with exact name")
}

func (c *Client) GetAnimeByTitle(ctx context.Context, title string) (*AnimeInfo, error) {
	c.logger.Debug().Str("title", title).Msg("anidb: get anime by title not implemented")
	return nil, fmt.Errorf("get anime by title not implemented")
}

func (c *Client) requestAnime(ctx context.Context, aid int) (*anidb.Anime, error) {
	params := url.Values{}
	params.Set("client", c.client.Name)
	params.Set("clientver", strconv.Itoa(c.client.Version))
	params.Set("protover", "1")
	params.Set("request", "anime")
	params.Set("aid", strconv.Itoa(aid))

	endpoint := "http://api.anidb.net:9001/httpapi?" + params.Encode()
	delay := time.Second
	var lastErr error

	for attempt := 0; attempt < 3; attempt++ {
		if err := ctx.Err(); err != nil {
			return nil, err
		}

		req, err := http.NewRequestWithContext(ctx, "GET", endpoint, nil)
		if err != nil {
			return nil, err
		}
		req.Header.Set("User-Agent", "KameHouse/1.0")

		c.rateLimiter <- struct{}{}
		resp, err := c.httpClient.Do(req)
		<-c.rateLimiter

		if err != nil {
			lastErr = err
		} else if resp != nil {
			body, readErr := io.ReadAll(resp.Body)
			resp.Body.Close()

			if resp.StatusCode == http.StatusTooManyRequests {
				if attempt == 2 {
					lastErr = fmt.Errorf("anidb rate limited")
					return nil, lastErr
				}
				retryAfter, ok := httpclient.ParseRetryAfter(resp.Header, time.Now())
				if !ok {
					retryAfter = delay
					delay *= 2
				}
				lastErr = fmt.Errorf("anidb rate limited")
				sleepWithContext(ctx, retryAfter)
				continue
			}

			if resp.StatusCode < 200 || resp.StatusCode >= 300 {
				return nil, fmt.Errorf("anidb status %d", resp.StatusCode)
			}

			if readErr != nil {
				lastErr = readErr
			} else if err := checkAPIError(body); err != nil {
				return nil, err
			} else {
				var anime anidb.Anime
				if err := xml.Unmarshal(body, &anime); err != nil {
					return nil, err
				}
				return &anime, nil
			}
		}

		if attempt < 2 {
			sleepWithContext(ctx, delay)
			delay *= 2
		}
	}

	return nil, lastErr
}

func checkAPIError(data []byte) error {
	var n xml.Name
	_ = xml.Unmarshal(data, &n)
	if n.Local != "error" {
		return nil
	}
	var payload struct {
		Text string `xml:",innerxml"`
	}
	if err := xml.Unmarshal(data, &payload); err != nil {
		return err
	}
	return fmt.Errorf("API error %s", payload.Text)
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

func (c *Client) convertAnime(a *anidb.Anime) *AnimeInfo {
	info := &AnimeInfo{
		ID:       a.AID,
		Type:     a.Type,
		Episodes: a.EpisodeCount,
	}

	for _, t := range a.Titles {
		switch t.Lang {
		case "en":
			info.Title = t.Name
		case "ja":
			info.TitleJapanese = t.Name
		case "x-jat":
			info.TitleRomaji = t.Name
		}
	}

	if info.Title == "" && len(a.Titles) > 0 {
		info.Title = a.Titles[0].Name
	}

	if a.StartDate != "" {
		info.StartDate, _ = time.Parse("2006-01-02", a.StartDate)
	}

	if a.EndDate != "" {
		info.EndDate, _ = time.Parse("2006-01-02", a.EndDate)
	}

	for _, ep := range a.Episodes {
		epNum := parseEpisodeNumber(ep.EpNo)
		rating := 0.0
		info.EpisodesDetail = append(info.EpisodesDetail, EpisodeInfo{
			Number:        epNum,
			Title:         getFirstEpTitle(ep.Titles),
			TitleJapanese: getFirstEpTitleJP(ep.Titles),
			Rating:        rating,
		})
	}

	return info
}

func parseEpisodeNumber(epno string) int {
	num := 0
	for _, c := range epno {
		if c >= '0' && c <= '9' {
			num = num*10 + int(c-'0')
		}
	}
	return num
}

func getFirstEpTitle(titles []anidb.EpTitle) string {
	for _, t := range titles {
		if t.Lang == "en" {
			return t.Title
		}
	}
	if len(titles) > 0 {
		return titles[0].Title
	}
	return ""
}

func getFirstEpTitleJP(titles []anidb.EpTitle) string {
	for _, t := range titles {
		if t.Lang == "ja" {
			return t.Title
		}
	}
	return ""
}
