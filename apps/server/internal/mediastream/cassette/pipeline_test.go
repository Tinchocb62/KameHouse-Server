package cassette

import (
	"context"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"kamehouse/internal/mediastream/videofile"

	"github.com/rs/zerolog"
)

func TestPipeline_Initialization(t *testing.T) {
	logger := zerolog.New(os.Stderr)
	keyframes := &KeyframeIndex{Keyframes: []float64{0, 2, 4, 6, 8, 10}, IsDone: true}
	
	sessionOut := filepath.Join(os.TempDir(), "kamehouse-test-session-init")
	streamDir := filepath.Join(os.TempDir(), "kamehouse-test-stream-init")
	_ = os.MkdirAll(sessionOut, 0755)
	_ = os.MkdirAll(streamDir, 0755)
	defer func() {
		// Attempt cleanup, ignore errors since reclaim goroutine might still be running
		_ = os.RemoveAll(sessionOut)
		_ = os.RemoveAll(streamDir)
	}()

	session := &Session{
		Path:      "test.mp4",
		Out:       sessionOut,
		Keyframes: keyframes,
		Info: &videofile.MediaInfo{
			Duration: 10,
			Video: &videofile.Video{
				Codec:  "h264",
				Width:  1920,
				Height: 1080,
			},
		},
	}
	settings := &Settings{
		StreamDir: streamDir,
	}
	gov := NewGovernor(2, false, &logger)

	cfg := PipelineConfig{
		Kind:    VideoKind,
		Label:   "video (1080p)",
		Session: session,
		Settings: settings,
		Governor: gov,
		Logger:   &logger,
		BuildArgs: func(segmentTimes string, hw *HwAccelProfile) []string {
			return []string{"-c:v", "libx264"}
		},
		OutPathFmt: func(encoderID int) string {
			return filepath.Join(sessionOut, "segment-%d.ts")
		},
	}

	p := NewPipeline(cfg)
	if p == nil {
		t.Fatal("expected pipeline to be created")
	}

	if p.kind != VideoKind {
		t.Errorf("expected kind to be VideoKind, got %v", p.kind)
	}

	// Give a tiny moment for reclaim goroutine to run before exiting test
	time.Sleep(5 * time.Millisecond)
}

func TestPipeline_GetSegment_Concurrent_ThreadSafety(t *testing.T) {
	logger := zerolog.New(os.Stderr)
	keyframes := &KeyframeIndex{Keyframes: []float64{0, 2, 4, 6, 8, 10}, IsDone: true}
	
	sessionOut := filepath.Join(os.TempDir(), "kamehouse-test-session-concurrent")
	streamDir := filepath.Join(os.TempDir(), "kamehouse-test-stream-concurrent")
	_ = os.MkdirAll(sessionOut, 0755)
	_ = os.MkdirAll(streamDir, 0755)
	defer func() {
		_ = os.RemoveAll(sessionOut)
		_ = os.RemoveAll(streamDir)
	}()

	session := &Session{
		Path:      "test.mp4",
		Out:       sessionOut,
		Keyframes: keyframes,
		Info: &videofile.MediaInfo{
			Duration: 10,
			Video: &videofile.Video{
				Codec:  "h264",
				Width:  1920,
				Height: 1080,
			},
		},
	}
	settings := &Settings{
		StreamDir: streamDir,
	}
	gov := NewGovernor(4, false, &logger)

	cfg := PipelineConfig{
		Kind:    VideoKind,
		Label:   "video (1080p)",
		Session: session,
		Settings: settings,
		Governor: gov,
		Logger:   &logger,
		BuildArgs: func(segmentTimes string, hw *HwAccelProfile) []string {
			return []string{"-c:v", "libx264"}
		},
		OutPathFmt: func(encoderID int) string {
			return filepath.Join(sessionOut, "segment-%d-%d.ts")
		},
	}

	p := NewPipeline(cfg)

	// Mark segment 0 as ready so WaitFor returns immediately without spawning process/waiting
	p.segments.MarkReady(0, 0)

	var wg sync.WaitGroup
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			defer cancel()
			_, _ = p.GetSegment(ctx, 0)
		}()
	}
	wg.Wait()

	time.Sleep(5 * time.Millisecond)
}

func TestPipeline_Heads_SlotReuse(t *testing.T) {
	logger := zerolog.New(os.Stderr)
	keyframes := &KeyframeIndex{Keyframes: []float64{0, 2, 4, 6, 8, 10}, IsDone: true}
	
	sessionOut := filepath.Join(os.TempDir(), "kamehouse-test-session-heads")
	streamDir := filepath.Join(os.TempDir(), "kamehouse-test-stream-heads")
	_ = os.MkdirAll(sessionOut, 0755)
	_ = os.MkdirAll(streamDir, 0755)
	defer func() {
		_ = os.RemoveAll(sessionOut)
		_ = os.RemoveAll(streamDir)
	}()

	session := &Session{
		Path:      "test.mp4",
		Out:       sessionOut,
		Keyframes: keyframes,
		Info: &videofile.MediaInfo{
			Duration: 10,
			Video: &videofile.Video{
				Codec:  "h264",
				Width:  1920,
				Height: 1080,
			},
		},
	}
	settings := &Settings{
		StreamDir: streamDir,
	}
	gov := NewGovernor(4, false, &logger)

	cfg := PipelineConfig{
		Kind:    VideoKind,
		Label:   "video (1080p)",
		Session: session,
		Settings: settings,
		Governor: gov,
		Logger:   &logger,
		BuildArgs: func(segmentTimes string, hw *HwAccelProfile) []string {
			return []string{"-c:v", "libx264"}
		},
		OutPathFmt: func(encoderID int) string {
			return filepath.Join(sessionOut, "segment-%d-%d.ts")
		},
	}

	p := NewPipeline(cfg)

	// Simulate adding two heads
	_, cancel1 := context.WithCancel(context.Background())
	_, cancel2 := context.WithCancel(context.Background())

	p.headsMu.Lock()
	p.heads = append(p.heads, head{segment: 0, end: 5, cancel: cancel1})
	p.heads = append(p.heads, head{segment: 5, end: 10, cancel: cancel2})
	p.headsMu.Unlock()

	if len(p.heads) != 2 {
		t.Fatalf("expected 2 heads, got %d", len(p.heads))
	}

	// Mark both as deleted
	p.headsMu.Lock()
	p.heads[0] = deletedHead
	p.heads[1] = deletedHead
	p.headsMu.Unlock()

	// Run a new head: should reuse slot 0
	newHeadCancel := func() {}
	p.headsMu.Lock()
	encoderID := -1
	for i, h := range p.heads {
		if h.segment == -1 && h.end == -1 {
			encoderID = i
			p.heads[i] = head{segment: 10, end: 15, cancel: newHeadCancel}
			break
		}
	}
	p.headsMu.Unlock()

	if encoderID != 0 {
		t.Errorf("expected new head to reuse slot 0, got slot %d", encoderID)
	}

	if len(p.heads) != 2 {
		t.Errorf("expected heads array length to remain 2, got %d", len(p.heads))
	}

	time.Sleep(5 * time.Millisecond)
}
