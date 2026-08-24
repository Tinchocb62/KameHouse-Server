package scanner

import (
	"context"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"kamehouse/internal/database/models/dto"
	"kamehouse/internal/library/parser"
	"kamehouse/internal/mkvparser"

	"github.com/rs/zerolog"
)

var (
	embeddedEpisodeFromTitle = regexp.MustCompile(`(?i)(?:^|[\s._-])s(\d{1,2})e(\d{1,4})\b|\s+-\s+0*(\d{1,4})(?:v\d+)?(?:\D|$)`)
	embeddedInteger          = regexp.MustCompile(`\d+`)
)

func ingestLocalFileEmbeddedMetadata(ctx context.Context, lf *dto.LocalFile, logger *zerolog.Logger) {
	if lf == nil {
		return
	}

	identity, ok := readEmbeddedMediaIdentity(ctx, lf.Path, lf, logger)
	if !ok {
		return
	}

	applyEmbeddedMediaIdentity(lf, identity)
}

func readEmbeddedMediaIdentity(ctx context.Context, path string, lf *dto.LocalFile, logger *zerolog.Logger) (*dto.LocalFileEmbeddedMetadata, bool) {
	if !isMatroskaPath(path) {
		return nil, false
	}

	file, err := os.Open(path)
	if err != nil {
		logEmbeddedMetadataDebug(logger, path, err.Error())
		return nil, false
	}
	defer file.Close()

	if _, ok := mkvparser.ReadIsMkvOrWebm(file); !ok {
		return nil, false
	}

	metadataParser := mkvparser.NewMetadataParser(file, loggerOrNop(logger))
	metadata := metadataParser.GetMetadata(ctx)
	if metadata == nil || metadata.Error != nil {
		if metadata != nil && metadata.Error != nil {
			logEmbeddedMetadataDebug(logger, path, metadata.Error.Error())
		}
		return nil, false
	}

	if lf.TechnicalInfo == nil {
		lf.TechnicalInfo = &dto.FileTechnicalInfo{}
	}

	lf.TechnicalInfo.Duration = time.Duration(metadata.Duration * float64(time.Second))
	lf.TechnicalInfo.Size = lf.FileSize
	lf.TechnicalInfo.Format = "Matroska / WebM"

	if len(metadata.VideoTracks) > 0 {
		vTrack := metadata.VideoTracks[0]
		w, h := 0, 0
		if vTrack.Video != nil {
			w = int(vTrack.Video.PixelWidth)
			h = int(vTrack.Video.PixelHeight)
		}
		lf.TechnicalInfo.VideoStream = &dto.VideoStreamInfo{
			Codec:  vTrack.CodecID,
			Width:  w,
			Height: h,
		}
	}

	for _, track := range metadata.AudioTracks {
		lf.TechnicalInfo.AudioStreams = append(lf.TechnicalInfo.AudioStreams, &dto.AudioStreamInfo{
			Codec:    track.CodecID,
			Language: track.Language,
			Title:    track.Name,
		})
	}
	for _, track := range metadata.SubtitleTracks {
		lf.TechnicalInfo.SubtitleStreams = append(lf.TechnicalInfo.SubtitleStreams, &dto.AudioStreamInfo{
			Codec:    track.CodecID,
			Language: track.Language,
			Title:    track.Name,
		})
	}

	title := firstTagValue(metadata.Tags,
		"TITLE",
		"SERIES_TITLE",
		"SHOW_TITLE",
		"TVSHOW",
		"TV_SHOW",
	)
	if title == "" {
		title = metadata.Title
	}

	season, hasSeason := firstTagInt(metadata.Tags,
		"SEASON",
		"SEASON_NUMBER",
		"SEASONNUMBER",
	)
	episode, hasEpisode := firstTagInt(metadata.Tags,
		"EPISODE",
		"EPISODE_NUMBER",
		"EPISODENUMBER",
		"PART_NUMBER",
		"PARTNUMBER",
		"TRACKNUMBER",
		"TRACK_NUMBER",
	)

	cleanTitle := ""
	if title != "" {
		parsedTitle := parser.Parse(title)
		cleanTitle = parsedTitle.Title
		if !hasSeason && parsedTitle.Season > 0 && hasEpisodeMarker(title) {
			season = parsedTitle.Season
			hasSeason = true
		}
		if !hasEpisode && parsedTitle.Episode > 0 && hasEpisodeMarker(title) {
			episode = parsedTitle.Episode
			hasEpisode = true
		}
	}

	if cleanTitle == "" && !hasSeason && !hasEpisode {
		return nil, false
	}

	identity := &dto.LocalFileEmbeddedMetadata{
		Title:  cleanTitle,
		Source: "mkv",
	}
	if hasSeason {
		identity.Season = &season
	}
	if hasEpisode {
		identity.Episode = &episode
	}
	return identity, true
}

func isGenericOrNumericTitle(t string) bool {
	clean := strings.ToLower(strings.TrimSpace(t))
	if clean == "" {
		return true
	}
	if _, err := strconv.Atoi(clean); err == nil {
		return true
	}
	if IsSeasonOrSagaFolderName(clean) {
		return true
	}
	return false
}

