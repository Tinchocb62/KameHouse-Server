package db

import (
	"context"
	"testing"

	"kamehouse/internal/database/models"
	"kamehouse/internal/util"
)

// resetPurgeFlag deshace la marca de la migración one-shot, que ya corrió cuando
// NewDatabase ejecutó las migraciones sobre la DB vacía.
func resetPurgeFlag(t *testing.T, d *Database) {
	t.Helper()
	if err := UpsertMetadataCache(d, "migrations", "purge_edless_animethemes_skip_times_v1", false, 0); err != nil {
		t.Fatalf("no se pudo resetear el flag de la migración: %v", err)
	}
}

func sourcesFor(t *testing.T, d *Database) map[string]int {
	t.Helper()
	var rows []models.EpisodeSkipTime
	if err := d.Gorm().Find(&rows).Error; err != nil {
		t.Fatalf("no se pudieron leer los skip times: %v", err)
	}
	out := map[string]int{}
	for _, r := range rows {
		out[r.Source]++
	}
	return out
}

func TestPurgeEdlessAnimeThemesSkipTimes(t *testing.T) {
	logger := util.NewLogger()
	database, err := NewDatabase(context.Background(), t.TempDir(), "purge_edless_test", logger)
	if err != nil {
		t.Fatalf("no se pudo crear la DB de prueba: %v", err)
	}
	defer database.Close()

	rows := []models.EpisodeSkipTime{
		// Rotas por el bug del -length: animethemes con OP pero sin ED.
		{MediaID: 1, EpisodeNumber: 1, OpStart: 10, OpEnd: 100, EdOffset: 0, Source: "animethemes"},
		{MediaID: 1, EpisodeNumber: 2, OpStart: 10, OpEnd: 100, EdOffset: 0, Source: "animethemes"},
		// Sana: animethemes con ED detectado. NO se toca.
		{MediaID: 1, EpisodeNumber: 3, OpStart: 10, OpEnd: 100, EdOffset: 1351, EdEnd: 1411, Source: "animethemes"},
		// Otras fuentes sin ED: no las escribió el bug. NO se tocan.
		{MediaID: 1, EpisodeNumber: 4, OpStart: 10, OpEnd: 100, EdOffset: 0, Source: "manual"},
		{MediaID: 1, EpisodeNumber: 5, OpStart: 10, OpEnd: 100, EdOffset: 0, Source: "aniskip"},
		{MediaID: 1, EpisodeNumber: 6, OpStart: 10, OpEnd: 100, EdOffset: 0, Source: "fpcross"},
	}
	if err := database.Gorm().Create(&rows).Error; err != nil {
		t.Fatalf("no se pudieron insertar las filas de prueba: %v", err)
	}

	resetPurgeFlag(t, database)
	purgeEdlessAnimeThemesSkipTimes(database, logger)

	got := sourcesFor(t, database)
	want := map[string]int{
		"animethemes": 1, // solo sobrevive la que tiene ED
		"manual":      1,
		"aniskip":     1,
		"fpcross":     1,
	}
	for src, n := range want {
		if got[src] != n {
			t.Errorf("source %q: quedaron %d filas, se esperaban %d", src, got[src], n)
		}
	}
	if len(got) != len(want) {
		t.Errorf("fuentes inesperadas tras la purga: %v", got)
	}
}

// La migración es one-shot: una vez marcada, no debe volver a borrar. Si no,
// los episodios que legítimamente no tienen ED se re-escanearían en cada
// arranque para siempre.
func TestPurgeEdlessAnimeThemesSkipTimesIsOneShot(t *testing.T) {
	logger := util.NewLogger()
	database, err := NewDatabase(context.Background(), t.TempDir(), "purge_edless_oneshot_test", logger)
	if err != nil {
		t.Fatalf("no se pudo crear la DB de prueba: %v", err)
	}
	defer database.Close()

	resetPurgeFlag(t, database)
	purgeEdlessAnimeThemesSkipTimes(database, logger) // marca la migración como hecha

	// Un episodio que de verdad no tiene ED, escrito por el detector ya arreglado.
	row := models.EpisodeSkipTime{
		MediaID: 2, EpisodeNumber: 1, OpStart: 10, OpEnd: 100, EdOffset: 0, Source: "animethemes",
	}
	if err := database.Gorm().Create(&row).Error; err != nil {
		t.Fatalf("no se pudo insertar la fila: %v", err)
	}

	purgeEdlessAnimeThemesSkipTimes(database, logger)

	if n := sourcesFor(t, database)["animethemes"]; n != 1 {
		t.Errorf("la migración volvió a purgar tras estar marcada: quedaron %d filas, se esperaba 1", n)
	}
}
