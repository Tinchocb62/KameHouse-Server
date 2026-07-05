package videofile

import (
	"context"
	"fmt"
	"kamehouse/internal/util"
	"kamehouse/internal/util/crashlog"
	"os"
	"path/filepath"

	"github.com/rs/zerolog"
)

func GetFileSubsCacheDir(outDir string, hash string) string {
	return filepath.Join(outDir, "videofiles", hash, "/subs")
}

func GetFileAttCacheDir(outDir string, hash string) string {
	return filepath.Join(outDir, "videofiles", hash, "/att")
}

func ExtractAttachment(ffmpegPath string, path string, hash string, mediaInfo *MediaInfo, cacheDir string, logger *zerolog.Logger) (err error) {
	logger.Debug().Str("hash", hash).Msgf("videofile: Starting media attachment extraction")

	attachmentPath := GetFileAttCacheDir(cacheDir, hash)
	subsPath := GetFileSubsCacheDir(cacheDir, hash)
	_ = os.MkdirAll(attachmentPath, 0755)
	_ = os.MkdirAll(subsPath, 0755)

	subsDir, err := os.ReadDir(subsPath)
	if err == nil {
		// Only count text-based subs (image-based PGS/DVB have no extracted file).
		textSubCount := 0
		for _, sub := range mediaInfo.Subtitles {
			if sub.Extension != nil && *sub.Extension != "" {
				textSubCount++
			}
		}
		if len(subsDir) == textSubCount {
			logger.Debug().Str("hash", hash).Msgf("videofile: Attachments already extracted")
			return
		}
	}
	for _, sub := range mediaInfo.Subtitles {
		// Check if it's PGS
		if sub.IsImageBased {
			if ext := sub.Extension; ext != nil && *ext != "" {
				// We'll extract them as .sup or whatever extension is provided.
				continue
			}
			continue
		}
		if sub.Extension == nil || *sub.Extension == "" {
			logger.Error().Msgf("videofile: Subtitle format is not supported")
			return fmt.Errorf("videofile: Unsupported subtitle format")
		}
	}

	// If there are no fonts and no text subtitles, there is nothing to extract
	textSubCount := 0
	for _, sub := range mediaInfo.Subtitles {
		if !sub.IsImageBased && sub.Extension != nil && *sub.Extension != "" {
			textSubCount++
		}
	}
	if len(mediaInfo.Fonts) == 0 && textSubCount == 0 {
		logger.Debug().Str("hash", hash).Msgf("videofile: No attachments or subtitles to extract")
		return nil
	}

	// Instantiate a new crash logger
	crashLogger := crashlog.GlobalCrashLogger.InitArea("ffmpeg")
	defer crashLogger.Close()

	crashLogger.LogInfof("Extracting attachments from %s", path)

	// DEVNOTE: All paths fed into this command should be absolute
	args := []string{"-y"}

	// Fonts are dumped individually to avoid empty string / directory path issues on Windows.
	for i, fontName := range mediaInfo.Fonts {
		if fontName == "" {
			fontName = fmt.Sprintf("font_%d.ttf", i)
		}
		args = append(args, fmt.Sprintf("-dump_attachment:t:%d", i), filepath.Join(attachmentPath, fontName))
	}
	
	args = append(args, "-i", path)

	cmd := util.NewCmdCtx(
		context.Background(),
		ffmpegPath,
		args...
	)
	// The working directory for the command is the attachment directory
	cmd.Dir = attachmentPath

	for _, sub := range mediaInfo.Subtitles {
		// Skip image-based subs that are not PGS or have no extension.
		if sub.IsImageBased {
			if ext := sub.Extension; ext != nil && *ext == "sup" {
				cmd.Args = append(
					cmd.Args,
					"-map", fmt.Sprintf("0:s:%d", sub.Index),
					"-c:s", "copy",
					fmt.Sprintf("%s/%d.sup", subsPath, sub.Index),
				)
			}
			continue
		}
		if ext := sub.Extension; ext != nil {
			cmd.Args = append(
				cmd.Args,
				"-map", fmt.Sprintf("0:s:%d", sub.Index),
				"-c:s", "copy",
				fmt.Sprintf("%s/%d.%s", subsPath, sub.Index, *ext),
			)
		}
	}

	// If we are only extracting fonts (no text subtitles), we still need to provide
	// an output format for ffmpeg to not complain
	if textSubCount == 0 {
		// Just copy video/audio to a null muxer to satisfy ffmpeg output requirement
		cmd.Args = append(cmd.Args, "-f", "null", "-")
	}

	cmd.Stdout = crashLogger.Stdout()
	cmd.Stderr = crashLogger.Stdout()
	err = cmd.Run()
	if err != nil {
		logger.Error().Err(err).Msgf("videofile: Error starting FFmpeg")
		crashlog.GlobalCrashLogger.WriteAreaLogToFile(crashLogger)
	}

	return err
}
