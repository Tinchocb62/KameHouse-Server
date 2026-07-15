package test_utils

import (
	"fmt"
	"log"
	"os"
	"testing"

	"github.com/spf13/viper"
)

var ConfigData = &Config{}

const (
	TwoLevelDeepTestConfigPath   = "../../test"
	TwoLevelDeepDataPath         = "../../test/data"
	TwoLevelDeepTestDataPath     = "../../test/testdata"
	ThreeLevelDeepTestConfigPath = "../../../test"
	ThreeLevelDeepDataPath       = "../../../test/data"
	ThreeLevelDeepTestDataPath   = "../../../test/testdata"
)

var ConfigPath = ThreeLevelDeepTestConfigPath
var TestDataPath = ThreeLevelDeepTestDataPath
var DataPath = ThreeLevelDeepDataPath

type (
	Config struct {
		Provider ProviderConfig `mapstructure:"provider"`
		Path     PathConfig     `mapstructure:"path"`
		Database DatabaseConfig `mapstructure:"database"`
		Flags    FlagsConfig    `mapstructure:"flags"`
	}

	FlagsConfig struct {
	}

	ProviderConfig struct {
		MpcHost              string `mapstructure:"mpc_host"`
		MpcPort              int    `mapstructure:"mpc_port"`
		MpcPath              string `mapstructure:"mpc_path"`
		VlcHost              string `mapstructure:"vlc_host"`
		VlcPort              int    `mapstructure:"vlc_port"`
		VlcPassword          string `mapstructure:"vlc_password"`
		VlcPath              string `mapstructure:"vlc_path"`
		MpvPath              string `mapstructure:"mpv_path"`
		MpvSocket            string `mapstructure:"mpv_socket"`
		IinaPath             string `mapstructure:"iina_path"`
		IinaSocket           string `mapstructure:"iina_socket"`
		TorBoxApiKey         string `mapstructure:"torbox_api_key"`
		RealDebridApiKey     string `mapstructure:"realdebrid_api_key"`
	}
	PathConfig struct {
		DataDir string `mapstructure:"dataDir"`
	}

	DatabaseConfig struct {
		Name string `mapstructure:"name"`
	}

	FlagFunc func() bool
)

// InitTestProvider populates the ConfigData and skips the test if the given flags are not set.
// Tests that reach it without a local test config are skipped: the config points at real media
// paths on the developer's machine and is not checked into the repo.
func InitTestProvider(t *testing.T, args ...FlagFunc) {
	if os.Getenv("TEST_CONFIG_PATH") == "" {
		err := os.Setenv("TEST_CONFIG_PATH", ConfigPath)
		if err != nil {
			log.Fatalf("couldn't set TEST_CONFIG_PATH: %s", err)
		}
	}

	c, err := getConfig()
	if err != nil {
		t.Skipf("skipping: no test config found (%s). Create %s/config.toml to run this test.", err, os.Getenv("TEST_CONFIG_PATH"))
	}
	ConfigData = c

	for _, fn := range args {
		if !fn() {
			t.Skip()
			break
		}
	}
}

func SetTestConfigPath(path string) {
	err := os.Setenv("TEST_CONFIG_PATH", path)
	if err != nil {
		log.Fatalf("couldn't set TEST_CONFIG_PATH: %s", err)
	}
}
func SetTwoLevelDeep() {
	ConfigPath = TwoLevelDeepTestConfigPath
	TestDataPath = TwoLevelDeepTestDataPath
	DataPath = TwoLevelDeepDataPath
}

func getConfig() (*Config, error) {
	configPath, exists := os.LookupEnv("TEST_CONFIG_PATH")
	if !exists {
		return nil, fmt.Errorf("TEST_CONFIG_PATH not set")
	}

	v := viper.New()
	v.SetConfigName("config")
	v.AddConfigPath(configPath)
	if err := v.ReadInConfig(); err != nil {
		return nil, err
	}
	var c Config
	if err := v.Unmarshal(&c); err != nil {
		return nil, fmt.Errorf("couldn't read config: %w", err)
	}
	return &c, nil
}
