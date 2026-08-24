use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;

use log::{error, info, warn};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, Runtime};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowBounds {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

impl WindowBounds {
    pub fn is_valid(&self) -> bool {
        self.width > 0 && self.height > 0 && self.x > -10000 && self.y > -10000
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DesktopSettings {
    pub minimize_to_tray: bool,
    pub open_in_background: bool,
    pub open_at_launch: bool,
    pub update_channel: String,
    pub window_bounds: Option<WindowBounds>,
    pub window_maximized: bool,
    pub disable_hardware_acceleration: bool,
    pub enable_aggressive_gpu_flags: bool,
    /// Custom path to the mpv binary; empty/None resolves "mpv" from PATH.
    #[serde(default)]
    pub mpv_path: Option<String>,
}

impl Default for DesktopSettings {
    fn default() -> Self {
        Self {
            minimize_to_tray: true,
            open_in_background: false,
            open_at_launch: false,
            update_channel: "github".to_string(),
            window_bounds: None,
            window_maximized: true,
            disable_hardware_acceleration: false,
            enable_aggressive_gpu_flags: false,
            mpv_path: None,
        }
    }
}

pub struct SettingsManager {
    settings: Arc<std::sync::RwLock<DesktopSettings>>,
}

impl SettingsManager {
    pub fn new() -> Self {
        Self {
            settings: Arc::new(std::sync::RwLock::new(DesktopSettings::default())),
        }
    }

    pub fn get_settings_path<R: Runtime>(&self, app_handle: &AppHandle<R>) -> PathBuf {
        let app_data = app_handle
            .path()
            .app_data_dir()
            .unwrap_or_else(|_| {
                dirs::data_dir()
                    .unwrap_or_else(|| std::env::current_dir().unwrap_or_default())
                    .join("KameHouse")
            });
        app_data.join("denshi-settings.json")
    }

    pub fn load<R: Runtime>(&self, app_handle: &AppHandle<R>) -> DesktopSettings {
        let path = self.get_settings_path(app_handle);
        self.load_from_path(&path)
    }

    pub fn load_from_path(&self, path: &PathBuf) -> DesktopSettings {
        let mut settings = self.settings.write().unwrap();

        if path.exists() {
            match std::fs::read_to_string(path) {
                Ok(content) => {
                    match serde_json::from_str::<DesktopSettings>(&content) {
                        Ok(loaded) => {
                            let valid_bounds = loaded.window_bounds.filter(|b| b.is_valid());
                            *settings = DesktopSettings { window_bounds: valid_bounds.clone(), ..Default::default() };
                            settings.minimize_to_tray = loaded.minimize_to_tray;
                            settings.open_in_background = loaded.open_in_background;
                            settings.open_at_launch = loaded.open_at_launch;
                            settings.update_channel = loaded.update_channel;
                            settings.window_bounds = valid_bounds;
                            settings.window_maximized = loaded.window_maximized;
                            settings.disable_hardware_acceleration = loaded.disable_hardware_acceleration;
                            settings.enable_aggressive_gpu_flags = loaded.enable_aggressive_gpu_flags;
                            settings.mpv_path = loaded.mpv_path;
                            info!("[Settings] Loaded from {:?}", path);
                        }
                        Err(e) => {
                            error!("[Settings] Failed to parse settings: {}", e);
                        }
                    }
                }
                Err(e) => {
                    error!("[Settings] Failed to read settings: {}", e);
                }
            }
        }

        settings.clone()
    }

    pub fn update_partial<R: Runtime>(
        &self,
        app_handle: &AppHandle<R>,
        updates: HashMap<String, serde_json::Value>,
    ) -> Result<DesktopSettings, String> {
        let path = self.get_settings_path(app_handle);
        let mut settings = self.load_from_path(&path);

        for (key, value) in updates {
            match key.as_str() {
                "minimizeToTray" | "minimize_to_tray" => {
                    if let Some(v) = value.as_bool() {
                        settings.minimize_to_tray = v;
                    }
                }
                "openInBackground" | "open_in_background" => {
                    if let Some(v) = value.as_bool() {
                        settings.open_in_background = v;
                    }
                }
                "openAtLaunch" | "open_at_launch" => {
                    if let Some(v) = value.as_bool() {
                        settings.open_at_launch = v;
                        // Update login item on macOS/Windows
                        #[cfg(target_os = "macos")]
                        {
                            // app_handle.set_login_item_settings(...)
                        }
                        #[cfg(target_os = "windows")]
                        {
                            // Would use windows-registry or similar
                        }
                    }
                }
                "updateChannel" | "update_channel" => {
                    if let Some(v) = value.as_str() {
                        settings.update_channel = v.to_string();
                    }
                }
                "disableHardwareAcceleration" | "disable_hardware_acceleration" => {
                    if let Some(v) = value.as_bool() {
                        settings.disable_hardware_acceleration = v;
                    }
                }
                "enableAggressiveGpuFlags" | "enable_aggressive_gpu_flags" => {
                    if let Some(v) = value.as_bool() {
                        settings.enable_aggressive_gpu_flags = v;
                    }
                }
                "windowBounds" | "window_bounds" => {
                    if let Ok(bounds) = serde_json::from_value::<WindowBounds>(value) {
                        if bounds.is_valid() {
                            settings.window_bounds = Some(bounds);
                        }
                    }
                }
                "windowMaximized" | "window_maximized" => {
                    if let Some(v) = value.as_bool() {
                        settings.window_maximized = v;
                    }
                }
                "mpvPath" | "mpv_path" => {
                    settings.mpv_path = value.as_str().map(|s| s.to_string()).filter(|s| !s.trim().is_empty());
                }
                _ => {
                    warn!("[Settings] Unknown setting key: {}", key);
                }
            }
        }

        self.save_to_path(&path, &settings)?;
        info!("[Settings] Updated: {:?}", settings);
        Ok(settings)
    }

    pub fn save<R: Runtime>(&self, app_handle: &AppHandle<R>, settings: &DesktopSettings) -> Result<(), String> {
        let path = self.get_settings_path(app_handle);
        self.save_to_path(&path, settings)
    }

    fn save_to_path(&self, path: &PathBuf, settings: &DesktopSettings) -> Result<(), String> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }

        let json = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
        std::fs::write(path, json).map_err(|e| e.to_string())?;

        *self.settings.write().unwrap() = settings.clone();
        Ok(())
    }
}

impl Default for SettingsManager {
    fn default() -> Self {
        Self::new()
    }
}