package util

import (
	"net"
	"sync"
	"time"
)

// ipCache guards a short-lived cache for GetLocalIPv4Addresses.
// Local IPs rarely change, so 30 s is a safe TTL that avoids repeated syscalls
// on hot paths like /api/v1/status which is called on every page load.
var (
	ipCacheMu     sync.RWMutex
	ipCacheList   []string
	ipCacheExpiry time.Time
	ipCacheTTL    = 30 * time.Second
)

// GetLocalIPv4Addresses retrieves all non-loopback local IPv4 addresses.
// Results are cached for ipCacheTTL to avoid repeated network-interface syscalls.
func GetLocalIPv4Addresses() []string {
	ipCacheMu.RLock()
	if time.Now().Before(ipCacheExpiry) {
		result := ipCacheList
		ipCacheMu.RUnlock()
		return result
	}
	ipCacheMu.RUnlock()

	var ipAddresses []string
	interfaces, err := net.Interfaces()
	if err != nil {
		return ipAddresses
	}
	for _, iface := range interfaces {
		if iface.Flags&net.FlagLoopback != 0 || iface.Flags&net.FlagUp == 0 {
			continue
		}
		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}
		for _, addr := range addrs {
			var ip net.IP
			switch v := addr.(type) {
			case *net.IPNet:
				ip = v.IP
			case *net.IPAddr:
				ip = v.IP
			}
			if ip == nil || ip.IsLoopback() {
				continue
			}
			ip = ip.To4()
			if ip == nil {
				continue
			}
			ipAddresses = append(ipAddresses, ip.String())
		}
	}

	ipCacheMu.Lock()
	ipCacheList = ipAddresses
	ipCacheExpiry = time.Now().Add(ipCacheTTL)
	ipCacheMu.Unlock()

	return ipAddresses
}
