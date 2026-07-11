package cassette

import (
	"context"
	"errors"
	"fmt"
	"sync"
)

// ErrWaitAborted is returned by WaitFor when the kill channel fired instead of
// the caller's context. It means the encoder that was going to produce the
// segment was torn down (typically by a seek killing every head), not that the
// segment failed to encode.
var ErrWaitAborted = errors.New("cassette: segment wait aborted")

// SegmentTable tracks which segments are ready
type SegmentTable struct {
	mu       sync.RWMutex
	segments []segmentEntry
}

type segmentEntry struct {
	// ch is closed when the segment is ready on disk.
	ch chan struct{}
	// encoderID is the head that produced the segment.
	encoderID int
}

// NewSegmentTable creates a table with initialLen segments
func NewSegmentTable(initialLen int32) *SegmentTable {
	st := &SegmentTable{
		segments: make([]segmentEntry, initialLen, max(initialLen, 2048)),
	}
	for i := int32(0); i < initialLen; i++ {
		st.segments[i].ch = make(chan struct{})
	}
	return st
}

// Grow extends the table to at least newLen segments
func (st *SegmentTable) Grow(newLen int) {
	st.mu.Lock()
	defer st.mu.Unlock()
	if newLen <= len(st.segments) {
		return
	}
	for i := len(st.segments); i < newLen; i++ {
		st.segments = append(st.segments, segmentEntry{ch: make(chan struct{})})
	}
}

// Len returns the current number of tracked segments
func (st *SegmentTable) Len() int {
	st.mu.RLock()
	defer st.mu.RUnlock()
	return len(st.segments)
}

// IsReady returns true if segment is ready
func (st *SegmentTable) IsReady(seg int32) bool {
	st.mu.RLock()
	defer st.mu.RUnlock()
	if seg < 0 || int(seg) >= len(st.segments) {
		return false
	}
	ch := st.segments[seg].ch
	select {
	case <-ch:
		return true
	default:
		return false
	}
}

// isReadyLocked is like IsReady but expects at least an RLock to be held.
func (st *SegmentTable) isReadyLocked(seg int32) bool {
	if seg < 0 || int(seg) >= len(st.segments) {
		return false
	}
	select {
	case <-st.segments[seg].ch:
		return true
	default:
		return false
	}
}

// MarkReady marks a segment as ready
func (st *SegmentTable) MarkReady(seg int32, encoderID int) {
	st.mu.Lock()
	defer st.mu.Unlock()
	if seg < 0 || int(seg) >= len(st.segments) {
		return
	}
	select {
	case <-st.segments[seg].ch:
		// Already closed — idempotent.
	default:
		st.segments[seg].encoderID = encoderID
		close(st.segments[seg].ch)
	}
}

// EncoderID returns the encoder that produced the given segment
func (st *SegmentTable) EncoderID(seg int32) int {
	st.mu.RLock()
	defer st.mu.RUnlock()
	if seg < 0 || int(seg) >= len(st.segments) {
		return -1
	}
	return st.segments[seg].encoderID
}

// WaitFor blocks until segment is ready or context is cancelled
func (st *SegmentTable) WaitFor(ctx context.Context, seg int32, kill <-chan struct{}) error {
	st.mu.RLock()
	if seg < 0 || int(seg) >= len(st.segments) {
		st.mu.RUnlock()
		return fmt.Errorf("%w: index %d (len=%d)", ErrSegmentOutOfRange, seg, len(st.segments))
	}
	ch := st.segments[seg].ch
	st.mu.RUnlock()

	select {
	case <-ch:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	case <-kill:
		return ErrWaitAborted
	}
}
