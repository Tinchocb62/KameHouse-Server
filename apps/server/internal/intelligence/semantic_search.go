package intelligence

import (
	"strings"
)

// SemanticEntityType categorizes a matched lore entity.
type SemanticEntityType string

const (
	EntityCharacter      SemanticEntityType = "CHARACTER"
	EntityTransformation SemanticEntityType = "TRANSFORMATION"
	EntitySaga           SemanticEntityType = "SAGA"
	EntityMovie          SemanticEntityType = "MOVIE"
	EntityTechnique      SemanticEntityType = "TECHNIQUE"
)

// SemanticEntity represents a indexed concept in Dragon Ball lore.
type SemanticEntity struct {
	ID          string             `json:"id"`
	Name        string             `json:"name"`
	Type        SemanticEntityType `json:"type"`
	Keywords    []string           `json:"keywords"`
	MediaID     int                `json:"mediaId"`
	TmdbID      int                `json:"tmdbId"`
	MediaType   string             `json:"mediaType"` // "SHOW", "MOVIE"
	Era         string             `json:"era"`
	Description string             `json:"description"`
	Episodes    string             `json:"episodes,omitempty"` // e.g. "Eps 118-194"
	BadgeLabel  string             `json:"badgeLabel"`
}

// SemanticSearchResult is the returned item matching user query.
type SemanticSearchResult struct {
	Entity     *SemanticEntity `json:"entity"`
	Score      float64         `json:"score"`
	MatchLabel string          `json:"matchLabel"`
}

