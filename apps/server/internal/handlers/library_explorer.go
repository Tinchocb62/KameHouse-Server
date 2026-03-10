package handlers

import (
	"strconv"

	"kamehouse/internal/database/models/dto"

	"github.com/labstack/echo/v4"
)

// HandleGetLibraryExplorerFileTree
//
//	@summary returns the file tree structure of the library directories.
//	@desc This returns a hierarchical representation of all directories and media files in the library.
//	@desc The tree includes LocalFile associations and media IDs for each file and directory.
//	@route /api/v1/library/explorer/file-tree [GET]
//	@returns library_explorer.FileTreeJSON
func (h *Handler) HandleGetLibraryExplorerFileTree(c echo.Context) error {

	if h.App.LibraryExplorer == nil {
		return h.RespondWithError(c, echo.NewHTTPError(500, "Library explorer is not initialized"))
	}

	// Get library paths from settings
	settings, err := h.App.Database.GetSettings()
	if err != nil {
		return h.RespondWithError(c, err)
	}

	libraryPaths := settings.GetLibrary().GetLibraryPaths()
	h.App.LibraryExplorer.SetLibraryPaths(libraryPaths)

	// Get file tree
	fileTree, err := h.App.LibraryExplorer.GetFileTree()
	if err != nil {
		return h.RespondWithError(c, err)
	}

	limitStr := c.QueryParam("limit")
	offsetStr := c.QueryParam("offset")

	// Paginación segura para no saturar al cliente RSC con diccionarios de 10k elementos
	if limitStr != "" || offsetStr != "" {
		limit, _ := strconv.Atoi(limitStr)
		offset, _ := strconv.Atoi(offsetStr)

		if limit <= 0 {
			limit = 100 // default fallback
		}

		current := 0
		paginatedFiles := make(map[string]*dto.LocalFile)

		for k, v := range fileTree.LocalFiles {
			if current >= offset && current < (offset+limit) {
				paginatedFiles[k] = v
			}
			current++
			if current >= (offset + limit) {
				break
			}
		}

		// Crear una copia superficial del response tree para reemplazar el map gigante
		paginatedTree := *fileTree
		paginatedTree.LocalFiles = paginatedFiles

		return h.RespondWithData(c, paginatedTree)
	}

	return h.RespondWithData(c, fileTree)
}

// HandleRefreshLibraryExplorerFileTree
//
//	@summary refreshes the file tree structure of the library directories.
//	@desc This clears the cached file tree and rebuilds it from the current library state.
//	@desc Use this when the library structure has changed and you want to update the tree.
//	@route /api/v1/library/explorer/file-tree/refresh [POST]
//	@returns bool
func (h *Handler) HandleRefreshLibraryExplorerFileTree(c echo.Context) error {

	if h.App.LibraryExplorer == nil {
		return h.RespondWithError(c, echo.NewHTTPError(500, "Library explorer is not initialized"))
	}

	// Get library paths from settings
	settings, err := h.App.Database.GetSettings()
	if err != nil {
		return h.RespondWithError(c, err)
	}

	libraryPaths := settings.GetLibrary().GetLibraryPaths()
	h.App.LibraryExplorer.SetLibraryPaths(libraryPaths)

	// Refresh file tree
	err = h.App.LibraryExplorer.Refresh()
	if err != nil {
		return h.RespondWithError(c, err)
	}

	return h.RespondWithData(c, true)
}

// HandleLoadLibraryExplorerDirectoryChildren
//
//	@summary loads the children of a specific directory into the file tree.
//	@desc This endpoint loads directory children into the cached file tree. Frontend should re-fetch the tree afterwards.
//	@desc The directory path must be within the configured library paths for security.
//	@route /api/v1/library/explorer/directory-children [POST]
//	@returns bool
func (h *Handler) HandleLoadLibraryExplorerDirectoryChildren(c echo.Context) error {

	type body struct {
		DirectoryPath string `json:"directoryPath"`
	}

	b := new(body)
	if err := c.Bind(b); err != nil {
		return h.RespondWithError(c, err)
	}

	if h.App.LibraryExplorer == nil {
		return h.RespondWithError(c, echo.NewHTTPError(500, "Library explorer is not initialized"))
	}

	// Get library paths from settings
	settings, err := h.App.Database.GetSettings()
	if err != nil {
		return h.RespondWithError(c, err)
	}

	libraryPaths := settings.GetLibrary().GetLibraryPaths()
	h.App.LibraryExplorer.SetLibraryPaths(libraryPaths)

	// Load directory children into the tree
	err = h.App.LibraryExplorer.LoadDirectoryChildren(b.DirectoryPath)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	return h.RespondWithData(c, true)
}
