package skipdetect

import "math/bits"

// chromaprintHopSeconds es la duración en segundos de cada item del fingerprint
// raw de Chromaprint. ESTE ES EL FIX del bug que hundió al detector legacy: el
// código viejo hacía `secondsPerFrame := chunkDuration1 / len(f1)`, derivando la
// escala de la duración reportada por fpcalc, lo que desplazaba todas las marcas
// (una intro real a ~1:10 aterrizaba a ~9:03). La escala es una constante del
// algoritmo, no depende del archivo: Chromaprint decodea a 11025 Hz, aplica una
// FFT de 4096 muestras con solapamiento de 2/3, así que avanza un hop de
// 4096/3 ≈ 1365.33 muestras por item → 4096/11025/3 ≈ 0.12380 s por item.
const chromaprintHopSeconds = 4096.0 / 11025.0 / 3.0

// Umbrales del algoritmo de matching (heredados del detector legacy, validados).
const (
	maxHammingDistance = 5    // bits de diferencia tolerados entre dos items (de 32)
	minPeakMatches     = 80   // items mínimos alineados al mejor offset para considerar match
	densityWindow      = 40   // tamaño de la ventana deslizante para acotar los bordes
	minDensity         = 0.70 // fracción mínima de items matcheados dentro de la ventana
	minMatchedSeconds  = 20.0 // duración mínima del segmento común para aceptarlo
)

// MatchWindow describe el segmento de audio común hallado entre dos fingerprints.
// Start/End están en segundos relativos al inicio de cada fingerprint (no al
// archivo). Score es la densidad media de items matcheados dentro de la ventana
// [0..1], útil para rankear varios candidatos (p. ej. OP1 vs OP2).
type MatchWindow struct {
	Start1, End1   float64
	Start2, End2   float64
	MatchedSeconds float64
	Score          float64
	OK             bool
}

// CompareFingerprints alinea dos fingerprints raw de Chromaprint y devuelve el
// segmento de audio común. Construye un histograma de offsets relativos (i-j)
// contando pares con distancia de Hamming <= maxHammingDistance, toma el offset
// pico, y desliza una ventana de densityWindow items exigiendo >= minDensity de
// coincidencias para acotar los bordes del segmento contiguo.
func CompareFingerprints(f1, f2 []int) MatchWindow {
	var none MatchWindow
	if len(f1) == 0 || len(f2) == 0 {
		return none
	}

	n := len(f1)
	m := len(f2)

	// 1. Histograma de offsets relativos (i - j).
	matchesForOffset := make(map[int]int)
	for i := 0; i < n; i++ {
		fi := uint32(f1[i])
		for j := 0; j < m; j++ {
			if bits.OnesCount32(fi^uint32(f2[j])) <= maxHammingDistance {
				matchesForOffset[i-j]++
			}
		}
	}
	if len(matchesForOffset) == 0 {
		return none
	}

	// 2. Offset pico.
	bestOffset := 0
	maxMatches := 0
	for offset, count := range matchesForOffset {
		if count > maxMatches {
			maxMatches = count
			bestOffset = offset
		}
	}
	if maxMatches < minPeakMatches {
		return none
	}

	// 3. Marcar los items de f1 que matchean al mejor offset.
	isMatching := make([]bool, n)
	for i := 0; i < n; i++ {
		j := i - bestOffset
		if j >= 0 && j < m && bits.OnesCount32(uint32(f1[i])^uint32(f2[j])) <= maxHammingDistance {
			isMatching[i] = true
		}
	}

	// 4. Acotar el segmento contiguo por densidad y contar los matcheados dentro.
	firstMatchIdx := -1
	lastMatchIdx := -1
	for i := 0; i <= n-densityWindow; i++ {
		matchCount := 0
		for w := 0; w < densityWindow; w++ {
			if isMatching[i+w] {
				matchCount++
			}
		}
		if float64(matchCount)/float64(densityWindow) >= minDensity {
			if firstMatchIdx == -1 {
				firstMatchIdx = i
			}
			lastMatchIdx = i + densityWindow
		}
	}
	if firstMatchIdx == -1 || lastMatchIdx == -1 {
		return none
	}

	// La ventana deslizante marca como borde la POSICIÓN de la ventana, que pasa
	// el umbral de densidad hasta (1-minDensity)*densityWindow items antes de que
	// empiece el segmento real (y análogamente después de que termina). Eso
	// ensancha la ventana sistemáticamente ~1.5 s a cada lado. Recortamos a los
	// primeros/últimos items que efectivamente matchean dentro de la región densa
	// para obtener bordes precisos.
	for firstMatchIdx < lastMatchIdx && !isMatching[firstMatchIdx] {
		firstMatchIdx++
	}
	for lastMatchIdx > firstMatchIdx && (lastMatchIdx-1 >= n || !isMatching[lastMatchIdx-1]) {
		lastMatchIdx--
	}

	matchedFrames := lastMatchIdx - firstMatchIdx
	matchedSeconds := float64(matchedFrames) * chromaprintHopSeconds
	if matchedSeconds < minMatchedSeconds {
		return none
	}

	// Densidad media dentro del segmento acotado, como score de calidad.
	matchedInside := 0
	for i := firstMatchIdx; i < lastMatchIdx && i < n; i++ {
		if isMatching[i] {
			matchedInside++
		}
	}
	score := float64(matchedInside) / float64(matchedFrames)

	start1 := float64(firstMatchIdx) * chromaprintHopSeconds
	end1 := float64(lastMatchIdx) * chromaprintHopSeconds
	start2 := float64(firstMatchIdx-bestOffset) * chromaprintHopSeconds
	end2 := float64(lastMatchIdx-bestOffset) * chromaprintHopSeconds
	if start1 < 0 {
		start1 = 0
	}
	if start2 < 0 {
		start2 = 0
	}

	return MatchWindow{
		Start1:         start1,
		End1:           end1,
		Start2:         start2,
		End2:           end2,
		MatchedSeconds: matchedSeconds,
		Score:          score,
		OK:             true,
	}
}

// ValidOpWindow rechaza ventanas de OP absurdas antes de persistirlas: una OP
// arranca dentro de los primeros 6 minutos y dura entre 55 y 130 s. Es la última
// barrera contra un falso positivo que se propague a toda la temporada (como
// pasó con el detector legacy).
func ValidOpWindow(start, end float64) bool {
	d := end - start
	return start >= 0 && start <= 360 && d >= 55 && d <= 130
}

// ValidEdWindow rechaza ventanas de ED absurdas: un ED dura entre 55 y 130 s y
// arranca dentro de los últimos 8 minutos del archivo.
func ValidEdWindow(start, end, fileDur float64) bool {
	d := end - start
	return d >= 55 && d <= 130 && start >= fileDur-480 && end <= fileDur+2
}
