package skipdetect

import (
	"strings"
	"testing"
)

const assWithKaraoke = `[Script Info]
Title: Test

[V4+ Styles]
Format: Name, Fontname
Style: Default,Arial
Style: OP-JP,Arial

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:05.00,0:00:08.00,Default,,0,0,0,,Un diálogo normal antes de la OP.
Dialogue: 0,0:00:45.00,0:00:50.00,OP-JP,,0,0,0,,{\k30}la{\k25}la{\k40}la
Dialogue: 0,0:00:50.50,0:00:58.00,OP-JP,,0,0,0,,{\k30}canta{\k25}la op
Dialogue: 0,0:01:12.00,0:01:40.00,OP-JP,,0,0,0,,{\k30}segunda estrofa de la op
Dialogue: 0,0:01:45.00,0:02:14.00,OP-JP,,0,0,0,,{\k30}final de la op
Dialogue: 0,0:03:00.00,0:03:05.00,Default,,0,0,0,,Diálogo tras la intro.
`

func TestParseASSHintsKaraokeWindow(t *testing.T) {
	hint := ParseASSHints(strings.NewReader(assWithKaraoke), 1440)
	if hint.OpWindow == nil {
		t.Fatal("esperaba una ventana de OP por karaoke")
	}
	start, end := hint.OpWindow[0], hint.OpWindow[1]
	// El cluster de karaoke va de 45s a 134s.
	if start < 44 || start > 46 {
		t.Errorf("OpWindow start = %.1f, esperaba ≈45", start)
	}
	if end < 133 || end > 135 {
		t.Errorf("OpWindow end = %.1f, esperaba ≈134", end)
	}
}

const assWithGap = `[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:03.00,0:00:06.00,Default,,0,0,0,,Cold open.
Dialogue: 0,0:01:40.00,0:01:45.00,Default,,0,0,0,,Empieza el diálogo tras la OP.
Dialogue: 0,0:01:50.00,0:01:55.00,Default,,0,0,0,,Sigue.
`

func TestParseASSHintsDialogueGap(t *testing.T) {
	hint := ParseASSHints(strings.NewReader(assWithGap), 1440)
	if hint.GapWindow == nil {
		t.Fatal("esperaba un hueco de diálogo")
	}
	// Hueco entre 6s y 100s (~94s sin diálogo).
	if hint.GapWindow[0] < 5 || hint.GapWindow[0] > 7 {
		t.Errorf("GapWindow start = %.1f, esperaba ≈6", hint.GapWindow[0])
	}
	if hint.GapWindow[1] < 99 || hint.GapWindow[1] > 101 {
		t.Errorf("GapWindow end = %.1f, esperaba ≈100", hint.GapWindow[1])
	}
}

func TestParseASSNoHints(t *testing.T) {
	// Diálogo continuo, sin karaoke ni huecos grandes.
	var b strings.Builder
	b.WriteString("[Events]\n")
	b.WriteString("Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n")
	// Eventos cada ~5s de 0 a 300s.
	for s := 0; s < 300; s += 5 {
		mm := s / 60
		ss := s % 60
		b.WriteString(
			"Dialogue: 0,0:0" + itoa2(mm) + ":" + pad2(ss) + ".00,0:0" + itoa2(mm) + ":" + pad2(ss+3) + ".00,Default,,0,0,0,,linea\n")
	}
	hint := ParseASSHints(strings.NewReader(b.String()), 1440)
	if hint.OpWindow != nil {
		t.Errorf("no esperaba ventana de OP, obtuve %v", *hint.OpWindow)
	}
	if hint.GapWindow != nil {
		t.Errorf("no esperaba hueco de diálogo, obtuve %v", *hint.GapWindow)
	}
}

func itoa2(n int) string {
	if n < 10 {
		return string(rune('0' + n))
	}
	return string(rune('0'+n/10)) + string(rune('0'+n%10))
}

func pad2(n int) string {
	if n < 10 {
		return "0" + string(rune('0'+n))
	}
	return string(rune('0'+n/10)) + string(rune('0'+n%10))
}
