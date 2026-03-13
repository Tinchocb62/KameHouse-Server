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
// meaning cancellation will strictly terminate the subprocess and its entire process group,
// preventing resource leaks and zombie processes.
func (p *FFmpegProcess) StartTranscode(ctx context.Context, args []string) error {
	cmd := exec.CommandContext(ctx, "ffmpeg", args...)

	// Assign the process to its own process group so that SIGKILL can target
	// the entire tree (ffmpeg may spawn worker sub-processes).
	setPgid(cmd)

	stderr, err := cmd.StderrPipe()
	if err != nil {
		return fmt.Errorf("failed creating stderr pipe: %w", err)
	}

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("ffmpeg failed to start: %w", err)
	}

	p.logger.Info().Int("pid", cmd.Process.Pid).Msg("ffmpeg: process started")

	// Async logger: scan stderr line-by-line without buffering the whole output.
	go func() {
		scanner := bufio.NewScanner(stderr)
		for scanner.Scan() {
			line := scanner.Text()
			if strings.Contains(line, "Error") || strings.Contains(line, "frame=") {
				p.logger.Debug().Msgf("ffmpeg: %s", line)
			}
		}
	}()

	// Lifecycle monitor: watches for context cancellation and reaps the process.
	go func() {
		waitDone := make(chan error, 1)

		// Wait for FFmpeg in a nested goroutine so that we can also react to
		// context cancellation while the process is still running.
		go func() {
			waitDone <- cmd.Wait()
		}()

		select {
		case err := <-waitDone:
			// Process finished on its own — log the result.
			if err != nil && ctx.Err() == nil {
				p.logger.Warn().Err(err).Msg("ffmpeg: exited unexpectedly")
			} else {
				p.logger.Info().Msg("ffmpeg: transcode finished cleanly")
			}

		case <-ctx.Done():
			// Context was cancelled (client disconnect, explicit stop, or timeout).
			// Kill the entire process group so no orphan children are left behind.
			p.logger.Warn().Int("pid", cmd.Process.Pid).Msg("ffmpeg: context cancelled — terminating process group")
			killProcessGroup(cmd)

			// Drain waitDone to reap the zombie after the kill.
			<-waitDone
			p.logger.Info().Msg("ffmpeg: process group terminated and reaped")
		}
	}()

	return nil
}
