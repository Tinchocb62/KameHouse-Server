package scanner

import (
	"context"
	"testing"

	"kamehouse/internal/database/db"
	"kamehouse/internal/database/models"
	"kamehouse/internal/database/models/dto"
	"kamehouse/internal/util"
)

func newPersistenceTestDB(t *testing.T) *db.Database {
	t.Helper()
	logger := util.NewLogger()
	database, err := db.NewDatabase(context.Background(), t.TempDir(), "persistence_test", logger)
	if err != nil {
		t.Fatalf("Failed to create test database: %v", err)
	}
	// Windows won't let t.TempDir remove the file while sqlite still holds it open.
	t.Cleanup(func() { _ = database.Close() })
	return database
}

func ptrStr(s string) *string { return &s }

// A fast scan only hydrates metadata for the files it actually scanned, but
// allMatchedIds still covers the whole library. Records missing from
// normalizedMedia must keep the metadata they already have, since the upsert
// updates every column.
func TestPersistMatchedMedia_FastScanKeepsExistingMetadata(t *testing.T) {
	database := newPersistenceTestDB(t)
	logger := util.NewLogger()
	scn := &Scanner{Database: database, Logger: logger}

	// An already enriched movie, as a previous full scan would have left it.
	enriched := &models.LibraryMedia{
		Type:         "MOVIE",
		TmdbID:       39100,
		Format:       "MOVIE",
		TitleSpanish: "Dragon Ball Z: El Hombre más Fuerte de este Mundo",
		TitleEnglish: "Dragon Ball Z: The World's Strongest",
		PosterImage:  "https://image.tmdb.org/t/p/w780/poster.jpg",
		BannerImage:  "https://image.tmdb.org/t/p/original/banner.jpg",
		Description:  "Una descripción de TMDB.",
		Year:         1990,
	}
	if err := db.UpsertLibraryMediaBatch(database, []*models.LibraryMedia{enriched}, 10); err != nil {
		t.Fatalf("Failed to seed enriched media: %v", err)
	}

	// This scan only picked up a different movie, so normalizedMedia covers just that one.
	movieIds := map[int]bool{1039100: true, 1039324: true}
	allMatchedIds := map[int]struct{}{1039100: {}, 1039324: {}}
	normalizedMedia := []*dto.NormalizedMedia{
		{
			ID:          1039324,
			Title:       &dto.NormalizedMediaTitle{Spanish: ptrStr("Dragon Ball Z: Los dos Guerreros del Futuro")},
			CoverImage:  &dto.NormalizedMediaCoverImage{Large: ptrStr("https://image.tmdb.org/t/p/w780/otro.jpg")},
			Description: ptrStr("Otra descripción."),
		},
	}
	localFiles := []*dto.LocalFile{
		{Path: "D:/Media/Peliculas/Dragon Ball Z El Hombre Mas Fuerte del Mundo (1990)/f.mkv", MediaID: 1039100},
		{Path: "D:/Media/Peliculas/Dragon Ball Z Los Dos Guerreros del Futuro (1993)/f.mkv", MediaID: 1039324},
	}

	idMap := scn.persistMatchedMedia(allMatchedIds, movieIds, normalizedMedia, localFiles)

	var got models.LibraryMedia
	if err := database.Gorm().Where("tmdb_id = ? AND type = ?", 39100, "MOVIE").First(&got).Error; err != nil {
		t.Fatalf("Failed to read back seeded media: %v", err)
	}

	if got.PosterImage != enriched.PosterImage {
		t.Errorf("PosterImage was overwritten: got %q, want %q", got.PosterImage, enriched.PosterImage)
	}
	if got.TitleSpanish != enriched.TitleSpanish {
		t.Errorf("TitleSpanish was overwritten: got %q, want %q", got.TitleSpanish, enriched.TitleSpanish)
	}
	if got.Description != enriched.Description {
		t.Errorf("Description was overwritten: got %q, want %q", got.Description, enriched.Description)
	}
	if got.Format != enriched.Format {
		t.Errorf("Format was overwritten: got %q, want %q", got.Format, enriched.Format)
	}
	if got.Year != enriched.Year {
		t.Errorf("Year was overwritten: got %d, want %d", got.Year, enriched.Year)
	}

	// The untouched record still has to be associated with its local files.
	if _, ok := idMap[1039100]; !ok {
		t.Error("Untouched media is missing from the returned ID map")
	}
	if _, ok := idMap[1039324]; !ok {
		t.Error("Freshly written media is missing from the returned ID map")
	}
	for _, lf := range localFiles {
		if lf.LibraryMediaId == 0 {
			t.Errorf("Local file %q was not associated with a LibraryMedia record", lf.Path)
		}
	}
}

// Media that isn't in the database yet must still be persisted, even without
// hydrated metadata, so the collection can look it up.
func TestPersistMatchedMedia_NewMediaWithoutMetadataIsStillPersisted(t *testing.T) {
	database := newPersistenceTestDB(t)
	logger := util.NewLogger()
	scn := &Scanner{Database: database, Logger: logger}

	allMatchedIds := map[int]struct{}{1039100: {}}
	movieIds := map[int]bool{1039100: true}
	localFiles := []*dto.LocalFile{
		{Path: "D:/Media/Peliculas/Dragon Ball Z El Hombre Mas Fuerte del Mundo (1990)/f.mkv", MediaID: 1039100},
	}

	idMap := scn.persistMatchedMedia(allMatchedIds, movieIds, nil, localFiles)

	var got models.LibraryMedia
	if err := database.Gorm().Where("tmdb_id = ? AND type = ?", 39100, "MOVIE").First(&got).Error; err != nil {
		t.Fatalf("New media was not persisted: %v", err)
	}
	if got.TitleEnglish == "" {
		t.Error("Expected a filename-derived fallback title")
	}
	if _, ok := idMap[1039100]; !ok {
		t.Error("New media is missing from the returned ID map")
	}
}
