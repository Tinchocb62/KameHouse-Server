export const SAGA_CHARACTER_MAPPING: Record<string, string[]> = {
    // DB Original (12609)
    "pilaf": ["Goku", "Bulma", "Yamcha", "Oolong", "Puar", "Roshi", "Pilaf"],
    "torneo-21": ["Goku", "Krilin", "Roshi", "Yamcha", "Bulma"],
    "red-ribbon": ["Goku", "Bulma", "Krilin", "Roshi", "Upa", "Tao Pai Pai", "General Blue", "Comandante Red"],
    "uranai-baba": ["Goku", "Krilin", "Yamcha", "Roshi", "Upa", "Uranai Baba", "Gohan"],
    "torneo-22": ["Goku", "Krilin", "Yamcha", "Roshi", "Tenshinhan", "Chaoz"],
    "piccolo": ["Goku", "Piccolo", "Krilin", "Roshi", "Tenshinhan", "Chaoz", "Yajirobe", "Kami"],
    "piccolo-jr": ["Goku", "Piccolo", "Krilin", "Yamcha", "Tenshinhan", "Chaoz", "Chichi"],

    // DB Z (12971)
    "saiyajin": ["Goku", "Gohan", "Piccolo", "Krilin", "Vegeta", "Nappa", "Raditz", "Yamcha", "Tenshinhan", "Chaoz"],
    "namek-freezer": ["Goku", "Gohan", "Krilin", "Bulma", "Vegeta", "Freezer", "Piccolo", "Dende", "Ginyu"],
    "garlic-jr": ["Gohan", "Krilin", "Piccolo", "Garlic Jr."],
    "androides": ["Goku", "Gohan", "Vegeta", "Trunks", "Piccolo", "Krilin", "Cell", "Androide 17", "Androide 18", "Androide 16"],
    "cell": ["Goku", "Gohan", "Vegeta", "Trunks", "Piccolo", "Krilin", "Cell", "Androide 17", "Androide 18", "Androide 16", "Satan"],
    "torneo-otro-mundo": ["Goku", "Pikkon", "Korr"],
    "gran-saiyaman": ["Gohan", "Videl", "Goten", "Trunks", "Goku", "Vegeta"],
    "gran-saiyaman-torneo25": ["Gohan", "Videl", "Goten", "Trunks", "Goku", "Vegeta", "Satan"],
    "babidi": ["Goku", "Vegeta", "Gohan", "Goten", "Trunks", "Babidi", "Dabura", "Shin"],
    "majin-buu": ["Goku", "Vegeta", "Gohan", "Goten", "Trunks", "Majin Buu", "Babidi", "Piccolo", "Satan"],
    "fusion": ["Goku", "Vegeta", "Goten", "Trunks", "Piccolo", "Super Buu", "Gohan", "Vegetto", "Gotenks"],
    "kid-buu": ["Goku", "Vegeta", "Satan", "Majin Buu (Gordo)", "Kid Buu"],

    // DB GT (12697)
    "black-star": ["Goku", "Trunks", "Pan", "Giru"],
    "baby": ["Goku", "Vegeta", "Baby", "Gohan", "Goten", "Trunks", "Pan"],
    "super-17": ["Goku", "Androide 18", "Super 17", "Vegeta", "Gohan", "Trunks"],
    "shadow-dragons": ["Goku", "Pan", "Vegeta", "Syn Shenron", "Nuova Shenron", "Eis Shenron"],

    // DB Super (62715)
    "batalla-dioses": ["Goku", "Beerus", "Whis", "Vegeta", "Bulma"],
    "resurreccion-f": ["Goku", "Vegeta", "Freezer", "Jaco", "Roshi", "Gohan", "Krilin", "Piccolo"],
    "universo-6": ["Goku", "Vegeta", "Hit", "Cabba", "Champa", "Vados", "Beerus", "Whis"],
    "copy-vegeta": ["Goku", "Vegeta", "Goten", "Trunks", "Jaco", "Monaka"],
    "trunks-futuro": ["Goku", "Vegeta", "Trunks", "Goku Black", "Zamasu", "Mai"],
    "exhibicion-zen": ["Goku", "Gohan", "Majin Buu", "Bergamo", "Basil", "Lavender", "Toppo", "Zeno-sama"],
    "reclutamiento-u7": ["Goku", "Gohan", "Piccolo", "Roshi", "Tenshinhan", "Krilin", "Androide 17", "Androide 18", "Freezer"],
    "torneo-poder": ["Goku", "Jiren", "Vegeta", "Freezer", "Androide 17", "Gohan", "Piccolo", "Roshi", "Krilin", "Tenshinhan", "Hit", "Caulifla", "Kale", "Toppo", "Dyspo", "Kefla"]
};

