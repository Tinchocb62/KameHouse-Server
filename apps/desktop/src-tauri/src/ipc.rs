use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{AppHandle, Manager, State, WebviewWindow};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_opener::OpenerExt;

use crate::mpv::{MpvManager, MpvPlayRequest};
use crate::settings::{DesktopSettings, SettingsManager, WindowBounds};
use crate::sidecar::SidecarManager;
use crate::window_manager::WindowManager;
use crate::updater::UpdaterManager;

#[derive(Serialize, Deserialize)]
pub struct WindowState {
    pub is_maximized: bool,
    pub is_minimized: bool,
    pub is_fullscreen: bool,
    pub is_visible: bool,
    pub bounds: Option<WindowBounds>,
}

#[tauri::command]
pub async fn get_desktop_settings(
    settings_manager: State<'_, Arc<SettingsManager>>,
    app_handle: AppHandle,
) -> Result<DesktopSettings, String> {
    let path = settings_manager.get_settings_path(&app_handle);
    let settings = settings_manager.load_from_path(&path);
    Ok(settings)
}

#[tauri::command]
pub async fn set_desktop_settings(
    settings_manager: State<'_, Arc<SettingsManager>>,
    app_handle: AppHandle,
    updates: std::collections::HashMap<String, serde_json::Value>,
) -> Result<DesktopSettings, String> {
    settings_manager.update_partial(&app_handle, updates)
}

#[tauri::command]
pub async fn restart_server(
    sidecar_manager: State<'_, Arc<SidecarManager>>,
    settings_manager: State<'_, Arc<SettingsManager>>,
    window_manager: State<'_, Arc<WindowManager>>,
    app_handle: AppHandle,
) -> Result<(), String> {
    let path = settings_manager.get_settings_path(&app_handle);
    let settings = settings_manager.load_from_path(&path);

    let window_mgr = window_manager.inner().clone();
    let sidecar_mgr = sidecar_manager.inner().clone();
    let app = app_handle.clone();

    tauri::async_runtime::spawn(async move {
        if let Err(e) = sidecar_mgr.restart(&app, settings, window_mgr).await {
            log::error!("[Sidecar] Restart failed: {}", e);
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn kill_server(
    sidecar_manager: State<'_, Arc<SidecarManager>>,
) -> Result<bool, String> {
    sidecar_manager.kill().await;
    Ok(true)
}

#[tauri::command]
pub async fn write_to_clipboard(
    app_handle: AppHandle,
    text: String,
) -> Result<bool, String> {
    if text.is_empty() {
        return Ok(false);
    }

    app_handle.clipboard().write_text(text).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub async fn get_local_server_port(
    sidecar_manager: State<'_, Arc<SidecarManager>>,
) -> Result<u16, String> {
    Ok(sidecar_manager.get_port())
}

#[tauri::command]
pub async fn check_for_updates(
    updater_manager: State<'_, Arc<UpdaterManager>>,
    app_handle: AppHandle,
) -> Result<serde_json::Value, String> {
    updater_manager.check_for_updates(&app_handle).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn install_update(
    updater_manager: State<'_, Arc<UpdaterManager>>,
    app_handle: AppHandle,
) -> Result<bool, String> {
    updater_manager.install_update(&app_handle).await.map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub async fn get_window_state(
    app_handle: AppHandle,
) -> Result<WindowState, String> {
    let window = app_handle.get_webview_window("main").ok_or("Main window not found")?;

    let is_maximized = window.is_maximized().unwrap_or(false);
    let is_minimized = window.is_minimized().unwrap_or(false);
    let is_fullscreen = window.is_fullscreen().unwrap_or(false);
    let is_visible = window.is_visible().unwrap_or(false);

    let position = window.outer_position().unwrap_or(tauri::PhysicalPosition { x: 0, y: 0 });
    let size = window.inner_size().unwrap_or(tauri::PhysicalSize { width: 800, height: 600 });
    let bounds = Some(WindowBounds {
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
    });

    Ok(WindowState {
        is_maximized,
        is_minimized,
        is_fullscreen,
        is_visible,
        bounds,
    })
}

#[tauri::command]
pub async fn set_window_fullscreen(
    app_handle: AppHandle,
    fullscreen: bool,
) -> Result<(), String> {
    let window = app_handle.get_webview_window("main").ok_or("Main window not found")?;
    window.set_fullscreen(fullscreen).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn toggle_window_maximize(
    app_handle: AppHandle,
) -> Result<(), String> {
    let window = app_handle.get_webview_window("main").ok_or("Main window not found")?;
    if window.is_maximized().unwrap_or(false) {
        window.unmaximize().map_err(|e| e.to_string())
    } else {
        window.maximize().map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub async fn minimize_window(
    app_handle: AppHandle,
) -> Result<(), String> {
    let window = app_handle.get_webview_window("main").ok_or("Main window not found")?;
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn hide_window(
    app_handle: AppHandle,
) -> Result<(), String> {
    let window = app_handle.get_webview_window("main").ok_or("Main window not found")?;
    window.hide().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn show_window(
    app_handle: AppHandle,
) -> Result<(), String> {
    let window = app_handle.get_webview_window("main").ok_or("Main window not found")?;
    window.show().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn is_main_window(
    window: WebviewWindow,
) -> Result<bool, String> {
    Ok(window.label() == "main")
}

#[tauri::command]
pub async fn startup_renderer_ready(
    window_manager: State<'_, Arc<WindowManager>>,
) -> Result<(), String> {
    window_manager.set_startup_ready(true);
    Ok(())
}

#[tauri::command]
pub async fn mpv_play(
    mpv_manager: State<'_, Arc<MpvManager>>,
    settings_manager: State<'_, Arc<SettingsManager>>,
    app_handle: AppHandle,
    request: MpvPlayRequest,
) -> Result<(), String> {
    let path = settings_manager.get_settings_path(&app_handle);
    let settings = settings_manager.load_from_path(&path);
    mpv_manager.play(app_handle.clone(), settings.mpv_path, request).await
}

#[tauri::command]
pub async fn mpv_stop(
    mpv_manager: State<'_, Arc<MpvManager>>,
) -> Result<(), String> {
    mpv_manager.stop().await;
    Ok(())
}

#[tauri::command]
pub async fn mpv_is_available(
    settings_manager: State<'_, Arc<SettingsManager>>,
    app_handle: AppHandle,
) -> Result<bool, String> {
    let path = settings_manager.get_settings_path(&app_handle);
    let settings = settings_manager.load_from_path(&path);
    Ok(MpvManager::is_available(&settings.mpv_path).await)
}

/// Open a URL in the system default browser.
/// Only http:// and https:// URLs are accepted to prevent misuse.
#[tauri::command]
pub async fn shell_open(app_handle: AppHandle, url: String) -> Result<(), String> {
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err(format!(
            "shell_open: only http/https URLs are supported, got: {}",
            url
        ));
    }
    app_handle
        .opener()
        .open_url(&url, None::<&str>)
        .map_err(|e| e.to_string())
}