func applyEmbeddedMediaIdentity(lf *dto.LocalFile, identity *dto.LocalFileEmbeddedMetadata) {
	if lf == nil || identity == nil {
		return
	}
	if lf.ParsedData == nil {
		lf.ParsedData = &dto.LocalFileParsedData{Original: filepath.Base(lf.Path)}
	}
	// Only override Title if current parsed title is empty or generic
	if identity.Title != "" && (lf.ParsedData.Title == "" || isGenericOrNumericTitle(lf.ParsedData.Title)) {
		lf.ParsedData.Title = identity.Title
	}
	if identity.Season != nil && (lf.ParsedData.Season == "" || lf.ParsedData.Season == "0" || lf.ParsedData.Season == "1") {
		lf.ParsedData.Season = strconv.Itoa(*identity.Season)
	}
	if identity.Episode != nil && (lf.ParsedData.Episode == "" || lf.ParsedData.Episode == "0") {
		lf.ParsedData.Episode = strconv.Itoa(*identity.Episode)
		if lf.Metadata != nil {
			lf.Metadata.Episodes = []int{*identity.Episode}
		}
	}
	lf.EmbeddedMetadata = identity
}

func parsedMediaFromLocalFile(lf *dto.LocalFile) parser.ParsedMedia {
	if lf == nil {
		return parser.ParsedMedia{Season: 1, Episodes: []int{1}, Resolution: "UNKNOWN"}
	}

	name := lf.Name
	if name == "" {
		name = filepath.Base(lf.Path)
	}
	pm := parser.Parse(filepath.Base(name))

	// If parsed media only has episode number or a generic/numeric title, resolve series name from folder
	if pm.IsEpisodeOnly || isGenericOrNumericTitle(pm.Title) {
		if seriesTitle := lf.GetSeriesFolderTitle(); seriesTitle != "" {
			pm.Title = seriesTitle
		} else if folderTitle := lf.GetFolderTitle(); folderTitle != "" && !isGenericOrNumericTitle(folderTitle) {
			pm.Title = folderTitle
		}
	} else if parsedTitle := lf.GetParsedTitle(); parsedTitle != "" {
		pm.Title = parsedTitle
	}

	// Propagate season from folder if file does not specify an explicit season > 1
	if pm.Season <= 1 {
		if folderSeason := lf.GetSeasonNumber(); folderSeason > 0 {
			pm.Season = folderSeason
		}
	}

	// Embedded metadata overrides only if title is empty or generic
	if lf.EmbeddedMetadata != nil {
		if lf.EmbeddedMetadata.Title != "" && (pm.Title == "" || isGenericOrNumericTitle(pm.Title)) {
			pm.Title = lf.EmbeddedMetadata.Title
		}
		if lf.EmbeddedMetadata.Season != nil && pm.Season <= 1 {
			pm.Season = *lf.EmbeddedMetadata.Season
		}
		if lf.EmbeddedMetadata.Episode != nil && (len(pm.Episodes) == 0 || (len(pm.Episodes) == 1 && pm.Episodes[0] <= 1 && pm.IsEpisodeOnly)) {
			pm.Episodes = []int{*lf.EmbeddedMetadata.Episode}
		}
	}

	return pm
}

func firstTagValue(tags map[string][]string, names ...string) string {
	for _, name := range names {
		values := tags[normalizeTagName(name)]
		for _, value := range values {
			if trimmed := strings.TrimSpace(value); trimmed != "" {
				return trimmed
			}
		}
	}
	return ""
}

func firstTagInt(tags map[string][]string, names ...string) (int, bool) {
	for _, name := range names {
		values := tags[normalizeTagName(name)]
		for _, value := range values {
			if parsed, ok := parseFirstInt(value); ok {
				return parsed, true
			}
		}
	}
	return 0, false
}

func parseFirstInt(input string) (int, bool) {
	match := embeddedInteger.FindString(input)
	if match == "" {
		return 0, false
	}
	parsed, err := strconv.Atoi(match)
	return parsed, err == nil
}

func normalizeTagName(name string) string {
	name = strings.ToUpper(strings.TrimSpace(name))
	return strings.NewReplacer(" ", "_", "-", "_").Replace(name)
}

func hasEpisodeMarker(input string) bool {
	return embeddedEpisodeFromTitle.MatchString(input)
}

func isMatroskaPath(path string) bool {
	ext := strings.ToLower(filepath.Ext(path))
	return ext == ".mkv" || ext == ".mk3d" || ext == ".mka" || ext == ".webm"
}

func loggerOrNop(logger *zerolog.Logger) *zerolog.Logger {
	if logger != nil {
		return logger
	}
	nop := zerolog.Nop()
	return &nop
}

func logEmbeddedMetadataDebug(logger *zerolog.Logger, path string, reason string) {
	if logger == nil {
		return
	}
	logger.Debug().
		Str("path", path).
		Str("reason", reason).
		Msg("scanner: embedded MKV metadata unavailable")
}
