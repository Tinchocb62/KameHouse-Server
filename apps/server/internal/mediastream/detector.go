package mediastream

import (
	"archive/tar"
	"archive/zip"
	"bytes"
	"compress/gzip"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/bits"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sort"
	"strconv"
	"sync"
	"time"

	"github.com/rs/zerolog"
	"gopkg.in/vansante/go-ffprobe.v2"
	"gorm.io/gorm/clause"

	"kamehouse/internal/database/db"
	"kamehouse/internal/database/models"
	"kamehouse/internal/events"
)

type SkipDetector struct {
	db             *db.Database
	logger         *zerolog.Logger
	wsEventManager events.WSEventManagerInterface
	cacheDir       string
	ffmpegPath     string
	ffprobePath    string
	scanMu         sync.Mutex
	isScanning     map[int]bool
}

type FingerprintResult struct {
	Duration    float64 `json:"duration"`
	Fingerprint []int   `json:"fingerprint"`
}

func NewSkipDetector(
	database *db.Database,
	logger *zerolog.Logger,
	ws events.WSEventManagerInterface,
	cacheDir string,
	ffmpegPath string,
	ffprobePath string,
) *SkipDetector {
	if ffmpegPath == "" {
		ffmpegPath = "ffmpeg"
	}
	if ffprobePath == "" {
		ffprobePath = "ffprobe"
	}
	return &SkipDetector{
		db:             database,
		logger:         logger,
		wsEventManager: ws,
		cacheDir:       cacheDir,
		ffmpegPath:     ffmpegPath,
		ffprobePath:    ffprobePath,
		isScanning:     make(map[int]bool),
	}
}

