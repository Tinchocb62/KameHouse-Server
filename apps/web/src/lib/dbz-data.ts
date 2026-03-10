export type Episode = {
    id: string
    title: string
    number: number
    duration: string // "24:00"
    description: string
}

export type Saga = {
    id: string
    title: string
    description: string
    image: string
    episodes: Episode[]
}

export type Series = {
    id: string
    title: string
    description: string
    year: string
    image: string
    episodesCount: number
    sagas: Saga[]
}

// Temporary Local Data Database
export const dbzData: Series[] = [
    {
        id: "db",
        title: "Dragon Ball",
        description: "Goku, un niño con cola de mono y fuerza sobrehumana, se une a Bulma en la búsqueda de las legendarias Esferas del Dragón.",
        year: "1986",
        image: "https://artworks.thetvdb.com/banners/posters/76666-3.jpg",
        episodesCount: 153,
        sagas: [
            {
                id: "db-saga-pilaf",
                title: "Saga de Pilaf",
                description: "La búsqueda inicial de las Esferas del Dragón y el enfrentamiento contra el Emperador Pilaf.",
                image: "https://artworks.thetvdb.com/banners/seasons/76666-1.jpg",
                episodes: [
                    { id: "e1", title: "El secreto de la Esfera del Dragón", number: 1, duration: "24:00", description: "Goku conoce a Bulma y comienzan su aventura." },
                    { id: "e2", title: "La búsqueda del Emperador", number: 2, duration: "24:00", description: "Aparece Pilaf y sus secuaces." },
                    { id: "e3", title: "La Nube Voladora de Roshi", number: 3, duration: "24:00", description: "Goku obtiene la Nube Voladora." },
                ]
            },
            {
                id: "db-saga-torneo",
                title: "21° Torneo de las Artes Marciales",
                description: "El duro entrenamiento con el Maestro Roshi y la participación en el Gran Torneo.",
                image: "https://artworks.thetvdb.com/banners/seasons/76666-2.jpg",
                episodes: [
                    { id: "e14", title: "El rival de Goku", number: 14, duration: "24:00", description: "Aparece Krilin como compañero de entrenamiento." },
                    { id: "e21", title: "¡Peligro! Krilin", number: 21, duration: "24:00", description: "Inician las eliminatorias del torneo." },
                ]
            }
        ]
    },
    {
        id: "dbz",
        title: "Dragon Ball Z",
        description: "Cinco años después del torneo, Goku descubre su verdadero origen extraterrestre y enfrenta amenazas cósmicas.",
        year: "1989",
        image: "https://artworks.thetvdb.com/banners/posters/81472-1.jpg",
        episodesCount: 291,
        sagas: [
            {
                id: "dbz-saga-saiyajin",
                title: "Saga de los Saiyajin",
                description: "La llegada de Raditz, Nappa y Vegeta a la Tierra.",
                image: "https://artworks.thetvdb.com/banners/seasons/81472-1.jpg",
                episodes: [
                    { id: "z1", title: "Aparece un mini-Goku", number: 1, duration: "24:00", description: "Gohan es presentado y Raditz llega a la Tierra." },
                    { id: "z2", title: "El guerrero más fuerte", number: 2, duration: "24:00", description: "Goku y Piccolo se alían contra Raditz." },
                ]
            },
            {
                id: "dbz-saga-freezer",
                title: "Saga de Freezer",
                description: "El viaje al planeta Namek y el despertar del Súper Saiyajin.",
                image: "https://artworks.thetvdb.com/banners/seasons/81472-2.jpg",
                episodes: [
                    { id: "z95", title: "El legendario Súper Saiyajin", number: 95, duration: "24:00", description: "Goku se transforma en Súper Saiyajin por primera vez al ver morir a Krilin." },
                ]
            }
        ]
    },
    {
        id: "dbgt",
        title: "Dragon Ball GT",
        description: "Goku es convertido en niño por un deseo accidental de Pilaf y debe viajar por el universo.",
        year: "1996",
        image: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx225-bT41PZ2Wf6GZ.png",
        episodesCount: 64,
        sagas: [
            {
                id: "dbgt-saga-baby",
                title: "Saga de Baby",
                description: "El parásito mutante espacial busca venganza contra los Saiyajin.",
                image: "https://artworks.thetvdb.com/banners/seasons/73111-2.jpg",
                episodes: [
                    { id: "gt34", title: "El cuarto nivel", number: 34, duration: "24:00", description: "Goku alcanza el Súper Saiyajin 4." },
                ]
            }
        ]
    },
    {
        id: "dbkai-tfc",
        title: "Dragon Ball Kai: The Final Chapters",
        description: "La remasterización en HD y sin relleno de la climática saga de Majin Buu.",
        year: "2014",
        image: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx20655-aXWdgbvUu82U.png",
        episodesCount: 61,
        sagas: []
    },
    {
        id: "dbs",
        title: "Dragon Ball Super",
        description: "Tras la derrota de Majin Buu, Goku se enfrenta a Dioses de la Destrucción y guerreros de otros universos.",
        year: "2015",
        image: "https://artworks.thetvdb.com/banners/posters/295068-1.jpg",
        episodesCount: 131,
        sagas: [
            {
                id: "dbs-saga-torneo-poder",
                title: "Torneo del Poder",
                description: "Batalla campal por la supervivencia de los universos.",
                image: "https://artworks.thetvdb.com/banners/seasons/295068-5.jpg",
                episodes: [
                    { id: "s109", title: "Goku vs Jiren", number: 109, duration: "24:00", description: "La batalla más esperada inicia." },
                    { id: "s110", title: "El Despertar", number: 110, duration: "24:00", description: "Goku despierta el Ultra Instinto." },
                    { id: "s131", title: "Un final milagroso", number: 131, duration: "24:00", description: "Conclusión del Torneo del Poder." },
                ]
            }
        ]
    },
    {
        id: "dbkai-ultimate",
        title: "Dragon Ball Kai Ultimate 2.0",
        description: "Edición definitiva creada por SeldionDB (339 episodios). Remasterización sin relleno, corrección de color y banda sonora adaptada. InfoHash: 747d16330de709d715efae8081267bca1567751",
        year: "2023",
        image: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx5877-npeXmXm4vG0L.png",
        episodesCount: 339,
        sagas: []
    },
    {
        id: "db-daima",
        title: "Dragon Ball Daima",
        description: "Por una conspiración, Goku y sus amigos son re-convertidos en niños. Para solucionarlo, viajan a un mundo desconocido.",
        year: "2024",
        image: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx170133-KccU0g2G3VzF.jpg",
        episodesCount: 20,
        sagas: []
    }
]
