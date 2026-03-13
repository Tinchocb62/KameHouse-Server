// Package scanner – scanner.go
//
// MediaScanner is the production facade that bridges the ScannerAgent pipeline
// with the db.LocalFiles persistence layer.
//
// Two scan modes:
//   - DeepScan  — full recursive walk; re-processes every video file.
//   - FastScan  — delta walk; skips files whose CRC32 header hasn't changed.
//     Ideal for background fsnotify-triggered runs.
//
// Thread-safety: only one scan runs at a time; concurrent calls are dropped.
package scanner

import (
	"context"
	"errors"
	"hash/crc32"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"kamehouse/internal/database/db"
	"kamehouse/internal/database/models/dto"
	"kamehouse/internal/events"
	"kamehouse/internal/library/scanner/video_analyzer"

	"github.com/rs/zerolog"
)

// ─── Types ────────────────────────────────────────────────────────────────────

// ScanMode controls how aggressively the scanner walks the filesystem.
type ScanMode uint8

const (
	DeepScan ScanMode = iota // full walk — re-processes every video file
	FastScan                 // delta walk — skips CRC32-unchanged files
)

var videoExtensions = map[string]struct{}{
	".mkv": {}, ".mp4": {}, ".avi": {}, ".mov": {},
	".webm": {}, ".m4v": {}, ".ts": {},
}

// ScanResult summarises a completed scan.
type ScanResult struct {
	Mode         ScanMode
	Duration     time.Duration
	TotalFound   int
	NewOrChanged int
	Unmatched    int
	Errors       int
}

// EventBroadcaster defines a generic interface for pushing real-time events to clients without coupling to the ws package.
type EventBroadcaster interface {
	Broadcast(eventType string, payload any)
}

// MediaScannerOptions bundles all external dependencies (all optional).
type MediaScannerOptions struct {
	LibraryDirs []string     // root paths to walk
	Database    *db.Database // persistence layer
	Logger      *zerolog.Logger
	Agent       *ScannerAgent // for Bayesian identity resolution
	Workers     int           // CRC32 goroutine pool size (default 4)
	EventHub    EventBroadcaster
	Dispatcher  events.Dispatcher
}

// MediaScanner is named intentionally to avoid collision with the production
// Scanner struct declared in scan_legacy.go.
type MediaScanner struct {
	opts            MediaScannerOptions
	EventDispatcher events.Dispatcher
	fingerprints    sync.Map // path → uint32 CRC32; FastScan delta filter
	running         atomic.Bool
}

// NewMediaScanner constructs a ready-to-use MediaScanner.
func NewMediaScanner(opts MediaScannerOptions) *MediaScanner {
	if opts.Workers <= 0 {
		opts.Workers = 4
	}
	return &MediaScanner{
		opts:            opts,
		EventDispatcher: opts.Dispatcher,
	}
}

// ─── Public API ───────────────────────────────────────────────────────────────

