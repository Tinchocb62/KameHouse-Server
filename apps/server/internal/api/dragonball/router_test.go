package dragonball_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"

	"kamehouse/internal/api/dragonball"
)

// setup construye un servidor Echo con el módulo montado bajo /api/v1, tal como
// ocurre en producción.
func setup() *echo.Echo {
	e := echo.New()
	v1 := e.Group("/api/v1")
	dragonball.Register(v1)
	return e
}

// do ejecuta una petición GET y decodifica el envoltorio {"data"|"error"}.
func do(t *testing.T, e *echo.Echo, target string) (int, map[string]json.RawMessage) {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, target, nil)
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)

	var body map[string]json.RawMessage
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("respuesta no es JSON válido para %s: %v — cuerpo=%s", target, err, rec.Body.String())
	}
	return rec.Code, body
}

func TestRouteSeries(t *testing.T) {
	e := setup()
	code, body := do(t, e, "/api/v1/dragonball/series")
	if code != http.StatusOK {
		t.Fatalf("código = %d, esperaba 200", code)
	}
	if _, ok := body["data"]; !ok {
		t.Fatal("respuesta sin clave 'data'")
	}
	var series []map[string]any
	if err := json.Unmarshal(body["data"], &series); err != nil {
		t.Fatalf("no se pudo decodificar data: %v", err)
	}
	if len(series) != 5 {
		t.Errorf("series = %d, esperaba 5", len(series))
	}
}

func TestRouteEpisodesFilteredAndPaginated(t *testing.T) {
	e := setup()
	code, body := do(t, e, "/api/v1/dragonball/episodes?series=super&saga=torneo-poder&limit=5&page=1")
	if code != http.StatusOK {
		t.Fatalf("código = %d, esperaba 200", code)
	}
	var payload struct {
		Items      []map[string]any `json:"items"`
		Pagination struct {
			Page, Limit, Total, TotalPages int
		} `json:"pagination"`
	}
	if err := json.Unmarshal(body["data"], &payload); err != nil {
		t.Fatalf("decodificando data: %v", err)
	}
	if payload.Pagination.Limit != 5 {
		t.Errorf("limit = %d, esperaba 5", payload.Pagination.Limit)
	}
	if len(payload.Items) > 5 {
		t.Errorf("items = %d, esperaba <= 5", len(payload.Items))
	}
	if payload.Pagination.Total == 0 {
		t.Error("total = 0, esperaba episodios en la saga del Torneo del Poder")
	}
}

func TestRouteEpisodeDetail(t *testing.T) {
	e := setup()
	code, body := do(t, e, "/api/v1/dragonball/episodes/z/95")
	if code != http.StatusOK {
		t.Fatalf("código = %d, esperaba 200", code)
	}
	var detail struct {
		Episode    map[string]any `json:"episode"`
		SeriesName string         `json:"series_name"`
		SagaName   string         `json:"saga_name"`
	}
	if err := json.Unmarshal(body["data"], &detail); err != nil {
		t.Fatalf("decodificando data: %v", err)
	}
	if detail.SeriesName != "Dragon Ball Z" {
		t.Errorf("series_name = %q, esperaba 'Dragon Ball Z'", detail.SeriesName)
	}
}

func TestRouteEpisodeDetailNotFound(t *testing.T) {
	e := setup()
	code, body := do(t, e, "/api/v1/dragonball/episodes/z/9999")
	if code != http.StatusNotFound {
		t.Fatalf("código = %d, esperaba 404", code)
	}
	if _, ok := body["error"]; !ok {
		t.Error("respuesta 404 sin clave 'error'")
	}
}

func TestRouteEpisodeDetailBadNumber(t *testing.T) {
	e := setup()
	code, _ := do(t, e, "/api/v1/dragonball/episodes/z/abc")
	if code != http.StatusBadRequest {
		t.Fatalf("código = %d, esperaba 400", code)
	}
}

func TestRouteVillains(t *testing.T) {
	e := setup()
	code, body := do(t, e, "/api/v1/dragonball/villains?series=gt")
	if code != http.StatusOK {
		t.Fatalf("código = %d, esperaba 200", code)
	}
	var villains []map[string]any
	if err := json.Unmarshal(body["data"], &villains); err != nil {
		t.Fatalf("decodificando data: %v", err)
	}
	if len(villains) == 0 {
		t.Error("esperaba villanos en GT")
	}
}

func TestRouteMilestonesByType(t *testing.T) {
	e := setup()
	code, body := do(t, e, "/api/v1/dragonball/milestones?type=sacrifice")
	if code != http.StatusOK {
		t.Fatalf("código = %d, esperaba 200", code)
	}
	var ms []map[string]any
	if err := json.Unmarshal(body["data"], &ms); err != nil {
		t.Fatalf("decodificando data: %v", err)
	}
	if len(ms) == 0 {
		t.Error("esperaba hitos de tipo sacrifice")
	}
	for _, m := range ms {
		if m["type"] != "sacrifice" {
			t.Errorf("hito con tipo %v, esperaba sacrifice", m["type"])
		}
	}
}

func TestRouteMilestonesInvalidType(t *testing.T) {
	e := setup()
	code, _ := do(t, e, "/api/v1/dragonball/milestones?type=nope")
	if code != http.StatusBadRequest {
		t.Fatalf("código = %d, esperaba 400", code)
	}
}

func TestRouteStats(t *testing.T) {
	e := setup()
	code, body := do(t, e, "/api/v1/dragonball/stats")
	if code != http.StatusOK {
		t.Fatalf("código = %d, esperaba 200", code)
	}
	var stats struct {
		TotalSeries     int `json:"total_series"`
		TotalEpisodes   int `json:"total_episodes"`
		FillerEpisodes  int `json:"filler_episodes"`
		CanonEpisodes   int `json:"canon_episodes"`
		TotalVillains   int `json:"total_villains"`
		TotalMilestones int `json:"total_milestones"`
	}
	if err := json.Unmarshal(body["data"], &stats); err != nil {
		t.Fatalf("decodificando data de stats: %v", err)
	}
	if stats.TotalSeries != 5 {
		t.Errorf("total_series = %d, esperaba 5", stats.TotalSeries)
	}
	if stats.TotalEpisodes == 0 {
		t.Error("total_episodes = 0, esperaba > 0")
	}
}

func TestRouteEpisodesFillerFilter(t *testing.T) {
	e := setup()
	code, body := do(t, e, "/api/v1/dragonball/episodes?filler=true")
	if code != http.StatusOK {
		t.Fatalf("código = %d, esperaba 200", code)
	}
	var payload struct {
		Items []map[string]any `json:"items"`
	}
	if err := json.Unmarshal(body["data"], &payload); err != nil {
		t.Fatalf("decodificando data: %v", err)
	}
	for _, item := range payload.Items {
		if filler, ok := item["filler"].(bool); !ok || !filler {
			t.Errorf("esperaba que el ítem fuera de relleno (filler=true), obtuve %v", item["filler"])
		}
	}
}
