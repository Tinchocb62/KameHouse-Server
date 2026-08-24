package scanner

import (
	"context"
)

// GetDragonBallSagas returns the saga/volume grouping for a given Dragon Ball TMDB ID.
func GetDragonBallSagas(tmdbID int) []sagaResolution {
	switch tmdbID {
	case 12609: // Dragon Ball
		return []sagaResolution{
			{id: "pilaf", name: "Saga de Pilaf", startEp: 1, endEp: 13},
			{id: "torneo-21", name: "21º Torneo de Artes Marciales", startEp: 14, endEp: 28},
			{id: "red-ribbon", name: "Saga de la Patrulla Roja", startEp: 29, endEp: 68},
			{id: "uranai-baba", name: "Saga de la Abuela Baba", startEp: 69, endEp: 82},
			{id: "torneo-22", name: "22º Torneo de Artes Marciales", startEp: 83, endEp: 101},
			{id: "piccolo", name: "Saga de Piccolo Daimaoh", startEp: 102, endEp: 122},
			{id: "piccolo-jr", name: "Saga de Piccolo Jr.", startEp: 123, endEp: 153},
		}
	case 12971: // Dragon Ball Z
		return []sagaResolution{
			{id: "saiyajin", name: "Saga de los Saiyajin", startEp: 1, endEp: 35},
			{id: "freezer", name: "Saga de Freezer", startEp: 36, endEp: 107},
			{id: "garlic-jr", name: "Saga de Garlic Jr.", startEp: 108, endEp: 117},
			{id: "androides", name: "Saga de los Androides", startEp: 118, endEp: 139},
			{id: "cell", name: "Saga de Cell", startEp: 140, endEp: 194},
			{id: "torneo-otro-mundo", name: "Torneo del Otro Mundo", startEp: 195, endEp: 199},
			{id: "gran-saiyaman", name: "Saga del Gran Saiyaman", startEp: 200, endEp: 209},
			{id: "majin-buu", name: "Saga de Majin Buu", startEp: 210, endEp: 291},
		}
	case 12697: // Dragon Ball GT
		return []sagaResolution{
			{id: "black-star", name: "Saga de las Esferas del Dragón Definitivas", startEp: 1, endEp: 16},
			{id: "baby", name: "Saga de Baby", startEp: 17, endEp: 40},
			{id: "super-17", name: "Saga de Super-17", startEp: 41, endEp: 47},
			{id: "shadow-dragons", name: "Saga de los Dragones Malignos", startEp: 48, endEp: 64},
		}
	case 62715: // Dragon Ball Super
		return []sagaResolution{
			{id: "batalla-dioses", name: "Saga de la Batalla de los Dioses", startEp: 1, endEp: 14},
			{id: "resurreccion-f", name: "Saga de la Resurrección de 'F'", startEp: 15, endEp: 27},
			{id: "universo-6", name: "Saga del Torneo del Universo 6", startEp: 28, endEp: 41},
			{id: "copy-vegeta", name: "Saga del Agua Sobrenatural (Vegeta Copia)", startEp: 42, endEp: 46},
			{id: "trunks-futuro", name: "Saga de Trunks del Futuro (Goku Black)", startEp: 47, endEp: 76},
			{id: "exhibicion-zen", name: "Saga de Exhibición Zen", startEp: 77, endEp: 81},
			{id: "reclutamiento-u7", name: "Saga de Reclutamiento", startEp: 82, endEp: 96},
			{id: "torneo-poder", name: "Saga del Torneo del Poder", startEp: 97, endEp: 131},
		}
	case 236994: // Dragon Ball Daima
		return []sagaResolution{
			{id: "daima-misterio", name: "El Misterio del Mundo Demonio", startEp: 1, endEp: 10},
			{id: "daima-travesia", name: "La Travesía en el Mundo Demonio", startEp: 11, endEp: 20},
		}
	}
	return nil
}

// InterceptSagas check if we should use local saga definitions instead of TMDB groups
func (scn *Scanner) InterceptSagas(ctx context.Context, tmdbID int) []sagaResolution {
	localSagas := GetDragonBallSagas(tmdbID)
	if len(localSagas) > 0 {
		return localSagas
	}
	// Fallback to TMDB groups
	return scn.resolveSagasForMediaSync(ctx, tmdbID)
}

// SagaInfo is the exported view of a saga, for consumers outside the scanner
// package (e.g. API handlers) that don't have access to the unexported
// sagaResolution type.
type SagaInfo struct {
	ID       string
	Name     string
	StartEp  int
	EndEp    int
	SubSagas []SubSagaInfo
}

