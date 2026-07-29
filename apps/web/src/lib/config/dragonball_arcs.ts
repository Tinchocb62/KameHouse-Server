import { DRAGON_BALL_SERIES } from "./dragonball_sagas"
import {
    indexEntriesByTmdb,
    resolveSagaProgress,
    type StageCollectionEntry,
    type ResolvedStageSaga,
} from "./dragonball_stages"

export interface ArcSagaRef {
    tmdbId: number
    sagaIds: string[]
}

export interface DragonBallArc {
    id: string
    number: number
    name: string
    subtitle: string
    description: string
    colors: [string, string]
    eraTheme: "era-db" | "era-dbz" | "era-dbgt" | "era-dbs" | "era-daima"
    image: string
    sagaRefs: ArcSagaRef[]
}

export const DRAGON_BALL_ARCS: DragonBallArc[] = [
    {
        id: "db_leyenda",
        number: 1,
        name: "La Leyenda Comienza",
        subtitle: "Búsqueda de las Esferas y el 21° Torneo",
        description: "El viaje épico inicia cuando Goku conoce a Bulma. Juntos recorren el mundo enfrentando al Emperador Pilaf, y luego Goku se entrena bajo la tutela del Maestro Roshi para participar en su primer torneo mundial de artes marciales.",
        colors: ["#f59e0b", "#d97706"], // Naranja/Ambar
        eraTheme: "era-db",
        image: "/sagas/pilaf.jpg",
        sagaRefs: [{ tmdbId: DRAGON_BALL_SERIES.ORIGINAL, sagaIds: ["pilaf", "torneo-21"] }],
    },
    {
        id: "db_red_ribbon",
        number: 2,
        name: "El Ejército de la Patrulla Roja",
        subtitle: "La Amenaza Global",
        description: "Buscando la esfera de su abuelo, Goku se enfrenta al ejército más peligroso de la Tierra: la Patrulla Roja. Su viaje lo llevará a escalar la Torre Karin, enfrentar a asesinos legendarios como Tao Pai Pai y pedir ayuda a la vidente Uranai Baba.",
        colors: ["#ef4444", "#991b1b"], // Rojo
        eraTheme: "era-db",
        image: "/sagas/red-ribbon.jpg",
        sagaRefs: [{ tmdbId: DRAGON_BALL_SERIES.ORIGINAL, sagaIds: ["red-ribbon", "uranai-baba"] }],
    },
    {
        id: "db_piccolo",
        number: 3,
        name: "El Rey Demonio Piccolo",
        subtitle: "La Oscuridad Cubre la Tierra",
        description: "El torneo mundial se ve opacado por el resurgir del Rey Demonio Piccolo Daimaku, quien busca dominar el mundo. Goku deberá vengar a sus amigos caídos y, años más tarde, enfrentarse a su reencarnación en una final a muerte.",
        colors: ["#22c55e", "#166534"], // Verde
        eraTheme: "era-db",
        image: "/sagas/piccolo-daimaku.jpg",
        sagaRefs: [{ tmdbId: DRAGON_BALL_SERIES.ORIGINAL, sagaIds: ["torneo-22", "piccolo-daimaku", "piccolo-jr"] }],
    },
    {
        id: "dbz_saiyajin",
        number: 4,
        name: "La Invasión Saiyajin",
        subtitle: "Guerreros del Espacio",
        description: "El origen de Goku es revelado con la llegada de los brutales guerreros Saiyajin a la Tierra. Para proteger el planeta, los guerreros Z deberán superar sus propios límites y Goku tendrá que dominar el Kaio-ken y la Genkidama.",
        colors: ["#3b82f6", "#1e3a8a"], // Azul
        eraTheme: "era-dbz",
        image: "/sagas/saiyajin.jpg",
        sagaRefs: [{ tmdbId: DRAGON_BALL_SERIES.Z, sagaIds: ["saiyajin"] }],
    },
    {
        id: "dbz_namek",
        number: 5,
        name: "Batalla en Namek",
        subtitle: "El Emperador del Universo",
        description: "Un viaje al planeta Namek en busca de las Esferas del Dragón originales desata una carrera mortal contra el tirano galáctico Freezer y sus ejércitos. La desesperación y la ira darán origen al legendario Super Saiyajin.",
        colors: ["#a855f7", "#581c87"], // Púrpura
        eraTheme: "era-dbz",
        image: "/sagas/namek-freezer.jpg",
        sagaRefs: [{ tmdbId: DRAGON_BALL_SERIES.Z, sagaIds: ["namek-freezer", "garlic-jr"] }],
    },
    {
        id: "dbz_cell",
        number: 6,
        name: "Los Androides y Cell",
        subtitle: "La Amenaza del Futuro",
        description: "Una advertencia de Trunks del futuro prepara a la Tierra para la llegada de androides asesinos. Sin embargo, la mayor amenaza resultará ser Cell, un bio-androide perfecto que organizará los Juegos de Cell para decidir el destino de la humanidad.",
        colors: ["#84cc16", "#3f6212"], // Verde Lima
        eraTheme: "era-dbz",
        image: "/sagas/trunks-androides-cell.jpg",
        sagaRefs: [{ tmdbId: DRAGON_BALL_SERIES.Z, sagaIds: ["androides", "cell", "torneo-otro-mundo"] }],
    },
    {
        id: "dbz_buu",
        number: 7,
        name: "La Resurrección de Majin Buu",
        subtitle: "El Mago Babidi y el Monstruo",
        description: "Años de paz terminan cuando el hechicero Babidi busca liberar a la criatura milenaria Majin Buu. Los guerreros tendrán que utilizar nuevas técnicas como la Fusión y alcanzar el Super Saiyajin 3 para hacer frente a esta amenaza indestructible.",
        colors: ["#ec4899", "#831843"], // Rosa
        eraTheme: "era-dbz",
        image: "/sagas/majin-buu.jpg",
        sagaRefs: [{ tmdbId: DRAGON_BALL_SERIES.Z, sagaIds: ["majin-buu"] }],
    },
    {
        id: "daima",
        number: 8,
        name: "El Reino Demoníaco",
        subtitle: "Dragon Ball Daima",
        description: "Una oscura conspiración en el Reino Demoníaco convierte a Goku y sus amigos en niños. Para revertir el hechizo, Goku viaja al misterioso y peligroso mundo de los demonios enfrentando a nuevos y temibles adversarios.",
        colors: ["#fb923c", "#9a3412"], // Naranja Oscuro
        eraTheme: "era-daima",
        image: "/sagas/daima.jpg",
        sagaRefs: [{ tmdbId: DRAGON_BALL_SERIES.DAIMA, sagaIds: ["daima"] }],
    },
    {
        id: "dbs_dioses",
        number: 9,
        name: "El Despertar de los Dioses",
        subtitle: "Niveles Divinos de Poder",
        description: "La existencia del Dios de la Destrucción, Beerus, y el regreso de un renovado Freezer Dorado exigen que Goku y Vegeta alcancen un nuevo nivel de poder divino (Super Saiyajin Dios y Blue). Los universos comienzan a chocar.",
        colors: ["#06b6d4", "#164e63"], // Cyan
        eraTheme: "era-dbs",
        image: "/sagas/batalla-dioses.jpg",
        sagaRefs: [{ tmdbId: DRAGON_BALL_SERIES.SUPER, sagaIds: ["batalla-dioses", "resurreccion-f", "universo-6", "copy-vegeta"] }],
    },
    {
        id: "dbs_zamasu",
        number: 10,
        name: "La Amenaza de Zamasu",
        subtitle: "El Futuro Trágico",
        description: "Trunks regresa del futuro escapando de un ser idéntico a Goku que está aniquilando a la humanidad. Un aprendiz de Kaioshin cegado por su sentido de justicia pondrá en jaque a los mismísimos dioses.",
        colors: ["#14b8a6", "#042f2e"], // Teal
        eraTheme: "era-dbs",
        image: "/sagas/trunks-futuro.jpg",
        sagaRefs: [{ tmdbId: DRAGON_BALL_SERIES.SUPER, sagaIds: ["trunks-futuro"] }],
    },
    {
        id: "dbs_torneo",
        number: 11,
        name: "El Torneo del Poder",
        subtitle: "Supervivencia Universal",
        description: "Zeno-Sama organiza un torneo masivo de supervivencia donde 80 guerreros de 8 universos luchan a la vez. Los universos perdedores serán borrados de la existencia. En medio del caos, Goku buscará despertar el Ultra Instinto para derrotar a Jiren.",
        colors: ["#f43f5e", "#881337"], // Rose
        eraTheme: "era-dbs",
        image: "/sagas/supervivencia-universal.jpg",
        sagaRefs: [{ tmdbId: DRAGON_BALL_SERIES.SUPER, sagaIds: ["exhibicion-zen", "reclutamiento-u7", "torneo-poder"] }],
    },
]

