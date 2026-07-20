package handlers

import (
	"errors"

	"kamehouse/internal/mediastream/pretranscode"

	"github.com/labstack/echo/v4"
)

// preTranscoder resolves the pre-transcode manager, which only exists while the
// feature is enabled in Settings → Streaming.
func (h *Handler) preTranscoder() (*pretranscode.Manager, error) {
	m, ok := h.App.MediastreamRepository.PreTranscoder()
	if !ok {
		return nil, errors.New("La pre-transcodificación está desactivada. Actívala en Ajustes -> Streaming.")
	}
	return m, nil
}

// HandleEnqueuePreTranscode queues a file for background pre-transcoding.
//
//	@summary queue a file for pre-transcoding.
//	@desc Queues a library file to be transcoded to HLS in the background so it plays instantly later.
//	@returns pretranscode.PreTranscodeJob
//	@route /api/v1/mediastream/pretranscode [POST]
func (h *Handler) HandleEnqueuePreTranscode(c echo.Context) error {
	type body struct {
		Path string `json:"path"`
	}

	var b body
	if err := c.Bind(&b); err != nil {
		return h.RespondWithError(c, err)
	}
	if b.Path == "" {
		return h.RespondWithError(c, errors.New("path is required"))
	}

	m, err := h.preTranscoder()
	if err != nil {
		return h.RespondWithError(c, err)
	}

	job, err := m.Enqueue(b.Path)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	return h.RespondWithData(c, job)
}

// HandleGetPreTranscodeJobs lists every tracked pre-transcode job.
//
//	@summary list pre-transcode jobs.
//	@desc Returns the pre-transcode queue with each job's status and progress.
//	@returns []pretranscode.PreTranscodeJob
//	@route /api/v1/mediastream/pretranscode [GET]
func (h *Handler) HandleGetPreTranscodeJobs(c echo.Context) error {
	m, err := h.preTranscoder()
	if err != nil {
		// An empty queue is the honest answer when the feature is off — the client
		// polls this to render a list and shouldn't have to special-case an error.
		return h.RespondWithData(c, []*pretranscode.PreTranscodeJob{})
	}

	return h.RespondWithData(c, m.Jobs())
}

// HandleCancelPreTranscode cancels a queued or running pre-transcode and drops
// its partial output.
//
//	@summary cancel a pre-transcode job.
//	@desc Cancels a queued or running pre-transcode job and deletes its partial output.
//	@returns bool
//	@route /api/v1/mediastream/pretranscode/:hash [DELETE]
func (h *Handler) HandleCancelPreTranscode(c echo.Context) error {
	hash := c.Param("hash")
	if hash == "" {
		return h.RespondWithError(c, errors.New("hash is required"))
	}

	m, err := h.preTranscoder()
	if err != nil {
		return h.RespondWithError(c, err)
	}

	if err := m.Delete(hash); err != nil {
		return h.RespondWithError(c, err)
	}

	return h.RespondWithData(c, true)
}
