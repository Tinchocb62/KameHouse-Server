package repository

import "kamehouse/internal/api/dragonball/domain"

func daimaSeries() domain.Series {
	return domain.Series{
		ID:           "daima",
		Title:        "Dragon Ball Daima",
		TMDBID:       236994,
		Year:         "2024–2025",
		EpisodeCount: 20,
		Canon:        true,
		Studio:       "Toei Animation",
		Description:  "Última obra supervisada por Akira Toriyama: tras Majin Buu, el Rey Gomah convierte a Goku y a los Guerreros Z en niños (versiones Mini) y estos viajan al Reino Demoníaco a reunir las Esferas Demoníacas.",
		SagaIDs:      []string{"daima-misterio", "daima-travesia"},
	}
}

func daimaSagas() []domain.Saga {
	return []domain.Saga{
		{ID: "daima-misterio", SeriesID: "daima", Name: "El Misterio del Mundo Demonio", StartEp: 1, EndEp: 10, Order: 1},
		{ID: "daima-travesia", SeriesID: "daima", Name: "La Travesía en el Mundo Demonio", StartEp: 11, EndEp: 20, Order: 2},
	}
}

func daimaEpisodes() []domain.Episode {
	s := "daima"
	return []domain.Episode{
		// ── El Misterio del Mundo Demonio ──
		{SeriesID: s, SagaID: "daima-misterio", NumberStart: 1, NumberEnd: 1, Title: "Conspiración", Villains: []string{"Rey Gomah", "Degesu"}, Milestone: "Gomah viaja a la Tierra y pide a Shenlong convertir a Goku y a todos los que combatieron contra Buu en niños (versiones Mini)."},
		{SeriesID: s, SagaID: "daima-misterio", NumberStart: 2, NumberEnd: 2, Title: "Glorio", Villains: []string{"Rey Gomah", "Glorio"}, Milestone: "Goku Mini recupera el Báculo Sagrado (Nyoibo) en la Kame House y conoce a Glorio, piloto del Tercer Reino Demoníaco."},
		{SeriesID: s, SagaID: "daima-misterio", NumberStart: 3, NumberEnd: 3, Title: "Viaje", Villains: []string{"Criaturas interdimensionales"}, Milestone: "Goku Mini, Shin Mini y Glorio cruzan el portal Warp Hole ingresando al Reino Demoníaco (Demon Realm)."},
		{SeriesID: s, SagaID: "daima-misterio", NumberStart: 4, NumberEnd: 4, Title: "Tecnociudad", Villains: []string{"Oficiales demoníacos de aduana"}, Milestone: "Llegada al Tercer Mundo Demoníaco; Goku debe adaptarse a la densidad del aire pesado del reino."},
		{SeriesID: s, SagaID: "daima-misterio", NumberStart: 5, NumberEnd: 5, Title: "Panzy", Villains: []string{"Guardia Real Demoníaca"}, Milestone: "Conocen a la princesa demonio Panzy (hija del Rey Kadam), que se une a la expedición como mecánica e instructora geográfica."},
		{SeriesID: s, SagaID: "daima-misterio", NumberStart: 6, NumberEnd: 6, Title: "El Primer Tamagami", Villains: []string{"Tamagami N°1"}, Milestone: "Primer combate contra un Tamagami; Goku Mini usa el Báculo Sagrado para compensar la falta de alcance y obtienen la esfera de 1 estrella."},
		{SeriesID: s, SagaID: "daima-misterio", NumberStart: 7, NumberEnd: 7, Title: "Las Regiones Demoníacas", Villains: []string{"Dra. Arinsu"}, Milestone: "Desglose de las 3 regiones del Reino Demoníaco y revelación del origen demoníaco de la raza Glind (los Supremos Kaioshin)."},
		{SeriesID: s, SagaID: "daima-misterio", NumberStart: 8, NumberEnd: 8, Title: "El Palacio de Gomah", Villains: []string{"Rey Gomah", "Degesu"}, Milestone: "Infiltración espía cerca del Castillo del Primer Mundo Demoníaco; revelación de los planes secretos de la Dra. Arinsu."},
		{SeriesID: s, SagaID: "daima-misterio", NumberStart: 9, NumberEnd: 9, Title: "Tamagami 2", Villains: []string{"Tamagami N°2"}, Milestone: "Goku Mini muestra por primera vez el Super Saiyajin 1 Mini (SSJ1 Mini) adaptado a su cuerpo infantil para quebrar la coraza mística."},
		{SeriesID: s, SagaID: "daima-misterio", NumberStart: 10, NumberEnd: 10, Title: "La Verdad sobre Glorio", Villains: []string{"Glorio"}, Milestone: "Se revela la verdadera lealtad de Glorio hacia los gobernantes de su mundo natal; tensión dramática mediada por Panzy."},

		// ── La Travesía en el Mundo Demonio ──
		{SeriesID: s, SagaID: "daima-travesia", NumberStart: 11, NumberEnd: 11, Title: "El Reencuentro con Vegeta Mini", Villains: []string{"Tropa demoníaca de asalto"}, Milestone: "Vegeta Mini, Piccolo Mini y Bulma Mini ingresan al Reino Demoníaco tras reparar un segundo portal temporal."},
		{SeriesID: s, SagaID: "daima-travesia", NumberStart: 12, NumberEnd: 12, Title: "Tamagami 3", Villains: []string{"Tamagami N°3"}, Milestone: "Batalla combinada de Goku SSJ Mini y Vegeta SSJ Mini contra el tercer Tamagami, obteniendo la última esfera demoníaca."},
		{SeriesID: s, SagaID: "daima-travesia", NumberStart: 13, NumberEnd: 13, Title: "El Plan de Arinsu", Villains: []string{"Dra. Arinsu"}, Milestone: "La Dra. Arinsu intenta interceptar las esferas reunidas para usurpar el trono del Reino Demoníaco mediante manipulación biológica."},
		{SeriesID: s, SagaID: "daima-travesia", NumberStart: 14, NumberEnd: 14, Title: "La Dimensión Oscura", Milestone: "Incursión en la dimensión profunda del Reino Demoníaco; revelación de la historia de Rymus (El Super Majin) y las leyes primordiales de la magia."},
		{SeriesID: s, SagaID: "daima-travesia", NumberStart: 15, NumberEnd: 15, Title: "Confrontación Real", Villains: []string{"Rey Gomah", "Guardia de Élite Demoníaca"}, Milestone: "Goku Mini y Vegeta Mini irrumpen en el Palacio Real de Gomah derrotando a sus comandantes principales."},
		{SeriesID: s, SagaID: "daima-travesia", NumberStart: 16, NumberEnd: 16, Title: "El Despertar de Gomah", Villains: []string{"Rey Gomah"}, Milestone: "El Rey Gomah absorbe un relicario de magia prohibida demoníaca aumentando de tamaño y poder físico."},
		{SeriesID: s, SagaID: "daima-travesia", NumberStart: 17, NumberEnd: 17, Title: "Super Saiyajin en el Reino Demoníaco", Villains: []string{"Rey Gomah", "Degesu"}, Milestone: "Goku Mini y Vegeta Mini despliegan el Super Saiyajin 2 Mini (SSJ2 Mini) combinando ataques a alta velocidad con el Báculo Sagrado."},
		{SeriesID: s, SagaID: "daima-travesia", NumberStart: 18, NumberEnd: 18, Title: "La Caída del Trono", Villains: []string{"Rey Gomah", "Degesu"}, Milestone: "Derrota definitiva del Rey Gomah y Degesu; Glorio y la Princesa Panzy asumen el compromiso de restaurar la paz en los 3 Mundos Demoníacos."},
		{SeriesID: s, SagaID: "daima-travesia", NumberStart: 19, NumberEnd: 19, Title: "El Deseo de Regreso", Milestone: "Invocación del Dragón Demoníaco; Goku, Vegeta, Piccolo y los Guerreros Z son restaurados a sus formas humanas y adultas originales."},
		{SeriesID: s, SagaID: "daima-travesia", NumberStart: 20, NumberEnd: 20, Title: "Un Nuevo Horizonte", Milestone: "Despedida de Panzy y Glorio; retorno de Goku y sus amigos a la Tierra, estableciendo un puente permanente de paz entre la Tierra y el Reino Demoníaco."},
	}
}
