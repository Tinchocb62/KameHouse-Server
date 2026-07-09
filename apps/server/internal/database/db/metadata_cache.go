package db

import (
	"github.com/goccy/go-json"
	"kamehouse/internal/database/models"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// GetMetadataCache retrieves a cached value from the database if it hasn't expired.
func GetMetadataCache(d *Database, provider, key string, out interface{}) (bool, error) {
	var cache models.MetadataCache
	err := d.Gorm().Where("provider = ? AND key = ?", provider, key).First(&cache).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return false, nil
		}
		return false, err
	}

	if !cache.ExpiresAt.IsZero() && cache.ExpiresAt.Before(time.Now()) {
		// Expired - we could delete it here, but we'll just let the upsert handle it
		return false, nil
	}

	err = json.Unmarshal(cache.Value, out)
	if err != nil {
		return false, err
	}

	return true, nil
}

// UpsertMetadataCache saves a value to the persistent cache with an optional TTL.
func UpsertMetadataCache(d *Database, provider, key string, value interface{}, ttl time.Duration) error {
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}

	var expiresAt time.Time
	if ttl > 0 {
		expiresAt = time.Now().Add(ttl)
	}

	cache := models.MetadataCache{
		Provider:  provider,
		Key:       key,
		Value:     data,
		ExpiresAt: expiresAt,
	}

	return d.Gorm().Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "provider"}, {Name: "key"}},
		DoUpdates: clause.AssignmentColumns([]string{"value", "expires_at", "updated_at"}),
	}).Create(&cache).Error
}

// DeleteMetadataCacheByProvider removes all cached entries for a given provider.
// This is useful when enrichment logic changes and we need to force a re-fetch.
func DeleteMetadataCacheByProvider(d *Database, provider string) error {
	return d.Gorm().Where("provider = ?", provider).Delete(&models.MetadataCache{}).Error
}

// DeleteMetadataCache removes a specific cached entry.
func DeleteMetadataCache(d *Database, provider, key string) error {
	return d.Gorm().Where("provider = ? AND key = ?", provider, key).Delete(&models.MetadataCache{}).Error
}

// DeleteExpiredMetadataCache removes all cached entries that have expired.
// Entries with ExpiresAt set to the zero value (no TTL) are preserved.
func DeleteExpiredMetadataCache(d *Database) (int64, error) {
	zeroTime := time.Time{}
	res := d.Gorm().Where("expires_at < ? AND expires_at > ?", time.Now(), zeroTime).Delete(&models.MetadataCache{})
	return res.RowsAffected, res.Error
}