export const DRAGON_BALL_GT_ARCS: DragonBallArc[] = [
    {
        id: "gt_black_star",
        number: 1,
        name: "El Gran Viaje",
        subtitle: "Esferas de las Estrellas Negras",
        description: "Goku vuelve a ser un niño por culpa de un deseo de Pilaf. Junto a Trunks y su nieta Pan, se embarca en un viaje por toda la galaxia para recuperar las esferas de estrellas negras antes de que la Tierra explote.",
        colors: ["#fcd34d", "#b45309"], // Yellow/Amber
        eraTheme: "era-dbgt",
        image: "/sagas/black-star.jpg",
        sagaRefs: [{ tmdbId: DRAGON_BALL_SERIES.GT, sagaIds: ["black-star"] }]
    },
    {
        id: "gt_baby",
        number: 2,
        name: "El Parásito Mutante",
        subtitle: "La Venganza Tsufuru",
        description: "El último sobreviviente de la raza Tsufuru llega a la Tierra para vengarse de los Saiyajins. Infecta a toda la humanidad y Goku deberá alcanzar el Super Saiyajin 4 para salvar a sus seres queridos.",
        colors: ["#ef4444", "#7f1d1d"], // Red
        eraTheme: "era-dbgt",
        image: "/sagas/baby.jpg",
        sagaRefs: [{ tmdbId: DRAGON_BALL_SERIES.GT, sagaIds: ["baby"] }]
    },
    {
        id: "gt_super_17",
        number: 3,
        name: "Super Androide 17",
        subtitle: "Portal al Infierno",
        description: "Un portal se abre conectando la Tierra con el Infierno, liberando a viejos enemigos. Goku viaja al otro mundo mientras en la Tierra enfrentan a la fusión definitiva: Super 17.",
        colors: ["#3b82f6", "#1e3a8a"], // Blue
        eraTheme: "era-dbgt",
        image: "/sagas/super-17.jpg",
        sagaRefs: [{ tmdbId: DRAGON_BALL_SERIES.GT, sagaIds: ["super-17"] }]
    },
    {
        id: "gt_shadow_dragons",
        number: 4,
        name: "Dragones Malignos",
        subtitle: "El Castigo de las Esferas",
        description: "El uso excesivo de las Esferas del Dragón desata energía negativa que da vida a siete dragones malignos. Goku y Pan deberán derrotarlos uno a uno para salvar al universo de su destrucción final.",
        colors: ["#6366f1", "#312e81"], // Indigo
        eraTheme: "era-dbgt",
        image: "/sagas/shadow-dragons.jpg",
        sagaRefs: [{ tmdbId: DRAGON_BALL_SERIES.GT, sagaIds: ["shadow-dragons"] }]
    }
]

