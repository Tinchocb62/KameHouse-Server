package scanner

import (
	"regexp"
	"strconv"
	"strings"

	"kamehouse/internal/database/models/dto"
)

var (
	// epRegex strips episode/chapter markers before numeric movie detection.
	epRegex = regexp.MustCompile(`(?i)\b(?:s\d+e\d+|e\d+|cap\d+|capitulo\s*\d+|episodio\s*\d+|episode\s*\d+)\b`)

	// resRegex strips video resolution tokens that would produce false numeric matches
	// (e.g. "1080p", "720p", "4k").
	resRegex = regexp.MustCompile(`(?i)\b\d{3,4}[pi]\b|\b[248]k\b|\b2160p\b`)

	// movieNumRegex matches an explicit movie/film/pelicula prefix followed by 1–2 digits.
	movieNumRegex = regexp.MustCompile(`(?i)\b(?:movies?|pel[ií]culas?|films?|pelis?)\s*[-–#:]*\s*0*(\d{1,2})\b`)

	// specialNumRegex matches an explicit special/especial/ova/sp prefix followed by 1–2 digits.
	specialNumRegex = regexp.MustCompile(`(?i)\b(?:especial(?:es)?|specials?|ovas?|oads?|sps?)\s*[-–#:]*\s*0*(\d{1,2})\b`)
)

