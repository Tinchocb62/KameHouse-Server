package maintenance

import (
	"context"
	"kamehouse/internal/util"
	"math/rand"
	"time"

	"github.com/rs/zerolog"
)

type Job struct {
	Name         string
	Interval     time.Duration
	InitialDelay time.Duration
	Run          func(ctx context.Context)
}

type Scheduler struct {
	logger *zerolog.Logger
	jobs   []Job
}

func NewScheduler(logger *zerolog.Logger) *Scheduler {
	return &Scheduler{
		logger: logger,
		jobs:   []Job{},
	}
}

func (s *Scheduler) Add(job Job) {
	s.jobs = append(s.jobs, job)
}

func (s *Scheduler) Start(ctx context.Context) {
	s.logger.Info().Int("jobs", len(s.jobs)).Msg("maintenance: Starting scheduler")

	for _, job := range s.jobs {
		j := job // capture
		go func(j Job) {
			// Random jitter up to 10% of interval
			var jitter time.Duration
			if n := int64(j.Interval) / 10; n > 0 {
				jitter = time.Duration(rand.Int63n(n))
			}
			totalDelay := j.InitialDelay + jitter

			timer := time.NewTimer(totalDelay)
			select {
			case <-ctx.Done():
				timer.Stop()
				return
			case <-timer.C:
			}

			s.runJob(ctx, j)

			ticker := time.NewTicker(j.Interval)
			defer ticker.Stop()

			for {
				select {
				case <-ctx.Done():
					return
				case <-ticker.C:
					s.runJob(ctx, j)
				}
			}
		}(j)
	}
}

func (s *Scheduler) runJob(ctx context.Context, job Job) {
	defer util.RecoverInModule("maintenance/" + job.Name)
	
	start := time.Now()
	s.logger.Debug().Str("job", job.Name).Msg("maintenance: Running job")

	job.Run(ctx)
	
	s.logger.Debug().Str("job", job.Name).Dur("took", time.Since(start)).Msg("maintenance: Job completed")
}
