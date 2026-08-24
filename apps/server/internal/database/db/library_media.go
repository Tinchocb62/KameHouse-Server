package db

import (
	"errors"
	"fmt"
	"kamehouse/internal/database/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// GetLibraryMediaByTmdbId retrieves a LibraryMedia by its TMDB ID.
// Results are cached in memory after the first DB hit to avoid redundant
// SQLite reads during scan-time enrichment loops.
// Returns nil if no matching media is found.
func GetLibraryMediaByTmdbId(d *Database, tmdbID int) (*models.LibraryMedia, error) {
	cacheKey := fmt.Sprintf("id_%d", tmdbID)
	if v, ok := d.LibraryMediaCache.Load(cacheKey); ok {
		if media, _ := v.(*models.LibraryMedia); media == nil {
			return nil, nil
		} else {
			return media, nil
		}
	}
	var media models.LibraryMedia
	err := d.Gorm().Where("tmdb_id = ?", tmdbID).First(&media).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			d.LibraryMediaCache.Store(cacheKey, (*models.LibraryMedia)(nil))
			return nil, nil
		}
		return nil, err
	}
	d.LibraryMediaCache.Store(cacheKey, &media)
	return &media, nil
}

// GetLibraryMediaByTmdbIdAndType retrieves a LibraryMedia by its TMDB ID and Type.
func GetLibraryMediaByTmdbIdAndType(d *Database, tmdbID int, mediaType string) (*models.LibraryMedia, error) {
	cacheKey := fmt.Sprintf("id_type_%d_%s", tmdbID, mediaType)
	if v, ok := d.LibraryMediaCache.Load(cacheKey); ok {
		if media, _ := v.(*models.LibraryMedia); media == nil {
			return nil, nil
		} else {
			return media, nil
		}
	}
	var media models.LibraryMedia
	err := d.Gorm().Where("tmdb_id = ? AND type = ?", tmdbID, mediaType).First(&media).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			d.LibraryMediaCache.Store(cacheKey, (*models.LibraryMedia)(nil))
			return nil, nil
		}
		return nil, err
	}
	d.LibraryMediaCache.Store(cacheKey, &media)
	return &media, nil
}

// GetLibraryMediaByID retrieves a LibraryMedia by its primary key ID.
func GetLibraryMediaByID(d *Database, id uint) (*models.LibraryMedia, error) {
	cacheKey := fmt.Sprintf("pk_%d", id)
	if v, ok := d.LibraryMediaCache.Load(cacheKey); ok {
		if media, _ := v.(*models.LibraryMedia); media == nil {
			return nil, nil
		} else {
			return media, nil
		}
	}
	var media models.LibraryMedia
	err := d.Gorm().First(&media, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			d.LibraryMediaCache.Store(cacheKey, (*models.LibraryMedia)(nil))
			return nil, nil
		}
		return nil, err
	}
	d.LibraryMediaCache.Store(cacheKey, &media)
	return &media, nil
}

// GetMediaEntryListData retrieves the MediaEntryListData for a given LibraryMedia ID.
func GetMediaEntryListData(d *Database, libraryMediaId uint) (*models.MediaEntryListData, error) {
	var listData models.MediaEntryListData
	err := d.Gorm().Where("library_media_id = ?", libraryMediaId).First(&listData).Error
	if err != nil {
		return nil, err
	}
	return &listData, nil
}

// InsertLibraryMedia creates or updates a LibraryMedia record in the database.
// If a record with the same TMDB ID exists, it updates it; otherwise it creates a new one.
// The in-memory cache is invalidated so subsequent reads reflect the new state.
func InsertLibraryMedia(d *Database, media *models.LibraryMedia) (*models.LibraryMedia, error) {
	err := d.Gorm().Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "tmdb_id"}, {Name: "type"}}, // Must match uniqueIndex:idx_tmdb_id_type on the model
		UpdateAll: true,
	}).Create(media).Error
	if err != nil {
		return nil, err
	}
	// Invalidate cache entry so the next read fetches the authoritative DB record.
	if media.TmdbID != 0 {
		d.LibraryMediaCache.Delete(fmt.Sprintf("id_%d", media.TmdbID))
		d.LibraryMediaCache.Delete(fmt.Sprintf("id_type_%d_%s", media.TmdbID, media.Type))
	}
	if media.ID != 0 {
		d.LibraryMediaCache.Delete(fmt.Sprintf("pk_%d", media.ID))
	}
	return media, nil
}

