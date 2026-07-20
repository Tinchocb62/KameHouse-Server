// Package animethemes es un cliente para la API pública de AnimeThemes.moe, que
// indexa los openings/endings oficiales de casi todo el catálogo de anime por ID
// de MyAnimeList/AniList. skipdetect lo usa como fuente primaria: descarga el
// audio del theme y lo correlaciona contra cada episodio para ubicar la OP/ED.
package animethemes

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/goccy/go-json"
	"github.com/rs/zerolog"

	"kamehouse/internal/database/db"
	"kamehouse/internal/skipdetect"
	"kamehouse/internal/util/limiter"

	httputil "kamehouse/internal/util/http"
)

const (
	cacheProvider = "animethemes"
	cacheTTLHit   = 30 * 24 * time.Hour // themes encontrados: 30 días
	cacheTTLMiss  = 7 * 24 * time.Hour  // series sin datos: 7 días (evita golpear el API en cada scan)
	baseURL       = "https://api.animethemes.moe"
)

// Client consulta AnimeThemes con rate limiting y cache persistente en la DB.
type Client struct {
	logger     *zerolog.Logger
	httpClient *http.Client
	db         *db.Database
	limiter    *limiter.Limiter
}

// NewClient construye el cliente. db se usa para la cache persistente de themes.
func NewClient(logger *zerolog.Logger, database *db.Database) *Client {
	return &Client{
		logger:     logger,
		httpClient: httputil.NewFastClient(),
		db:         database,
		// AnimeThemes tolera ~90 req/min anónimo; 1 req/s es cortés de sobra.
		limiter: limiter.NewLimiter(time.Second, 1),
	}
}

// ─── Shape de la respuesta del API (subconjunto) ─────────────────────────────

type apiResponse struct {
	Anime []apiAnime `json:"anime"`
}

type apiAnime struct {
	Name        string     `json:"name"`
	AnimeThemes []apiTheme `json:"animethemes"`
}

type apiTheme struct {
	Slug    string     `json:"slug"`
	Type    string     `json:"type"`
	Group   *apiGroup  `json:"group"`
	Entries []apiEntry `json:"animethemeentries"`
}

// apiGroup agrupa versiones alternativas de un theme (re-máster, broadcast, o
// re-grabación en otro idioma). group == null es el theme original.
type apiGroup struct {
	Name string `json:"name"`
	Slug string `json:"slug"`
}

type apiEntry struct {
	Episodes string     `json:"episodes"`
	Version  int        `json:"version"`
	Videos   []apiVideo `json:"videos"`
}

type apiVideo struct {
	Audio *apiAudio `json:"audio"`
}

type apiAudio struct {
	Link string `json:"link"`
}

// GetThemesByMALID devuelve los themes (aplanados a un Theme por entry) de la
// serie con el MAL id dado. Cachea el resultado en metadata_cache; también
// cachea los misses (lista vacía) para no reconsultar en cada scan.
func (c *Client) GetThemesByMALID(ctx context.Context, malID int) ([]skipdetect.Theme, error) {
	cacheKey := fmt.Sprintf("mal:%d", malID)

	var cached []skipdetect.Theme
	if ok, err := db.GetMetadataCache(c.db, cacheProvider, cacheKey, &cached); err == nil && ok {
		return cached, nil
	}

	themes, err := c.fetchThemes(ctx, malID)
	if err != nil {
		return nil, err
	}

	ttl := cacheTTLHit
	if len(themes) == 0 {
		ttl = cacheTTLMiss
	}
	if err := db.UpsertMetadataCache(c.db, cacheProvider, cacheKey, themes, ttl); err != nil {
		c.logger.Warn().Err(err).Int("malId", malID).Msg("animethemes: no se pudo cachear themes")
	}

	return themes, nil
}

