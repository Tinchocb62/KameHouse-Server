package cassette

import (
	"os"
	"testing"

	"github.com/rs/zerolog"
)

func TestNVENCArbitrator_CapEnforced(t *testing.T) {
	// Setup env
	os.Setenv("KAMEHOUSE_NVENC_SESSIONS", "2")
	defer os.Unsetenv("KAMEHOUSE_NVENC_SESSIONS")

	logger := zerolog.Nop()
	gov := NewGovernor(10, true, &logger)

	// Try to acquire 3 slots (reserve=0)
	rel1, ok1 := gov.TryAcquireNVENC(0)
	if !ok1 {
		t.Fatalf("Expected to acquire 1st slot")
	}

	rel2, ok2 := gov.TryAcquireNVENC(0)
	if !ok2 {
		t.Fatalf("Expected to acquire 2nd slot")
	}

	_, ok3 := gov.TryAcquireNVENC(0)
	if ok3 {
		t.Fatalf("Expected 3rd slot to fail")
	}

	stats := gov.Stats()
	if stats.ActiveNVENC != 2 {
		t.Fatalf("Expected 2 active NVENC slots, got %d", stats.ActiveNVENC)
	}

	rel1()
	rel2()
}

func TestNVENCArbitrator_ReserveRespected(t *testing.T) {
	os.Setenv("KAMEHOUSE_NVENC_SESSIONS", "2")
	defer os.Unsetenv("KAMEHOUSE_NVENC_SESSIONS")

	logger := zerolog.Nop()
	gov := NewGovernor(10, true, &logger)

	// Slot 1 (interactive)
	rel1, ok1 := gov.TryAcquireNVENC(0)
	if !ok1 {
		t.Fatalf("Expected to acquire 1st slot")
	}

	// Slot 2 (speculative, reserve=1) - should fail because only 1 slot left and we need to reserve it
	_, ok2 := gov.TryAcquireNVENC(1)
	if ok2 {
		t.Fatalf("Expected speculative acquire to fail due to reserve")
	}

	// Slot 2 (interactive, reserve=0) - should succeed
	rel3, ok3 := gov.TryAcquireNVENC(0)
	if !ok3 {
		t.Fatalf("Expected interactive acquire to succeed")
	}

	rel1()
	rel3()
}

func TestNVENCArbitrator_Stats(t *testing.T) {
	os.Setenv("KAMEHOUSE_NVENC_SESSIONS", "4")
	defer os.Unsetenv("KAMEHOUSE_NVENC_SESSIONS")

	logger := zerolog.Nop()
	gov := NewGovernor(10, true, &logger)

	if gov.Stats().NVENCCap != 4 {
		t.Fatalf("Expected NVENCCap 4, got %d", gov.Stats().NVENCCap)
	}

	rel, ok := gov.TryAcquireNVENC(0)
	if !ok {
		t.Fatalf("Expected to acquire slot")
	}

	if gov.Stats().ActiveNVENC != 1 {
		t.Fatalf("Expected ActiveNVENC 1, got %d", gov.Stats().ActiveNVENC)
	}

	rel()

	if gov.Stats().ActiveNVENC != 0 {
		t.Fatalf("Expected ActiveNVENC 0, got %d", gov.Stats().ActiveNVENC)
	}
}
