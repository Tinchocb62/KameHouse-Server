package repository

import "kamehouse/internal/api/dragonball/domain"

func gtSeries() domain.Series {
	return domain.Series{
		ID:           "gt",
		Title:        "Dragon Ball GT",
		TMDBID:       12697,
		Year:         "1996–1997",
		EpisodeCount: 64,
		Canon:        false,
		Studio:       "Toei Animation",
		Description:  "Secuela no canon: Goku, convertido de nuevo en niño por las Esferas de la Estrella Negra, recorre la galaxia con Pan y Trunks, enfrentando a Baby, Super 17 y los Dragones Malignos, alcanzando el Super Saiyajin 4.",
		SagaIDs:      []string{"black-star", "baby", "super-17", "shadow-dragons"},
	}
}

func gtSagas() []domain.Saga {
	return []domain.Saga{
		{ID: "black-star", SeriesID: "gt", Name: "Saga de las Esferas de la Estrella Negra", StartEp: 1, EndEp: 16, Order: 1},
		{ID: "baby", SeriesID: "gt", Name: "Saga de Baby", StartEp: 17, EndEp: 40, Order: 2},
		{ID: "super-17", SeriesID: "gt", Name: "Saga de Super Número 17", StartEp: 41, EndEp: 47, Order: 3},
		{ID: "shadow-dragons", SeriesID: "gt", Name: "Saga de los Dragones Malignos", StartEp: 48, EndEp: 64, Order: 4},
	}
}

