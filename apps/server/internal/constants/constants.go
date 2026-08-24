package constants

import (
	"kamehouse/internal/util"
	"time"
)

const (
	Version              = "3.5.0"
	VersionName          = "Hakumei"
	GcTime               = time.Minute * 30
	ConfigFileName       = "config.toml"

	TmdbApiUrl           = "https://api.themoviedb.org/3"
	TmdbImageBaseUrl     = "https://image.tmdb.org/t/p/original"
	IsRspackFrontend     = true
	MovieIDOffset        = 1_000_000
)

const (
	KameHouseRoomsApiUrl   = "https://kamehouse.app/api/rooms"
	KameHouseRoomsApiWsUrl = "wss://kamehouse.app/api/rooms"
	KameHouseRoomsVersion  = "1.0.0"
)

var DefaultExtensionMarketplaceURL = util.Decode("aHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL2thbWVoLW91c2Uva2FtZWhvdXNlLWV4dGVuc2lvbnMvbWFpbi9tYXJrZXRwbGFjZS5qc29u")
var AnnouncementURL = util.Decode("aHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL2thbWVoLW91c2Uva2FtZWhvdXNlL21haW4vcHVibGljL2Fubm91bmNlbWVudHMuanNvbg==")
var InternalMetadataURL = util.Decode("aHR0cHM6Ly9hbmltZS5jbGFwLmluZw==")
