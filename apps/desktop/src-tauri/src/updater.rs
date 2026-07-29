use std::sync::Arc;

use log::info;
use tauri::{AppHandle, Runtime};
use tauri_plugin_updater::UpdaterExt;

use crate::sidecar::SidecarManager;
use crate::window_manager::WindowManager;
use crate::settings::DesktopSettings;

pub struct UpdaterManager;

impl UpdaterManager {
    pub fn new() -> Self {
        Self
    }

    pub async fn setup<R: Runtime>(
        &self,
        _app_handle: &tauri::AppHandle<R>,
        _window_manager: Arc<WindowManager>,
        _sidecar_manager: Arc<SidecarManager>,
        settings: DesktopSettings,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        info!("[Updater] Setting up auto-updater");

        // Configure updater based on update channel
        let update_url = match settings.update_channel.as_str() {
            "kamehouse_nightly" => "https://kamehouse.app/api/updates/nightly/",
            "kamehouse" => "https://kamehouse.app/api/updates/stable/",
            _ => "https://github.com/5rahim/kamehouse/releases/latest/download",
        };

        info!("[Updater] Update URL: {}", update_url);

        // Note: Tauri's built-in updater requires a specific format
        // For compatibility with electron-updater, we'll use a custom approach
        // or configure Tauri's updater to work with the existing endpoints

        // Check GitHub status first (like Electron version)
        if let Ok(Some(fallback)) = self.check_github_status().await {
            info!("[Updater] Changing update channel to fallback: {}", fallback);
            // Could dynamically update the URL here
        }

        // Tauri updater is configured via tauri.conf.json
        // The check will happen automatically or via IPC command

        Ok(())
    }

    async fn check_github_status(&self) -> Result<Option<String>, Box<dyn std::error::Error + Send + Sync>> {
        let client = reqwest::Client::new();
        let response = client
            .get("https://kamehouse.app/api/github-status")
            .timeout(std::time::Duration::from_secs(5))
            .send()
            .await?;

        if !response.status().is_success() {
            return Ok(None);
        }

        let data: serde_json::Value = response.json().await?;
        if data.get("status").and_then(|v| v.as_str()) == Some("down") {
            if let Some(fallback) = data.get("fallback").and_then(|v| v.as_str()) {
                return Ok(Some(fallback.to_string()));
            }
        }

        Ok(None)
    }

    pub async fn check_for_updates<R: Runtime>(
        &self,
        app_handle: &AppHandle<R>,
    ) -> Result<serde_json::Value, Box<dyn std::error::Error + Send + Sync>> {
        info!("[Updater] Checking for updates");

        // Use Tauri's built-in updater
        let updater = app_handle.updater()?;
        let result = updater.check().await?;

        Ok(serde_json::json!({
            "updateAvailable": result.is_some(),
            "updateInfo": result.map(|u| serde_json::json!({
                "version": u.version,
                "date": u.date.map(|d| d.to_string()),
                "body": u.body,
            })),
        }))
    }

    pub async fn install_update<R: Runtime>(
        &self,
        app_handle: &AppHandle<R>,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        info!("[Updater] Installing update");

        if let Some(update) = app_handle.updater()?.check().await? {
            update.download_and_install(|_chunk, _content_length| {}, || {}).await?;
        }

        Ok(())
    }
}

impl Default for UpdaterManager {
    fn default() -> Self {
        Self::new()
    }
}