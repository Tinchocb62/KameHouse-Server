package scanner

import (
	"testing"
)

func TestAnalyzeMediaFeatures(t *testing.T) {
	tests := []struct {
		name       string
		filename   string
		path       string
		wantLatino bool
		wantDual   bool
		wantRes    string
		wantBadge  string
	}{
		{
			name:       "DBZ Latino 1080p",
			filename:   "Dragon Ball Z - 01 - Devuelvanme a mi Gohan [1080p Latino].mkv",
			path:       "C:/Anime/Dragon Ball Z/Dragon Ball Z - 01.mkv",
			wantLatino: true,
			wantDual:   false,
			wantRes:    "1080p FHD",
			wantBadge:  "LATINO",
		},
		{
			name:       "DBS Broly 4K HDR Dual Audio",
			filename:   "Dragon Ball Super Broly (2018) 2160p UHD HDR Dual-Audio x265.mkv",
			path:       "C:/Movies/Dragon Ball Super Broly.mkv",
			wantLatino: false,
			wantDual:   true,
			wantRes:    "4K UHD",
			wantBadge:  "DUAL AUDIO",
		},
		{
			name:       "DB Clásico Castellano 720p",
			filename:   "Dragon Ball - Cap 01 - El secreto de la esfera [720p Castellano].mp4",
			path:       "C:/Anime/Dragon Ball/Cap 01.mp4",
			wantLatino: false,
			wantDual:   false,
			wantRes:    "720p HD",
			wantBadge:  "CASTELLANO",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			features := AnalyzeMediaFeatures(tt.filename, tt.path)
			if features.Resolution != tt.wantRes {
				t.Errorf("got resolution %q, want %q", features.Resolution, tt.wantRes)
			}

			hasLatino := false
			hasDual := false
			for _, d := range features.AudioDubs {
				if d == "Latino" {
					hasLatino = true
				}
				if d == "Dual Audio" {
					hasDual = true
				}
			}
			if hasLatino != tt.wantLatino {
				t.Errorf("hasLatino = %t, want %t", hasLatino, tt.wantLatino)
			}
			if hasDual != tt.wantDual {
				t.Errorf("hasDual = %t, want %t", hasDual, tt.wantDual)
			}

			hasBadge := false
			for _, b := range features.SmartBadges {
				if b == tt.wantBadge {
					hasBadge = true
					break
				}
			}
			if !hasBadge {
				t.Errorf("SmartBadges %v does not contain %q", features.SmartBadges, tt.wantBadge)
			}
		})
	}
}