export interface LoreNode {
    id: string
    title: string
    description: string
}

export const LORE_ENTRIES: Record<string, LoreNode> = {
    "db_leyenda": {
        id: "lore_leyenda_redribbon",
        title: "Búsqueda Personal",
        description: "Goku emprende un viaje en solitario para encontrar la esfera de 4 estrellas de su abuelo Gohan, mientras sus amigos regresan a sus vidas cotidianas."
    },
    "db_red_ribbon": {
        id: "lore_redribbon_piccolo",
        title: "Tres Años de Entrenamiento",
        description: "Tras revivir al padre de Upa, Goku decide no usar la nube voladora y viaja por el mundo a pie durante tres años para fortalecerse de cara al 22° Torneo de Artes Marciales."
    },
    "db_piccolo": {
        id: "lore_piccolo_saiyajin",
        title: "Cinco Años de Paz",
        description: "Goku y Chichi contraen matrimonio. Durante cinco años de paz mundial forman una familia y nace su primogénito, Gohan, nombrado en honor al abuelo adoptivo de Goku."
    },
    "dbz_saiyajin": {
        id: "lore_saiyajin_namek",
        title: "Rumbo a Namek",
        description: "Con Piccolo muerto y las Esferas del Dragón de la Tierra destruidas, Bulma, Gohan y Krilin inician un viaje galáctico hacia el planeta natal de Kami en busca de las esferas originales."
    },
    "dbz_namek": {
        id: "lore_namek_cell",
        title: "El Regreso de Goku",
        description: "Pasa más de un año tras la destrucción de Namek. Los guerreros resucitados entrenan en la Tierra mientras esperan el misterioso regreso de Goku, quien sobrevivió en el planeta Yardrat."
    },
    "dbz_cell": {
        id: "lore_cell_buu",
        title: "Siete Años de Paz",
        description: "La Tierra goza de siete años de paz. Goku decide permanecer en el Otro Mundo entrenando. Gohan asiste a la preparatoria como el Gran Saiyaman, y nace Goten, el segundo hijo de Goku."
    },
    "dbz_buu": {
        id: "lore_buu_daima",
        title: "El Reino Demoníaco",
        description: "Poco después de la derrota de Kid Buu, una nueva conspiración se gesta en las sombras del desconocido Reino Demoníaco por aquellos que temen el poder de los guerreros de la Tierra."
    },
    "daima": {
        id: "lore_daima_dbs",
        title: "El Despertar Divino",
        description: "Goku y Vegeta continúan entrenando incansablemente. Mientras tanto, en los confines del universo, el Dios de la Destrucción despierta buscando al legendario Dios Super Saiyajin de sus sueños."
    },
    "dbs_dioses": {
        id: "lore_dioses_zamasu",
        title: "Amenaza desde el Futuro",
        description: "Mientras Goku y Vegeta dominan el poder del Super Saiyajin Blue, la paz se ve interrumpida por un llamado desesperado de auxilio proveniente de la trágica línea temporal de Trunks del Futuro."
    },
    "gt_baby": {
        id: "lore_baby_super17",
        title: "Breve Paz",
        description: "Tras la derrota de Baby y la restauración de la Tierra, nuestros héroes disfrutan de un tiempo de paz, hasta que una conspiración gestada en las profundidades del infierno lo cambia todo."
    },
    "gt_super_17": {
        id: "lore_super17_dragons",
        title: "Las Esferas Corruptas",
        description: "Los daños causados por las recientes batallas llevan a los guerreros a buscar las esferas, pero descubren que la energía negativa acumulada por años de deseos las ha corrompido irreparablemente."
    }
}

