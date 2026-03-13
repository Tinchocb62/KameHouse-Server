package dto

import "kamehouse/internal/database/models"

// ContinueWatchingItem represents a media item the user is currently watching or should watch next.
type ContinueWatchingItem struct {
	Media           *models.LibraryMedia   `json:"media"`
	Episode         *models.LibraryEpisode `json:"episode"`
	Progress        float64                `json:"progress"` // 0-1 percentage
	LastPlaybackPos float64                `json:"lastPlaybackPos"`
	IsNextEpisode   bool                   `json:"isNextEpisode"`
}
