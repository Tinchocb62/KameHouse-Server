package util

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"kamehouse/internal/util"
	"net/http"
	"os"
	"path/filepath"

	"github.com/imroc/req/v3"
	"github.com/labstack/echo/v4"
)

type ImageProxy struct {
	CacheDir string
}

func (ip *ImageProxy) getCachePath(url string) string {
	dir := ip.CacheDir
	if dir == "" {
		dir = filepath.Join(os.TempDir(), "kamehouse_image_cache")
	}
	_ = os.MkdirAll(dir, 0755)
	hash := sha256.Sum256([]byte(url))
	return filepath.Join(dir, hex.EncodeToString(hash[:])+".cache")
}

func (ip *ImageProxy) GetImage(url string, headers map[string]string) ([]byte, string, error) {
	cachePath := ip.getCachePath(url)
	if data, err := os.ReadFile(cachePath); err == nil && len(data) > 0 {
		contentType := http.DetectContentType(data)
		return data, contentType, nil
	}

	request := req.C().NewRequest()

	for key, value := range headers {
		request.SetHeader(key, value)
	}

	resp, err := request.Get(url)
	if err != nil {
		return nil, "", err
	}
	defer resp.Body.Close()

	const maxImageSize = 25 * 1024 * 1024 // 25 MB limit
	lr := io.LimitReader(resp.Body, maxImageSize+1)
	body, err := io.ReadAll(lr)
	if err != nil {
		return nil, "", err
	}
	if len(body) > maxImageSize {
		return nil, "", fmt.Errorf("ssrf proxy: image exceeds maximum allowed size of 25MB")
	}

	// Persist to disk cache
	_ = os.WriteFile(cachePath, body, 0644)

	contentType := resp.Header.Get("Content-Type")
	if contentType == "" {
		contentType = http.DetectContentType(body)
	}

	return body, contentType, nil
}

func (ip *ImageProxy) setHeaders(c echo.Context, contentType string) {
	if contentType == "" {
		contentType = "image/jpeg"
	}
	c.Response().Header().Set("Content-Type", contentType)
	c.Response().Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	c.Response().Header().Set("Access-Control-Allow-Origin", "*")
	c.Response().Header().Set("Access-Control-Allow-Methods", "GET")
	c.Response().Header().Set("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
	c.Response().Header().Set("Access-Control-Allow-Credentials", "true")
}

func (ip *ImageProxy) ProxyImage(c echo.Context) (err error) {
	defer util.HandlePanicInModuleWithError("util/ImageProxy", &err)

	url := c.QueryParam("url")
	if url == "" {
		return c.String(echo.ErrBadRequest.Code, "No URL provided")
	}

	if !util.IsValidProxyURL(url) {
		return c.String(echo.ErrForbidden.Code, "SSRF blocked: invalid proxy URL")
	}

	headers := make(map[string]string)
	headersJSON := c.QueryParam("headers")
	if headersJSON != "" {
		_ = json.Unmarshal([]byte(headersJSON), &headers)
	}

	imageBuffer, contentType, err := ip.GetImage(url, headers)
	if err != nil {
		return c.String(echo.ErrInternalServerError.Code, "Error fetching image")
	}

	ip.setHeaders(c, contentType)
	return c.Blob(http.StatusOK, contentType, imageBuffer)
}
