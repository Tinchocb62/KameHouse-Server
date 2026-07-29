package repository

import "kamehouse/internal/api/dragonball/domain"

// milestones es el catálogo curado de hitos narrativos clave de la franquicia,
// clasificados explícitamente por tipo para permitir el filtrado
// (transformation, sacrifice, wish, death, event). A diferencia del campo
// Milestone de cada episodio (texto libre), esta lista destaca los momentos más
// significativos con una categoría estable.
func milestones() []domain.Milestone {
	return []domain.Milestone{
		// ── Transformaciones ──
		{Type: domain.MilestoneTransformation, SeriesID: "classic", Episode: 13, Title: "Primer Oozaru de Goku", Description: "Goku observa la Luna Llena y se transforma por primera vez en Gran Mono (Oozaru), destruyendo el castillo de Pilaf."},
		{Type: domain.MilestoneTransformation, SeriesID: "z", Episode: 95, Title: "Despertar del Super Saiyajin", Description: "La rabia por la muerte de Krillin desata el legendario Super Saiyajin (SSJ1) en Goku frente a Freezer."},
		{Type: domain.MilestoneTransformation, SeriesID: "z", Episode: 184, Title: "Super Saiyajin 2", Description: "La muerte del N°16 detona la eclosión del Super Saiyajin 2 (SSJ2) en Gohan durante los Juegos de Cell."},
		{Type: domain.MilestoneTransformation, SeriesID: "z", Episode: 245, Title: "Super Saiyajin 3", Description: "Goku debuta el Super Saiyajin 3 (SSJ3) contra Majin Buu."},
		{Type: domain.MilestoneTransformation, SeriesID: "z", Episode: 268, Title: "Nacimiento de Vegetto", Description: "Goku y Vegeta se fusionan por primera vez usando los Pendientes Pothala para crear a Vegetto."},
		{Type: domain.MilestoneTransformation, SeriesID: "gt", Episode: 35, Title: "Super Saiyajin 4 de Goku", Description: "El amor de Pan hace que Goku comprima el poder del Oozaru Dorado, alcanzando por primera vez el Super Saiyajin 4."},
		{Type: domain.MilestoneTransformation, SeriesID: "gt", Episode: 59, Title: "Super Saiyajin 4 de Vegeta", Description: "Vegeta alcanza el Super Saiyajin 4 tras recibir ondas de la Máquina de Rayos Blantz creada por Bulma."},
		{Type: domain.MilestoneTransformation, SeriesID: "super", Episode: 9, Title: "Super Saiyajin Dios", Description: "El ritual de los 6 Saiyajin puros desata el Super Saiyajin Dios (aura roja)."},
		{Type: domain.MilestoneTransformation, SeriesID: "super", Episode: 25, Title: "Super Saiyajin Blue", Description: "Goku muestra el Super Saiyajin Blue (SSJ Dios SSJ) frente a Golden Freezer."},
		{Type: domain.MilestoneTransformation, SeriesID: "super", Episode: 56, Title: "Super Saiyajin Rosé", Description: "Goku Black revela la transformación Super Saiyajin Rosé."},
		{Type: domain.MilestoneTransformation, SeriesID: "super", Episode: 110, Title: "Ultra Instinto Incompleto", Description: "Goku emerge de la explosión de su Genkidama desatando el Ultra Instinto Incompleto (Señal)."},
		{Type: domain.MilestoneTransformation, SeriesID: "super", Episode: 123, Title: "Super Saiyajin Blue Evolution", Description: "Vegeta rompe sus límites frente a Jiren despertando el Super Saiyajin Blue Evolution."},
		{Type: domain.MilestoneTransformation, SeriesID: "super", Episode: 129, Title: "Ultra Instinto Dominado", Description: "Goku domina por completo la Doctrina del Juicio (Ultra Instinto Dominado, pelo plateado)."},
		{Type: domain.MilestoneTransformation, SeriesID: "daima", Episode: 9, Title: "Super Saiyajin Mini", Description: "Goku Mini despliega por primera vez el Super Saiyajin adaptado a su cuerpo infantil contra el Tamagami N°2."},

		// ── Sacrificios ──
		{Type: domain.MilestoneSacrifice, SeriesID: "z", Episode: 25, Title: "Sacrificio de Piccolo", Description: "Piccolo recibe el rayo de Nappa para proteger a Gohan, muriendo (y con él Kami-sama)."},
		{Type: domain.MilestoneSacrifice, SeriesID: "z", Episode: 188, Title: "Sacrificio de Goku ante Cell", Description: "Goku se teletransporta con Cell al planeta de Kaio-sama para contener su autodestrucción."},
		{Type: domain.MilestoneSacrifice, SeriesID: "z", Episode: 237, Title: "Explosión Final de Vegeta", Description: "Majin Vegeta se autodestruye en un intento de acabar con Majin Buu."},
		{Type: domain.MilestoneSacrifice, SeriesID: "gt", Episode: 40, Title: "Sacrificio de Piccolo en la Tierra", Description: "Piccolo decide morir con la Tierra para que las Esferas de la Estrella Negra desaparezcan para siempre."},
		{Type: domain.MilestoneSacrifice, SeriesID: "super", Episode: 23, Title: "Sacrificio de Piccolo ante Freezer", Description: "Piccolo recibe el rayo mortal de Freezer dirigido a Gohan."},
		{Type: domain.MilestoneSacrifice, SeriesID: "super", Episode: 106, Title: "Sacrificio de Tien Shinhan", Description: "Tien se sacrifica eliminando al francotirador Hermila en el Torneo del Poder."},
		{Type: domain.MilestoneSacrifice, SeriesID: "super", Episode: 124, Title: "Sacrificio de Gohan", Description: "Gohan inmoviliza a Dyspo y pide ser sacado del ring junto a él."},
		{Type: domain.MilestoneSacrifice, SeriesID: "super", Episode: 127, Title: "Sacrificio del Androide 17", Description: "A17 crea barreras de ki para proteger a Goku y Vegeta de un ataque mortal de Jiren."},

		// ── Deseos ──
		{Type: domain.MilestoneWish, SeriesID: "classic", Episode: 12, Title: "El primer deseo de la franquicia", Description: "Oolong se anticipa a Pilaf y pide un panty a Shenlong, frustrando la conquista mundial."},
		{Type: domain.MilestoneWish, SeriesID: "z", Episode: 21, Title: "Resurrección de Goku", Description: "Shenlong revive a Goku para enfrentar a Vegeta y Nappa."},
		{Type: domain.MilestoneWish, SeriesID: "super", Episode: 41, Title: "Deseo a Super Shenlong", Description: "Con las Súper Esferas del Dragón, Bills pide restaurar la Tierra del Universo 6."},
		{Type: domain.MilestoneWish, SeriesID: "super", Episode: 131, Title: "Restauración del Multiverso", Description: "A17 pide a Super Shenlong restaurar todos los universos borrados durante el Torneo del Poder."},
		{Type: domain.MilestoneWish, SeriesID: "daima", Episode: 19, Title: "Deseo con las Esferas Demoníacas", Description: "El Dragón Demoníaco restaura a Goku y los Guerreros Z a sus formas adultas originales."},

		// ── Muertes relevantes ──
		{Type: domain.MilestoneDeath, SeriesID: "z", Episode: 5, Title: "Muerte de Goku y Raditz", Description: "Piccolo atraviesa a ambos con el Makankosappo, matando a Goku y a su hermano Raditz."},
		{Type: domain.MilestoneDeath, SeriesID: "z", Episode: 23, Title: "Muerte de Tien y Chaoz", Description: "Chaoz se autodestruye sin éxito y Tien cae ante Nappa con un último Kikoho."},
		{Type: domain.MilestoneDeath, SeriesID: "classic", Episode: 102, Title: "Muerte de Krillin", Description: "El demonio Tambourine asesina a Krillin, la primera gran tragedia de la franquicia."},
		{Type: domain.MilestoneDeath, SeriesID: "super", Episode: 27, Title: "Muerte definitiva de Freezer", Description: "Tras el rebobinado temporal de Whis, Goku elimina a Golden Freezer con un Kamehameha."},

		// ── Eventos de lore ──
		{Type: domain.MilestoneEvent, SeriesID: "classic", Episode: 8, Title: "Primer Kamehameha de Goku", Description: "El Maestro Roshi usa el Kamehameha Máximo Poder para apagar el fuego del Monte Frypan y Goku lo imita instantáneamente."},
		{Type: domain.MilestoneEvent, SeriesID: "z", Episode: 291, Title: "Encuentro con Uub y partida de Goku", Description: "Goku enfrenta a Uub en la primera ronda del 28° Torneo y parte a su aldea natal a entrenarlo como el protector del mundo."},
		{Type: domain.MilestoneEvent, SeriesID: "super", Episode: 14, Title: "Revelación del Multiverso", Description: "Bills revela la existencia de un multiverso de 12 universos."},
		{Type: domain.MilestoneEvent, SeriesID: "super", Episode: 78, Title: "Regla de borrado del Torneo del Poder", Description: "Zeno-sama establece que los universos perdedores serán borrados de la existencia."},
		{Type: domain.MilestoneEvent, SeriesID: "gt", Episode: 48, Title: "Origen de los Dragones Malignos", Description: "El uso excesivo de las esferas durante 40 años engendró 7 Dragones Malignos de energía negativa."},
		{Type: domain.MilestoneEvent, SeriesID: "daima", Episode: 1, Title: "La maldición de los niños", Description: "El Rey Gomah pide a Shenlong convertir a Goku y a los Guerreros Z en niños (versiones Mini)."},
	}
}
