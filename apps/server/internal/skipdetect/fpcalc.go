// Package skipdetect detecta automáticamente las ventanas de intro (OP) y
// outro (ED) de series leyendo cada archivo de video. Reemplaza al detector
// acústico legacy (internal/mediastream/detector.go, borrado) que sufría un bug
// de escala frame→segundos. La cadena de detección es:
//
//	A) AnimeThemes.moe — matching contra el audio oficial de la OP/ED (primaria)
//	B) Chromaprint cross-episodio — subsecuencia de audio común entre episodios
//	C) Subtítulos ASS — hints por estilos de karaoke / huecos de diálogo
//
// Los resultados se persisten en models.EpisodeSkipTime con sources
// "animethemes" / "fpcross" / "subtitle" (nunca "fingerprint", que el purge
// legacy de db.go borra en el primer arranque).
package skipdetect

import (
	"archive/tar"
	"archive/zip"
	"bytes"
	"compress/gzip"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"math"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"time"

	"github.com/goccy/go-json"
	"github.com/rs/zerolog"

	"kamehouse/internal/util"
)

// fpcalcRelease describe el archivo a descargar para la plataforma actual, con su
// SHA256 pinneado. El pin protege contra corrupción de descarga y contra
// manipulación del release (supply-chain): un binario ejecutable que no coincide
// no se instala. Checksums de chromaprint v1.6.0 (acoustid/chromaprint releases).
type fpcalcRelease struct {
	url    string
	isZip  bool
	sha256 string
}

var fpcalcReleases = map[string]fpcalcRelease{
	"windows/amd64": {
		url:    "https://github.com/acoustid/chromaprint/releases/download/v1.6.0/chromaprint-fpcalc-1.6.0-windows-x86_64.zip",
		isZip:  true,
		sha256: "30179d3d0dc4cc92f1a0995c1a2e523fb4867724c2ee6a6ceae474f8e4d6937a",
	},
	"linux/amd64": {
		url:    "https://github.com/acoustid/chromaprint/releases/download/v1.6.0/chromaprint-fpcalc-1.6.0-linux-x86_64.tar.gz",
		isZip:  false,
		sha256: "946dc3eade645eb835c8d163c6bb354e092239988bff190b9c42589e8d5cf00a",
	},
	"linux/arm64": {
		url:    "https://github.com/acoustid/chromaprint/releases/download/v1.6.0/chromaprint-fpcalc-1.6.0-linux-arm64.tar.gz",
		isZip:  false,
		sha256: "c8667f556f77d8ebbe08b75a968c0592bd2a67aaa696eff91715feb5083b1cd4",
	},
	"darwin/amd64": {
		url:    "https://github.com/acoustid/chromaprint/releases/download/v1.6.0/chromaprint-fpcalc-1.6.0-macos-universal.tar.gz",
		isZip:  false,
		sha256: "31f654cce8308fcb22869d043770eb66afffed95e8a548fd877f0e670c16d7ec",
	},
	"darwin/arm64": {
		url:    "https://github.com/acoustid/chromaprint/releases/download/v1.6.0/chromaprint-fpcalc-1.6.0-macos-universal.tar.gz",
		isZip:  false,
		sha256: "31f654cce8308fcb22869d043770eb66afffed95e8a548fd877f0e670c16d7ec",
	},
}

// fingerprintResult es el shape JSON que emite `fpcalc -raw -json`.
// Fingerprint se mantiene como []int (no []int32) porque los hashes raw de
// Chromaprint son valores de 32 bits sin signo que en JSON llegan como enteros
// de hasta 4294967295, fuera del rango de int32.
type fingerprintResult struct {
	Duration    float64 `json:"duration"`
	Fingerprint []int   `json:"fingerprint"`
}

