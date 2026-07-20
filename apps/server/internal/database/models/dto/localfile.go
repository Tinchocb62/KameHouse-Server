package dto

import (
	"encoding/json"
	"kamehouse/internal/database/models"
	"kamehouse/internal/library/filesystem"
	"strconv"
	"time"

	"github.com/5rahim/habari"
	"github.com/nssteinbrenner/anitogo"
)

const (
	LocalFileTypeMain    LocalFileType = "main"    // Main episodes that are trackable
	LocalFileTypeSpecial LocalFileType = "special" // OVA, ONA, etc.
	LocalFileTypeNC      LocalFileType = "nc"      // Opening, ending, etc.
)

type (
	LocalFileType string
	// LocalFile represents a media file on the local filesystem.
	// It is used to store information about and state of the file, such as its path, name, and parsed data.
	LocalFile struct {
		Path             string                     `json:"path"`
		Name             string                     `json:"name"`
		FileHash         string                     `json:"fileHash,omitempty"`
		FileSize         int64                      `json:"fileSize,omitempty"`
		FileModTime      int64                      `json:"fileModTime,omitempty"`
		ParsedData       *LocalFileParsedData       `json:"parsedInfo"`
		ParsedFolderData []*LocalFileParsedData     `json:"parsedFolderInfo"`
		EmbeddedMetadata *LocalFileEmbeddedMetadata `json:"embeddedMetadata,omitempty"`
		Metadata         *LocalFileMetadata         `json:"metadata"`
		TechnicalInfo    *FileTechnicalInfo         `json:"technicalInfo,omitempty"`
		Locked           bool                       `json:"locked"`
		Ignored          bool                       `json:"ignored"` // Unused for now
		LibraryMediaId   uint                       `json:"libraryMediaId"`
		MediaID          int                        `json:"mediaId"`
	}

	LocalFileEmbeddedMetadata struct {
		Title   string `json:"title,omitempty"`
		Season  *int   `json:"season,omitempty"`
		Episode *int   `json:"episode,omitempty"`
		Source  string `json:"source,omitempty"`
	}

	// FileTechnicalInfo holds FFprobe technical specifications of a video file.
	FileTechnicalInfo struct {
		Duration           time.Duration        `json:"duration,omitempty"`
		Size               int64                `json:"size,omitempty"`
		Bitrate            int64                `json:"bitrate,omitempty"`
		Format             string               `json:"format,omitempty"`
		VideoStream        *VideoStreamInfo     `json:"videoStream,omitempty"`
		AudioStreams       []*AudioStreamInfo   `json:"audioStreams,omitempty"`
		SubtitleStreams    []*AudioStreamInfo   `json:"subtitleStreams,omitempty"`    // Reusing Audio structure since they share basic properties
		ExternalSubtitles  []*ExternalSubtitle  `json:"externalSubtitles,omitempty"`  // External .srt/.ass files (Jellyfin-style)
		ExternalAudioFiles []*ExternalAudioFile `json:"externalAudioFiles,omitempty"` // External .dts/.ac3 files
	}

	// ExternalSubtitle represents a subtitle file found alongside a video file.
	// Follows Jellyfin's naming convention: MovieName.{language}.{flags}.{ext}
	// Example: "Movie.es.forced.srt" → Language="es", IsForced=true
	ExternalSubtitle struct {
		Path     string `json:"path"`               // Absolute path to the subtitle file
		Filename string `json:"filename"`           // Base filename
		Format   string `json:"format"`             // File extension: srt, ass, vtt, sup, etc.
		Language string `json:"language,omitempty"` // ISO 639-1 code (e.g. "es", "en", "ja")
		IsForced bool   `json:"isForced,omitempty"` // True if "forced" flag present in filename
		IsSDH    bool   `json:"isSDH,omitempty"`    // True if "sdh" or "hi" flag present (Hearing Impaired)
		IsCC     bool   `json:"isCC,omitempty"`     // True if "cc" flag present (Closed Captions)
	}

	// ExternalAudioFile represents an external audio track found alongside a video file.
	// Follows Jellyfin's naming convention: MovieName.{language}.{ext}
	ExternalAudioFile struct {
		Path     string `json:"path"`               // Absolute path to the audio file
		Filename string `json:"filename"`           // Base filename
		Format   string `json:"format"`             // File extension: dts, ac3, truehd, etc.
		Language string `json:"language,omitempty"` // ISO 639-1 code
	}

	VideoStreamInfo struct {
		Codec          string `json:"codec,omitempty"`          // e.g. h264, hevc
		Profile        string `json:"profile,omitempty"`        // e.g. High 10, Main
		Width          int    `json:"width,omitempty"`          // 1920
		Height         int    `json:"height,omitempty"`         // 1080
		FrameRate      string `json:"frameRate,omitempty"`      // 24000/1001
		ColorSpace     string `json:"colorSpace,omitempty"`     // e.g. bt2020nc
		ColorTransfer  string `json:"colorTransfer,omitempty"`  // e.g. smpte2084
		ColorPrimaries string `json:"colorPrimaries,omitempty"` // e.g. bt2020
	}

	AudioStreamInfo struct {
		Codec    string `json:"codec,omitempty"`    // e.g. aac, flac
		Language string `json:"language,omitempty"` // e.g. jpn, eng
		Title    string `json:"title,omitempty"`    // e.g. Japanese 5.1
	}

	// LocalFileMetadata holds metadata related to a media episode.
	LocalFileMetadata struct {
		Episodes     []int         `json:"episodes"` // Multi-episode support for files like "01-03"
		AniDBEpisode string        `json:"aniDBEpisode"`
		Type         LocalFileType `json:"type"`
		EpisodeType  EpisodeType   `json:"episodeType,omitempty"` // Canon, Filler, Hyped

		// Deprecated: Use Episodes instead. Kept for backwards compatibility.
		Episode int `json:"episode"`
	}

	// LocalFileParsedData holds parsed data from a media file's name.
	// This data is used to identify the media file during the scanning process.
	LocalFileParsedData struct {
		Original     string   `json:"original"`
		Title        string   `json:"title,omitempty"`
		ReleaseGroup string   `json:"releaseGroup,omitempty"`
		Season       string   `json:"season,omitempty"`
		SeasonRange  []string `json:"seasonRange,omitempty"`
		Part         string   `json:"part,omitempty"`
		PartRange    []string `json:"partRange,omitempty"`
		Episode      string   `json:"episode,omitempty"`
		EpisodeRange []string `json:"episodeRange,omitempty"`
		EpisodeTitle string   `json:"episodeTitle,omitempty"`
		Year         string   `json:"year,omitempty"`
	}
)