// RunScan orchestrates the 4-stage pipeline: Walk → Parse → Resolve → Persist.
// If a scan is already running the call is a no-op (ScanResult.Duration == 0).
func (s *MediaScanner) RunScan(ctx context.Context, mode ScanMode) (ScanResult, error) {
	if !s.running.CompareAndSwap(false, true) {
		return ScanResult{Mode: mode}, nil
	}
	defer s.running.Store(false)

	start := time.Now()
	result := ScanResult{Mode: mode}
	s.logf(zerolog.InfoLevel, "scanner: Starting %s", modeName(mode))

	if s.EventDispatcher != nil {
		s.EventDispatcher.Publish(events.Event{
			Topic: "library.scan",
			Payload: map[string]any{
				"status":    "START",
				"timestamp": time.Now(),
				"mode":      modeName(mode),
			},
		})
	}

	// Stage 1: Walk
	paths, walkErrs := s.walk(ctx, mode)
	result.TotalFound = len(paths)
	result.NewOrChanged = len(paths)
	result.Errors += walkErrs

	if len(paths) == 0 {
		s.logf(zerolog.InfoLevel, "scanner: No new/changed files found (%s)", modeName(mode))
		result.Duration = time.Since(start)
		return result, nil
	}
	s.logf(zerolog.InfoLevel, "scanner: %d files queued", len(paths))

	// Stage 2: Parallel parse (habari tokeniser + NFO reading)
	// WorkerPool honours opts.Workers (user-configurable); falls back to defaultWorkers().
	dirPaths := s.opts.LibraryDirs

	var mu sync.Mutex
	valid := make([]*dto.LocalFile, 0, len(paths))

	var processed atomic.Int32
	total := int32(len(paths))

	pool := NewWorkerPool(ctx, s.opts.Workers)
	for _, p := range paths {
		p := p // capture
		pool.Submit(func(ctx context.Context) {
			curr := processed.Add(1)
			if s.EventDispatcher != nil {
				s.EventDispatcher.Publish(events.Event{
					Topic: "library.scan",
					Payload: map[string]any{
						"status":  "PROCESSING",
						"current": int(curr),
						"total":   int(total),
						"file":    filepath.Base(p),
					},
				})
			}

			var lf *dto.LocalFile
			for _, d := range dirPaths {
				if strings.HasPrefix(p, d) {
					lf = dto.NewLocalFile(p, d)
					break
				}
			}
			if lf == nil {
				lf = dto.NewLocalFile(p, filepath.Dir(p))
			}

			// NFO Parsing Logic (Jellyfin/Kodi compatible)
			nfoPath := findNfoForFile(p, dirPaths)
			if nfoPath != "" {
				if nfo, err := ParseNfoFile(nfoPath); err == nil && nfo != nil {
					if nfo.ID > 0 {
						lf.MediaId = nfo.ID
					} else if nfo.TmdbId > 0 {
						lf.MediaId = -nfo.TmdbId
					}
					if nfo.Season > 0 || nfo.Episode > 0 {
						if lf.ParsedData == nil {
							lf.ParsedData = &dto.LocalFileParsedData{}
						}
						lf.ParsedData.Season = strconv.Itoa(nfo.Season)
						lf.ParsedData.Episode = strconv.Itoa(nfo.Episode)
					}
				}
			}

			mu.Lock()
			valid = append(valid, lf)
			mu.Unlock()
		})
	}
	pool.Wait()

	// Stage 3: Bayesian identity resolution (optional — requires media catalog)
	if s.opts.Agent != nil && s.opts.Agent.mediaContainer != nil {
		result.Unmatched = s.resolveIdentities(valid)
	}

	// Stage 4: Technical Probing (FFprobe Parallel Workers)
	s.logf(zerolog.InfoLevel, "scanner: running technical probe (ffprobe)")
	analyzer := video_analyzer.New(s.opts.Logger)

	validPaths := make([]string, 0, len(valid))
	for _, lf := range valid {
		validPaths = append(validPaths, lf.Path)
	}

	analysisResults := analyzer.AnalyzeParallel(ctx, validPaths)
	analysisMap := make(map[string]*video_analyzer.VideoInfo, len(analysisResults))
	for _, res := range analysisResults {
		if res.Error == nil && res.Info != nil {
			analysisMap[res.Filepath] = res.Info
		} else {
			s.logf(zerolog.WarnLevel, "scanner: ffprobe failed for %s: %v", res.Filepath, res.Error)
		}
	}

	for _, lf := range valid {
		if info, ok := analysisMap[lf.Path]; ok {
			lf.TechnicalInfo = mapVideoInfoToDto(info)
		}
	}

	// Stage 4: Persist merged snapshot
	if s.opts.Database != nil {
		if err := s.persist(valid); err != nil {
			s.logf(zerolog.ErrorLevel, "scanner: persistence failed: %v", err)
			result.Errors++
		}
	}

	result.Duration = time.Since(start)
	s.logf(zerolog.InfoLevel,
		"scanner: %s done — %d files, %d unmatched, %d errors in %v",
		modeName(mode), len(valid), result.Unmatched, result.Errors, result.Duration,
	)

	if s.EventDispatcher != nil {
		s.EventDispatcher.Publish(events.Event{
			Topic: "library.scan",
			Payload: map[string]any{
				"status":           "FINISH",
				"total_processed":  len(valid),
				"duration_seconds": result.Duration.Seconds(),
			},
		})
	}

	return result, nil
}