export interface SagaCharacterEdge {
    role?: string
    node?: {
        name?: { full?: string }
        image?: { large?: string }
    }
}

export function getSagaCharacters(sagaId: string, charactersEdges: SagaCharacterEdge[] | undefined | null) {
    if (!charactersEdges) return [];
    const allowedNames = SAGA_CHARACTER_MAPPING[sagaId] || [];
    if (!allowedNames.length) return [];

    return charactersEdges
        .filter(edge => {
            const fullName = edge.node?.name?.full?.toLowerCase() || "";
            return allowedNames.some(allowed => fullName.includes(allowed.toLowerCase()));
        })
        .map(edge => {
            const fullName = edge.node?.name?.full || "";
            const avatarUrl = edge.node?.image?.large || "";
            
            let roleTag = edge.role === "MAIN" ? "Protagonista" : "Secundario";
            const lowerName = fullName.toLowerCase();
            if (
                lowerName.includes("freezer") || 
                lowerName.includes("cell") || 
                lowerName.includes("buu") || 
                lowerName.includes("baby") ||
                lowerName.includes("goku black") ||
                lowerName.includes("zamasu") ||
                lowerName.includes("pilaf") ||
                (sagaId === "piccolo" && lowerName.includes("piccolo")) ||
                lowerName.includes("tao pai pai") ||
                lowerName.includes("jiren") ||
                lowerName.includes("raditz") ||
                lowerName.includes("nappa") ||
                lowerName.includes("garlic")
            ) {
                roleTag = "Antagonista";
            }
            
            return {
                name: fullName,
                avatarUrl,
                roleTag
            };
        });
}

