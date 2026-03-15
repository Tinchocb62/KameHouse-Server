package core

import (
	"errors"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strings"

	"github.com/rs/zerolog"
	"github.com/spf13/viper"

	"kamehouse/internal/constants"
	"kamehouse/internal/util"
)

// Config represents the strictly-typed application configuration.
type Config struct {
	Version string `mapstructure:"version"`
	Server  struct {
		Host          string `mapstructure:"host"`
		Port          int    `mapstructure:"port"`
		Offline       bool   `mapstructure:"offline"`
		UseBinaryPath bool   `mapstructure:"useBinaryPath"`
		Systray       bool   `mapstructure:"systray"`
		DoHUrl        string `mapstructure:"dohUrl"`
		Password      string `mapstructure:"password"`
		Tls           struct {
			Enabled  bool   `mapstructure:"enabled"`
			CertPath string `mapstructure:"certPath"`
			KeyPath  string `mapstructure:"keyPath"`
		} `mapstructure:"tls"`
	} `mapstructure:"server"`
	Database struct {
		Name string `mapstructure:"name"`
	} `mapstructure:"database"`
	Web struct {
		AssetDir string `mapstructure:"assetDir"`
	} `mapstructure:"web"`
	Logs struct {
		Dir string `mapstructure:"dir"`
	} `mapstructure:"logs"`
	Cache struct {
		Dir          string `mapstructure:"dir"`
		TranscodeDir string `mapstructure:"transcodeDir"`
	} `mapstructure:"cache"`
	Offline struct {
		Dir      string `mapstructure:"dir"`
		AssetDir string `mapstructure:"assetDir"`
	} `mapstructure:"offline"`
	Manga struct {
		DownloadDir string `mapstructure:"downloadDir"`
		LocalDir    string `mapstructure:"localDir"`
	} `mapstructure:"manga"`
	Data struct {
		AppDataDir string
		WorkingDir string
	} `mapstructure:"-"`
	Extensions struct {
		Dir string `mapstructure:"dir"`
	} `mapstructure:"extensions"`
	Anilist struct {
		ClientID string `mapstructure:"clientID"`
	} `mapstructure:"anilist"`
	Experimental struct {
		MainServerTorrentStreaming bool `mapstructure:"mainServerTorrentStreaming"`
	} `mapstructure:"experimental"`
}

type ConfigOptions struct {
	Flags           KameHouseFlags
	OnVersionChange []func(oldVersion string, newVersion string)
	EmbeddedLogo    []byte
}

// ProvideConfig acts as a Dependency Injection (e.g. Wire) provider.
// Enforces a fail-fast pattern by panicking synchronously upon failure.
func ProvideConfig(opts *ConfigOptions, logger *zerolog.Logger) *Config {
	cfg, err := NewConfig(opts, logger)
	if err != nil {
		logger.Fatal().Err(err).Msg("Configuration validation failed during startup sequence")
		panic(fmt.Errorf("fatal configuration error: %w", err))
	}
	return cfg
}

func NewConfig(options *ConfigOptions, logger *zerolog.Logger) (*Config, error) {
	flags := options.Flags
	logger.Debug().Msg("app: Initializing robust config")

	dataDir := ""
	if v := os.Getenv("KAMEHOUSE_DATA_DIR"); v != "" {
		dataDir = v
	}
	if flags.DataDir != "" {
		dataDir = flags.DataDir
	}

	dataDir, configPath, err := initAppDataDir(dataDir, logger)
	if err != nil {
		return nil, err
	}
	_ = os.Setenv("KAMEHOUSE_DATA_DIR", dataDir)
	_ = os.MkdirAll(filepath.Join(dataDir, "assets"), 0700)

	// Thread-safe local viper instance avoids global lock contention & cross-test bleeding
	v := viper.New()
	v.SetConfigFile(configPath)
	v.SetConfigType("toml")
	v.SetEnvPrefix("KAMEHOUSE")
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()

	setDefaults(v)

	if err := createConfigFile(configPath); err != nil {
		return nil, err
	}

	if err := v.ReadInConfig(); err != nil {
		return nil, err
	}

	// Dynamic override propagation
	if flags.Host != "" {
		v.Set("server.host", flags.Host)
	}
	if flags.Port != 0 {
		v.Set("server.port", flags.Port)
	}
	if flags.Password != "" {
		v.Set("server.password", flags.Password)
	} else if flags.DisablePassword {
		v.Set("server.password", "")
	}

	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, err
	}

	expandEnvironmentValues(&cfg)
	cfg.Data.AppDataDir = dataDir

	wd, err := getWorkingDir(cfg.Server.UseBinaryPath)
	if err != nil {
		return nil, err
	}
	cfg.Data.WorkingDir = filepath.FromSlash(wd)
	_ = os.Setenv("KAMEHOUSE_WORKING_DIR", cfg.Data.WorkingDir)

	if cfg.Server.Tls.Enabled && (cfg.Server.Tls.CertPath == "" || cfg.Server.Tls.KeyPath == "") {
		cfg.Server.Tls.CertPath = filepath.FromSlash(filepath.Join(dataDir, "certs", "cert.pem"))
		cfg.Server.Tls.KeyPath = filepath.FromSlash(filepath.Join(dataDir, "certs", "key.pem"))
	}

	if err := validateConfig(&cfg); err != nil {
		return nil, err
	}

	if cfg.Version != constants.Version {
		for _, f := range options.OnVersionChange {
			f(cfg.Version, constants.Version)
		}
		cfg.Version = constants.Version
		v.Set("version", constants.Version)
		_ = v.WriteConfig() // Best-effort save on version progression
	}

	go loadLogo(options.EmbeddedLogo, dataDir)

	// Since Config is deeply populated once and immediately returned via points,
	// subsequent reads are strictly immutable requiring zero locks.
	return &cfg, nil
}

