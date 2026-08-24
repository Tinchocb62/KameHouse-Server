package parser

import (
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
)

// ParsedMedia contains the clean extracted metadata from a raw filename.
type ParsedMedia struct {
	Title         string
	EpisodeTitle  string // Title of the episode if present (e.g. "Aparece un guerrero misterioso")
	Season        int
	Episodes      []int // Multi-episode support: [1, 2, 3] for ranges like "01-03"
	Resolution    string
	ReleaseGroup  string
	IsMulti       bool // Flag indicating multi-episode file
	IsEpisodeOnly bool // Flag indicating filename contained only episode number without series title

	// Deprecated: Use Episodes instead. Kept for backwards compatibility.
	Episode int
}

var (
	// crc32Regex matches an 8-character hex code inside brackets, usually at the end of anime files.
	crc32Regex = regexp.MustCompile(`(?i)\[[0-9A-F]{8}\]`)

	// releaseGroupRegex matches the leading bracket group e.g. [Erai-raws], [PuyaSubs!]
	releaseGroupRegex = regexp.MustCompile(`^\[([^\]]+)\]\s*`)

	// titleNumberEpisodeTitleRegex matches "Title - 001 - Episode Name" or "Title - 01 - Episode Name"
	titleNumberEpisodeTitleRegex = regexp.MustCompile(`(?i)^(.+?)\s+-\s+0*(\d{1,4})(?:v\d)?\s+-\s+(.+)$`)

	// occidentalRangeRegex matches TV scene ranges: "Show.S01E02-E04", "Show.S01E02-04", "S01E01-E03", "1x01-03"
	occidentalRangeRegex = regexp.MustCompile(`(?i)^(.*?)(?:[. _-]|^)(?:s(\d{1,2})[._ -]?e(\d{1,4})|(\d{1,2})x(\d{1,4}))\s*(?:[-~]|al|\s*-\s*e)\s*0*(\d{1,4})`)

	// occidentalRegex matches TV scene rules: "Show.S01E02", "Show 1x02", "S01E02", "s1e1", "1x01"
	occidentalRegex = regexp.MustCompile(`(?i)^(.*?)(?:[. _-]|^)(?:s(\d{1,2})[._ -]?e(\d{1,4})|(\d{1,2})x(\d{1,4}))(?:\s*[-–]\s*(.+))?$`)

	// spanishEpisodeRangeRegex matches: "Show Capitulo 01-03", "Capitulo 01 al 03", "Ep 01~03", "Cap 01-03"
	spanishEpisodeRangeRegex = regexp.MustCompile(`(?i)^(.*?)\s*[-–]?\s*(?:cap[ií]tulo|cap|episodio|episode|ep|c|e)\.?\s*0*(\d{1,4})\s*(?:[-~]|al)\s*0*(\d{1,4})(?:v\d)?\s*$`)

	// spanishEpisodeSingleRegex matches: "Show Capitulo 01", "Capitulo 01", "Episodio 1", "Cap 01", "Ep 01", "E01"
	spanishEpisodeSingleRegex = regexp.MustCompile(`(?i)^(.*?)\s*[-–]?\s*(?:cap[ií]tulo|cap|episodio|episode|ep)\.?\s*0*(\d{1,4})(?:v\d)?(?:\s*[-–]\s*(.+))?$`)

	// standaloneEPRegex matches isolated "E01", "E1", "E001" at start or after separator
	standaloneEPRegex = regexp.MustCompile(`(?i)^(.*?)(?:[. _-]|^)e0*(\d{1,4})(?:v\d)?(?:\s*[-–]\s*(.+))?$`)

	// animeRangeRegex matches episode ranges like "Title 01-02", "Title 01~02", "01-02"
	animeRangeRegex = regexp.MustCompile(`(?i)^(.*?)\s+(?:-|~)?\s*0*(\d{1,4})\s*[-~]\s*0*(\d{1,4})(?:v\d)?\s*$`)

	// bareRangeRegex matches standalone numeric ranges without title: "01-03", "001-003", "01~03"
	bareRangeRegex = regexp.MustCompile(`(?i)^0*(\d{1,4})\s*[-~]\s*0*(\d{1,4})(?:v\d)?$`)

	// animeHyphenRegex matches "Title - 01" or "Title - 01v2"
	animeHyphenRegex = regexp.MustCompile(`(?i)^(.*?)\s+-\s+0*(\d{1,4})(?:v\d)?\s*(?:[\[\(].*?[\]\)])*\s*$`)

	// animeAbsoluteRegex matches "Title 01" where the number is at the end of the cleaned string
	animeAbsoluteRegex = regexp.MustCompile(`(?i)^(.*?)\s+0*(\d{1,4})(?:v\d)?\s*$`)

	// bareNumberRegex matches pure standalone numbers: "01", "001", "034", "153"
	bareNumberRegex = regexp.MustCompile(`^0*(\d{1,4})(?:v\d)?$`)

	// resolutionRegex searches for standard resolutions
	resolutionRegex = regexp.MustCompile(`(?i)\b(2160p|1080p|960p|720p|480p|4k|8k)\b`)

	// bracketedTagRegex removes bracketed/parenthesized release tags
	bracketedTagRegex = regexp.MustCompile(`\[[^\]]*\]|\([^)]*\)`)

	// noisyTokenRegex catches common technical tokens that should never become part of the title
	noisyTokenRegex = regexp.MustCompile(`(?i)\b(?:2160p|1080p|960p|720p|480p|4k|8k|uhd|hdr10?|dv|dolby\s*vision|hevc|x265|h\.?265|x264|h\.?264|avc|av1|aac|flac|opus|dts|truehd|atmos|ddp?|eac3|ac3|web[-_. ]?dl|webrip|bluray|blu[-_. ]?ray|bdrip|dvdrip|hdrip|remux|proper|repack|batch|dual[-_. ]?audio|multi[-_. ]?subs?|multi[-_. ]?audio|10[-_. ]?bit|8[-_. ]?bit|hi10p)\b`)

	// emptySeparatorRunsRegex collapses separators left behind by removed tags and codecs
	emptySeparatorRunsRegex = regexp.MustCompile(`[\s._]+`)

	// cleanSymbolsRegex cleans trailing garbage from titles
	cleanSymbolsRegex = regexp.MustCompile(`[._\-]`)
)

