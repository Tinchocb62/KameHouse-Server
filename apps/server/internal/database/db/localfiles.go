package db

import (
	"errors"

	"kamehouse/internal/database/models"
	"kamehouse/internal/database/models/dto"
	"sync"

	"github.com/goccy/go-json"
	"github.com/samber/mo"
	"golang.org/x/sync/singleflight"
	"gorm.io/gorm"
)

var localFilesMutex sync.RWMutex
var CurrLocalFilesDbId uint
var CurrLocalFiles mo.Option[[]*dto.LocalFile]
var localFilesSingleFlight singleflight.Group

// GetLocalFiles will return the latest local files.
// The second return value (ID) is now legacy and returns 0 as we use relational storage.
func GetLocalFiles(d *Database) ([]*dto.LocalFile, uint, error) {
	localFilesMutex.RLock()
	if cached, ok := CurrLocalFiles.Get(); ok {
		localFilesMutex.RUnlock()
		return cached, CurrLocalFilesDbId, nil
	}
	localFilesMutex.RUnlock()

	val, err, _ := localFilesSingleFlight.Do("get_local_files", func() (interface{}, error) {
		// Re-check cache inside singleflight to avoid racing
		localFilesMutex.RLock()
		if cached, ok := CurrLocalFiles.Get(); ok {
			localFilesMutex.RUnlock()
			return cached, nil
		}
		localFilesMutex.RUnlock()

		lfs, err := GetAllLocalFilesRelational(d)
		if err != nil {
			return nil, err
		}

		localFilesMutex.Lock()
		CurrLocalFiles = mo.Some(lfs)
		CurrLocalFilesDbId = 0
		localFilesMutex.Unlock()

		return lfs, nil
	})

	if err != nil {
		return nil, 0, err
	}

	lfs := val.([]*dto.LocalFile)

	d.Logger.Debug().Int("count", len(lfs)).Msg("db: Local files retrieved from relational storage")
	return lfs, 0, nil
}

// InvalidateLocalFilesCache clears the in-memory local files cache.
func InvalidateLocalFilesCache() {
	localFilesMutex.Lock()
	CurrLocalFiles = mo.None[[]*dto.LocalFile]()
	localFilesMutex.Unlock()
}

// GetLocalFilesByMediaID will return the local files for the given media ID.
func GetLocalFilesByMediaID(d *Database, mediaID int) ([]*dto.LocalFile, error) {
	lfs, err := GetLocalFilesByMediaIDRelational(d, mediaID)
	if err != nil {
		return nil, err
	}
	d.Logger.Debug().Int("mediaID", mediaID).Int("count", len(lfs)).Msg("db: Local files retrieved from relational storage by media ID")
	return lfs, nil
}

// SaveLocalFiles will save the local files in the database.
func SaveLocalFiles(d *Database, _ uint, lfs []*dto.LocalFile) ([]*dto.LocalFile, error) {
	err := UpsertLocalFileRelationalBatch(d, lfs)
	if err != nil {
		return nil, err
	}
	d.Logger.Debug().Int("count", len(lfs)).Msg("db: Local files saved to relational storage")
	return lfs, nil
}

// InsertLocalFiles will insert the local files in the database.
func InsertLocalFiles(d *Database, lfs []*dto.LocalFile) ([]*dto.LocalFile, error) {
	err := SyncLocalFilesRelational(d, lfs)
	if err != nil {
		return nil, err
	}
	d.Logger.Debug().Int("count", len(lfs)).Msg("db: Local files synchronized with relational storage")
	return lfs, nil
}

// InsertPartialLocalFiles will insert the local files for targeted paths in the database.
func InsertPartialLocalFiles(d *Database, lfs []*dto.LocalFile, targetPaths []string) ([]*dto.LocalFile, error) {
	err := SyncPartialLocalFilesRelational(d, lfs, targetPaths)
	if err != nil {
		return nil, err
	}
	d.Logger.Debug().Int("count", len(lfs)).Msg("db: Partial local files synchronized with relational storage")
	return lfs, nil
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

func GetShelvedLocalFiles(db *Database) ([]*dto.LocalFile, error) {
	var res models.ShelvedLocalFiles
	err := db.Gorm().Last(&res).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	lfsBytes := res.Value
	var lfs []*dto.LocalFile
	if err := json.Unmarshal(lfsBytes, &lfs); err != nil {
		return nil, err
	}

	db.Logger.Debug().Msg("db: Shelved local files retrieved")

	return lfs, nil
}

func SaveShelvedLocalFiles(db *Database, lfs []*dto.LocalFile) error {
	// Marshal the local files
	marshaledLfs, err := json.Marshal(lfs)
	if err != nil {
		return err
	}

	// Save the local files
	_, err = db.UpsertShelvedLocalFiles(&models.ShelvedLocalFiles{
		BaseModel: models.BaseModel{
			ID: 1,
		},
		Value: marshaledLfs,
	})
	if err != nil {
		return err
	}

	return nil
}
