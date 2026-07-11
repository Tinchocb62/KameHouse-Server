package cassette

import (
	"kamehouse/internal/util"
	"time"

	"github.com/rs/zerolog"
)

// ClientInfo represents a snapshot of client consumption
type ClientInfo struct {
	Client  string
	Path    string
	Quality *Quality
	Audio   int32 // -1 means "unchanged / not set".
	Head    int32 // -1 means "unchanged / not set".
}

// ClientTracker monitors client activity and cleans up idle resources
type ClientTracker struct {
	clients   map[string]ClientInfo
	visitDate map[string]time.Time
	lastUsage map[string]time.Time

	// qualityActive and audioActive track the last time a segment was requested
	qualityActive map[string]map[Quality]time.Time // path -> quality -> last used
	audioActive   map[string]map[int32]time.Time   // path -> audio  -> last used

	cassette      *Cassette
	deletedStream chan string
	removeChan    chan string
	logger        *zerolog.Logger
	killCh        chan struct{}
}

// NewClientTracker creates and starts a client tracker
func NewClientTracker(c *Cassette) *ClientTracker {
	t := &ClientTracker{
		clients:       make(map[string]ClientInfo),
		visitDate:     make(map[string]time.Time),
		lastUsage:     make(map[string]time.Time),
		qualityActive: make(map[string]map[Quality]time.Time),
		audioActive:   make(map[string]map[int32]time.Time),
		cassette:      c,
		deletedStream: make(chan string, 256),
		removeChan:    make(chan string, 256),
		logger:        c.logger,
		killCh:        make(chan struct{}),
	}
	go t.run()
	return t
}

// Stop shuts down the tracker
func (t *ClientTracker) Stop() {
	select {
	case <-t.killCh:
	default:
		close(t.killCh)
	}
}

// RemoveClient deletes a client and triggers immediate reaping if necessary
func (t *ClientTracker) RemoveClient(client string) {
	select {
	case t.removeChan <- client:
	default:
		t.logger.Warn().Str("client", client).Msg("cassette: client removal channel full")
	}
}

func (t *ClientTracker) handleRemoveClient(client string) {
	if info, ok := t.clients[client]; ok {
		delete(t.clients, client)
		delete(t.visitDate, client)
		
		if !t.killSessionIfDead(info.Path) {
			t.killOrphanedHeads(info.Path, info.Quality, info.Audio)
		}
	}
}

// ---------------------------------------------------------------------------
// Event loop
// ---------------------------------------------------------------------------

func (t *ClientTracker) run() {
	const (
		inactiveTimeout      = 1 * time.Hour
		pipelineIdleTimeout  = 60 * time.Second
		pipelineTickInterval = 5 * time.Second
	)

	sessionTicker := time.NewTicker(inactiveTimeout)
	pipelineTicker := time.NewTicker(pipelineTickInterval)
	defer sessionTicker.Stop()
	defer pipelineTicker.Stop()

	for {
		select {
		case <-t.killCh:
			return

		case info, ok := <-t.cassette.clientChan:
			if !ok {
				return
			}
			t.handleClientUpdate(info)

		case <-sessionTicker.C:
			t.purgeInactive(inactiveTimeout)

		case <-pipelineTicker.C:
			t.purgeIdlePipelines(pipelineIdleTimeout)

		case path := <-t.deletedStream:
			t.maybeDestroySession(path)

		case client := <-t.removeChan:
			t.handleRemoveClient(client)
		}
	}
}

func (t *ClientTracker) handleClientUpdate(info ClientInfo) {
	old, exists := t.clients[info.Client]

	// merge partial updates
	if exists && old.Path == info.Path {
		if info.Quality == nil {
			info.Quality = old.Quality
		}
		if info.Audio == -1 {
			info.Audio = old.Audio
		}
		if info.Head == -1 {
			info.Head = old.Head
		}
	}
	t.clients[info.Client] = info
	t.visitDate[info.Client] = time.Now()
	t.lastUsage[info.Path] = time.Now()

	// record the last-active timestamp for the quality and audio track
	if info.Quality != nil {
		if t.qualityActive[info.Path] == nil {
			t.qualityActive[info.Path] = make(map[Quality]time.Time)
		}
		t.qualityActive[info.Path][*info.Quality] = time.Now()
	}
	if info.Audio >= 0 {
		if t.audioActive[info.Path] == nil {
			t.audioActive[info.Path] = make(map[int32]time.Time)
		}
		t.audioActive[info.Path][info.Audio] = time.Now()
	}

	if !exists {
		return
	}
	if old.Path != info.Path {
		t.killSessionIfDead(old.Path)
		return
	}
	// kill orphaned heads when playhead jumps far
	if old.Head != -1 && util.Abs32(info.Head-old.Head) > 100 {
		t.killOrphanedHeads(old.Path, old.Quality, old.Audio)
	}
}

