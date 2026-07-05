package handlers

import (
	"errors"
	"net/http"

	"github.com/labstack/echo/v4"
)

// ─────────────────────────────────────────────────────────────────────────────
// APIResponse — the single JSON contract for every API endpoint.
//
// Invariant: Data and Error are mutually exclusive — exactly one is populated
// per response. This guarantees a predictable shape for the TypeScript client.
// ─────────────────────────────────────────────────────────────────────────────

// APIResponse is the canonical response envelope.
// Use JSONSuccess / JSONError to construct; never populate both fields.
// Note: Data intentionally does NOT use `omitempty`. A nil/zero Data (e.g. a
// "record not found" response returning nil) must still serialize as
// `{"data":null}` so the TypeScript client's `"data" in json` invariant holds.
// With omitempty the key vanished and the client threw "missing 'data'".
type APIResponse[T any] struct {
	Data  T      `json:"data"`
	Error string `json:"error,omitempty"`
}

// JSONSuccess serialises data as 200 OK inside APIResponse.Data.
func JSONSuccess[T any](c echo.Context, data T) error {
	return c.JSON(http.StatusOK, APIResponse[T]{Data: data})
}

// JSONError serialises err as the given HTTP status inside APIResponse.Error.
func JSONError(c echo.Context, err error, statusCode int) error {
	msg := "internal server error"
	if err != nil {
		msg = err.Error()
	}
	return c.JSON(statusCode, APIResponse[any]{Error: msg})
}

// ─────────────────────────────────────────────────────────────────────────────
// CustomHTTPErrorHandler — Echo global error handler.
//
// Intercepts all unhandled Echo errors (404, 405, panics recovered by
// middleware.Recover, etc.) and forces them into APIResponse format so the
// TypeScript client never receives an unexpected plain-text or HTML body.
// ─────────────────────────────────────────────────────────────────────────────

func CustomHTTPErrorHandler(err error, c echo.Context) {
	if c.Response().Committed {
		return
	}
	code := http.StatusInternalServerError
	msg := "internal server error"

	var he *echo.HTTPError
	if errors.As(err, &he) {
		code = he.Code
		if s, ok := he.Message.(string); ok {
			msg = s
		}
	} else if err != nil {
		msg = err.Error()
	}

	// Silence the error from c.JSON itself — if the connection is already
	// broken there is nothing useful we can do.
	_ = c.JSON(code, APIResponse[any]{Error: msg})
}

// ─────────────────────────────────────────────────────────────────────────────
// SeaResponse — legacy alias kept for backward compatibility.
//
// Existing handlers that call NewDataResponse / NewErrorResponse / RespondWithData
// continue to work unchanged. New handlers should use JSONSuccess / JSONError.
// ─────────────────────────────────────────────────────────────────────────────

// SeaResponse is a type alias for APIResponse retained for existing call sites.
type SeaResponse[R any] = APIResponse[R]

// NewDataResponse wraps data in a success envelope (legacy helper).
func NewDataResponse[R any](data R) SeaResponse[R] {
	return SeaResponse[R]{Data: data}
}

// NewErrorResponse wraps an error in an error envelope (legacy helper).
func NewErrorResponse(err error) SeaResponse[any] {
	if err == nil {
		return SeaResponse[any]{Error: "unknown error"}
	}
	return SeaResponse[any]{Error: err.Error()}
}
