package scanner

import (
	"testing"
)

func TestResolveDragonBallID(t *testing.T) {
	tests := []struct {
		name      string
		title     string
		wantID    int
		wantMovie bool
		wantFound bool
	}{
		// Series
		{name: "Dragon Ball Kai", title: "Dragon Ball Kai", wantID: 61709, wantMovie: false, wantFound: true},
		{name: "Dragon Ball Z Kai", title: "Dragon Ball Z Kai", wantID: 61709, wantMovie: false, wantFound: true},
		{name: "DBZ Kai", title: "DBZ Kai", wantID: 61709, wantMovie: false, wantFound: true},
		{name: "Dragon Ball GT", title: "Dragon Ball GT", wantID: 12697, wantMovie: false, wantFound: true},
		{name: "DBGT", title: "DBGT", wantID: 12697, wantMovie: false, wantFound: true},
		{name: "Dragon Ball Super", title: "Dragon Ball Super", wantID: 62715, wantMovie: false, wantFound: true},
		{name: "DBS", title: "DBS", wantID: 62715, wantMovie: false, wantFound: true},
		{name: "Dragon Ball Daima", title: "Dragon Ball Daima", wantID: 236994, wantMovie: false, wantFound: true},
		{name: "DB Daima", title: "DB Daima", wantID: 236994, wantMovie: false, wantFound: true},
		{name: "Dragon Ball Z", title: "Dragon Ball Z", wantID: 12971, wantMovie: false, wantFound: true},
		{name: "DBZ", title: "DBZ", wantID: 12971, wantMovie: false, wantFound: true},
		{name: "Dragon Ball classic", title: "Dragon Ball", wantID: 12609, wantMovie: false, wantFound: true},
		{name: "DB classic", title: "DB Clasico", wantID: 12609, wantMovie: false, wantFound: true},

		// Generic movie titles should NOT match TV series
		{name: "Dragon Ball Z Movie (generic)", title: "Dragon Ball Z Movie", wantID: 0, wantMovie: false, wantFound: false},
		{name: "Dragon Ball Movies (generic)", title: "Dragon Ball Movies", wantID: 0, wantMovie: false, wantFound: false},

		// Películas DBZ Multi-Idioma
		// Dead Zone (1989) - TMDB 28609
		{name: "Dead Zone (English)", title: "Dragon Ball Z Dead Zone", wantID: 28609, wantMovie: true, wantFound: true},
		{name: "Devuélvanme a mi Gohan (Latino)", title: "Dragon Ball Z ¡Devuélvanme a mi Gohan!", wantID: 28609, wantMovie: true, wantFound: true},
		{name: "Devuélveme a mi Gohan (España)", title: "Dragon Ball Z ¡Devuélveme a mi Gohan!", wantID: 28609, wantMovie: true, wantFound: true},
		{name: "Garlick Jr (Latino)", title: "Dragon Ball Z Garlick Junior Inmortal", wantID: 28609, wantMovie: true, wantFound: true},
		{name: "DBZ Pelicula 01", title: "Dragon Ball Z Pelicula 01", wantID: 28609, wantMovie: true, wantFound: true},
		{name: "DBZ Movie 01", title: "Dragon Ball Z Movie 01", wantID: 28609, wantMovie: true, wantFound: true},

		// The World's Strongest (1990) - TMDB 39100
		{name: "The World's Strongest (English)", title: "Dragon Ball Z The World's Strongest", wantID: 39100, wantMovie: true, wantFound: true},
		{name: "El Hombre Más Fuerte del Mundo (Latino)", title: "Dragon Ball Z El Hombre Mas Fuerte de Este Mundo", wantID: 39100, wantMovie: true, wantFound: true},
		{name: "Dr. Wheelo", title: "Dragon Ball Z Dr Wheelo", wantID: 39100, wantMovie: true, wantFound: true},
		{name: "Dr. Willow", title: "Dragon Ball Z Doctor Willow", wantID: 39100, wantMovie: true, wantFound: true},

		// The Tree of Might (1990) - TMDB 39101
		{name: "Tree of Might (English)", title: "Dragon Ball Z The Tree of Might", wantID: 39101, wantMovie: true, wantFound: true},
		{name: "El Árbol del Poder (Latino)", title: "Dragon Ball Z El Arbol del Poder", wantID: 39101, wantMovie: true, wantFound: true},
		{name: "La Súper Batalla (Latino/España)", title: "Dragon Ball Z La Super Batalla Decisiva por la Tierra", wantID: 39101, wantMovie: true, wantFound: true},
		{name: "Turles", title: "Dragon Ball Z Turles", wantID: 39101, wantMovie: true, wantFound: true},

		// Lord Slug (1991) - TMDB 39102
		{name: "Lord Slug (English)", title: "Dragon Ball Z Lord Slug", wantID: 39102, wantMovie: true, wantFound: true},
		{name: "El Súper Guerrero Son Goku (Latino)", title: "Dragon Ball Z El Super Guerrero Son Goku", wantID: 39102, wantMovie: true, wantFound: true},
		{name: "Goku es un Super Saiyajin (Latino)", title: "Dragon Ball Z Goku es un Super Saiyajin", wantID: 39102, wantMovie: true, wantFound: true},

		// Cooler's Revenge (1991) - TMDB 24752
		{name: "Cooler's Revenge (English)", title: "Dragon Ball Z Cooler's Revenge", wantID: 24752, wantMovie: true, wantFound: true},
		{name: "Los Rivales Más Poderosos (Latino)", title: "Dragon Ball Z Los Rivales Mas Poderosos", wantID: 24752, wantMovie: true, wantFound: true},
		{name: "La Venganza de Cooler (Latino)", title: "Dragon Ball Z La Venganza de Cooler", wantID: 24752, wantMovie: true, wantFound: true},

		// The Return of Cooler (1992) - TMDB 39103
		{name: "The Return of Cooler (English)", title: "Dragon Ball Z The Return of Cooler", wantID: 39103, wantMovie: true, wantFound: true},
		{name: "El Regreso de Cooler (Latino)", title: "Dragon Ball Z El Regreso de Cooler", wantID: 39103, wantMovie: true, wantFound: true},
		{name: "Los Guerreros Más Poderosos (Latino)", title: "Dragon Ball Z Los Guerreros Mas Poderosos", wantID: 39103, wantMovie: true, wantFound: true},
		{name: "Guerreros de Fuerza Ilimitada (España)", title: "Dragon Ball Z Guerreros de Fuerza Ilimitada", wantID: 39103, wantMovie: true, wantFound: true},
		{name: "Metal Cooler", title: "Dragon Ball Z Metal Cooler", wantID: 39103, wantMovie: true, wantFound: true},

		// Super Android 13 (1992) - TMDB 39104
		{name: "Super Android 13 (English)", title: "Dragon Ball Z Super Android 13", wantID: 39104, wantMovie: true, wantFound: true},
		{name: "La Batalla de los Tres Saiyajin (Latino)", title: "Dragon Ball Z La Batalla de los Tres Saiyajin", wantID: 39104, wantMovie: true, wantFound: true},
		{name: "La Pelea de los Tres Saiyajin (Latino)", title: "Dragon Ball Z La Pelea de los Tres Saiyajin", wantID: 39104, wantMovie: true, wantFound: true},
		{name: "Los 3 Grandes Super Saiyans (España)", title: "Dragon Ball Z Los Tres Grandes Super Saiyans", wantID: 39104, wantMovie: true, wantFound: true},

		// Broly 1 (1993) - TMDB 34433
		{name: "Broly The Legendary Super Saiyan (English)", title: "Dragon Ball Z Broly The Legendary Super Saiyan", wantID: 34433, wantMovie: true, wantFound: true},
		{name: "El Poder Invencible (Latino)", title: "Dragon Ball Z El Poder Invencible", wantID: 34433, wantMovie: true, wantFound: true},
		{name: "Estalla el Duelo (España)", title: "Dragon Ball Z Estalla el Duelo", wantID: 34433, wantMovie: true, wantFound: true},

		// Bojack Unbound (1993) - TMDB 39105
		{name: "Bojack Unbound (English)", title: "Dragon Ball Z Bojack Unbound", wantID: 39105, wantMovie: true, wantFound: true},
		{name: "La Galaxia Corre Peligro (Latino)", title: "Dragon Ball Z La Galaxia Corre Peligro", wantID: 39105, wantMovie: true, wantFound: true},
		{name: "Los Guerreros de Plata (España)", title: "Dragon Ball Z Los Guerreros de Plata", wantID: 39105, wantMovie: true, wantFound: true},

		// Broly 2: Second Coming (1994) - TMDB 44251
		{name: "Broly Second Coming (English)", title: "Dragon Ball Z Broly Second Coming", wantID: 44251, wantMovie: true, wantFound: true},
		{name: "El Regreso del Guerrero Legendario (Latino)", title: "Dragon Ball Z El Regreso del Guerrero Legendario", wantID: 44251, wantMovie: true, wantFound: true},
		{name: "El Regreso de Broly (Latino)", title: "Dragon Ball Z El Regreso de Broly", wantID: 44251, wantMovie: true, wantFound: true},
		{name: "El Dúo Peligroso (España)", title: "Dragon Ball Z El Duo Peligroso", wantID: 44251, wantMovie: true, wantFound: true},

		// Broly 3: Bio-Broly (1994) - TMDB 39106
		{name: "Bio-Broly (English/Latino)", title: "Dragon Ball Z Bio-Broly", wantID: 39106, wantMovie: true, wantFound: true},
		{name: "El Combate Definitivo (Latino/España)", title: "Dragon Ball Z El Combate Definitivo", wantID: 39106, wantMovie: true, wantFound: true},
		{name: "El Combate Final (Latino)", title: "Dragon Ball Z El Combate Final", wantID: 39106, wantMovie: true, wantFound: true},

		// Fusion Reborn (1995) - TMDB 39107
		{name: "Fusion Reborn (English)", title: "Dragon Ball Z Fusion Reborn", wantID: 39107, wantMovie: true, wantFound: true},
		{name: "La Fusión de Goku y Vegeta (Latino)", title: "Dragon Ball Z La Fusion de Goku y Vegeta", wantID: 39107, wantMovie: true, wantFound: true},
		{name: "El Renacer de la Fusión (España)", title: "Dragon Ball Z El Renacer de la Fusion", wantID: 39107, wantMovie: true, wantFound: true},
		{name: "Janemba", title: "Dragon Ball Z Janemba", wantID: 39107, wantMovie: true, wantFound: true},

		// Wrath of the Dragon (1995) - TMDB 39108
		{name: "Wrath of the Dragon (English)", title: "Dragon Ball Z Wrath of the Dragon", wantID: 39108, wantMovie: true, wantFound: true},
		{name: "El Ataque del Dragón (Latino)", title: "Dragon Ball Z El Ataque del Dragon", wantID: 39108, wantMovie: true, wantFound: true},
		{name: "El Golpe del Dragón (Latino)", title: "Dragon Ball Z El Golpe del Dragon", wantID: 39108, wantMovie: true, wantFound: true},
		{name: "Tapion", title: "Dragon Ball Z Tapion", wantID: 39108, wantMovie: true, wantFound: true},

		// Películas DBS
		{name: "Battle of Gods (English)", title: "Dragon Ball Z Battle of Gods", wantID: 126963, wantMovie: true, wantFound: true},
		{name: "La Batalla de los Dioses (Latino)", title: "Dragon Ball Z La Batalla de los Dioses", wantID: 126963, wantMovie: true, wantFound: true},
		{name: "Resurrection F (English)", title: "Dragon Ball Z Resurrection F", wantID: 303857, wantMovie: true, wantFound: true},
		{name: "La Resurrección de Freezer (Latino)", title: "Dragon Ball Z La Resurreccion de Freezer", wantID: 303857, wantMovie: true, wantFound: true},
		{name: "DBS Broly", title: "Dragon Ball Super Broly", wantID: 503314, wantMovie: true, wantFound: true},
		{name: "DBS Super Hero", title: "Dragon Ball Super Super Hero", wantID: 610150, wantMovie: true, wantFound: true},
		{name: "DBS Superhéroe", title: "Dragon Ball Super Superhéroe", wantID: 610150, wantMovie: true, wantFound: true},

		// Especiales y OVAs
		{name: "Father of Goku (English)", title: "Dragon Ball Z The Father of Goku", wantID: 39323, wantMovie: true, wantFound: true},
		{name: "El Padre de Goku (Latino)", title: "Dragon Ball Z El Padre de Goku", wantID: 39323, wantMovie: true, wantFound: true},
		{name: "El Último Combate (España)", title: "Dragon Ball Z El Ultimo Combate", wantID: 39323, wantMovie: true, wantFound: true},
		{name: "Especial 01 Bardock", title: "Dragon Ball Z Especial 01", wantID: 39323, wantMovie: true, wantFound: true},
		{name: "History of Trunks (English)", title: "Dragon Ball Z The History of Trunks", wantID: 39324, wantMovie: true, wantFound: true},
		{name: "La Historia de Trunks (Latino/España)", title: "Dragon Ball Z La Historia de Trunks", wantID: 39324, wantMovie: true, wantFound: true},
		{name: "Un Futuro Diferente (Latino)", title: "Dragon Ball Z Un Futuro Diferente Gohan y Trunks", wantID: 39324, wantMovie: true, wantFound: true},
		{name: "Especial 02 Trunks", title: "Dragon Ball Z Especial 02", wantID: 39324, wantMovie: true, wantFound: true},
		{name: "100 Años Después (Latino)", title: "Dragon Ball GT 100 Anos Despues", wantID: 18095, wantMovie: true, wantFound: true},
		{name: "A Hero's Legacy (English)", title: "Dragon Ball GT A Hero's Legacy", wantID: 18095, wantMovie: true, wantFound: true},
		{name: "Episode of Bardock", title: "Dragon Ball Episode of Bardock", wantID: 120475, wantMovie: true, wantFound: true},
		{name: "El Episodio de Bardock", title: "Dragon Ball El Episodio de Bardock", wantID: 120475, wantMovie: true, wantFound: true},
		{name: "Plan para Erradicar a los Super Saiyajin", title: "Dragon Ball El Plan para Erradicar a los Super Saiyajin", wantID: 55127, wantMovie: true, wantFound: true},
		{name: "Plan to Eradicate the Super Saiyans", title: "Dragon Ball Plan to Eradicate the Super Saiyans", wantID: 55127, wantMovie: true, wantFound: true},
		{name: "Goku y sus amigos regresan", title: "Dragon Ball Son Goku y sus amigos regresan", wantID: 38594, wantMovie: true, wantFound: true},

		// Películas Clásicas
		{name: "La Leyenda de Shenlong", title: "Dragon Ball La Leyenda de Shenlong", wantID: 39144, wantMovie: true, wantFound: true},
		{name: "Curse of the Blood Rubies", title: "Dragon Ball Curse of the Blood Rubies", wantID: 39144, wantMovie: true, wantFound: true},
		{name: "DB Pelicula 01", title: "Dragon Ball Pelicula 01", wantID: 39144, wantMovie: true, wantFound: true},
		{name: "La Princesa Durmiente", title: "Dragon Ball La Princesa Durmiente en el Castillo del Mal", wantID: 39145, wantMovie: true, wantFound: true},
		{name: "DB Pelicula 02", title: "Dragon Ball Pelicula 02", wantID: 39145, wantMovie: true, wantFound: true},
		{name: "Una Aventura Mística", title: "Dragon Ball Una Aventura Mistica", wantID: 116776, wantMovie: true, wantFound: true},
		{name: "DB Pelicula 03", title: "Dragon Ball Pelicula 03", wantID: 116776, wantMovie: true, wantFound: true},
		{name: "El Camino Hacia el Poder", title: "Dragon Ball El Camino Hacia el Poder", wantID: 39148, wantMovie: true, wantFound: true},
		{name: "DB Pelicula 04", title: "Dragon Ball Pelicula 04", wantID: 39148, wantMovie: true, wantFound: true},

		// Test cases based directly on user's exact file naming scheme with date prefix: (YYYY-MM-DD}
		{name: "User File - Devuelvanme a mi Gohan", title: "(1989-07-15} Dragon Ball Z - ¡Devuélvanme a mi Gohan!.mkv", wantID: 28609, wantMovie: true, wantFound: true},
		{name: "User File - El Hombre mas Fuerte", title: "(1990-03-10} Dragon Ball Z - El Hombre más Fuerte de este Mundo.mkv", wantID: 39100, wantMovie: true, wantFound: true},
		{name: "User File - La Batalla mas Grande", title: "(1990-06-07} Dragon Ball Z - La Batalla más Grande de este Mundo está por Comenzar.mkv", wantID: 39101, wantMovie: true, wantFound: true},
		{name: "User File - Goku es un Super Saiyajin", title: "(1991-03-19} Dragon Ball Z - Goku es un Super Saiyajin.mkv", wantID: 39102, wantMovie: true, wantFound: true},
		{name: "User File - Los Rivales mas Poderosos", title: "(1991-07-20} Dragon Ball Z - Los Rivales más Poderosos.mkv", wantID: 24752, wantMovie: true, wantFound: true},
		{name: "User File - Los Guerreros mas Poderosos", title: "(1992-03-07} Dragon Ball Z - Los Guerreros más Poderosos.mkv", wantID: 39103, wantMovie: true, wantFound: true},
		{name: "User File - La Pelea de los Tres Saiyajin", title: "(1992-07-11} Dragon Ball Z - La Pelea de los Tres Saiyajin.mkv", wantID: 39104, wantMovie: true, wantFound: true},
		{name: "User File - El Poder Invencible", title: "(1993-03-06} Dragon Ball Z - El Poder Invencible.mkv", wantID: 34433, wantMovie: true, wantFound: true},
		{name: "User File - La Galaxia Corre Peligro", title: "(1993-07-10} Dragon Ball Z - La Galaxia Corre Peligro.mkv", wantID: 39105, wantMovie: true, wantFound: true},
		{name: "User File - El Regreso del Guerrero Legendario", title: "(1994-03-12} Dragon Ball Z - El Regreso del Guerrero Legendario.mkv", wantID: 44251, wantMovie: true, wantFound: true},
		{name: "User File - El Combate Final", title: "(1994-07-09} Dragon Ball Z - El Combate Final.mkv", wantID: 39106, wantMovie: true, wantFound: true},
		{name: "User File - La Fusion de Goku y Vegeta", title: "(1995-03-04} Dragon Ball Z - La Fusión de Goku y Vegeta.mkv", wantID: 39107, wantMovie: true, wantFound: true},
		{name: "User File - El Ataque Del Dragon", title: "(1995-07-15} Dragon Ball Z - El Ataque Del Dragón.mkv", wantID: 39108, wantMovie: true, wantFound: true},
		{name: "User File - La batalla de los dioses", title: "(2013-03-30} Dragon Ball Z - La batalla de los dioses.mkv", wantID: 126963, wantMovie: true, wantFound: true},
		{name: "User File - La Resurreccion de Freezer", title: "(2015-04-18} Dragon Ball Z - La Resurrección de Freezer.mkv", wantID: 303857, wantMovie: true, wantFound: true},
		{name: "User File - Todos reunidos El mundo de Goku", title: "(1992-09-17} Dragon Ball Z - ¡Todos reunidos! El mundo de Gokú.mp4", wantID: 39325, wantMovie: true, wantFound: true},
		{name: "User File - Plan para Erradicar 01", title: "(1993-07-23} Dragon Ball Z - El Plan para Erradicar a los Super Saiyans - 01.mkv", wantID: 55127, wantMovie: true, wantFound: true},
		{name: "User File - Plan para Erradicar 02", title: "(1993-07-23} Dragon Ball Z - El Plan para Erradicar a los Super Saiyans - 02.mkv", wantID: 55127, wantMovie: true, wantFound: true},
		{name: "User File - Plan para Erradicar Final Alternativo", title: "(1994-12-16} Dragon Ball Z - El Plan para Erradicar a los Super Saiyans (Final alternativo).mp4", wantID: 55127, wantMovie: true, wantFound: true},
		{name: "User File - Goku y sus amigos regresan", title: "(2008-09-21} Dragon Ball Z - Goku y sus amigos regresan.mkv", wantID: 38594, wantMovie: true, wantFound: true},
		{name: "User File - Plan para erradicar remake", title: "(2010-11-11} Dragon Ball Z - El plan para erradicar a los Saiyajins (remake).mkv", wantID: 55127, wantMovie: true, wantFound: true},
		{name: "User File - Bardock El legendario Super Saiyajin", title: "(2011-12-17} Dragon Ball Z - Bardock El legendario Super Saiyajin.mkv", wantID: 120475, wantMovie: true, wantFound: true},
		{name: "User File - La Batalla de Freezer contra el Padre de Goku", title: "(1990-10-17} Dragon Ball Z - La Batalla de Freezer contra el Padre de Goku.mkv", wantID: 39323, wantMovie: true, wantFound: true},
		{name: "User File - Los dos Guerreros del Futuro Gohan y Trunks", title: "(1993-02-24} Dragon Ball Z - Los dos Guerreros del Futuro Gohan y Trunks.mkv", wantID: 39324, wantMovie: true, wantFound: true},
		{name: "User File - Te lo mostramos todo Olvida el ano con DBZ", title: "(1993-12-31} Dragon Ball Z - ¡Te lo mostramos todo - Olvida el año con Dragon Ball Z!.avi", wantID: 39326, wantMovie: true, wantFound: true},
		{name: "User File - Los Aventureros de la Esfera del Panico Regresan", title: "(2004-07-17} Dragon Ball Z - Los Aventureros de la Esfera del Pánico Regresan.mp4", wantID: 105973, wantMovie: true, wantFound: true},
		{name: "User File - Toriko One Piece Y DBZ Especial colaboracion", title: "(2013-04-07} Dragon Ball Z - Toriko One Piece Y DBZ Especial colaboracion.MP4", wantID: 444390, wantMovie: true, wantFound: true},
		{name: "Peliculas folder plural DBZ 08", title: "Dragon Ball Z Peliculas 08 - Broly", wantID: 34433, wantMovie: true, wantFound: true},
		{name: "Movie hash DBZ 12", title: "Dragon Ball Z Movie #12 - Fusion", wantID: 39107, wantMovie: true, wantFound: true},
		{name: "Classic Peliculas 01", title: "Dragon Ball Peliculas 01 - Shenlong", wantID: 39144, wantMovie: true, wantFound: true},
		{name: "DBS Super Hero Title", title: "Dragon Ball Super: Super Hero (2022)", wantID: 610150, wantMovie: true, wantFound: true},
		{name: "DBS Broly Title", title: "Dragon Ball Super: Broly (2018)", wantID: 503314, wantMovie: true, wantFound: true},
		{name: "GT 100 Años Despues Title", title: "Dragon Ball GT - 100 Años Después (1997)", wantID: 18095, wantMovie: true, wantFound: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			id, isMovie, found := ResolveDragonBallID(tt.title)
			if found != tt.wantFound {
				t.Errorf("ResolveDragonBallID(%q) found = %t, want %t", tt.title, found, tt.wantFound)
			}
			if id != tt.wantID {
				t.Errorf("ResolveDragonBallID(%q) id = %d, want %d", tt.title, id, tt.wantID)
			}
			if isMovie != tt.wantMovie {
				t.Errorf("ResolveDragonBallID(%q) isMovie = %t, want %t", tt.title, isMovie, tt.wantMovie)
			}
		})
	}
}