// NewLocalFileS creates and returns a reference to a new LocalFile struct.
// It will parse the file's name and its directory names to extract necessary information.
//   - opath: The full path to the file.
//   - dirPaths: The full paths to the directories that may contain the file. (Library root paths)
func NewLocalFileS(opath string, dirPaths []string) *LocalFile {
	info := filesystem.SeparateFilePathS(opath, dirPaths)
	return newLocalFile(opath, info)
}

// NewLocalFile creates and returns a reference to a new LocalFile struct.
// It will parse the file's name and its directory names to extract necessary information.
//   - opath: The full path to the file.
//   - dirPath: The full path to the directory containing the file. (The library root path)
func NewLocalFile(opath, dirPath string) *LocalFile {
	info := filesystem.SeparateFilePath(opath, dirPath)
	return newLocalFile(opath, info)
}

func newLocalFile(opath string, info *filesystem.SeparatedFilePath) *LocalFile {
	// Parse filename
	fElements := habari.Parse(info.Filename)
	parsedInfo := NewLocalFileParsedData(info.Filename, fElements)

	// Parse dir names
	parsedFolderInfo := make([]*LocalFileParsedData, 0)
	for _, dirname := range info.Dirnames {
		if len(dirname) > 0 {
			pElements := habari.Parse(dirname)
			parsed := NewLocalFileParsedData(dirname, pElements)
			parsedFolderInfo = append(parsedFolderInfo, parsed)
		}
	}

	localFile := &LocalFile{
		Path:             opath,
		Name:             info.Filename,
		ParsedData:       parsedInfo,
		ParsedFolderData: parsedFolderInfo,
		Metadata: &LocalFileMetadata{
			Episodes:     nil,
			AniDBEpisode: "",
			Type:         "",
		},
		Locked:         false,
		Ignored:        false,
		LibraryMediaId: 0,
		MediaID:        0,
	}

	return localFile
}

