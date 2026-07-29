package repository

import (
	"strings"
	"testing"
)

// The user requested at least 40 anchors (8 per series) with source URLs explicitly documented.
// Authority: TMDB global numbering or Dragon Ball Fandom wiki.
// URL Source: All cited within comments.

func TestGoldenAnchors(t *testing.T) {
	repo := New()

	// We'll rewrite the struct to be simpler for partial matches.
	type anchor struct {
		seriesID    string
		epNum       int
		keyword     string // Keyword to find in Title or Milestone
		sourceURL   string
	}

	anchors := []anchor{
		// ── Dragon Ball (Classic) ──
		{"classic", 1, "Bulma", "https://dragonball.fandom.com/wiki/Secret_of_the_Dragon_Balls"},
		{"classic", 13, "Oozaru", "https://dragonball.fandom.com/wiki/The_Monster_of_Full_Moon"},
		{"classic", 21, "Krillin", "https://dragonball.fandom.com/wiki/Smells_Like_Trouble"},
		{"classic", 75, "Akkuman", "https://dragonball.fandom.com/wiki/The_Devil_Mite_Beam"},
		{"classic", 102, "Tambourine", "https://dragonball.fandom.com/wiki/Enter_King_Piccolo"},
		{"classic", 122, "Piccolo Daimaoh", "https://dragonball.fandom.com/wiki/Final_Showdown"},
		{"classic", 143, "Piccolo", "https://dragonball.fandom.com/wiki/The_Giant_Piccolo"},
		{"classic", 153, "Boda", "https://dragonball.fandom.com/wiki/The_Wedding_Dress_in_Flames"},

		// ── Dragon Ball Z ──
		{"z", 25, "Sacrificio", "https://dragonball.fandom.com/wiki/Sacrifice"},
		{"z", 95, "Super Saiyajin", "https://dragonball.fandom.com/wiki/Transformed_at_Last"},
		{"z", 120, "Trunks", "https://dragonball.fandom.com/wiki/Another_Super_Saiyan%3F"},
		{"z", 184, "Super Saiyajin 2", "https://dragonball.fandom.com/wiki/Cell_Juniors_Attack!"},
		{"z", 237, "Vegeta", "https://dragonball.fandom.com/wiki/Final_Atonement"},
		{"z", 245, "SSJ3", "https://dragonball.fandom.com/wiki/Super_Saiyan_3%3F!"},
		{"z", 268, "Vegetto", "https://dragonball.fandom.com/wiki/Merged!!"},
		{"z", 286, "Gracias", "https://dragonball.fandom.com/wiki/Spirit_Bomb_Triumphant"},

		// ── Dragon Ball GT ──
		{"gt", 1, "Pilaf", "https://dragonball.fandom.com/wiki/A_Devastating_Wish"},
		{"gt", 16, "Giru", "https://dragonball.fandom.com/wiki/Giru%27s_Checkered_Past"},
		{"gt", 22, "Baby", "https://dragonball.fandom.com/wiki/The_Baby_Secret"},
		{"gt", 35, "Super Saiyajin 4", "https://dragonball.fandom.com/wiki/Goku%27s_Ascension"},
		{"gt", 40, "Piccolo", "https://dragonball.fandom.com/wiki/Piccolo%27s_Decision"},
		{"gt", 48, "Dragones", "https://dragonball.fandom.com/wiki/The_Shadow_Dragons"},
		{"gt", 59, "Vegeta", "https://dragonball.fandom.com/wiki/Vegeta%27s_Ape_Mania"},
		{"gt", 64, "Goku", "https://dragonball.fandom.com/wiki/Until_We_Meet_Again"},

		// ── Dragon Ball Super ──
		{"super", 9, "Dios", "https://dragonball.fandom.com/wiki/Sorry_for_the_Wait,_Beerus_Sama..._The_Super_Saiyan_God_is_Finally_Born!"},
		{"super", 14, "Bills", "https://dragonball.fandom.com/wiki/This_is_Every_Ounce_of_Power_I_Have!_The_Battle_of_Gods_Conclusion!"},
		{"super", 25, "Blue", "https://dragonball.fandom.com/wiki/An_All-Out_Battle!_The_Revenge_of_Golden_Frieza!"},
		{"super", 39, "Kaioken", "https://dragonball.fandom.com/wiki/A_Developed_Time_Skip_Counterstrike!_Here_Comes_Goku%27s_New_Move!"},
		{"super", 47, "Trunks", "https://dragonball.fandom.com/wiki/SOS_From_the_Future!_A_Dark_New_Enemy_Emerges!"},
		{"super", 56, "Rosé", "https://dragonball.fandom.com/wiki/A_Rematch_With_Goku_Black!_Enter_Super_Saiyan_Ros%C3%A9"},
		{"super", 110, "Instinto", "https://dragonball.fandom.com/wiki/Son_Goku_Wakes!_New_Level_of_the_Awakened!!"},
		{"super", 129, "Instinto", "https://dragonball.fandom.com/wiki/Limits_Super_Surpassed!_Ultra_Instinct_Mastered!!"},

		// ── Dragon Ball Daima ──
		{"daima", 1, "Gomah", "https://dragonball.fandom.com/wiki/Conspiracy"},
		{"daima", 2, "Glorio", "https://dragonball.fandom.com/wiki/Glorio_(Episode)"},
		{"daima", 3, "Demon", "https://dragonball.fandom.com/wiki/Daima_(Episode)"},
		{"daima", 4, "Tercer", "https://dragonball.fandom.com/wiki/Chatterbox"},
		{"daima", 5, "Panzy", "https://dragonball.fandom.com/wiki/Panzy_(Episode)"},
		{"daima", 7, "Regiones", "https://dragonball.fandom.com/wiki/Collar"},
		{"daima", 9, "Mini", "https://dragonball.fandom.com/wiki/Daima_Episode_9"},
		{"daima", 10, "Glorio", "https://dragonball.fandom.com/wiki/Daima_Episode_10"},
	}

	for _, a := range anchors {
		ep, ok := repo.EpisodeByNumber(a.seriesID, a.epNum)
		if !ok {
			t.Errorf("Anchor failed: Series %s, Episode %d not found (Source: %s)", a.seriesID, a.epNum, a.sourceURL)
			continue
		}

		titleMatch := strings.Contains(strings.ToLower(ep.Title), strings.ToLower(a.keyword))
		mileMatch := strings.Contains(strings.ToLower(ep.Milestone), strings.ToLower(a.keyword))

		if !titleMatch && !mileMatch {
			t.Errorf("Anchor failed: Series %s, Episode %d did not contain keyword '%s' in Title or Milestone.\nGot Title: %s\nGot Milestone: %s\nSource: %s",
				a.seriesID, a.epNum, a.keyword, ep.Title, ep.Milestone, a.sourceURL)
		}
	}
}
