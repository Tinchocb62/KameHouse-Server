package torrentio

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/rs/zerolog"

	"kamehouse/internal/extension_repo"
)

// ─────────────────────────────────────────────────────────────────────────────
// Well-known public torrent trackers appended to generated magnet URIs.
// ─────────────────────────────────────────────────────────────────────────────
var defaultTrackers = []string{
	"udp://open.demonii.com:1337/announce",
	"udp://tracker.openbittorrent.com:6969/announce",
	"udp://tracker.torrent.eu.org:451/announce",
	"udp://tracker.opentrackr.org:1337/announce",
	"udp://explodie.org:6969/announce",
	"udp://tracker.zerobytes.xyz:1337/announce",
	"udp://1337.abcvg.info:80/announce",
	"udp://tracker.internetwarriors.net:1337/announce",
	"udp://open.stealth.si:80/announce",
	"udp://ipv4.tracker.harry.lu:80/announce",
	"udp://tracker.tiny-vps.com:6969/announce",
}

// qualityOrder defines the sort priority for quality labels (lower = higher priority).
var qualityOrder = map[string]int{
	"4k":      0,
	"2160p":   0,
	"1080p":   1,
	"720p":    2,
	"480p":    3,
	"360p":    4,
	"unknown": 5,
}

const (
	// scatterGatherTimeout is the hard wall-clock deadline for the entire fetch.
	scatterGatherTimeout = 3 * time.Second
)

// ─────────────────────────────────────────────────────────────────────────────
// MediaID — typed identifier for a single media source namespace.
// ─────────────────────────────────────────────────────────────────────────────

// MediaIDKind identifies the namespace an ID comes from.
type MediaIDKind string

const (
	MediaIDKitsu MediaIDKind = "kitsu"
	MediaIDIMDB  MediaIDKind = "imdb"
	MediaIDAniDB MediaIDKind = "anidb"
)

