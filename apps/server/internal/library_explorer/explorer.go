package library_explorer

import (
	"fmt"
	"kamehouse/internal/database/db"
	"kamehouse/internal/database/models/dto"
	"kamehouse/internal/platforms/platform"
	"kamehouse/internal/util"
	"sync"
	"github.com/rs/zerolog"
)

type LibraryExplorer struct {
	mu              sync.RWMutex
	animeCollection *platform.UnifiedCollection
	platformRef     *util.Ref[platform.Platform]
	libraryPaths    []string
	logger          *zerolog.Logger
	database        *db.Database

	fileTree  *FileTree
	filePaths map[string][]string // latest scanned file paths, keyed by library path
}

type NewLibraryExplorerOptions struct {
	PlatformRef *util.Ref[platform.Platform]
	Logger      *zerolog.Logger
	Database    *db.Database
}

func NewLibraryExplorer(opts NewLibraryExplorerOptions) *LibraryExplorer {
	return &LibraryExplorer{
		platformRef: opts.PlatformRef,
		logger:      opts.Logger,
		database:    opts.Database,
	}
}

func (l *LibraryExplorer) SetAnimeCollection(collection *platform.UnifiedCollection) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.animeCollection = collection
}

func (l *LibraryExplorer) SetLibraryPaths(paths []string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.libraryPaths = paths
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Client functions
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// GetFileTree returns the file tree of the library (built from DB or disk)
func (l *LibraryExplorer) GetFileTree() (*FileTreeJSON, error) {
	l.mu.Lock()
	defer l.mu.Unlock()

	tree, err := l.getFileTree()
	if err != nil {
		return nil, err
	}

	// Always get the latest local file map for the response
	localFiles, _, err := db.GetLocalFiles(l.database)
	if err != nil {
		l.logger.Warn().Err(err).Msg("library explorer: Failed to get local files for tree response")
	}

	localFileMap := make(map[string]*dto.LocalFile)
	for _, lf := range localFiles {
		localFileMap[util.NormalizePath(lf.Path)] = lf
	}

	return &FileTreeJSON{
		Root:       tree.Root.toJSON(l),
		LocalFiles: localFileMap,
	}, nil
}

// LoadDirectoryChildren is no longer needed since we build the complete tree upfront
// This method is kept for API compatibility but does nothing
func (l *LibraryExplorer) LoadDirectoryChildren(dirPath string) error {
	// Validate that the path is within our library paths for security
	isValidPath := false
	for _, libraryPath := range l.libraryPaths {
		if dirPath == libraryPath || util.IsSubdirectory(libraryPath, dirPath) {
			isValidPath = true
			break
		}
	}

	if !isValidPath {
		return fmt.Errorf("path %s is not within library directories", dirPath)
	}

	// Since we now build the complete tree upfront, this is a no-op
	// The tree is already complete when built
	return nil
}

func (l *LibraryExplorer) getFileTree() (*FileTree, error) {
	if l.fileTree == nil {
		var err error
		l.fileTree, err = l.buildFileTree()
		if err != nil {
			return nil, err
		}
	}

	return l.fileTree, nil
}

func (l *LibraryExplorer) Refresh() error {
	l.mu.Lock()
	defer l.mu.Unlock()

	l.fileTree = nil
	l.filePaths = nil

	_, err := l.getFileTree()
	if err != nil {
		return err
	}

	return nil
}
