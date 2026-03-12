package transcoder

import (
	"bufio"
	"context"
	"fmt"
	"os/exec"
	"strings"

	"github.com/rs/zerolog"
)

// FFmpegProcess manages the lifecycle of an FFmpeg execution, ensuring no zombie processes.
type FFmpegProcess struct {
	logger *zerolog.Logger
}

// NewFFmpegProcess initializes a pure process manager.
func NewFFmpegProcess(logger *zerolog.Logger) *FFmpegProcess {
	return &FFmpegProcess{logger: logger}
}

// StartTranscode begins an FFmpeg process asynchronously. It is bound to the provided context,
// meaning cancellation will strictly terminate the subprocess (preventing resource leaks).
func (p *FFmpegProcess) StartTranscode(ctx context.Context, args []string) error {
	cmd := exec.CommandContext(ctx, "ffmpeg", args...)

	stderr, err := cmd.StderrPipe()
	if err != nil {
		return fmt.Errorf("failed creating stderr pipe: %w", err)
	}

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("ffmpeg failed to start: %w", err)
	}

	// Async logger scanning line-by-line without buffering the whole output
	go func() {
		scanner := bufio.NewScanner(stderr)
		for scanner.Scan() {
			line := scanner.Text()
			if strings.Contains(line, "Error") || strings.Contains(line, "frame=") {
				p.logger.Debug().Msgf("ffmpeg: %s", line)
			}
		}
	}()

	// Lifecycle monitor: wait on completion or context cancellation to reap the zombie
	go func() {
		err := cmd.Wait()
		if err != nil && ctx.Err() == nil {
			p.logger.Warn().Err(err).Msg("ffmpeg exited unexpectedly")
		} else {
			p.logger.Info().Msg("ffmpeg transcode finished or cancelled cleanly")
		}
	}()

	return nil
}