func setDefaults(v *viper.Viper) {
	v.SetDefault("version", constants.Version)
	v.SetDefault("server.host", "127.0.0.1")
	v.SetDefault("server.port", 43211)
	v.SetDefault("server.offline", false)
	v.SetDefault("server.useBinaryPath", true)
	v.SetDefault("database.name", "kamehouse")
	v.SetDefault("web.assetDir", "$KAMEHOUSE_DATA_DIR/assets")
	v.SetDefault("cache.dir", "$KAMEHOUSE_DATA_DIR/cache")
	v.SetDefault("cache.transcodeDir", "$KAMEHOUSE_DATA_DIR/cache/transcode")
	v.SetDefault("manga.downloadDir", "$KAMEHOUSE_DATA_DIR/manga")
	v.SetDefault("manga.localDir", "$KAMEHOUSE_DATA_DIR/manga-local")
	v.SetDefault("logs.dir", "$KAMEHOUSE_DATA_DIR/logs")
	v.SetDefault("offline.dir", "$KAMEHOUSE_DATA_DIR/offline")
	v.SetDefault("offline.assetDir", "$KAMEHOUSE_DATA_DIR/offline/assets")
	v.SetDefault("extensions.dir", "$KAMEHOUSE_DATA_DIR/extensions")
}

func initAppDataDir(defined string, logger *zerolog.Logger) (string, string, error) {
	var dataDir string
	if defined != "" {
		dataDir = filepath.FromSlash(os.ExpandEnv(defined))
		if !filepath.IsAbs(dataDir) {
			return "", "", errors.New("data directory path must be absolute")
		}
		logger.Trace().Str("dataDir", dataDir).Msg("app: Overriding default data directory")
	} else {
		ucd, err := os.UserConfigDir()
		if err != nil {
			return "", "", err
		}
		dataDir = filepath.Join(ucd, "KameHouse")
	}

	if err := os.MkdirAll(dataDir, 0700); err != nil {
		return "", "", err
	}
	configPath := filepath.FromSlash(filepath.Join(dataDir, constants.ConfigFileName))
	return filepath.FromSlash(dataDir), configPath, nil
}

func validateConfig(cfg *Config) error {
	checks := []struct {
		cond bool
		msg  string
	}{
		{cfg.Server.Host == "", "server.host cannot be empty"},
		{cfg.Server.Port <= 0 || cfg.Server.Port > 65535, "server.port must be valid (1-65535)"},
		{cfg.Database.Name == "", "database.name cannot be empty"},
		{cfg.Web.AssetDir == "" || !filepath.IsAbs(cfg.Web.AssetDir), "web.assetDir must be an absolute path"},
		{cfg.Cache.Dir == "" || !filepath.IsAbs(cfg.Cache.Dir), "cache.dir must be an absolute path"},
		{cfg.Cache.TranscodeDir == "" || !filepath.IsAbs(cfg.Cache.TranscodeDir), "cache.transcodeDir must be an absolute path"},
		{cfg.Logs.Dir == "" || !filepath.IsAbs(cfg.Logs.Dir), "logs.dir must be an absolute path"},
		{cfg.Extensions.Dir == "" || !filepath.IsAbs(cfg.Extensions.Dir), "extensions.dir must be an absolute path"},
	}

	for _, check := range checks {
		if check.cond {
			return fmt.Errorf("config validation failed: %s", check.msg)
		}
	}

	if cfg.Server.Tls.Enabled {
		if cfg.Server.Tls.CertPath == "" || !filepath.IsAbs(cfg.Server.Tls.CertPath) {
			return errors.New("server.tls.certPath must be an absolute path when TLS is enabled")
		}
		if cfg.Server.Tls.KeyPath == "" || !filepath.IsAbs(cfg.Server.Tls.KeyPath) {
			return errors.New("server.tls.keyPath must be an absolute path when TLS is enabled")
		}
	}

	return nil
}

