package db

import (
	"github.com/goccy/go-json"
	"kamehouse/internal/database/models"
	"kamehouse/internal/database/models/dto"
	"strings"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// GetAllLocalFilesRelational retrieves all local files from the relational table.
func GetAllLocalFilesRelational(d *Database) ([]*dto.LocalFile, error) {
	var dbFiles []*models.LocalFile
	err := d.gormdb.Find(&dbFiles).Error
	if err != nil {
		return nil, err
	}

	res := make([]*dto.LocalFile, len(dbFiles))
	for i, dbf := range dbFiles {
		res[i] = LocalFileModelToDto(dbf)
	}
	return res, nil
}

// GetLocalFilesByMediaIDRelational retrieves all local files for a specific media ID.
// GetLibraryMediaByExternalMediaID resuelve el LibraryMedia a partir del mediaId
// EXTERNO (derivado de TMDB) con el que se indexan la API, local_file.media_id y
// episode_skip_times.media_id.
//
// Ese id NO es la PK de library_media: los dos espacios de ids no se solapan, así
// que un `Where("id = ?", mediaID)` sobre library_media devuelve siempre
// ErrRecordNotFound. Como ese "not found" suele tratarse como "esta media no
// tiene mapeo" en vez de como un bug, la feature que dependa de él se apaga en
// silencio (le pasó al Método A de skipdetect y a HandleResolveMAL). Resolvemos
// por la FK library_media_id de los archivos locales, que vale igual para series
// y para películas (cuyo id externo va prefijado).
//
// Devuelve ErrRecordNotFound si la media no está en la librería local.
func GetLibraryMediaByExternalMediaID(d *Database, mediaID int) (*models.LibraryMedia, error) {
	var lf models.LocalFile
	if err := d.gormdb.
		Where("media_id = ? AND library_media_id > 0", mediaID).
		First(&lf).Error; err != nil {
		return nil, err
	}

	var lm models.LibraryMedia
	if err := d.gormdb.Where("id = ?", lf.LibraryMediaId).First(&lm).Error; err != nil {
		return nil, err
	}
	return &lm, nil
}

func GetLocalFilesByMediaIDRelational(d *Database, mediaID int) ([]*dto.LocalFile, error) {
	var dbFiles []*models.LocalFile
	err := d.gormdb.Where("media_id = ?", mediaID).Find(&dbFiles).Error
	if err != nil {
		return nil, err
	}

	res := make([]*dto.LocalFile, len(dbFiles))
	for i, dbf := range dbFiles {
		res[i] = LocalFileModelToDto(dbf)
	}
	return res, nil
}

// UpsertLocalFileRelationalBatch inserts or updates a slice of LocalFiles in the relational table.
func UpsertLocalFileRelationalBatch(d *Database, files []*dto.LocalFile) error {
	if len(files) == 0 {
		return nil
	}

	dbFiles := make([]*models.LocalFile, len(files))
	for i, f := range files {
		dbFiles[i] = LocalFileDtoToModel(f)
	}

	err := d.gormdb.Transaction(func(tx *gorm.DB) error {
		return tx.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "path"}},
			UpdateAll: true,
		}).CreateInBatches(dbFiles, 60).Error
	})
	if err != nil {
		return err
	}
	InvalidateLocalFilesCache()
	return nil
}

// SyncLocalFilesRelational performs a full sync: upserts the given files and deletes any other file in the DB.
func SyncLocalFilesRelational(d *Database, files []*dto.LocalFile) error {
	err := UpsertLocalFileRelationalBatch(d, files)
	if err != nil {
		return err
	}

	// Delete files that are no longer present
	paths := make([]string, len(files))
	for i, f := range files {
		paths[i] = f.Path
	}

	err = d.gormdb.Transaction(func(tx *gorm.DB) error {
		// If the library is small, we can use a simple NOT IN clause
		if len(paths) < 950 {
			return tx.Where("path NOT IN ?", paths).Delete(&models.LocalFile{}).Error
		}

		// For larger libraries, use a temporary table to avoid SQLite's variable limit (SQLITE_MAX_VARIABLE_NUMBER)
		d.Logger.Info().Int("count", len(paths)).Msg("db: Library large, using temporary table for sync")

		if err := tx.Exec("CREATE TEMPORARY TABLE IF NOT EXISTS sync_paths (path TEXT PRIMARY KEY)").Error; err != nil {
			return err
		}
		// Ensure clean state
		if err := tx.Exec("DELETE FROM sync_paths").Error; err != nil {
			return err
		}

		// Insert paths in batches of 500 (safe for single-column inserts)
		for i := 0; i < len(paths); i += 500 {
			end := i + 500
			if end > len(paths) {
				end = len(paths)
			}
			batch := paths[i:end]

			// GORM doesn't easily support batch insert of primitives into raw tables, so we build the SQL
			placeholders := make([]string, len(batch))
			vals := make([]interface{}, len(batch))
			for j, p := range batch {
				placeholders[j] = "?"
				vals[j] = p
			}
			sql := "INSERT INTO sync_paths (path) VALUES (" + strings.Join(placeholders, "),(") + ")"
			if err := tx.Exec(sql, vals...).Error; err != nil {
				return err
			}
		}

		// Delete files not in the temporary table
		if err := tx.Exec("DELETE FROM local_file WHERE path NOT IN (SELECT path FROM sync_paths)").Error; err != nil {
			return err
		}

		// Cleanup
		return tx.Exec("DROP TABLE sync_paths").Error
	})
	if err != nil {
		return err
	}
	InvalidateLocalFilesCache()
	return nil
}