// Parse attempts to extract Title, Season, Episode(s), Resolution, and ReleaseGroup.
func Parse(filename string) ParsedMedia {
	base := strings.TrimSuffix(filepath.Base(filename), filepath.Ext(filename))

	pm := ParsedMedia{
		Season:     1,
		Episodes:   []int{1},
		Resolution: "UNKNOWN",
	}

	// Extract and Remove Resolution
	if res := resolutionRegex.FindStringSubmatch(base); res != nil {
		pm.Resolution = strings.ToUpper(res[1])
		base = resolutionRegex.ReplaceAllString(base, "")
	}

	// Remove CRC32 Hashes
	base = crc32Regex.ReplaceAllString(base, "")

	// Extract Release Group at the start
	if rg := releaseGroupRegex.FindStringSubmatch(base); rg != nil {
		pm.ReleaseGroup = strings.TrimSpace(rg[1])
		base = strings.TrimPrefix(base, rg[0])
	}

	base = sanitizeSubGroupTags(base)

	// 1. Check Bare Pure Standalone Numbers: "01", "001", "034", "153"
	trimmedBase := strings.TrimSpace(base)
	if match := bareNumberRegex.FindStringSubmatch(trimmedBase); match != nil {
		epNum, _ := strconv.Atoi(match[1])
		pm.Title = ""
		pm.Episodes = []int{epNum}
		pm.Episode = epNum
		pm.IsEpisodeOnly = true
		return pm
	}

	// 2. Check Bare Numeric Ranges: "01-03", "001-003"
	if match := bareRangeRegex.FindStringSubmatch(trimmedBase); match != nil {
		start, _ := strconv.Atoi(match[1])
		end, _ := strconv.Atoi(match[2])
		pm.Title = ""
		pm.IsEpisodeOnly = true
		if end > start {
			pm.Episodes = make([]int, 0, end-start+1)
			for i := start; i <= end; i++ {
				pm.Episodes = append(pm.Episodes, i)
			}
			pm.IsMulti = true
		} else {
			pm.Episodes = []int{start}
		}
		if len(pm.Episodes) > 0 {
			pm.Episode = pm.Episodes[0]
		}
		return pm
	}

	// 3. Check "Title - 001 - Episode Title"
	if match := titleNumberEpisodeTitleRegex.FindStringSubmatch(base); match != nil {
		t := cleanTitle(match[1])
		epNum, _ := strconv.Atoi(match[2])
		epTitle := strings.TrimSpace(match[3])
		pm.Title = t
		pm.EpisodeTitle = epTitle
		pm.Episodes = []int{epNum}
		pm.Episode = epNum
		return pm
	}

	// 4. Check Occidental Range: "Show.S01E01-E03", "S01E01-03", "1x01-03"
	if match := occidentalRangeRegex.FindStringSubmatch(base); match != nil {
		rawTitle := strings.TrimSpace(match[1])
		pm.Title = cleanTitle(rawTitle)
		if pm.Title == "" {
			pm.IsEpisodeOnly = true
		}
		sStr, eStartStr := match[2], match[3]
		if match[4] != "" {
			sStr, eStartStr = match[4], match[5]
		}
		if sStr != "" {
			pm.Season, _ = strconv.Atoi(sStr)
		}
		start, _ := strconv.Atoi(eStartStr)
		end, _ := strconv.Atoi(match[6])
		if end > start {
			pm.Episodes = make([]int, 0, end-start+1)
			for i := start; i <= end; i++ {
				pm.Episodes = append(pm.Episodes, i)
			}
			pm.IsMulti = true
		} else {
			pm.Episodes = []int{start}
		}
		if len(pm.Episodes) > 0 {
			pm.Episode = pm.Episodes[0]
		}
		return pm
	}

	// 5. Check Occidental Single: "Show.S01E02", "Show 1x02", "S01E02", "1x01"
	if match := occidentalRegex.FindStringSubmatch(base); match != nil {
		rawTitle := strings.TrimSpace(match[1])
		pm.Title = cleanTitle(rawTitle)
		if pm.Title == "" {
			pm.IsEpisodeOnly = true
		}
		sStr, eStr := match[2], match[3]
		if match[4] != "" {
			sStr, eStr = match[4], match[5]
		}
		if sStr != "" {
			pm.Season, _ = strconv.Atoi(sStr)
		}
		epNum, _ := strconv.Atoi(eStr)
		pm.Episodes = []int{epNum}
		pm.Episode = epNum
		if len(match) > 6 && match[6] != "" {
			pm.EpisodeTitle = strings.TrimSpace(match[6])
		}
		return pm
	}

	// 6. Check Spanish/Multilingual Range: "Show Capitulo 01 al 03", "Cap 01-03", "Episodio 01-03"
	if match := spanishEpisodeRangeRegex.FindStringSubmatch(base); match != nil {
		rawTitle := strings.TrimSpace(match[1])
		pm.Title = cleanTitle(rawTitle)
		if pm.Title == "" {
			pm.IsEpisodeOnly = true
		}
		start, _ := strconv.Atoi(match[2])
		end, _ := strconv.Atoi(match[3])
		if end > start {
			pm.Episodes = make([]int, 0, end-start+1)
			for i := start; i <= end; i++ {
				pm.Episodes = append(pm.Episodes, i)
			}
			pm.IsMulti = true
		} else {
			pm.Episodes = []int{start}
		}
		if len(pm.Episodes) > 0 {
			pm.Episode = pm.Episodes[0]
		}
		return pm
	}

	// 7. Check Spanish/Multilingual Single: "Show Capitulo 01", "Capitulo 01", "Episodio 01", "Cap 05"
	if match := spanishEpisodeSingleRegex.FindStringSubmatch(base); match != nil {
		rawTitle := strings.TrimSpace(match[1])
		pm.Title = cleanTitle(rawTitle)
		if pm.Title == "" {
			pm.IsEpisodeOnly = true
		}
		epNum, _ := strconv.Atoi(match[2])
		pm.Episodes = []int{epNum}
		pm.Episode = epNum
		if len(match) > 3 && match[3] != "" {
			pm.EpisodeTitle = strings.TrimSpace(match[3])
		}
		return pm
	}

	// 8. Check Standalone "E01", "E001"
	if match := standaloneEPRegex.FindStringSubmatch(base); match != nil {
		rawTitle := strings.TrimSpace(match[1])
		pm.Title = cleanTitle(rawTitle)
		if pm.Title == "" {
			pm.IsEpisodeOnly = true
		}
		epNum, _ := strconv.Atoi(match[2])
		pm.Episodes = []int{epNum}
		pm.Episode = epNum
		if len(match) > 3 && match[3] != "" {
			pm.EpisodeTitle = strings.TrimSpace(match[3])
		}
		return pm
	}

	// 9. Check Anime Episode Ranges (10-12)
	cleanedForAbsolute := sanitizeSubGroupTags(base)
	if match := animeRangeRegex.FindStringSubmatch(cleanedForAbsolute); match != nil && match[1] != "" {
		pm.Title = cleanTitle(match[1])
		start, _ := strconv.Atoi(match[2])
		end, _ := strconv.Atoi(match[3])

		if end > start {
			pm.Episodes = make([]int, 0, end-start+1)
			for i := start; i <= end; i++ {
				pm.Episodes = append(pm.Episodes, i)
			}
			pm.IsMulti = true
		} else {
			pm.Episodes = []int{start}
		}
		if len(pm.Episodes) > 0 {
			pm.Episode = pm.Episodes[0]
		}
		return pm
	}

	// 10. Check Anime Hyphen (Title - 01)
	if match := animeHyphenRegex.FindStringSubmatch(base); match != nil {
		pm.Title = cleanTitle(match[1])
		epNum, _ := strconv.Atoi(match[2])
		pm.Episodes = []int{epNum}
		pm.Episode = epNum
		return pm
	}

	// 11. Check Absolute Numbering (Title 01)
	if match := animeAbsoluteRegex.FindStringSubmatch(cleanedForAbsolute); match != nil {
		pm.Title = cleanTitle(match[1])
		epNum, _ := strconv.Atoi(match[2])
		pm.Episodes = []int{epNum}
		pm.Episode = epNum
		return pm
	}

	pm.Title = cleanTitle(base)
	return pm
}

// SanitizeSubGroupTags strips fansub, quality, codec and release noise from a title fragment.
func SanitizeSubGroupTags(input string) string {
	return sanitizeSubGroupTags(input)
}

func sanitizeSubGroupTags(input string) string {
	clean := crc32Regex.ReplaceAllString(input, " ")
	clean = bracketedTagRegex.ReplaceAllString(clean, " ")
	clean = resolutionRegex.ReplaceAllString(clean, " ")
	clean = noisyTokenRegex.ReplaceAllString(clean, " ")
	clean = emptySeparatorRunsRegex.ReplaceAllString(clean, " ")
	return strings.TrimSpace(clean)
}

func cleanTitle(raw string) string {
	clean := sanitizeSubGroupTags(raw)
	clean = cleanSymbolsRegex.ReplaceAllString(clean, " ")
	return strings.TrimSpace(strings.Join(strings.Fields(clean), " "))
}
