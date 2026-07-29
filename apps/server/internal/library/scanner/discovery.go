package scanner

import (
	"context"
	"errors"
	"io/fs"
	"kamehouse/internal/database/models/dto"
	"kamehouse/internal/events"
	"kamehouse/internal/util"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

func (scn *Scanner) discoverFilePaths(ctx context.Context, _ time.Time) ([]string, []string, []string) {
	var libraryPaths []string
	isPartial := len(scn.TargetPaths) > 0

	if isPartial {
		libraryPaths = scn.TargetPaths
	} else {
		libraryPaths = append([]string{scn.DirPath}, scn.OtherDirPaths...)
	}

	sortedLibraryPaths := make([]string, len(libraryPaths))
	copy(sortedLibraryPaths, libraryPaths)
	sort.Slice(sortedLibraryPaths, func(i, j int) bool {
		return len(sortedLibraryPaths[i]) > len(sortedLibraryPaths[j])
	})

	existingFolders := make(map[string]struct{})
	for _, lf := range scn.ExistingLocalFiles {
		if lf == nil {
			continue
		}
		existingFolders[util.NormalizePath(filepath.Dir(lf.Path))] = struct{}{}
	}

	retrievedPathMap := make(map[string]struct{})
	paths := make([]string, 0, len(scn.ExistingLocalFiles))
	var mu sync.Mutex
	var logMu sync.Mutex

	dirPool := NewWorkerPool(ctx, len(libraryPaths))
	for _, dirPath := range libraryPaths {
		dirPath := dirPath
		dirPool.Submit(func(_ context.Context) {
			var retrievedPaths []string

			err := filepath.WalkDir(dirPath, func(path string, d fs.DirEntry, err error) error {
				if err != nil {
					// Intercept and skip directory or file on permission error
					if os.IsPermission(err) || errors.Is(err, fs.ErrPermission) {
						scn.Logger.Warn().Str("path", path).Err(err).Msg("scanner: Permission denied, skipping")
						if d != nil && d.IsDir() {
							return filepath.SkipDir
						}
						return nil
					}
					return nil
				}
				if d.IsDir() {
					return nil
				}
				ext := strings.ToLower(filepath.Ext(path))
				if util.IsValidMediaFile(path) && util.IsValidVideoExtension(ext) {
					retrievedPaths = append(retrievedPaths, path)
				}
				return nil
			})

			if err != nil {
				scn.Logger.Error().Err(err).Str("dir", dirPath).Msg("scanner: error retrieving local files")
				return
			}

			if scn.ScanLogger != nil {
				logMu.Lock()
				scn.ScanLogger.logger.Info().Int("count", len(retrievedPaths)).Str("dir", dirPath).Msg("Retrieved file paths")
				logMu.Unlock()
			}

			for _, path := range retrievedPaths {
				normPath := util.NormalizePath(path)
				mu.Lock()
				if _, ok := retrievedPathMap[normPath]; !ok {
					retrievedPathMap[normPath] = struct{}{}
					paths = append(paths, path)
				}
				mu.Unlock()
			}
		})
	}
	dirPool.Wait()

	return paths, libraryPaths, sortedLibraryPaths
}

func (scn *Scanner) createLocalFiles(ctx context.Context, paths []string, libraryPaths []string, skippedLfs map[string]*dto.LocalFile) []*dto.LocalFile {
	maxWorkers := runtime.NumCPU() * 2
	if maxWorkers < 4 {
		maxWorkers = 4
	}

	jobs := make(chan string, len(paths))
	results := make(chan *dto.LocalFile, len(paths))
	var skipped atomic.Int64

	// Pre-map existing files by path for O(1) lookup in workers
	existingMap := make(map[string]*dto.LocalFile)
	for _, f := range scn.ExistingLocalFiles {
		if f != nil {
			existingMap[util.NormalizePath(f.Path)] = f
		}
	}

	var workerWg sync.WaitGroup
	for i := 0; i < maxWorkers; i++ {
		workerWg.Add(1)
		go func() {
			defer workerWg.Done()
			for path := range jobs {
				select {
				case <-ctx.Done():
					results <- nil
					continue
				default:
				}
				normPath := util.NormalizePath(path)
				if _, ok := skippedLfs[normPath]; ok {
					skipped.Add(1)
					results <- nil
					continue
				}
				lf := dto.NewLocalFileS(path, libraryPaths)

				if stat, err := os.Stat(path); err == nil {
					lf.FileSize = stat.Size()
					lf.FileModTime = stat.ModTime().Unix()
				}

				// Preservation logic: If we already know this file, keep its associations
				// unless the scanner explicitly changes them later.
				if existing, ok := existingMap[normPath]; ok {
					lf.MediaID = existing.MediaID
					lf.LibraryMediaId = existing.LibraryMediaId
					lf.Locked = existing.Locked
					lf.Ignored = existing.Ignored
					if lf.FileSize == existing.FileSize && lf.FileModTime == existing.FileModTime {
						lf.FileHash = existing.FileHash
					}
					// Copy metadata if it was already matched
					if lf.MediaID != 0 {
						lf.Metadata = existing.Metadata
					}
				}

				results <- lf
			}
		}()
	}

	for _, p := range paths {
		jobs <- p
	}
	close(jobs)

	go func() {
		workerWg.Wait()
		close(results)
	}()

	localFiles := make([]*dto.LocalFile, 0, len(paths))
	for lf := range results {
		if lf != nil {
			localFiles = append(localFiles, lf)

			if scn.EventDispatcher != nil {
				scn.EventDispatcher.Publish(events.Event{
					Topic: "library.scan",
					Payload: map[string]any{
						"status":  "PROCESSING",
						"current": len(localFiles),
						"total":   len(paths),
						"file":    lf.Name,
					},
				})
			}
		}
	}
	return localFiles
}
