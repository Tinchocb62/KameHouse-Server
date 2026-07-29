// Package repository implementa el almacenamiento en memoria de la enciclopedia
// de Dragon Ball. Los datos viven en los archivos seed_*.go (uno por serie) y se
// cargan una única vez al construir el repositorio, indexándose para consultas
// O(1) por serie/saga y O(log n) por número de episodio.
package repository

import (
	"sort"
	"strings"

	"kamehouse/internal/api/dragonball/domain"
)

// MemoryRepository es una implementación de domain.Repository respaldada por
// slices y mapas en memoria. Es inmutable tras la construcción, por lo que su
// uso concurrente es seguro sin locks.
type MemoryRepository struct {
	series    []domain.Series
	seriesIdx map[string]domain.Series

	sagas    []domain.Saga
	sagaName map[string]string // "seriesID/sagaID" -> nombre de la saga

	episodes    []domain.Episode
	episodesBy  map[string][]domain.Episode // seriesID -> entradas ordenadas por NumberStart
	villains    []domain.Villain
	milestoneDB []domain.Milestone
}

// seriesLoader agrupa las funciones seed de una serie para cargarlas de forma
// uniforme.
type seriesLoader struct {
	series   func() domain.Series
	sagas    func() []domain.Saga
	episodes func() []domain.Episode
}

// New construye el repositorio cargando y agregando todas las semillas.
func New() *MemoryRepository {
	loaders := []seriesLoader{
		{classicSeries, classicSagas, classicEpisodes},
		{zSeries, zSagas, zEpisodes},
		{gtSeries, gtSagas, gtEpisodes},
		{superSeries, superSagas, superEpisodes},
		{daimaSeries, daimaSagas, daimaEpisodes},
	}

	r := &MemoryRepository{
		seriesIdx:   make(map[string]domain.Series),
		sagaName:    make(map[string]string),
		episodesBy:  make(map[string][]domain.Episode),
		milestoneDB: milestones(),
	}

	for _, l := range loaders {
		se := l.series()
		r.series = append(r.series, se)
		r.seriesIdx[se.ID] = se

		for _, sg := range l.sagas() {
			r.sagas = append(r.sagas, sg)
			r.sagaName[sg.SeriesID+"/"+sg.ID] = sg.Name
		}

		eps := l.episodes()
		// Ordenar por número de inicio para permitir búsqueda binaria por número.
		sort.Slice(eps, func(i, j int) bool { return eps[i].NumberStart < eps[j].NumberStart })
		r.episodes = append(r.episodes, eps...)
		r.episodesBy[se.ID] = eps
	}

	r.villains = r.deriveVillains()
	return r
}

var villainCanonicalMap = map[string]struct {
	Canonical string
	Alias     string
}{
	"cell imperfecto":     {"Cell", "Cell Imperfecto"},
	"cell semiperfecto":   {"Cell", "Cell Semiperfecto"},
	"cell perfecto":       {"Cell", "Cell Perfecto"},
	"cell super perfecto": {"Cell", "Cell Super Perfecto"},
	"freezer 1ª forma":    {"Freezer", "Freezer 1ª Forma"},
	"freezer 2ª forma":    {"Freezer", "Freezer 2ª Forma"},
	"freezer 3ª forma":    {"Freezer", "Freezer 3ª Forma"},
	"freezer forma final": {"Freezer", "Freezer Forma Final"},
	"freezer 100% poder":  {"Freezer", "Freezer 100% Poder"},
	"mecha freezer":       {"Freezer", "Mecha Freezer"},

	"golden freezer":     {"Freezer", "Golden Freezer"},
	"majin buu gordo":    {"Majin Buu", "Majin Buu Gordo"},
	"evil buu":           {"Majin Buu", "Evil Buu"},
	"super buu":          {"Majin Buu", "Super Buu"},
	"buutenks":           {"Majin Buu", "Buutenks"},
	"buuhan":             {"Majin Buu", "Buuhan"},
	"kid buu":            {"Majin Buu", "Kid Buu"},
	"piccolo daimaoh":    {"Piccolo", "Piccolo Daimaoh"},
	"piccolo jr.":        {"Piccolo", "Piccolo Jr."},
	"ma junior":          {"Piccolo", "Ma Junior"},
	"príncipe vegeta":    {"Vegeta", "Príncipe Vegeta"},
	"vegeta oozaru":      {"Vegeta", "Vegeta Oozaru"},
	"majin vegeta":       {"Vegeta", "Majin Vegeta"},
	"baby vegeta":        {"Baby", "Baby Vegeta"},
	"oozaru baby":        {"Baby", "Oozaru Baby"},
	"oozaru dorado baby": {"Baby", "Oozaru Dorado Baby"},
}

