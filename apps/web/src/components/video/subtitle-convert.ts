// libass (the engine behind JASSUB) only parses ASS/SSA. Text subtitles extracted
// from the container with `-c:s copy` arrive as raw SubRip (.srt) or WebVTT (.vtt),
// which libass silently fails to render. We convert those to a minimal ASS document
// so JASSUB can display them. ASS/SSA content is passed through untouched.

const ASS_HEADER = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,54,&H00FFFFFF,&H000000FF,&H00000000,&H64000000,0,0,0,0,100,100,0,0,1,2.6,1.2,2,60,60,54,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`

// Matches a SubRip/WebVTT timing line, tolerating both "," and "." as the ms separator
// and optional WebVTT cue settings trailing the end timestamp (e.g. "align:middle").
const TIMING_RE = /(\d{1,2}):(\d{2}):(\d{2})[.,](\d{1,3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[.,](\d{1,3})/

// assTime formats an h/m/s/ms tuple as ASS "H:MM:SS.cc" (centisecond precision).
function assTime(h: string, m: string, s: string, ms: string): string {
    const cs = Math.floor(parseInt(ms.padEnd(3, "0"), 10) / 10)
    return `${parseInt(h, 10)}:${m}:${s}.${cs.toString().padStart(2, "0")}`
}

// escapeText turns a cue's text lines into a single ASS Dialogue text field:
// converts basic HTML styling tags to ASS overrides, strips the rest, escapes braces
// (which start an ASS override block), and joins wrapped lines with "\N".
function escapeText(lines: string[]): string {
    return lines
        .join("\n")
        .replace(/[{}]/g, "") // literal braces would open/close an override block
        .replace(/<i>/gi, "{\\i1}").replace(/<\/i>/gi, "{\\i0}")
        .replace(/<b>/gi, "{\\b1}").replace(/<\/b>/gi, "{\\b0}")
        .replace(/<u>/gi, "{\\u1}").replace(/<\/u>/gi, "{\\u0}")
        .replace(/<[^>]+>/g, "") // drop any remaining tags (font, ruby, cue spans…)
        .replace(/\r/g, "")
        .replace(/\n/g, "\\N")
        .trim()
}

// convertToAss returns an ASS document for SubRip/WebVTT input, or the content
// unchanged when it is already ASS/SSA (or an unknown codec we shouldn't touch).
export function convertToAss(content: string, codec: string | undefined): string {
    const c = (codec ?? "").toLowerCase()
    if (c === "ass" || c === "ssa") return content
    if (c !== "subrip" && c !== "srt" && c !== "vtt" && c !== "webvtt") return content

    const dialogues: string[] = []
    // Split into cue blocks on blank lines; works for both SRT and VTT.
    const blocks = content.replace(/\r\n/g, "\n").split(/\n\s*\n/)
    for (const block of blocks) {
        const rawLines = block.split("\n")
        let timingIdx = -1
        let match: RegExpMatchArray | null = null
        for (let i = 0; i < rawLines.length; i++) {
            const m = rawLines[i].match(TIMING_RE)
            if (m) {
                timingIdx = i
                match = m
                break
            }
        }
        if (timingIdx === -1 || !match) continue // header (WEBVTT), NOTE, numbering-only, etc.

        const start = assTime(match[1], match[2], match[3], match[4])
        const end = assTime(match[5], match[6], match[7], match[8])
        const textLines = rawLines.slice(timingIdx + 1).filter(l => l.length > 0)
        if (textLines.length === 0) continue
        const text = escapeText(textLines)
        if (text.length === 0) continue
        dialogues.push(`Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`)
    }

    return ASS_HEADER + dialogues.join("\n") + "\n"
}
