package db

import (
	"errors"
	"kamehouse/internal/database/models"

	"gorm.io/gorm"
)

// GetGhostAssociationByPath retrieves a ghost association for a specific file path.
func (db *Database) GetGhostAssociationByPath(path string) (*models.GhostAssociatedMedia, error) {
	var association models.GhostAssociatedMedia
	err := db.gormdb.Where("path = ?", path).First(&association).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil // Return nil, but no error if not found
		}
		return nil, err
	}
	return &association, nil
}

// UpsertGhostAssociation inserts or updates a ghost association.
// If the path already has an association for the same TargetMediaID, it increments the GhostMatchCount.
func (db *Database) UpsertGhostAssociation(association *models.GhostAssociatedMedia) error {
	var existing models.GhostAssociatedMedia
	err := db.gormdb.Where("path = ?", association.Path).First(&existing).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Insert new
			return db.gormdb.Create(association).Error
		}
		return err
	}

	// Update existing
	if existing.TargetMediaID == association.TargetMediaID {
		existing.GhostMatchCount++
		existing.AlgorithmScore = association.AlgorithmScore // Update to latest score calculation
		existing.UserResolved = association.UserResolved
		return db.gormdb.Save(&existing).Error
	} else {
		// The path is now being associated with a DIFFERENT media ID.
		// Reset the heuristics and point to the new ID.
		existing.TargetMediaID = association.TargetMediaID
		existing.AlgorithmScore = association.AlgorithmScore
		existing.UserResolved = association.UserResolved
		existing.GhostMatchCount = 1
		return db.gormdb.Save(&existing).Error
	}
}

// Ensure interface compliance
func (db *Database) DeleteGhostAssociation(path string) error {
	return db.gormdb.Where("path = ?", path).Delete(&models.GhostAssociatedMedia{}).Error
}

// GetAllGhostAssociations returns all unresolved ghost file associations.
func (db *Database) GetAllGhostAssociations() ([]*models.GhostAssociatedMedia, error) {
	var associations []*models.GhostAssociatedMedia
	err := db.gormdb.Find(&associations).Error
	if err != nil {
		return nil, err
	}
	return associations, nil
}

// ResolveGhostAssociation manually resolves an unlinked file to a user-chosen media ID.
// This marks UserResolved=true and sets GhostMatchCount=4 so the matcher picks it up on next scan.
func (db *Database) ResolveGhostAssociation(path string, targetMediaId int) error {
	var existing models.GhostAssociatedMedia
	err := db.gormdb.Where("path = ?", path).First(&existing).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Create new association
			a := &models.GhostAssociatedMedia{
				Path:            path,
				TargetMediaID:   targetMediaId,
				UserResolved:    true,
				GhostMatchCount: 4,
				AlgorithmScore:  1.0,
			}
			return db.gormdb.Create(a).Error
		}
		return err
	}
	existing.TargetMediaID = targetMediaId
	existing.UserResolved = true
	existing.GhostMatchCount = 4
	existing.AlgorithmScore = 1.0
	return db.gormdb.Save(&existing).Error
}
