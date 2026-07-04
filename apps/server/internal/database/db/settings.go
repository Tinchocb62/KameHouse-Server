package db

import (
	"kamehouse/internal/database/models"

	"gorm.io/gorm/clause"
)

var CurrSettings *models.Settings

func (db *Database) UpsertSettings(settings *models.Settings) (*models.Settings, error) {

	err := db.gormdb.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "id"}},
		UpdateAll: true,
	}).Create(settings).Error

	if err != nil {
		db.Logger.Error().Err(err).Msg("db: Failed to save settings in the database")
		return nil, err
	}

	CurrSettings = settings

	db.Logger.Debug().Msg("db: Settings saved")
	return settings, nil

}

func (db *Database) GetSettings() (*models.Settings, error) {

	if CurrSettings != nil {
		return CurrSettings, nil
	}

	var settings models.Settings
	err := db.gormdb.Where("id = ?", 1).Find(&settings).Error

	if err != nil {
		return nil, err
	}
	return &settings, nil
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

func (db *Database) GetAllLibraryPathsFromSettings() ([]string, error) {
	settings, err := db.GetSettings()
	if err != nil {
		return []string{}, err
	}
	return settings.Library.GetAllPaths(), nil
}

func (db *Database) AllLibraryPathsFromSettings(settings *models.Settings) *[]string {
	r := settings.Library.GetAllPaths()
	return &r
}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var CurrMediastreamSettings *models.MediastreamSettings

func (db *Database) UpsertMediastreamSettings(settings *models.MediastreamSettings) (*models.MediastreamSettings, error) {

	err := db.gormdb.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "id"}},
		UpdateAll: true,
	}).Create(settings).Error

	if err != nil {
		db.Logger.Error().Err(err).Msg("db: Failed to save media streaming settings in the database")
		return nil, err
	}

	CurrMediastreamSettings = settings

	db.Logger.Debug().Msg("db: Media streaming settings saved")
	return settings, nil

}

func (db *Database) GetMediastreamSettings() (*models.MediastreamSettings, bool) {

	if CurrMediastreamSettings != nil {
		return CurrMediastreamSettings, true
	}

	var settings models.MediastreamSettings
	err := db.gormdb.Where("id = ?", 1).First(&settings).Error

	if err != nil {
		return nil, false
	}
	return &settings, true
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////



//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
