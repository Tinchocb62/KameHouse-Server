package skipdetect

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"testing"

	"kamehouse/internal/util"
)

// testFpcalc resuelve fpcalc para los tests sin depender de que esté en el PATH:
// EnsureFpcalcBinary busca en el PATH, después en {cacheDir}/bin, y si no lo
// descarga (release fijado + checksum). Se usa un cacheDir estable bajo el temp
// del sistema para bajarlo UNA sola vez y reusarlo entre corridas y paquetes.
func testFpcalc(t *testing.T) string {
	t.Helper()
	cacheDir := filepath.Join(os.TempDir(), "kamehouse-test-cache")
	logger := util.NewLogger()
	bin, err := EnsureFpcalcBinary(cacheDir, logger)
	if err != nil {
		t.Fatalf("no se pudo resolver fpcalc (¿sin red para la descarga inicial?): %v", err)
	}
	return bin
}

// TestFingerprintRangeHonorsFullWindow es un test de regresión: fpcalc trunca la
// entrada a 120 s si no se le pasa -length, así que FingerprintRange llegó a
// huellar solo los primeros 120 s de la ventana que se le pedía. Con la ventana
// de outro (480 s) eso dejaba el ED siempre fuera del rango analizado y la
// detección de endings daba 0 en todos los episodios, sin ningún error visible.
// Se genera el audio con ffmpeg para no depender de fixtures.
func TestFingerprintRangeHonorsFullWindow(t *testing.T) {
	// ffmpeg no se auto-provisiona: es dependencia dura de la función bajo test
	// (y del server). Sin él no hay nada que ejercitar.
	ffmpeg, err := exec.LookPath("ffmpeg")
	if err != nil {
		t.Skip("ffmpeg no está en el PATH")
	}
	fpcalc := testFpcalc(t)

	ctx := context.Background()

	// 300 s de ruido: suficiente para distinguir "ventana completa" de los 120 s
	// del default de fpcalc.
	src := filepath.Join(t.TempDir(), "noise.wav")
	gen := exec.CommandContext(ctx, ffmpeg, "-v", "error",
		"-f", "lavfi", "-i", "anoisesrc=d=300:c=pink:r=44100", "-ac", "1", src)
	if out, err := gen.CombinedOutput(); err != nil {
		t.Fatalf("no se pudo generar el audio de prueba: %v (%s)", err, out)
	}

	const wantWindow = 240.0 // > 120 s: sin -length esto se truncaría
	fp, _, err := FingerprintRange(ctx, fpcalc, ffmpeg, src, 0, wantWindow, -1)
	if err != nil {
		t.Fatalf("FingerprintRange: %v", err)
	}

	got := float64(len(fp)) * chromaprintHopSeconds
	if got < wantWindow*0.9 {
		t.Errorf("se huellaron %.1fs de una ventana de %.0fs (%d items): fpcalc truncó la entrada; "+
			"¿se perdió el -length?", got, wantWindow, len(fp))
	}
	// Cota superior: no debe leer más allá de la ventana pedida.
	if got > wantWindow*1.1 {
		t.Errorf("se huellaron %.1fs, más que la ventana pedida de %.0fs", got, wantWindow)
	}
}

// TestFingerprintRangeSelectsAudioTrack cubre la selección explícita de track:
// sin -map, ffmpeg elige por su cuenta y en archivos multi-audio puede huellar
// el idioma equivocado (un dub que re-graba la OP/ED no matchea nunca contra la
// referencia japonesa de AnimeThemes). Se arma un mkv con dos tracks de audio
// distintos y se verifica que cada -map devuelve efectivamente audio distinto.
func TestFingerprintRangeSelectsAudioTrack(t *testing.T) {
	ffmpeg, err := exec.LookPath("ffmpeg")
	if err != nil {
		t.Skip("ffmpeg no está en el PATH")
	}
	fpcalc := testFpcalc(t)

	ctx := context.Background()
	dir := t.TempDir()
	src := filepath.Join(dir, "dual.mkv")

	// Track 0: ruido rosa (jpn). Track 1: ruido marrón (spa). Audios distintos.
	gen := exec.CommandContext(ctx, ffmpeg, "-v", "error",
		"-f", "lavfi", "-i", "anoisesrc=d=200:c=pink:r=44100",
		"-f", "lavfi", "-i", "anoisesrc=d=200:c=brown:r=44100",
		"-map", "0:a", "-map", "1:a",
		"-metadata:s:a:0", "language=jpn",
		"-metadata:s:a:1", "language=spa",
		"-c:a", "libvorbis", src)
	if out, err := gen.CombinedOutput(); err != nil {
		t.Fatalf("no se pudo generar el mkv de prueba: %v (%s)", err, out)
	}

	fp0, _, err := FingerprintRange(ctx, fpcalc, ffmpeg, src, 0, 150, 0)
	if err != nil {
		t.Fatalf("FingerprintRange track 0: %v", err)
	}
	fp1, _, err := FingerprintRange(ctx, fpcalc, ffmpeg, src, 0, 150, 1)
	if err != nil {
		t.Fatalf("FingerprintRange track 1: %v", err)
	}
	if len(fp0) == 0 || len(fp1) == 0 {
		t.Fatalf("fingerprints vacíos (track0=%d, track1=%d)", len(fp0), len(fp1))
	}

	// Si -map se ignorara, los dos serían el mismo audio.
	same := 0
	n := min(len(fp0), len(fp1))
	for i := 0; i < n; i++ {
		if fp0[i] == fp1[i] {
			same++
		}
	}
	if ratio := float64(same) / float64(n); ratio > 0.5 {
		t.Errorf("los tracks 0 y 1 huellaron igual (%.0f%% idéntico): ¿se ignoró el -map?", ratio*100)
	}

	// Y el track pedido debe ser el japonés cuando se resuelve por idioma.
	if idx := preferredAudioIndex(ctx, src); idx != 0 {
		t.Errorf("preferredAudioIndex = %d, want 0 (el track jpn)", idx)
	}
}

// Sin tracks japoneses, preferredAudioIndex devuelve -1 (deja elegir a ffmpeg).
func TestPreferredAudioIndexNoJapanese(t *testing.T) {
	ffmpeg, err := exec.LookPath("ffmpeg")
	if err != nil {
		t.Skip("ffmpeg no está en el PATH")
	}
	ctx := context.Background()
	src := filepath.Join(t.TempDir(), "spa_only.mkv")
	gen := exec.CommandContext(ctx, ffmpeg, "-v", "error",
		"-f", "lavfi", "-i", "anoisesrc=d=5:c=pink:r=44100",
		"-metadata:s:a:0", "language=spa", "-c:a", "libvorbis", src)
	if out, err := gen.CombinedOutput(); err != nil {
		t.Fatalf("no se pudo generar el mkv: %v (%s)", err, out)
	}
	if idx := preferredAudioIndex(ctx, src); idx != -1 {
		t.Errorf("preferredAudioIndex = %d, want -1 (sin track japonés)", idx)
	}
}