func (t *ClientTracker) purgeInactive(timeout time.Duration) {
	for client, date := range t.visitDate {
		if time.Since(date) < timeout {
			continue
		}
		info := t.clients[client]
		if !t.killSessionIfDead(info.Path) {
			t.killOrphanedHeads(info.Path, info.Quality, info.Audio)
		}
		delete(t.clients, client)
		delete(t.visitDate, client)
	}
}

// purgeIdlePipelines kills pipelines whose last request is older than timeout
func (t *ClientTracker) purgeIdlePipelines(timeout time.Duration) {
	for path, qualities := range t.qualityActive {
		for q, lastUsed := range qualities {
			if time.Since(lastUsed) < timeout {
				continue
			}
			if t.killQualityIfDead(path, q) {
				delete(qualities, q)
			}
		}
		if len(qualities) == 0 {
			delete(t.qualityActive, path)
		}
	}
	for path, audios := range t.audioActive {
		for audio, lastUsed := range audios {
			if time.Since(lastUsed) < timeout {
				continue
			}
			if t.killAudioIfDead(path, audio) {
				delete(audios, audio)
			}
		}
		if len(audios) == 0 {
			delete(t.audioActive, path)
		}
	}
}

// session / pipeline reaping

func (t *ClientTracker) killSessionIfDead(path string) bool {
	for _, c := range t.clients {
		if c.Path == path {
			return false
		}
	}
	t.logger.Trace().Str("path", path).Msg("cassette: reaping idle session")
	s := t.cassette.getSessionByPath(path)
	if s == nil {
		return false
	}
	s.Kill()

	// Schedule full destruction after a short cooldown (reduced from 4 hours to 5 minutes)
	go func() {
		timer := time.NewTimer(5 * time.Minute)
		defer timer.Stop()
		select {
		case <-t.killCh:
			return
		case <-timer.C:
			t.deletedStream <- path
		}
	}()
	return true
}

func (t *ClientTracker) maybeDestroySession(path string) {
	if time.Since(t.lastUsage[path]) < 5*time.Minute {
		return
	}
	t.cassette.destroySession(path)
}

func (t *ClientTracker) killAudioIfDead(path string, audio int32) bool {
	for _, c := range t.clients {
		if c.Path == path && c.Audio == audio {
			return false
		}
	}
	t.logger.Trace().Int32("audio", audio).Str("path", path).Msg("cassette: reaping idle audio pipeline")
	s := t.cassette.getSessionByPath(path)
	if s == nil {
		return false
	}
	// Remove from the map under the lock, but run the (blocking) Kill OUTSIDE it:
	// Pipeline.Kill waits for ffmpeg processes to fully exit, which can be slow on
	// Windows. Holding audiosMu across that wait stalls every other audio pipeline
	// access for this file until teardown completes.
	s.audiosMu.Lock()
	p, ok := s.audios[audio]
	if ok {
		delete(s.audios, audio)
	}
	s.audiosMu.Unlock()
	if ok {
		p.Kill()
	}
	return true
}

func (t *ClientTracker) killQualityIfDead(path string, q Quality) bool {
	for _, c := range t.clients {
		if c.Path == path && c.Quality != nil && *c.Quality == q {
			return false
		}
	}
	t.logger.Trace().Str("quality", string(q)).Str("path", path).
		Msg("cassette: reaping idle video pipeline")
	s := t.cassette.getSessionByPath(path)
	if s == nil {
		return false
	}
	// Same reasoning as killAudioIfDead: never hold videosMu across the blocking
	// Pipeline.Kill (ffmpeg teardown). Holding it here is what stalls all video
	// index/segment requests — the player then "loads forever" while the reaper
	// waits on a slow-to-die ffmpeg process.
	s.videosMu.Lock()
	p, ok := s.videos[q]
	if ok {
		delete(s.videos, q)
	}
	s.videosMu.Unlock()
	if ok {
		p.Kill()
	}
	return true
}

func (t *ClientTracker) killOrphanedHeads(path string, quality *Quality, audio int32) {
	s := t.cassette.getSessionByPath(path)
	if s == nil {
		return
	}

	reapPipeline := func(p *Pipeline) {
		p.headsMu.Lock()
		defer p.headsMu.Unlock()
		for eid, h := range p.heads {
			if h.segment == -1 {
				continue
			}
			dist := int32(99999)
			for _, c := range t.clients {
				if c.Head == -1 {
					continue
				}
				if d := util.Abs32(c.Head - h.segment); d < dist {
					dist = d
				}
			}
			if dist > 20 {
				t.logger.Trace().Int("eid", eid).Msg("cassette: reaping orphaned encoder head")
				p.killHeadLocked(eid)
			}
		}
	}

	if quality != nil {
		s.videosMu.Lock()
		if p, ok := s.videos[*quality]; ok {
			reapPipeline(p)
		}
		s.videosMu.Unlock()
	}
	if audio != -1 {
		s.audiosMu.Lock()
		if p, ok := s.audios[audio]; ok {
			reapPipeline(p)
		}
		s.audiosMu.Unlock()
	}
}