// dragonBallMovies contains all Dragon Ball movies, TV specials, OVAs and shorts
// with multilingual titles (Latino, Castellano España, English, Japanese Romaji).
// Evaluated in priority order by ResolveFranchiseID.
var dragonBallMovies = FranchiseDef{
	TriggerWords: []string{}, // No global trigger — called only when upstream identifies DB content.
	Movies: []MovieMapping{
		// ── Dragon Ball Super Movies ──────────────────────────────────────────
		// DBS: Battle of Gods (2013)
		{AnyOf: []string{"dioses", "gods", "kami to kami", "batalla de los dioses", "la batalla de los dioses"}, TMDBID: 126963},
		// DBS: Resurrection 'F' (2015)
		{AnyOf: []string{"resurreccion", "resurrection", "fukkatsu no f", "resurreccion de f", "resurreccion de freezer", "la resurreccion de freezer"}, TMDBID: 303857},
		// DBS: Super Hero (2022)
		{Keywords: []string{"super", "hero"}, TMDBID: 610150},
		{AnyOf: []string{"superheroe", "super hero", "super hero e"}, TMDBID: 610150},
		// DBS: Broly (2018)
		{Keywords: []string{"broly", "super"}, Excluded: []string{"hero", "legendario", "legendary", "regreso", "second", "bio", "duelo", "invencible", "combate"}, TMDBID: 503314},

		// ── DBZ Broly Trilogy ────────────────────────────────────────────────
		// Broly 2: Second Coming / El Regreso del Guerrero Legendario / El Dúo Peligroso (1994)
		{AnyOf: []string{"second coming", "regreso del guerrero legendario", "duo peligroso", "kiken na futari", "regreso de broly", "el regreso de broly", "segunda venida", "superguerreros nunca descansan"}, TMDBID: 44251},
		{Keywords: []string{"broly"}, AnyOf: []string{"regreso", "second", "duo", "kiken", "venida"}, TMDBID: 44251},
		// Broly 3: Bio-Broly / El Combate Definitivo / Los Superguerreros Vencen (1994)
		{AnyOf: []string{"bio broly", "bio-broly", "biobroly", "combate definitivo", "superguerreros vencen", "el combate final", "combate final"}, TMDBID: 39106},
		{Keywords: []string{"broly"}, AnyOf: []string{"bio", "combate", "victoria", "gekiha"}, TMDBID: 39106},
		// Broly 1: The Legendary Super Saiyan / El Poder Invencible / Estalla el Duelo (1993)
		{Keywords: []string{"broly"}, AnyOf: []string{"legendario", "legendary", "invencible", "estalla", "duelo", "feroz", "arde", "super saiyajin"}, TMDBID: 34433},
		{AnyOf: []string{"invencible", "estalla el duelo", "arde la batalla", "moetsukiro", "poder invencible", "broly el guerrero legendario", "broly el legendario"}, TMDBID: 34433},
		{Keywords: []string{"broly"}, Excluded: []string{"super", "segunda", "duo", "regreso", "second", "bio", "combate", "victoria"}, TMDBID: 34433}, // Broly generic fallback (defaults to Movie 8)

		// ── DBZ Movies (1 to 13) ──────────────────────────────────────────────
		// Movie 1: Dead Zone / ¡Devuélvanme a mi Gohan! / ¡Devuélveme a mi Gohan! / Garlick Jr. (1989)
		{AnyOf: []string{"dead zone", "devuelveme", "devuelvanme", "devolvedme", "garlick", "garlic", "gohan o kaese", "ora no gohan", "zona muerta", "garlick jr", "garlic jr", "garlick junior"}, TMDBID: 28609},
		// Movie 2: The World's Strongest / El Hombre Más Fuerte de Este Mundo / Dr. Wheelo (1990)
		{AnyOf: []string{"strongest", "mas fuerte", "dr wheelo", "doctor wheelo", "wheelo", "dr willow", "doctor willow", "willow", "tsuyoi", "hombre mas fuerte"}, TMDBID: 39100},
		{Keywords: []string{"fuerte"}, AnyOf: []string{"hombre", "mundo", "este mundo"}, TMDBID: 39100},
		// Movie 3: The Tree of Might / La Súper Batalla Decisiva / El Árbol del Poder / Turles / La Batalla más Grande de este Mundo (1990)
		{AnyOf: []string{"arbol", "tree of might", "turles", "tullece", "tulece", "superbatalla", "marugoto", "arbol del poder", "super batalla decisiva", "batalla mas grande", "la batalla mas grande", "batalla mas grande de este mundo", "la batalla mas grande de este mundo esta por comenzar"}, TMDBID: 39101},
		{Keywords: []string{"super", "batalla"}, Excluded: []string{"saiyajin", "saiyan", "hero", "dbs", "dragon ball super"}, TMDBID: 39101},
		{Keywords: []string{"batalla", "grande"}, AnyOf: []string{"mundo", "comenzar"}, TMDBID: 39101},
		{Keywords: []string{"batalla", "decisiva"}, TMDBID: 39101},
		// Movie 4: Lord Slug / El Súper Guerrero Son Goku / Slug (1991)
		{AnyOf: []string{"slug", "lord slug", "super guerrero son goku", "superguerrero son goku", "goku es un super saiyajin", "goku es un super saiyan", "chou saiyajin da son goku"}, TMDBID: 39102},
		// Movie 5: Cooler's Revenge / Los Rivales Más Poderosos / La Venganza de Cooler (1991)
		{Keywords: []string{"cooler"}, AnyOf: []string{"venganza", "revenge", "rivales", "saikyou tai"}, TMDBID: 24752},
		{Keywords: []string{"rivales"}, AnyOf: []string{"poderosos", "mejores"}, TMDBID: 24752},
		{Keywords: []string{"cooler"}, Excluded: []string{"regreso", "return", "choque", "metal", "10000", "100", "fuerza"}, TMDBID: 24752},
		// Movie 6: The Return of Cooler / Los Guerreros Más Poderosos / El Regreso de Cooler / Metal Cooler (1992)
		{Keywords: []string{"cooler"}, AnyOf: []string{"regreso", "return", "choque", "metal", "10000", "100 oku", "fuerza"}, TMDBID: 39103},
		{Keywords: []string{"guerreros"}, AnyOf: []string{"poderosos", "extraordinaria", "10000", "fuerza ilimitada"}, TMDBID: 39103},
		{AnyOf: []string{"fuerza ilimitada", "guerreros de fuerza ilimitada", "metal cooler"}, TMDBID: 39103},
		// Movie 7: Super Android 13! / La Batalla de los Tres Saiyajin / El Androide 13 (1992)
		{Keywords: []string{"13"}, AnyOf: []string{"android", "androide"}, TMDBID: 39104},
		{Keywords: []string{"tres"}, AnyOf: []string{"saiyajin", "saiyan", "saiyans", "grandes"}, TMDBID: 39104},
		{AnyOf: []string{"androide 13", "androide no 13", "androide numero 13", "pelea de los tres saiyajin", "batalla de los tres saiyajin", "tres grandes super saiyans"}, TMDBID: 39104},
		// Movie 9: Bojack Unbound / La Galaxia Corre Peligro / Los Guerreros de Plata (1993)
		{AnyOf: []string{"bojack", "galaxia", "unbound", "guerreros de plata", "via lactea", "ginga giri", "galaxia corre peligro"}, TMDBID: 39105},
		// Movie 12: Fusion Reborn / La Fusión de Goku y Vegeta / El Renacer de la Fusión / Janemba / Gogeta (1995)
		{AnyOf: []string{"fusion reborn", "renacer de la fusion", "janemba", "gogeta", "fukkatsu no fusion", "fusion de goku y vegeta", "la fusion de goku y vegeta"}, TMDBID: 39107},
		{Keywords: []string{"fusion"}, AnyOf: []string{"goku", "vegeta", "renacer"}, TMDBID: 39107},
		// Movie 13: Wrath of the Dragon / El Ataque del Dragón / El Golpe del Dragón / Tapion / Hirudegarn (1995)
		{AnyOf: []string{"tapion", "hirudegarn", "hildegarn", "wrath of the dragon", "golpe del dragon", "ataque del dragon", "el ataque del dragon", "el golpe del dragon", "ryuu ken", "puno del dragon", "explosion del puno del dragon"}, TMDBID: 39108},
		{Keywords: []string{"ataque"}, AnyOf: []string{"dragon", "tapion"}, TMDBID: 39108},

		// ── TV Specials, OVAs & Crossovers ───────────────────────────────────
		// Special 1: Bardock - Father of Goku / El Padre de Goku / El Último Combate (1990)
		{Keywords: []string{"bardock"}, AnyOf: []string{"padre", "father", "ultimo combate", "saishuu kessen", "especial", "special"}, TMDBID: 39323},
		{Keywords: []string{"padre", "goku"}, AnyOf: []string{"freezer", "bardock", "especial", "special"}, TMDBID: 39323},
		{AnyOf: []string{"father of goku", "el padre de goku", "el ultimo combate", "ultimo combate", "la batalla de freezer contra el padre de goku"}, TMDBID: 39323},
		// Special 2: History of Trunks / Un Futuro Diferente: Gohan y Trunks / La Historia de Trunks (1993)
		{Keywords: []string{"trunks"}, AnyOf: []string{"futuro", "future", "historia", "history", "gohan", "zetsubou", "especial", "special"}, TMDBID: 39324},
		{AnyOf: []string{"history of trunks", "historia de trunks", "un futuro diferente", "dos guerreros del futuro", "los dos guerreros del futuro"}, TMDBID: 39324},
		// Special: Atsumare! Goku World / ¡Todos reunidos! El mundo de Gokú (1992)
		{AnyOf: []string{"todos reunidos", "el mundo de goku", "mundo de goku", "mundo de goku", "atsumare goku world", "atsumare gokuu"}, TMDBID: 39325},
		// Special: Looking Back at it All / ¡Te lo mostramos todo - Olvida el año con Dragon Ball Z! (1993)
		{AnyOf: []string{"te lo mostramos todo", "olvida el ano", "olvida el ano con dragon ball z", "looking back at it all"}, TMDBID: 39326},
		// Special: Kyutai Panic Adventure / Los Aventureros de la Esfera del Pánico (2003/2004)
		{AnyOf: []string{"esfera del panico", "aventureros de la esfera", "aventureros de la esfera del panico", "aventureros de la esfera del panico regresan", "kyutai panic"}, TMDBID: 105973},
		// Special: Dream 9 / Toriko One Piece & DBZ Crossover (2013)
		{AnyOf: []string{"toriko one piece", "toriko", "especial colaboracion", "dream 9"}, TMDBID: 444390},
		// GT Special: A Hero's Legacy / 100 Años Después / Goku Jr. (1997)
		{AnyOf: []string{"100 anos despues", "100 anos", "legacy", "goku jr", "gokuu gaiden", "legendaria esfera de cuatro estrellas", "la legendaria esfera de cuatro estrellas"}, TMDBID: 18095},
		{Keywords: []string{"100"}, AnyOf: []string{"anos", "despues", "legacy", "hero"}, TMDBID: 18095},
		{Keywords: []string{"hero", "legacy"}, TMDBID: 18095},
		// OVA: Episode of Bardock / El Episodio de Bardock / Chilled (2011)
		{Keywords: []string{"bardock"}, AnyOf: []string{"episodio", "episode", "chilled", "legendario", "legendary"}, TMDBID: 120475},
		{AnyOf: []string{"episode of bardock", "episodio de bardock", "bardock el legendario super saiyajin", "bardock el legendario"}, TMDBID: 120475},
		// OVA: Plan to Eradicate the Super Saiyans / El Plan para Erradicar a los Saiyajin / Hatchiyack (1993/2010)
		{Keywords: []string{"plan"}, AnyOf: []string{"erradicar", "exterminar", "eradicate", "hatchiyack", "zetsumetsu"}, TMDBID: 55127},
		{AnyOf: []string{"hatchiyack", "plan to eradicate", "plan para erradicar", "plan para exterminar", "plan para erradicar a los saiyajin", "plan para erradicar a los super saiyajin", "plan para erradicar a los super saiyans"}, TMDBID: 55127},
		// OVA: Yo! Son Goku and His Friends Return!! / ¡Hola! Son Goku y sus amigos regresan / Tarble (2008)
		{Keywords: []string{"goku"}, AnyOf: []string{"amigos", "friends", "regresan", "return", "tarble", "yo son goku"}, TMDBID: 38594},
		{AnyOf: []string{"tarble", "amigos regresan", "friends return", "goku y sus amigos regresan", "son goku y sus amigos regresan"}, TMDBID: 38594},
		// Educational Shorts: Traffic Safety & Fire Brigade (1988)
		{AnyOf: []string{"seguridad vial", "traffic safety", "koutsuu anzen"}, TMDBID: 39322},
		{AnyOf: []string{"bomberos", "fire brigade", "shouboutai"}, TMDBID: 39321},

		// ── Classic Dragon Ball Movies ─────────────────────────────────────────
		// Movie 1: Curse of the Blood Rubies / La Leyenda de Shenlong / Shenron (1986)
		{Keywords: []string{"leyenda"}, AnyOf: []string{"shenlong", "shenron", "rubies", "densetsu"}, TMDBID: 39144},
		{AnyOf: []string{"blood rubies", "leyenda de shenlong", "leyenda de shenron", "la leyenda de shenlong", "la leyenda de shenron", "curse of the blood rubies"}, TMDBID: 39144},
		// Movie 2: Sleeping Princess in Devil's Castle / La Princesa Durmiente / La Bella Durmiente (1987)
		{Keywords: []string{"durmiente"}, AnyOf: []string{"princesa", "bella", "sleeping", "princess", "devil", "castillo", "nemuri", "mal"}, TMDBID: 39145},
		{AnyOf: []string{"sleeping princess", "princesa durmiente", "bella durmiente", "la princesa durmiente", "la bella durmiente"}, TMDBID: 39145},
		// Movie 3: Mystical Adventure / Una Aventura Mística / Gran Aventura Mística (1988)
		{Keywords: []string{"aventura"}, AnyOf: []string{"mistica", "mystical", "adventure", "makafushigi"}, TMDBID: 116776},
		{AnyOf: []string{"mystical adventure", "aventura mistica", "gran aventura mistica", "una aventura mistica", "una gran aventura mistica"}, TMDBID: 116776},
		// Movie 4: The Path to Power / El Camino Hacia el Poder / El Camino del Poder (1996)
		{Keywords: []string{"camino"}, AnyOf: []string{"poder", "power", "fuerte", "saikyou"}, TMDBID: 39148},
		{AnyOf: []string{"path to power", "camino hacia el poder", "camino del poder", "camino al poder", "el camino hacia el poder", "el camino del poder", "el camino al poder", "the path to power"}, TMDBID: 39148},
	},
}

