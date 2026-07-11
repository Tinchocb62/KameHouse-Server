package handlers

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"fmt"
	"io/fs"
	"kamehouse/internal/constants"
	"os"
	"path/filepath"
	"runtime"
	"time"

	"github.com/labstack/echo/v4"
)

// HandleBackupDatabase ...
//
//	@summary triggers a real SQLite DB backup.
//	@route /api/v1/db/backup [POST]
//	@returns db.BackupResult
func (h *Handler) HandleBackupDatabase(c echo.Context) error {
	backupDir := filepath.Join(h.App.Config.Data.AppDataDir, "backups")
	res, err := h.App.Database.Backup(backupDir, 5) // Keep last 5 backups
	if err != nil {
		h.App.Logger.Error().Err(err).Msg("handlers: Failed to backup database")
		return h.RespondWithError(c, err)
	}

	return h.RespondWithData(c, res)
}

// HandleGetDiagnosticsReport ...
//
//	@summary streams a zip archive with diagnostics data.
//	@route /api/v1/report [GET]
func (h *Handler) HandleGetDiagnosticsReport(c echo.Context) error {
	buf := new(bytes.Buffer)
	zipWriter := zip.NewWriter(buf)

	// 1. Logs
	if h.App.OnFlushLogs != nil {
		h.App.OnFlushLogs()
		time.Sleep(100 * time.Millisecond)
	}
	logPath, err := h.latestServerLogPath()
	if err == nil {
		logContent, err := os.ReadFile(logPath)
		if err == nil {
			f, _ := zipWriter.Create("logs/latest.log")
			_, _ = f.Write(logContent)
		}
	}

	// 2. Settings (Redacted)
	settings, err := h.App.Database.GetSettings()
	if err == nil && settings != nil {
		// GetSettings returns the shared cached pointer (db.CurrSettings); copy
		// before redacting so the live in-memory API keys are not destroyed.
		settingsCopy := *settings
		redact := func(s string) string {
			if s != "" {
				return "<redacted>"
			}
			return s
		}
		settingsCopy.Library.TmdbApiKey = redact(settingsCopy.Library.TmdbApiKey)
		settingsCopy.Library.FanartApiKey = redact(settingsCopy.Library.FanartApiKey)
		settingsCopy.Library.OmdbApiKey = redact(settingsCopy.Library.OmdbApiKey)

		settingsJSON, _ := json.MarshalIndent(&settingsCopy, "", "  ")
		f, _ := zipWriter.Create("settings.json")
		_, _ = f.Write(settingsJSON)
	}

	// 3. Runtime
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	runtimeInfo := map[string]interface{}{
		"version":      constants.Version,
		"versionName":  constants.VersionName,
		"goVersion":    runtime.Version(),
		"goOS":         runtime.GOOS,
		"goArch":       runtime.GOARCH,
		"numCPU":       runtime.NumCPU(),
		"numGoroutine": runtime.NumGoroutine(),
		"memStats":     mapMemStats(m),
	}
	runtimeJSON, _ := json.MarshalIndent(runtimeInfo, "", "  ")
	f, _ := zipWriter.Create("runtime.json")
	_, _ = f.Write(runtimeJSON)

	// 4. Disk Usage
	fileCacheSize, _ := h.App.FileCacher.GetTotalSize()
	videoFilesSize, _ := h.App.FileCacher.GetMediastreamVideoFilesTotalSize()
	
	// Get DB size
	var dbSize int64
	dbInfo, err := os.Stat(filepath.Join(h.App.Config.Data.AppDataDir, h.App.Config.Database.Name+".db"))
	if err == nil {
		dbSize = dbInfo.Size()
	}

	diskUsage := map[string]interface{}{
		"fileCacheBytes":    fileCacheSize,
		"videoFilesBytes":   videoFilesSize,
		"databaseBytes":     dbSize,
		"transcodeDirBytes": dirSizeBytes(h.App.Config.Cache.TranscodeDir),
		"logsDirBytes":      dirSizeBytes(h.App.Config.Logs.Dir),
	}
	diskUsageJSON, _ := json.MarshalIndent(diskUsage, "", "  ")
	f2, _ := zipWriter.Create("disk-usage.json")
	_, _ = f2.Write(diskUsageJSON)

	zipWriter.Close()

	timestamp := time.Now().Format("2006-01-02_15-04-05")
	filename := fmt.Sprintf("kamehouse-diagnostics-%s.zip", timestamp)

	c.Response().Header().Set("Content-Type", "application/zip")
	c.Response().Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	
	_, err = c.Response().Write(buf.Bytes())
	return err
}

func dirSizeBytes(root string) int64 {
	var total int64
	_ = filepath.WalkDir(root, func(_ string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return nil
		}
		if info, e := d.Info(); e == nil {
			total += info.Size()
		}
		return nil
	})
	return total
}