func (c *Client) fetchThemes(ctx context.Context, malID int) ([]skipdetect.Theme, error) {
	// filter[has]=resources es CLAVE: sin él, filter[external_id] se ignora y el
	// API devuelve el catálogo entero.
	url := fmt.Sprintf(
		"%s/anime?filter%%5Bhas%%5D=resources&filter%%5Bsite%%5D=MyAnimeList&filter%%5Bexternal_id%%5D=%d&include=animethemes.animethemeentries.videos.audio,animethemes.group",
		baseURL, malID,
	)

	var resp *http.Response
	var lastErr error
	for attempt := 0; attempt < 3; attempt++ {
		if err := c.limiter.Wait(ctx); err != nil {
			return nil, err
		}
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
		if err != nil {
			return nil, err
		}
		req.Header.Set("Accept", "application/json")

		resp, lastErr = c.httpClient.Do(req)
		if lastErr != nil {
			continue
		}
		if resp.StatusCode == http.StatusTooManyRequests {
			resp.Body.Close()
			time.Sleep(2 * time.Second)
			continue
		}
		break
	}
	if lastErr != nil {
		return nil, lastErr
	}
	if resp == nil {
		return nil, fmt.Errorf("animethemes: sin respuesta tras reintentos")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("animethemes api returned status %d", resp.StatusCode)
	}

	var parsed apiResponse
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return nil, err
	}

	return flattenThemes(parsed), nil
}

// flattenThemes convierte la respuesta anidada en un Theme por entry (versión),
// cada uno con su rango de episodios y su URL de audio. Descarta entries sin
// audio. Un mismo theme con varias versiones produce varios Theme (que suelen
// compartir AudioURL — el matcher dedupe por URL al huellar).
func flattenThemes(parsed apiResponse) []skipdetect.Theme {
	var out []skipdetect.Theme
	if len(parsed.Anime) == 0 {
		return out
	}
	for _, t := range parsed.Anime[0].AnimeThemes {
		// Los dubs traen voces en otro idioma: nunca huellan contra el audio
		// (japonés) del episodio y solo gastan descargas. Los descartamos acá.
		if isDubGroup(t.Group) {
			continue
		}
		for _, e := range t.Entries {
			var audioURL string
			for _, v := range e.Videos {
				if v.Audio != nil && v.Audio.Link != "" {
					audioURL = v.Audio.Link
					break
				}
			}
			if audioURL == "" {
				continue
			}
			out = append(out, skipdetect.Theme{
				Slug:     t.Slug,
				Type:     t.Type,
				Sequence: e.Version,
				Episodes: e.Episodes,
				AudioURL: audioURL,
			})
		}
	}
	return out
}

// dubGroupSlugs son los "grupos" de AnimeThemes que corresponden a
// re-grabaciones del theme en otro idioma (dubs). El audio no coincide con el
// del episodio original, así que se descartan. El resto de grupos (TV/BD
// Version, HD Remaster, Sound Renewal...) es la misma canción en otro máster y
// sí matchea, por eso no se filtra.
var dubGroupSlugs = map[string]bool{
	"EN":      true, // English Version
	"EN4Kids": true, // English Version - 4Kids
	"KO":      true, // Korean Version
	"CN":      true, // Chinese Version
}

// dubGroupNameHints captura dubs de idiomas que aún no aparecen en el catálogo
// (el set de grupos crece con el tiempo), matcheando por nombre.
var dubGroupNameHints = []string{
	"english", "korean", "chinese", "spanish", "latin",
	"german", "french", "portuguese", "italian", "dub",
}

// isDubGroup indica si el grupo de un theme es una re-grabación en otro idioma.
func isDubGroup(g *apiGroup) bool {
	if g == nil {
		return false
	}
	if dubGroupSlugs[g.Slug] {
		return true
	}
	name := strings.ToLower(g.Name)
	for _, h := range dubGroupNameHints {
		if strings.Contains(name, h) {
			return true
		}
	}
	return false
}

// DownloadAudio descarga el audio del theme a destPath. Es idempotente: si el
// archivo ya existe y no está vacío, no vuelve a descargar.
func (c *Client) DownloadAudio(ctx context.Context, audioURL, destPath string) error {
	if info, err := os.Stat(destPath); err == nil && info.Size() > 0 {
		return nil
	}
	if err := os.MkdirAll(filepath.Dir(destPath), 0755); err != nil {
		return err
	}

	if err := c.limiter.Wait(ctx); err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, audioURL, nil)
	if err != nil {
		return err
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("animethemes: descarga de audio devolvió status %d", resp.StatusCode)
	}

	// Escribimos a un tmp y renombramos para no dejar archivos parciales si se
	// corta la descarga (un .ogg truncado rompería el fingerprint).
	tmp := destPath + ".tmp"
	f, err := os.Create(tmp)
	if err != nil {
		return err
	}
	if _, err := io.Copy(f, resp.Body); err != nil {
		f.Close()
		os.Remove(tmp)
		return err
	}
	f.Close()
	return os.Rename(tmp, destPath)
}
