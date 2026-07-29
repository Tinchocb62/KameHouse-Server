package service_test

import (
	"testing"

	"kamehouse/internal/api/dragonball/domain"
	"kamehouse/internal/api/dragonball/repository"
	"kamehouse/internal/api/dragonball/service"
)

func newService() *service.Service {
	return service.New(repository.New())
}

func TestListSeries(t *testing.T) {
	svc := newService()
	series := svc.ListSeries()
	if len(series) != 5 {
		t.Fatalf("esperaba 5 series, obtuve %d", len(series))
	}

	// Verifica los conteos de episodios declarados por serie.
	want := map[string]int{"classic": 153, "z": 291, "gt": 64, "super": 131, "daima": 20}
	for _, se := range series {
		if se.SagaCount != len(se.Series.SagaIDs) {
			t.Errorf("%s: SagaCount=%d != len(SagaIDs)=%d", se.ID, se.SagaCount, len(se.Series.SagaIDs))
		}
		if want[se.ID] != se.EpisodeCount {
			t.Errorf("%s: EpisodeCount=%d, esperaba %d", se.ID, se.EpisodeCount, want[se.ID])
		}
	}
}

func TestListEpisodesPaginationDefaults(t *testing.T) {
	svc := newService()
	res := svc.ListEpisodes(domain.EpisodeQuery{})
	if res.Pagination.Page != 1 {
		t.Errorf("page por defecto = %d, esperaba 1", res.Pagination.Page)
	}
	if res.Pagination.Limit != 25 {
		t.Errorf("limit por defecto = %d, esperaba 25", res.Pagination.Limit)
	}
	if len(res.Items) != 25 {
		t.Errorf("items en la primera página = %d, esperaba 25", len(res.Items))
	}
	if res.Pagination.Total <= 25 {
		t.Errorf("total = %d, esperaba > 25", res.Pagination.Total)
	}
}

func TestListEpisodesLimitCapped(t *testing.T) {
	svc := newService()
	res := svc.ListEpisodes(domain.EpisodeQuery{Limit: 9999})
	if res.Pagination.Limit != 1000 {
		t.Errorf("limit = %d, esperaba estar limitado a 1000", res.Pagination.Limit)
	}
}

// La guía completa debe caber en una sola página: el cliente web la pide de una
// sola vez y cruza los rangos de episodios del lado del navegador.
func TestListEpisodesFullGuideInOnePage(t *testing.T) {
	svc := newService()
	res := svc.ListEpisodes(domain.EpisodeQuery{Limit: 1000})
	if len(res.Items) != res.Pagination.Total {
		t.Errorf("items = %d, total = %d: la guía no entró en una sola página", len(res.Items), res.Pagination.Total)
	}
	if res.Pagination.TotalPages != 1 {
		t.Errorf("totalPages = %d, esperaba 1", res.Pagination.TotalPages)
	}
}

func TestListEpisodesFilterBySeriesAndSaga(t *testing.T) {
	svc := newService()
	res := svc.ListEpisodes(domain.EpisodeQuery{SeriesID: "z", SagaID: "saiyajin", Limit: 100})
	if len(res.Items) == 0 {
		t.Fatal("esperaba entradas en la saga Saiyajin de Z")
	}
	for _, ep := range res.Items {
		if ep.SeriesID != "z" || ep.SagaID != "saiyajin" {
			t.Errorf("entrada fuera de filtro: %+v", ep)
		}
	}
}

func TestListEpisodesFilterByVillain(t *testing.T) {
	svc := newService()
	res := svc.ListEpisodes(domain.EpisodeQuery{Villain: "freezer", Limit: 100})
	if len(res.Items) == 0 {
		t.Fatal("esperaba episodios con Freezer")
	}
	for _, ep := range res.Items {
		found := false
		for _, v := range ep.Villains {
			if containsFold(v, "freezer") {
				found = true
			}
		}
		if !found {
			t.Errorf("episodio sin Freezer entre villanos: %+v", ep.Villains)
		}
	}
}

func TestGetEpisodeByNumberWithinRange(t *testing.T) {
	svc := newService()
	// Ep. 95 de Z es una entrada de un solo episodio (despertar del SSJ).
	detail, err := svc.GetEpisode("z", 95)
	if err != nil {
		t.Fatalf("error inesperado: %v", err)
	}
	if !detail.Episode.Covers(95) {
		t.Errorf("la entrada no cubre el episodio 95: %+v", detail.Episode)
	}

	// Ep. 50 de Z (recuperación de Vegeta).
	block, err := svc.GetEpisode("z", 50)
	if err != nil {
		t.Fatalf("error inesperado en episodio 50: %v", err)
	}
	if !block.Episode.Covers(50) {
		t.Errorf("esperaba que la entrada cubra el ep. 50: %+v", block.Episode)
	}
	if block.SagaName == "" {
		t.Error("esperaba SagaName poblado en el detalle")
	}
}

func TestGetEpisodeErrors(t *testing.T) {
	svc := newService()
	if _, err := svc.GetEpisode("inexistente", 1); err != service.ErrSeriesNotFound {
		t.Errorf("esperaba ErrSeriesNotFound, obtuve %v", err)
	}
	if _, err := svc.GetEpisode("daima", 999); err != service.ErrEpisodeNotFound {
		t.Errorf("esperaba ErrEpisodeNotFound, obtuve %v", err)
	}
}

func TestListVillains(t *testing.T) {
	svc := newService()
	all, err := svc.ListVillains("")
	if err != nil {
		t.Fatalf("error inesperado: %v", err)
	}
	if len(all) == 0 {
		t.Fatal("esperaba un catálogo de villanos no vacío")
	}

	zVillains, err := svc.ListVillains("z")
	if err != nil {
		t.Fatalf("error inesperado: %v", err)
	}
	for _, v := range zVillains {
		if v.SeriesID != "z" {
			t.Errorf("villano fuera de la serie z: %+v", v)
		}
	}

	if _, err := svc.ListVillains("nope"); err != service.ErrSeriesNotFound {
		t.Errorf("esperaba ErrSeriesNotFound para serie inexistente, obtuve %v", err)
	}
}

func TestListMilestonesByType(t *testing.T) {
	svc := newService()
	transforms, err := svc.ListMilestones("transformation")
	if err != nil {
		t.Fatalf("error inesperado: %v", err)
	}
	if len(transforms) == 0 {
		t.Fatal("esperaba hitos de transformación")
	}
	for _, m := range transforms {
		if m.Type != domain.MilestoneTransformation {
			t.Errorf("hito con tipo inesperado: %+v", m)
		}
	}

	if _, err := svc.ListMilestones("banana"); err != service.ErrInvalidType {
		t.Errorf("esperaba ErrInvalidType, obtuve %v", err)
	}
}

func containsFold(s, substr string) bool {
	return len(s) >= len(substr) && (indexFold(s, substr) >= 0)
}

func indexFold(s, substr string) int {
	sl, subl := len(s), len(substr)
	for i := 0; i+subl <= sl; i++ {
		match := true
		for j := 0; j < subl; j++ {
			cs, cb := s[i+j], substr[j]
			if 'A' <= cs && cs <= 'Z' {
				cs += 'a' - 'A'
			}
			if 'A' <= cb && cb <= 'Z' {
				cb += 'a' - 'A'
			}
			if cs != cb {
				match = false
				break
			}
		}
		if match {
			return i
		}
	}
	return -1
}
