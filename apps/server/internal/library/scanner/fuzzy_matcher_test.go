package scanner

import (
	"testing"
)

func TestLevenshteinDistance(t *testing.T) {
	tests := []struct {
		s1, s2 string
		want   int
	}{
		{"", "", 0},
		{"a", "", 1},
		{"", "b", 1},
		{"kitten", "sitting", 3},
		{"dragon ball", "dragon ball", 0},
		{"goku", "gokuu", 1},
	}

	for _, tt := range tests {
		got := LevenshteinDistance(tt.s1, tt.s2)
		if got != tt.want {
			t.Errorf("LevenshteinDistance(%q, %q) = %d, want %d", tt.s1, tt.s2, got, tt.want)
		}
	}
}

func TestJaroWinklerSimilarity(t *testing.T) {
	tests := []struct {
		s1, s2  string
		minWant float64
	}{
		{"dragon ball z", "dragon ball z", 1.0},
		{"devuelvanme", "devuelveme", 0.85},
		{"broly", "broly second coming", 0.70},
		{"goku", "vegeta", 0.0},
	}

	for _, tt := range tests {
		got := JaroWinklerSimilarity(tt.s1, tt.s2)
		if tt.minWant > 0 && got < tt.minWant {
			t.Errorf("JaroWinklerSimilarity(%q, %q) = %f, want >= %f", tt.s1, tt.s2, got, tt.minWant)
		}
	}
}

func TestTokenSetRatio(t *testing.T) {
	tests := []struct {
		s1, s2  string
		minWant float64
	}{
		{"Dragon Ball Z Movie 01", "Movie 01 Dragon Ball Z", 0.95},
		{"[Fansub] Dragon Ball Super - Broly [1080p]", "Dragon Ball Super Broly", 0.80},
		{"Goku vs Jiren", "Jiren vs Goku", 0.95},
	}

	for _, tt := range tests {
		got := TokenSetRatio(tt.s1, tt.s2)
		if got < tt.minWant {
			t.Errorf("TokenSetRatio(%q, %q) = %f, want >= %f", tt.s1, tt.s2, got, tt.minWant)
		}
	}
}

func TestFuzzyMatchScore(t *testing.T) {
	tests := []struct {
		query, target string
		minScore      float64
	}{
		{"Dragon Ball Z Devuelvanme a mi Gohan", "¡Devuélveme a mi Gohan!", 0.75},
		{"DBS Broly 2018 1080p Dual", "Dragon Ball Super Broly", 0.70},
		{"Dragon Ball Z El Padre de Goku Especial 1", "El Padre de Goku", 0.70},
	}

	for _, tt := range tests {
		got := FuzzyMatchScore(tt.query, tt.target)
		if got < tt.minScore {
			t.Errorf("FuzzyMatchScore(%q, %q) = %f, want >= %f", tt.query, tt.target, got, tt.minScore)
		}
	}
}