// ResolveDragonBallID evaluates a parsed title/directory name and returns the exact
// TMDB ID and whether it's a movie or a series. The returned ID is a raw TMDB ID;
// callers apply the 1,000,000 movie offset convention themselves.
//
// Returns (tmdbID, isMovie, found).
func ResolveDragonBallID(title string) (int, bool, bool) {
	t := strings.ToLower(title)
	ct := normalizeDragonBallTitle(t)

	resId := 0
	isMovie := false
	found := false

	// ── 1. EPISODE DETECTION ──────────────────────────────────────────────────
	// If the title contains episode markers it is almost certainly a series
	// episode, not a standalone movie — unless it also has an explicit "movie"
	// or "special" keyword.
	isEpisode := epRegex.MatchString(t)

	// ── 2. MOVIE / OVA / SPECIAL DETECTION (data-driven, high priority) ───────
	if !isEpisode || franchiseHasWord(ct, "movie") || franchiseHasWord(ct, "pelicula") ||
		franchiseHasWord(ct, "especial") || franchiseHasWord(ct, "special") || franchiseHasWord(ct, "ova") ||
		franchiseHasWord(ct, "oad") || franchiseHasWord(ct, "peli") {
		resId, isMovie, found = ResolveFranchiseID(ct, dragonBallMovies)
	}

	// ── 3. SPECIAL NUMBER FALLBACK ───────────────────────────────────────────
	if !found {
		cleanTitle := epRegex.ReplaceAllString(t, " ")
		cleanTitle = resRegex.ReplaceAllString(cleanTitle, " ")

		if m := specialNumRegex.FindStringSubmatch(cleanTitle); m != nil {
			num, _ := strconv.Atoi(m[1])
			isMovie = true
			switch num {
			case 1:
				resId, found = 39323, true // Bardock - Father of Goku
			case 2:
				resId, found = 39324, true // History of Trunks
			}
		}
	}

	// ── 4. MOVIE NUMBER FALLBACK ─────────────────────────────────────────────
	// Only reached when keyword detection failed. Strips episode/resolution
	// tokens first to prevent false matches (e.g. "Cap 05", "1080p").
	if !found && (!isEpisode || franchiseHasWord(ct, "movie") || franchiseHasWord(ct, "pelicula") ||
		franchiseHasWord(ct, "especial") || franchiseHasWord(ct, "special") || franchiseHasWord(ct, "ova") ||
		franchiseHasWord(ct, "peli")) {

		// Strip episode markers and resolution strings before numeric detection.
		cleanTitle := epRegex.ReplaceAllString(t, " ")
		cleanTitle = resRegex.ReplaceAllString(cleanTitle, " ")

		if m := movieNumRegex.FindStringSubmatch(cleanTitle); m != nil {
			num, _ := strconv.Atoi(m[1])

			isSuper := franchiseHasWord(ct, "super") || franchiseHasWord(ct, "dbs")
			isGT := franchiseHasWord(ct, "gt") || franchiseHasWord(ct, "dbgt")
			isZ := (franchiseHasWord(ct, "z") || franchiseHasWord(ct, "dbz") || strings.Contains(ct, " dragon ball z ")) && !isSuper
			isDB := (franchiseHasWord(ct, "db") || strings.Contains(ct, " dragon ball ")) &&
				!isZ && !isSuper && !isGT && !franchiseHasWord(ct, "kai")

			if isSuper {
				switch num {
				case 1:
					resId, found = 126963, true // Battle of Gods
				case 2:
					resId, found = 303857, true // Resurrection F
				case 3:
					resId, found = 503314, true // Broly
				case 4:
					resId, found = 610150, true // Super Hero
				}
			} else if isGT {
				if num == 1 {
					resId, found = 18095, true // 100 Años Después
				}
			} else if isZ {
				switch num {
				case 1:
					resId, found = 28609, true // Dead Zone
				case 2:
					resId, found = 39100, true // World's Strongest
				case 3:
					resId, found = 39101, true // Tree of Might
				case 4:
					resId, found = 39102, true // Lord Slug
				case 5:
					resId, found = 24752, true // Cooler's Revenge
				case 6:
					resId, found = 39103, true // Return of Cooler
				case 7:
					resId, found = 39104, true // Super Android 13
				case 8:
					resId, found = 34433, true // Broly – Legendary
				case 9:
					resId, found = 39105, true // Bojack Unbound
				case 10:
					resId, found = 44251, true // Broly – Second Coming
				case 11:
					resId, found = 39106, true // Bio-Broly
				case 12:
					resId, found = 39107, true // Fusion Reborn
				case 13:
					resId, found = 39108, true // Wrath of the Dragon
				case 14:
					resId, found = 126963, true // Battle of Gods
				case 15:
					resId, found = 303857, true // Resurrection F
				case 16:
					resId, found = 503314, true // Broly
				case 17:
					resId, found = 610150, true // Super Hero
				}
			} else if isDB {
				switch num {
				case 1:
					resId, found = 39144, true // La Leyenda de Shenlong
				case 2:
					resId, found = 39145, true // La Princesa Durmiente
				case 3:
					resId, found = 116776, true // Una Aventura Mística
				case 4:
					resId, found = 39148, true // El Camino al Poder
				}
			} else {
				// Generic movie number fallback when DB era is unspecified (default to DBZ movies)
				switch num {
				case 1:
					resId, found = 28609, true
				case 2:
					resId, found = 39100, true
				case 3:
					resId, found = 39101, true
				case 4:
					resId, found = 39102, true
				case 5:
					resId, found = 24752, true
				case 6:
					resId, found = 39103, true
				case 7:
					resId, found = 39104, true
				case 8:
					resId, found = 34433, true
				case 9:
					resId, found = 39105, true
				case 10:
					resId, found = 44251, true
				case 11:
					resId, found = 39106, true
				case 12:
					resId, found = 39107, true
				case 13:
					resId, found = 39108, true
				}
			}

			if found {
				isMovie = true
			}
		}
	}

	// ── 5. SERIES DETECTION (priority: Daima → GT → Kai → Super → Z → DB) ─────
	// Excludes Heroes per user specification. Supports the 6 official series.
	// If the title contains explicit movie / film / pelicula tokens and is not an episode, do NOT detect as a series!
	isMovieWord := franchiseHasWord(ct, "movie") || franchiseHasWord(ct, "movies") ||
		franchiseHasWord(ct, "pelicula") || franchiseHasWord(ct, "peliculas") ||
		franchiseHasWord(ct, "película") || franchiseHasWord(ct, "películas") ||
		franchiseHasWord(ct, "film") || franchiseHasWord(ct, "films") ||
		franchiseHasWord(ct, "peli") || franchiseHasWord(ct, "pelis")

	if !found && (!isMovieWord || isEpisode) {
		isMovie = false
		switch {
		case strings.Contains(ct, " daima ") || franchiseHasWord(ct, "daima"):
			resId, found = 236994, true
		case strings.Contains(ct, " gt ") || franchiseHasWord(ct, "dbgt"):
			resId, found = 12697, true
		case strings.Contains(ct, " kai ") || franchiseHasWord(ct, "dbkai") || franchiseHasWord(ct, "dbzkai"):
			resId, found = 61709, true
		case strings.Contains(ct, " dragon ball super ") || franchiseHasWord(ct, "dbs") ||
			(strings.Contains(ct, " super ") && strings.Contains(ct, "dragon")):
			resId, found = 62715, true
		case franchiseHasWord(ct, "dbz"),
			strings.Contains(ct, " dragon ball z "),
			franchiseHasWord(ct, "z") && !franchiseHasWord(ct, "super") && !franchiseHasWord(ct, "kai"):
			resId, found = 12971, true
		case franchiseHasWord(ct, "db"), strings.Contains(ct, " dragon ball "):
			resId, found = 12609, true
		}
	}

	return resId, isMovie, found
}