// SubSagaInfo is the exported view of a sub-saga (a story arc within a saga).
type SubSagaInfo struct {
	ID      string
	Name    string
	StartEp int
	EndEp   int
}

// GetDragonBallSagaInfo returns the saga/volume grouping for a given Dragon
// Ball TMDB ID as exported SagaInfo values (including sub-sagas), for use by
// the API handlers that power the frontend saga menu. This is a richer,
// more finely-subdivided dataset than GetDragonBallSagas (which drives
// scan-time episode tagging and must stay stable for already-indexed data).
func GetDragonBallSagaInfo(tmdbID int) []SagaInfo {
	raw := getDragonBallSagaDetails(tmdbID)
	out := make([]SagaInfo, 0, len(raw))
	for _, s := range raw {
		subSagas := make([]SubSagaInfo, 0, len(s.subSagas))
		for _, ss := range s.subSagas {
			subSagas = append(subSagas, SubSagaInfo{ID: ss.id, Name: ss.name, StartEp: ss.startEp, EndEp: ss.endEp})
		}
		out = append(out, SagaInfo{ID: s.id, Name: s.name, StartEp: s.startEp, EndEp: s.endEp, SubSagas: subSagas})
	}
	return out
}

// getDragonBallSagaDetails mirrors apps/web/src/lib/config/dragonball_sagas.ts,
// including sub-saga (story arc) subdivisions, so the saga menu shown to
// users matches the granularity the frontend previously displayed.
func getDragonBallSagaDetails(tmdbID int) []sagaResolution {
	switch tmdbID {
	case 12609: // Dragon Ball (Original)
		return []sagaResolution{
			{id: "pilaf", name: "Saga del Emperador Pilaf", startEp: 1, endEp: 13, subSagas: []subSagaResolution{{id: "busqueda-esferas", name: "En busca de las Esferas del Dragón", startEp: 1, endEp: 7}, {id: "pilaf-castillo", name: "El Castillo del Emperador Pilaf", startEp: 8, endEp: 13}}},
			{id: "torneo-21", name: "Saga 21° Torneo de las Artes Marciales", startEp: 14, endEp: 28, subSagas: []subSagaResolution{{id: "entrenamiento-roshi", name: "Entrenamiento con el Maestro Roshi", startEp: 14, endEp: 20}, {id: "torneo-21-combates", name: "El 21° Torneo", startEp: 21, endEp: 28}}},
			{id: "red-ribbon", name: "Saga de la Patrulla Roja", startEp: 29, endEp: 68, subSagas: []subSagaResolution{{id: "coronel-silver", name: "Coronel Silver y los primeros enfrentamientos", startEp: 29, endEp: 33}, {id: "torre-fuerza", name: "La Torre de la Fuerza — General White", startEp: 34, endEp: 45}, {id: "general-blue", name: "Aventura Submarina — General Blue", startEp: 46, endEp: 57}, {id: "tao-pai-pai", name: "El Asesino Tao Pai Pai y la Torre Karin", startEp: 58, endEp: 68}}},
			{id: "uranai-baba", name: "Saga de Uranai Baba", startEp: 69, endEp: 82, subSagas: []subSagaResolution{{id: "cinco-guerreros", name: "Los Cinco Guerreros de Uranai Baba", startEp: 69, endEp: 76}, {id: "reencuentro-gohan", name: "El Reencuentro con el Abuelo Gohan", startEp: 77, endEp: 82}}},
			{id: "torneo-22", name: "Saga 22° Torneo de las Artes Marciales", startEp: 83, endEp: 101, subSagas: []subSagaResolution{{id: "preparacion-22", name: "Preparación para el 22° Torneo", startEp: 83, endEp: 85}, {id: "combates-22", name: "El 22° Torneo — Goku vs Tenshinhan", startEp: 86, endEp: 101}}},
			{id: "piccolo-daimaku", name: "Saga del Rey Demonio Piccolo", startEp: 102, endEp: 122, subSagas: []subSagaResolution{{id: "liberacion-piccolo", name: "Liberación del Rey Demonio", startEp: 102, endEp: 111}, {id: "batalla-piccolo", name: "La Batalla Final contra el Rey Demonio", startEp: 112, endEp: 122}}},
			{id: "piccolo-jr", name: "Saga de Piccolo Jr.", startEp: 123, endEp: 153, subSagas: []subSagaResolution{{id: "preliminares-23", name: "Preliminares del 23° Torneo", startEp: 123, endEp: 133}, {id: "goku-vs-piccolo-jr", name: "La Final: Goku vs Piccolo Jr.", startEp: 134, endEp: 153}}},
		}
	case 12971: // Dragon Ball Z
		return []sagaResolution{
			{id: "saiyajin", name: "Saga Saiyajin", startEp: 1, endEp: 35, subSagas: []subSagaResolution{{id: "raditz", name: "La Llegada de Raditz", startEp: 1, endEp: 6}, {id: "entrenamiento-z", name: "Entrenamiento Especial", startEp: 7, endEp: 20}, {id: "vegeta-nappa", name: "Batalla contra Nappa y Vegeta", startEp: 21, endEp: 35}}},
			{id: "namek-freezer", name: "Saga Namek y Freezer", startEp: 36, endEp: 107, subSagas: []subSagaResolution{{id: "viaje-namek", name: "Viaje a Namek", startEp: 36, endEp: 67}, {id: "fuerzas-ginyu", name: "Las Fuerzas Especiales Ginyu", startEp: 68, endEp: 74}, {id: "goku-llega-namek", name: "Goku Llega a Namek", startEp: 75, endEp: 82}, {id: "cuatro-formas-freezer", name: "Las Cuatro Transformaciones de Freezer", startEp: 83, endEp: 97}, {id: "ssj-explosion-namek", name: "Nace el Super Saiyajin — Namek en Llamas", startEp: 98, endEp: 107}}},
			{id: "garlic-jr", name: "Saga Garlic Jr. (Relleno)", startEp: 108, endEp: 117},
			{id: "androides", name: "Saga de los Androides", startEp: 118, endEp: 139, subSagas: []subSagaResolution{{id: "trunks-futuro", name: "Trunks del Futuro y la Advertencia", startEp: 118, endEp: 125}, {id: "androides-17-18", name: "Los Androides 17, 18 y 16", startEp: 126, endEp: 139}}},
			{id: "cell", name: "Saga de Cell", startEp: 140, endEp: 194, subSagas: []subSagaResolution{{id: "cell-imperfecto", name: "Cell Imperfecto", startEp: 140, endEp: 152}, {id: "cell-semiperfecto", name: "Cell Semiperfecto", startEp: 153, endEp: 165}, {id: "juegos-cell", name: "Los Juegos de Cell", startEp: 166, endEp: 194}}},
			{id: "torneo-otro-mundo", name: "Saga del Torneo del Otro Mundo (Relleno)", startEp: 195, endEp: 199},
			{id: "majin-buu", name: "Saga de Majin Buu", startEp: 200, endEp: 291, subSagas: []subSagaResolution{
				{id: "gran-saiyaman-arc", name: "El Gran Saiyaman", startEp: 200, endEp: 209},
				{id: "torneo-25", name: "El 25° Torneo de Artes Marciales", startEp: 210, endEp: 219},
				{id: "babidi-dabura-vegeta-majin", name: "La Nave de Babidi y Majin Vegeta", startEp: 220, endEp: 231},
				{id: "despertar-buu-sacrificio-vegeta", name: "El Despertar de Buu y el Sacrificio de Vegeta", startEp: 232, endEp: 237},
				{id: "ssj3-fusion-dance", name: "El Super Saiyajin 3 y la Fusión", startEp: 238, endEp: 253},
				{id: "super-buu", name: "La Amenaza de Super Buu", startEp: 254, endEp: 275},
				{id: "fusion-kid-buu", name: "Fusión y Batalla Final contra Kid Buu", startEp: 276, endEp: 287},
				{id: "mundo-paz", name: "Un Mundo en Paz (Epílogo)", startEp: 288, endEp: 291},
			}},
		}
	case 12697: // Dragon Ball GT
		return []sagaResolution{
			{id: "black-star", name: "Saga de las Esferas del Dragón Negras", startEp: 1, endEp: 16, subSagas: []subSagaResolution{{id: "deseo-pilaf", name: "El Deseo de Pilaf y la Transformación", startEp: 1, endEp: 3}, {id: "viaje-galaxia", name: "Viaje por la Galaxia", startEp: 4, endEp: 16}}},
			{id: "baby", name: "Saga de Baby", startEp: 17, endEp: 40, subSagas: []subSagaResolution{{id: "invasion-baby", name: "La Invasión de Baby", startEp: 17, endEp: 27}, {id: "ssj4-baby", name: "Super Saiyajin 4 vs Baby", startEp: 28, endEp: 40}}},
			{id: "super-17", name: "Saga de Super 17", startEp: 41, endEp: 47, subSagas: []subSagaResolution{{id: "portal-infierno", name: "El Portal del Infierno y los Regresos", startEp: 41, endEp: 43}, {id: "super-17-batalla", name: "La Batalla contra Super 17", startEp: 44, endEp: 47}}},
			{id: "shadow-dragons", name: "Saga de los Dragones Malignos", startEp: 48, endEp: 64, subSagas: []subSagaResolution{{id: "dragones-2-6", name: "Los Primeros Dragones (2★ al 6★)", startEp: 48, endEp: 56}, {id: "nuova-eis", name: "Nuova Shenron (4★) y Eis Shenron (6★)", startEp: 57, endEp: 60}, {id: "omega-shenron", name: "Omega Shenron (1★) y el Final Eterno", startEp: 61, endEp: 64}}},
		}
	case 62715: // Dragon Ball Super
		return []sagaResolution{
			{id: "batalla-dioses", name: "Saga La Batalla de los Dioses", startEp: 1, endEp: 14, subSagas: []subSagaResolution{{id: "llegada-beerus", name: "La Profecía y la Llegada de Beerus", startEp: 1, endEp: 5}, {id: "ssg-batalla", name: "El Super Saiyajin Dios y la Batalla", startEp: 6, endEp: 14}}},
			{id: "resurreccion-f", name: "Saga La Resurrección de 'F'", startEp: 15, endEp: 27, subSagas: []subSagaResolution{{id: "resurreccion-preparacion", name: "La Resurrección y el Entrenamiento", startEp: 15, endEp: 18}, {id: "freezer-dorado", name: "Freezer Dorado vs Goku y Vegeta", startEp: 19, endEp: 27}}},
			{id: "universo-6", name: "Saga del Torneo del Universo 6", startEp: 28, endEp: 41, subSagas: []subSagaResolution{{id: "torneo-u6", name: "El Torneo entre Universo 6 y 7", startEp: 28, endEp: 41}}},
			{id: "copy-vegeta", name: "Saga de Vegeta Copia", startEp: 42, endEp: 46, subSagas: []subSagaResolution{{id: "copy-vegeta", name: "Vegeta Copia (Relleno)", startEp: 42, endEp: 46}}},
			{id: "trunks-futuro", name: "Saga de Goku Black", startEp: 47, endEp: 76, subSagas: []subSagaResolution{{id: "goku-black-aparicion", name: "El Misterio de Goku Black", startEp: 47, endEp: 61}, {id: "zamasu-fusion", name: "Zamasu Fusionado y el Futuro Destruido", startEp: 62, endEp: 76}}},
			{id: "exhibicion-zen", name: "Saga de Exhibición Zen", startEp: 77, endEp: 81, subSagas: []subSagaResolution{{id: "exhibicion", name: "Torneo de Exhibición de Todo", startEp: 77, endEp: 81}}},
			{id: "reclutamiento-u7", name: "Saga de Reclutamiento", startEp: 82, endEp: 96, subSagas: []subSagaResolution{{id: "reclutamiento", name: "Reclutamiento del Equipo Universo 7", startEp: 82, endEp: 96}}},
			{id: "torneo-poder", name: "Saga del Torneo del Poder", startEp: 97, endEp: 131, subSagas: []subSagaResolution{{id: "torneo-poder-caos-inicial", name: "El Torneo del Poder — 80 Guerreros en el Caos", startEp: 97, endEp: 104}, {id: "universos-caen-jiren-round1", name: "La Caída del Universo 6 y Goku vs Jiren (Ronda 1)", startEp: 105, endEp: 111}, {id: "ui-signal-guerreros-u7", name: "Ultra Instinto Señal y el Equipo Universo 7", startEp: 112, endEp: 122}, {id: "ultra-instinto-completo-victoria", name: "Ultra Instinto Completo y el Triunfo Final", startEp: 123, endEp: 131}}},
		}
	case 236994: // Dragon Ball Daima
		return []sagaResolution{
			{id: "daima", name: "Arco de Daima — El Reino Demoníaco", startEp: 1, endEp: 20, subSagas: []subSagaResolution{{id: "conspiracion-conversion", name: "La Conspiración — Goku se convierte en Niño", startEp: 1, endEp: 3}, {id: "tercer-mundo", name: "El Tercer Mundo Demoníaco y Panzy", startEp: 4, endEp: 7}, {id: "tamagami-segundo-mundo", name: "El Segundo Mundo Demoníaco y los Tamagami", startEp: 8, endEp: 14}, {id: "primer-mundo-gomah-final", name: "El Primer Mundo y la Batalla Final contra el Rey Gomah", startEp: 15, endEp: 20}}},
		}
	}
	return nil
}