export const SAGA_LORE_MAPPING: Record<string, { antagonists: string[], keyEvents: string[] }> = {
    // DB Original
    "pilaf": {
        antagonists: ["Emperador Pilaf", "Mai", "Shu"],
        keyEvents: ["Goku conoce a Bulma (Eps 1-2)", "Encuentro con Oolong y Yamcha (Eps 3-7)", "Invocación de Shenlong (Eps 8-11)", "Goku se transforma en Ozaru (Eps 12-13)"]
    },
    "torneo-21": {
        antagonists: ["Jackie Chun", "Krilin (Rivalidad)"],
        keyEvents: ["Entrenamiento con el Maestro Roshi (Eps 14-20)", "Goku y Krilin clasifican al Torneo (Eps 21-23)", "Final épica: Goku vs Jackie Chun (Eps 24-28)"]
    },
    "red-ribbon": {
        antagonists: ["General Blue", "Tao Pai Pai", "Comandante Red", "General Black"],
        keyEvents: ["Asalto a la Torre de la Fuerza (Eps 34-45)", "Aventura en la Ciudad Pirata (Eps 46-57)", "Tao Pai Pai derrota a Goku (Eps 58-64)", "Entrenamiento en la Torre Karin (Eps 65-68)"]
    },
    "uranai-baba": {
        antagonists: ["La Momia", "El Demonio Akkuman", "Gohan (Abuelo)"],
        keyEvents: ["Combate contra los 5 guerreros de la vidente (Eps 69-76)", "Reencuentro emotivo con el Abuelo Gohan (Eps 77-82)", "Localización de la última Esfera del Dragón (Ep 82)"]
    },
    "torneo-22": {
        antagonists: ["Tenshinhan", "Chaoz", "Maestro Tsuru"],
        keyEvents: ["Aparición de la Escuela Grulla (Eps 83-85)", "Krilin vs Chaoz (Ep 91)", "Gran final: Goku vs Tenshinhan (Eps 92-101)"]
    },
    "piccolo": {
        antagonists: ["Piccolo Daimaku", "Tambourine", "Cymbal", "Drum"],
        keyEvents: ["Muerte de Krilin, Roshi y Chaoz (Eps 102-105)", "Goku bebe el Agua Ultra Sagrada (Eps 106-116)", "Derrota de Piccolo Daimaku con el puño de Ozaru (Eps 117-122)"]
    },
    "piccolo-jr": {
        antagonists: ["Piccolo Jr. (Ma Junior)"],
        keyEvents: ["Entrenamiento con Kami-sama (Eps 123-132)", "Batalla campal y victoria de Goku en el 23° Torneo (Eps 133-152)", "Goku se casa con Chichi (Ep 153)"]
    },

    // DB Z
    "saiyajin": {
        antagonists: ["Vegeta", "Nappa", "Raditz"],
        keyEvents: ["Llegada de Raditz y muerte de Goku (Eps 1-6)", "Entrenamiento con Kaio-sama (Eps 7-20)", "Batalla en el desierto y choque de poderes (Eps 21-35)"]
    },
    "namek-freezer": {
        antagonists: ["Freezer", "Fuerzas Especiales Ginyu", "Zarbon", "Dodoria"],
        keyEvents: ["Búsqueda de las Esferas de Namek (Eps 36-67)", "Llegada de Goku y derrota de las Fuerzas Ginyu (Eps 68-74)", "Muerte de Vegeta y Krilin (Eps 75-95)", "Goku alcanza el Super Saiyajin (Eps 96-107)"]
    },
    "garlic-jr": {
        antagonists: ["Garlic Jr.", "Los Cuatro Reyes de la Niebla"],
        keyEvents: ["Liberación de la Neblina del Mal (Eps 108-111)", "Gohan, Krilin y Piccolo defienden el Templo de Kami (Eps 112-115)", "Destrucción de la Zona Muerta (Eps 116-117)"]
    },
    "androides": {
        antagonists: ["Androide 17", "Androide 18", "Androide 19", "Dr. Gero"],
        keyEvents: ["Advertencia de Trunks del Futuro (Eps 118-125)", "Goku cae enfermo del corazón (Eps 126-128)", "Vegeta se transforma en Super Saiyajin (Eps 129-139)"]
    },
    "cell": {
        antagonists: ["Cell (Célula)"],
        keyEvents: ["Cell absorbe a los Androides y alcanza la forma Perfecta (Eps 140-165)", "Entrenamiento en la Habitación del Tiempo (Eps 166-168)", "Los Juegos de Cell (Eps 169-183)", "Gohan alcanza el Super Saiyajin 2 (Eps 184-187)", "Sacrificio de Goku (Eps 188-190)", "Kamehameha Padre e Hijo (Eps 191-194)"]
    },
    "torneo-otro-mundo": {
        antagonists: ["Pikkon (Rival)"],
        keyEvents: ["Inicio del torneo en el Otro Mundo (Eps 195-197)", "Enfrentamiento final: Goku vs Pikkon (Eps 198-199)"]
    },
    "gran-saiyaman": {
        antagonists: ["Criminales locales"],
        keyEvents: ["Gohan asiste a la preparatoria Orange Star (Eps 200-202)", "Debut del Gran Saiyaman (Eps 203-205)", "Videl descubre el secreto de Gohan (Eps 206-207)"]
    },
    "gran-saiyaman-torneo25": {
        antagonists: ["Spopovich", "Yamu"],
        keyEvents: ["Entrenamiento de Gohan, Goten y Videl (Eps 208-211)", "Inicio del 25° Torneo Mundial (Eps 212-216)", "Ataque a Gohan y robo de energía (Eps 217-219)"]
    },
    "babidi": {
        antagonists: ["Babidi", "Dabura", "Majin Vegeta"],
        keyEvents: ["Torneo de las Artes Marciales 25 (Eps 220-224)", "Vegeta se deja controlar por Babidi (Eps 225-227)", "Batalla Goku vs Majin Vegeta (Eps 228-232)"]
    },
    "majin-buu": {
        antagonists: ["Majin Buu (Gordo)", "Babidi"],
        keyEvents: ["Despertar de Majin Buu (Eps 233-236)", "Sacrificio de Vegeta (Eps 237-240)", "Goku alcanza el Super Saiyajin 3 (Eps 241-253)"]
    },
    "fusion": {
        antagonists: ["Super Buu"],
        keyEvents: ["Fusión Gotenks (Eps 254-262)", "Gohan Definitivo (Eps 263-267)", "Fusión Vegetto (Eps 268-275)"]
    },
    "kid-buu": {
        antagonists: ["Kid Buu"],
        keyEvents: ["Destrucción de la Tierra (Eps 276-277)", "Batalla en el Planeta Supremo (Eps 278-285)", "Genkidama final (Eps 286-291)"]
    },

    // DB GT
    "black-star": {
        antagonists: ["Don Kee", "Giru (Temporal)"],
        keyEvents: ["Deseo accidental de Pilaf y Goku niño (Eps 1-3)", "Viaje espacial en la nave espacial (Eps 4-10)", "Recolección de las esferas oscuras (Eps 11-16)"]
    },
    "baby": {
        antagonists: ["Baby", "Guerreros Z poseídos"],
        keyEvents: ["Invasión de Baby a la Tierra (Eps 17-27)", "Goku alcanza el Super Saiyajin 4 (Eps 28-34)", "Combate final y escape de los terrícolas al planeta Tsufuru (Eps 35-40)"]
    },
    "super-17": {
        antagonists: ["Super Androide 17", "Dr. Myuu", "Dr. Gero"],
        keyEvents: ["Apertura del portal del Infierno (Eps 41-43)", "Goku queda atrapado en el Otro Mundo (Eps 44-45)", "Androide 18 y Goku derrotan a Super 17 (Eps 46-47)"]
    },
    "shadow-dragons": {
        antagonists: ["Omega Shenron (1★)", "Eis Shenron (3★)", "Rage Shenron (5★)"],
        keyEvents: ["Nacimiento de los Dragones Malignos (Eps 48-52)", "Viaje de Goku y Pan (Eps 53-57)", "Fusión en Gogeta Super Saiyajin 4 (Eps 58-61)", "Genkidama Universal y partida de Goku (Eps 62-64)"]
    },

    // DB Super
    "batalla-dioses": {
        antagonists: ["Beerus (Bills)"],
        keyEvents: ["Beerus despierta y busca al Super Saiyajin Dios (Eps 1-5)", "Ritual de las 6 almas Saiyajin (Eps 6-9)", "Goku se transforma en Super Saiyajin Dios (Eps 10-14)"]
    },
    "resurreccion-f": {
        antagonists: ["Freezer (Dorado)", "Sorbet"],
        keyEvents: ["Resurrección de Freezer en la Tierra (Eps 15-18)", "Entrenamiento de Goku y Vegeta con Whis (Eps 19-22)", "Super Saiyajin Blue (Eps 23-27)"]
    },
    "universo-6": {
        antagonists: ["Hit", "Cabba", "Frost"],
        keyEvents: ["Torneo de los destructores (Eps 28-38)", "Goku combines el Super Saiyajin Blue con el Kaio-ken x10 (Eps 39-40)", "Derrota de Hit (Ep 41)"]
    },
    "copy-vegeta": {
        antagonists: ["Vegeta Falso", "Gryll"],
        keyEvents: ["Viaje a Potaufeu (Eps 42-43)", "Vegeta pierde sus poderes (Ep 44)", "Combate de Goku vs Copia de Vegeta (Eps 45-46)"]
    },
    "trunks-futuro": {
        antagonists: ["Goku Black", "Zamasu del Futuro", "Zamasu Fusionado"],
        keyEvents: ["Llegada de Trunks en la máquina del tiempo (Eps 47-52)", "Viajes al futuro en ruinas (Eps 53-64)", "Fusión en Vegito Blue (Eps 65-66)", "Invocación de Zeno-sama (Ep 67)"]
    },
    "exhibicion-zen": {
        antagonists: ["Trio De Dangers (Universo 9)", "Toppo (Universo 11)"],
        keyEvents: ["Anuncio del Torneo del Poder (Eps 68-76)", "Combates de Exhibición (Eps 77-79)", "Pelea amistosa de Goku y Toppo (Eps 80-81)"]
    },
    "reclutamiento-u7": {
        antagonists: ["Asesinos del Universo 9"],
        keyEvents: ["Búsqueda contrarreloj de 10 guerreros (Eps 82-87)", "Reclutamiento de Androide 17 (Eps 88-91)", "Goku recluta a Freezer desde el Infierno (Eps 92-96)"]
    },
    "torneo-poder": {
        antagonists: ["Jiren", "Toppo", "Dyspo", "Kefla", "Anilaza"],
        keyEvents: ["Inicio del Torneo del Poder con 80 guerreros (Eps 97-109)", "Despertar del Ultra Instinto Señal (Eps 110-116)", "Sacrificio de Androide 17 (Eps 117-127)", "Goku alcanza el Ultra Instinto Completo (Eps 128-129)", "Victoria compartida con Freezer y Androide 17 (Eps 130-131)", "Resurrección de todos los Universos (Ep 131)"]
    }
};