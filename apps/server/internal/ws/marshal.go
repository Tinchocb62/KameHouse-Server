package ws

import "github.com/goccy/go-json"

// marshalEvent encodes a WSEvent into its JSON wire representation.
// Using go-json for a ~3x serialization speed-up over encoding/json.
func marshalEvent(e WSEvent) ([]byte, error) {
	return json.Marshal(e)
}
