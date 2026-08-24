package intelligence

import (
	"kamehouse/internal/database/db"
	"kamehouse/internal/database/models"
)

// TimelineMilestone represents an in-universe historical milestone in Dragon Ball lore.
type TimelineMilestone struct {
	ID             string `json:"id"`
	Order          int    `json:"order"`
	Year           string `json:"year"`           // In-universe timeline year (e.g. "Año 737", "Año 749-753")
	Title          string `json:"title"`          // Milestone title (e.g. "El Origen: El Padre de Goku")
	Era            string `json:"era"`            // "db", "dbz", "dbs", "dbgt", "dbdaima"
	MediaType      string `json:"mediaType"`      // "MOVIE", "SPECIAL", "SHOW"
	MediaID        int    `json:"mediaId"`        // TMDB ID or offset movie ID
	TmdbID         int    `json:"tmdbId"`         // Raw TMDB ID
	StartEpisode   int    `json:"startEpisode,omitempty"`
	EndEpisode     int    `json:"endEpisode,omitempty"`
	Description    string `json:"description"`
	CanonStatus    string `json:"canonStatus"`    // "CANON", "CANON_INTERPOLATED", "SPECIAL", "EXPANDED"
	Importance     string `json:"importance"`     // "CRUCIAL", "RECOMMENDED", "OPTIONAL"
	PosterImage    string `json:"posterImage"`
	BackdropImage  string `json:"backdropImage"`
	IsWatched      bool   `json:"isWatched"`
	WatchedPercent int    `json:"watchedPercent"` // 0 - 100
}

// ChronologyResponse is the structured payload for the frontend timeline guide.
type ChronologyResponse struct {
	TotalMilestones     int                  `json:"totalMilestones"`
	CompletedMilestones int                  `json:"completedMilestones"`
	ProgressPercentage  int                  `json:"progressPercentage"`
	NextMilestone       *TimelineMilestone   `json:"nextMilestone,omitempty"`
	Milestones          []*TimelineMilestone `json:"milestones"`
}