// deriveVillains construye el catálogo de villanos a partir de las apariciones
// en los episodios, agrupando formas bajo un nombre canónico y poblando Aliases.
func (r *MemoryRepository) deriveVillains() []domain.Villain {
	seen := make(map[string]*domain.Villain) // clave: seriesID/villanoCanónico

	for _, ep := range r.episodes {
		for _, rawName := range ep.Villains {
			canonicalName := rawName
			aliasName := ""

			lowerRaw := strings.ToLower(rawName)
			if mapped, ok := villainCanonicalMap[lowerRaw]; ok {
				canonicalName = mapped.Canonical
				aliasName = mapped.Alias
			}

			key := ep.SeriesID + "/" + strings.ToLower(canonicalName)
			v, exists := seen[key]
			if !exists {
				v = &domain.Villain{
					Name:      canonicalName,
					SeriesID:  ep.SeriesID,
					SagaID:    ep.SagaID,
					SagaName:  r.sagaName[ep.SeriesID+"/"+ep.SagaID],
					FirstSeen: ep.NumberStart,
				}
				seen[key] = v
			} else {
				if ep.NumberStart < v.FirstSeen {
					v.FirstSeen = ep.NumberStart
					v.SagaID = ep.SagaID
					v.SagaName = r.sagaName[ep.SeriesID+"/"+ep.SagaID]
				}
			}

			if aliasName != "" {
				alreadyHas := false
				for _, a := range v.Aliases {
					if a == aliasName {
						alreadyHas = true
						break
					}
				}
				if !alreadyHas {
					v.Aliases = append(v.Aliases, aliasName)
				}
			}
		}
	}

	out := make([]domain.Villain, 0, len(seen))
	for _, v := range seen {
		out = append(out, *v)
	}

	// Orden estable: por serie (según orden de emisión), luego por aparición.
	seriesOrder := make(map[string]int, len(r.series))
	for i, se := range r.series {
		seriesOrder[se.ID] = i
	}
	sort.Slice(out, func(i, j int) bool {
		if seriesOrder[out[i].SeriesID] != seriesOrder[out[j].SeriesID] {
			return seriesOrder[out[i].SeriesID] < seriesOrder[out[j].SeriesID]
		}
		if out[i].FirstSeen != out[j].FirstSeen {
			return out[i].FirstSeen < out[j].FirstSeen
		}
		return out[i].Name < out[j].Name
	})
	return out
}

// ListSeries devuelve las series en orden de emisión.
func (r *MemoryRepository) ListSeries() []domain.Series {
	out := make([]domain.Series, len(r.series))
	copy(out, r.series)
	return out
}

// GetSeries busca una serie por slug.
func (r *MemoryRepository) GetSeries(id string) (domain.Series, bool) {
	se, ok := r.seriesIdx[id]
	return se, ok
}

// ListSagas devuelve las sagas de una serie (o todas si seriesID está vacío).
func (r *MemoryRepository) ListSagas(seriesID string) []domain.Saga {
	var out []domain.Saga
	for _, sg := range r.sagas {
		if seriesID == "" || sg.SeriesID == seriesID {
			out = append(out, sg)
		}
	}
	return out
}