// ─── Walk ─────────────────────────────────────────────────────────────────────

// walk collects scannable video paths under all LibraryDirs.
// Permission-denied errors are swallowed so a single locked directory never
// aborts the entire scan; they are counted in errCount for the ScanResult.
func (s *MediaScanner) walk(ctx context.Context, mode ScanMode) (paths []string, errCount int) {
	var mu sync.Mutex

	for _, root := range s.opts.LibraryDirs {
		walkErr := filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
			if ctx.Err() != nil {
				return ctx.Err()
			}

			if err != nil {
				mu.Lock()
				errCount++
				mu.Unlock()

				if errors.Is(err, fs.ErrPermission) || errors.Is(err, os.ErrPermission) {
					s.logf(zerolog.WarnLevel, "scanner: permission denied: %s", path)
					if d != nil && d.IsDir() {
						return fs.SkipDir
					}
				} else {
					s.logf(zerolog.WarnLevel, "scanner: walk error at %s: %v", path, err)
				}
				return nil // always continue
			}

			if d.IsDir() {
				return nil
			}
			if _, ok := videoExtensions[strings.ToLower(filepath.Ext(path))]; !ok {
				return nil
			}

			// FastScan: compare CRC32 of first 256 KiB header with cached value.
			if mode == FastScan {
				if crc, crcErr := crc32File(path); crcErr == nil {
					if prev, loaded := s.fingerprints.Load(path); loaded && prev.(uint32) == crc {
						return nil // unchanged — skip
					}
					s.fingerprints.Store(path, crc)
				}
			}

			mu.Lock()
			paths = append(paths, path)
			mu.Unlock()
			return nil
		})

		if walkErr != nil && walkErr != context.Canceled {
			s.logf(zerolog.ErrorLevel, "scanner: walk failed for %s: %v", root, walkErr)
			errCount++
		}
	}
	return
}

// ─── Identity Resolution ──────────────────────────────────────────────────────

// resolveIdentities runs BayesianResolve on all files. MediaId == 0 means
// the confidence threshold (0.80) was not met; those files are "Unrecognized".
func (s *MediaScanner) resolveIdentities(files []*dto.LocalFile) (unmatched int) {
	if len(files) == 0 {
		return
	}
	m := NewMatcher(files, s.opts.Agent.mediaContainer, s.opts.Logger, s.opts.Database)
	if err := m.MatchLocalFilesWithMedia(); err != nil {
		s.logf(zerolog.ErrorLevel, "scanner: resolution error: %v", err)
	}
	for _, lf := range files {
		if lf.MediaId == 0 {
			unmatched++
		}
	}
	return
}

// ─── Persistence ─────────────────────────────────────────────────────────────