// NewLocalFileFromModel converts a database model to a DTO.
func NewLocalFileFromModel(m *models.LocalFile) *LocalFile {
	if m == nil {
		return nil
	}

	lf := &LocalFile{
		Path:           m.Path,
		Name:           m.Name,
		FileHash:       m.FileHash,
		FileSize:       m.FileSize,
		FileModTime:    m.FileModTime,
		Locked:         m.Locked,
		Ignored:        m.Ignored,
		LibraryMediaId: m.LibraryMediaId,
		MediaID:        m.MediaID,
	}

	// Unmarshal JSON fields
	if len(m.ParsedData) > 0 {
		_ = json.Unmarshal(m.ParsedData, &lf.ParsedData)
	}
	if len(m.ParsedFolderData) > 0 {
		_ = json.Unmarshal(m.ParsedFolderData, &lf.ParsedFolderData)
	}
	if len(m.EmbeddedMetadata) > 0 {
		_ = json.Unmarshal(m.EmbeddedMetadata, &lf.EmbeddedMetadata)
	}
	if len(m.Metadata) > 0 {
		_ = json.Unmarshal(m.Metadata, &lf.Metadata)
	}
	if len(m.TechnicalInfo) > 0 {
		_ = json.Unmarshal(m.TechnicalInfo, &lf.TechnicalInfo)
	}

	return lf
}

// NewLocalFileParsedData Converts habari.Metadata into LocalFileParsedData, which is more suitable.
func NewLocalFileParsedData(original string, elements *habari.Metadata) *LocalFileParsedData {
	i := new(LocalFileParsedData)
	i.Original = original
	i.Title = elements.FormattedTitle
	i.ReleaseGroup = elements.ReleaseGroup
	i.EpisodeTitle = elements.EpisodeTitle
	i.Year = elements.Year

	if len(elements.SeasonNumber) > 0 {
		if len(elements.SeasonNumber) == 1 {
			i.Season = elements.SeasonNumber[0]
		} else {
			i.SeasonRange = elements.SeasonNumber
		}
	}

	if len(elements.EpisodeNumber) > 0 {
		if len(elements.EpisodeNumber) == 1 {
			i.Episode = elements.EpisodeNumber[0]
		} else {
			i.EpisodeRange = elements.EpisodeNumber
		}
	}

	if len(elements.PartNumber) > 0 {
		if len(elements.PartNumber) == 1 {
			i.Part = elements.PartNumber[0]
		} else {
			i.PartRange = elements.PartNumber
		}
	}

	return i
}

// GetAnitogoParsedTitle returns the parsed anime title using anitogo parser
func GetAnitogoParsedTitle(filename string) string {
	parsed := anitogoParse(filename)
	if parsed == nil {
		return ""
	}
	return parsed.AnimeTitle
}

// GetSeasonNumber parses the season number or returns 1 as default.
func (lf *LocalFile) GetSeasonNumber() int {
	// Heuristic: If Episode is extremely high (anime absolute format), the Season is likely a Sonarr/ReleaseGroup dummy wrapper.
	if lf.ParsedData != nil && lf.ParsedData.Episode != "" {
		if ep, err := strconv.Atoi(lf.ParsedData.Episode); err == nil && ep >= 100 {
			return 1 // Drop fake season
		}
	}

	if lf.ParsedData != nil && lf.ParsedData.Season != "" {
		if s, err := strconv.Atoi(lf.ParsedData.Season); err == nil {
			return s
		}
	}
	// Fallback to parsed folder data
	for _, f := range lf.ParsedFolderData {
		if f.Season != "" {
			if s, err := strconv.Atoi(f.Season); err == nil {
				return s
			}
		}
	}
	return 1
}

func anitogoParse(filename string) *anitogoElements {
	elements := anitogo.Parse(filename, anitogo.DefaultOptions)
	if elements == nil {
		return nil
	}
	return &anitogoElements{
		AnimeTitle:      elements.AnimeTitle,
		AnimeYear:       elements.AnimeYear,
		EpisodeNumber:   getFirstOrEmpty(elements.EpisodeNumber),
		ReleaseGroup:    elements.ReleaseGroup,
		VideoResolution: elements.VideoResolution,
	}
}

type anitogoElements struct {
	AnimeTitle      string
	AnimeYear       string
	EpisodeNumber   string
	ReleaseGroup    string
	VideoResolution string
}

func getFirstOrEmpty(slice []string) string {
	if len(slice) > 0 {
		return slice[0]
	}
	return ""
}
