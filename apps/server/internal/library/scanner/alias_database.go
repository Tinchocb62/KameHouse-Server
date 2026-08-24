package scanner

import (
	"regexp"
	"strings"
)

// customIDOverrides maps normalized fan-edit/custom release titles directly to Platform IDs.
// Matched titles short-circuit the Bayesian engine and skip external API calls entirely.
var customIDOverrides = map[string]int{
	// Dragon Ball GT
	"dragon ball gt": 12697,
	"dragon ball z":  12971,
	"dragon ball":    12609,
	"dragon ball super": 62715,
	"dragon ball daima": 236994,
	"dragon ball kai": 61709,
	"dragon ball z kai": 61709,
}

// reFanEditTokens strips fan-edit markers (release groups, saga labels) from titles
// so the core title remains clean for Dice/Bayesian matching.
// Pre-compiled at init to avoid per-file allocation.
var reFanEditTokens = regexp.MustCompile(`(?i)\b(?:ultimate\s+by\s+\w+|by\s+seldion|saga\s+(?:saiyajin|saiyan|bu+|cell|freez?e?r?|frieza|namek|garlick|androides?|androids?|gran\s*viaje|baby|super\s*17|dragones?\s*oscuros?|dioses?|goku\s*black|torneo\s*(?:del\s*)?(?:poder|universo\s*6)))\b`)

// LookupCustomOverride checks if a cleaned title matches a hardcoded Platform ID override.
// Returns the Platform media ID and true if found; 0 and false otherwise.
func LookupCustomOverride(cleanTitle string) (int, bool) {
	normalized := normalizeForAliasLookup(cleanTitle)
	// Strip fan-edit tokens for a second-pass lookup
	stripped := normalizeForAliasLookup(StripFanEditTokens(normalized))

	if id, ok := customIDOverrides[normalized]; ok {
		return id, true
	}
	if id, ok := customIDOverrides[stripped]; ok {
		return id, true
	}
	return 0, false
}

// StripFanEditTokens removes fan-edit markers from a title string,
// returning a clean version suitable for upstream Platform matching.
func StripFanEditTokens(title string) string {
	cleaned := reFanEditTokens.ReplaceAllString(title, " ")
	// Collapse any resulting double spaces
	for strings.Contains(cleaned, "  ") {
		cleaned = strings.ReplaceAll(cleaned, "  ", " ")
	}
	return strings.TrimSpace(cleaned)
}

// animeAliases maps canonical Dragon Ball series titles to their commonly used alternative names.
// These aliases help the matcher find the correct media when file names use non-standard
// or abbreviated titles.
//
// Keys are lowercase canonical titles; values are lowercase alternative names.
var animeAliases = map[string][]string{
	// Dragon Ball franchise (6 main official series)
	"dragon ball": {
		"db", "dragonball", "dragon ball clasico", "dragon ball clásico", "dragon ball original",
		"db clasico", "db clásico", "db original",
	},
	"dragon ball z": {
		"dbz", "dragonball z", "dragon ball zet", "db z", "dragonballz",
	},
	"dragon ball gt": {
		"dbgt", "dragonball gt", "db gt", "dragonballgt",
	},
	"dragon ball super": {
		"dbs", "dragonball super", "db super", "dragonballsuper",
	},
	"dragon ball daima": {
		"db daima", "dragonball daima", "daima", "dbdaima",
	},
	"dragon ball kai": {
		"db kai", "dragonball kai", "dragon ball z kai", "dbz kai", "dragonball z kai",
		"dbkai", "dbzkai", "dragon ball kai the final chapters",
	},
}

// commonAbbreviations maps short Dragon Ball abbreviations to their expanded forms.
// These are used during title normalization to expand abbreviations found in file names and folders.
var commonAbbreviations = map[string]string{
	"db":      "dragon ball",
	"dbz":     "dragon ball z",
	"dbs":     "dragon ball super",
	"dbgt":    "dragon ball gt",
	"dbz kai": "dragon ball kai",
	"db kai":  "dragon ball kai",
	"daima":   "dragon ball daima",
}

// GetAliasesForTitle returns all known aliases for a given title (case-insensitive).
// The result includes the original title itself.
func GetAliasesForTitle(title string) []string {
	lower := normalizeForAliasLookup(title)

	// Direct match
	if aliases, ok := animeAliases[lower]; ok {
		return aliases
	}

	// Reverse lookup: Check if the title is an alias of something
	for canonical, aliases := range animeAliases {
		for _, alias := range aliases {
			if alias == lower {
				// Return the canonical title plus all other aliases
				result := make([]string, 0, len(aliases)+1)
				result = append(result, canonical)
				for _, a := range aliases {
					if a != lower {
						result = append(result, a)
					}
				}
				return result
			}
		}
	}

	return nil
}

// ExpandAbbreviation attempts to expand a short abbreviation into its full title.
// Returns the expanded form and true if found, or the original and false if not.
func ExpandAbbreviation(abbr string) (string, bool) {
	lower := normalizeForAliasLookup(abbr)
	if expanded, ok := commonAbbreviations[lower]; ok {
		return expanded, true
	}
	return abbr, false
}

// normalizeForAliasLookup normalizes a string for alias lookup by lowercasing
// and trimming whitespace.
func normalizeForAliasLookup(s string) string {
	return strings.ToLower(strings.TrimSpace(s))
}
