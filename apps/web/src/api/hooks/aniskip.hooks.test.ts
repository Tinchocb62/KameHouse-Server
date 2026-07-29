import { normalizeInterval } from "./aniskip.hooks"

describe("normalizeInterval", () => {
    it("should not normalize if anchor is start", () => {
        const interval = { startTime: 10, endTime: 100 }
        const result = normalizeInterval(interval, 1400, 1420, "start")
        expect(result).toEqual(interval)
    })

    it("should not normalize sub-second duration differences (metadata jitter)", () => {
        const interval = { startTime: 1300, endTime: 1390 }
        const result = normalizeInterval(interval, 1400, 1400.4, "end")
        expect(result).toEqual(interval)
    })

    it("should re-anchor ED for a 1s duration difference", () => {
        // A 1-2s cut difference used to be tolerated and left the tail of the
        // outro visible after a skip; now anything >= 0.5s re-anchors to the end.
        const interval = { startTime: 1300, endTime: 1390 }
        const result = normalizeInterval(interval, 1400, 1401, "end")
        expect(result).toEqual({ startTime: 1301, endTime: 1391 })
    })

    it("should adjust ED correctly when local file is longer", () => {
        // Source is 1400s. ED starts at 1300s (100s from end) and ends at 1390s (10s from end).
        // Local is 1420s. ED should start at 1320s and end at 1410s.
        const interval = { startTime: 1300, endTime: 1390 }
        const result = normalizeInterval(interval, 1400, 1420, "end")
        expect(result).toEqual({ startTime: 1320, endTime: 1410 })
    })

    it("should adjust ED correctly when local file is shorter", () => {
        // Source is 1400s. ED starts at 1300s (100s from end) and ends at 1390s (10s from end).
        // Local is 1380s. ED should start at 1280s and end at 1370s.
        const interval = { startTime: 1300, endTime: 1390 }
        const result = normalizeInterval(interval, 1400, 1380, "end")
        expect(result).toEqual({ startTime: 1280, endTime: 1370 })
    })

    it("should clamp ED to local duration if it exceeds it", () => {
        // Source is 1400s. ED starts at 1390 (10s from end) and ends at 1410 (exceeds source, -10s from end).
        // Local is 1420s.
        const interval = { startTime: 1390, endTime: 1410 }
        const result = normalizeInterval(interval, 1400, 1420, "end")
        // Start is 1420 - 10 = 1410. End is 1420 - (-10) = 1430 -> clamp to 1420.
        expect(result).toEqual({ startTime: 1410, endTime: 1420 })
    })

    it("should not normalize if source or local duration is missing/0", () => {
        const interval = { startTime: 1300, endTime: 1390 }
        expect(normalizeInterval(interval, 0, 1400, "end")).toEqual(interval)
        expect(normalizeInterval(interval, 1400, 0, "end")).toEqual(interval)
    })
})
