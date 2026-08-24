package parser

import (
	"reflect"
	"testing"
)

func TestParse(t *testing.T) {
	tests := []struct {
		name     string
		filename string
		expected ParsedMedia
	}{
		{
			name:     "Dragon Ball Z standard absolute",
			filename: "Dragon Ball Z 034.avi",
			expected: ParsedMedia{
				Title:        "Dragon Ball Z",
				Season:       1,
				Episode:      34,
				Episodes:     []int{34},
				Resolution:   "UNKNOWN",
				ReleaseGroup: "",
			},
		},
		{
			name:     "Dragon Ball Z hyphen",
			filename: "Dragon Ball Z - 001.mkv",
			expected: ParsedMedia{
				Title:        "Dragon Ball Z",
				Season:       1,
				Episode:      1,
				Episodes:     []int{1},
				Resolution:   "UNKNOWN",
				ReleaseGroup: "",
			},
		},
		{
			name:     "Dragon Ball Z with Episode Title",
			filename: "Dragon Ball Z - 001 - Aparece un guerrero misterioso.mkv",
			expected: ParsedMedia{
				Title:        "Dragon Ball Z",
				EpisodeTitle: "Aparece un guerrero misterioso",
				Season:       1,
				Episode:      1,
				Episodes:     []int{1},
				Resolution:   "UNKNOWN",
				ReleaseGroup: "",
			},
		},
		{
			name:     "Dragon Ball Z season and episode",
			filename: "Dragon Ball Z - S07E243.mkv",
			expected: ParsedMedia{
				Title:        "Dragon Ball Z",
				Season:       7,
				Episode:      243,
				Episodes:     []int{243},
				Resolution:   "UNKNOWN",
				ReleaseGroup: "",
			},
		},
		{
			name:     "Dragon Ball Daima fansub",
			filename: "[Erai-raws] Dragon Ball Daima - 01 (1080p HEVC x265).mkv",
			expected: ParsedMedia{
				Title:        "Dragon Ball Daima",
				Season:       1,
				Episode:      1,
				Episodes:     []int{1},
				Resolution:   "1080P",
				ReleaseGroup: "Erai-raws",
			},
		},
		{
			name:     "Dragon Ball Daima scene release",
			filename: "Dragon.Ball.Daima.S01E01.1080p.WEB-DL.HEVC.x265.mkv",
			expected: ParsedMedia{
				Title:        "Dragon Ball Daima",
				Season:       1,
				Episode:      1,
				Episodes:     []int{1},
				Resolution:   "1080P",
				ReleaseGroup: "",
			},
		},
		// ── Bare Numbers ──
		{
			name:     "Bare pure number 01",
			filename: "01.mkv",
			expected: ParsedMedia{
				Title:         "",
				Season:        1,
				Episode:       1,
				Episodes:      []int{1},
				Resolution:    "UNKNOWN",
				IsEpisodeOnly: true,
			},
		},
		{
			name:     "Bare pure number 001",
			filename: "001.mp4",
			expected: ParsedMedia{
				Title:         "",
				Season:        1,
				Episode:       1,
				Episodes:      []int{1},
				Resolution:    "UNKNOWN",
				IsEpisodeOnly: true,
			},
		},
		{
			name:     "Bare pure number 153",
			filename: "153.avi",
			expected: ParsedMedia{
				Title:         "",
				Season:        1,
				Episode:       153,
				Episodes:      []int{153},
				Resolution:    "UNKNOWN",
				IsEpisodeOnly: true,
			},
		},
		{
			name:     "Bare number range 01-03",
			filename: "01-03.mkv",
			expected: ParsedMedia{
				Title:         "",
				Season:        1,
				Episode:       1,
				Episodes:      []int{1, 2, 3},
				Resolution:    "UNKNOWN",
				IsMulti:       true,
				IsEpisodeOnly: true,
			},
		},
		// ── Spanish / Multilingual Prefixes ──
		{
			name:     "Capitulo 01 standalone",
			filename: "Capitulo 01.mkv",
			expected: ParsedMedia{
				Title:         "",
				Season:        1,
				Episode:       1,
				Episodes:      []int{1},
				Resolution:    "UNKNOWN",
				IsEpisodeOnly: true,
			},
		},
		{
			name:     "Capítulo 1 con tilde",
			filename: "Capítulo 1.mp4",
			expected: ParsedMedia{
				Title:         "",
				Season:        1,
				Episode:       1,
				Episodes:      []int{1},
				Resolution:    "UNKNOWN",
				IsEpisodeOnly: true,
			},
		},
		{
			name:     "Cap 05 abbreviation",
			filename: "Cap 05.mkv",
			expected: ParsedMedia{
				Title:         "",
				Season:        1,
				Episode:       5,
				Episodes:      []int{5},
				Resolution:    "UNKNOWN",
				IsEpisodeOnly: true,
			},
		},
		{
			name:     "Episodio 01 standalone",
			filename: "Episodio 01.mkv",
			expected: ParsedMedia{
				Title:         "",
				Season:        1,
				Episode:       1,
				Episodes:      []int{1},
				Resolution:    "UNKNOWN",
				IsEpisodeOnly: true,
			},
		},
		{
			name:     "Ep 15 abbreviation",
			filename: "Ep 15.avi",
			expected: ParsedMedia{
				Title:         "",
				Season:        1,
				Episode:       15,
				Episodes:      []int{15},
				Resolution:    "UNKNOWN",
				IsEpisodeOnly: true,
			},
		},
		{
			name:     "Standalone E01",
			filename: "E01.mkv",
			expected: ParsedMedia{
				Title:         "",
				Season:        1,
				Episode:       1,
				Episodes:      []int{1},
				Resolution:    "UNKNOWN",
				IsEpisodeOnly: true,
			},
		},
		{
			name:     "Standalone S01E01",
			filename: "S01E01.mkv",
			expected: ParsedMedia{
				Title:         "",
				Season:        1,
				Episode:       1,
				Episodes:      []int{1},
				Resolution:    "UNKNOWN",
				IsEpisodeOnly: true,
			},
		},
		{
			name:     "Standalone 1x01",
			filename: "1x01.mp4",
			expected: ParsedMedia{
				Title:         "",
				Season:        1,
				Episode:       1,
				Episodes:      []int{1},
				Resolution:    "UNKNOWN",
				IsEpisodeOnly: true,
			},
		},
		{
			name:     "Spanish range Capitulo 01 al 03",
			filename: "Capitulo 01 al 03.mkv",
			expected: ParsedMedia{
				Title:         "",
				Season:        1,
				Episode:       1,
				Episodes:      []int{1, 2, 3},
				Resolution:    "UNKNOWN",
				IsMulti:       true,
				IsEpisodeOnly: true,
			},
		},
		{
			name:     "Dragon Ball Super Cap 131",
			filename: "Dragon Ball Super Cap 131.mkv",
			expected: ParsedMedia{
				Title:        "Dragon Ball Super",
				Season:       1,
				Episode:      131,
				Episodes:     []int{131},
				Resolution:   "UNKNOWN",
				ReleaseGroup: "",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			actual := Parse(tt.filename)

			if actual.Title != tt.expected.Title {
				t.Errorf("Title: got %q, want %q", actual.Title, tt.expected.Title)
			}
			if actual.EpisodeTitle != tt.expected.EpisodeTitle {
				t.Errorf("EpisodeTitle: got %q, want %q", actual.EpisodeTitle, tt.expected.EpisodeTitle)
			}
			if actual.Season != tt.expected.Season {
				t.Errorf("Season: got %d, want %d", actual.Season, tt.expected.Season)
			}
			if actual.Episode != tt.expected.Episode {
				t.Errorf("Episode: got %d, want %d", actual.Episode, tt.expected.Episode)
			}
			if !reflect.DeepEqual(actual.Episodes, tt.expected.Episodes) {
				t.Errorf("Episodes: got %v, want %v", actual.Episodes, tt.expected.Episodes)
			}
			if actual.Resolution != tt.expected.Resolution {
				t.Errorf("Resolution: got %q, want %q", actual.Resolution, tt.expected.Resolution)
			}
			if actual.IsMulti != tt.expected.IsMulti {
				t.Errorf("IsMulti: got %t, want %t", actual.IsMulti, tt.expected.IsMulti)
			}
			if actual.IsEpisodeOnly != tt.expected.IsEpisodeOnly {
				t.Errorf("IsEpisodeOnly: got %t, want %t", actual.IsEpisodeOnly, tt.expected.IsEpisodeOnly)
			}
		})
	}
}
