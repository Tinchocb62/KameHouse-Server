package skipdetect

// Theme es un opening/ending oficial de una serie según AnimeThemes.moe. Vive en
// este paquete (no en api/animethemes) para que el cliente concreto lo produzca
// sin que skipdetect dependa del paquete HTTP: skipdetect define el contrato,
// api/animethemes lo implementa.
type Theme struct {
	Slug     string // "OP1", "OP2", "ED1"...
	Type     string // "OP" | "ED"
	Sequence int
	// Episodes es la lista de rangos de episodios a los que aplica el theme,
	// tal como los expone AnimeThemes ("1-12", "1, 3-5", "" = todos).
	Episodes string
	AudioURL string // link al audio (.ogg) del theme
}