// EnsureFpcalcBinary checks if fpcalc is available in PATH or downloads it to cacheDir/bin.
func (d *SkipDetector) EnsureFpcalcBinary() (string, error) {
	// 1. Try system PATH
	if path, err := exec.LookPath("fpcalc"); err == nil {
		return path, nil
	}

	ext := ""
	if runtime.GOOS == "windows" {
		ext = ".exe"
	}

	binDir := filepath.Join(d.cacheDir, "bin")
	localPath := filepath.Join(binDir, "fpcalc"+ext)

	// 2. Check local cache
	if _, err := os.Stat(localPath); err == nil {
		return localPath, nil
	}

	// 3. Download and extract
	d.logger.Info().Msg("mediastream: fpcalc binary not found, downloading standard release...")

	if err := os.MkdirAll(binDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create bin dir: %w", err)
	}

	downloadURL, isZip, err := getFpcalcDownloadURL()
	if err != nil {
		return "", err
	}

	d.logger.Info().Str("url", downloadURL).Msg("mediastream: Downloading fpcalc archive")

	resp, err := http.Get(downloadURL)
	if err != nil {
		return "", fmt.Errorf("failed to download fpcalc: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("failed to download fpcalc: HTTP %d", resp.StatusCode)
	}

	// Store archive to temporary file
	tmpFile, err := os.CreateTemp("", "fpcalc-archive-*")
	if err != nil {
		return "", err
	}
	defer os.Remove(tmpFile.Name())
	defer tmpFile.Close()

	if _, err := io.Copy(tmpFile, resp.Body); err != nil {
		return "", fmt.Errorf("failed to write archive: %w", err)
	}

	_, _ = tmpFile.Seek(0, 0)

	if isZip {
		// Extract zip
		archiveSize, err := tmpFile.Seek(0, io.SeekEnd)
		if err != nil {
			return "", err
		}
		_, _ = tmpFile.Seek(0, 0)

		zr, err := zip.NewReader(tmpFile, archiveSize)
		if err != nil {
			return "", fmt.Errorf("failed to read zip archive: %w", err)
		}

		found := false
		for _, f := range zr.File {
			baseName := filepath.Base(f.Name)
			if baseName == "fpcalc.exe" || baseName == "fpcalc" {
				rc, err := f.Open()
				if err != nil {
					return "", err
				}
				defer rc.Close()

				out, err := os.OpenFile(localPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0755)
				if err != nil {
					return "", err
				}
				defer out.Close()

				if _, err := io.Copy(out, rc); err != nil {
					return "", err
				}
				found = true
				break
			}
		}

		if !found {
			return "", errors.New("fpcalc binary not found inside downloaded zip archive")
		}
	} else {
		// Extract tar.gz
		gr, err := gzip.NewReader(tmpFile)
		if err != nil {
			return "", fmt.Errorf("failed to initialize gzip reader: %w", err)
		}
		defer gr.Close()

		tr := tar.NewReader(gr)
		found := false
		for {
			header, err := tr.Next()
			if errors.Is(err, io.EOF) {
				break
			}
			if err != nil {
				return "", err
			}

			baseName := filepath.Base(header.Name)
			if baseName == "fpcalc" {
				out, err := os.OpenFile(localPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0755)
				if err != nil {
					return "", err
				}
				defer out.Close()

				if _, err := io.Copy(out, tr); err != nil {
					return "", err
				}
				found = true
				break
			}
		}

		if !found {
			return "", errors.New("fpcalc binary not found inside downloaded tar.gz archive")
		}
	}

	d.logger.Info().Str("path", localPath).Msg("mediastream: fpcalc binary successfully installed")
	return localPath, nil
}

func getFpcalcDownloadURL() (string, bool, error) {
	baseURL := "https://github.com/acoustid/chromaprint/releases/download/v1.6.0"
	switch runtime.GOOS {
	case "windows":
		return baseURL + "/chromaprint-fpcalc-1.6.0-windows-x86_64.zip", true, nil
	case "darwin":
		return baseURL + "/chromaprint-fpcalc-1.6.0-macos-universal.tar.gz", false, nil
	case "linux":
		if runtime.GOARCH == "arm64" {
			return baseURL + "/chromaprint-fpcalc-1.6.0-linux-arm64.tar.gz", false, nil
		}
		return baseURL + "/chromaprint-fpcalc-1.6.0-linux-x86_64.tar.gz", false, nil
	default:
		return "", false, fmt.Errorf("unsupported OS: %s", runtime.GOOS)
	}
}

// GetFingerprint extracts the fingerprint of a video chunk.
// If isIntro is true, extracts the first 5 minutes. If false, extracts the last 5 minutes.
func (d *SkipDetector) GetFingerprint(ctx context.Context, fpcalcBin, videoPath string, isIntro bool, fileDuration float64) ([]int, error) {
	chunkLen := 300.0
	if fileDuration < 600.0 {
		chunkLen = fileDuration / 2.0
	}

	var cmd *exec.Cmd

	if isIntro {
		// Intro can be run directly on the file without transcoding seek since it starts at 0!
		// But just to be robust and support potential container issues, we can run:
		// fpcalc -length 300 -raw -json filepath
		cmd = exec.CommandContext(ctx, fpcalcBin, "-length", strconv.Itoa(int(chunkLen)), "-raw", "-json", videoPath)
	} else {
		// Outro: seek using ffmpeg to duration - chunkLen, pipe raw s16le audio to fpcalc
		startTime := fileDuration - chunkLen
		if startTime < 0 {
			startTime = 0
		}

		ffmpegCmd := exec.CommandContext(ctx, d.ffmpegPath, "-ss", fmt.Sprintf("%f", startTime), "-i", videoPath, "-ac", "1", "-ar", "11025", "-f", "s16le", "-")
		fpcalcCmd := exec.CommandContext(ctx, fpcalcBin, "-rate", "11025", "-channels", "1", "-format", "s16le", "-raw", "-json", "-")

		// Pipe ffmpeg output to fpcalc
		pr, pw := io.Pipe()
		ffmpegCmd.Stdout = pw
		fpcalcCmd.Stdin = pr

		var fpcalcOut bytes.Buffer
		fpcalcCmd.Stdout = &fpcalcOut

		if err := ffmpegCmd.Start(); err != nil {
			pr.Close()
			pw.Close()
			return nil, fmt.Errorf("failed to start ffmpeg: %w", err)
		}

		if err := fpcalcCmd.Start(); err != nil {
			pr.Close()
			pw.Close()
			_ = ffmpegCmd.Process.Kill()
			return nil, fmt.Errorf("failed to start fpcalc: %w", err)
		}

		// Wait in background for ffmpeg to finish or error out.
		// errCh lets us synchronise before returning so the goroutine
		// is never leaked (it always exits before this function returns).
		errCh := make(chan struct{}, 1)
		go func() {
			defer close(errCh)
			_ = ffmpegCmd.Wait()
			pw.Close()
		}()

		if err := fpcalcCmd.Wait(); err != nil {
			// Signal the pipe so the goroutine's pw.Close() unblocks immediately.
			pr.CloseWithError(err)
			<-errCh // wait for goroutine to finish before returning
			return nil, fmt.Errorf("fpcalc execution failed: %w", err)
		}
		pr.Close()
		<-errCh // wait for goroutine to finish

		var res FingerprintResult
		if err := json.Unmarshal(fpcalcOut.Bytes(), &res); err != nil {
			return nil, fmt.Errorf("failed to parse fpcalc JSON output: %w", err)
		}

		return res.Fingerprint, nil
	}

	var out bytes.Buffer
	cmd.Stdout = &out
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("failed to run fpcalc: %w", err)
	}

	var res FingerprintResult
	if err := json.Unmarshal(out.Bytes(), &res); err != nil {
		return nil, fmt.Errorf("failed to parse fpcalc JSON: %w", err)
	}

	return res.Fingerprint, nil
}