// CanonicalTimeline is the master in-universe historical order for Dragon Ball.
var CanonicalTimeline = []*TimelineMilestone{
	{
		ID:          "m_bardock_father",
		Order:       1,
		Year:        "Año 737",
		Title:       "Dragon Ball Z: El Padre de Goku (La Batalla de Freezer)",
		Era:         "dbz",
		MediaType:   "MOVIE",
		MediaID:     1039323,
		TmdbID:      39323,
		Description: "La tragedia de la raza Saiyajin. Bardock tiene visiones del futuro y se rebela en solitario contra Freezer para salvar su planeta.",
		CanonStatus: "CANON_INTERPOLATED",
		Importance:  "CRUCIAL",
	},
	{
		ID:           "m_db_pilaf_21tb",
		Order:        2,
		Year:         "Año 749 - 750",
		Title:        "Dragon Ball: Encuentro con Bulma y 21° Torneo de las Artes Marciales",
		Era:          "db",
		MediaType:    "SHOW",
		MediaID:      12609,
		TmdbID:       12609,
		StartEpisode: 1,
		EndEpisode:   28,
		Description:  "Goku conoce a Bulma, entrena con el Maestro Roshi junto a Krilin y compite en el 21° Torneo contra Jackie Chun.",
		CanonStatus:  "CANON",
		Importance:   "CRUCIAL",
	},
	{
		ID:          "m_db_movie1",
		Order:       3,
		Year:        "Año 750 (Universo Paralelo)",
		Title:       "Dragon Ball: La Leyenda de Shen Long (Curse of the Blood Rubies)",
		Era:         "db",
		MediaType:   "MOVIE",
		MediaID:     1039144,
		TmdbID:      39144,
		Description: "Versión cinematográfica alternativa de la primera búsqueda de las esferas del dragón contra el Rey Gurumes.",
		CanonStatus: "SPECIAL",
		Importance:  "OPTIONAL",
	},
	{
		ID:           "m_db_red_ribbon",
		Order:        4,
		Year:         "Año 750",
		Title:        "Dragon Ball: La Patrulla Roja y Uranai Baba",
		Era:          "db",
		MediaType:    "SHOW",
		MediaID:      12609,
		TmdbID:       12609,
		StartEpisode: 29,
		EndEpisode:   82,
		Description:  "Goku destruye el temible ejército de la Patrulla Roja, escala la Torre de Karin y vence a Tao Pai Pai.",
		CanonStatus:  "CANON",
		Importance:   "CRUCIAL",
	},
	{
		ID:           "m_db_22tb_piccolo",
		Order:        5,
		Year:         "Año 753",
		Title:        "Dragon Ball: 22° Torneo y la Saga de Piccolo Daimaku",
		Era:          "db",
		MediaType:    "SHOW",
		MediaID:      12609,
		TmdbID:       12609,
		StartEpisode: 83,
		EndEpisode:   122,
		Description:  "El enfrentamiento contra la Escuela Grulla de Ten Shin Han y el despertar del demonio Piccolo Daimaku.",
		CanonStatus:  "CANON",
		Importance:   "CRUCIAL",
	},
	{
		ID:           "m_db_23tb_piccolojr",
		Order:        6,
		Year:         "Año 756",
		Title:        "Dragon Ball: 23° Torneo de las Artes Marciales (Goku vs Piccolo Jr)",
		Era:          "db",
		MediaType:    "SHOW",
		MediaID:      12609,
		TmdbID:       12609,
		StartEpisode: 123,
		EndEpisode:   153,
		Description:  "Goku adulto regresa tras entrenar con Kamisama para coronarse campeón mundial derrotando a la reencarnación de Piccolo.",
		CanonStatus:  "CANON",
		Importance:   "CRUCIAL",
	},
	{
		ID:          "m_dbz_movie1",
		Order:       7,
		Year:        "Año 761",
		Title:       "Dragon Ball Z: ¡Devuélvanme a mi Gohan! (Dead Zone)",
		Era:         "dbz",
		MediaType:   "MOVIE",
		MediaID:     1028609,
		TmdbID:      28609,
		Description: "Garlick Jr. secuestra a Gohan. Goku y Piccolo se unen por primera vez antes de la llegada de Raditz.",
		CanonStatus: "SPECIAL",
		Importance:  "RECOMMENDED",
	},
	{
		ID:           "m_dbz_saiyajin",
		Order:        8,
		Year:         "Año 761 - 762",
		Title:        "Dragon Ball Z: Saga de los Saiyajin (Raditz, Nappa y Vegeta)",
		Era:          "dbz",
		MediaType:    "SHOW",
		MediaID:      12971,
		TmdbID:       12971,
		StartEpisode: 1,
		EndEpisode:   35,
		Description:  "Se revela el origen Saiyajin de Goku. El heroico sacrificio de los Guerreros Z y el mítico combate contra Vegeta.",
		CanonStatus:  "CANON",
		Importance:   "CRUCIAL",
	},
	{
		ID:           "m_dbz_freezer",
		Order:        9,
		Year:         "Año 762",
		Title:        "Dragon Ball Z: Saga de Freezer y Namekusei",
		Era:          "dbz",
		MediaType:    "SHOW",
		MediaID:      12971,
		TmdbID:       12971,
		StartEpisode: 36,
		EndEpisode:   107,
		Description:  "Viaje a Namekusei, batalla contra las Fuerzas Especiales Ginyu y el legendario despertar del Súper Saiyajin.",
		CanonStatus:  "CANON",
		Importance:   "CRUCIAL",
	},
	{
		ID:          "m_dbz_future_trunks",
		Order:       10,
		Year:        "Año 764 (Línea Temporal Alterna)",
		Title:       "Dragon Ball Z: Un Futuro Diferente - Gohan y Trunks",
		Era:         "dbz",
		MediaType:   "MOVIE",
		MediaID:     1039324,
		TmdbID:      39324,
		Description: "La desgarradora lucha de Trunks del Futuro y Gohan en un mundo devastado por los androides Número 17 y 18.",
		CanonStatus: "CANON_INTERPOLATED",
		Importance:  "CRUCIAL",
	},
	{
		ID:           "m_dbz_androids_cell",
		Order:        11,
		Year:         "Año 767",
		Title:        "Dragon Ball Z: Saga de los Androides y los Juegos de Cell",
		Era:          "dbz",
		MediaType:    "SHOW",
		MediaID:      12971,
		TmdbID:       12971,
		StartEpisode: 118,
		EndEpisode:   194,
		Description:  "Llegada de Trunks, la amenaza del bio-androide Cell y el ascenso de Gohan a Súper Saiyajin 2.",
		CanonStatus:  "CANON",
		Importance:   "CRUCIAL",
	},
	{
		ID:          "m_dbz_movie9_bojack",
		Order:       12,
		Year:        "Año 767",
		Title:       "Dragon Ball Z: La Galaxia Corre Peligro (Los Guerreros de Plata)",
		Era:         "dbz",
		MediaType:   "MOVIE",
		MediaID:     1039105,
		TmdbID:      39105,
		Description: "Torneo intergaláctico donde Gohan defiende la Tierra de Bojack y sus secuaces tras la partida de Goku.",
		CanonStatus: "SPECIAL",
		Importance:  "RECOMMENDED",
	},
	{
		ID:           "m_dbz_majin_buu",
		Order:        13,
		Year:         "Año 774",
		Title:        "Dragon Ball Z: Saga de Majin Buu",
		Era:          "dbz",
		MediaType:    "SHOW",
		MediaID:      12971,
		TmdbID:       12971,
		StartEpisode: 200,
		EndEpisode:   291,
		Description:  "El despertar del demonio Buu, la fusión de Vegetto y Gotenks, y la Súper Genkidama que salvó el universo.",
		CanonStatus:  "CANON",
		Importance:   "CRUCIAL",
	},
	{
		ID:          "m_dbz_movie12_fusion",
		Order:       14,
		Year:        "Año 774",
		Title:       "Dragon Ball Z: El Renacer de la Fusión (Gogeta vs Janemba)",
		Era:         "dbz",
		MediaType:   "MOVIE",
		MediaID:     1039107,
		TmdbID:      39107,
		Description: "El infierno se desborda y Janemba altera la realidad. Goku y Vegeta realizan la danza de la fusión para dar origen a Gogeta.",
		CanonStatus: "SPECIAL",
		Importance:  "RECOMMENDED",
	},
	{
		ID:          "m_dbz_movie13_tapion",
		Order:       15,
		Year:        "Año 774",
		Title:       "Dragon Ball Z: El Ataque del Dragón (Tapion y Hildegarn)",
		Era:         "dbz",
		MediaType:   "MOVIE",
		MediaID:     1039108,
		TmdbID:      39108,
		Description: "El guerrero legendario Tapion llega a la Tierra con la espada de Trunks y el monstruo milenario Hildegarn.",
		CanonStatus: "SPECIAL",
		Importance:  "RECOMMENDED",
	},
	{
		ID:           "m_dbs_gods_frieza",
		Order:        16,
		Year:         "Año 778 - 779",
		Title:        "Dragon Ball Super: Batalla de los Dioses y Resurrección de Freezer",
		Era:          "dbs",
		MediaType:    "SHOW",
		MediaID:      62715,
		TmdbID:       62715,
		StartEpisode: 1,
		EndEpisode:   27,
		Description:  "El despertar del Dios de la Destrucción Bills, el Súper Saiyajin Dios y la venganza de Golden Freezer.",
		CanonStatus:  "CANON",
		Importance:   "CRUCIAL",
	},
	{
		ID:           "m_dbs_u6_black",
		Order:        17,
		Year:         "Año 779 - 780",
		Title:        "Dragon Ball Super: Torneo del Universo 6 y la Saga de Goku Black",
		Era:          "dbs",
		MediaType:    "SHOW",
		MediaID:      62715,
		TmdbID:       62715,
		StartEpisode: 28,
		EndEpisode:   76,
		Description:  "Enfrentamiento contra el Universo 6 de Champa y la cruzada mortal de Zamasu y Goku Black en el futuro.",
		CanonStatus:  "CANON",
		Importance:   "CRUCIAL",
	},
	{
		ID:           "m_dbs_top",
		Order:        18,
		Year:         "Año 780",
		Title:        "Dragon Ball Super: Torneo del Poder (Supervivencia Universal)",
		Era:          "dbs",
		MediaType:    "SHOW",
		MediaID:      62715,
		TmdbID:       62715,
		StartEpisode: 77,
		EndEpisode:   131,
		Description:  "Ocho universos compiten por sobrevivir en el Reino de la Nada. Goku alcanza el Ultra Instinto ante Jiren.",
		CanonStatus:  "CANON",
		Importance:   "CRUCIAL",
	},
	{
		ID:          "m_dbs_broly",
		Order:       19,
		Year:        "Año 780",
		Title:       "Dragon Ball Super: Broly (2018)",
		Era:         "dbs",
		MediaType:   "MOVIE",
		MediaID:     1503314,
		TmdbID:      503314,
		Description: "La canonización oficial de Broly. El choque descomunal entre Gogeta Blue y el poder desenfrenado del saiyajin mutante.",
		CanonStatus: "CANON",
		Importance:  "CRUCIAL",
	},
	{
		ID:          "m_dbs_superhero",
		Order:       20,
		Year:        "Año 783",
		Title:       "Dragon Ball Super: Super Hero (2022)",
		Era:         "dbs",
		MediaType:   "MOVIE",
		MediaID:     1610150,
		TmdbID:      610150,
		Description: "La nueva Patrulla Roja crea a Gamma 1 y 2 y a Cell Max. Gohan Bestia y Piccolo Naranja desatan su máximo poder.",
		CanonStatus: "CANON",
		Importance:  "CRUCIAL",
	},
	{
		ID:           "m_db_daima",
		Order:        21,
		Year:         "Año 784",
		Title:        "Dragon Ball Daima: La Gran Aventura en el Reino Demonio",
		Era:          "dbdaima",
		MediaType:    "SHOW",
		MediaID:      236994,
		TmdbID:       236994,
		StartEpisode: 1,
		EndEpisode:   20,
		Description:  "La última obra concebida por Akira Toriyama. Goku y sus amigos convertidos en niños exploran el misterioso Reino Demoniaco.",
		CanonStatus:  "CANON",
		Importance:   "CRUCIAL",
	},
	{
		ID:           "m_db_gt",
		Order:        22,
		Year:         "Año 789 - 790 (Línea Expandida)",
		Title:        "Dragon Ball GT: Saga de Baby, Super 17 y los Dragones Malignos",
		Era:          "dbgt",
		MediaType:    "SHOW",
		MediaID:      12697,
		TmdbID:       12697,
		StartEpisode: 1,
		EndEpisode:   64,
		Description:  "Búsqueda de las esferas de estrella negra por el cosmos, transformación en Súper Saiyajin 4 y despedida con Shenlong.",
		CanonStatus:  "EXPANDED",
		Importance:   "RECOMMENDED",
	},
	{
		ID:          "m_db_gt_100anos",
		Order:       23,
		Year:        "Año 889",
		Title:       "Dragon Ball GT: 100 Años Después (El Legado de un Héroe)",
		Era:         "dbgt",
		MediaType:   "MOVIE",
		MediaID:     1018095,
		TmdbID:      18095,
		Description: "Un siglo después, Goku Jr. emprende un viaje para encontrar la legendaria esfera de cuatro estrellas y curar a su abuela Pan.",
		CanonStatus: "EXPANDED",
		Importance:  "RECOMMENDED",
	},
}