// GetAllMediaEntryListData retrieves all MediaEntryListData entries with their associated LibraryMedia preloaded.
func GetAllMediaEntryListData(d *Database) ([]*models.MediaEntryListData, error) {
	var entries []*models.MediaEntryListData
	err := d.Gorm().Preload("LibraryMedia").Find(&entries).Error
	if err != nil {
		return nil, err
	}
	return entries, nil
}

// InsertMediaEntryListData creates or updates a MediaEntryListData record.
// If a record with the same LibraryMediaID exists, it updates it; otherwise it creates a new one.
func InsertMediaEntryListData(d *Database, data *models.MediaEntryListData) (*models.MediaEntryListData, error) {
	err := d.Gorm().Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "library_media_id"}},
		UpdateAll: true,
	}).Create(data).Error
	if err != nil {
		return nil, err
	}
	return data, nil
}

// TrimLocalFileEntries removes old legacy local file entries (blob storage) from the database,
// keeping only the latest entry. This is only for the legacy local_files table.
func TrimLocalFileEntries(d *Database) {
	var count int64
	d.Gorm().Model(&models.LocalFiles{}).Count(&count)
	if count > 1 {
		// Keep only the latest entry
		var latest models.LocalFiles
		if err := d.Gorm().Last(&latest).Error; err == nil {
			d.Gorm().Where("id != ?", latest.ID).Delete(&models.LocalFiles{})
		}
	}
}

// GetLibraryMediaByExternalID retrieves a LibraryMedia by its external ID (e.g. slug or custom mapping).
func GetLibraryMediaByExternalID(d *Database, externalId string) (*models.LibraryMedia, error) {
	var media models.LibraryMedia
	err := d.Gorm().
		Joins("JOIN provider_mappings ON provider_mappings.library_media_id = library_media.id").
		Where("provider_mappings.external_id = ?", externalId).
		First(&media).Error
	if err != nil {
		return nil, err
	}
	return &media, nil
}

// UpsertLibraryMediaBatch inserts or updates a slice of LibraryMedia atomically in a single transaction.
// All affected TMDB IDs are evicted from the in-memory cache after the write.
func UpsertLibraryMediaBatch(d *Database, media []*models.LibraryMedia, batchSize int) error {
	if len(media) == 0 {
		return nil
	}

	err := d.Gorm().Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "tmdb_id"}, {Name: "type"}}, // Unique composite constraint
		UpdateAll: true,
	}).CreateInBatches(media, batchSize).Error

	if err == nil {
		// Evict stale cache entries for every record that was just written.
		for _, m := range media {
			if m.TmdbID != 0 {
				d.LibraryMediaCache.Delete(fmt.Sprintf("id_%d", m.TmdbID))
				d.LibraryMediaCache.Delete(fmt.Sprintf("id_type_%d_%s", m.TmdbID, m.Type))
			}
			if m.ID != 0 {
				d.LibraryMediaCache.Delete(fmt.Sprintf("pk_%d", m.ID))
			}
		}
	}
	return err
}

// UpdateLibraryMediaMappings updates the external mappings (AniDB, MAL) for a LibraryMedia record.
func UpdateLibraryMediaMappings(d *Database, id uint, anidbId, malId int) error {
	return d.Gorm().Model(&models.LibraryMedia{}).Where("id = ?", id).Updates(map[string]interface{}{
		"anidb_id":       anidbId,
		"myanimelist_id": malId,
	}).Error
}

