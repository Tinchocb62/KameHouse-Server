package events

import (
	"sync"
	"time"
)

const subscriberBufferSize = 100

// Event is the canonical envelope published through the Dispatcher.
// Topic maps to an existing events constant (e.g. events.EventScanProgress).
type Event struct {
	Topic     string    `json:"topic"`
	Payload   any       `json:"payload"`
	CreatedAt time.Time `json:"createdAt"`
}

// Dispatcher is the topic-based event bus contract.
// All methods are safe to call from multiple goroutines concurrently.
type Dispatcher interface {
	// Publish broadcasts the event to every subscriber registered for e.Topic.
	Publish(event Event)

	// Subscribe registers a listener for topic and returns its buffered channel.
	// The caller must call Unsubscribe when done to release the channel.
	Subscribe(topic string) chan Event

	// Unsubscribe removes ch from the topic's subscriber list and closes it,
	// unblocking any goroutine currently blocking on <-ch.
	Unsubscribe(topic string, ch chan Event)
}

// InternalDispatcher is a thread-safe, in-process, topic-keyed pub/sub bus.
// It connects internal modules (scanner, playback, …) to downstream consumers
// such as the WebSocket hub without creating hard inter-package dependencies.
type InternalDispatcher struct {
	mu          sync.RWMutex
	subscribers map[string][]chan Event
}

// NewDispatcher constructs a ready-to-use InternalDispatcher.
func NewDispatcher() *InternalDispatcher {
	return &InternalDispatcher{
		subscribers: make(map[string][]chan Event),
	}
}

// Publish sends the event only to the subscribers registered for e.Topic.
// If a subscriber's buffer is full the event is dropped for that consumer only;
// the remaining subscribers and the calling goroutine are unaffected.
func (d *InternalDispatcher) Publish(e Event) {
	if e.CreatedAt.IsZero() {
		e.CreatedAt = time.Now()
	}

	d.mu.RLock()
	subs := d.subscribers[e.Topic]
	d.mu.RUnlock()

	for _, ch := range subs {
		select {
		case ch <- e:
			// delivered
		default:
			// subscriber buffer full — drop silently
		}
	}
}

// Subscribe creates a buffered channel for topic, registers it, and returns it.
func (d *InternalDispatcher) Subscribe(topic string) chan Event {
	ch := make(chan Event, subscriberBufferSize)

	d.mu.Lock()
	d.subscribers[topic] = append(d.subscribers[topic], ch)
	d.mu.Unlock()

	return ch
}

// Unsubscribe removes ch from the topic's subscriber list and closes it.
func (d *InternalDispatcher) Unsubscribe(topic string, ch chan Event) {
	d.mu.Lock()
	defer d.mu.Unlock()

	subs := d.subscribers[topic]
	updated := make([]chan Event, 0, len(subs))
	for _, sub := range subs {
		if sub != ch {
			updated = append(updated, sub)
		}
	}

	if len(updated) == 0 {
		delete(d.subscribers, topic) // GC the empty slice
	} else {
		d.subscribers[topic] = updated
	}

	close(ch) // unblock any goroutine blocking on <-ch or range ch
}