// CompareFingerprints aligns two fingerprints and returns the matching start/end offsets in seconds.
// Returns (startOffset1, endOffset1, startOffset2, endOffset2, matchedSeconds, ok)
func (d *SkipDetector) CompareFingerprints(f1, f2 []int) (float64, float64, float64, float64, float64, bool) {
	if len(f1) == 0 || len(f2) == 0 {
		return 0, 0, 0, 0, 0, false
	}

	// Chromaprint produces ~8.33 sub-fingerprints per second.
	// Frame size is 0.371s, but stride is ~0.12s (11025 Hz / 1323 samples or similar).
	const secondsPerFrame = 0.12

	// Calculate Hamming distance threshold: 5 bits out of 32
	const maxHammingDistance = 5

	n := len(f1)
	m := len(f2)

	// Step 1: Populate histogram of relative offsets (i - j)
	matchesForOffset := make(map[int]int)
	for i := 0; i < n; i++ {
		for j := 0; j < m; j++ {
			dist := bits.OnesCount32(uint32(f1[i] ^ f2[j]))
			if dist <= maxHammingDistance {
				matchesForOffset[i-j]++
			}
		}
	}

	if len(matchesForOffset) == 0 {
		return 0, 0, 0, 0, 0, false
	}

	// Step 2: Find offset peak
	bestOffset := 0
	maxMatches := 0
	for offset, count := range matchesForOffset {
		if count > maxMatches {
			maxMatches = count
			bestOffset = offset
		}
	}

	// If the peak is too weak, no match
	// Minimum of 80 frames (approx 10 seconds of matching audio)
	if maxMatches < 80 {
		return 0, 0, 0, 0, 0, false
	}

	// Step 3: Find contiguous matching segment at the bestOffset
	// Slide a window of size 40 (~5 seconds) and verify density
	windowSize := 40
	minDensity := 0.70 // at least 70% matching frames

	firstMatchIdx := -1
	lastMatchIdx := -1

	// Mark all frame matches at the bestOffset
	isMatching := make([]bool, n)
	for i := 0; i < n; i++ {
		j := i - bestOffset
		if j >= 0 && j < m {
			dist := bits.OnesCount32(uint32(f1[i] ^ f2[j]))
			if dist <= maxHammingDistance {
				isMatching[i] = true
			}
		}
	}

	// Detect density boundaries
	for i := 0; i <= n-windowSize; i++ {
		matchCount := 0
		for w := 0; w < windowSize; w++ {
			if isMatching[i+w] {
				matchCount++
			}
		}

		density := float64(matchCount) / float64(windowSize)
		if density >= minDensity {
			if firstMatchIdx == -1 {
				firstMatchIdx = i
			}
			lastMatchIdx = i + windowSize
		}
	}

	if firstMatchIdx == -1 || lastMatchIdx == -1 {
		return 0, 0, 0, 0, 0, false
	}

	// Calculate matched duration
	matchedFrames := lastMatchIdx - firstMatchIdx
	durationSec := float64(matchedFrames) * secondsPerFrame

	// Minimum intro/outro length check (usually 25 seconds minimum)
	if durationSec < 20.0 {
		return 0, 0, 0, 0, 0, false
	}

	// Resolve the absolute start and end times for file 1 and file 2
	start1 := float64(firstMatchIdx) * secondsPerFrame
	end1 := float64(lastMatchIdx) * secondsPerFrame

	start2 := float64(firstMatchIdx-bestOffset) * secondsPerFrame
	end2 := float64(lastMatchIdx-bestOffset) * secondsPerFrame

	if start1 < 0 {
		start1 = 0
	}
	if start2 < 0 {
		start2 = 0
	}

	return start1, end1, start2, end2, durationSec, true
}

func (d *SkipDetector) SetIsScanning(mediaID int, scanning bool) {
	d.scanMu.Lock()
	defer d.scanMu.Unlock()
	d.isScanning[mediaID] = scanning
}

func (d *SkipDetector) IsScanning(mediaID int) bool {
	d.scanMu.Lock()
	defer d.scanMu.Unlock()
	return d.isScanning[mediaID]
}

