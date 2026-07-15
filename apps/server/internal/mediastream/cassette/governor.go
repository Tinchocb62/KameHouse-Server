package cassette

import (
	"context"
	"runtime"
	"strconv"
	"sync"
	"sync/atomic"
	"time"

	"github.com/rs/zerolog"
)

// Governor throttles concurrent ffmpeg processes
type Governor struct {
	sem      chan struct{}
	nvencSem chan struct{}
	active   atomic.Int32
	maxSlot  int
	nvencCap int
	logger   *zerolog.Logger

	mu    sync.Mutex
	stats GovernorStats
}

// GovernorStats contains runtime metrics
type GovernorStats struct {
	ActiveProcesses int32         `json:"activeProcesses"`
	MaxConcurrency  int           `json:"maxConcurrency"`
	ActiveNVENC     int32         `json:"activeNvenc"`
	NVENCCap        int           `json:"nvencCap"`
	TotalLaunched   int64         `json:"totalLaunched"`
	TotalCompleted  int64         `json:"totalCompleted"`
	TotalWaitTime   time.Duration `json:"totalWaitTime"`
}

// nvencCapFromEnv returns the configured NVENC limit
func nvencCapFromEnv() int {
	val := getEnvOr("KAMEHOUSE_NVENC_SESSIONS", "2")
	parsed, err := strconv.Atoi(val)
	if err != nil || parsed < 1 {
		return 2
	}
	return parsed
}

// NewGovernor creates a governor with max concurrency
func NewGovernor(maxConcurrency int, hwAccelEnabled bool, logger *zerolog.Logger) *Governor {
	if maxConcurrency <= 0 {
		if hwAccelEnabled {
			maxConcurrency = max(runtime.NumCPU(), 6) // lowered default to not overcommit CPU when spilling
		} else {
			maxConcurrency = max(runtime.NumCPU(), 1)
		}
	}
	
	nvencCap := nvencCapFromEnv()

	gov := &Governor{
		sem:      make(chan struct{}, maxConcurrency),
		nvencSem: make(chan struct{}, nvencCap),
		maxSlot:  maxConcurrency,
		nvencCap: nvencCap,
		logger:   logger,
	}
	gov.stats.MaxConcurrency = maxConcurrency
	gov.stats.NVENCCap = nvencCap
	return gov
}

// TryAcquireNVENC attempts to grab an NVENC slot.
// Returns a release function and true if acquired.
// reserve=0: takes any available slot.
// reserve=1: leaves at least 1 slot free for interactive heads.
// Note: reading ActiveNVENC outside the select channel operation creates a brief
// benign race condition where a speculative head might grab a slot that was just
// about to be needed. This is acceptable as a best-effort reservation.
func (g *Governor) TryAcquireNVENC(reserve int) (func(), bool) {
	g.mu.Lock()
	active := g.stats.ActiveNVENC
	g.mu.Unlock()

	// If we need to reserve a slot for interactive usage, and we'd consume the last one:
	if reserve > 0 && int(active)+reserve >= g.nvencCap {
		return nil, false
	}

	select {
	case g.nvencSem <- struct{}{}:
		g.mu.Lock()
		g.stats.ActiveNVENC++
		g.mu.Unlock()
		return func() {
			g.mu.Lock()
			g.stats.ActiveNVENC--
			g.mu.Unlock()
			<-g.nvencSem
		}, true
	default:
		return nil, false
	}
}

// Acquire blocks until a slot is available
func (g *Governor) Acquire(ctx context.Context) (release func(), err error) {
	start := time.Now()

	select {
	case g.sem <- struct{}{}:
	case <-ctx.Done():
		return nil, ctx.Err()
	}

	waited := time.Since(start)
	n := g.active.Add(1)

	g.mu.Lock()
	g.stats.TotalLaunched++
	g.stats.TotalWaitTime += waited
	g.stats.ActiveProcesses = n
	g.stats.MaxConcurrency = g.maxSlot
	g.stats.NVENCCap = g.nvencCap
	g.mu.Unlock()

	if waited > 50*time.Millisecond {
		g.logger.Debug().
			Dur("waited", waited).
			Int32("active", n).
			Msg("cassette/governor: slot acquired after wait")
	}

	return func() {
		remaining := g.active.Add(-1)
		g.mu.Lock()
		g.stats.TotalCompleted++
		g.stats.ActiveProcesses = remaining
		g.mu.Unlock()
		<-g.sem
	}, nil
}

// Stats returns the governor metrics
func (g *Governor) Stats() GovernorStats {
	g.mu.Lock()
	defer g.mu.Unlock()
	return g.stats
}
