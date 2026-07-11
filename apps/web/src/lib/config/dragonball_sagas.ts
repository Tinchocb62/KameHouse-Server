export const DRAGON_BALL_SERIES = {
    ORIGINAL: 12609,
    Z: 12971,
    GT: 12697,
    SUPER: 62715,
    DAIMA: 236994,
    HEROES: 80629,
}

export type SubSagaDefinition = {
    id: string
    title: string
    description?: string
    startEp: number
    endEp: number
    image?: string
}

export type SagaDefinition = {
    id: string
    title: string
    description: string
    startEp: number
    endEp: number
    image: string
    subSagas?: SubSagaDefinition[]
}

export const DRAGON_BALL_SAGAS: Record<number, SagaDefinition[]> = {

    // ─────────────────────────────────────────────────────────────────────────
    // DRAGON BALL ORIGINAL  (153 eps)
    // ─────────────────────────────────────────────────────────────────────────
    [DRAGON_BALL_SERIES.ORIGINAL]: [
        {
            id: "pilaf",
            title: "Saga del Emperador Pilaf",
            description:
                "El joven Goku conoce a Bulma durante su búsqueda de las Esferas del Dragón. Juntos se enfrentan al ridículo pero ambicioso Emperador Pilaf, quien desea dominar el mundo con el poder del Dragón Shenlong.",
            startEp: 1,
            endEp: 13,
            image: "/sagas/pilaf.jpg",
            subSagas: [
                { id: "busqueda-esferas", title: "En busca de las Esferas del Dragón", description: "Goku conoce a Bulma y emprenden juntos la búsqueda de las siete esferas, conociendo a Oolong, Yamcha y Puar.", startEp: 1, endEp: 7 },
                { id: "pilaf-castillo", title: "El Castillo del Emperador Pilaf", description: "Los amigos son capturados por Pilaf en su castillo. Goku se transforma en Ozaru durante la luna llena y destruye el lugar, permitiendo la fuga.", startEp: 8, endEp: 13 },
            ],
        },
        {
            id: "torneo-21",
            title: "Saga 21° Torneo de las Artes Marciales",
            description:
                "Bajo la tutela del legendario Maestro Roshi, Goku y Krilin se preparan para el campeonato mundial de artes marciales. El torneo revela que existen guerreros mucho más poderosos en el mundo.",
            startEp: 14,
            endEp: 28,
            image: "/sagas/torneo-21.jpg",
            subSagas: [
                { id: "entrenamiento-roshi", title: "Entrenamiento con el Maestro Roshi", description: "Goku y Krilin entrenan duramente bajo la tutela del Maestro Roshi con el método de la leche y trabajos físicos extremos.", startEp: 14, endEp: 20 },
                { id: "torneo-21-combates", title: "El 21° Torneo", description: "Goku y Krilin participan en el torneo enfrentando a Jackie Chun (Roshi disfrazado), con una final épica entre ambos jóvenes.", startEp: 21, endEp: 28 },
            ],
        },
        {
            id: "red-ribbon",
            title: "Saga de la Patrulla Roja",
            description:
                "Goku busca la esfera de 4 estrellas de su abuelo Gohan y se enfrenta al ejército criminal de la Patrulla Roja, que también codicia las esferas para dominar el mundo.",
            startEp: 29,
            endEp: 68,
            image: "/sagas/red-ribbon.png",
            subSagas: [
                { id: "coronel-silver", title: "Coronel Silver y los primeros enfrentamientos", description: "Goku derrota al Coronel Silver y comienza su cacería de las esferas restantes, descubriendo el alcance del ejército de la Patrulla Roja.", startEp: 29, endEp: 33 },
                { id: "torre-fuerza", title: "La Torre de la Fuerza — General White", description: "Goku asalta la imponente Torre de la Fuerza para rescatar a un niño secuestrado. Derrota al General White y conoce al robot Murasaki.", startEp: 34, endEp: 45 },
                { id: "general-blue", title: "Aventura Submarina — General Blue", description: "Goku y sus amigos buscan una esfera en el océano y son perseguidos por el peligroso y telekinético General Blue hasta una ciudad pirata subterránea.", startEp: 46, endEp: 57 },
                { id: "tao-pai-pai", title: "El Asesino Tao Pai Pai y la Torre Karin", description: "El Comandante Red contrata al legendario asesino Tao Pai Pai, quien mata a Krilin. Goku escala la Torre Karin para obtener el Agua Sagrada y vengar a su amigo.", startEp: 58, endEp: 68 },
            ],
        },
        {
            id: "uranai-baba",
            title: "Saga de Uranai Baba",
            description:
                "Goku acude a la vidente Uranai Baba para localizar la última esfera del dragón. Debe vencer a cinco guerreros únicos; el torneo trae la sorpresa emotiva del reencuentro con el abuelo Gohan.",
            startEp: 69,
            endEp: 82,
            image: "/sagas/uranai-baba.jpg",
            subSagas: [
                { id: "cinco-guerreros", title: "Los Cinco Guerreros de Uranai Baba", description: "Goku y sus amigos combaten a los cinco espadachines y guerreros de la bruja, incluyendo a Dracula Man y Upa.", startEp: 69, endEp: 76 },
                { id: "reencuentro-gohan", title: "El Reencuentro con el Abuelo Gohan", description: "El último oponente resulta ser el espíritu del abuelo Gohan, quien regresa por un día del Más Allá para un emotivo reencuentro. Goku consigue la esfera final.", startEp: 77, endEp: 82 },
            ],
        },
        {
            id: "torneo-22",
            title: "Saga 22° Torneo de las Artes Marciales",
            description:
                "Han pasado 3 años. Goku regresa transformado en un joven fuerte. Los peligrosos discípulos de la Escuela Grulla, Tenshinhan y Chaotzu, buscan destruir la Escuela Tortuga.",
            startEp: 83,
            endEp: 101,
            image: "/sagas/torneo-22.jpg",
            subSagas: [
                { id: "preparacion-22", title: "Preparación para el 22° Torneo", description: "Los guerreros se reencuentran tras años de entrenamiento. Goku ha crecido y demostrado gran poder. Tenshinhan y Chaotzu hacen su debut intimidante.", startEp: 83, endEp: 85 },
                { id: "combates-22", title: "El 22° Torneo — Goku vs Tenshinhan", description: "Serie de combates culminando en el épico choque entre Goku y Tenshinhan. El duelo termina con Tenshinhan como campeón por puntos, pero reconociendo la superioridad moral de Goku.", startEp: 86, endEp: 101 },
            ],
        },
        {
            id: "piccolo-daimaku",
            title: "Saga del Rey Demonio Piccolo",
            description:
                "El demonio Piccolo Daimaku, sellado durante siglos, es liberado accidentalmente. Con poder inimaginable busca recuperar su juventud y esclavizar a la humanidad. Krilin y Maestro Roshi caen en el intento de detenerlo.",
            startEp: 102,
            endEp: 122,
            image: "/sagas/piccolo-daimaku.jpg",
            subSagas: [
                { id: "liberacion-piccolo", title: "Liberación del Rey Demonio", description: "Pilaf libera accidentalmente a Piccolo Daimaku. El demonio mata a Krilin y al Maestro Roshi. Goku, destrozado, busca el Agua Sagrada para fortalecerse.", startEp: 102, endEp: 111 },
                { id: "batalla-piccolo", title: "La Batalla Final contra el Rey Demonio", description: "Goku enfrenta a Piccolo Daimaku en su forma rejuvenecida. Con el Kamehameha inverso, Goku lo vence atravesándolo y emergiendo victorioso de su propio cuerpo.", startEp: 112, endEp: 122 },
            ],
        },
        {
            id: "piccolo-jr",
            title: "Saga de Piccolo Jr.",
            description:
                "Han pasado 3 años. En el 23° Torneo Mundial, Goku se enfrenta a Piccolo Jr., el hijo del demonio, quien ha heredado todo el odio de su padre. Goku y Chichi se reencuentran y la serie culmina con su boda.",
            startEp: 123,
            endEp: 153,
            image: "/sagas/piccolo-jr.jpg",
            subSagas: [
                { id: "preliminares-23", title: "Preliminares del 23° Torneo", description: "Los guerreros llegan al torneo. Un misterioso participante de nombre \"Shen\" resulta ser el dios Kami disfrazado. Piccolo Jr. también se ha inscripto bajo un alias.", startEp: 123, endEp: 133 },
                { id: "goku-vs-piccolo-jr", title: "La Final: Goku vs Piccolo Jr.", description: "El combate climático de la serie original. Piccolo Jr. crece a tamaño gigante, pero Goku lo supera con el Kamehameha volador. Goku perdona a Piccolo y le lanza una senzu. Finaliza la boda de Goku y Chichi.", startEp: 134, endEp: 153 },
            ],
        },
    ],

    // ─────────────────────────────────────────────────────────────────────────
    // DRAGON BALL Z  (291 eps)
    // ─────────────────────────────────────────────────────────────────────────
    [DRAGON_BALL_SERIES.Z]: [
        {
            id: "saiyajin",
            title: "Saga Saiyajin",
            description:
                "La llegada de Raditz revela el origen extraterrestre de Goku. Los guerreros Z deben prepararse para enfrentar a dos Saiyajins increíblemente poderosos: Nappa y el príncipe Vegeta.",
            startEp: 1,
            endEp: 35,
            image: "/sagas/saiyajin.png",
            subSagas: [
                { id: "raditz", title: "La Llegada de Raditz", description: "Raditz, hermano de Goku, llega a la Tierra. Goku y Piccolo se alían para enfrentarlo. Goku muere sacrificándose para que Piccolo pueda matar a Raditz con el Makankosappo.", startEp: 1, endEp: 6, image: "/sagas/z/raditz-saga.jpg" },
                { id: "entrenamiento-z", title: "Entrenamiento Especial", description: "Goku entrena con el Kaio del Norte en el Más Allá. En la Tierra, Piccolo entrena a Gohan y el resto de los guerreros Z se preparan para la inminente llegada de Nappa y Vegeta.", startEp: 7, endEp: 20 },
                { id: "vegeta-nappa", title: "Batalla contra Nappa y Vegeta", description: "Nappa y Vegeta aterrizan en la Tierra. Yamcha, Chaotzu, Tenshinhan y Piccolo caen en combate. Goku regresa y vence a Nappa. La batalla épica contra Vegeta termina con Goku victorioso pero con ambos supervivientes.", startEp: 21, endEp: 35, image: "/sagas/z/vegeta-saga.png" },
            ],
        },
        {
            id: "namek-freezer",
            title: "Saga Namek y Freezer",
            description:
                "Gohan, Krilin y Bulma viajan al planeta Namek para revivir a sus amigos caídos, pero se topan con el tirano galáctico Freezer y sus ejércitos, así como con las Fuerzas Especiales Ginyu.",
            startEp: 36,
            endEp: 107,
            image: "/sagas/namek-freezer.png",
            subSagas: [
                { id: "viaje-namek", title: "Viaje a Namek", description: "El trío terrestre viaja a Namek mientras Vegeta también pone rumbo al planeta. Los namekianos caen bajo el yugo de Freezer, quien busca la inmortalidad con las esferas.", startEp: 36, endEp: 67 },
                { id: "fuerzas-ginyu", title: "Las Fuerzas Especiales Ginyu", description: "El Capitán Ginyu y su escuadra élite llegan a Namek. Goku derrota a la mayoría, pero Ginyu intercambia cuerpos con él. Vegeta, Gohan y Krilin deben superar el caos resultante.", startEp: 68, endEp: 74, image: "/sagas/z/captain-ginyu-saga.jpg" },
                { id: "goku-llega-namek", title: "Goku Llega a Namek", description: "Goku aterriza en Namek y en cuestión de minutos destruye a Jeice y recupera su cuerpo del Capitán Ginyu. El equipo, al borde de la derrota, recupera la esperanza con la llegada del guerrero más fuerte de la Tierra.", startEp: 75, endEp: 82 },
                { id: "cuatro-formas-freezer", title: "Las Cuatro Transformaciones de Freezer", description: "Goku combate a Freezer a través de sus cuatro formas. El Kaioken x20 combinado con el Kamehameha no alcanza. Piccolo llega reforzado con la fusión namekiana. La muerte de Krilin a manos de Freezer desencadena algo que el universo nunca había visto.", startEp: 83, endEp: 97, image: "/sagas/z/frieza-saga.png" },
                { id: "ssj-explosion-namek", title: "Nace el Super Saiyajin — Namek en Llamas", description: "La rabia por la muerte de Krilin desencadena la legendaria y profetizada transformación en Super Saiyajin. Goku domina completamente a Freezer. El planeta Namek colapsa y explota. Goku sobrevive en el planeta Yardrat mientras el universo entero lo da por muerto.", startEp: 98, endEp: 107 },
            ],
        },
        {
            id: "garlic-jr",
            title: "Saga Garlic Jr. (Relleno)",
            description:
                "Aprovechando la ausencia de Goku, Garlic Jr. escapa de la Zona Muerta usando el Polvo de las Estrellas Oscuras para convertir a la humanidad en mazoku. Arco exclusivo del anime, no basado en el manga.",
            startEp: 108,
            endEp: 117,
            image: "/sagas/garlic-jr.png",
        },
        {
            id: "trunks-androides-cell",
            title: "Saga Androides y Cell",
            description:
                "Un misterioso joven del futuro advierte sobre androides asesinos y la bio-arma perfecta Cell. La humanidad enfrenta su mayor amenaza mientras los guerreros Z entrenan en la Sala del Tiempo.",
            startEp: 118,
            endEp: 194,
            image: "/sagas/trunks-androides-cell.png",
            subSagas: [
                { id: "trunks-futuro", title: "Trunks del Futuro y la Advertencia", description: "Trunks, el hijo de Vegeta y Bulma del futuro, derrota a Freezer y al Rey Cold. Advierte sobre la llegada de androides asesinos en tres años y la existencia de un ser aún más peligroso.", startEp: 118, endEp: 125, image: "/sagas/z/trunks-saga.png" },
                { id: "androides-17-18", title: "Los Androides 17, 18 y 16", description: "El Dr. Gero activa a los androides 17, 18 y 16. Los guerreros Z descubren que sus poderes de pelea son insuficientes. Vegeta alcanza el nivel Super Saiyajin. Aparece un ser misterioso que absorbe androides.", startEp: 126, endEp: 139, image: "/sagas/z/androids-saga.jpg" },
                { id: "cell-imperfecto", title: "Cell Imperfecto", description: "Cell, creado con el ADN de los guerreros más poderosos, busca absorber a los androides para alcanzar su forma perfecta. Los guerreros Z entrenan en la Sala del Tiempo Hiperbólico.", startEp: 140, endEp: 152, image: "/sagas/z/imperfect-cell-saga.png" },
                { id: "cell-semiperfecto", title: "Cell Semiperfecto", description: "Cell absorbe al androide 17 alcanzando su forma semiperfecta. Vegeta, en su arrogancia, permite que Cell absorba también al androide 18, logrando su forma perfecta.", startEp: 153, endEp: 165, image: "/sagas/z/perfect-cell-saga.png" },
                { id: "juegos-cell", title: "Los Juegos de Cell", description: "Cell organiza un torneo de televisión para demostrar su poder. Gohan despierta su potencial oculto como Super Saiyajin 2 tras ver caer a Android 16. Goku se sacrifica teletransportándose con la autodestrucción de Cell.", startEp: 166, endEp: 194, image: "/sagas/z/cell-games-saga.png" },
            ],
        },
        {
            id: "gran-saiyaman-torneo25",
            title: "Saga Gran Saiyaman y 25° Torneo",
            description:
                "Han pasado 7 años desde Cell. Gohan, adolescente, adopta el alter-ego del Gran Saiyaman. Los guerreros Z se reúnen para el 25° Torneo Mundial mientras Babidi comienza a actuar en las sombras.",
            startEp: 200,
            endEp: 219,
            image: "/sagas/gran-saiyaman-torneo25.png",
            subSagas: [
                { id: "gran-saiyaman-arc", title: "El Gran Saiyaman", description: "Gohan estudia en la secundaria y se convierte en el héroe enmascarado Gran Saiyaman para combatir el crimen sin revelar su identidad. Conoce a Videl, hija de Mr. Satan.", startEp: 200, endEp: 209, image: "/sagas/z/great-saiyaman-saga.jpg" },
                { id: "torneo-25", title: "El 25° Torneo de Artes Marciales", description: "Goku consigue permiso para regresar del Más Allá por un día. Los guerreros Z se inscriben pero Babidi y Dabura irrumpen con sus propios planes, captando la energía del torneo para despertar a Buu.", startEp: 210, endEp: 219, image: "/sagas/z/world-tournament-saga.jpg" },
            ],
        },
        {
            id: "majin-buu",
            title: "Saga Majin Buu",
            description:
                "Babidi despierta a Majin Buu, el ser más temible del universo. Goku y Vegeta deben superar sus rivalidades para enfrentar las múltiples formas de Buu, desde la inocente hasta la devastadora Kid Buu.",
            startEp: 220,
            endEp: 291,
            image: "/sagas/majin-buu.png",
            subSagas: [
                { id: "babidi-dabura-vegeta-majin", title: "Babidi, Dabura y el Majin Vegeta", description: "Los guerreros Z siguen a Babidi hasta su nave. Gohan cae ante el poderoso Dabura. Vegeta acepta ser convertido en Majin para recuperar su salvajismo y enfrenta a Goku en un duelo épico. La energía del combate alimenta el sello de Majin Buu.", startEp: 220, endEp: 237, image: "/sagas/z/babidi-saga.png" },
                { id: "despertar-buu-sacrificio-vegeta", title: "El Despertar de Buu y el Sacrificio de Vegeta", description: "Majin Buu emerge en su forma gordita e inocente pero de poder incontenible. Vegeta, en un acto de redención, se sacrifica con la Explosión Final para destruirlo, sin éxito. Mr. Satan establece una improbable amistad con el monstruo rosado.", startEp: 238, endEp: 253, image: "/sagas/z/majin-buu-saga.png" },
                { id: "super-buu", title: "La Amenaza de Super Buu", description: "Buu absorbe a Piccolo, Gotenks y Gohan transformado, convirtiéndose en Super Buu. Goku y Vegeta se fusionan con los Potaras y entran al cuerpo de Buu para rescatar a sus amigos.", startEp: 254, endEp: 275, image: "/sagas/z/fusion-saga.png" },
                { id: "fusion-kid-buu", title: "Fusión y Batalla Final contra Kid Buu", description: "Kid Buu destruye la Tierra. Goku y Vegeta luchan en el Planeta de las Kaioshins. La Genki-Dama final de Goku, alimentada por toda la humanidad, derrota definitivamente a Kid Buu.", startEp: 276, endEp: 287, image: "/sagas/z/kid-buu-saga.png" },
                { id: "mundo-paz", title: "Un Mundo en Paz (Epílogo)", description: "10 años después, la vida sigue su curso. Goku conoce a Uub, la reencarnación de Kid Buu, en el siguiente torneo mundial y decide entrenarlo. Fin de Dragon Ball Z.", startEp: 288, endEp: 291, image: "/sagas/z/peaceful-world-saga.jpg" },
            ],
        },
    ],

    // ─────────────────────────────────────────────────────────────────────────
    // DRAGON BALL GT  (64 eps) — no canónico
    // ─────────────────────────────────────────────────────────────────────────
    [DRAGON_BALL_SERIES.GT]: [
        {
            id: "black-star",
            title: "Saga de las Esferas del Dragón Negras",
            description:
                "Un deseo accidental del Emperador Pilaf convierte a Goku en niño. Las peligrosas Esferas del Dragón Negras se dispersan por la galaxia y la Tierra será destruida si no se recuperan en un año.",
            startEp: 1,
            endEp: 16,
            image: "/sagas/black-star.jpg",
            subSagas: [
                { id: "deseo-pilaf", title: "El Deseo de Pilaf y la Transformación", description: "El Emperador Pilaf irrumpe en la sala del Dragón e invoca a Shenlong. Al ver a Goku, desea que vuelva a ser un niño. El deseo se cumple y las esferas se dispersan por la galaxia.", startEp: 1, endEp: 3 },
                { id: "viaje-galaxia", title: "Viaje por la Galaxia", description: "Goku, Trunks y Pan viajan en la nave Badalmóvil visitando planetas extraños en busca de las esferas. Encuentran aliados y enemigos peculiares en cada mundo.", startEp: 4, endEp: 16 },
            ],
        },
        {
            id: "baby",
            title: "Saga de Baby",
            description:
                "El parásito mutante Baby, última creación de la raza Tsufuru exterminada por los Saiyajins, regresa para infectar y esclavizar a la humanidad entera y vengarse de la raza guerrera.",
            startEp: 17,
            endEp: 40,
            image: "/sagas/baby.jpg",
            subSagas: [
                { id: "invasion-baby", title: "La Invasión de Baby", description: "Baby llega a la Tierra y comienza a infectar a los humanos y guerreros Z uno a uno. Vegeta es poseído, convirtiéndose en el poderoso Baby Vegeta.", startEp: 17, endEp: 27 },
                { id: "ssj4-baby", title: "Super Saiyajin 4 vs Baby", description: "Goku recupera su cuerpo adulto y alcanza el legendario Super Saiyajin 4. La batalla climática entre Goku SSJ4 y Baby Vegeta decide el destino de la humanidad.", startEp: 28, endEp: 40 },
            ],
        },
        {
            id: "super-17",
            title: "Saga de Super 17",
            description:
                "El Dr. Myuu y el Dr. Gero abren un portal del infierno, liberando a criminales del pasado y creando a Super 17, la fusión de dos androides con un poder casi inconmensurable.",
            startEp: 41,
            endEp: 47,
            image: "/sagas/super-17.jpg",
            subSagas: [
                { id: "portal-infierno", title: "El Portal del Infierno y los Regresos", description: "Se abre un portal del infierno liberando a los villanos del pasado: Freezer, Cell, el General Blue, entre otros. Los guerreros Z deben combatir en dos frentes simultáneamente.", startEp: 41, endEp: 43 },
                { id: "super-17-batalla", title: "La Batalla contra Super 17", description: "Goku escapa del infierno. Android 18 revela la debilidad de Super 17, que no puede absorber y atacar al mismo tiempo. Goku lo destruye con un Kamehameha de dragón.", startEp: 44, endEp: 47 },
            ],
        },
        {
            id: "shadow-dragons",
            title: "Saga de los Dragones Malignos",
            description:
                "Décadas de deseos abusivos en las Esferas del Dragón generaron energía negativa que da nacimiento a 7 Dragones Malignos, cada uno con poderes elementales devastadores.",
            startEp: 48,
            endEp: 64,
            image: "/sagas/shadow-dragons.jpg",
            subSagas: [
                { id: "dragones-2-6", title: "Los Primeros Dragones (2★ al 6★)", description: "Goku y Pan enfrentan y derrotan a los cinco primeros Dragones Malignos: Haze Shenron (2★), Eis Shenron (6★, en equipo con Nuova), Oceanus Shenron (6★), Naturon Shenron (7★) y Rage Shenron (5★).", startEp: 48, endEp: 56 },
                { id: "nuova-eis", title: "Nuova Shenron (4★) y Eis Shenron (6★)", description: "El Dragón de Fuego Nuova ayuda a Goku brevemente antes de ser absorbido. Eis Shenron combate sucio hasta el final. Goku derrota a ambos en un combate agotador.", startEp: 57, endEp: 60 },
                { id: "omega-shenron", title: "Omega Shenron (1★) y el Final Eterno", description: "Syn Shenron absorbe todas las esferas y se convierte en Omega Shenron, el dragón definitivo. Goku y Vegeta se fusionan en Gogeta SSJ4. La Genki-Dama universal y el último adiós de Goku.", startEp: 61, endEp: 64 },
            ],
        },
    ],

    // ─────────────────────────────────────────────────────────────────────────
    // DRAGON BALL SUPER  (131 eps)
    // ─────────────────────────────────────────────────────────────────────────
    [DRAGON_BALL_SERIES.SUPER]: [
        {
            id: "batalla-dioses",
            title: "Saga La Batalla de los Dioses",
            description:
                "El Dios de la Destrucción Beerus despierta buscando al Super Saiyajin Dios de una profecía. Goku debe alcanzar un nivel divino para proteger la Tierra de una deidad cuyo poder supera todo lo conocido.",
            startEp: 1,
            endEp: 14,
            image: "/sagas/batalla-dioses.jpg",
            subSagas: [
                { id: "llegada-beerus", title: "La Profecía y la Llegada de Beerus", description: "Beerus y Whis viajan a la Tierra tras ver a Goku en el sueño profético. Los guerreros Z intentan en vano detenerlo en la fiesta de cumpleaños de Bulma.", startEp: 1, endEp: 5 },
                { id: "ssg-batalla", title: "El Super Saiyajin Dios y la Batalla", description: "Los seis Saiyajins puros de corazón transfieren su energía a Goku, creando al Super Saiyajin Dios. La batalla cósmica entre Goku y Beerus termina en empate honrado y respeto mutuo.", startEp: 6, endEp: 14 },
            ],
        },
        {
            id: "resurreccion-f",
            title: "Saga La Resurrección de 'F'",
            description:
                "Los sobrevivientes del ejército de Freezer reunen las esferas y lo reviven. Freezer entrena cuatro meses y llega a la Tierra con su nueva forma Freezer Dorado para vengarse de Goku y Vegeta.",
            startEp: 15,
            endEp: 27,
            image: "/sagas/resurreccion-f.jpg",
            subSagas: [
                { id: "resurreccion-preparacion", title: "La Resurrección y el Entrenamiento", description: "Sorbet y Tagoma reviven a Freezer con las esferas. Freezer, en su nueva forma dorada, entrena durante cuatro meses para superar a Goku.", startEp: 15, endEp: 18 },
                { id: "freezer-dorado", title: "Freezer Dorado vs Goku y Vegeta", description: "El ejército de Freezer invade la Tierra. Goku y Vegeta, con sus formas Blue, se enfrentan a Freezer Dorado. Whis revierte el tiempo 3 minutos para que Goku corrija su error y derrote a Freezer definitivamente.", startEp: 19, endEp: 27 },
            ],
        },
        {
            id: "universo-6",
            title: "Saga Torneo del Universo 6",
            description:
                "Champa y Beerus acuerdan un torneo entre los mejores guerreros del Universo 6 y el 7. El premio: las Súper Esferas del Dragón. Aparecen rivales como el asesino profesional Hit y el Saiyajin Cabba.",
            startEp: 28,
            endEp: 46,
            image: "/sagas/universo-6.png",
            subSagas: [
                { id: "torneo-u6", title: "El Torneo entre Universo 6 y 7", description: "Los guerreros del Universo 7 (Goku, Vegeta, Piccolo, Majin Buu, Monaka) se enfrentan a los del Universo 6. Vegeta vence a Cabba y Goku tiene un épico duelo con Hit, el asesino del tiempo.", startEp: 28, endEp: 41 },
                { id: "copy-vegeta", title: "Vegeta Copia (Relleno)", description: "Un ser del planeta Potaufeu puede copiar los poderes de cualquier guerrero. Crea una copia perfecta de Vegeta que los guerreros Z deben derrotar. Arco exclusivo del anime.", startEp: 42, endEp: 46 },
            ],
        },
        {
            id: "trunks-futuro",
            title: "Saga de Goku Black",
            description:
                "Trunks del futuro regresa aterrado: un ser con el rostro de Goku arrasa su línea temporal con el Dios Kai Zamasu. Goku, Vegeta y Trunks deben viajar al futuro para enfrentar esta amenaza divina.",
            startEp: 47,
            endEp: 76,
            image: "/sagas/trunks-futuro.jpg",
            subSagas: [
                { id: "goku-black-aparicion", title: "El Misterio de Goku Black", description: "Trunks llega al presente herido. Los guerreros viajan al futuro y se enfrentan por primera vez a Goku Black y al verdadero Zamasu. Vegeta alcanza Super Saiyajin Blue Evolucionado.", startEp: 47, endEp: 61 },
                { id: "zamasu-fusion", title: "Zamasu Fusionado y el Futuro Destruido", description: "Black y Zamasu se fusionan con los Potaras en Zamasu Fusionado. Zeno del futuro destruye completamente la línea temporal de Trunks como única solución. Trunks y Mai se instalan en otra línea temporal.", startEp: 62, endEp: 76 },
            ],
        },
        {
            id: "supervivencia-universal",
            title: "Saga Supervivencia Universal",
            description:
                "Zeno-Sama organiza el Torneo del Poder: 80 guerreros de 8 universos luchan en la Arena del Vacío. Los universos derrotados serán aniquilados. Goku desencadena el Ultra Instinto en la batalla final contra el invencible Jiren.",
            startEp: 77,
            endEp: 131,
            image: "/sagas/supervivencia-universal.jpg",
            subSagas: [
                { id: "exhibicion", title: "Torneo de Exhibición de Todo", description: "Zeno-Sama organiza un torneo de exhibición previo. Goku lucha contra el misterioso Monaka y el universo 9. El Omni-Rey decide oficializar el gran torneo de eliminación.", startEp: 77, endEp: 81 },
                { id: "reclutamiento", title: "Reclutamiento del Equipo Universo 7", description: "Goku y los guerreros Z deben reunir a diez combatientes. Regresan Tenshinhan, Android 17 y 18. La tarea se complica al intentar despertar al anciano Maestro Roshi y a Frieza del infierno.", startEp: 82, endEp: 96 },
                { id: "torneo-poder-caos-inicial", title: "El Torneo del Poder — 80 Guerreros en el Caos", description: "El torneo más grande del multiverso comienza en la Arena del Vacío. 80 guerreros de 8 universos pelean simultáneamente. El Universo 9 es el primero en ser aniquilado. Los guerreros del Universo 7 luchan en múltiples frentes mientras los Universos 10 y 2 también caen.", startEp: 97, endEp: 104 },
                { id: "universos-caen-jiren-round1", title: "La Caída del Universo 6 y Goku vs Jiren (Ronda 1)", description: "El Universo 6 y sus orgullosos Saiyajins caen eliminados. Los equipos se reducen drásticamente. Goku enfrenta al silencioso e invencible Jiren del Universo 11 y es aplastado. Cae en la esfera de energía y surge algo que nadie esperaba.", startEp: 105, endEp: 111 },
                { id: "ui-signal-guerreros-u7", title: "Ultra Instinto Señal y el Equipo Universo 7", description: "Goku desencadena por primera vez el Ultra Instinto Señal desde el fondo de la esfera de energía. Android 17 y 18 brillan con actuaciones heroicas. Vegeta alcanza el Super Saiyajin Blue Evolucionado. Los guerreros caen uno a uno mientras el Universo 11 presiona.", startEp: 112, endEp: 122 },
                { id: "ultra-instinto-completo-victoria", title: "Ultra Instinto Completo y el Triunfo Final", description: "Goku domina el Ultra Instinto Completo con el cabello plateado y confronta a Jiren en la batalla definitiva. Vegeta cae con dignidad. Frieza aparece en el momento clave. Android 17, el último superviviente inesperado, pide el deseo que revive todos los universos.", startEp: 123, endEp: 131 },
            ],
        },
    ],

    // ─────────────────────────────────────────────────────────────────────────
    // DRAGON BALL DAIMA  (20 eps — canon, ocurre entre DBZ y DBS)
    // ─────────────────────────────────────────────────────────────────────────
    [DRAGON_BALL_SERIES.DAIMA]: [
        {
            id: "daima",
            title: "Arco de Daima — El Reino Demoníaco",
            description:
                "Gomah y Degesu, dos majin del Reino Demoníaco, usan las Esferas del Dragón terrestres para convertir en niños a Goku y todos los que lucharon contra Majin Buu. Para revertir el hechizo deben viajar al peligroso Reino Demoníaco y reunir sus propias Esferas del Dragón. Última obra supervisada por Akira Toriyama.",
            startEp: 1,
            endEp: 20,
            image: "/sagas/daima.png",
            subSagas: [
                {
                    id: "conspiracion-conversion",
                    title: "La Conspiración — Goku se convierte en Niño",
                    description: "Gomah y Degesu observan la batalla contra Majin Buu y planean debilitar a los guerreros Z. Usando las Esferas Terrestres invocan a Shenlong y convierten a Goku y compañía en niños. Goku, Shin y el pistolero Glorio se dirigen al Reino Demoníaco.",
                    startEp: 1,
                    endEp: 3,
                },
                {
                    id: "tercer-mundo",
                    title: "El Tercer Mundo Demoníaco y Panzy",
                    description: "El trío llega al peligroso y caótico Tercer Mundo Demoníaco, el más pobre y sin ley de los tres mundos. Conocen a la joven majin enmascarada Panzy, hija del Rey Kadan, quien se convierte en su guía. Enfrentan a la Gendarmería de Gomah.",
                    startEp: 4,
                    endEp: 7,
                },
                {
                    id: "tamagami-segundo-mundo",
                    title: "El Segundo Mundo Demoníaco y los Tamagami",
                    description: "Vegeta y el resto de los guerreros Z se reúnen con el grupo. El equipo enfrenta al primer Tamagami guardián de las esferas. Llegan al místico Segundo Mundo Demoníaco, un vasto océano donde los ataca la armada de Gomah. Vegeta pelea contra el Tamagami número dos bajo el agua.",
                    startEp: 8,
                    endEp: 14,
                },
                {
                    id: "primer-mundo-gomah-final",
                    title: "El Primer Mundo y la Batalla Final contra el Rey Gomah",
                    description: "El grupo irrumpe en el Palacio de Gomah en el Primer Mundo Demoníaco. Gomah invoca el poder del Tercer Ojo Malvado y se transforma en un gigante casi invencible que se regenera constantemente. Goku desata el Super Saiyajin 4 y la batalla definitiva por el destino del Reino Demoníaco llega a su épico clímax.",
                    startEp: 15,
                    endEp: 20,
                },
            ],
        },
    ],

    // ─────────────────────────────────────────────────────────────────────────
    // SUPER DRAGON BALL HEROES  (56 eps — no canónico, anime promocional)
    // ─────────────────────────────────────────────────────────────────────────
    [DRAGON_BALL_SERIES.HEROES]: [
        {
            id: "universe-mission",
            title: "Misión del Universo — Planeta Prisión",
            description:
                "El misterioso Fu secuestra a Trunks del Futuro y atrae a Goku y Vegeta al Planeta Prisión, área experimental repleta de guerreros de distintas eras. El grupo debe sobrevivir y escapar mientras Fu recopila datos para su verdadero experimento.",
            startEp: 1,
            endEp: 20,
            image: "/sagas/universe-mission.jpg",
            subSagas: [
                { id: "planeta-prision", title: "Saga del Planeta Prisión", description: "Fu crea el Planeta Prisión y atrae a los guerreros más poderosos de distintas eras y universos. Goku, Vegeta y los personajes Xeno deben cooperar para sobrevivir y escapar.", startEp: 1, endEp: 12 },
                { id: "conflicto-universal", title: "Saga del Conflicto Universal", description: "Fu inicia su verdadero experimento usando los datos recopilados. El conflicto escala a nivel universal involucrando a Zeno-Sama y los Dioses de la Destrucción.", startEp: 13, endEp: 20 },
            ],
        },
        {
            id: "big-bang-mission",
            title: "Misión Big Bang — El Universo Oscuro",
            description:
                "Fu crea un Universo Oscuro alternativo. El legendario Rey Oscuro Mechikabura busca recuperar su poder supremo y conquistar el tiempo y el espacio con sus Guerreros de Negro.",
            startEp: 21,
            endEp: 40,
            image: "/sagas/big-bang-mission.png",
            subSagas: [
                { id: "universo-oscuro", title: "Saga del Universo Oscuro y Fu", description: "Fu presenta el Universo Oscuro, producto de su experimento definitivo. Los guerreros Z y Xeno deben navegar este universo alternativo lleno de versiones distorsionadas de enemigos conocidos.", startEp: 21, endEp: 33 },
                { id: "rey-oscuro", title: "Saga del Rey Oscuro Mechikabura", description: "Mechikabura recupera su poder y se convierte en el Gran Rey Oscuro. Los Guerreros Xeno deben detenerlo antes de que consuma toda la línea temporal y el multiverso.", startEp: 34, endEp: 40 },
            ],
        },
        {
            id: "ultra-god-mission",
            title: "Misión Ultra Dios — Kaioshin del Tiempo",
            description:
                "Aeos, la misteriosa Kaioshin del Tiempo, organiza el Ultratorneo del Espacio-Tiempo con guerreros de distintas líneas temporales. Sus verdaderas intenciones amenazan con borrar líneas temporales enteras.",
            startEp: 41,
            endEp: 50,
            image: "/sagas/ultra-god-mission.png",
            subSagas: [
                { id: "ultortorneo", title: "El Ultratorneo del Espacio-Tiempo", description: "Aeos convoca guerreros de múltiples líneas temporales para el torneo. Beat y Note hacen su debut en el anime. Los combates eliminatorios presentan enfrentamientos inéditos entre personajes de distintas eras.", startEp: 41, endEp: 45 },
                { id: "verdad-aeos", title: "La Verdad de Aeos y el Clímax", description: "Se revela que Aeos desea eliminar líneas temporales para 'limpiar' el multiverso. Chronoa, la Kaioshin del Tiempo original, se enfrenta a su sucesora. Goku con Ultra Instinto se bate contra la deidad del tiempo.", startEp: 46, endEp: 50 },
            ],
        },
        {
            id: "meteor-mission",
            title: "Misión Meteoro — El Invasor Demoníaco",
            description:
                "Una amenaza del mundo demoníaco llega para sembrar el caos. Beat, Note y los Avatares se unen a los guerreros Z y Xeno para detener al Invasor Demoníaco en una batalla que fusiona el mundo demoníaco con el poder de Mechikabura.",
            startEp: 51,
            endEp: 56,
            image: "/sagas/meteor-mission.png",
            subSagas: [
                { id: "invasor-demoniaco", title: "El Invasor Demoníaco", description: "Una entidad demoníaca poderosa irrumpe en el universo. Los guerreros deben forjar una alianza sin precedentes entre los personajes del presente, el futuro y las líneas Xeno.", startEp: 51, endEp: 53 },
                { id: "batalla-final-meteor", title: "Batalla Final de los Avatares", description: "Beat y Note desatan su máximo poder junto a los aliados de todas las eras. La resolución de la Misión Meteoro cierra el ciclo del anime promocional de Super Dragon Ball Heroes.", startEp: 54, endEp: 56 },
            ],
        },
    ],
}