// FilterEpisodes aplica los filtros de la consulta y pagina el resultado.
func (r *MemoryRepository) FilterEpisodes(q domain.EpisodeQuery) ([]domain.Episode, int) {
	villain := strings.ToLower(strings.TrimSpace(q.Villain))
	query := strings.ToLower(strings.TrimSpace(q.Query))

	var matched []domain.Episode
	source := r.episodes
	if q.SeriesID != "" {
		source = r.episodesBy[q.SeriesID]
	}

	for _, ep := range source {
		if q.SagaID != "" && ep.SagaID != q.SagaID {
			continue
		}
		if q.Filler != nil && ep.Filler != *q.Filler {
			continue
		}
		if villain != "" && !containsVillain(ep.Villains, villain) {
			continue
		}
		if query != "" && !strings.Contains(strings.ToLower(ep.Title), query) &&
			!strings.Contains(strings.ToLower(ep.Milestone), query) {
			continue
		}
		matched = append(matched, ep)
	}

	total := len(matched)

	// Paginación (defensiva: page/limit ya vienen normalizados desde el servicio).
	if q.Limit > 0 {
		start := (q.Page - 1) * q.Limit
		if start >= total {
			return []domain.Episode{}, total
		}
		end := start + q.Limit
		if end > total {
			end = total
		}
		matched = matched[start:end]
	}

	return matched, total
}

// EpisodeByNumber busca la entrada de guía que cubre un número dentro de una
// serie mediante búsqueda binaria sobre las entradas ordenadas.
func (r *MemoryRepository) EpisodeByNumber(seriesID string, number int) (domain.Episode, bool) {
	eps, ok := r.episodesBy[seriesID]
	if !ok {
		return domain.Episode{}, false
	}
	// Localiza la última entrada con NumberStart <= number y verifica cobertura.
	i := sort.Search(len(eps), func(i int) bool { return eps[i].NumberStart > number })
	if i == 0 {
		return domain.Episode{}, false
	}
	candidate := eps[i-1]
	if candidate.Covers(number) {
		return candidate, true
	}
	return domain.Episode{}, false
}

// ListVillains devuelve el catálogo, opcionalmente filtrado por serie.
func (r *MemoryRepository) ListVillains(seriesID string) []domain.Villain {
	var out []domain.Villain
	for _, v := range r.villains {
		if seriesID == "" || v.SeriesID == seriesID {
			out = append(out, v)
		}
	}
	return out
}

// ListMilestones devuelve los hitos, opcionalmente filtrados por tipo.
func (r *MemoryRepository) ListMilestones(t domain.MilestoneType) []domain.Milestone {
	var out []domain.Milestone
	for _, m := range r.milestoneDB {
		if t == "" || m.Type == t {
			out = append(out, m)
		}
	}
	return out
}

// GetStats calcula estadísticas consolidadas del catálogo completo.
func (r *MemoryRepository) GetStats() domain.Stats {
	totalEps := 0
	totalFiller := 0
	seriesStats := make([]domain.SeriesStats, 0, len(r.series))

	for _, se := range r.series {
		eps := r.episodesBy[se.ID]
		seEps := 0
		seFiller := 0

		for _, ep := range eps {
			count := (ep.NumberEnd - ep.NumberStart + 1)
			seEps += count
			if ep.Filler {
				seFiller += count
			}
		}

		totalEps += seEps
		totalFiller += seFiller

		seriesStats = append(seriesStats, domain.SeriesStats{
			SeriesID:       se.ID,
			Title:          se.Title,
			TotalEpisodes:  seEps,
			FillerEpisodes: seFiller,
			SagaCount:      len(se.SagaIDs),
		})
	}

	msByType := make(map[string]int)
	for _, m := range r.milestoneDB {
		msByType[string(m.Type)]++
	}

	return domain.Stats{
		TotalSeries:      len(r.series),
		TotalEpisodes:    totalEps,
		FillerEpisodes:   totalFiller,
		CanonEpisodes:    totalEps - totalFiller,
		TotalVillains:    len(r.villains),
		TotalMilestones:  len(r.milestoneDB),
		MilestonesByType: msByType,
		SeriesStats:      seriesStats,
	}
}

func containsVillain(villains []string, needle string) bool {
	for _, v := range villains {
		lowerV := strings.ToLower(v)
		if strings.Contains(lowerV, needle) {
			return true
		}
		if mapped, ok := villainCanonicalMap[lowerV]; ok {
			if strings.Contains(strings.ToLower(mapped.Canonical), needle) || strings.Contains(strings.ToLower(mapped.Alias), needle) {
				return true
			}
		}
	}
	return false
}