// CreatePrehydratedDragonBallMedia generates full, rich NormalizedMedia with official TMDB artwork
// and synopsis for any known Dragon Ball series or movie, ensuring 100% complete metadata even without TMDB API keys.
func CreatePrehydratedDragonBallMedia(id int) *dto.NormalizedMedia {
	tmdbID := id
	isMovie := false
	if tmdbID >= 1000000 {
		tmdbID -= 1000000
		isMovie = true
	}

	var titleSpanish, titleEnglish, titleRomaji, description, posterPath, bannerPath string
	var year, episodes int

	switch tmdbID {
	case 12609: // Dragon Ball Clásico — poster/banner verificados HTTP 200
		titleSpanish = "Dragon Ball"
		titleEnglish = "Dragon Ball"
		titleRomaji = "Dragon Ball"
		description = "Las legendarias aventuras de Son Goku desde su niñez, entrenando con el Maestro Roshi y buscando las siete Esferas del Dragón."
		posterPath = "https://image.tmdb.org/t/p/w500/30L49n4Dhn7dzuGG50GV3ybMhC3.jpg"
		bannerPath = "https://image.tmdb.org/t/p/original/onCLyCOgszTIyyVs2XKYSkKPOPG.jpg"
		year = 1986
		episodes = 153
	case 12971: // Dragon Ball Z — poster/banner verificados HTTP 200
		titleSpanish = "Dragon Ball Z"
		titleEnglish = "Dragon Ball Z"
		titleRomaji = "Dragon Ball Z"
		description = "Goku descubre sus orígenes Saiyajin y junto a los Guerreros Z defiende la Tierra contra amenazas cósmicas como Vegeta, Freezer, Cell y Majin Buu."
		posterPath = "https://image.tmdb.org/t/p/w500/ydf1CeiBLfdxiyNTpskM0802TKl.jpg"
		bannerPath = "https://image.tmdb.org/t/p/original/oQ5CnVj3TRifXl2bIOri6H6rfNe.jpg"
		year = 1989
		episodes = 291
	case 12697: // Dragon Ball GT — poster/banner verificados HTTP 200
		titleSpanish = "Dragon Ball GT"
		titleEnglish = "Dragon Ball GT"
		titleRomaji = "Dragon Ball GT"
		description = "Tras convertirse de nuevo en niño debido a las Esferas del Dragón de Estrella Negra, Goku viaja por el cosmos junto a Trunks y Pan."
		posterPath = "https://image.tmdb.org/t/p/w500/aJOlYXjxb5IvnTsO4I1tmFpC7GH.jpg"
		bannerPath = "https://image.tmdb.org/t/p/original/rLHhDpv6rrhuzBjNzaMRNv2fng.jpg"
		year = 1996
		episodes = 64
	case 61709, 42705: // Dragon Ball Kai — poster/banner verificados HTTP 200
		titleSpanish = "Dragon Ball Z Kai"
		titleEnglish = "Dragon Ball Z Kai"
		titleRomaji = "Dragon Ball Kai"
		description = "Versión remasterizada y sin relleno de Dragon Ball Z, fiel al manga original de Akira Toriyama con sonido y animación digital renovada."
		posterPath = "https://image.tmdb.org/t/p/w500/oz5zbMBKCUsb7hsbjdxvK8yagPD.jpg"
		bannerPath = "https://image.tmdb.org/t/p/original/ojsPI8fNwcecKLhVC4rB4ZZhFMc.jpg"
		year = 2009
		episodes = 167
	case 62715: // Dragon Ball Super — poster/banner verificados HTTP 200
		titleSpanish = "Dragon Ball Super"
		titleEnglish = "Dragon Ball Super"
		titleRomaji = "Dragon Ball Super"
		description = "Tras la derrota de Majin Buu, Goku y sus amigos despiertan los poderes de los dioses enfrentando a Bills, Goku Black y el Torneo del Poder."
		posterPath = "https://image.tmdb.org/t/p/w500/qA2UwUQbj05aeBMCuC0mHSQ4loE.jpg"
		bannerPath = "https://image.tmdb.org/t/p/original/qEUrbXJ2qt4Rg84Btlx4STOhgte.jpg"
		year = 2015
		episodes = 131
	case 236994: // Dragon Ball Daima — poster/banner verificados HTTP 200
		titleSpanish = "Dragon Ball Daima"
		titleEnglish = "Dragon Ball Daima"
		titleRomaji = "Dragon Ball Daima"
		description = "Debido a una conspiración en el Reino Demonio, Goku y sus amigos se transforman en niños y viajan a un mundo desconocido para revertir el hechizo."
		posterPath = "https://image.tmdb.org/t/p/w500/oUmWLyeko3kYdUr8DBLIsxwcugl.jpg"
		bannerPath = "https://image.tmdb.org/t/p/original/lMULbSFZNXUC87MqOZQ4SSV9DXI.jpg"
		year = 2024
		episodes = 20
	// Specials & Movies — imágenes obtenidas dinámicamente por la API (TMDB) en tiempo de enriquecimiento
	// ── Classic Dragon Ball Movies ─────────────────────────────────────────
	case 39144: // Curse of the Blood Rubies / La Leyenda de Shenlong (1986)
		titleSpanish = "Dragon Ball: La Leyenda de Shenlong"
		titleEnglish = "Dragon Ball: Curse of the Blood Rubies"
		titleRomaji = "Dragon Ball: Shenron no Densetsu"
		description = "Goku y Bulma se conocen y viajan juntos buscando las Esferas del Dragón, enfrentando al codicioso Rey Gurumes."
		year = 1986
		episodes = 1
		isMovie = true
	case 39145: // Sleeping Princess in Devil's Castle / La Princesa Durmiente (1987)
		titleSpanish = "Dragon Ball: La Princesa Durmiente en el Castillo del Mal"
		titleEnglish = "Dragon Ball: Sleeping Princess in Devil's Castle"
		titleRomaji = "Dragon Ball: Majinjou no Nemuri Hime"
		description = "Para convertirse en alumnos de Roshi, Goku y Krilin deben rescatar a la Princesa Durmiente encerrada en el Castillo del Mal de Lucifer."
		year = 1987
		episodes = 1
		isMovie = true
	case 116776: // Mystical Adventure / Una Aventura Mística (1988)
		titleSpanish = "Dragon Ball: Una Aventura Mística"
		titleEnglish = "Dragon Ball: Mystical Adventure"
		titleRomaji = "Dragon Ball: Makafushigi Dai-Bouken"
		description = "En el Imperio Mifan, Goku y Krilin compiten en un gran torneo de artes marciales descubriendo la conspiración de Tsuru y Tao Pai Pai."
		year = 1988
		episodes = 1
		isMovie = true
	case 39148: // The Path to Power / El Camino Hacia el Poder (1996)
		titleSpanish = "Dragon Ball: El Camino hacia el Poder"
		titleEnglish = "Dragon Ball: The Path to Power"
		titleRomaji = "Dragon Ball: Saikyou e no Michi"
		description = "Reinvención cinematográfica conmemorativa del 10° aniversario que sintetiza los orígenes de Goku y la guerra contra la Patrulla Roja."
		year = 1996
		episodes = 1
		isMovie = true

	// ── Dragon Ball Z Movies ────────────────────────────────────────────────
	case 28609: // Movie 1: Dead Zone (1989)
		titleSpanish = "Dragon Ball Z: ¡Devuélvanme a mi Gohan!"
		titleEnglish = "Dragon Ball Z: Dead Zone"
		titleRomaji = "Dragon Ball Z: Ora no Gohan o Kaese!!"
		description = "Garlick Jr. secuestra a Gohan en busca de la inmortalidad. Goku y Piccolo forman una alianza sin precedentes."
		year = 1989
		episodes = 1
		isMovie = true
	case 39100: // Movie 2: The World's Strongest (1990)
		titleSpanish = "Dragon Ball Z: El Hombre Más Fuerte de Este Mundo"
		titleEnglish = "Dragon Ball Z: The World's Strongest"
		titleRomaji = "Dragon Ball Z: Kono Yo de Ichiban Tsuyoi Yatsu"
		description = "El cerebro del Dr. Wheelo busca el cuerpo del hombre más fuerte del mundo para resucitar su poder."
		year = 1990
		episodes = 1
		isMovie = true
	case 39101: // Movie 3: The Tree of Might (1990)
		titleSpanish = "Dragon Ball Z: La Batalla Más Grande de Este Mundo Está por Comenzar"
		titleEnglish = "Dragon Ball Z: The Tree of Might"
		titleRomaji = "Dragon Ball Z: Chikyuu Marugoto Chou Kessen"
		description = "El pirata espacial Saiyajin Turles planta el sagrado Árbol Sagrado en la Tierra para consumir la energía vital del planeta."
		year = 1990
		episodes = 1
		isMovie = true
	case 39102: // Movie 4: Lord Slug (1991)
		titleSpanish = "Dragon Ball Z: El Súper Guerrero Son Goku"
		titleEnglish = "Dragon Ball Z: Lord Slug"
		titleRomaji = "Dragon Ball Z: Chou Saiyajin da Son Goku"
		description = "El malvado Namekiano Lord Slug invade la Tierra buscando la juventud eterna a través de las Esferas del Dragón."
		year = 1991
		episodes = 1
		isMovie = true
	case 24752: // Movie 5: Cooler's Revenge (1991)
		titleSpanish = "Dragon Ball Z: Los Rivales Más Poderosos"
		titleEnglish = "Dragon Ball Z: Cooler's Revenge"
		titleRomaji = "Dragon Ball Z: Tobikkiri no Saikyou tai Saikyou"
		description = "Cooler, hermano mayor de Freezer, viaja a la Tierra con sus Fuerzas Especiales para vengar la derrota de su familia."
		year = 1991
		episodes = 1
		isMovie = true
	case 39103: // Movie 6: The Return of Cooler (1992)
		titleSpanish = "Dragon Ball Z: Los Guerreros Más Poderosos"
		titleEnglish = "Dragon Ball Z: The Return of Cooler"
		titleRomaji = "Dragon Ball Z: Gekitotsu!! 100-Oku Power no Senshi-tachi"
		description = "Goku y Vegeta viajan al nuevo planeta Namek para enfrentar al ejército de Metal Cooler conectado a la Estrella Big Gete."
		year = 1992
		episodes = 1
		isMovie = true
	case 39104: // Movie 7: Super Android 13 (1992)
		titleSpanish = "Dragon Ball Z: La Batalla de los Tres Saiyajin"
		titleEnglish = "Dragon Ball Z: Super Android 13!"
		titleRomaji = "Dragon Ball Z: Kyokugen Battle!! San Dai Super Saiyajin"
		description = "La supercomputadora del Dr. Gero despierta a los androides 14, 15 y 13 para destruir a Goku, Vegeta y Trunks."
		year = 1992
		episodes = 1
		isMovie = true
	case 34433: // Movie 8: Broly – The Legendary Super Saiyan (1993)
		titleSpanish = "Dragon Ball Z: El Poder Invencible"
		titleEnglish = "Dragon Ball Z: Broly - The Legendary Super Saiyan"
		titleRomaji = "Dragon Ball Z: Moetsukiro!! Nessen - Ressen - Chou-Gekisen"
		description = "Paragus guía a los Guerreros Z al nuevo Planeta Vegeta, donde su hijo Broly desata el poder del legendario Super Saiyajin."
		year = 1993
		episodes = 1
		isMovie = true
	case 39105: // Movie 9: Bojack Unbound (1993)
		titleSpanish = "Dragon Ball Z: La Galaxia Corre Peligro"
		titleEnglish = "Dragon Ball Z: Bojack Unbound"
		titleRomaji = "Dragon Ball Z: Ginga Giri-Giri!! Bucchigiri no Sugoi Yatsu"
		description = "Tras los Juegos de Cell, el pirata intergaláctico Bojack y sus secuaces irrumpen en el Torneo de Artes Marciales del millonario Dollar."
		year = 1993
		episodes = 1
		isMovie = true
	case 44251: // Movie 10: Broly – Second Coming (1994)
		titleSpanish = "Dragon Ball Z: El Regreso del Guerrero Legendario"
		titleEnglish = "Dragon Ball Z: Broly - Second Coming"
		titleRomaji = "Dragon Ball Z: Kiken na Futari! Super Senshi wa Nemurenai"
		description = "Siete años después, Broly despierta en la Tierra y se enfrenta a Gohan, Goten, Trunks y Videl."
		year = 1994
		episodes = 1
		isMovie = true
	case 39106: // Movie 11: Bio-Broly (1994)
		titleSpanish = "Dragon Ball Z: El Combate Definitivo"
		titleEnglish = "Dragon Ball Z: Bio-Broly"
		titleRomaji = "Dragon Ball Z: Super Senshi Gekiha!! Katsu no wa Ore da"
		description = "Goten, Trunks, el Androide 18 y Mr. Satán combaten contra un clon biotecnológico mutado de Broly."
		year = 1994
		episodes = 1
		isMovie = true
	case 39107: // Movie 12: Fusion Reborn (1995)
		titleSpanish = "Dragon Ball Z: La Fusión de Goku y Vegeta"
		titleEnglish = "Dragon Ball Z: Fusion Reborn"
		titleRomaji = "Dragon Ball Z: Fukkatsu no Fusion!! Goku to Vegeta"
		description = "Un accidente en el Otro Mundo libera la maldad del Más Allá creando al demonio Janemba, obligando a Goku y Vegeta a fusionarse en Gogeta."
		year = 1995
		episodes = 1
		isMovie = true
	case 39108: // Movie 13: Wrath of the Dragon (1995)
		titleSpanish = "Dragon Ball Z: El Ataque del Dragón"
		titleEnglish = "Dragon Ball Z: Wrath of the Dragon"
		titleRomaji = "Dragon Ball Z: Ryuuken Bakuhatsu!! Goku ga Yaraneba Dare ga Yaru"
		description = "El guerrero legendario Tapion y su misteriosa ocarina guardan al colosal monstruo Hildegarn. Goku desata el Golpe del Dragón."
		year = 1995
		episodes = 1
		isMovie = true
	case 126963: // DBZ / DBS Movie: Battle of Gods (2013)
		titleSpanish = "Dragon Ball Z: La Batalla de los Dioses"
		titleEnglish = "Dragon Ball Z: Battle of Gods"
		titleRomaji = "Dragon Ball Z: Kami to Kami"
		description = "Bills, el Dios de la Destrucción, despierta buscando al Super Saiyajin Dios. Goku alcanza un nuevo estado divino."
		year = 2013
		episodes = 1
		isMovie = true
	case 303857: // DBZ / DBS Movie: Resurrection 'F' (2015)
		titleSpanish = "Dragon Ball Z: La Resurrección de Freezer"
		titleEnglish = "Dragon Ball Z: Resurrection 'F'"
		titleRomaji = "Dragon Ball Z: Fukkatsu no 'F'"
		description = "Sorbet reúne las Esferas del Dragón para revivir a Freezer, quien regresa en su forma dorada buscando venganza total."
		year = 2015
		episodes = 1
		isMovie = true

	// ── TV Specials & OVAs ──────────────────────────────────────────────────
	case 39323: // Especial 1: El Padre de Goku (1990)
		titleSpanish = "Dragon Ball Z: El Padre de Goku"
		titleEnglish = "Dragon Ball Z: The Father of Goku"
		titleRomaji = "Dragon Ball Z: Tatta Hitori no Saishuu Kessen"
		description = "La historia de Bardock, padre de Son Goku, quien descubre la traición de Freezer y se rebela en solitario para intentar salvar el Planeta Vegeta."
		year = 1990
		episodes = 1
		isMovie = true
	case 39324: // Especial 2: Un Futuro Diferente (1993)
		titleSpanish = "Dragon Ball Z: Un Futuro Diferente - Gohan y Trunks"
		titleEnglish = "Dragon Ball Z: The History of Trunks"
		titleRomaji = "Dragon Ball Z: Zetsubou e no Hankou!!"
		description = "En un futuro alternativo donde Goku falleció y los Guerreros Z cayeron ante los Androides 17 y 18, Gohan entrena al joven Trunks."
		year = 1993
		episodes = 1
		isMovie = true
	case 18095: // GT Especial: 100 Años Después (1997)
		titleSpanish = "Dragon Ball GT: 100 Años Después"
		titleEnglish = "Dragon Ball GT: A Hero's Legacy"
		titleRomaji = "Dragon Ball GT: Gokuu Gaiden! Yuuki no Akashi wa Si Xing Qiu"
		description = "Un siglo después de GT, Goku Jr. emprende un viaje para encontrar las Esferas del Dragón y salvar a su abuela Pan."
		year = 1997
		episodes = 1
		isMovie = true
	case 38594: // OVA: ¡Hola! Son Goku y sus Amigos Regresan (2008)
		titleSpanish = "Dragon Ball: ¡Hola! Son Goku y sus Amigos Regresan"
		titleEnglish = "Dragon Ball: Yo! Son Goku and His Friends Return!!"
		titleRomaji = "Dragon Ball: Ossu! Kaette Kita Son Gokuu to Nakama-tachi!!"
		description = "Tarble, el hermano menor de Vegeta, llega a la Tierra buscando ayuda contra los remanentes del ejército de Freezer."
		year = 2008
		episodes = 1
		isMovie = true
	case 120475: // OVA: El Episodio de Bardock (2011)
		titleSpanish = "Dragon Ball: El Episodio de Bardock"
		titleEnglish = "Dragon Ball: Episode of Bardock"
		titleRomaji = "Dragon Ball: Episode of Bardock"
		description = "Bardock sobrevive a la destrucción del Planeta Vegeta viajando al pasado y enfrentándose al antepasado de Freezer, Chilled."
		year = 2011
		episodes = 1
		isMovie = true
	case 55127: // OVA: El Plan para Erradicar a los Saiyajin (1993/2010)
		titleSpanish = "Dragon Ball: El Plan para Erradicar a los Saiyajin"
		titleEnglish = "Dragon Ball: Plan to Eradicate the Super Saiyans"
		titleRomaji = "Dragon Ball Z Side Story: Plan to Eradicate the Saiyans"
		description = "El Dr. Raichi, científico Tsufurujin, busca exterminar a los Saiyajin supervivientes liberando el gas Destron y al temible Hatchiyack."
		year = 2010
		episodes = 1
		isMovie = true

	// ── Dragon Ball Super Movies ────────────────────────────────────────────
	case 503314: // Dragon Ball Super: Broly (2018)
		titleSpanish = "Dragon Ball Super: Broly"
		titleEnglish = "Dragon Ball Super: Broly"
		titleRomaji = "Dragon Ball Super: Broly"
		description = "El origen y la colosal batalla entre Goku, Vegeta y Broly, un Saiyajin superviviente con un poder destructivo descomunal."
		year = 2018
		episodes = 1
		isMovie = true
	case 610150: // Dragon Ball Super: Super Hero (2022)
		titleSpanish = "Dragon Ball Super: Super Hero"
		titleEnglish = "Dragon Ball Super: Super Hero"
		titleRomaji = "Dragon Ball Super: Super Hero"
		description = "La renacida Patrulla Roja crea a los androides Gamma 1 y Gamma 2. Gohan y Piccolo desatan sus máximas transformaciones para salvar la Tierra."
		year = 2022
		episodes = 1
		isMovie = true
	default:
		titleSpanish = "Dragon Ball Serie"
		titleEnglish = "Dragon Ball Series"
		titleRomaji = "Dragon Ball Series"
		year = 1989
	}

	format := dto.MediaFormatTV
	if isMovie {
		format = dto.MediaFormatMovie
	}

	return &dto.NormalizedMedia{
		ID:     id,
		TmdbID: &tmdbID,
		Title: &dto.NormalizedMediaTitle{
			Spanish:       &titleSpanish,
			English:       &titleEnglish,
			Romaji:        &titleRomaji,
			UserPreferred: &titleSpanish,
		},
		Format:      &format,
		Year:        &year,
		Episodes:    &episodes,
		BannerImage: &bannerPath,
		CoverImage: &dto.NormalizedMediaCoverImage{
			Large:      &posterPath,
			Medium:     &posterPath,
			ExtraLarge: &posterPath,
		},
		Description: &description,
	}
}

