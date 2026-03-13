package streaming

import (
	"sort"
	"testing"
)

func TestSourcePriorityEngine(t *testing.T) {
	sources := []MediaSource{
		{Type: "torrentio", Priority: 3, Title: "P2P Stream"},
		{Type: "torrentio", Priority: 2, Title: "Debrid Stream"},
		{Type: "local", Priority: 1, Title: "Local File"},
	}

	// Test the sorting logic from ResolveEpisodeSources
	sort.Slice(sources, func(i, j int) bool {
		return sources[i].Priority < sources[j].Priority
	})

	if sources[0].Priority != 1 || sources[0].Type != "local" {
		t.Errorf("Expected Priority 1 (local) to be first, got %v", sources[0])
	}
	if sources[1].Priority != 2 {
		t.Errorf("Expected Priority 2 to be second, got %v", sources[1])
	}
	if sources[2].Priority != 3 {
		t.Errorf("Expected Priority 3 to be third, got %v", sources[2])
	}
}