// EnsureFpcalcBinary resuelve la ruta a fpcalc: PATH del sistema →
// {cacheDir}/bin/fpcalc[.exe] → descarga chromaprint v1.6.0 de GitHub releases.
func EnsureFpcalcBinary(cacheDir string, logger *zerolog.Logger) (string, error) {
	if path, err := exec.LookPath("fpcalc"); err == nil {
		return path, nil
	}

	ext := ""
	if runtime.GOOS == "windows" {
		ext = ".exe"
	}

	binDir := filepath.Join(cacheDir, "bin")
	localPath := filepath.Join(binDir, "fpcalc"+ext)

	if _, err := os.Stat(localPath); err == nil {
		return localPath, nil
	}

	logger.Info().Msg("skipdetect: fpcalc no encontrado, descargando release fijado...")

	if err := os.MkdirAll(binDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create bin dir: %w", err)
	}

	release, err := fpcalcReleaseForHost()
	if err != nil {
		return "", err
	}

	logger.Info().Str("url", release.url).Msg("skipdetect: descargando archivo de fpcalc")

	client := &http.Client{Timeout: 2 * time.Minute}
	resp, err := client.Get(release.url)
	if err != nil {
		// Sin red / DNS: error claro y accionable (no reintenta en loop; el próximo
		// scan volverá a intentar). fpcalc solo hace falta para Método A/B, no para
		// que el servidor arranque.
		return "", fmt.Errorf("no se pudo descargar fpcalc (¿sin conexión?): %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("failed to download fpcalc: HTTP %d", resp.StatusCode)
	}

	tmpFile, err := os.CreateTemp("", "fpcalc-archive-*")
	if err != nil {
		return "", err
	}
	defer os.Remove(tmpFile.Name())
	defer tmpFile.Close()

	// Copiamos calculando el SHA256 al vuelo.
	hasher := sha256.New()
	if _, err := io.Copy(io.MultiWriter(tmpFile, hasher), resp.Body); err != nil {
		return "", fmt.Errorf("failed to write archive: %w", err)
	}
	got := hex.EncodeToString(hasher.Sum(nil))
	if got != release.sha256 {
		return "", fmt.Errorf("checksum de fpcalc no coincide: esperado %s, obtenido %s (descarga corrupta o release manipulado)", release.sha256, got)
	}

	if _, err := tmpFile.Seek(0, 0); err != nil {
		return "", err
	}

	if release.isZip {
		if err := extractFpcalcFromZip(tmpFile, localPath); err != nil {
			return "", err
		}
	} else {
		if err := extractFpcalcFromTarGz(tmpFile, localPath); err != nil {
			return "", err
		}
	}

	logger.Info().Str("path", localPath).Msg("skipdetect: fpcalc instalado y verificado correctamente")
	return localPath, nil
}

func extractFpcalcFromZip(tmpFile *os.File, localPath string) error {
	archiveSize, err := tmpFile.Seek(0, io.SeekEnd)
	if err != nil {
		return err
	}
	if _, err := tmpFile.Seek(0, 0); err != nil {
		return err
	}

	zr, err := zip.NewReader(tmpFile, archiveSize)
	if err != nil {
		return fmt.Errorf("failed to read zip archive: %w", err)
	}

	for _, f := range zr.File {
		baseName := filepath.Base(f.Name)
		if baseName != "fpcalc.exe" && baseName != "fpcalc" {
			continue
		}
		rc, err := f.Open()
		if err != nil {
			return err
		}
		defer rc.Close()

		out, err := os.OpenFile(localPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0755)
		if err != nil {
			return err
		}
		defer out.Close()

		if _, err := io.Copy(out, rc); err != nil {
			return err
		}
		return nil
	}
	return errors.New("fpcalc binary not found inside downloaded zip archive")
}

func extractFpcalcFromTarGz(tmpFile *os.File, localPath string) error {
	gr, err := gzip.NewReader(tmpFile)
	if err != nil {
		return fmt.Errorf("failed to initialize gzip reader: %w", err)
	}
	defer gr.Close()

	tr := tar.NewReader(gr)
	for {
		header, err := tr.Next()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return err
		}
		if filepath.Base(header.Name) != "fpcalc" {
			continue
		}
		out, err := os.OpenFile(localPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0755)
		if err != nil {
			return err
		}
		defer out.Close()

		if _, err := io.Copy(out, tr); err != nil {
			return err
		}
		return nil
	}
	return errors.New("fpcalc binary not found inside downloaded tar.gz archive")
}

func fpcalcReleaseForHost() (fpcalcRelease, error) {
	key := runtime.GOOS + "/" + runtime.GOARCH
	rel, ok := fpcalcReleases[key]
	if !ok {
		return fpcalcRelease{}, fmt.Errorf("no hay release de fpcalc para %s (instalá fpcalc en el PATH manualmente)", key)
	}
	return rel, nil
}

// FingerprintFile huella los primeros lengthSec segundos de path directamente
// con fpcalc (que decodea vía su FFmpeg embebido). Sirve tanto para archivos de
// video como para los .ogg de themes de AnimeThemes. lengthSec <= 0 huella el
// archivo completo. Devuelve el fingerprint raw, la duración decodificada y error.
func FingerprintFile(ctx context.Context, fpcalcBin, path string, lengthSec int) ([]int, float64, error) {
	// -length va SIEMPRE explícito: si se omite, fpcalc trunca a 120 s, así que
	// "archivo completo" solo es cierto pasando -length 0 (0 = sin límite).
	length := 0
	if lengthSec > 0 {
		length = lengthSec
	}
	args := []string{"-raw", "-json", "-length", strconv.Itoa(length), path}

	cmd := util.NewCmdCtxLowPriority(ctx, fpcalcBin, args...)
	var out bytes.Buffer
	cmd.Stdout = &out
	if err := cmd.Run(); err != nil {
		return nil, 0, fmt.Errorf("failed to run fpcalc: %w", err)
	}

	var res fingerprintResult
	if err := json.Unmarshal(out.Bytes(), &res); err != nil {
		return nil, 0, fmt.Errorf("failed to parse fpcalc JSON: %w", err)
	}
	return res.Fingerprint, res.Duration, nil
}

