package maintenance

import (
	"context"
	"sync/atomic"
	"testing"
	"time"

	"github.com/rs/zerolog"
)

func TestScheduler(t *testing.T) {
	logger := zerolog.Nop()
	scheduler := NewScheduler(&logger)

	var runs int32
	job := Job{
		Name:         "test-job",
		Interval:     20 * time.Millisecond,
		InitialDelay: 0,
		Run: func(ctx context.Context) {
			atomic.AddInt32(&runs, 1)
		},
	}

	scheduler.Add(job)

	ctx, cancel := context.WithCancel(context.Background())
	scheduler.Start(ctx)

	// wait enough time for the job to run at least twice
	time.Sleep(200 * time.Millisecond)
	cancel()

	// Wait a bit to ensure it actually stopped
	time.Sleep(50 * time.Millisecond)

	finalRuns := atomic.LoadInt32(&runs)
	if finalRuns < 2 {
		t.Errorf("Expected job to run at least 2 times, got %d", finalRuns)
	}

	// Wait some more to verify it stopped
	time.Sleep(50 * time.Millisecond)
	postCancelRuns := atomic.LoadInt32(&runs)
	if postCancelRuns != finalRuns {
		t.Errorf("Job continued running after cancel. Runs before: %d, after: %d", finalRuns, postCancelRuns)
	}
}

func TestScheduler_PanicRecovery(t *testing.T) {
	logger := zerolog.Nop()
	scheduler := NewScheduler(&logger)

	var runs int32
	job := Job{
		Name:         "panic-job",
		Interval:     20 * time.Millisecond,
		InitialDelay: 0,
		Run: func(ctx context.Context) {
			atomic.AddInt32(&runs, 1)
			panic("simulated panic")
		},
	}

	scheduler.Add(job)

	ctx, cancel := context.WithCancel(context.Background())
	scheduler.Start(ctx)

	time.Sleep(200 * time.Millisecond)
	cancel()

	finalRuns := atomic.LoadInt32(&runs)
	if finalRuns < 2 {
		t.Errorf("Expected job to recover from panic and run at least 2 times, got %d", finalRuns)
	}
}
