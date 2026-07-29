package repository

import (
	"fmt"
	"testing"
)

// TestEpisodeCoverageIsComplete verifica que las entradas de guía de cada serie
// cubran de forma contigua y sin solapamientos todos los episodios declarados,
// desde 1 hasta EpisodeCount. Esto protege contra huecos o rangos duplicados al
// editar las semillas.
func TestEpisodeCoverageIsComplete(t *testing.T) {
	repo := New()
	for _, se := range repo.ListSeries() {
		se := se
		t.Run(se.ID, func(t *testing.T) {
			eps := repo.episodesBy[se.ID]
			expectNext := 1
			for _, ep := range eps {
				if ep.NumberStart != expectNext {
					t.Fatalf("%s: hueco/solapamiento — esperaba que la siguiente entrada empezara en %d, empezó en %d (%q)",
						se.ID, expectNext, ep.NumberStart, ep.Title)
				}
				if ep.NumberEnd < ep.NumberStart {
					t.Fatalf("%s: rango inválido %d-%d (%q)", se.ID, ep.NumberStart, ep.NumberEnd, ep.Title)
				}
				expectNext = ep.NumberEnd + 1
			}
			lastCovered := expectNext - 1
			// GT incluye un TV Special extra (ep. 65) más allá del conteo de 64.
			if se.ID == "gt" {
				if lastCovered != se.EpisodeCount+1 {
					t.Fatalf("gt: último episodio cubierto = %d, esperaba %d (64 + especial)", lastCovered, se.EpisodeCount+1)
				}
				return
			}
			if lastCovered != se.EpisodeCount {
				t.Fatalf("%s: último episodio cubierto = %d, esperaba %d", se.ID, lastCovered, se.EpisodeCount)
			}
		})
	}
}

// TestEveryEpisodeSagaExists comprueba que el saga_id de cada entrada exista en
// la lista de sagas de su serie.
func TestEveryEpisodeSagaExists(t *testing.T) {
	repo := New()
	for _, se := range repo.ListSeries() {
		validSagas := make(map[string]bool)
		for _, sg := range repo.ListSagas(se.ID) {
			validSagas[sg.ID] = true
		}
		for _, ep := range repo.episodesBy[se.ID] {
			if !validSagas[ep.SagaID] {
				t.Errorf("%s: la entrada %q referencia una saga inexistente %q", se.ID, ep.Title, ep.SagaID)
			}
		}
	}
}

// TestEpisodeByNumberBinarySearch valida la búsqueda por número en los límites.
func TestEpisodeByNumberBinarySearch(t *testing.T) {
	repo := New()
	cases := []struct {
		series string
		number int
		want   bool
	}{
		{"classic", 1, true},
		{"classic", 153, true},
		{"classic", 154, false},
		{"z", 0, false},
		{"super", 131, true},
		{"daima", 20, true},
		{"daima", 21, false},
		{"nope", 1, false},
	}
	for _, tc := range cases {
		_, ok := repo.EpisodeByNumber(tc.series, tc.number)
		if ok != tc.want {
			t.Errorf("EpisodeByNumber(%q, %d) ok=%v, esperaba %v", tc.series, tc.number, ok, tc.want)
		}
	}
}

// Ejemplo de uso para documentación / smoke test del formato de datos.
func ExampleMemoryRepository_ListSeries() {
	repo := New()
	fmt.Println(len(repo.ListSeries()))
	// Output: 5
}