// MediaID pairs a kind with its string value and the Stremio resource type.
type MediaID struct {
	Kind         MediaIDKind
	Value        string // raw ID value (e.g. "13601", "tt1520211")
	ResourceType string // Stremio resource type: "anime", "movie", "series"
	// StremioID is the formatted Stremio ID including any episode suffix.
	// Example: "13601:5" for Kitsu episode 5, "tt1520211:1:5" for IMDB S1E5.
	StremioID string
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

// Provider is the public facade for the Torrentio integration.
// It implements a two-tier concurrent resolution strategy:
//
//   - Tier 1 (ID Race): queries all supplied MediaIDs concurrently; the first
//     addon that returns a non-empty result cancels the rest.
//   - Tier 2 (Addon Gather): for the winning ID, all registered StremioAddons
//     are queried in parallel; their results are merged and deduplicated.
type Provider struct {
	client *Client
	addons []extension_repo.StremioAddon
	logger *zerolog.Logger
}

// NewProvider creates a Provider backed by the built-in Torrentio client.
// Additional addons (e.g. Comet, ElfHosted) can be injected.
func NewProvider(logger *zerolog.Logger, extraAddons ...extension_repo.StremioAddon) *Provider {
	client := newClient(logger)
	addons := make([]extension_repo.StremioAddon, 0, 1+len(extraAddons))
	// Torrentio is always the primary source; extras are appended for redundancy.
	addons = append(addons, &torrentioNativeAddon{client: client})
	addons = append(addons, extraAddons...)

	return &Provider{
		client: client,
		addons: addons,
		logger: logger,
	}
}

// GetStreams is the legacy single-ID interface for the Kitsu anime path.
func (p *Provider) GetStreams(ctx context.Context, kitsuID int, episode int) ([]*StreamResult, error) {
	id := MediaID{
		Kind:         MediaIDKitsu,
		Value:        fmt.Sprintf("%d", kitsuID),
		ResourceType: "anime",
		StremioID:    fmt.Sprintf("%d:%d", kitsuID, episode),
	}
	return p.GetStreamsForIDs(ctx, []MediaID{id})
}

// GetSourcesForEpisode is a convenience wrapper for episode queries using an IMDB ID.
// It maps the IMDb ID to Stremio's standard "series" format (ttXXXXXXX:season:episode).
func (p *Provider) GetSourcesForEpisode(ctx context.Context, imdbID string, season int, episode int) ([]*StreamResult, error) {
	stremioID := fmt.Sprintf("%s:%d:%d", imdbID, season, episode)
	id := MediaID{
		Kind:         MediaIDIMDB,
		Value:        imdbID,
		ResourceType: "series",
		StremioID:    stremioID,
	}
	return p.GetStreamsForIDs(ctx, []MediaID{id})
}

// GetStreamsForID is the single-ID generic interface.
func (p *Provider) GetStreamsForID(ctx context.Context, resourceType, stremioID string) ([]*StreamResult, error) {
	id := MediaID{ResourceType: resourceType, StremioID: stremioID}
	return p.GetStreamsForIDs(ctx, []MediaID{id})
}

// GetStreamsForIDs is the full two-tier entry point.
//
// Tier 1 — ID Race: all IDs are queried concurrently via the primary Torrentio
// addon. The first non-empty response wins; all other in-flight goroutines are
// cancelled immediately via a shared context — guaranteeing zero leaks.
//
// Tier 2 — Addon Gather: once a winning ID is identified, all registered
// addons are queried concurrently for that ID, their results merged and
// deduplicated by InfoHash.
//
// A single 3-second hard deadline (scatterGatherTimeout) governs both tiers.
func (p *Provider) GetStreamsForIDs(ctx context.Context, ids []MediaID) ([]*StreamResult, error) {
	if len(ids) == 0 {
		return nil, nil
	}

	// One timeout governs both tiers so the total wall time is always ≤ 3 s.
	raceCtx, cancelAll := context.WithTimeout(ctx, scatterGatherTimeout)
	defer cancelAll()

	// ── Tier 1: First-Success ID Race ─────────────────────────────────────────
	// winnerCh is size-1; only the first result is consumed.
	winnerCh := make(chan string, 1) // sends the winning stremioID

	var raceDone sync.WaitGroup
	for _, id := range ids {
		raceDone.Add(1)
		go func(mid MediaID) {
			defer raceDone.Done()
			// Each goroutine uses the shared raceCtx; cancellation propagates
			// instantly if another goroutine has already won.
			streams, err := p.addons[0].FetchStreams(raceCtx, mid.ResourceType, mid.StremioID)
			if err != nil {
				p.logger.Debug().
					Str("id", mid.StremioID).
					Str("kind", string(mid.Kind)).
					Err(err).
					Msg("provider: id-race fetch failed")
				return
			}
			if len(streams) == 0 {
				p.logger.Debug().
					Str("id", mid.StremioID).
					Msg("provider: id-race returned no results")
				return
			}
			// Non-blocking send: only the first goroutine to arrive succeeds.
			select {
			case winnerCh <- mid.StremioID:
				// Signal all other ID-race goroutines to stop.
				cancelAll()
			default:
			}
		}(id)
	}

	// Drain all ID-race goroutines before we proceed — zero leak guarantee.
	go func() {
		raceDone.Wait()
		// Ensure the channel is closeable even if no winner was found.
		select {
		case winnerCh <- "":
		default:
		}
	}()

	// Blocks until the first winner or all goroutines drain.
	winningID := <-winnerCh
	if winningID == "" {
		// All ID variants exhausted with no results.
		p.logger.Warn().Msg("provider: all IDs returned empty results")
		return nil, nil
	}

	// Winner's resource type: carry it from the matching MediaID.
	resourceType := "anime"
	for _, id := range ids {
		if id.StremioID == winningID {
			resourceType = id.ResourceType
			break
		}
	}

	p.logger.Info().
		Str("winningID", winningID).
		Str("type", resourceType).
		Msg("provider: ID race resolved")

	// ── Tier 2: Addon Gather for the winning ID ───────────────────────────────
	// Re-create a fresh context from the parent (the raceCtx may be cancelled).
	gatherCtx, cancelGather := context.WithTimeout(ctx, scatterGatherTimeout)
	defer cancelGather()

	return p.addonGather(gatherCtx, resourceType, winningID)
}

// addonGather fans out to all registered addons concurrently for a single ID,
// merges results, deduplicates by InfoHash, and sorts by quality.
// Guarantees zero goroutine leaks via a WaitGroup + close-on-drain pattern.
func (p *Provider) addonGather(ctx context.Context, resourceType, stremioID string) ([]*StreamResult, error) {
	type addonResult struct {
		streams []extension_repo.Stream
	}

	// Buffer = number of addons so senders never block if the gather loop exits early.
	resultsCh := make(chan addonResult, len(p.addons))

	var wg sync.WaitGroup
	for _, addon := range p.addons {
		wg.Add(1)
		go func(a extension_repo.StremioAddon) {
			defer wg.Done()
			streams, err := a.FetchStreams(ctx, resourceType, stremioID)
			if err != nil {
				p.logger.Warn().Str("addon", a.Name()).Err(err).Msg("provider: addon gather failed")
				return
			}
			if len(streams) > 0 {
				resultsCh <- addonResult{streams: streams}
			}
		}(addon)
	}

	// Close the channel once every goroutine finishes — unblocks the range below.
	go func() {
		wg.Wait()
		close(resultsCh)
	}()

	// Merge + dedup by InfoHash.
	seen := make(map[string]struct{}, 64)
	var merged []*StreamResult

	for r := range resultsCh {
		for _, s := range r.streams {
			if s.InfoHash == "" {
				// Direct-play (HTTP/external) streams: no InfoHash, always include.
				merged = append(merged, mapStream(s))
				continue
			}
			if _, dup := seen[s.InfoHash]; dup {
				continue
			}
			seen[s.InfoHash] = struct{}{}
			merged = append(merged, mapStream(s))
		}
	}

	// Sort: best quality first, then lexicographically by release group.
	sort.Slice(merged, func(i, j int) bool {
		qi, qj := qualityPriority(merged[i].Quality), qualityPriority(merged[j].Quality)
		if qi != qj {
			return qi < qj
		}
		return merged[i].ReleaseGroup < merged[j].ReleaseGroup
	})

	p.logger.Info().
		Str("id", stremioID).
		Int("results", len(merged)).
		Int("addons", len(p.addons)).
		Msg("provider: addon gather complete")

	return merged, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// torrentioNativeAddon — bridges the cached Client to the StremioAddon interface
// ─────────────────────────────────────────────────────────────────────────────

type torrentioNativeAddon struct {
	client *Client
}

func (t *torrentioNativeAddon) Name() string { return "torrentio" }

// GetManifest satisfies StremioAddon; the native client uses typed calls.
func (t *torrentioNativeAddon) GetManifest(_ context.Context) (*extension_repo.Manifest, error) {
	return nil, nil
}

func (t *torrentioNativeAddon) FetchStreams(ctx context.Context, resourceType, stremioID string) ([]extension_repo.Stream, error) {
	raw, err := t.client.fetchStreamsForID(ctx, resourceType, stremioID)
	if err != nil {
		return nil, err
	}
	out := make([]extension_repo.Stream, 0, len(raw.Streams))
	for _, s := range raw.Streams {
		out = append(out, extension_repo.Stream{
			Name:     s.Name,
			Title:    s.Title,
			InfoHash: s.InfoHash,
			FileIdx:  s.FileIdx,
			BehaviorHints: &extension_repo.StreamBehaviorHints{
				Filename:   s.BehaviorHints.Filename,
				BingeGroup: s.BehaviorHints.BingeGroup,
			},
		})
	}
	return out, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// Filtering — decoupled from fetching
// ─────────────────────────────────────────────────────────────────────────────

// FilterByQuality returns only results matching the given quality labels.
// Labels are case-insensitive (e.g. "1080p", "4K").
func FilterByQuality(results []*StreamResult, qualities ...string) []*StreamResult {
	set := make(map[string]struct{}, len(qualities))
	for _, q := range qualities {
		set[strings.ToLower(q)] = struct{}{}
	}
	out := results[:0] // re-use backing array
	for _, r := range results {
		if _, ok := set[strings.ToLower(r.Quality)]; ok {
			out = append(out, r)
		}
	}
	return out
}

// FilterByReleaseGroup returns only results whose ReleaseGroup matches one of
// the given names (case-insensitive).
func FilterByReleaseGroup(results []*StreamResult, groups ...string) []*StreamResult {
	set := make(map[string]struct{}, len(groups))
	for _, g := range groups {
		set[strings.ToLower(g)] = struct{}{}
	}
	out := results[:0]
	for _, r := range results {
		if _, ok := set[strings.ToLower(r.ReleaseGroup)]; ok {
			out = append(out, r)
		}
	}
	return out
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapping helpers
// ─────────────────────────────────────────────────────────────────────────────

// mapStream converts a canonical extension_repo.Stream into a StreamResult.
// isDebridStream reports whether a raw Torrentio stream is served via a debrid
// provider by scanning for service-specific badge strings in Name and Title.
//
// Badge reference:
//   - Real-Debrid: "RD+", "[RD]"
//   - AllDebrid:   "AD+", "[AD]"
//   - Premiumize:  "PM+", "[PM]"
//   - Debrid-Link: "DL+", "[DL]"
//   - Generic:     "Debrid", "debrid"
func isDebridStream(name, title string) bool {
	for _, badge := range []string{"RD+", "[RD]", "AD+", "[AD]", "PM+", "[PM]", "DL+", "[DL]", "Debrid", "debrid"} {
		if strings.Contains(name, badge) || strings.Contains(title, badge) {
			return true
		}
	}
	return false
}

func mapStream(s extension_repo.Stream) *StreamResult {
	var filename, bingeGroup string
	if s.BehaviorHints != nil {
		filename = s.BehaviorHints.Filename
		bingeGroup = s.BehaviorHints.BingeGroup
	}
	quality := parseQuality(s.Name)
	releaseGroup := parseReleaseGroup(s.Title)

	return &StreamResult{
		Name:         s.Name,
		Title:        s.Title,
		InfoHash:     s.InfoHash,
		FileIdx:      s.FileIdx,
		Quality:      quality,
		ReleaseGroup: releaseGroup,
		Filename:     filename,
		BingeGroup:   bingeGroup,
		MagnetURI:    buildMagnetURI(s.InfoHash, releaseGroup),
		IsDebrid:     isDebridStream(s.Name, s.Title),
	}
}

// parseQuality extracts the quality label from the Torrentio "name" field.
func parseQuality(name string) string {
	lower := strings.ToLower(name)
	for _, q := range []string{"4k", "2160p", "1080p", "720p", "480p", "360p"} {
		if strings.Contains(lower, q) {
			if q == "4k" {
				return "4K"
			}
			return q
		}
	}
	return "unknown"
}

// parseReleaseGroup extracts the release-group name from the first line of the title.
func parseReleaseGroup(title string) string {
	firstLine := strings.TrimSpace(strings.SplitN(title, "\n", 2)[0])
	firstLine = strings.TrimPrefix(firstLine, "[")
	for _, sep := range []string{"] ", " - ", " | ", "|"} {
		if idx := strings.Index(firstLine, sep); idx > 0 {
			return strings.TrimSpace(firstLine[:idx])
		}
	}
	if parts := strings.Fields(firstLine); len(parts) > 0 {
		return parts[0]
	}
	return "unknown"
}

// buildMagnetURI constructs a magnet URI from an InfoHash with known public trackers.
func buildMagnetURI(infoHash, displayName string) string {
	if infoHash == "" {
		return ""
	}
	var sb strings.Builder
	sb.WriteString("magnet:?xt=urn:btih:")
	sb.WriteString(infoHash)
	if displayName != "" && displayName != "unknown" {
		sb.WriteString("&dn=")
		sb.WriteString(strings.ReplaceAll(displayName, " ", "+"))
	}
	for _, tracker := range defaultTrackers {
		sb.WriteString("&tr=")
		sb.WriteString(tracker)
	}
	return sb.String()
}

// qualityPriority returns the sort order for a quality string (lower = better).
func qualityPriority(q string) int {
	if p, ok := qualityOrder[strings.ToLower(q)]; ok {
		return p
	}
	return qualityOrder["unknown"]
}
