package extension_repo

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// ─────────────────────────────────────────────────────────────────────────────
// Typed sentinel errors — callers can errors.Is() these without string matching.
// ─────────────────────────────────────────────────────────────────────────────

// ErrStremioRateLimit is returned when the upstream returns HTTP 429.
var ErrStremioRateLimit = errors.New("stremio: rate-limited by upstream (HTTP 429)")

// ErrStremioUnavailable is returned on HTTP 503 / Cloudflare origin errors.
var ErrStremioUnavailable = errors.New("stremio: upstream unavailable (HTTP 503)")

// ErrStremioMalformedJSON is returned when the response body is not valid JSON.
var ErrStremioMalformedJSON = errors.New("stremio: malformed JSON response")

// AddonError wraps a typed sentinel with addon identity and HTTP context for
// structured logging without losing the original sentinel for errors.Is().
type AddonError struct {
	AddonName  string
	URL        string
	StatusCode int
	Cause      error
}

func (e *AddonError) Error() string {
	if e.StatusCode != 0 {
		return fmt.Sprintf("stremio_addon[%s]: %v (HTTP %d, url=%s)", e.AddonName, e.Cause, e.StatusCode, e.URL)
	}
	return fmt.Sprintf("stremio_addon[%s]: %v (url=%s)", e.AddonName, e.Cause, e.URL)
}

func (e *AddonError) Unwrap() error { return e.Cause }

// ─────────────────────────────────────────────────────────────────────────────
// Protocol Structs — strict mirrors of the Stremio Addon SDK wire format.
// ─────────────────────────────────────────────────────────────────────────────

// Manifest is the top-level descriptor returned at {base}/manifest.json.
// Optional slices use pointers so the zero-value ("null" vs "[]") is preserved
// for GC-friendly JSON decoding of large arrays.
type Manifest struct {
	// ID is the globally unique reverse-DNS addon identifier (e.g. "com.stremio.torrentio").
	ID string `json:"id"`
	// Version is the semantic version string.
	Version string `json:"version"`
	// Name is the human-readable addon label shown in Stremio UI.
	Name string `json:"name"`
	// Description is a short description of the addon.
	Description string `json:"description,omitempty"`
	// Resources lists the resource types this addon can serve (e.g. ["stream"]).
	Resources []string `json:"resources"`
	// Types lists the content types this addon supports (e.g. ["movie", "series"]).
	Types []string `json:"types"`
	// Catalogs lists the metadata catalogs this addon can provide. Pointer avoids
	// heap allocation for stream-only addons that omit this entirely.
	Catalogs *[]ManifestCatalog `json:"catalogs,omitempty"`
	// IDPrefixes restricts which IDs the addon can serve (e.g. ["tt"] for IMDB).
	// Pointer avoids heap allocation when the field is absent.
	IDPrefixes *[]string `json:"idPrefixes,omitempty"`
}

// ManifestCatalog describes a single metadata catalog exposed by the addon.
type ManifestCatalog struct {
	Type  string           `json:"type"`
	ID    string           `json:"id"`
	Name  string           `json:"name,omitempty"`
	Extra *[]ManifestExtra `json:"extra,omitempty"`
}

// ManifestExtra describes optional extra parameters a catalog accepts.
type ManifestExtra struct {
	Name       string   `json:"name"`
	IsRequired bool     `json:"isRequired,omitempty"`
	Options    []string `json:"options,omitempty"`
}

// StreamBehaviorHints carries optional extra metadata per stream.
type StreamBehaviorHints struct {
	// Filename is the exact filename of the target file inside the torrent batch.
	Filename string `json:"filename,omitempty"`
	// BingeGroup groups streams for binge-watching continuity across episodes.
	BingeGroup string `json:"bingeGroup,omitempty"`
	// NotWebReady signals that the stream cannot be played in a web browser.
	NotWebReady bool `json:"notWebReady,omitempty"`
	// CountryWhitelist restricts stream availability by ISO country codes.
	CountryWhitelist *[]string `json:"countryWhitelist,omitempty"`
}

// Stream is a single stream entry returned by a Stremio addon.
// All source types (torrent, HTTP, YouTube) share this struct; unused fields
// are zero (empty string / 0) rather than absent to keep the struct flat.
type Stream struct {
	// Name is the provider label + quality badge separated by "\n".
	Name string `json:"name,omitempty"`
	// Title is the human-readable release description (may be multi-line).
	Title string `json:"title,omitempty"`
	// InfoHash is the SHA-1 hex hash of the torrent info dictionary.
	// Present for torrent-based streams.
	InfoHash string `json:"infoHash,omitempty"`
	// FileIdx is the zero-based index of the target file inside a torrent.
	// 0 is a valid index, so callers must check InfoHash != "" to distinguish
	// "not set" from "first file".
	FileIdx int `json:"fileIdx,omitempty"`
	// URL is a direct-play HTTP(S) stream URL (non-torrent addons).
	URL string `json:"url,omitempty"`
	// ExternalURL opens an external player instead of streaming directly.
	ExternalURL string `json:"externalUrl,omitempty"`
	// YTVideoID is a YouTube video ID for YouTube-sourced streams.
	YTVideoID string `json:"ytId,omitempty"`
	// Description is additional human-readable info (rarely set).
	Description string `json:"description,omitempty"`
	// BehaviorHints holds optional UX metadata.
	BehaviorHints *StreamBehaviorHints `json:"behaviorHints,omitempty"`
}