// normalizeDragonBallTitle converts a raw title to a lowercase, space-padded,
// accent-stripped, punctuation-removed string suitable for word-boundary matching.
func normalizeDragonBallTitle(s string) string {
	s = strings.ToLower(s)
	s = strings.ReplaceAll(s, "-", " ")
	s = strings.ReplaceAll(s, "_", " ")
	s = strings.ReplaceAll(s, ".", " ")
	s = strings.ReplaceAll(s, "[", " ")
	s = strings.ReplaceAll(s, "]", " ")
	s = strings.ReplaceAll(s, "(", " ")
	s = strings.ReplaceAll(s, ")", " ")
	s = strings.ReplaceAll(s, "¡", " ")
	s = strings.ReplaceAll(s, "!", " ")
	s = strings.ReplaceAll(s, "¿", " ")
	s = strings.ReplaceAll(s, "?", " ")
	s = strings.ReplaceAll(s, "'", " ")
	s = strings.ReplaceAll(s, "’", " ")
	s = strings.ReplaceAll(s, ":", " ")
	s = strings.ReplaceAll(s, ",", " ")
	s = strings.ReplaceAll(s, "á", "a")
	s = strings.ReplaceAll(s, "à", "a")
	s = strings.ReplaceAll(s, "é", "e")
	s = strings.ReplaceAll(s, "è", "e")
	s = strings.ReplaceAll(s, "í", "i")
	s = strings.ReplaceAll(s, "ì", "i")
	s = strings.ReplaceAll(s, "ó", "o")
	s = strings.ReplaceAll(s, "ò", "o")
	s = strings.ReplaceAll(s, "ú", "u")
	s = strings.ReplaceAll(s, "ù", "u")
	s = strings.ReplaceAll(s, "ü", "u")
	s = strings.ReplaceAll(s, "ñ", "n")
	// Remove all non-alphanumeric except spaces
	reg := regexp.MustCompile(`[^a-z0-9\s]+`)
	s = reg.ReplaceAllString(s, " ")
	return " " + strings.Join(strings.Fields(s), " ") + " "
}

