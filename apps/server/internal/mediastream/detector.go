// Package mediastream — detector.go intentionally removed.
// The acoustic fingerprint scanner (SkipDetector, fpcalc, ScanSeries) was deleted
// because it produced corrupt skip marks (intro detected at ~9:03 due to a secondsPerFrame
// scaling bug) that propagated to the whole season.
// Skip times are now 100% API-driven (AniSkip) with a heuristic fallback for episodes
// without AniSkip data.  See usePlayerSkip.ts for the client-side chain.
package mediastream