// StreamResponse is the top-level envelope returned at
// {base}/stream/{type}/{id}.json.
type StreamResponse struct {
	// Streams is the list of available streams. Pointer avoids needless
	// allocation when the addon returns an empty result set.
	Streams *[]Stream `json:"streams"`
}

// ─────────────────────────────────────────────────────────────────────────────
// StremioAddon interface
// ─────────────────────────────────────────────────────────────────────────────

// StremioAddon is the contract every addon implementation must satisfy.
// All methods must be safe for concurrent use.
type StremioAddon interface {
	// Name returns the human-readable identifier for this addon.
	Name() string
	// GetManifest fetches and parses the addon manifest descriptor.
	GetManifest(ctx context.Context) (*Manifest, error)
	// FetchStreams queries the addon for streams for the given Stremio
	// resource type and ID.
	// resourceType is typically "movie", "series", or "anime".
	// id follows the addon-specific notation ("tt1234567", "kitsu:123456:1", etc.).
	FetchStreams(ctx context.Context, resourceType, id string) ([]Stream, error)
}

// ─────────────────────────────────────────────────────────────────────────────
// StremioAddonClient — production HTTP implementation
// ─────────────────────────────────────────────────────────────────────────────

const (
	// addonHTTPTimeout is the hard per-request timeout (2 s per spec).
	addonHTTPTimeout = 2 * time.Second
	// addonMaxBodyBytes guards against runaway responses (2 MB).
	addonMaxBodyBytes = 2 << 20
)

// StremioAddonClient is a production HTTP client that speaks the Stremio Addon
// Protocol. It is stateless and safe for concurrent use.
type StremioAddonClient struct {
	name       string
	baseURL    string // clean: no trailing /manifest.json
	httpClient *http.Client
}

// NewStremioAddonClient creates a client for any Stremio-compliant addon URL.
// rawURL may include or omit a trailing "/manifest.json".
func NewStremioAddonClient(name, rawURL string) *StremioAddonClient {
	return &StremioAddonClient{
		name:    name,
		baseURL: cleanStremioBase(rawURL),
		httpClient: &http.Client{
			Timeout: addonHTTPTimeout,
		},
	}
}

// Name implements StremioAddon.
func (c *StremioAddonClient) Name() string { return c.name }

// GetManifest fetches and decodes the addon manifest from {base}/manifest.json.
func (c *StremioAddonClient) GetManifest(ctx context.Context) (*Manifest, error) {
	url := c.baseURL + "/manifest.json"
	body, err := c.get(ctx, url)
	if err != nil {
		return nil, err
	}

	var m Manifest
	if err := json.Unmarshal(body, &m); err != nil {
		return nil, &AddonError{AddonName: c.name, URL: url, Cause: fmt.Errorf("%w: %w", ErrStremioMalformedJSON, err)}
	}
	return &m, nil
}

// FetchStreams fetches the stream list from {base}/stream/{resourceType}/{id}.json.
//
// Raw string concatenation is used intentionally: url.JoinPath would
// percent-encode pipe and comma characters that Stremio config segments require.
func (c *StremioAddonClient) FetchStreams(ctx context.Context, resourceType, id string) ([]Stream, error) {
	var b strings.Builder
	b.Grow(len(c.baseURL) + 10 + len(resourceType) + len(id))
	b.WriteString(c.baseURL)
	b.WriteString("/stream/")
	b.WriteString(resourceType)
	b.WriteByte('/')
	b.WriteString(id)
	b.WriteString(".json")
	url := b.String()

	body, err := c.get(ctx, url)
	if err != nil {
		return nil, err
	}

	var resp StreamResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, &AddonError{AddonName: c.name, URL: url, Cause: fmt.Errorf("%w: %w", ErrStremioMalformedJSON, err)}
	}
	if resp.Streams == nil {
		return nil, nil
	}
	return *resp.Streams, nil
}

// get performs a rate-limit-aware GET request and returns the raw body bytes.
// All HTTP error conditions are mapped to typed sentinel errors.
func (c *StremioAddonClient) get(ctx context.Context, url string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, &AddonError{AddonName: c.name, URL: url, Cause: err}
	}
	req.Header.Set("User-Agent", "KameHouse/1.0")
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, &AddonError{AddonName: c.name, URL: url, Cause: err}
	}
	defer resp.Body.Close()

	switch resp.StatusCode {
	case http.StatusOK:
		// expected — fall through
	case http.StatusTooManyRequests:
		return nil, &AddonError{AddonName: c.name, URL: url, StatusCode: resp.StatusCode, Cause: ErrStremioRateLimit}
	case http.StatusServiceUnavailable:
		return nil, &AddonError{AddonName: c.name, URL: url, StatusCode: resp.StatusCode, Cause: ErrStremioUnavailable}
	default:
		return nil, &AddonError{
			AddonName:  c.name,
			URL:        url,
			StatusCode: resp.StatusCode,
			Cause:      fmt.Errorf("stremio: unexpected HTTP status %d", resp.StatusCode),
		}
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, addonMaxBodyBytes))
	if err != nil {
		return nil, &AddonError{AddonName: c.name, URL: url, Cause: err}
	}
	return body, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

// cleanStremioBase strips a trailing "/manifest.json" (and any query string)
// returning the bare configuration base URL.
func cleanStremioBase(rawURL string) string {
	base, _, _ := strings.Cut(rawURL, "?")
	return strings.TrimSuffix(base, "/manifest.json")
}
