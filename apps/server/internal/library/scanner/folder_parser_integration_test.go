package scanner

import (
	"kamehouse/internal/database/models/dto"
	"path/filepath"
	"testing"
)

func TestFolderStructureAndEpisodeIntegration(t *testing.T) {
	libPaths := []string{"C:/Anime", "C:/Series", "C:/Peliculas", "C:/Videos"}

	tests := []struct {
		name              string
		filePath          string
		wantSeriesName    string
		wantSeason        int
		wantEpisode       int
		wantEpisodeTitle  string
		wantIsMulti       bool
		wantTMDBID        int
		wantIsMovie       bool
	}{
		{
			name:           "DBZ in Saga Saiyajin folder with bare number 001",
			filePath:       "C:/Anime/Dragon Ball Z/Saga Saiyajin/001.mkv",
			wantSeriesName: "Dragon Ball Z",
			wantSeason:     1,
			wantEpisode:    1,
			wantTMDBID:     12971,
			wantIsMovie:    false,
		},
		{
			name:           "DBZ in Temporada 1 folder with Capitulo 01",
			filePath:       "C:/Series/Dragon Ball Z/Temporada 1/Capitulo 01.mkv",
			wantSeriesName: "Dragon Ball Z",
			wantSeason:     1,
			wantEpisode:    1,
			wantTMDBID:     12971,
			wantIsMovie:    false,
		},
		{
			name:             "DBZ with episode title in filename",
			filePath:         "C:/Anime/Dragon Ball Z/Dragon Ball Z - 001 - Aparece un guerrero misterioso.mkv",
			wantSeriesName:   "Dragon Ball Z",
			wantSeason:       1,
			wantEpisode:      1,
			wantEpisodeTitle: "Aparece un guerrero misterioso",
			wantTMDBID:       12971,
			wantIsMovie:      false,
		},
		{
			name:           "DBGT in Saga Baby folder with Cap 05",
			filePath:       "C:/Anime/Dragon Ball GT/Saga Baby/Cap 05.mkv",
			wantSeriesName: "Dragon Ball GT",
			wantSeason:     1,
			wantEpisode:    5,
			wantTMDBID:     12697,
			wantIsMovie:    false,
		},
		{
			name:           "DBS in Saga Goku Black folder with Episodio 47",
			filePath:       "C:/Anime/Dragon Ball Super/Saga Goku Black/Episodio 47.mkv",
			wantSeriesName: "Dragon Ball Super",
			wantSeason:     1,
			wantEpisode:    47,
			wantTMDBID:     62715,
			wantIsMovie:    false,
		},
		{
			name:           "Dragon Ball Daima standalone 01",
			filePath:       "C:/Anime/Dragon Ball Daima/01.mkv",
			wantSeriesName: "Dragon Ball Daima",
			wantSeason:     1,
			wantEpisode:    1,
			wantTMDBID:     236994,
			wantIsMovie:    false,
		},
		{
			name:           "Dragon Ball Kai S01E01",
			filePath:       "C:/Anime/Dragon Ball Kai/S01E01.mkv",
			wantSeriesName: "Dragon Ball Kai",
			wantSeason:     1,
			wantEpisode:    1,
			wantTMDBID:     61709,
			wantIsMovie:    false,
		},
		{
			name:           "Dragon Ball Clásico bare number 153",
			filePath:       "C:/Anime/Dragon Ball/153.mp4",
			wantSeriesName: "Dragon Ball",
			wantSeason:     1,
			wantEpisode:    153,
			wantTMDBID:     12609,
			wantIsMovie:    false,
		},
		{
			name:           "Dead Zone in Peliculas folder (Latino)",
			filePath:       "C:/Peliculas/Dragon Ball Z - ¡Devuélveme a mi Gohan! (1989).mkv",
			wantSeriesName: "Dragon Ball Z - ¡Devuélveme a mi Gohan!",
			wantTMDBID:     28609,
			wantIsMovie:    true,
		},
		{
			name:           "World's Strongest in Peliculas folder (English)",
			filePath:       "C:/Peliculas/Dragon Ball Z - The World's Strongest.mkv",
			wantSeriesName: "Dragon Ball Z - The World's Strongest",
			wantTMDBID:     39100,
			wantIsMovie:    true,
		},
		{
			name:           "Broly The Legendary Super Saiyan in Peliculas (Latino)",
			filePath:       "C:/Peliculas/Dragon Ball Z - El Poder Invencible.mkv",
			wantSeriesName: "Dragon Ball Z - El Poder Invencible",
			wantTMDBID:     34433,
			wantIsMovie:    true,
		},
		{
			name:           "Bardock Father of Goku in Especiales folder (Latino)",
			filePath:       "C:/Videos/Especiales/Dragon Ball Z - El Padre de Goku.mkv",
			wantSeriesName: "Dragon Ball Z - El Padre de Goku",
			wantTMDBID:     39323,
			wantIsMovie:    true,
		},
		{
			name:           "GT 100 Años Después in Especiales folder (Latino)",
			filePath:       "C:/Videos/Especiales/Dragon Ball GT - 100 Años Después.mkv",
			wantSeriesName: "Dragon Ball GT - 100 Años Después",
			wantTMDBID:     18095,
			wantIsMovie:    true,
		},
		{
			name:           "Episode of Bardock in OVAs folder",
			filePath:       "C:/Videos/OVAs/Dragon Ball - El Episodio de Bardock (2011).mkv",
			wantSeriesName: "Dragon Ball - El Episodio de Bardock",
			wantTMDBID:     120475,
			wantIsMovie:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// 1. Build LocalFile with ParsedFolderData
			filename := filepath.Base(tt.filePath)
			dir := filepath.Dir(tt.filePath)
			dirParts := splitPath(dir)

			lf := &dto.LocalFile{
				Path:       tt.filePath,
				Name:       filename,
				ParsedData: &dto.LocalFileParsedData{Original: filename},
				Metadata:   &dto.LocalFileMetadata{},
			}

			for _, p := range dirParts {
				lf.ParsedFolderData = append(lf.ParsedFolderData, &dto.LocalFileParsedData{
					Title:    p,
					Original: p,
				})
			}

			// Verify ParseFolderStructure handles the path properly
			folderInfo := ParseFolderStructure(tt.filePath, libPaths)
			if folderInfo == nil {
				t.Fatalf("ParseFolderStructure returned nil for %s", tt.filePath)
			}

			// 2. Test parsedMediaFromLocalFile
			pm := parsedMediaFromLocalFile(lf)

			if !tt.wantIsMovie {
				if pm.Title != tt.wantSeriesName {
					t.Errorf("ParsedMedia.Title: got %q, want %q", pm.Title, tt.wantSeriesName)
				}
				if len(pm.Episodes) == 0 || pm.Episodes[0] != tt.wantEpisode {
					t.Errorf("ParsedMedia.Episode: got %v, want %d", pm.Episodes, tt.wantEpisode)
				}
				if tt.wantEpisodeTitle != "" && pm.EpisodeTitle != tt.wantEpisodeTitle {
					t.Errorf("ParsedMedia.EpisodeTitle: got %q, want %q", pm.EpisodeTitle, tt.wantEpisodeTitle)
				}
			}

			// 3. Test Dragon Ball Resolver mapping
			cand := lf.GetSeriesFolderTitle()
			if cand == "" || tt.wantIsMovie {
				cand = tt.filePath
			}
			id, isMovie, found := ResolveDragonBallID(cand)
			if !found {
				// Also try filename / combined
				id, isMovie, found = ResolveDragonBallID(filepath.Base(dir) + " " + filename)
			}
			if !found {
				id, isMovie, found = ResolveDragonBallID(filename)
			}

			if !found {
				t.Fatalf("ResolveDragonBallID failed to resolve %q", tt.filePath)
			}
			if id != tt.wantTMDBID {
				t.Errorf("TMDB ID: got %d, want %d", id, tt.wantTMDBID)
			}
			if isMovie != tt.wantIsMovie {
				t.Errorf("isMovie: got %t, want %t", isMovie, tt.wantIsMovie)
			}
		})
	}
}
