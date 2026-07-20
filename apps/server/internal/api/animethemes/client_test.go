package animethemes

import "testing"

func TestIsDubGroup(t *testing.T) {
	cases := []struct {
		name  string
		group *apiGroup
		want  bool
	}{
		{"nil (original)", nil, false},
		{"english by slug", &apiGroup{Name: "English Version", Slug: "EN"}, true},
		{"4kids by slug", &apiGroup{Name: "English Version - 4Kids", Slug: "EN4Kids"}, true},
		{"korean by slug", &apiGroup{Name: "Korean Version", Slug: "KO"}, true},
		{"chinese by slug", &apiGroup{Name: "Chinese Version", Slug: "CN"}, true},
		// Idioma no listado en el set de slugs: cae al hint por nombre.
		{"spanish by name", &apiGroup{Name: "Latin-American Spanish Dub", Slug: "ES"}, true},
		{"german by name", &apiGroup{Name: "German Version", Slug: "DE"}, true},
		// Grupos que NO son dubs: mismo idioma, otro máster/broadcast.
		{"tv version", &apiGroup{Name: "TV Version", Slug: "TV"}, false},
		{"bd version", &apiGroup{Name: "BD Version", Slug: "BD"}, false},
		{"hd remaster", &apiGroup{Name: "HD Remaster", Slug: "HD"}, false},
		{"sound renewal", &apiGroup{Name: "Sound Renewal", Slug: "SoundRenewal"}, false},
	}
	for _, c := range cases {
		if got := isDubGroup(c.group); got != c.want {
			t.Errorf("isDubGroup(%+v) = %v, want %v", c.group, got, c.want)
		}
	}
}

func TestFlattenThemes(t *testing.T) {
	audio := func(link string) []apiVideo {
		return []apiVideo{{Audio: &apiAudio{Link: link}}}
	}

	parsed := apiResponse{Anime: []apiAnime{{
		Name: "Test",
		AnimeThemes: []apiTheme{
			{Slug: "OP1", Type: "OP", Group: nil, Entries: []apiEntry{
				{Episodes: "1-12", Version: 1, Videos: audio("https://a/op1v1.ogg")},
				{Episodes: "1-12", Version: 2, Videos: audio("https://a/op1v2.ogg")},
			}},
			// Dub: debe descartarse por completo aunque tenga audio.
			{Slug: "OP1", Type: "OP", Group: &apiGroup{Name: "English Version", Slug: "EN"}, Entries: []apiEntry{
				{Episodes: "1-12", Version: 1, Videos: audio("https://a/op1-en.ogg")},
			}},
			// Re-máster (mismo idioma): se conserva.
			{Slug: "ED1", Type: "ED", Group: &apiGroup{Name: "BD Version", Slug: "BD"}, Entries: []apiEntry{
				{Episodes: "1-12", Version: 1, Videos: audio("https://a/ed1-bd.ogg")},
			}},
			// Entry sin audio: se descarta.
			{Slug: "ED2", Type: "ED", Group: nil, Entries: []apiEntry{
				{Episodes: "13", Version: 1, Videos: []apiVideo{{Audio: nil}}},
			}},
		},
	}}}

	got := flattenThemes(parsed)

	// Esperados: OP1 v1, OP1 v2 (originales) + ED1-BD. NO el dub EN ni el ED2 sin audio.
	if len(got) != 3 {
		t.Fatalf("flattenThemes devolvió %d themes, want 3: %+v", len(got), got)
	}
	for _, th := range got {
		if th.AudioURL == "https://a/op1-en.ogg" {
			t.Errorf("el dub (English Version) no debería haber pasado el filtro")
		}
		if th.AudioURL == "" {
			t.Errorf("no debería haber themes sin AudioURL")
		}
	}
}

func TestFlattenThemesEmpty(t *testing.T) {
	if got := flattenThemes(apiResponse{}); got != nil {
		t.Errorf("flattenThemes(vacío) = %+v, want nil", got)
	}
}
