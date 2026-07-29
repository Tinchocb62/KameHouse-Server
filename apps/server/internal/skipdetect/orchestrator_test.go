package skipdetect

import (
	"math/rand"
	"testing"

	"kamehouse/internal/database/models"
)

// randFP genera un fingerprint de n items pseudo-aleatorios con seed fija: los
// valores quedan tan separados en distancia de Hamming que solo matchean consigo
// mismos, lo que hace determinista el alineamiento sin necesidad de fpcalc.
func randFP(rng *rand.Rand, n int) []int {
	fp := make([]int, n)
	for i := range fp {
		fp[i] = int(rng.Uint32())
	}
	return fp
}

// embed construye un "episodio" = relleno + theme + relleno, con el theme
// arrancando en el item `prefix`. Devuelve el episodio y el índice de inicio.
func embed(rng *rand.Rand, theme []int, prefix, suffix int) []int {
	ep := make([]int, 0, prefix+len(theme)+suffix)
	ep = append(ep, randFP(rng, prefix)...)
	ep = append(ep, theme...)
	ep = append(ep, randFP(rng, suffix)...)
	return ep
}

func approx(got, want, tol float64) bool {
	d := got - want
	if d < 0 {
		d = -d
	}
	return d <= tol
}

func TestBestThemeMatch_AlignsThemeOntoEpisode(t *testing.T) {
	rng := rand.New(rand.NewSource(42))

	const prefix = 300
	theme := randFP(rng, 250)
	ep := embed(rng, theme, prefix, 300)

	themeDur := float64(len(theme)) * chromaprintHopSeconds // ~31 s
	fp := func(_ Theme) *themeFingerprint {
		return &themeFingerprint{fp: theme, dur: themeDur}
	}
	themes := []Theme{{Slug: "OP1", Type: "OP", Episodes: "1-12", AudioURL: "u"}}

	const windowOffset = 5.0
	start, end, score, ok := bestThemeMatch(ep, windowOffset, themes, 3, fp)
	if !ok {
		t.Fatal("bestThemeMatch no encontró el theme embebido")
	}

	// El theme arranca en el item `prefix`; start = windowOffset + prefix*hop.
	wantStart := windowOffset + float64(prefix)*chromaprintHopSeconds
	tol := 2 * chromaprintHopSeconds // ~0.25 s (recorte de bordes por densidad)
	if !approx(start, wantStart, tol) {
		t.Errorf("start = %.3f, want ~%.3f (±%.3f)", start, wantStart, tol)
	}
	// La ventana usa la duración del theme como largo, no el borde del match.
	if !approx(end-start, themeDur, 1e-9) {
		t.Errorf("largo = %.3f, want = themeDur %.3f", end-start, themeDur)
	}
	if score < athMinScore {
		t.Errorf("score = %.3f, want >= %.2f", score, athMinScore)
	}
}

func TestBestThemeMatch_SkipsThemeOutOfEpisodeRange(t *testing.T) {
	rng := rand.New(rand.NewSource(7))
	theme := randFP(rng, 250)
	ep := embed(rng, theme, 200, 200)

	fp := func(_ Theme) *themeFingerprint {
		return &themeFingerprint{fp: theme, dur: float64(len(theme)) * chromaprintHopSeconds}
	}
	// El theme aplica solo a los eps 50-60; el episodio 3 no está en rango.
	themes := []Theme{{Slug: "OP2", Type: "OP", Episodes: "50-60", AudioURL: "u"}}

	if _, _, _, ok := bestThemeMatch(ep, 0, themes, 3, fp); ok {
		t.Error("bestThemeMatch matcheó un theme fuera del rango de episodios")
	}
}

func TestBestThemeMatch_PicksHigherScoreCandidate(t *testing.T) {
	rng := rand.New(rand.NewSource(99))

	// theme A embebido limpio (matchea fuerte). theme B no aparece en el episodio.
	themeA := randFP(rng, 250)
	themeB := randFP(rng, 250)
	ep := embed(rng, themeA, 300, 300)

	fp := func(th Theme) *themeFingerprint {
		if th.Slug == "OP1" {
			return &themeFingerprint{fp: themeA, dur: float64(len(themeA)) * chromaprintHopSeconds}
		}
		return &themeFingerprint{fp: themeB, dur: float64(len(themeB)) * chromaprintHopSeconds}
	}
	themes := []Theme{
		{Slug: "OP2", Type: "OP", Episodes: "1-12", AudioURL: "b"}, // no está en el ep
		{Slug: "OP1", Type: "OP", Episodes: "1-12", AudioURL: "a"}, // sí está
	}

	start, _, _, ok := bestThemeMatch(ep, 0, themes, 5, fp)
	if !ok {
		t.Fatal("bestThemeMatch no eligió al candidato que sí matchea")
	}
	wantStart := float64(300) * chromaprintHopSeconds
	if !approx(start, wantStart, 2*chromaprintHopSeconds) {
		t.Errorf("eligió el candidato equivocado: start = %.3f, want ~%.3f", start, wantStart)
	}
}

// skipRow arma una fila existente mínima para los tests de buildRows.
func skipRow(source string, opStart, opEnd, edOffset, edEnd float64) models.EpisodeSkipTime {
	return models.EpisodeSkipTime{Source: source, OpStart: opStart, OpEnd: opEnd, EdOffset: edOffset, EdEnd: edEnd}
}

