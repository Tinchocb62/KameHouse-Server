package skipdetect

import "testing"

func TestEpisodeInRange(t *testing.T) {
	cases := []struct {
		spec string
		ep   int
		want bool
	}{
		{"", 5, true},          // vacío = todos
		{"1-101", 50, true},    // dentro del rango
		{"1-101", 101, true},   // borde superior inclusivo
		{"1-101", 102, false},  // fuera
		{"102-153", 102, true}, // borde inferior inclusivo
		{"22", 22, true},       // episodio único
		{"22", 23, false},      // único, no matchea
		{"1, 3-5", 4, true},    // lista con rango
		{"1, 3-5", 2, false},   // hueco en la lista
		{"1, 3-5", 1, true},    // token simple en lista
		{"basura", 7, true},    // no parseable = permisivo (no descarta)
	}
	for _, c := range cases {
		if got := episodeInRange(c.spec, c.ep); got != c.want {
			t.Errorf("episodeInRange(%q, %d) = %v, want %v", c.spec, c.ep, got, c.want)
		}
	}
}