func TestGetDragonBallSagas(t *testing.T) {
	sagas := GetDragonBallSagas(12971) // Dragon Ball Z TMDB ID
	if len(sagas) == 0 {
		t.Fatalf("expected DBZ sagas, got none")
	}

	// Verify key milestone episode alignments according to TMDB overall numbering
	milestoneTests := []struct {
		episode  int
		wantSaga string
	}{
		{episode: 23, wantSaga: "saiyajin"},   // Muerte de Yamcha
		{episode: 24, wantSaga: "saiyajin"},   // Muerte de Tien y Chaoz
		{episode: 95, wantSaga: "freezer"},    // Despertar del Super Saiyajin (Goku vs Freezer)
		{episode: 232, wantSaga: "majin-buu"}, // Saga de Majin Buu
	}

	for _, tt := range milestoneTests {
		var foundSaga string
		for _, s := range sagas {
			if tt.episode >= s.startEp && tt.episode <= s.endEp {
				foundSaga = s.id
				break
			}
		}
		if foundSaga != tt.wantSaga {
			t.Errorf("episode %d: got saga %q, want %q", tt.episode, foundSaga, tt.wantSaga)
		}
	}
}

func TestGetDragonBallSagaInfo(t *testing.T) {
	sagasInfo := GetDragonBallSagaInfo(12971)
	if len(sagasInfo) == 0 {
		t.Fatalf("expected DBZ saga info, got none")
	}

	var foundSaiyajin bool
	for _, s := range sagasInfo {
		if s.ID == "saiyajin" {
			foundSaiyajin = true
			if s.StartEp != 1 || s.EndEp != 35 {
				t.Errorf("expected Saiyajin saga eps 1-35, got %d-%d", s.StartEp, s.EndEp)
			}
		}
	}
	if !foundSaiyajin {
		t.Errorf("expected to find Saiyajin saga in info")
	}
}