// ScanSeries auto-detects skip times for all local files linked to the mediaID.
func (d *SkipDetector) ScanSeries(ctx context.Context, mediaID int) error {
	if d.IsScanning(mediaID) {
		return errors.New("a skip scan is already in progress for this series")
	}

	d.SetIsScanning(mediaID, true)
	defer d.SetIsScanning(mediaID, false)

	d.wsEventManager.SendEvent("SKIP_SCAN_STATUS", map[string]any{
		"mediaId": mediaID,
		"status":  "initializing",
		"message": "Iniciando escaneo de marcas de skip...",
	})

	fpcalcBin, err := d.EnsureFpcalcBinary()
	if err != nil {
		d.logger.Error().Err(err).Msg("mediastream: failed to ensure fpcalc binary")
		d.wsEventManager.SendEvent("SKIP_SCAN_STATUS", map[string]any{
			"mediaId": mediaID,
			"status":  "error",
			"message": "Error al descargar fpcalc: " + err.Error(),
		})
		return err
	}

	// 1. Fetch all local episodes for this series
	localFiles, err := db.GetLocalFilesByMediaID(d.db, mediaID)
	if err != nil {
		return err
	}

	// Build episodes to match mediaID
	type lfItem struct {
		ID            uint   `json:"id"`
		Path          string `json:"path"`
		MediaID       int    `json:"mediaId"`
		EpisodeNumber int    `json:"episodeNumber"`
		Duration      float64 `json:"duration"` // in seconds
	}

	var episodes []lfItem
	for _, lf := range localFiles {
		epNum := lf.GetEpisodeNumber()
		if epNum > 0 {
			var duration float64
			if lf.TechnicalInfo != nil {
				duration = lf.TechnicalInfo.Duration.Seconds()
			}
			episodes = append(episodes, lfItem{
				ID:            lf.LibraryMediaId,
				Path:          lf.Path,
				MediaID:       lf.MediaID,
				EpisodeNumber: epNum,
				Duration:      duration,
			})
		}
	}

	// Sort episodes by EpisodeNumber
	sort.Slice(episodes, func(i, j int) bool {
		return episodes[i].EpisodeNumber < episodes[j].EpisodeNumber
	})

	if len(episodes) < 2 {
		d.wsEventManager.SendEvent("SKIP_SCAN_STATUS", map[string]any{
			"mediaId": mediaID,
			"status":  "done",
			"message": "No hay suficientes episodios en la biblioteca para realizar la comparación automática.",
		})
		return nil
	}

	d.logger.Info().Int("count", len(episodes)).Int("mediaId", mediaID).Msg("mediastream: Starting skip times scanner for series")

	// Store fingerprints in memory
	type EpFingerprints struct {
		EpisodeNumber int
		IntroFP       []int
		OutroFP       []int
		Duration      float64
	}

	fps := make(map[int]*EpFingerprints)

	// Keep track of probed durations using ffprobe
	ffprobe.SetFFProbeBinPath(d.ffprobePath)

	for idx, ep := range episodes {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		d.wsEventManager.SendEvent("SKIP_SCAN_STATUS", map[string]any{
			"mediaId": mediaID,
			"status":  "fingerprinting",
			"percent": int(float64(idx) / float64(len(episodes)) * 100),
			"message": fmt.Sprintf("Generando huella de audio: Episodio %d...", ep.EpisodeNumber),
		})

		// Use ffprobe to get precise duration if available
		duration := ep.Duration
		if duration == 0 {
			ffprobeCtx, cancel := context.WithTimeout(ctx, 15*time.Second)
			if data, err := ffprobe.ProbeURL(ffprobeCtx, ep.Path); err == nil {
				duration = data.Format.DurationSeconds
			}
			cancel()
		}

		if duration == 0 {
			duration = 1440.0 // Default to 24 minutes if probe fails
		}

		introFP, err := d.GetFingerprint(ctx, fpcalcBin, ep.Path, true, duration)
		if err != nil {
			d.logger.Warn().Err(err).Str("path", ep.Path).Msg("mediastream: failed to fingerprint intro")
			continue
		}

		outroFP, err := d.GetFingerprint(ctx, fpcalcBin, ep.Path, false, duration)
		if err != nil {
			d.logger.Warn().Err(err).Str("path", ep.Path).Msg("mediastream: failed to fingerprint outro")
			continue
		}

		fps[ep.EpisodeNumber] = &EpFingerprints{
			EpisodeNumber: ep.EpisodeNumber,
			IntroFP:       introFP,
			OutroFP:       outroFP,
			Duration:      duration,
		}
	}

	// 2. Perform Pairwise Matching
	// We match each episode to the ones around it to find common intervals
	d.wsEventManager.SendEvent("SKIP_SCAN_STATUS", map[string]any{
		"mediaId": mediaID,
		"status":  "matching",
		"message": "Comparando episodios para detectar canciones de inicio y fin...",
	})

	var dbSkipTimes []models.EpisodeSkipTime

	for _, ep := range episodes {
		currentFP, ok := fps[ep.EpisodeNumber]
		if !ok {
			continue
		}

		var introStarts []float64
		var introEnds []float64
		var outroOffsets []float64 // outro distance from end of file

		// Compare current episode against up to 3 neighbors
		neighbors := []int{ep.EpisodeNumber - 1, ep.EpisodeNumber + 1, ep.EpisodeNumber + 2}
		for _, nEpNum := range neighbors {
			neighborFP, found := fps[nEpNum]
			if !found {
				continue
			}

			// Intro check
			if s1, e1, _, _, _, ok := d.CompareFingerprints(currentFP.IntroFP, neighborFP.IntroFP); ok {
				introStarts = append(introStarts, s1)
				introEnds = append(introEnds, e1)
			}

			// Outro check
			if s1, _, _, _, _, ok := d.CompareFingerprints(currentFP.OutroFP, neighborFP.OutroFP); ok {
				// Translate local outro fingerprint offset to absolute time in the file
				chunkLen := 300.0
				if currentFP.Duration < 600.0 {
					chunkLen = currentFP.Duration / 2.0
				}
				absStart := (currentFP.Duration - chunkLen) + s1

				// EdOffset in KameHouse model represents the duration from the start of the ending song to the end of file.
				// Wait! Let's check models.go / SkipTimesSettings to see what EdOffset represents.
				// Let's verify: EdOffset is usually the time in seconds where the outro starts!
				// Wait, let's look at the database models or check SkipTimesSettings.tsx to see what is stored in EdOffset.
				// Is it the start time of the ending? Yes, in `SkipTimesSettings.tsx` it says:
				// `edOffset: duration - edOffset` or `edOffset` represents the actual start time of the ending.
				// Let's check the schema or routes handler code we viewed:
				// `OpStart: b.OpStart, OpEnd: b.OpEnd, EdOffset: b.EdOffset`
				// Wait! Let's check how `edOffset` is handled in web player/SkipTimesSettings.
				// Usually, `edOffset` is the timestamp where the Ending begins.
				// Let's record both start and end, but for the DB:
				// EdOffset: absStart
				outroOffsets = append(outroOffsets, absStart)
			}
		}

		// Calculate averages for robust estimates
		skipTime := models.EpisodeSkipTime{
			MediaID:       mediaID,
			EpisodeNumber: ep.EpisodeNumber,
		}

		if len(introStarts) > 0 {
			sort.Float64s(introStarts)
			sort.Float64s(introEnds)
			// Use median to avoid outliers
			skipTime.OpStart = introStarts[len(introStarts)/2]
			skipTime.OpEnd = introEnds[len(introEnds)/2]
		}

		if len(outroOffsets) > 0 {
			sort.Float64s(outroOffsets)
			skipTime.EdOffset = outroOffsets[len(outroOffsets)/2]
		}

		// Only persist if we detected an intro or an outro
		if skipTime.OpEnd > 0 || skipTime.EdOffset > 0 {
			dbSkipTimes = append(dbSkipTimes, skipTime)
		}
	}

	// 3. Save to database
	if len(dbSkipTimes) > 0 {
		err := d.db.Gorm().Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "media_id"}, {Name: "episode_number"}},
			DoUpdates: clause.AssignmentColumns([]string{"op_start", "op_end", "ed_offset"}),
		}).Create(&dbSkipTimes).Error

		if err != nil {
			d.logger.Error().Err(err).Msg("mediastream: failed to save automatically scanned skip times")
			d.wsEventManager.SendEvent("SKIP_SCAN_STATUS", map[string]any{
				"mediaId": mediaID,
				"status":  "error",
				"message": "Error al guardar los resultados en la base de datos.",
			})
			return err
		}
	}

	d.wsEventManager.SendEvent("SKIP_SCAN_STATUS", map[string]any{
		"mediaId": mediaID,
		"status":  "done",
		"message": fmt.Sprintf("Escaneo completado. Se detectaron marcas de skip para %d episodios.", len(dbSkipTimes)),
	})

	return nil
}
