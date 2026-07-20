package skipdetect

import (
	"math"
	"math/rand"
	"testing"
)

// randomFP genera un fingerprint sintético de n items pseudo-aleatorios.
func randomFP(rng *rand.Rand, n int) []int {
	fp := make([]int, n)
	for i := range fp {
		fp[i] = int(rng.Uint32())
	}
	return fp
}

// embedTheme construye un stream de streamLen items rellenado con ruido, e
// incrusta `theme` a partir de offset, aplicando hasta maxBitFlips bits de ruido
// por item (simula la diferencia entre la mezcla del episodio y el theme puro).
func embedTheme(rng *rand.Rand, theme []int, streamLen, offset, maxBitFlips int) []int {
	stream := randomFP(rng, streamLen)
	for i, v := range theme {
		pos := offset + i
		if pos >= streamLen {
			break
		}
		noisy := uint32(v)
		flips := rng.Intn(maxBitFlips + 1)
		for f := 0; f < flips; f++ {
			noisy ^= 1 << uint(rng.Intn(32))
		}
		stream[pos] = int(noisy)
	}
	return stream
}

// TestCompareFingerprintsRecoversOffsets es la prueba central del fix de
// chromaprintHopSeconds: incrusta el mismo "theme" de ~90 s en dos streams a
// offsets conocidos y verifica que CompareFingerprints recupera ambos tiempos de
// inicio con precisión de sub-segundo. Si la constante de hop estuviera mal
// (como en el detector legacy), los tiempos recuperados estarían desplazados.
func TestCompareFingerprintsRecoversOffsets(t *testing.T) {
	rng := rand.New(rand.NewSource(42))

	// ~90 s de theme: 90 / 0.12380 ≈ 727 items.
	themeItems := int(math.Round(90.0 / chromaprintHopSeconds))
	theme := randomFP(rng, themeItems)

	offset1 := 80  // ≈ 9.9 s
	offset2 := 240 // ≈ 29.7 s
	streamLen := 3000

	f1 := embedTheme(rng, theme, streamLen, offset1, 3)
	f2 := embedTheme(rng, theme, streamLen, offset2, 3)

	mw := CompareFingerprints(f1, f2)
	if !mw.OK {
		t.Fatalf("esperaba match, obtuve OK=false")
	}

	wantStart1 := float64(offset1) * chromaprintHopSeconds
	wantStart2 := float64(offset2) * chromaprintHopSeconds

	if math.Abs(mw.Start1-wantStart1) > 0.5 {
		t.Errorf("Start1 = %.3f s, esperaba %.3f s (±0.5)", mw.Start1, wantStart1)
	}
	if math.Abs(mw.Start2-wantStart2) > 0.5 {
		t.Errorf("Start2 = %.3f s, esperaba %.3f s (±0.5)", mw.Start2, wantStart2)
	}
	if math.Abs(mw.MatchedSeconds-90.0) > 3.0 {
		t.Errorf("MatchedSeconds = %.3f, esperaba ≈90 (±3)", mw.MatchedSeconds)
	}
	if mw.Score < 0.7 {
		t.Errorf("Score = %.3f, esperaba >= 0.7 con solo 3 bits de ruido", mw.Score)
	}
}

// TestCompareFingerprintsNoMatch verifica que dos streams no relacionados no
// producen un falso positivo.
func TestCompareFingerprintsNoMatch(t *testing.T) {
	rng := rand.New(rand.NewSource(7))
	f1 := randomFP(rng, 2500)
	f2 := randomFP(rng, 2500)

	mw := CompareFingerprints(f1, f2)
	if mw.OK {
		t.Errorf("esperaba sin match entre streams aleatorios, obtuve start1=%.2f dur=%.2f score=%.2f",
			mw.Start1, mw.MatchedSeconds, mw.Score)
	}
}

func TestValidWindows(t *testing.T) {
	if !ValidOpWindow(70, 160) {
		t.Error("OP 70→160 (90s dentro de los primeros 6min) debería ser válida")
	}
	if ValidOpWindow(400, 490) {
		t.Error("OP que arranca a 400s (>6min) debería rechazarse")
	}
	if ValidOpWindow(70, 100) {
		t.Error("OP de 30s debería rechazarse (muy corta)")
	}
	fileDur := 1440.0
	if !ValidEdWindow(1360, 1440, fileDur) {
		t.Error("ED en los últimos 80s debería ser válida")
	}
	if ValidEdWindow(600, 690, fileDur) {
		t.Error("ED que arranca a mitad del archivo debería rechazarse")
	}
}
