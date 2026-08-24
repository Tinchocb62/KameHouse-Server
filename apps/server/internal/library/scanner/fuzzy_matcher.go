package scanner

import (
	"math"
	"sort"
	"strings"
	"unicode"
)

// LevenshteinDistance calculates the minimum number of single-character edits
// (insertions, deletions or substitutions) required to change s1 into s2.
func LevenshteinDistance(s1, s2 string) int {
	r1, r2 := []rune(s1), []rune(s2)
	len1, len2 := len(r1), len(r2)

	if len1 == 0 {
		return len2
	}
	if len2 == 0 {
		return len1
	}

	dp := make([][]int, len1+1)
	for i := range dp {
		dp[i] = make([]int, len2+1)
		dp[i][0] = i
	}
	for j := 0; j <= len2; j++ {
		dp[0][j] = j
	}

	for i := 1; i <= len1; i++ {
		for j := 1; j <= len2; j++ {
			cost := 0
			if r1[i-1] != r2[j-1] {
				cost = 1
			}
			dp[i][j] = min3(
				dp[i-1][j]+1,      // deletion
				dp[i][j-1]+1,      // insertion
				dp[i-1][j-1]+cost, // substitution
			)
		}
	}

	return dp[len1][len2]
}

// LevenshteinRatio returns a normalized similarity score between 0.0 and 1.0.
func LevenshteinRatio(s1, s2 string) float64 {
	len1, len2 := len([]rune(s1)), len([]rune(s2))
	if len1 == 0 && len2 == 0 {
		return 1.0
	}
	if len1 == 0 || len2 == 0 {
		return 0.0
	}
	maxLen := math.Max(float64(len1), float64(len2))
	dist := LevenshteinDistance(s1, s2)
	return (maxLen - float64(dist)) / maxLen
}

// JaroWinklerSimilarity computes the Jaro-Winkler distance between s1 and s2 (score 0.0 to 1.0).
func JaroWinklerSimilarity(s1, s2 string) float64 {
	r1, r2 := []rune(s1), []rune(s2)
	len1, len2 := len(r1), len(r2)
	if len1 == 0 && len2 == 0 {
		return 1.0
	}
	if len1 == 0 || len2 == 0 {
		return 0.0
	}

	matchDistance := int(math.Floor(math.Max(float64(len1), float64(len2))/2.0)) - 1
	if matchDistance < 0 {
		matchDistance = 0
	}

	r1Matches := make([]bool, len1)
	r2Matches := make([]bool, len2)
	matches := 0

	for i := 0; i < len1; i++ {
		start := int(math.Max(0, float64(i-matchDistance)))
		end := int(math.Min(float64(i+matchDistance+1), float64(len2)))

		for j := start; j < end; j++ {
			if r2Matches[j] || r1[i] != r2[j] {
				continue
			}
			r1Matches[i] = true
			r2Matches[j] = true
			matches++
			break
		}
	}

	if matches == 0 {
		return 0.0
	}

	transpositions := 0
	k := 0
	for i := 0; i < len1; i++ {
		if !r1Matches[i] {
			continue
		}
		for !r2Matches[k] {
			k++
		}
		if r1[i] != r2[k] {
			transpositions++
		}
		k++
	}

	jaro := (float64(matches)/float64(len1) +
		float64(matches)/float64(len2) +
		float64(matches-transpositions/2)/float64(matches)) / 3.0

	// Winkler prefix scale (p = 0.1, max 4 prefix characters)
	prefix := 0
	maxPrefix := int(math.Min(4, math.Min(float64(len1), float64(len2))))
	for i := 0; i < maxPrefix; i++ {
		if r1[i] == r2[i] {
			prefix++
		} else {
			break
		}
	}

	return jaro + float64(prefix)*0.1*(1.0-jaro)
}

// TokenSetRatio splits strings into unique sorted tokens and calculates similarity,
// with soft token alignment for minor typos or variations.
func TokenSetRatio(s1, s2 string) float64 {
	tokens1 := extractUniqueTokens(s1)
	tokens2 := extractUniqueTokens(s2)

	if len(tokens1) == 0 && len(tokens2) == 0 {
		return 1.0
	}
	if len(tokens1) == 0 || len(tokens2) == 0 {
		return 0.0
	}

	// Calculate bidirectional best token alignment
	score1 := tokenCoverageScore(tokens1, tokens2)
	score2 := tokenCoverageScore(tokens2, tokens1)

	return math.Max(score1, score2)
}

