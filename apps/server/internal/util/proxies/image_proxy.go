package util

import (
	"encoding/json"
	"fmt"
	"io"
	"kamehouse/internal/util"
	"net/http"

	"github.com/imroc/req/v3"
	"github.com/labstack/echo/v4"
)

// IsValidProxyURL tests whether a URL is secure to proxy (blocks SSRF to localhost/private network)
// (Moved to util/url.go)

type ImageProxy struct{}

func (ip *ImageProxy) GetImage(url string, headers map[string]string) ([]byte, error) {
	request := req.C().NewRequest()

	for key, value := range headers {
		request.SetHeader(key, value)
	}

	resp, err := request.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	const maxImageSize = 25 * 1024 * 1024 // 25 MB limit
	lr := io.LimitReader(resp.Body, maxImageSize+1)
	body, err := io.ReadAll(lr)
	if err != nil {
		return nil, err
	}
	if len(body) > maxImageSize {
		return nil, fmt.Errorf("ssrf proxy: image exceeds maximum allowed size of 25MB")
	}

	return body, nil
}

func (ip *ImageProxy) setHeaders(c echo.Context) {
	c.Response().Header().Set("Content-Type", "image/jpeg")
	c.Response().Header().Set("Cache-Control", "public, max-age=31536000")
	c.Response().Header().Set("Access-Control-Allow-Origin", "*")
	c.Response().Header().Set("Access-Control-Allow-Methods", "GET")
	c.Response().Header().Set("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
	c.Response().Header().Set("Access-Control-Allow-Credentials", "true")
}

func (ip *ImageProxy) ProxyImage(c echo.Context) (err error) {
	defer util.HandlePanicInModuleWithError("util/ImageProxy", &err)

	url := c.QueryParam("url")
	headersJSON := c.QueryParam("headers")

	if url == "" || headersJSON == "" {
		return c.String(echo.ErrBadRequest.Code, "No URL provided")
	}

	if !util.IsValidProxyURL(url) {
		return c.String(echo.ErrForbidden.Code, "SSRF blocked: invalid proxy URL")
	}

	headers := make(map[string]string)
	if err := json.Unmarshal([]byte(headersJSON), &headers); err != nil {
		return c.String(echo.ErrBadRequest.Code, "Error parsing headers JSON")
	}

	ip.setHeaders(c)
	imageBuffer, err := ip.GetImage(url, headers)
	if err != nil {
		return c.String(echo.ErrInternalServerError.Code, "Error fetching image")
	}

	return c.Blob(http.StatusOK, c.Response().Header().Get("Content-Type"), imageBuffer)
}