func isValidURL(raw string) bool {
	u, err := url.Parse(raw)
	return err == nil && u.Scheme != "" && u.Host != "" && (u.Scheme == "http" || u.Scheme == "https")
}

func expandEnvironmentValues(cfg *Config) {
	cfg.Web.AssetDir = expandPath(cfg.Web.AssetDir)
	cfg.Cache.Dir = expandPath(cfg.Cache.Dir)
	cfg.Cache.TranscodeDir = expandPath(cfg.Cache.TranscodeDir)
	cfg.Logs.Dir = expandPath(cfg.Logs.Dir)
	cfg.Manga.DownloadDir = expandPath(cfg.Manga.DownloadDir)
	cfg.Manga.LocalDir = expandPath(cfg.Manga.LocalDir)
	cfg.Offline.Dir = expandPath(cfg.Offline.Dir)
	cfg.Offline.AssetDir = expandPath(cfg.Offline.AssetDir)
	cfg.Extensions.Dir = expandPath(cfg.Extensions.Dir)
	cfg.Server.Tls.CertPath = expandPath(cfg.Server.Tls.CertPath)
	cfg.Server.Tls.KeyPath = expandPath(cfg.Server.Tls.KeyPath)
}

func expandPath(p string) string {
	if p == "" {
		return ""
	}
	return filepath.FromSlash(os.ExpandEnv(p))
}

func getWorkingDir(useBinaryPath bool) (string, error) {
	wd, err := os.Getwd()
	if err != nil {
		return "", err
	}
	if useBinaryPath {
		if exe, err := os.Executable(); err == nil {
			if p, err := filepath.EvalSymlinks(exe); err == nil {
				return filepath.Dir(p), nil
			}
		}
	}
	return wd, nil
}

func createConfigFile(path string) error {
	if _, err := os.Stat(path); os.IsNotExist(err) {
		if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
			return err
		}
		return os.WriteFile(path, []byte(defaultConfigTemplate), 0600)
	}
	return nil
}

func loadLogo(logo []byte, dataDir string) {
	if len(logo) == 0 {
		return
	}
	var err error
	defer util.HandlePanicInModuleWithError("core/loadLogo", &err)
	logoPath := filepath.Join(dataDir, "KameHouse-logo.png")
	if _, err := os.Stat(logoPath); os.IsNotExist(err) {
		_ = os.WriteFile(logoPath, logo, 0644)
	}
}

// GetServerAddr returns the binding address safely.
func (cfg *Config) GetServerAddr(df ...string) string {
	return fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port)
}

// GetServerURI returns the full web URL.
func (cfg *Config) GetServerURI(df ...string) string {
	scheme := "http"
	if cfg.Server.Tls.Enabled {
		scheme = "https"
	}
	if cfg.Server.Host == "" || cfg.Server.Host == "0.0.0.0" {
		host := ""
		if len(df) > 0 {
			host = df[0]
		}
		if host != "" {
			return fmt.Sprintf("%s://%s:%d", scheme, host, cfg.Server.Port)
		}
		return fmt.Sprintf(":%d", cfg.Server.Port)
	}
	return fmt.Sprintf("%s://%s:%d", scheme, cfg.Server.Host, cfg.Server.Port)
}

const defaultConfigTemplate = `# KameHouse Configuration
version = "3.5.0"

[server]
host = "127.0.0.1"
port = 43211
offline = false
useBinaryPath = true
password = ""

[server.tls]
enabled = false
certPath = "$KAMEHOUSE_DATA_DIR/certs/cert.pem"
keyPath = "$KAMEHOUSE_DATA_DIR/certs/key.pem"

[database]
name = "kamehouse"

[web]
assetDir = "$KAMEHOUSE_DATA_DIR/assets"

[logs]
dir = "$KAMEHOUSE_DATA_DIR/logs"

[cache]
dir = "$KAMEHOUSE_DATA_DIR/cache"
transcodeDir = "$KAMEHOUSE_DATA_DIR/cache/transcode"

[offline]
dir = "$KAMEHOUSE_DATA_DIR/offline"
assetDir = "$KAMEHOUSE_DATA_DIR/offline/assets"

[manga]
downloadDir = "$KAMEHOUSE_DATA_DIR/manga"
localDir = "$KAMEHOUSE_DATA_DIR/manga-local"

[extensions]
dir = "$KAMEHOUSE_DATA_DIR/extensions"
`