// FingerprintRange huella una ventana arbitraria [startSec, startSec+lengthSec]
// de path. Usa ffmpeg para seekear y decodear el rango a PCM mono s16le 11025Hz,
// que se pipea a fpcalc. Necesario para outros (no empiezan en 0) y para acotar
// ventanas dentro de un archivo. Devuelve el fingerprint y la duración del rango.
//
// audioIdx elige el track de audio a huellar (índice relativo, como en
// `-map 0:a:N`); -1 deja que ffmpeg elija. Pasarlo explícito importa: en
// archivos multi-audio la elección automática de ffmpeg no es estable ni entre
// episodios de la misma serie, y el track equivocado (un dub que re-graba la
// OP/ED en otro idioma) no matchea nunca contra la referencia japonesa de
// AnimeThemes. Ver Detector.loadEpisodes.
func FingerprintRange(ctx context.Context, fpcalcBin, ffmpegPath, path string, startSec, lengthSec float64, audioIdx int) ([]int, float64, error) {
	if startSec < 0 {
		startSec = 0
	}

	ffmpegArgs := []string{"-ss", fmt.Sprintf("%f", startSec)}
	if lengthSec > 0 {
		ffmpegArgs = append(ffmpegArgs, "-t", fmt.Sprintf("%f", lengthSec))
	}
	ffmpegArgs = append(ffmpegArgs, "-i", path)
	if audioIdx >= 0 {
		ffmpegArgs = append(ffmpegArgs, "-map", fmt.Sprintf("0:a:%d", audioIdx))
	}
	ffmpegArgs = append(ffmpegArgs, "-ac", "1", "-ar", "11025", "-f", "s16le", "-")

	// -length es OBLIGATORIO: fpcalc trunca a 120 s por defecto, así que sin él
	// una ventana de 480 s (la del outro) se huellaba solo en sus primeros 120 s
	// y el ED, que vive al final, quedaba siempre fuera → 0 detecciones. Se pide
	// el largo completo de la ventana (redondeado hacia arriba); ffmpeg ya la
	// acota con -t, así que no puede leer de más.
	fpcalcArgs := []string{"-rate", "11025", "-channels", "1", "-format", "s16le", "-raw", "-json"}
	if lengthSec > 0 {
		fpcalcArgs = append(fpcalcArgs, "-length", strconv.Itoa(int(math.Ceil(lengthSec))+1))
	}
	fpcalcArgs = append(fpcalcArgs, "-")

	ffmpegCmd := util.NewCmdCtxLowPriority(ctx, ffmpegPath, ffmpegArgs...)
	fpcalcCmd := util.NewCmdCtxLowPriority(ctx, fpcalcBin, fpcalcArgs...)

	pr, pw := io.Pipe()
	ffmpegCmd.Stdout = pw
	fpcalcCmd.Stdin = pr

	var fpcalcOut bytes.Buffer
	fpcalcCmd.Stdout = &fpcalcOut

	if err := ffmpegCmd.Start(); err != nil {
		pr.Close()
		pw.Close()
		return nil, 0, fmt.Errorf("failed to start ffmpeg: %w", err)
	}

	if err := fpcalcCmd.Start(); err != nil {
		pr.Close()
		pw.Close()
		_ = util.KillCmd(ffmpegCmd)
		return nil, 0, fmt.Errorf("failed to start fpcalc: %w", err)
	}

	// La goroutine espera a ffmpeg y cierra el write-end del pipe cuando termina,
	// para que fpcalc vea EOF. errCh garantiza que nunca se filtra: siempre sale
	// antes de que esta función retorne.
	errCh := make(chan struct{}, 1)
	go func() {
		defer close(errCh)
		_ = ffmpegCmd.Wait()
		pw.Close()
	}()

	if err := fpcalcCmd.Wait(); err != nil {
		pr.CloseWithError(err)
		_ = util.KillCmd(ffmpegCmd)
		<-errCh
		return nil, 0, fmt.Errorf("fpcalc execution failed: %w", err)
	}
	pr.Close()
	<-errCh

	var res fingerprintResult
	if err := json.Unmarshal(fpcalcOut.Bytes(), &res); err != nil {
		return nil, 0, fmt.Errorf("failed to parse fpcalc JSON output: %w", err)
	}
	return res.Fingerprint, res.Duration, nil
}
