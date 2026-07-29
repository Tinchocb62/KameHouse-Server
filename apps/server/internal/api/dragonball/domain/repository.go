package domain

// EpisodeQuery encapsula los filtros aplicables a la guía episódica. Los campos
// vacíos (cadena vacía o cero/nil) se interpretan como "sin filtro".
type EpisodeQuery struct {
	SeriesID string // Filtra por serie ("classic", "z", ...)
	SagaID   string // Filtra por saga
	Villain  string // Coincidencia parcial (case-insensitive) sobre los villanos
	Query    string // Búsqueda libre sobre título y hito
	Filler   *bool  // Filtro de relleno: nil => todos, true => solo relleno, false => solo canon
	Page     int    // Página 1-based (0 => 1)
	Limit    int    // Tamaño de página (0 => por defecto del servicio)
}

// Repository define el contrato de almacenamiento y consulta. Mantenerlo como
// interfaz permite sustituir la implementación en memoria por otra (SQL, cache,
// etc.) sin tocar el servicio ni el controlador.
type Repository interface {
	// ListSeries devuelve las cinco series en orden cronológico de emisión.
	ListSeries() []Series
	// GetSeries busca una serie por su slug. ok=false si no existe.
	GetSeries(id string) (Series, bool)

	// ListSagas devuelve las sagas de una serie en orden narrativo. Si seriesID
	// está vacío devuelve todas las sagas de todas las series.
	ListSagas(seriesID string) []Saga

	// FilterEpisodes devuelve las entradas de guía que satisfacen los filtros,
	// junto con el total de coincidencias antes de paginar.
	FilterEpisodes(q EpisodeQuery) (items []Episode, total int)
	// EpisodeByNumber devuelve la entrada de guía que cubre un número concreto
	// dentro de una serie. ok=false si la serie o el número no existen.
	EpisodeByNumber(seriesID string, number int) (Episode, bool)

	// ListVillains devuelve el catálogo de villanos, opcionalmente filtrado por
	// serie.
	ListVillains(seriesID string) []Villain

	// ListMilestones devuelve los hitos, opcionalmente filtrados por tipo.
	ListMilestones(t MilestoneType) []Milestone

	// GetStats calcula estadísticas agregadas del catálogo completo.
	GetStats() Stats
}