var semanticDictionary = []*SemanticEntity{
	// ── Personajes ─────────────────────────────────────────────────────────────
	{
		ID:          "char_goku",
		Name:        "Son Goku (Kakarotto)",
		Type:        EntityCharacter,
		Keywords:    []string{"goku", "kakaroto", "kakarotto", "son goku", "sayayin"},
		MediaID:     12971,
		TmdbID:      12971,
		MediaType:   "SHOW",
		Era:         "dbz",
		Description: "El héroe supremo y protector de la Tierra. Guerrero Saiyajin criado con bondad.",
		BadgeLabel:  "PERSONAJE",
	},
	{
		ID:          "char_vegeta",
		Name:        "Príncipe Vegeta",
		Type:        EntityCharacter,
		Keywords:    []string{"vegeta", "principe vegeta", "majin vegeta", "orgullo saiyajin"},
		MediaID:     12971,
		TmdbID:      12971,
		MediaType:   "SHOW",
		Era:         "dbz",
		Description: "Príncipe de todos los Saiyajin y eterno rival de Goku.",
		BadgeLabel:  "PERSONAJE",
	},
	{
		ID:          "char_broly",
		Name:        "Broly (El Súper Saiyajin Legendario)",
		Type:        EntityCharacter,
		Keywords:    []string{"broly", "legendario", "guerrero legendario", "bio broly", "dbs broly"},
		MediaID:     1503314,
		TmdbID:      503314,
		MediaType:   "MOVIE",
		Era:         "dbs",
		Description: "El Saiyajin mutante con un poder destructivo e ilimitado.",
		BadgeLabel:  "PERSONAJE",
	},
	{
		ID:          "char_gohan_future",
		Name:        "Gohan del Futuro",
		Type:        EntityCharacter,
		Keywords:    []string{"gohan del futuro", "future gohan", "futuro diferente", "un futuro diferente"},
		MediaID:     1039324,
		TmdbID:      39324,
		MediaType:   "MOVIE",
		Era:         "dbz",
		Description: "El mentor de Trunks y último protector de la línea temporal del futuro.",
		BadgeLabel:  "PERSONAJE",
	},
	{
		ID:          "char_bardock",
		Name:        "Bardock (El Padre de Goku)",
		Type:        EntityCharacter,
		Keywords:    []string{"bardock", "padre de goku", "padre", "el padre de goku", "bardo"},
		MediaID:     1039323,
		TmdbID:      39323,
		MediaType:   "MOVIE",
		Era:         "dbz",
		Description: "Guerrero Saiyajin que desafió en solitario al tirano Freezer para defender el Planeta Vegeta.",
		BadgeLabel:  "PERSONAJE",
	},
	{
		ID:          "char_beerus",
		Name:        "Lord Bills (Dios de la Destrucción)",
		Type:        EntityCharacter,
		Keywords:    []string{"bills", "beerus", "dios de la destruccion", "whis", "dioses"},
		MediaID:     62715,
		TmdbID:      62715,
		MediaType:   "SHOW",
		Era:         "dbs",
		Description: "El Dios de la Destrucción del Universo 7 y buscador del Súper Saiyajin Dios.",
		BadgeLabel:  "PERSONAJE",
	},

	// ── Transformaciones ───────────────────────────────────────────────────────
	{
		ID:          "trans_ultra_instinct",
		Name:        "Ultra Instinto (Migatte no Gokui)",
		Type:        EntityTransformation,
		Keywords:    []string{"ultra instinto", "migatte", "doctrina egoista", "omen", "mastered", "plata"},
		MediaID:     62715,
		TmdbID:      62715,
		MediaType:   "SHOW",
		Era:         "dbs",
		Episodes:    "Eps 110, 116, 129-131",
		Description: "El estado divino donde el cuerpo reacciona y esquiva de forma autónoma sin intermediación del pensamiento.",
		BadgeLabel:  "TRANSFORMACIÓN",
	},
	{
		ID:          "trans_ssj4",
		Name:        "Súper Saiyajin 4 (SSJ4)",
		Type:        EntityTransformation,
		Keywords:    []string{"ssj4", "super saiyajin 4", "saiyajin 4", "ozaru dorado", "gt"},
		MediaID:     12697,
		TmdbID:      12697,
		MediaType:   "SHOW",
		Era:         "dbgt",
		Episodes:    "Eps 34-40, 58-64",
		Description: "La cúspide del poder primal Saiyajin que combina la forma Ozaru Dorado con el control humano.",
		BadgeLabel:  "TRANSFORMACIÓN",
	},
	{
		ID:          "trans_gohan_beast",
		Name:        "Gohan Bestia (Beast Gohan)",
		Type:        EntityTransformation,
		Keywords:    []string{"beast", "gohan bestia", "bestia", "super hero", "cell max", "makankosappo"},
		MediaID:     1610150,
		TmdbID:      610150,
		MediaType:   "MOVIE",
		Era:         "dbs",
		Description: "La evolución definitiva del potencial oculto de Gohan desatada tras la caída de Piccolo.",
		BadgeLabel:  "TRANSFORMACIÓN",
	},
	{
		ID:          "trans_gogeta_vegito",
		Name:        "Fusiones Divinas: Vegetto y Gogeta",
		Type:        EntityTransformation,
		Keywords:    []string{"fusion", "gogeta", "vegetto", "vegito", "potara", "danza de la fusion"},
		MediaID:     1039107,
		TmdbID:      39107,
		MediaType:   "MOVIE",
		Era:         "dbz",
		Description: "La unión de Goku y Vegeta a través de la danza metamorana o los pendientes Pothala.",
		BadgeLabel:  "FUSIÓN",
	},

	// ── Sagas y Arcos ─────────────────────────────────────────────────────────
	{
		ID:          "saga_saiyajin",
		Name:        "Saga de los Saiyajin (Llegada de Vegeta)",
		Type:        EntitySaga,
		Keywords:    []string{"saga saiyajin", "saiyajin", "raditz", "nappa", "vegeta vs goku", "kaioken"},
		MediaID:     12971,
		TmdbID:      12971,
		MediaType:   "SHOW",
		Era:         "dbz",
		Episodes:    "Eps 1-35",
		Description: "El inicio de DBZ: muerte de Goku con Raditz, entrenamiento en el Más Allá y duelo contra Vegeta.",
		BadgeLabel:  "SAGA",
	},
	{
		ID:          "saga_freezer",
		Name:        "Saga de Freezer (Namekusei y el Super Saiyajin)",
		Type:        EntitySaga,
		Keywords:    []string{"saga de freezer", "freezer", "namekusei", "ginyu", "super saiyajin legendario"},
		MediaID:     12971,
		TmdbID:      12971,
		MediaType:   "SHOW",
		Era:         "dbz",
		Episodes:    "Eps 36-107",
		Description: "La legendaria batalla de 5 minutos en Namekusei y la primera transformación de Goku en Super Saiyajin.",
		BadgeLabel:  "SAGA",
	},
	{
		ID:          "saga_cell",
		Name:        "Saga de Cell y los Juegos de Cell",
		Type:        EntitySaga,
		Keywords:    []string{"saga de cell", "cell", "androides", "juegos de cell", "cell perfecto", "gohan ssj2"},
		MediaID:     12971,
		TmdbID:      12971,
		MediaType:   "SHOW",
		Era:         "dbz",
		Episodes:    "Eps 118-194",
		Description: "Los androides del Dr. Gero, la evolución de Cell y el mítico Kamehameha Padre e Hijo.",
		BadgeLabel:  "SAGA",
	},
	{
		ID:          "saga_top",
		Name:        "Torneo del Poder (Supervivencia Universal)",
		Type:        EntitySaga,
		Keywords:    []string{"torneo del poder", "supervivencia universal", "jiren", "top", "universo 7"},
		MediaID:     62715,
		TmdbID:      62715,
		MediaType:   "SHOW",
		Era:         "dbs",
		Episodes:    "Eps 77-131",
		Description: "Batalla campal de 80 guerreros de 8 universos con el destino del cosmos en juego.",
		BadgeLabel:  "SAGA",
	},
}

// SearchSemanticEntities searches the lore dictionary using token overlap and keyword matches.
func SearchSemanticEntities(query string) []*SemanticSearchResult {
	q := strings.ToLower(strings.TrimSpace(query))
	if len(q) < 2 {
		return nil
	}

	var results []*SemanticSearchResult

	for _, entity := range semanticDictionary {
		score := 0.0
		matchedKeyword := ""

		eName := strings.ToLower(entity.Name)
		if strings.Contains(eName, q) {
			score = 0.95
			matchedKeyword = entity.Name
		} else {
			for _, kw := range entity.Keywords {
				if strings.Contains(kw, q) || strings.Contains(q, kw) {
					score = 0.85
					matchedKeyword = kw
					break
				}
			}
		}

		if score > 0 {
			results = append(results, &SemanticSearchResult{
				Entity:     entity,
				Score:      score,
				MatchLabel: matchedKeyword,
			})
		}
	}

	return results
}