export interface ResolvedArc {
    arc: DragonBallArc
    image: string
    sagas: ResolvedStageSaga[]
    totalEps: number
    watchedEps: number
    percent: number
    continueTarget: { mediaId: number; episodeNumber: number; sagaTitle: string } | null
}

export function resolveArcs(entries: StageCollectionEntry[], arcList: DragonBallArc[] = DRAGON_BALL_ARCS): ResolvedArc[] {
    const byTmdb = indexEntriesByTmdb(entries)

    return arcList.map(arc => {
        const sagas: ResolvedStageSaga[] = []
        for (const ref of arc.sagaRefs) {
            const entry = byTmdb.get(ref.tmdbId)
            for (const sagaId of ref.sagaIds) {
                const resolved = resolveSagaProgress(ref.tmdbId, sagaId, entry)
                if (resolved) sagas.push(resolved)
            }
        }

        const totalEps = sagas.reduce((acc, s) => acc + s.totalEps, 0)
        const watchedEps = sagas.reduce((acc, s) => acc + s.watchedEps, 0)
        const percent = totalEps > 0 ? Math.round((watchedEps / totalEps) * 100) : 0

        let continueTarget: ResolvedArc["continueTarget"] = null
        for (const saga of sagas) {
            if (saga.mediaId && saga.watchedEps < saga.totalEps) {
                continueTarget = {
                    mediaId: saga.mediaId,
                    episodeNumber: saga.startEp + saga.watchedEps,
                    sagaTitle: saga.saga.title,
                }
                break
            }
        }

        return { arc, image: arc.image, sagas, totalEps, watchedEps, percent, continueTarget }
    })
}
