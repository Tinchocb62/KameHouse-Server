export const DRAGON_BALL_SERIES = {
    ORIGINAL: 12609,
    Z: 12971,
    GT: 12697,
    KAI: 61709,
    SUPER: 62715,
    DAIMA: 236994,
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
                { id: "busqueda-esferas", title: "En busca de las Esferas del Dragón", description: "Goku conoce a Bulma y emprenden juntos la búsqueda de las siete esferas, conociendo a Oolong, Yamcha y Puar.", startEp: 1, endEp: 7, image: "/sagas/original/busqueda-esferas.webp" },
                { id: "pilaf-castillo", title: "El Castillo del Emperador Pilaf", description: "Los amigos son capturados por Pilaf en su castillo. Goku se transforma en Ozaru durante la luna llena y destruye el lugar, permitiendo la fuga.", startEp: 8, endEp: 13, image: "/sagas/original/pilaf-castillo.webp" },
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
                { id: "entrenamiento-roshi", title: "Entrenamiento con el Maestro Roshi", description: "Goku y Krilin entrenan duramente bajo la tutela del Maestro Roshi con el método de la leche y trabajos físicos extremos.", startEp: 14, endEp: 20, image: "/sagas/original/entrenamiento-roshi.webp" },
                { id: "torneo-21-combates", title: "El 21° Torneo", description: "Goku y Krilin participan en el torneo enfrentando a Jackie Chun (Roshi disfrazado), con una final épica entre ambos jóvenes.", startEp: 21, endEp: 28, image: "/sagas/original/torneo-21-combates.webp" },
            ],
        },
        {
            id: "red-ribbon",
            title: "Saga de la Patrulla Roja",
            description:
                "Goku busca la esfera de 4 estrellas de su abuelo Gohan y se enfrenta al ejército criminal de la Patrulla Roja, que también codicia las esferas para dominar el mundo.",
            startEp: 29,
            endEp: 68,
            image: "/sagas/red-ribbon.jpg",
            subSagas: [
                { id: "coronel-silver", title: "Coronel Silver y los primeros enfrentamientos", description: "Goku derrota al Coronel Silver y comienza su cacería de las esferas restantes, descubriendo el alcance del ejército de la Patrulla Roja.", startEp: 29, endEp: 33, image: "/sagas/original/coronel-silver.webp" },
                { id: "torre-fuerza", title: "La Torre de la Fuerza — General White", description: "Goku asalta la imponente Torre de la Fuerza para rescatar a un niño secuestrado. Derrota al General White y conoce al robot Murasaki.", startEp: 34, endEp: 45, image: "/sagas/red-ribbon.jpg" },
                { id: "general-blue", title: "Aventura Submarina — General Blue", description: "Goku y sus amigos buscan una esfera en el océano y son perseguidos por el peligroso y telekinético General Blue hasta una ciudad pirata subterránea.", startEp: 46, endEp: 57, image: "/sagas/original/general-blue.webp" },
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
                { id: "cinco-guerreros", title: "Los Cinco Guerreros de Uranai Baba", description: "Goku y sus amigos combaten a los cinco espadachines y guerreros de la bruja, incluyendo a Dracula Man y Upa.", startEp: 69, endEp: 76, image: "/sagas/original/cinco-guerreros.webp" },
                { id: "reencuentro-gohan", title: "El Reencuentro con el Abuelo Gohan", description: "El último oponente resulta ser el espíritu del abuelo Gohan, quien regresa por un día del Más Allá para un emotivo reencuentro. Goku consigue la esfera final.", startEp: 77, endEp: 82, image: "/sagas/original/reencuentro-gohan.webp" },
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
                { id: "preparacion-22", title: "Preparación para el 22° Torneo", description: "Los guerreros se reencuentran tras años de entrenamiento. Goku ha crecido y demostrado gran poder. Tenshinhan y Chaotzu hacen su debut intimidante.", startEp: 83, endEp: 85, image: "/sagas/original/preparacion-22.webp" },
                { id: "combates-22", title: "El 22° Torneo — Goku vs Tenshinhan", description: "Serie de combates culminando en el épico choque entre Goku y Tenshinhan. El duelo termina con Tenshinhan como campeón por puntos, pero reconociendo la superioridad moral de Goku.", startEp: 86, endEp: 101, image: "/sagas/original/combates-22.webp" },
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
                { id: "liberacion-piccolo", title: "Liberación del Rey Demonio", description: "Pilaf libera accidentalmente a Piccolo Daimaku. El demonio mata a Krilin y al Maestro Roshi. Goku, destrozado, busca el Agua Sagrada para fortalecerse.", startEp: 102, endEp: 111, image: "/sagas/original/liberacion-piccolo.webp" },
                { id: "batalla-piccolo", title: "La Batalla Final contra el Rey Demonio", description: "Goku enfrenta a Piccolo Daimaku en su forma rejuvenecida. Con el Kamehameha inverso, Goku lo vence atravesándolo y emergiendo victorioso de su propio cuerpo.", startEp: 112, endEp: 122, image: "/sagas/original/batalla-piccolo.webp" },
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
                { id: "preliminares-23", title: "Preliminares del 23° Torneo", description: "Los guerreros llegan al torneo. Un misterioso participante de nombre \"Shen\" resulta ser el dios Kami disfrazado. Piccolo Jr. también se ha inscripto bajo un alias.", startEp: 123, endEp: 133, image: "/sagas/original/preliminares-23.webp" },
                { id: "goku-vs-piccolo-jr", title: "La Final: Goku vs Piccolo Jr.", description: "El combate climático de la serie original. Piccolo Jr. crece a tamaño gigante, pero Goku lo supera con el Kamehameha volador. Goku perdona a Piccolo y le lanza una senzu. Finaliza la boda de Goku y Chichi.", startEp: 134, endEp: 153, image: "/sagas/original/goku-vs-piccolo-jr.webp" },
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
            image: "/sagas/saiyajin.jpg",
            subSagas: [
                { id: "raditz", title: "La Llegada de Raditz", description: "Raditz, hermano de Goku, llega a la Tierra. Goku y Piccolo se alían para enfrentarlo. Goku muere sacrificándose para que Piccolo pueda matar a Raditz con el Makankosappo.", startEp: 1, endEp: 6, image: "/sagas/z/raditz-saga.jpg" },
                { id: "entrenamiento-z", title: "Entrenamiento Especial", description: "Goku entrena con el Kaio del Norte en el Más Allá. En la Tierra, Piccolo entrena a Gohan y el resto de los guerreros Z se preparan para la inminente llegada de Nappa y Vegeta.", startEp: 7, endEp: 20, image: "/sagas/z/entrenamiento-z.webp" },
                { id: "vegeta-nappa", title: "Batalla contra Nappa y Vegeta", description: "Nappa y Vegeta aterrizan en la Tierra. Yamcha, Chaotzu, Tenshinhan y Piccolo caen en combate. Goku regresa y vence a Nappa. La batalla épica contra Vegeta termina con Goku victorioso pero con ambos supervivientes.", startEp: 21, endEp: 35, image: "/sagas/z/vegeta-saga.jpg" },
            ],
        },
        {
            id: "namek-freezer",
            title: "Saga Namek y Freezer",
            description:
                "Gohan, Krilin y Bulma viajan al planeta Namek para revivir a sus amigos caídos, pero se topan con el tirano galáctico Freezer y sus ejércitos, así como con las Fuerzas Especiales Ginyu.",
            startEp: 36,
            endEp: 107,
            image: "/sagas/namek-freezer.jpg",
            subSagas: [
                { id: "viaje-namek", title: "Viaje a Namek", description: "El trío terrestre viaja a Namek mientras Vegeta también pone rumbo al planeta. Los namekianos caen bajo el yugo de Freezer, quien busca la inmortalidad con las esferas.", startEp: 36, endEp: 67 },
                { id: "fuerzas-ginyu", title: "Las Fuerzas Especiales Ginyu", description: "El Capitán Ginyu y su escuadra élite llegan a Namek. Goku derrota a la mayoría, pero Ginyu intercambia cuerpos con él. Vegeta, Gohan y Krilin deben superar el caos resultante.", startEp: 68, endEp: 74, image: "/sagas/z/captain-ginyu-saga.jpg" },
                { id: "goku-llega-namek", title: "Goku Llega a Namek", description: "Goku aterriza en Namek y en cuestión de minutos destruye a Jeice y recupera su cuerpo del Capitán Ginyu. El equipo, al borde de la derrota, recupera la esperanza con la llegada del guerrero más fuerte de la Tierra.", startEp: 75, endEp: 82, image: "/sagas/z/goku-llega-namek.webp" },
                { id: "cuatro-formas-freezer", title: "Las Cuatro Transformaciones de Freezer", description: "Goku combate a Freezer a través de sus cuatro formas. El Kaioken x20 combinado con el Kamehameha no alcanza. Piccolo llega reforzado con la fusión namekiana. La muerte de Krilin a manos de Freezer desencadena algo que el universo nunca había visto.", startEp: 83, endEp: 97, image: "/sagas/z/frieza-saga.jpg" },
                { id: "ssj-explosion-namek", title: "Nace el Super Saiyajin — Namek en Llamas", description: "La rabia por la muerte de Krilin desencadena la legendaria y profetizada transformación en Super Saiyajin. Goku domina completamente a Freezer. El planeta Namek colapsa y explota. Goku sobrevive en el planeta Yardrat mientras el universo entero lo da por muerto.", startEp: 98, endEp: 107, image: "/sagas/z/ssj-explosion-namek.webp" },
            ],
        },
        {
            id: "garlic-jr",
            title: "Saga Garlic Jr. (Relleno)",
            description:
                "Aprovechando la ausencia de Goku, Garlic Jr. escapa de la Zona Muerta usando el Polvo de las Estrellas Oscuras para convertir a la humanidad en mazoku. Arco exclusivo del anime, no basado en el manga.",
            startEp: 108,
            endEp: 117,
            image: "/sagas/garlic-jr.jpg",
        },
        {
            id: "androides",
            title: "Saga de los Androides",
            description:
                "Un misterioso joven del futuro advierte sobre la llegada de androides asesinos creados por la Patrulla Roja. La humanidad enfrenta su mayor amenaza mientras los guerreros Z entrenan arduamente.",
            startEp: 118,
            endEp: 139,
            image: "/sagas/z/androids-saga.jpg",
            subSagas: [
                { id: "trunks-futuro", title: "Trunks del Futuro y la Advertencia", description: "Trunks, el hijo de Vegeta y Bulma del futuro, derrota a Freezer y al Rey Cold. Advierte sobre la llegada de androides asesinos en tres años y la existencia de un ser aún más peligroso.", startEp: 118, endEp: 125, image: "/sagas/z/trunks-saga.jpg" },
                { id: "androides-17-18", title: "Los Androides 17, 18 y 16", description: "El Dr. Gero activa a los androides 17, 18 y 16. Los guerreros Z descubren que sus poderes de pelea son insuficientes. Vegeta alcanza el nivel Super Saiyajin.", startEp: 126, endEp: 139, image: "/sagas/z/androids-saga.jpg" },
            ],
        },
        {
            id: "cell",
            title: "Saga de Cell",
            description:
                "Aparece la bio-arma perfecta Cell, quien busca absorber a los androides para alcanzar su forma perfecta. Se organizan los Juegos de Cell para decidir el destino de la Tierra.",
            startEp: 140,
            endEp: 194,
            image: "/sagas/z/perfect-cell-saga.jpg",
            subSagas: [
                { id: "cell-imperfecto", title: "Cell Imperfecto", description: "Cell, creado con el ADN de los guerreros más poderosos, busca absorber a los androides para alcanzar su forma perfecta. Los guerreros Z entrenan en la Sala del Tiempo Hiperbólico.", startEp: 140, endEp: 152, image: "/sagas/z/imperfect-cell-saga.jpg" },
                { id: "cell-semiperfecto", title: "Cell Semiperfecto", description: "Cell absorbe al androide 17 alcanzando su forma semiperfecta. Vegeta, en su arrogancia, permite que Cell absorba también al androide 18, logrando su forma perfecta.", startEp: 153, endEp: 165, image: "/sagas/z/perfect-cell-saga.jpg" },
                { id: "juegos-cell", title: "Los Juegos de Cell", description: "Cell organiza un torneo de televisión para demostrar su poder. Gohan despierta su potencial oculto como Super Saiyajin 2 tras ver caer a Android 16. Goku se sacrifica teletransportándose con la autodestrucción de Cell.", startEp: 166, endEp: 194, image: "/sagas/z/cell-games-saga.jpg" },
            ],
        },
        {
            id: "torneo-otro-mundo",
            title: "Saga del Torneo del Otro Mundo (Relleno)",
            description:
                "Goku, tras su sacrificio en los Juegos de Cell, participa en un torneo de artes marciales en el Otro Mundo organizado por el Gran Kaio-sama, donde conoce a grandes guerreros como Pikkon.",
            startEp: 195,
            endEp: 199,
            image: "/sagas/z/other-world-saga.webp",
        },
        {
            id: "majin-buu",
            title: "Saga de Majin Buu",
            description: "Tras varios años de paz, un nuevo y terrorífico enemigo amenaza al universo. Los guerreros Z deberán superar sus límites y utilizar nuevas técnicas como la fusión para detener al invencible monstruo Majin Buu.",
            startEp: 200,
            endEp: 291,
            image: "/sagas/z/majin-buu-saga.jpg",
            subSagas: [
                { id: "gran-saiyaman-arc", title: "El Gran Saiyaman", description: "Gohan estudia en la secundaria y se convierte en el héroe enmascarado Gran Saiyaman para combatir el crimen sin revelar su identidad. Conoce a Videl, hija de Mr. Satan.", startEp: 200, endEp: 209 },
                { id: "torneo-25", title: "El 25° Torneo de Artes Marciales", description: "Goku consigue permiso para regresar del Más Allá por un día. Los guerreros Z se inscriben pero Babidi y Dabura irrumpen con sus propios planes, captando la energía del torneo para despertar a Buu.", startEp: 210, endEp: 219, image: "/sagas/z/world-tournament-saga.webp" },
                { id: "babidi-dabura-vegeta-majin", title: "La Nave de Babidi y Majin Vegeta", description: "Los guerreros Z siguen a Babidi hasta su nave. Gohan cae ante el poderoso Dabura. Vegeta acepta ser convertido en Majin para recuperar su salvajismo y enfrenta a Goku en un duelo épico. La energía del combate alimenta el sello de Majin Buu.", startEp: 220, endEp: 231, image: "/sagas/z/babidi-saga.jpg" },
                { id: "despertar-buu-sacrificio-vegeta", title: "El Despertar de Buu y el Sacrificio de Vegeta", description: "Majin Buu emerge en su forma gordita e inocente pero de poder incontenible. Vegeta, en un acto de redención, se sacrifica con la Explosión Final (ep 232-237) para destruirlo.", startEp: 232, endEp: 237, image: "/sagas/z/majin-buu-saga.jpg" },
                { id: "ssj3-fusion-dance", title: "El Super Saiyajin 3 y la Fusión", description: "Goku muestra por primera vez la transformación del Super Saiyajin 3 ante Buu para ganar tiempo. Goten y Trunks aprenden la danza de la Fusión en el Templo Sagrado.", startEp: 238, endEp: 253, image: "/sagas/z/fusion-saga.jpg" },
                { id: "super-buu", title: "La Amenaza de Super Buu", description: "Buu absorbe a Piccolo, Gotenks y Gohan transformado, convirtiéndose en Super Buu. Goku y Vegeta se fusionan con los Potaras y entran al cuerpo de Buu para rescatar a sus amigos.", startEp: 254, endEp: 275, image: "/sagas/z/fusion-saga.jpg" },
                { id: "fusion-kid-buu", title: "Fusión y Batalla Final contra Kid Buu", description: "Kid Buu destruye la Tierra. Goku y Vegeta luchan en el Planeta de las Kaioshins. La Genki-Dama final de Goku, alimentada por toda la humanidad, derrota definitivamente a Kid Buu.", startEp: 276, endEp: 287, image: "/sagas/z/kid-buu-saga.jpg" },
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
                { id: "deseo-pilaf", title: "El Deseo de Pilaf y la Transformación", description: "El Emperador Pilaf irrumpe en la sala del Dragón e invoca a Shenlong. Al ver a Goku, desea que vuelva a ser un niño. El deseo se cumple y las esferas se dispersan por la galaxia.", startEp: 1, endEp: 3, image: "/sagas/gt/deseo-pilaf.webp" },
                { id: "viaje-galaxia", title: "Viaje por la Galaxia", description: "Goku, Trunks y Pan viajan en la nave Badalmóvil visitando planetas extraños en busca de las esferas. Encuentran aliados y enemigos peculiares en cada mundo.", startEp: 4, endEp: 16, image: "/sagas/gt/viaje-galaxia.webp" },
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
                { id: "invasion-baby", title: "La Invasión de Baby", description: "Baby llega a la Tierra y comienza a infectar a los humanos y guerreros Z uno a uno. Vegeta es poseído, convirtiéndose en el poderoso Baby Vegeta.", startEp: 17, endEp: 27, image: "/sagas/gt/invasion-baby.webp" },
                { id: "ssj4-baby", title: "Super Saiyajin 4 vs Baby", description: "Goku recupera su cuerpo adulto y alcanza el legendario Super Saiyajin 4. La batalla climática entre Goku SSJ4 y Baby Vegeta decide el destino de la humanidad.", startEp: 28, endEp: 40, image: "/sagas/gt/ssj4-baby.webp" },
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
                { id: "portal-infierno", title: "El Portal del Infierno y los Regresos", description: "Se abre un portal del infierno liberando a los villanos del pasado: Freezer, Cell, el General Blue, entre otros. Los guerreros Z deben combatir en dos frentes simultáneamente.", startEp: 41, endEp: 43, image: "/sagas/gt/portal-infierno.webp" },
                { id: "super-17-batalla", title: "La Batalla contra Super 17", description: "Goku escapa del infierno. Android 18 revela la debilidad de Super 17, que no puede absorber y atacar al mismo tiempo. Goku lo destruye con un Kamehameha de dragón.", startEp: 44, endEp: 47, image: "/sagas/gt/super-17-batalla.webp" },
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
    // DRAGON BALL KAI  (167 eps)
    // ─────────────────────────────────────────────────────────────────────────
    [DRAGON_BALL_SERIES.KAI]: [
        {
            id: "saiyajin",
            title: "Saga de los Saiyajin",
            description:
                "Cinco años después del 23° Torneo, Raditz llega a la Tierra revelando el origen Saiyajin de Goku. Goku y Piccolo se alían para detenerlo, dando inicio al épico entrenamiento ante la inminente llegada de Vegeta y Nappa.",
            startEp: 1,
            endEp: 17,
            image: "/sagas/saiyajin.jpg",
            subSagas: [
                { id: "llegada-raditz", title: "La Llegada de Raditz y el Sacrificio de Goku", description: "Raditz secuestra a Gohan. Goku y Piccolo se unen para derrotarlo al costo de la vida de Goku, quien viaja por el Camino de la Serpiente.", startEp: 1, endEp: 4, image: "/sagas/z/raditz-saga.webp" },
                { id: "entrenamiento-sayajin", title: "El Camino de la Serpiente y el Entrenamiento", description: "Goku entrena con Kaio-sama aprendiendo el Kaio-ken y la Genki-Dama. Los Guerreros Z se preparan en la Tierra.", startEp: 5, endEp: 9, image: "/sagas/z/saiyan-training.webp" },
                { id: "batalla-vegeta", title: "La Batalla Decisiva: Goku vs Vegeta", description: "Vegeta y Nappa diezman a los Guerreros Z. Goku llega y desata el Kaio-ken x4 contra el Galick Ho de Vegeta en un duelo legendario.", startEp: 10, endEp: 17, image: "/sagas/saiyajin.jpg" },
            ],
        },
        {
            id: "namek-freezer",
            title: "Saga de Freezer",
            description:
                "Gohan, Krilin y Bulma viajan a Namekusei para revivir a sus amigos caídos. Allí enfrentan a las tropas del tirano Freezer, a las Fuerzas Especiales Ginyu y presencian el despertar del legendario Super Saiyajin.",
            startEp: 18,
            endEp: 54,
            image: "/sagas/namek-freezer.jpg",
            subSagas: [
                { id: "viaje-namek", title: "Viaje a Namekusei y las Fuerzas Especiales Ginyu", description: "Krilin y Gohan se alían con Vegeta contra el Capitán Ginyu y su escuadrón. Goku llega y demuestra un poder abrumador.", startEp: 18, endEp: 35, image: "/sagas/z/namek-saga.webp" },
                { id: "batalla-freezer", title: "La Batalla contra Freezer y el Super Saiyajin", description: "Freezer desata sus múltiples transformaciones. Tras la muerte de Krilin, Goku despierta la furia del Super Saiyajin en un Namek al borde de la destrucción.", startEp: 36, endEp: 54, image: "/sagas/namek-freezer.jpg" },
            ],
        },
        {
            id: "androides-cell",
            title: "Saga de los Androides y Cell",
            description:
                "Trunks del Futuro advierte sobre los androides del Dr. Gero y el bio-androide definitivo Cell, quien organiza los Juegos de Cell para decidir el destino de la Tierra.",
            startEp: 55,
            endEp: 98,
            image: "/sagas/trunks-androides-cell.jpg",
            subSagas: [
                { id: "amenaza-androides", title: "La Amenaza de los Androides 17 y 18", description: "Aparecen el Dr. Gero, 19, 17, 18 y 16. Goku cae enfermo del corazón y Vegeta demuestra el poder del Super Saiyajin.", startEp: 55, endEp: 67, image: "/sagas/trunks-androides-cell.jpg" },
                { id: "evolucion-cell", title: "La Evolución de Cell hacia la Perfección", description: "Cell absorbe a los androides alcanzando su forma perfecta tras superar a Piccolo, Vegeta y Trunks.", startEp: 68, endEp: 82, image: "/sagas/z/imperfect-cell-saga.jpg" },
                { id: "juegos-cell", title: "Los Juegos de Cell y el Super Saiyajin 2 de Gohan", description: "Goku cede su lugar a Gohan, quien desata el Super Saiyajin 2. Tras el sacrificio de Goku, el Kamehameha Padre-Hijo pulveriza a Cell.", startEp: 83, endEp: 98, image: "/sagas/trunks-androides-cell.jpg" },
            ],
        },
        {
            id: "majin-buu",
            title: "Saga de Majin Buu",
            description:
                "Siete años después, el mago Babidi despierta al destructivo monstruo Majin Buu. Goku estrena el Super Saiyajin 3, Gotenks y Vegetto desafían a Buu y la Genki-Dama universal sella la paz del universo.",
            startEp: 99,
            endEp: 167,
            image: "/sagas/majin-buu.jpg",
            subSagas: [
                { id: "torneo-25-buu", title: "El 25° Torneo y el Despertar de Majin Buu", description: "Goku regresa del Más Allá por un día. Majin Vegeta se enfrenta a Goku y se sacrifica inútilmente contra Majin Buu.", startEp: 99, endEp: 114, image: "/sagas/gran-saiyaman-torneo25.jpg" },
                { id: "fusiones-super-buu", title: "Super Saiyajin 3, Gotenks y Vegetto", description: "Goku muestra el SSJ3. Goten y Trunks aprenden la Fusión Gotenks, y Goku y Vegeta se unen mediante los Pendientes Pothala creando a Vegetto.", startEp: 115, endEp: 145, image: "/sagas/majin-buu.jpg" },
                { id: "kid-buu-final", title: "La Batalla Final contra Kid Buu y el Gran Final", description: "En el Planeta Supremo, Goku reúne la energía de toda la humanidad en la Súper Genki-Dama para aniquilar a Kid Buu para siempre.", startEp: 146, endEp: 167, image: "/sagas/majin-buu.jpg" },
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
                { id: "llegada-beerus", title: "La Profecía y la Llegada de Beerus", description: "Beerus y Whis viajan a la Tierra tras ver a Goku en el sueño profético. Los guerreros Z intentan en vano detenerlo en la fiesta de cumpleaños de Bulma.", startEp: 1, endEp: 5, image: "/sagas/super/llegada-beerus.webp" },
                { id: "ssg-batalla", title: "El Super Saiyajin Dios y la Batalla", description: "Los seis Saiyajins puros de corazón transfieren su energía a Goku, creando al Super Saiyajin Dios. La batalla cósmica entre Goku y Beerus termina en empate honrado y respeto mutuo.", startEp: 6, endEp: 14, image: "/sagas/super/ssg-batalla.webp" },
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
                { id: "resurreccion-preparacion", title: "La Resurrección y el Entrenamiento", description: "Sorbet y Tagoma reviven a Freezer con las esferas. Freezer, en su nueva forma dorada, entrena durante cuatro meses para superar a Goku.", startEp: 15, endEp: 18, image: "/sagas/super/resurreccion-preparacion.webp" },
                { id: "freezer-dorado", title: "Freezer Dorado vs Goku y Vegeta", description: "El ejército de Freezer invade la Tierra. Goku y Vegeta, con sus formas Blue, se enfrentan a Freezer Dorado. Whis revierte el tiempo 3 minutos para que Goku corrija su error y derrote a Freezer definitivamente.", startEp: 19, endEp: 27, image: "/sagas/super/freezer-dorado.webp" },
            ],
        },
        {
            id: "universo-6",
            title: "Saga del Torneo del Universo 6",
            description:
                "Champa y Beerus acuerdan un torneo entre los mejores guerreros del Universo 6 y el 7. El premio: las Súper Esferas del Dragón. Aparecen rivales como el asesino profesional Hit y el Saiyajin Cabba.",
            startEp: 28,
            endEp: 41,
            image: "/sagas/universo-6.jpg",
            subSagas: [
                { id: "torneo-u6", title: "El Torneo entre Universo 6 y 7", description: "Los guerreros del Universo 7 (Goku, Vegeta, Piccolo, Majin Buu, Monaka) se enfrentan a los del Universo 6. Vegeta vence a Cabba y Goku tiene un épico duelo con Hit, el asesino del tiempo.", startEp: 28, endEp: 41, image: "/sagas/super/torneo-u6.webp" },
            ],
        },
        {
            id: "copy-vegeta",
            title: "Saga del Agua Sobrenatural (Vegeta Copia)",
            description: "Un ser del planeta Potaufeu puede copiar los poderes de cualquier guerrero. Crea una copia perfecta de Vegeta que los guerreros Z deben derrotar.",
            startEp: 42,
            endEp: 46,
            image: "/sagas/universo-6.jpg",
            subSagas: [
                { id: "copy-vegeta", title: "Vegeta Copia (Relleno)", description: "Arco exclusivo del anime. Goten y Trunks viajan de polizones. Goku debe vencer a la copia de Vegeta antes de que el original desaparezca por completo.", startEp: 42, endEp: 46, image: "/sagas/super/copy-vegeta.webp" },
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
            id: "exhibicion-zen",
            title: "Saga de Exhibición Zen",
            description: "Zeno-Sama organiza un torneo de exhibición previo. Goku y el Universo 7 se enfrentan al Universo 9 en los combates de demostración que decidirán el futuro del Torneo del Poder.",
            startEp: 77,
            endEp: 81,
            image: "/sagas/supervivencia-universal.jpg",
            subSagas: [
                { id: "exhibicion", title: "Torneo de Exhibición de Todo", description: "Zeno-Sama organiza un torneo de exhibición previo. Goku lucha contra el misterioso Monaka y el universo 9. El Omni-Rey decide oficializar el gran torneo de eliminación.", startEp: 77, endEp: 81, image: "/sagas/super/exhibicion-zen.webp" },
            ],
        },
        {
            id: "reclutamiento-u7",
            title: "Saga de Reclutamiento",
            description: "Goku y los guerreros Z deben reunir contrarreloj a diez combatientes para participar en el Torneo del Poder donde la derrota significa la aniquilación universal.",
            startEp: 82,
            endEp: 96,
            image: "/sagas/supervivencia-universal.jpg",
            subSagas: [
                { id: "reclutamiento", title: "Reclutamiento del Equipo Universo 7", description: "Goku y los guerreros Z deben reunir a diez combatientes. Regresan Tenshinhan, Android 17 y 18. La tarea se complica al intentar despertar al anciano Maestro Roshi y a Frieza del infierno.", startEp: 82, endEp: 96, image: "/sagas/super/reclutamiento-u7.webp" },
            ],
        },
        {
            id: "torneo-poder",
            title: "Saga del Torneo del Poder",
            description:
                "Zeno-Sama organiza el Torneo del Poder: 80 guerreros de 8 universos luchan en la Arena del Vacío. Los universos derrotados serán aniquilados. Goku desencadena el Ultra Instinto en la batalla final contra el invencible Jiren.",
            startEp: 97,
            endEp: 131,
            image: "/sagas/supervivencia-universal.jpg",
            subSagas: [
                { id: "torneo-poder-caos-inicial", title: "El Torneo del Poder — 80 Guerreros en el Caos", description: "El torneo más grande del multiverso comienza en la Arena del Vacío. 80 guerreros de 8 universos pelean simultáneamente. El Universo 9 es el primero en ser aniquilado. Los guerreros del Universo 7 luchan en múltiples frentes mientras los Universos 10 y 2 también caen.", startEp: 97, endEp: 104, image: "/sagas/super/torneo-poder-caos-inicial.webp" },
                { id: "universos-caen-jiren-round1", title: "La Caída del Universo 6 y Goku vs Jiren (Ronda 1)", description: "El Universo 6 y sus orgullosos Saiyajins caen eliminados. Los equipos se reducen drásticamente. Goku enfrenta al silencioso e invencible Jiren del Universo 11 y es aplastado. Cae en la esfera de energía y surge algo que nadie esperaba.", startEp: 105, endEp: 111, image: "/sagas/super/universos-caen-jiren-round1.webp" },
                { id: "ui-signal-guerreros-u7", title: "Ultra Instinto Señal y el Equipo Universo 7", description: "Goku desencadena por primera vez el Ultra Instinto Señal desde el fondo de la esfera de energía. Android 17 y 18 brillan con actuaciones heroicas. Vegeta alcanza el Super Saiyajin Blue Evolucionado. Los guerreros caen uno a uno mientras el Universo 11 presiona.", startEp: 112, endEp: 122, image: "/sagas/super/ui-signal-guerreros-u7.webp" },
                { id: "ultra-instinto-completo-victoria", title: "Ultra Instinto Completo y el Triunfo Final", description: "Goku domina el Ultra Instinto Completo con el cabello plateado y confronta a Jiren en la batalla definitiva. Vegeta cae con dignidad. Frieza aparece en el momento clave. Android 17, el último superviviente inesperado, pide el deseo que revive todos los universos.", startEp: 123, endEp: 131, image: "/sagas/super/ultra-instinto-completo-victoria.webp" },
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
            image: "/sagas/daima.jpg",
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
}