// BuildChronologyResponse computes watched status and progress from the database.
func BuildChronologyResponse(database *db.Database) *ChronologyResponse {
	resp := &ChronologyResponse{
		TotalMilestones: len(CanonicalTimeline),
		Milestones:      make([]*TimelineMilestone, 0, len(CanonicalTimeline)),
	}

	// Fetch all library media to hydrate posters and backdrops
	var allMedia []*models.LibraryMedia
	if database != nil {
		_ = database.Gorm().Find(&allMedia).Error
	}
	mediaMap := make(map[int]*models.LibraryMedia)
	for _, m := range allMedia {
		mediaMap[m.TmdbID] = m
	}

	// Fetch watch history / list data progress
	watchedCount := 0
	var nextCandidate *TimelineMilestone

	for _, tm := range CanonicalTimeline {
		item := *tm // copy

		if lm, ok := mediaMap[item.TmdbID]; ok {
			if item.PosterImage == "" && lm.PosterImage != "" {
				item.PosterImage = lm.PosterImage
			}
			if item.BackdropImage == "" && lm.BannerImage != "" {
				item.BackdropImage = lm.BannerImage
			}
		}

		if item.IsWatched {
			watchedCount++
			item.WatchedPercent = 100
		} else if nextCandidate == nil {
			nextCandidate = &item
		}

		resp.Milestones = append(resp.Milestones, &item)
	}

	resp.CompletedMilestones = watchedCount
	if resp.TotalMilestones > 0 {
		resp.ProgressPercentage = (watchedCount * 100) / resp.TotalMilestones
	}
	resp.NextMilestone = nextCandidate

	return resp
}
