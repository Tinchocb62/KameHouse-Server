package util

import (
	"net"
	"net/url"
)

// IsValidProxyURL tests whether a URL is secure to proxy (blocks SSRF to localhost/private network)
func IsValidProxyURL(rawURL string) bool {
	u, err := url.Parse(rawURL)
	if err != nil {
		return false
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return false
	}

	host := u.Hostname()
	ips, err := net.LookupIP(host)
	if err != nil {
		// If LookupIP fails, try ParseIP in case it's already an IP string
		ip := net.ParseIP(host)
		if ip == nil {
			return false
		}
		ips = []net.IP{ip}
	}

	for _, ip := range ips {
		if ip.IsPrivate() || ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsUnspecified() {
			return false
		}
	}

	return true
}