func TestBuildRows_SourcePrecedence(t *testing.T) {
	d := &Detector{}

	cases := []struct {
		name        string
		existing    map[int]models.EpisodeSkipTime
		result      detResult
		wantRow     bool
		wantOpStart float64
	}{
		{
			name:     "manual nunca se pisa",
			existing: map[int]models.EpisodeSkipTime{1: skipRow("manual", 10, 100, 0, 0)},
			result:   detResult{OpStart: 5, OpEnd: 95, Source: "animethemes", Confidence: 1},
			wantRow:  false,
		},
		{
			name:     "animethemes previo no se re-escribe",
			existing: map[int]models.EpisodeSkipTime{1: skipRow("animethemes", 10, 100, 0, 0)},
			result:   detResult{OpStart: 5, OpEnd: 95, Source: "animethemes", Confidence: 1},
			wantRow:  false,
		},
		{
			name:        "aniskip cede ante el Método A",
			existing:    map[int]models.EpisodeSkipTime{1: skipRow("aniskip", 10, 100, 0, 0)},
			result:      detResult{OpStart: 12.5, OpEnd: 102.5, Source: "animethemes", Confidence: 1},
			wantRow:     true,
			wantOpStart: 12.5,
		},
		{
			name:     "aniskip NO cede ante fpcross",
			existing: map[int]models.EpisodeSkipTime{1: skipRow("aniskip", 10, 100, 0, 0)},
			result:   detResult{OpStart: 12.5, OpEnd: 102.5, Source: "fpcross", Confidence: 0.8},
			wantRow:  false,
		},
		{
			name:     "aniskip NO cede ante subtitle",
			existing: map[int]models.EpisodeSkipTime{1: skipRow("aniskip", 10, 100, 0, 0)},
			result:   detResult{OpStart: 12.5, OpEnd: 102.5, Source: "subtitle", Confidence: 0.6},
			wantRow:  false,
		},
		{
			name:        "fuente de baja confianza se reemplaza",
			existing:    map[int]models.EpisodeSkipTime{1: skipRow("heuristic", 0, 85, 0, 0)},
			result:      detResult{OpStart: 12.5, OpEnd: 102.5, Source: "fpcross", Confidence: 0.8},
			wantRow:     true,
			wantOpStart: 12.5,
		},
		{
			name:        "sin fila previa se persiste",
			existing:    map[int]models.EpisodeSkipTime{},
			result:      detResult{OpStart: 12.5, OpEnd: 102.5, Source: "animethemes", Confidence: 1},
			wantRow:     true,
			wantOpStart: 12.5,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rows := d.buildRows(7, map[int]detResult{1: tc.result}, tc.existing)
			if got := len(rows) > 0; got != tc.wantRow {
				t.Fatalf("persistió = %v, want %v (rows: %+v)", got, tc.wantRow, rows)
			}
			if tc.wantRow && rows[0].OpStart != tc.wantOpStart {
				t.Errorf("OpStart = %v, want %v", rows[0].OpStart, tc.wantOpStart)
			}
		})
	}
}

// Cuando A resuelve solo un lado (p. ej. la OP, porque el ED tiene narración
// solapada y no matchea), el otro lado de la fila aniskip debe conservarse en
// vez de quedar en cero.
func TestBuildRows_AniskipOverride_PreservesUnmatchedSide(t *testing.T) {
	d := &Detector{}
	existing := map[int]models.EpisodeSkipTime{
		1: skipRow("aniskip", 10, 100, 1300, 1390),
	}
	results := map[int]detResult{
		1: {OpStart: 12.5, OpEnd: 102.5, Source: "animethemes", Confidence: 1},
	}

	rows := d.buildRows(7, results, existing)
	if len(rows) != 1 {
		t.Fatalf("rows = %d, want 1", len(rows))
	}
	r := rows[0]
	if r.OpStart != 12.5 || r.OpEnd != 102.5 {
		t.Errorf("OP = [%v, %v], want [12.5, 102.5] (lado medido por A)", r.OpStart, r.OpEnd)
	}
	if r.EdOffset != 1300 || r.EdEnd != 1390 {
		t.Errorf("ED = [%v, %v], want [1300, 1390] (conservado de aniskip)", r.EdOffset, r.EdEnd)
	}
	if r.Source != "animethemes" {
		t.Errorf("Source = %q, want animethemes", r.Source)
	}
}

// nilThemeFP simula un theme cuyo audio no se pudo descargar/huellar (fp == nil):
// el matcher debe saltarlo sin romperse.
func TestBestThemeMatch_SkipsUnfingerprintableTheme(t *testing.T) {
	rng := rand.New(rand.NewSource(3))
	ep := randFP(rng, 500)
	fp := func(_ Theme) *themeFingerprint { return nil }
	themes := []Theme{{Slug: "OP1", Type: "OP", Episodes: "", AudioURL: "u"}}
	if _, _, _, ok := bestThemeMatch(ep, 0, themes, 1, fp); ok {
		t.Error("bestThemeMatch no debería matchear con fingerprint nil")
	}
}
