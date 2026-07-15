package metadata

import "testing"

// TestGetCurrentEpisodeCount_EmptyEpisodeString reproduces the panic that broke the
// anime-entry endpoint (500 on the detail page): an episode whose Episode field is an
// empty string caused ep.Episode[0] to panic with "index out of range [0] with length 0".
func TestGetCurrentEpisodeCount_EmptyEpisodeString(t *testing.T) {
	pastDate := "2000-01-01"
	m := &AnimeMetadata{
		Episodes: map[string]*EpisodeMetadata{
			"empty":     {Episode: "", AirDate: pastDate},        // was the panic trigger
			"numbered":  {Episode: "1", AirDate: pastDate},       // counts
			"future":    {Episode: "2", AirDate: "2999-01-01"},   // aired in the future, does not count
			"nonnumber": {Episode: "S", AirDate: pastDate},       // non-numeric prefix, does not count
		},
	}

	got := m.GetCurrentEpisodeCount()
	if got != 1 {
		t.Fatalf("GetCurrentEpisodeCount() = %d, want 1 (only the aired numbered episode)", got)
	}
}

// TestGetCurrentEpisodeCount_NilReceiver guards the existing nil-safety contract.
func TestGetCurrentEpisodeCount_NilReceiver(t *testing.T) {
	var m *AnimeMetadata
	if got := m.GetCurrentEpisodeCount(); got != 0 {
		t.Fatalf("GetCurrentEpisodeCount() on nil = %d, want 0", got)
	}
}
