export interface DBSagaDef {
    id: string
    name: string
    startEp: number
    endEp: number
    image: string
}

export interface DBMovieDef {
    id: string
    tmdbId: number
    title: string
    year: number
    type: "MOVIE" | "SPECIAL" | "OVA"
    image?: string
}

export interface DBFranchiseSeries {
    id: string
    tmdbId: number
    title: string
    subtitle: string
    totalEpisodes: number
    type: "SERIES" | "MOVIES"
    officialPoster: string
    icon: string
    color: string
    sagas: DBSagaDef[]
    movies?: DBMovieDef[]
}

export const DRAGON_BALL_SCANNER_SERIES: DBFranchiseSeries[] = [
    {
        id: "db-classic",
        tmdbId: 12609,
        title: "Dragon Ball",
        subtitle: "Clásico (1986 - 1989)",
        totalEpisodes: 153,
        type: "SERIES",
        officialPoster: "https://image.tmdb.org/t/p/w500/onCLyCOgszTIyyVs2XKYSkKPOPG.jpg",
        icon: "/icons/series-icons/goku-raw-db.webp",
        color: "from-blue-600 to-indigo-900",
        sagas: [
            { id: "pilaf", name: "Saga de Pilaf", startEp: 1, endEp: 13, image: "/sagas/pilaf.jpg" },
            { id: "torneo-21", name: "21º Torneo de Artes Marciales", startEp: 14, endEp: 28, image: "/sagas/torneo-21.jpg" },
            { id: "red-ribbon", name: "Saga de la Patrulla Roja", startEp: 29, endEp: 68, image: "/sagas/red-ribbon.jpg" },
            { id: "uranai-baba", name: "Saga de Uranai Baba", startEp: 69, endEp: 82, image: "/sagas/uranai-baba.jpg" },
            { id: "torneo-22", name: "22º Torneo de Artes Marciales", startEp: 83, endEp: 101, image: "/sagas/torneo-22.jpg" },
            { id: "piccolo", name: "Saga de Piccolo Daimaoh", startEp: 102, endEp: 122, image: "/sagas/piccolo-daimaku.jpg" },
            { id: "piccolo-jr", name: "23º Torneo (Piccolo Jr.)", startEp: 123, endEp: 153, image: "/sagas/piccolo-jr.jpg" },
        ],
        movies: [
            { id: "db-m1", tmdbId: 39144, title: "La Leyenda de Shenlong", year: 1986, type: "MOVIE" },
            { id: "db-m2", tmdbId: 39145, title: "La Princesa Durmiente en el Castillo del Mal", year: 1987, type: "MOVIE" },
            { id: "db-m3", tmdbId: 116776, title: "Una Aventura Mística", year: 1988, type: "MOVIE" },
            { id: "db-m4", tmdbId: 39148, title: "El Camino hacia el Poder", year: 1996, type: "MOVIE" },
        ],
    },
    {
        id: "dbz",
        tmdbId: 12971,
        title: "Dragon Ball Z",
        subtitle: "Z (1989 - 1996)",
        totalEpisodes: 291,
        type: "SERIES",
        officialPoster: "https://image.tmdb.org/t/p/w500/oQ5CnVj3TRifXl2bIOri6H6rfNe.jpg",
        icon: "/icons/series-icons/goku-raw-dbz.webp",
        color: "from-orange-600 to-red-900",
        sagas: [
            { id: "saiyajin", name: "Saga de los Saiyajin", startEp: 1, endEp: 35, image: "/sagas/saiyajin.jpg" },
            { id: "freezer", name: "Saga de Freezer (Namekusei)", startEp: 36, endEp: 107, image: "/sagas/namek-freezer.jpg" },
            { id: "garlic-jr", name: "Saga de Garlic Jr.", startEp: 108, endEp: 117, image: "/sagas/garlic-jr.jpg" },
            { id: "androides", name: "Saga de los Androides", startEp: 118, endEp: 139, image: "/sagas/trunks-androides-cell.jpg" },
            { id: "cell", name: "Saga de Cell", startEp: 140, endEp: 194, image: "/sagas/z/cell-games-saga.jpg" },
            { id: "torneo-otro-mundo", name: "Torneo del Otro Mundo", startEp: 195, endEp: 199, image: "/sagas/z/other-world-saga.webp" },
            { id: "gran-saiyaman", name: "Saga del Gran Saiyaman", startEp: 200, endEp: 209, image: "/sagas/gran-saiyaman-torneo25.jpg" },
            { id: "majin-buu", name: "Saga de Majin Buu", startEp: 210, endEp: 291, image: "/sagas/majin-buu.jpg" },
        ],
        movies: [
            { id: "dbz-m1", tmdbId: 28609, title: "¡Devuélvanme a mi Gohan!", year: 1989, type: "MOVIE" },
            { id: "dbz-m2", tmdbId: 39100, title: "El Hombre Más Fuerte de Este Mundo", year: 1990, type: "MOVIE" },
            { id: "dbz-m3", tmdbId: 39101, title: "La Batalla Más Grande de Este Mundo", year: 1990, type: "MOVIE" },
            { id: "dbz-m4", tmdbId: 39102, title: "El Súper Guerrero Son Goku", year: 1991, type: "MOVIE" },
            { id: "dbz-m5", tmdbId: 24752, title: "Los Rivales Más Poderosos", year: 1991, type: "MOVIE" },
            { id: "dbz-m6", tmdbId: 39103, title: "Los Guerreros Más Poderosos", year: 1992, type: "MOVIE" },
            { id: "dbz-m7", tmdbId: 39104, title: "La Batalla de los Tres Saiyajin", year: 1992, type: "MOVIE" },
            { id: "dbz-m8", tmdbId: 34433, title: "El Poder Invencible (Broly)", year: 1993, type: "MOVIE" },
            { id: "dbz-m9", tmdbId: 39105, title: "La Galaxia Corre Peligro", year: 1993, type: "MOVIE" },
            { id: "dbz-m10", tmdbId: 44251, title: "El Regreso del Guerrero Legendario", year: 1994, type: "MOVIE" },
            { id: "dbz-m11", tmdbId: 39106, title: "El Combate Definitivo (Bio-Broly)", year: 1994, type: "MOVIE" },
            { id: "dbz-m12", tmdbId: 39107, title: "La Fusión de Goku y Vegeta (Gogeta)", year: 1995, type: "MOVIE" },
            { id: "dbz-m13", tmdbId: 39108, title: "El Ataque del Dragón (Tapion)", year: 1995, type: "MOVIE" },
            { id: "dbz-sp1", tmdbId: 39323, title: "Especial: El Padre de Goku", year: 1990, type: "SPECIAL" },
            { id: "dbz-sp2", tmdbId: 39324, title: "Especial: Un Futuro Diferente (Trunks)", year: 1993, type: "SPECIAL" },
            { id: "dbz-ova1", tmdbId: 38594, title: "OVA: ¡Hola! Son Goku y sus Amigos", year: 2008, type: "OVA" },
            { id: "dbz-ova2", tmdbId: 120475, title: "OVA: El Episodio de Bardock", year: 2011, type: "OVA" },
            { id: "dbz-ova3", tmdbId: 55127, title: "OVA: Plan para Erradicar a los Saiyajin", year: 2010, type: "OVA" },
        ],
    },
    {
        id: "dbgt",
        tmdbId: 12697,
        title: "Dragon Ball GT",
        subtitle: "GT (1996 - 1997)",
        totalEpisodes: 64,
        type: "SERIES",
        officialPoster: "https://image.tmdb.org/t/p/w500/rLHhDpv6rrhuzBjNzaMRNv2fng.jpg",
        icon: "/icons/series-icons/goku-raw-dbgt.webp",
        color: "from-purple-600 to-rose-950",
        sagas: [
            { id: "black-star", name: "Saga del Gran Viaje", startEp: 1, endEp: 16, image: "/sagas/black-star.jpg" },
            { id: "baby", name: "Saga de Baby", startEp: 1, endEp: 40, image: "/sagas/baby.jpg" },
            { id: "super-17", name: "Saga de Super-17", startEp: 41, endEp: 47, image: "/sagas/super-17.jpg" },
            { id: "shadow-dragons", name: "Saga de los Dragones Malignos", startEp: 48, endEp: 64, image: "/sagas/shadow-dragons.jpg" },
        ],
        movies: [
            { id: "dbgt-sp1", tmdbId: 18095, title: "Especial: 100 Años Después (Goku Jr.)", year: 1997, type: "SPECIAL" },
        ],
    },
    {
        id: "dbkai",
        tmdbId: 61709,
        title: "Dragon Ball Kai",
        subtitle: "Kai / Z Kai (2009 - 2015)",
        totalEpisodes: 167,
        type: "SERIES",
        officialPoster: "https://image.tmdb.org/t/p/w500/ojsPI8fNwcecKLhVC4rB4ZZhFMc.jpg",
        icon: "/icons/series-icons/goku-raw-dbz.webp",
        color: "from-amber-600 to-yellow-950",
        sagas: [
            { id: "kai-saiyajin-freezer", name: "Sagas Saiyajin y Freezer", startEp: 1, endEp: 54, image: "/sagas/z/vegeta-saga.jpg" },
            { id: "kai-androides-cell", name: "Sagas Androides y Cell", startEp: 55, endEp: 98, image: "/sagas/z/perfect-cell-saga.jpg" },
            { id: "kai-buu", name: "The Final Chapters (Majin Buu)", startEp: 99, endEp: 167, image: "/sagas/z/kid-buu-saga.jpg" },
        ],
        movies: [],
    },
    {
        id: "dbs",
        tmdbId: 62715,
        title: "Dragon Ball Super",
        subtitle: "Super (2015 - 2018)",
        totalEpisodes: 131,
        type: "SERIES",
        officialPoster: "https://image.tmdb.org/t/p/w500/qEUrbXJ2qt4Rg84Btlx4STOhgte.jpg",
        icon: "/icons/series-icons/goku-raw-dbs.webp",
        color: "from-cyan-600 to-blue-950",
        sagas: [
            { id: "batalla-dioses", name: "Saga Batalla de los Dioses", startEp: 1, endEp: 14, image: "/sagas/batalla-dioses.jpg" },
            { id: "resurreccion-f", name: "Saga Resurrección de 'F'", startEp: 15, endEp: 27, image: "/sagas/resurreccion-f.jpg" },
            { id: "universo-6", name: "Saga Torneo Universo 6", startEp: 28, endEp: 41, image: "/sagas/universo-6.jpg" },
            { id: "copy-vegeta", name: "Saga del Agua Sobrenatural", startEp: 42, endEp: 46, image: "/sagas/super/copy-vegeta.webp" },
            { id: "trunks-futuro", name: "Saga de Trunks del Futuro (Goku Black)", startEp: 47, endEp: 76, image: "/sagas/trunks-futuro.jpg" },
            { id: "torneo-poder", name: "Saga del Torneo del Poder", startEp: 77, endEp: 131, image: "/sagas/supervivencia-universal.jpg" },
        ],
        movies: [
            { id: "dbs-m1", tmdbId: 126963, title: "La Batalla de los Dioses", year: 2013, type: "MOVIE" },
            { id: "dbs-m2", tmdbId: 303857, title: "La Resurrección de Freezer", year: 2015, type: "MOVIE" },
            { id: "dbs-m3", tmdbId: 503314, title: "Dragon Ball Super: Broly", year: 2018, type: "MOVIE" },
            { id: "dbs-m4", tmdbId: 610150, title: "Dragon Ball Super: Super Hero", year: 2022, type: "MOVIE" },
        ],
    },
    {
        id: "dbdaima",
        tmdbId: 236994,
        title: "Dragon Ball Daima",
        subtitle: "Daima (2024 - 2025)",
        totalEpisodes: 20,
        type: "SERIES",
        officialPoster: "https://image.tmdb.org/t/p/w500/lMULbSFZNXUC87MqOZQ4SSV9DXI.jpg",
        icon: "/icons/series-icons/goku-raw-dbdaima.webp",
        color: "from-yellow-500 to-amber-900",
        sagas: [
            { id: "daima-1", name: "El Misterio del Mundo Demonio", startEp: 1, endEp: 10, image: "/sagas/daima.jpg" },
            { id: "daima-2", name: "La Travesía en el Mundo Demonio", startEp: 11, endEp: 20, image: "/sagas/daima.jpg" },
        ],
        movies: [],
    },
    {
        id: "db-movies",
        tmdbId: 999999,
        title: "Películas y Especiales",
        subtitle: "Universo Cinematográfico (27 títulos)",
        totalEpisodes: 27,
        type: "MOVIES",
        officialPoster: "https://image.tmdb.org/t/p/w500/uMEgkyiPznZP5AiMSWAk2jsj5gC.jpg",
        icon: "/icons/series-icons/goku-raw-dbz.webp",
        color: "from-emerald-600 to-teal-950",
        sagas: [
            { id: "db-classic-movies", name: "Películas DB Clásico (1 a 4)", startEp: 1, endEp: 4, image: "/sagas/original/busqueda-esferas.webp" },
            { id: "dbz-movies-1-6", name: "Películas DBZ (1 a 6: Dead Zone, Cooler...)", startEp: 5, endEp: 10, image: "/sagas/z/goku-llega-namek.webp" },
            { id: "dbz-movies-7-13", name: "Películas DBZ (7 a 13: Broly, Fusion...)", startEp: 11, endEp: 17, image: "/sagas/z/fusion-saga.jpg" },
            { id: "dbs-movies", name: "Películas Super (Dioses, Broly, Super Hero)", startEp: 18, endEp: 21, image: "/sagas/batalla-dioses.jpg" },
            { id: "specials-ovas", name: "Especiales de TV y OVAs (Bardock, Trunks...)", startEp: 22, endEp: 27, image: "/sagas/z/trunks-saga.jpg" },
        ],
    },
]