// persist merges newly discovered files into the existing JSON-blob snapshot
// and writes the result via the production db.SaveLocalFiles path.
func (s *MediaScanner) persist(newFiles []*dto.LocalFile) error {
	existing, lfsID, err := db.GetLocalFiles(s.opts.Database)
	if err != nil {
		// First run — no existing snapshot.
		_, insertErr := db.InsertLocalFiles(s.opts.Database, newFiles)
		return insertErr
	}

	byPath := make(map[string]*dto.LocalFile, len(existing)+len(newFiles))
	for _, lf := range existing {
		byPath[lf.Path] = lf
	}
	for _, lf := range newFiles { // overwrite with fresh data
		byPath[lf.Path] = lf
	}

	merged := make([]*dto.LocalFile, 0, len(byPath))
	for _, lf := range byPath {
		merged = append(merged, lf)
	}

	_, err = db.SaveLocalFiles(s.opts.Database, lfsID, merged)
	if err == nil && s.opts.EventHub != nil {
		go s.opts.EventHub.Broadcast("library_updated", map[string]string{
			"status":  "success",
			"message": "Library metadata has been refreshed",
		})
	}
	return err
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// crc32File reads the first 256 KiB of a file and returns its CRC32.
// Streaming only; no seek required. io.EOF after a short read is normal.
func crc32File(path string) (uint32, error) {
	f, err := os.Open(path)
	if err != nil {
		return 0, err
	}
	defer f.Close()

	h := crc32.New(crc32.IEEETable)
	_, err = io.CopyN(h, f, 256*1024)
	if err != nil && err != io.EOF {
		return 0, err
	}
	return h.Sum32(), nil
}

func modeName(m ScanMode) string {
	if m == FastScan {
		return "FastScan"
	}
	return "DeepScan"
}

func (s *MediaScanner) logf(level zerolog.Level, format string, args ...any) {
	if s.opts.Logger == nil {
		return
	}
	s.opts.Logger.WithLevel(level).Msgf(format, args...)
}

// findNfoForFile traverses upwards to find a Jellyfin/Kodi compatible NFO file.
func findNfoForFile(videoPath string, libraryDirs []string) string {
	dir := filepath.Dir(videoPath)

	// 1. Episode/Movie specific NFO (same name)
	specificNfo := strings.TrimSuffix(videoPath, filepath.Ext(videoPath)) + ".nfo"
	if _, err := os.Stat(specificNfo); err == nil {
		return specificNfo
	}

	// 2. Folder-level TV show NFO
	for {
		tvshowNfo := filepath.Join(dir, "tvshow.nfo")
		if _, err := os.Stat(tvshowNfo); err == nil {
			return tvshowNfo
		}

		movieNfo := filepath.Join(dir, "movie.nfo")
		if _, err := os.Stat(movieNfo); err == nil {
			return movieNfo
		}

		// Stop ascending if we hit a library root
		isRoot := false
		for _, lib := range libraryDirs {
			if filepath.Clean(dir) == filepath.Clean(lib) {
				isRoot = true
				break
			}
		}
		if isRoot {
			break
		}

		parent := filepath.Dir(dir)
		if parent == dir || parent == "." || parent == "/" {
			break
		}
		dir = parent
	}

	return ""
}

// mapVideoInfoToDto converts the raw FFprobe analyzer result into our JSON-serializable DTO.
func mapVideoInfoToDto(info *video_analyzer.VideoInfo) *dto.FileTechnicalInfo {
	if info == nil {
		return nil
	}

	tech := &dto.FileTechnicalInfo{
		Duration: info.Duration,
		Size:     info.Size,
		Bitrate:  info.Bitrate,
		Format:   info.Format,
	}

	if info.VideoStream != nil {
		tech.VideoStream = &dto.VideoStreamInfo{
			Codec:          info.VideoStream.Codec,
			Profile:        info.VideoStream.Profile,
			Width:          info.VideoStream.Width,
			Height:         info.VideoStream.Height,
			FrameRate:      info.VideoStream.FrameRate,
			ColorSpace:     info.VideoStream.ColorSpace,
			ColorTransfer:  info.VideoStream.ColorTransfer,
			ColorPrimaries: info.VideoStream.ColorPrimaries,
		}
	}

	for _, audio := range info.AudioStreams {
		tech.AudioStreams = append(tech.AudioStreams, &dto.AudioStreamInfo{
			Codec:    audio.Codec,
			Language: audio.Language,
			Title:    audio.Title,
		})
	}

	for _, sub := range info.SubtitleStreams {
		tech.SubtitleStreams = append(tech.SubtitleStreams, &dto.AudioStreamInfo{
			Codec:    sub.Codec,
			Language: sub.Language,
			Title:    sub.Title,
		})
	}

	return tech
}
