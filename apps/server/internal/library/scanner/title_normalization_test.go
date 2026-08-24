package scanner

import (
	"testing"
)

func TestNormalizeTitle(t *testing.T) {
	tests := []struct {
		name       string
		input      string
		want       string
		wantBase   string
		wantSeason int
		wantPart   int
	}{
		{
			name:       "Dragon Ball Z basic",
			input:      "Dragon Ball Z",
			want:       "dragon ball z",
			wantBase:   "dragon ball z",
			wantSeason: -1,
			wantPart:   -1,
		},
		{
			name:       "Dragon Ball with season",
			input:      "Dragon Ball Season 2",
			want:       "dragon ball",
			wantBase:   "dragon ball",
			wantSeason: 2,
			wantPart:   -1,
		},
		{
			name:       "Dragon Ball Super with season and part",
			input:      "Dragon Ball Super Season 3 Part 2",
			want:       "dragon ball super",
			wantBase:   "dragon ball super",
			wantSeason: 3,
			wantPart:   2,
		},
		{
			name:       "Dragon Ball Z with Roman numeral",
			input:      "Dragon Ball Z Part II",
			want:       "dragon ball z",
			wantBase:   "dragon ball z",
			wantSeason: 2,
			wantPart:   2,
		},
		{
			name:       "Special characters in DB movie",
			input:      "Dragon Ball Z: Battle of Gods",
			want:       "dragon ball z battle of gods",
			wantBase:   "dragon ball z battle of gods",
			wantSeason: -1,
			wantPart:   -1,
		},
		{
			name:       "Smart quotes",
			input:      "Dragon Ball: Goku's Traffic Safety",
			want:       "dragon ball gokus traffic safety",
			wantBase:   "dragon ball gokus traffic safety",
			wantSeason: -1,
			wantPart:   -1,
		},
		{
			name:       "The Animation suffix",
			input:      "Dragon Ball Z The Animation",
			want:       "dragon ball z",
			wantBase:   "dragon ball z",
			wantSeason: -1,
			wantPart:   -1,
		},
		{
			name:       "Case sensitivity uppercase",
			input:      "DRAGON BALL GT",
			want:       "dragon ball gt",
			wantBase:   "dragon ball gt",
			wantSeason: -1,
			wantPart:   -1,
		},
		{
			name:       "With 'The'",
			input:      "The Legend of Shenron",
			want:       "legend of shenron",
			wantBase:   "legend of shenron",
			wantSeason: -1,
			wantPart:   -1,
		},
		{
			name:       "With 'Episode'",
			input:      "Dragon Ball Z Episode 100",
			want:       "dragon ball z 100",
			wantBase:   "dragon ball z 100",
			wantSeason: -1,
			wantPart:   -1,
		},
		{
			name:       "OAD/OVA",
			input:      "Dragon Ball Z OVA",
			want:       "dragon ball z ova",
			wantBase:   "dragon ball z ova",
			wantSeason: -1,
			wantPart:   -1,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := NormalizeTitle(tt.input)
			if got.Normalized != tt.want {
				t.Errorf("NormalizeTitle(%q).Normalized = %q, want %q", tt.input, got.Normalized, tt.want)
			}
			if got.CleanBaseTitle != tt.wantBase {
				t.Errorf("NormalizeTitle(%q).CleanBaseTitle = %q, want %q", tt.input, got.CleanBaseTitle, tt.wantBase)
			}
			if tt.wantSeason != 0 && got.Season != tt.wantSeason {
				t.Errorf("NormalizeTitle(%q).Season = %d, want %d", tt.input, got.Season, tt.wantSeason)
			}
			if tt.wantPart != 0 && got.Part != tt.wantPart {
				t.Errorf("NormalizeTitle(%q).Part = %d, want %d", tt.input, got.Part, tt.wantPart)
			}
		})
	}
}