func gtEpisodes() []domain.Episode {
	s := "gt"
	return []domain.Episode{
		// ── Esferas de la Estrella Negra ──
		{SeriesID: s, SagaID: "black-star", NumberStart: 1, NumberEnd: 1, Title: "¿Goku se convierte en niño?", Villains: []string{"Banda de Pilaf"}, Milestone: "Pilaf encuentra las Esferas de la Estrella Negra y pide por error que Goku vuelva a ser niño. La Tierra explotará en 1 año si no se reúnen las 7 esferas."},
		{SeriesID: s, SagaID: "black-star", NumberStart: 2, NumberEnd: 2, Title: "¡La líder es Pan! ¡Despegue hacia el espacio!", Milestone: "Pan presiona el botón de despegue por sorpresa dejando a Goten afuera y partiendo junto a Goku y Trunks en la nave Tako."},
		{SeriesID: s, SagaID: "black-star", NumberStart: 3, NumberEnd: 3, Title: "El planeta Imegga", Villains: []string{"Don Kee", "Gale", "Sheila"}, Milestone: "En Imegga todo es alquilado por el tirano Don Kee. La nave espacial del grupo es remolcada."},
		{SeriesID: s, SagaID: "black-star", NumberStart: 4, NumberEnd: 4, Title: "¿Goku es un criminal?", Villains: []string{"Don Kee"}, Milestone: "Goku, Trunks y Pan se convierten en fugitivos. Conocen al robot Giru (T-2008), que absorbe el Radar del Dragón."},
		{SeriesID: s, SagaID: "black-star", NumberStart: 5, NumberEnd: 5, Title: "El guardaespaldas Redic", Villains: []string{"Don Kee", "Redic"}, Milestone: "Goku se transforma en Super Saiyajin 1 y destruye las espadas de luz de Redic. Recuperan la nave y la primera esfera."},
		{SeriesID: s, SagaID: "black-star", NumberStart: 6, NumberEnd: 6, Title: "Goku hace de dentista", Milestone: "Planeta Monmaasu: Goku ingresa a la boca de un gigante para extraerle una manzana atascada que contenía la esfera de 4 estrellas."},
		{SeriesID: s, SagaID: "black-star", NumberStart: 7, NumberEnd: 7, Title: "¡Trunks es la novia!", Villains: []string{"Zoma"}, Milestone: "Planeta Kelbo: Trunks se viste de novia para engañar al monstruo Zoma, que exige una esposa para dejar de provocar terremotos."},
		{SeriesID: s, SagaID: "black-star", NumberStart: 8, NumberEnd: 8, Title: "¡Los bigotes están a pleno poder!", Villains: []string{"Zoma"}, Milestone: "Goku descubre que al cortarle los bigotes a Zoma pierde su poder. Recuperan la esfera de 6 estrellas."},
		{SeriesID: s, SagaID: "black-star", NumberStart: 9, NumberEnd: 9, Title: "¡Atrapados en el planeta magnético!", Villains: []string{"Hermanos Para Para"}, Milestone: "Los Hermanos Para Para roban la esfera de 4 estrellas en un asteroide magnético."},
		{SeriesID: s, SagaID: "black-star", NumberStart: 10, NumberEnd: 10, Title: "¡Baila, baila! ¡Los Hermanos Para Para!", Villains: []string{"Hermanos Para Para"}, Milestone: "El grupo es sometido a la técnica ineludible del Baile Para Para, bailando sin control rumbo al Planeta Luud."},
		{SeriesID: s, SagaID: "black-star", NumberStart: 11, NumberEnd: 11, Title: "La maldición de Luud", Villains: []string{"Mutchy Motchy", "Luud"}, Milestone: "Mutchy convierte a Pan en muñeca y la arroja dentro de la estatua de la deidad Luud."},
		{SeriesID: s, SagaID: "black-star", NumberStart: 12, NumberEnd: 12, Title: "El despertar de Luud", Villains: []string{"Mutchy Motchy", "Luud"}, Milestone: "Goku SSJ1 destruye a Mutchy Motchy; el Cardenal se sacrifica alimentando a Luud, que despierta a su máximo poder."},
		{SeriesID: s, SagaID: "black-star", NumberStart: 13, NumberEnd: 13, Title: "El misterioso científico Myuu", Villains: []string{"Luud", "Dr. Myuu"}, Milestone: "Aparición en sombras del Dr. Myuu. Pan (desde el interior de Luud) y Goku comunican sus mentes con ayuda de Giru."},
		{SeriesID: s, SagaID: "black-star", NumberStart: 14, NumberEnd: 14, Title: "¡La caída de Luud!", Villains: []string{"Luud"}, Milestone: "Goku y Pan disparan simultáneamente al núcleo de Luud. Luud explota liberando a las personas convertidas en muñecos."},
		{SeriesID: s, SagaID: "black-star", NumberStart: 15, NumberEnd: 15, Title: "El berrinche de Pan", Milestone: "Planeta Creem: Pan se separa molesta, sobrevive al ataque de un hormiguero gigante y Goku la rescata, encontrando la esfera de 5 estrellas."},
		{SeriesID: s, SagaID: "black-star", NumberStart: 16, NumberEnd: 16, Title: "¿Giru es un traidor?", Villains: []string{"General Rilldo", "Escuadrón Mega Cannon Sigma"}, Milestone: "Llegada al Planeta Mecánico M2. Giru paraliza a Goku y Trunks y los entrega al General Rilldo."},

		// ── Saga de Baby ──
		{SeriesID: s, SagaID: "baby", NumberStart: 17, NumberEnd: 17, Title: "¡La operación rescate!", Villains: []string{"General Rilldo"}, Milestone: "Pan se infiltra disfrazada de robot en M2. Rilldo convierte el cuerpo de Trunks en un bloque de metal sólido."},
		{SeriesID: s, SagaID: "baby", NumberStart: 18, NumberEnd: 18, Title: "El verdadero poder de Goku", Villains: []string{"Escuadrón Mega Cannon Sigma"}, Milestone: "Goku supera al Escuadrón Mega Cannon Sigma destruyendo sus estructuras fusionadas en Sigma Force Cannon."},
		{SeriesID: s, SagaID: "baby", NumberStart: 19, NumberEnd: 19, Title: "El rival más fuerte, Rilldo", Villains: []string{"Hyper Rilldo"}, Milestone: "Rilldo se combina con las piezas metálicas del planeta convirtiéndose en Hyper Rilldo."},
		{SeriesID: s, SagaID: "baby", NumberStart: 20, NumberEnd: 20, Title: "Un tsunami de metal", Villains: []string{"Metal Rilldo"}, Milestone: "Rilldo convierte el suelo de M2 en metal líquido. Goku y Pan son capturados y convertidos en bloques de metal."},
		{SeriesID: s, SagaID: "baby", NumberStart: 21, NumberEnd: 21, Title: "Goku convertido en metal", Villains: []string{"Dr. Myuu"}, Milestone: "Las placas de Goku, Pan y Trunks son transportadas al laboratorio principal del Dr. Myuu."},
		{SeriesID: s, SagaID: "baby", NumberStart: 22, NumberEnd: 22, Title: "El nacimiento de Baby", Villains: []string{"Baby", "Dr. Myuu"}, Milestone: "Giru revierte la metalización. Baby, un parásito creado con ADN Tsufuru, despierta rabioso, asesina al Dr. Myuu y escapa al espacio."},
		{SeriesID: s, SagaID: "baby", NumberStart: 23, NumberEnd: 23, Title: "La nave naufragada", Villains: []string{"Baby"}, Milestone: "Baby posee cuerpos e intenta poseer a Trunks, que lo repele en SSJ1. Baby huye rumbo a la Tierra."},
		{SeriesID: s, SagaID: "baby", NumberStart: 24, NumberEnd: 24, Title: "¡Objetivo: Los Saiyajin!", Villains: []string{"Baby Goten"}, Milestone: "Baby llega a la Tierra (Año 790) y logra infectar a Goten mediante una cortada."},
		{SeriesID: s, SagaID: "baby", NumberStart: 25, NumberEnd: 25, Title: "Baby aparece en la Tierra", Villains: []string{"Baby Goten", "Baby Gohan"}, Milestone: "Baby se transfiere al cuerpo de Gohan, dejando un huevo parasitario dentro de Goten."},
		{SeriesID: s, SagaID: "baby", NumberStart: 26, NumberEnd: 26, Title: "Gohan vs. Vegeta", Villains: []string{"Baby Gohan", "Baby Vegeta"}, Milestone: "Baby logra ingresar al cuerpo de Vegeta, naciendo Baby Vegeta."},
		{SeriesID: s, SagaID: "baby", NumberStart: 27, NumberEnd: 27, Title: "Goku emboscado", Villains: []string{"Baby Vegeta"}, Milestone: "Baby Vegeta enfrenta a Goku SSJ3, que no sostiene la transformación en cuerpo de niño, y lanza sobre él la Bola de Rencor."},
		{SeriesID: s, SagaID: "baby", NumberStart: 28, NumberEnd: 28, Title: "¿Toda la Tierra es mi enemiga?", Milestone: "Kibitoshin salva a Goku con la Teletransportación, pero caen en la dimensión del Espacio Sugoroku."},
		{SeriesID: s, SagaID: "baby", NumberStart: 29, NumberEnd: 29, Title: "El Espacio Sugoroku", Milestone: "Goku debe ganar un juego de mesa viviente controlado por Sugoro para evitar caer al vacío dimensional."},
		{SeriesID: s, SagaID: "baby", NumberStart: 30, NumberEnd: 30, Title: "Soy el más fuerte", Milestone: "El Espacio Sugoroku colapsa. Kibitoshin rescata a Goku y Sugoro llevándolos al Planeta Kaioshin."},
		{SeriesID: s, SagaID: "baby", NumberStart: 31, NumberEnd: 31, Title: "El colapso de Sugoroku", Milestone: "El Kaioshin Anciano usa tenazas gigantescas para sacarle nuevamente la cola a Goku y que acumule más poder."},
		{SeriesID: s, SagaID: "baby", NumberStart: 32, NumberEnd: 32, Title: "El guerrero Uub", Villains: []string{"Super Baby 1"}, Milestone: "Majin Buu Gordo se fusiona permanentemente con Uub creando a Maji-Uub, que combate a Super Baby 1."},
		{SeriesID: s, SagaID: "baby", NumberStart: 33, NumberEnd: 33, Title: "El rayo del renacido Uub", Villains: []string{"Super Baby 2"}, Milestone: "Goku regresa al recreado Planeta Tsufuru; le crece la cola al máximo y mira la Tierra (que actúa como Luna Llena)."},
		{SeriesID: s, SagaID: "baby", NumberStart: 34, NumberEnd: 34, Title: "El ataque de Goku Oozaru", Villains: []string{"Super Baby 2"}, Milestone: "Goku se transforma en Gran Mono Dorado (Oozaru Dorado) desatando un poder descomunal pero destruyendo todo a ciegas."},
		{SeriesID: s, SagaID: "baby", NumberStart: 35, NumberEnd: 35, Title: "Goku se convierte en Super Saiyajin 4", Villains: []string{"Super Baby 2"}, Milestone: "El amor de Pan hace que Goku recupere la consciencia y comprima el poder salvaje, alcanzando por primera vez el Super Saiyajin 4 (SSJ4)."},
		{SeriesID: s, SagaID: "baby", NumberStart: 36, NumberEnd: 36, Title: "El gigante Oozaru Baby", Villains: []string{"Oozaru Dorado Baby"}, Milestone: "Bulma infectada usa la Máquina de Rayos Blantz sobre Baby Vegeta, convirtiéndolo en un Oozaru Dorado mecánico con control mental."},
		{SeriesID: s, SagaID: "baby", NumberStart: 37, NumberEnd: 37, Title: "¡Doble KO! Goku vs. Baby", Villains: []string{"Oozaru Dorado Baby"}, Milestone: "Batalla campal entre Goku SSJ4 y Oozaru Baby. Ambos caen inconscientes por el agotamiento mutuo de ki."},
		{SeriesID: s, SagaID: "baby", NumberStart: 38, NumberEnd: 38, Title: "El renacer del Super Saiyajin 4", Villains: []string{"Oozaru Dorado Baby"}, Milestone: "Todos otorgan su ki a Goku SSJ4, que le corta la cola a Oozaru Baby de un golpe de ki."},
		{SeriesID: s, SagaID: "baby", NumberStart: 39, NumberEnd: 39, Title: "¡Baby es erradicado!", Villains: []string{"Baby"}, Milestone: "Goku SSJ4 dispara un Kamehameha x10 empujando la nave de Baby directamente hacia el Sol, incinerándolo para siempre."},
		{SeriesID: s, SagaID: "baby", NumberStart: 40, NumberEnd: 40, Title: "La solemne decisión de Piccolo", Milestone: "Piccolo decide quedarse en la Tierra a punto de explotar para que las Esferas de la Estrella Negra desaparezcan para siempre. Las Esferas de Namek restauran la Tierra."},

		// ── Saga de Super Número 17 ──
		{SeriesID: s, SagaID: "super-17", NumberStart: 41, NumberEnd: 41, Title: "¿Quién será el sucesor de Satán?", Milestone: "29º Torneo de Artes Marciales. Maji-Uub llega a la final con Mr. Satán y deja ganar a Satán a pedido de Majin Buu desde su interior."},
		{SeriesID: s, SagaID: "super-17", NumberStart: 42, NumberEnd: 42, Title: "Los enemigos resucitan en el Infierno", Villains: []string{"Dr. Gero", "Dr. Myuu"}, Milestone: "Gero y Myuu crean a Hell 17 y abren un agujero dimensional; villanos del pasado invaden la Tierra. Goku viaja al Infierno."},
		{SeriesID: s, SagaID: "super-17", NumberStart: 43, NumberEnd: 43, Title: "El regreso de Cell y Freezer", Villains: []string{"Cell", "Freezer"}, Milestone: "Goku es encerrado en el Infierno por Cell y Freezer, pero usa las técnicas heladas del Infierno contra ellos congelándolos."},
		{SeriesID: s, SagaID: "super-17", NumberStart: 44, NumberEnd: 44, Title: "La fusión de los dos N°17", Villains: []string{"Hell 17", "Super 17"}, Milestone: "N°17 terrestre asesina a Krillin; Hell 17 y N°17 se fusionan creando a Super Número 17."},
		{SeriesID: s, SagaID: "super-17", NumberStart: 45, NumberEnd: 45, Title: "La operación rescate del Infierno", Villains: []string{"Super 17"}, Milestone: "Piccolo (Infierno) y Dende (Tierra) coordinan ondas de ki abriendo el portal para liberar a Goku."},
		{SeriesID: s, SagaID: "super-17", NumberStart: 46, NumberEnd: 46, Title: "Super Saiyajin 4 vs. Super 17", Villains: []string{"Super 17"}, Milestone: "Goku descubre que Super 17 absorbe cualquier ataque de ki haciéndose más poderoso."},
		{SeriesID: s, SagaID: "super-17", NumberStart: 47, NumberEnd: 47, Title: "El ataque combinado de Goku y N°18", Villains: []string{"Super 17"}, Milestone: "Goku atraviesa a Super 17 con el Puño del Dragón (Ryūken) y lo destruye con un Kamehameha triple."},

		// ── Saga de los Dragones Malignos ──
		{SeriesID: s, SagaID: "shadow-dragons", NumberStart: 48, NumberEnd: 48, Title: "Aparecen los Dragones Sombríos", Villains: []string{"Kokuryu (Dragón Negro)"}, Milestone: "El uso excesivo de las esferas durante 40 años engendró 7 Dragones Malignos nacidos de la energía negativa acumulada."},
		{SeriesID: s, SagaID: "shadow-dragons", NumberStart: 49, NumberEnd: 49, Title: "El dragón venenoso Ryan Shenron", Villains: []string{"Ryan Shenron"}, Milestone: "Nacido del deseo de revivir a Bora. Pan lo arroja a un manantial de agua pura y lo destruyen con un Kamehameha combinado."},
		{SeriesID: s, SagaID: "shadow-dragons", NumberStart: 50, NumberEnd: 50, Title: "Uu Shenron, el dragón de la electricidad", Villains: []string{"Uu Shenron"}, Milestone: "Nacido del deseo de revivir a Goku. Una lluvia repentina cortocircuita su cuerpo y Goku lo destruye con un Kamehameha."},
		{SeriesID: s, SagaID: "shadow-dragons", NumberStart: 51, NumberEnd: 51, Title: "Ryu Shenron y el punto débil de la princesa", Villains: []string{"Ryu Shenron"}, Milestone: "Nacida del deseo de Oolong. Adopta la forma de una diosa del viento; su punto débil es la gema de su cabeza."},
		{SeriesID: s, SagaID: "shadow-dragons", NumberStart: 52, NumberEnd: 52, Title: "La posesión de Chuu Shenron", Villains: []string{"Chuu Shenron"}, Milestone: "Nacido del deseo de revivir a las víctimas de Majin Vegeta. Absorbe el cuerpo de Pan convirtiéndose en un monstruo gigante."},
		{SeriesID: s, SagaID: "shadow-dragons", NumberStart: 53, NumberEnd: 53, Title: "Las lágrimas de Goku", Villains: []string{"Chuu Shenron"}, Milestone: "Goku rescata a Pan del cuerpo del dragón y destruye a Chuu Shenron con un Kamehameha x10."},
		{SeriesID: s, SagaID: "shadow-dragons", NumberStart: 54, NumberEnd: 54, Title: "Suu Shenron, el dragón de fuego", Villains: []string{"Suu Shenron"}, Milestone: "Nacido del deseo de devolver la juventud a Piccolo Daimaoh. Mantiene un duelo de honor marcial contra Goku SSJ4."},
		{SeriesID: s, SagaID: "shadow-dragons", NumberStart: 55, NumberEnd: 55, Title: "Aparece San Shenron", Villains: []string{"San Shenron"}, Milestone: "Hermano gemelo congelante de Suu Shenron. Interrumpe el duelo congelando a Pan y usándola de escudo."},
		{SeriesID: s, SagaID: "shadow-dragons", NumberStart: 56, NumberEnd: 56, Title: "Los dragones de fuego y hielo", Villains: []string{"San Shenron", "Syn Shenron"}, Milestone: "Goku SSJ4 atraviesa a San Shenron con el Puño del Dragón; aparece Syn Shenron y asesina a Suu Shenron por la espalda."},
		{SeriesID: s, SagaID: "shadow-dragons", NumberStart: 57, NumberEnd: 57, Title: "Syn Shenron, el dragón de sombra", Villains: []string{"Syn Shenron"}, Milestone: "Goku combate ciego contra Syn Shenron, de poder físico muy superior. Trunks, Goten y Gohan llegan a defenderlo."},
		{SeriesID: s, SagaID: "shadow-dragons", NumberStart: 58, NumberEnd: 58, Title: "Transcendiendo el Super Saiyajin 4", Villains: []string{"Omega Shenron"}, Milestone: "Syn Shenron se traga las 6 esferas corrompidas transformándose en Omega Shenron, con las habilidades de los 7 dragones."},
		{SeriesID: s, SagaID: "shadow-dragons", NumberStart: 59, NumberEnd: 59, Title: "El alboroto de Vegeta Oozaru", Villains: []string{"Omega Shenron"}, Milestone: "Vegeta se transforma en Oozaru Dorado y comprime el poder para alcanzar por primera vez el Super Saiyajin 4."},
		{SeriesID: s, SagaID: "shadow-dragons", NumberStart: 60, NumberEnd: 60, Title: "¡El invencible Gogeta SSJ4!", Villains: []string{"Omega Shenron"}, Milestone: "Goku y Vegeta SSJ4 crean a Gogeta Super Saiyajin 4, que humilla a Omega Shenron, pero la fusión se deshace a los 10 minutos."},
		{SeriesID: s, SagaID: "shadow-dragons", NumberStart: 61, NumberEnd: 61, Title: "Goku se traga la esfera de 4 estrellas", Villains: []string{"Omega Shenron"}, Milestone: "Goku se traga la esfera de 4 estrellas para evitar que Omega Shenron la absorba."},
		{SeriesID: s, SagaID: "shadow-dragons", NumberStart: 62, NumberEnd: 62, Title: "El último aliado", Villains: []string{"Omega Shenron", "Suu Shenron"}, Milestone: "La esfera de 4 estrellas renace a Suu Shenron purificado, que intenta autodestruirse con Omega, pero este cambia de cuerpo a tiempo."},
		{SeriesID: s, SagaID: "shadow-dragons", NumberStart: 63, NumberEnd: 63, Title: "Goku pide ayuda al universo", Villains: []string{"Omega Shenron"}, Milestone: "Goku sostiene la Genkidama Universal Galáctica nutrida con la energía de todo el cosmos y desintegra a Omega Shenron para siempre."},
		{SeriesID: s, SagaID: "shadow-dragons", NumberStart: 64, NumberEnd: 64, Title: "Adiós Goku... Hasta que nos volvamos a encontrar", Milestone: "Año 789: Goku sube al lomo del Shenlong original; las 7 esferas se absorben en su cuerpo y se marcha. Pan conserva su vestimenta como recuerdo."},
		{SeriesID: s, SagaID: "shadow-dragons", NumberStart: 65, NumberEnd: 65, Title: "TV Special: 100 Años Después / A Hero's Legacy", Milestone: "Año 889: una anciana Pan es la única Guerrera Z viva. Su nieto Goku Jr. despierta el Super Saiyajin y combate a Vegeta Jr. en el 64º Torneo, mientras el espíritu de Goku observa."},
	}
}
