// Package domain contiene las entidades puras y los contratos de la API de
// Dragon Ball. No depende de ningún framework (Echo, base de datos, etc.): sólo
// tipos de datos y la interfaz del repositorio. El resto de las capas
// (repository, service, controller) dependen de este paquete y nunca al revés.
package domain

// MilestoneType clasifica un hito narrativo para permitir el filtrado por
// categoría en el endpoint de milestones.
type MilestoneType string

const (
	MilestoneTransformation MilestoneType = "transformation" // Nueva transformación (SSJ, Oozaru, UI, ...)
	MilestoneSacrifice      MilestoneType = "sacrifice"      // Sacrificio heroico de un personaje
	MilestoneWish           MilestoneType = "wish"           // Deseo pedido a un dragón
	MilestoneDeath          MilestoneType = "death"          // Muerte relevante
	MilestoneEvent          MilestoneType = "event"          // Hito de lore / evento histórico
)

// Series representa una de las cinco series principales de la franquicia.
type Series struct {
	ID           string   `json:"id"`            // Slug estable: "classic", "z", "gt", "super", "daima"
	Title        string   `json:"title"`         // Nombre para mostrar
	TMDBID       int      `json:"tmdb_id"`       // ID de TMDB (compartido con el scanner de la librería)
	Year         string   `json:"year"`          // Rango de emisión, p.ej. "1986–1989"
	EpisodeCount int      `json:"episode_count"` // Total de episodios televisivos
	Canon        bool     `json:"canon"`         // ¿Pertenece a la línea temporal canon oficial?
	Studio       string   `json:"studio"`        // Estudio de animación
	Description  string   `json:"description"`   // Sinopsis breve
	SagaIDs      []string `json:"saga_ids"`      // Sagas que componen la serie, en orden narrativo
}

// Saga es un arco argumental dentro de una serie, con su rango de episodios.
type Saga struct {
	ID       string `json:"id"`        // Slug estable, único dentro de la serie
	SeriesID string `json:"series_id"` // Serie a la que pertenece
	Name     string `json:"name"`      // Nombre para mostrar
	StartEp  int    `json:"start_ep"`  // Primer episodio (inclusive)
	EndEp    int    `json:"end_ep"`    // Último episodio (inclusive)
	Order    int    `json:"order"`     // Posición dentro de la serie (1-based)
}

// Episode es una entrada de la guía episódica. Para respetar la granularidad de
// las fuentes (algunos bloques narrativos agrupan varios capítulos), una entrada
// puede cubrir un rango de episodios mediante NumberStart..NumberEnd. Cuando la
// entrada describe un único episodio, ambos campos coinciden.
type Episode struct {
	SeriesID    string   `json:"series_id"`
	SagaID      string   `json:"saga_id"`
	NumberStart int      `json:"number_start"`
	NumberEnd   int      `json:"number_end"`
	Title       string   `json:"title"`
	Villains    []string `json:"villains,omitempty"`
	Milestone   string   `json:"milestone"`
	Filler      bool     `json:"filler"` // true si el bloque es relleno (no canon del manga)
}

// Covers indica si la entrada de guía cubre el número de episodio dado.
func (e Episode) Covers(number int) bool {
	return number >= e.NumberStart && number <= e.NumberEnd
}

// IsRange indica si la entrada agrupa más de un episodio.
func (e Episode) IsRange() bool {
	return e.NumberEnd > e.NumberStart
}

// Villain representa a un antagonista dentro del catálogo, categorizado por la
// serie y saga donde aparece por primera vez / de forma más relevante.
type Villain struct {
	Name      string   `json:"name"`
	SeriesID  string   `json:"series_id"`
	SagaID    string   `json:"saga_id"`
	SagaName  string   `json:"saga_name"`
	FirstSeen int      `json:"first_seen"`        // Primer episodio en el que aparece
	Aliases   []string `json:"aliases,omitempty"` // Otros nombres/formas
}

// Milestone es un hito narrativo curado (transformación, sacrificio, deseo,
// muerte o evento de lore) con su clasificación explícita para el filtrado.
type Milestone struct {
	Type        MilestoneType `json:"type"`
	SeriesID    string        `json:"series_id"`
	Episode     int           `json:"episode"`
	Title       string        `json:"title"`
	Description string        `json:"description"`
}

// Stats contiene estadísticas consolidadas del catálogo de Dragon Ball.
type Stats struct {
	TotalSeries      int            `json:"total_series"`
	TotalEpisodes    int            `json:"total_episodes"`
	FillerEpisodes   int            `json:"filler_episodes"`
	CanonEpisodes    int            `json:"canon_episodes"`
	TotalVillains    int            `json:"total_villains"`
	TotalMilestones  int            `json:"total_milestones"`
	MilestonesByType map[string]int `json:"milestones_by_type"`
	SeriesStats      []SeriesStats  `json:"series_stats"`
}

// SeriesStats detalla las métricas individuales de una serie.
type SeriesStats struct {
	SeriesID       string `json:"series_id"`
	Title          string `json:"title"`
	TotalEpisodes  int    `json:"total_episodes"`
	FillerEpisodes int    `json:"filler_episodes"`
	SagaCount      int    `json:"saga_count"`
}