// CleanBrokenLibraryMediaPosters resets broken/hallucinated legacy placeholder image URLs in the DB
// and updates the core Dragon Ball series with their verified authentic TMDB artwork.
func CleanBrokenLibraryMediaPosters(d *Database) {
	brokenPatterns := []string{
		"%daima_poster%", "%daima_banner%",
		"%bardock_poster%", "%bardock_banner%",
		"%trunks_future%", "%deadzone%",
		"%broly_poster%", "%superhero_poster%",
		"%6GI51l50f4Gf0K7D5V7bZ2V6eB5%",
		"%3w8hdA7V1f6Y23qgJjW8R9Y54Vb%",
		"%4gN1vO4bZz2PzR0V6eB6aQ7lH4m%",
		"%qV8s4B1zO0f1V7bZ2V6eB5lH4m0%",
		"%96X0I7m4oD1vO4bZz2PzR0V6eB5%",
		"%f02FFv0x2fB6aQ7lH4m0vO4bZz2%",
		"%rugyJioKn7Ky1qO4bZz2PzR0V6e%",
		"%2exOOgqIeYvC4vFk7Hj5tQ3XpW6%",
		"%6xK4S5gN0V8bZ2PzR0V6eB6aQ7l%",
		"%mX9V8s4B1zO0f1V7bZ2V6eB5lH4%",
		"%7hM7zP0V6eB5lH4m0vO4bZz2PzR%",
		"%dJODzGsqM92Z2rP0Z8dI1iPz8N0%",
	}
	for _, p := range brokenPatterns {
		d.Gorm().Model(&models.LibraryMedia{}).Where("poster_image LIKE ?", p).Update("poster_image", "")
		d.Gorm().Model(&models.LibraryMedia{}).Where("banner_image LIKE ?", p).Update("banner_image", "")
	}

	// Set verified official artwork for canonical TV series if missing or cleared
	verifiedArt := map[int][2]string{
		12609:  {"https://image.tmdb.org/t/p/w500/30L49n4Dhn7dzuGG50GV3ybMhC3.jpg", "https://image.tmdb.org/t/p/original/onCLyCOgszTIyyVs2XKYSkKPOPG.jpg"},
		12971:  {"https://image.tmdb.org/t/p/w500/ydf1CeiBLfdxiyNTpskM0802TKl.jpg", "https://image.tmdb.org/t/p/original/oQ5CnVj3TRifXl2bIOri6H6rfNe.jpg"},
		12697:  {"https://image.tmdb.org/t/p/w500/aJOlYXjxb5IvnTsO4I1tmFpC7GH.jpg", "https://image.tmdb.org/t/p/original/rLHhDpv6rrhuzBjNzaMRNv2fng.jpg"},
		61709:  {"https://image.tmdb.org/t/p/w500/oz5zbMBKCUsb7hsbjdxvK8yagPD.jpg", "https://image.tmdb.org/t/p/original/ojsPI8fNwcecKLhVC4rB4ZZhFMc.jpg"},
		42705:  {"https://image.tmdb.org/t/p/w500/oz5zbMBKCUsb7hsbjdxvK8yagPD.jpg", "https://image.tmdb.org/t/p/original/ojsPI8fNwcecKLhVC4rB4ZZhFMc.jpg"},
		62715:  {"https://image.tmdb.org/t/p/w500/qA2UwUQbj05aeBMCuC0mHSQ4loE.jpg", "https://image.tmdb.org/t/p/original/qEUrbXJ2qt4Rg84Btlx4STOhgte.jpg"},
		236994: {"https://image.tmdb.org/t/p/w500/oUmWLyeko3kYdUr8DBLIsxwcugl.jpg", "https://image.tmdb.org/t/p/original/lMULbSFZNXUC87MqOZQ4SSV9DXI.jpg"},
	}

	for tmdbId, art := range verifiedArt {
		d.Gorm().Model(&models.LibraryMedia{}).
			Where("tmdb_id = ? AND (poster_image = '' OR poster_image IS NULL)", tmdbId).
			Update("poster_image", art[0])
		d.Gorm().Model(&models.LibraryMedia{}).
			Where("tmdb_id = ? AND (banner_image = '' OR banner_image IS NULL)", tmdbId).
			Update("banner_image", art[1])
	}
}