func tokenCoverageScore(source, target []string) float64 {
	if len(source) == 0 {
		return 0.0
	}
	var totalWeight, matchedWeight float64

	for _, s := range source {
		// Stop words have lower weight, distinctive words have higher weight
		w := 1.0
		if len(s) <= 2 || s == "el" || s == "la" || s == "los" || s == "las" || s == "de" || s == "un" || s == "mi" || s == "the" || s == "of" {
			w = 0.3
		} else if len(s) >= 5 {
			w = 1.5
		}
		totalWeight += w

		bestSim := 0.0
		for _, t := range target {
			if s == t {
				bestSim = 1.0
				break
			}
			jw := JaroWinklerSimilarity(s, t)
			if jw > bestSim {
				bestSim = jw
			}
		}

		if bestSim >= 0.75 {
			matchedWeight += w * bestSim
		}
	}

	if totalWeight == 0 {
		return 0.0
	}
	return matchedWeight / totalWeight
}

// FuzzyMatchScore computes a composite fuzzy similarity score between a query and a target.
// Returns a value between 0.0 (no match) and 1.0 (exact match).
func FuzzyMatchScore(query, target string) float64 {
	qNorm := cleanFuzzyString(query)
	tNorm := cleanFuzzyString(target)

	if qNorm == "" && tNorm == "" {
		return 1.0
	}
	if qNorm == "" || tNorm == "" {
		return 0.0
	}
	if qNorm == tNorm {
		return 1.0
	}

	// Expand standard acronyms (e.g. DBS -> Dragon Ball Super, DBZ -> Dragon Ball Z, DB -> Dragon Ball)
	qExpanded := expandAcronyms(qNorm)
	tExpanded := expandAcronyms(tNorm)

	tokenRatio := math.Max(TokenSetRatio(qNorm, tNorm), TokenSetRatio(qExpanded, tExpanded))
	jwSimilarity := math.Max(JaroWinklerSimilarity(qNorm, tNorm), JaroWinklerSimilarity(qExpanded, tExpanded))
	levRatio := math.Max(LevenshteinRatio(qNorm, tNorm), LevenshteinRatio(qExpanded, tExpanded))

	// Weighted ensemble: TokenSet (60%), Jaro-Winkler (25%), Levenshtein (15%)
	score := (tokenRatio * 0.60) + (jwSimilarity * 0.25) + (levRatio * 0.15)
	return math.Round(score*1000) / 1000
}

func expandAcronyms(s string) string {
	words := strings.Fields(s)
	var expanded []string
	for _, w := range words {
		switch w {
		case "dbs":
			expanded = append(expanded, "dragon", "ball", "super")
		case "dbz":
			expanded = append(expanded, "dragon", "ball", "z")
		case "dbgt":
			expanded = append(expanded, "dragon", "ball", "gt")
		case "db":
			expanded = append(expanded, "dragon", "ball")
		case "sp":
			expanded = append(expanded, "especial")
		default:
			expanded = append(expanded, w)
		}
	}
	return strings.Join(expanded, " ")
}

func min3(a, b, c int) int {
	if a < b {
		if a < c {
			return a
		}
		return c
	}
	if b < c {
		return b
	}
	return c
}

func extractUniqueTokens(s string) []string {
	words := strings.Fields(cleanFuzzyString(s))
	seen := make(map[string]bool)
	var unique []string
	for _, w := range words {
		if !seen[w] && len(w) > 0 {
			seen[w] = true
			unique = append(unique, w)
		}
	}
	sort.Strings(unique)
	return unique
}

func cleanFuzzyString(s string) string {
	s = strings.ToLower(s)
	s = strings.ReplaceAll(s, "-", " ")
	s = strings.ReplaceAll(s, "_", " ")
	s = strings.ReplaceAll(s, ".", " ")
	s = strings.ReplaceAll(s, "[", " ")
	s = strings.ReplaceAll(s, "]", " ")
	s = strings.ReplaceAll(s, "(", " ")
	s = strings.ReplaceAll(s, ")", " ")
	s = strings.ReplaceAll(s, "¡", " ")
	s = strings.ReplaceAll(s, "!", " ")
	s = strings.ReplaceAll(s, "¿", " ")
	s = strings.ReplaceAll(s, "?", " ")
	s = strings.ReplaceAll(s, ":", " ")
	s = strings.ReplaceAll(s, ",", " ")

	// Accents normalization
	s = strings.ReplaceAll(s, "á", "a")
	s = strings.ReplaceAll(s, "à", "a")
	s = strings.ReplaceAll(s, "é", "e")
	s = strings.ReplaceAll(s, "è", "e")
	s = strings.ReplaceAll(s, "í", "i")
	s = strings.ReplaceAll(s, "ì", "i")
	s = strings.ReplaceAll(s, "ó", "o")
	s = strings.ReplaceAll(s, "ò", "o")
	s = strings.ReplaceAll(s, "ú", "u")
	s = strings.ReplaceAll(s, "ù", "u")
	s = strings.ReplaceAll(s, "ü", "u")
	s = strings.ReplaceAll(s, "ñ", "n")

	var b strings.Builder
	for _, r := range s {
		if unicode.IsLetter(r) || unicode.IsDigit(r) || unicode.IsSpace(r) {
			b.WriteRune(r)
		}
	}
	return strings.Join(strings.Fields(b.String()), " ")
}
