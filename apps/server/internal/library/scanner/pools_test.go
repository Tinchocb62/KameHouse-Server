package scanner

import (
	"context"
	"sync/atomic"
	"testing"
)

// TestWorkerPool verifies that the WorkerPool:
//  1. Executes every submitted task exactly once.
//  2. Is safe for concurrent use (verified via -race flag).
//  3. Respects context cancellation without deadlocking.
func TestWorkerPool(t *testing.T) {
	t.Run("all tasks executed", func(t *testing.T) {
		const total = 200
		var counter atomic.Int64

		pool := NewWorkerPool(context.Background(), 4)
		for i := 0; i < total; i++ {
			pool.Submit(func(_ context.Context) {
				counter.Add(1)
			})
		}
		pool.Wait()

		if got := counter.Load(); got != total {
			t.Errorf("expected %d tasks executed, got %d", total, got)
		}
	})

	t.Run("context cancellation does not deadlock", func(t *testing.T) {
		ctx, cancel := context.WithCancel(context.Background())
		cancel() // cancel immediately before submitting

		pool := NewWorkerPool(ctx, 4)
		for i := 0; i < 50; i++ {
			pool.Submit(func(_ context.Context) {
				// tasks submitted after cancellation should be drained, not blocked
			})
		}
		pool.Wait() // must return promptly
	})

	t.Run("default worker clamp [4,16]", func(t *testing.T) {
		if defaultWorkers(-1) < 4 {
			t.Error("expected at least 4 workers for n=-1")
		}
		if defaultWorkers(0) < 4 {
			t.Error("expected at least 4 workers for n=0")
		}
		if defaultWorkers(1000) > 16 {
			t.Error("expected at most 16 workers for n=1000")
		}
	})
}
