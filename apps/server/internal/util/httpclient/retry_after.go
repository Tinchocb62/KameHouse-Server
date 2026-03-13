package httpclient

import (
	"net/http"
	"strconv"
	"strings"
	"time"
)

// ParseRetryAfter parses the HTTP Retry-After header and returns a duration to wait.
// It supports both delta-seconds and HTTP-date formats.
func ParseRetryAfter(headers http.Header, now time.Time) (time.Duration, bool) {
	value := strings.TrimSpace(headers.Get("Retry-After"))
	if value == "" {
		return 0, false
	}

	if seconds, err := strconv.Atoi(value); err == nil {
		if seconds < 0 {
			seconds = 0
		}
		return time.Duration(seconds) * time.Second, true
	}

	for _, layout := range []string{
		time.RFC1123,
		time.RFC1123Z,
		time.RFC850,
		time.ANSIC,
	} {
		if t, err := time.Parse(layout, value); err == nil {
			d := t.Sub(now)
			if d < 0 {
				d = 0
			}
			return d, true
		}
	}

	return 0, false
}
