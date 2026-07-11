import { describe, it, expect } from "vitest"
import { convertToAss } from "./subtitle-convert"

const SRT = `1
00:00:06,270 --> 00:00:11,770
Obra original, historia
y creación de personajes: Akira Toriyama

2
00:01:31,600 --> 00:01:32,440
TAMAGAMI

3
00:01:32,520 --> 00:01:37,230
<i>¡Soy Tamagami Número Tres!</i>
`

describe("convertToAss", () => {
    it("emits an ASS header with a Default style and Events section", () => {
        const ass = convertToAss(SRT, "subrip")
        expect(ass).toContain("[Script Info]")
        expect(ass).toContain("[V4+ Styles]")
        expect(ass).toContain("Style: Default,")
        expect(ass).toContain("[Events]")
    })

    it("converts SRT timing (comma ms) to ASS Dialogue lines (centisecond dot)", () => {
        const ass = convertToAss(SRT, "subrip")
        // 00:00:06,270 -> 0:00:06.27 ; 00:00:11,770 -> 0:00:11.77
        expect(ass).toContain("Dialogue: 0,0:00:06.27,0:00:11.77,Default,,0,0,0,,")
    })

    it("joins wrapped lines with \\N and keeps commas in text", () => {
        const ass = convertToAss(SRT, "subrip")
        expect(ass).toContain("Obra original, historia\\Ny creación de personajes: Akira Toriyama")
    })

    it("converts <i> tags to ASS italic overrides", () => {
        const ass = convertToAss(SRT, "subrip")
        expect(ass).toContain("{\\i1}¡Soy Tamagami Número Tres!{\\i0}")
    })

    it("handles WebVTT (dot ms + cue settings) too", () => {
        const vtt = `WEBVTT

00:00:01.000 --> 00:00:02.500 align:middle
Hello world
`
        const ass = convertToAss(vtt, "vtt")
        expect(ass).toContain("Dialogue: 0,0:00:01.00,0:00:02.50,Default,,0,0,0,,Hello world")
        expect(ass).not.toContain("WEBVTT")
        expect(ass).not.toContain("align:middle")
    })

    it("passes ASS/SSA through unchanged", () => {
        const original = "[Script Info]\nfoo\n[Events]\nDialogue: ..."
        expect(convertToAss(original, "ass")).toBe(original)
    })
})