// SyncPartialLocalFilesRelational performs a partial sync: upserts given files and deletes missing files ONLY within targeted paths.
func SyncPartialLocalFilesRelational(d *Database, files []*dto.LocalFile, targetPaths []string) error {
	if len(targetPaths) == 0 {
		return SyncLocalFilesRelational(d, files)
	}

	err := UpsertLocalFileRelationalBatch(d, files)
	if err != nil {
		return err
	}

	newPaths := make([]string, len(files))
	for i, f := range files {
		newPaths[i] = f.Path
	}

	// Create a query to delete files that belong to targetPaths but were not found in this scan
	query := d.gormdb.Model(&models.LocalFile{}).Where("path NOT IN ?", newPaths)

	// Filter by targetPaths (using LIKE for directories)
	for i, target := range targetPaths {
		if i == 0 {
			query = query.Where("path LIKE ?", target+"%")
		} else {
			query = query.Or("path LIKE ?", target+"%")
		}
	}

	err = query.Delete(&models.LocalFile{}).Error
	if err != nil {
		return err
	}
	InvalidateLocalFilesCache()
	return nil
}

// DeleteLocalFilesRelationalByPaths removes local files with the given paths.
func DeleteLocalFilesRelationalByPaths(d *Database, paths []string) error {
	if len(paths) == 0 {
		return nil
	}
	err := d.gormdb.Where("path IN ?", paths).Delete(&models.LocalFile{}).Error
	if err != nil {
		return err
	}
	InvalidateLocalFilesCache()
	return nil
}

// ─────────────────────────────────────────────────────────────────────────────
// Converters
// ─────────────────────────────────────────────────────────────────────────────

func LocalFileDtoToModel(f *dto.LocalFile) *models.LocalFile {
	m := &models.LocalFile{
		Path:           f.Path,
		Name:           f.Name,
		FileHash:       f.FileHash,
		Locked:         f.Locked,
		Ignored:        f.Ignored,
		LibraryMediaId: f.LibraryMediaId,
		MediaID:        f.MediaID,
		FileSize:       f.FileSize,
		FileModTime:    f.FileModTime,
	}

	if f.ParsedData != nil {
		m.ParsedData, _ = json.Marshal(f.ParsedData)
	}
	if f.ParsedFolderData != nil {
		m.ParsedFolderData, _ = json.Marshal(f.ParsedFolderData)
	}
	if f.EmbeddedMetadata != nil {
		m.EmbeddedMetadata, _ = json.Marshal(f.EmbeddedMetadata)
	}
	if f.Metadata != nil {
		m.Metadata, _ = json.Marshal(f.Metadata)
	}
	if f.TechnicalInfo != nil {
		m.TechnicalInfo, _ = json.Marshal(f.TechnicalInfo)
	}

	return m
}

func LocalFileModelToDto(m *models.LocalFile) *dto.LocalFile {
	f := &dto.LocalFile{
		Path:           m.Path,
		Name:           m.Name,
		FileHash:       m.FileHash,
		Locked:         m.Locked,
		Ignored:        m.Ignored,
		LibraryMediaId: m.LibraryMediaId,
		MediaID:        m.MediaID,
		FileSize:       m.FileSize,
		FileModTime:    m.FileModTime,
	}

	if len(m.ParsedData) > 0 {
		_ = json.Unmarshal(m.ParsedData, &f.ParsedData)
	}
	if len(m.ParsedFolderData) > 0 {
		_ = json.Unmarshal(m.ParsedFolderData, &f.ParsedFolderData)
	}
	if len(m.EmbeddedMetadata) > 0 {
		_ = json.Unmarshal(m.EmbeddedMetadata, &f.EmbeddedMetadata)
	}
	if len(m.Metadata) > 0 {
		_ = json.Unmarshal(m.Metadata, &f.Metadata)
	}
	if len(m.TechnicalInfo) > 0 {
		_ = json.Unmarshal(m.TechnicalInfo, &f.TechnicalInfo)
	}

	return f
}
