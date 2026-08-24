package ffmpegutil

// FFmpegStatus represents the runtime status of FFmpeg and FFprobe binaries.
type FFmpegStatus struct {
	FFmpegAvailable  bool   `json:"ffmpegAvailable"`
	FFprobeAvailable bool   `json:"ffprobeAvailable"`
	FFmpegPath       string `json:"ffmpegPath"`
	FFprobePath      string `json:"ffprobePath"`
	FFmpegVersion    string `json:"ffmpegVersion"`
	FFprobeVersion   string `json:"ffprobeVersion"`
	IsDownloading    bool   `json:"isDownloading"`
	DownloadProgress int    `json:"downloadProgress"` // 0-100 percentage
	DownloadStatus   string `json:"downloadStatus"`   // Status message, e.g. "Downloading FFprobe..."
	LastError        string `json:"lastError,omitempty"`
}

// ProgressCallback is called during download and extraction with progress (0-100) and a status description.
type ProgressCallback func(percent int, status string)
