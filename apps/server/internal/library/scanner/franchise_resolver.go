package scanner

import "strings"

// MovieMapping defines keyword-based rules to match a movie title to a TMDB ID.
// Keywords:  ALL must be present (AND logic).
// AnyOf:     at least ONE must be present (OR logic); empty = not checked.
// Excluded:  if ANY is present the mapping is skipped.
type MovieMapping struct {
	Keywords []string
	AnyOf    []string
	Excluded []string
	TMDBID   int
}

// SeriesMapping defines keyword rules to match a series title to a TMDB ID.
type SeriesMapping struct {
	Keywords []string
	AnyOf    []string
	Excluded []string
	TMDBID   int
}

// FranchiseDef describes a media franchise (Dragon Ball, Naruto, One Piece, etc.)
// with its ordered list of movie and series mappings.
//
// Resolution order:
//  1. Check that ALL TriggerWords are present in the title (fast-exit if not).
//  2. Iterate Movies in order; first match wins → returns (tmdbID, isMovie=true).
//  3. Iterate Series in order; first match wins → returns (tmdbID, isMovie=false).
type FranchiseDef struct {
	// TriggerWords: ALL of these words must appear in the normalized title
	// for the resolver to process this franchise at all.
	TriggerWords []string
	Movies       []MovieMapping
	Series       []SeriesMapping
}

// ResolveFranchiseID evaluates a pre-normalized title string (padded with spaces)
// against a FranchiseDef. Returns (tmdbID, isMovie, found).
//
// ct must already be normalized and padded: " word1 word2 ... "
func ResolveFranchiseID(ct string, franchise FranchiseDef) (int, bool, bool) {
	// Fast-exit: at least one trigger word must match
	for _, trigger := range franchise.TriggerWords {
		if !franchiseHasWord(ct, trigger) {
			return 0, false, false
		}
	}

	// Movies (evaluated first)
	for _, m := range franchise.Movies {
		if franchiseMatchesMapping(ct, m.Keywords, m.AnyOf, m.Excluded) {
			return m.TMDBID, true, true
		}
	}

	// Series
	for _, s := range franchise.Series {
		if franchiseMatchesMapping(ct, s.Keywords, s.AnyOf, s.Excluded) {
			return s.TMDBID, false, true
		}
	}

	return 0, false, false
}

// franchiseHasWord returns true if word/phrase appears as a whole token sequence in ct.
// ct must be padded with a leading and trailing space.
func franchiseHasWord(ct, word string) bool {
	norm := strings.TrimSpace(normalizeDragonBallTitle(word))
	if norm == "" {
		return false
	}
	return strings.Contains(ct, " "+norm+" ")
}

// franchiseMatchesMapping checks Keywords (AND), Excluded (NONE), AnyOf (OR).
func franchiseMatchesMapping(ct string, keywords, anyOf, excluded []string) bool {
	hw := func(w string) bool { return franchiseHasWord(ct, w) }

	for _, k := range keywords {
		if !hw(k) {
			return false
		}
	}
	for _, e := range excluded {
		if hw(e) {
			return false
		}
	}
	if len(anyOf) > 0 {
		for _, a := range anyOf {
			if hw(a) {
				goto anyOfOK
			}
		}
		return false
	anyOfOK:
	}
	return true
}

