// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod sidecar;
mod settings;
#[path = "window.rs"]
mod window_manager;
mod tray;
mod updater;
mod ipc;

use std::sync::Arc;
use tauri::Manager;
use tauri_plugin_log::{Target, TargetKind};

use sidecar::SidecarManager;
use window_manager::WindowManager;
use tray::TrayManager;
use settings::SettingsManager;
use updater::UpdaterManager;

pub fn run() {
    let sidecar_manager = Arc::new(SidecarManager::new());
    let settings_manager = Arc::new(SettingsManager::new());
    let window_manager = Arc::new(WindowManager::new());
    let tray_manager = Arc::new(TrayManager::new());
    let updater_manager = Arc::new(UpdaterManager::new());

    let single_instance_window_manager = window_manager.clone();
    let setup_settings_manager = settings_manager.clone();
    let setup_window_manager = window_manager.clone();
    let setup_sidecar_manager = sidecar_manager.clone();

    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::default()
                .targets([
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::LogDir { file_name: Some("kamehouse.log".to_string()) }),
                    Target::new(TargetKind::Webview),
                ])
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(move |app, _args, _cwd| {
            let _ = single_instance_window_manager.show_main_window(app);
        }))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(sidecar_manager.clone())
        .manage(settings_manager.clone())
        .manage(window_manager.clone())
        .manage(tray_manager.clone())
        .manage(updater_manager.clone())
        .invoke_handler(tauri::generate_handler![
            ipc::get_desktop_settings,
            ipc::set_desktop_settings,
            ipc::restart_server,
            ipc::kill_server,
            ipc::write_to_clipboard,
            ipc::get_local_server_port,
            ipc::check_for_updates,
            ipc::install_update,
            ipc::get_window_state,
            ipc::set_window_fullscreen,
            ipc::toggle_window_maximize,
            ipc::minimize_window,
            ipc::hide_window,
            ipc::show_window,
            ipc::is_main_window,
            ipc::startup_renderer_ready,
            ipc::shell_open,
        ])
        .setup(move |app| {
            let handle = app.handle().clone();

            // Initialize logging
            if cfg!(debug_assertions) {
                log::info!("KameHouse Desktop starting in development mode");
            } else {
                log::info!("KameHouse Desktop starting in production mode");
            }

            // Initialize settings
            let settings = setup_settings_manager.load(&handle);
            log::info!("[Settings] Loaded: {:?}", settings);

            // Initialize window manager
            let dev_mode = cfg!(debug_assertions);
            setup_window_manager.create_windows(&handle, dev_mode, settings.clone()).map_err(|e| e as Box<dyn std::error::Error>)?;

            // Initialize tray
            tray_manager.create_tray(&handle, setup_sidecar_manager.clone(), setup_window_manager.clone(), settings.clone()).map_err(|e| e as Box<dyn std::error::Error>)?;

            // Initialize sidecar
            let sidecar_mgr = setup_sidecar_manager.clone();
            let window_mgr = setup_window_manager.clone();
            let settings_clone = settings.clone();

            let sidecar_handle = handle.clone();
            let sidecar_window_mgr = window_mgr.clone();
            let launch_sidecar_mgr = sidecar_mgr.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = launch_sidecar_mgr.launch(&sidecar_handle, settings_clone, sidecar_window_mgr.clone()).await {
                    log::error!("[Sidecar] Failed to launch: {}", e);
                    let _ = sidecar_window_mgr.show_crash_screen(&sidecar_handle, &format!("Failed to start server: {}", e));
                }
            });

            // Setup auto-updater
            let updater_mgr = updater_manager.clone();
            let updater_handle = handle.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = updater_mgr.setup(&updater_handle, window_mgr, sidecar_mgr, settings).await {
                    log::error!("[Updater] Setup failed: {}", e);
                }
            });

            // Handle single instance - macOS activation policy
            #[cfg(target_os = "macos")]
            {
                use tauri::ActivationPolicy;
                app.set_activation_policy(ActivationPolicy::Regular);
            }

            Ok(())
        })
        .on_window_event(move |window, event| {
            let label = window.label().to_string();
            let window_manager = window_manager.clone();

            match event {
                tauri::WindowEvent::CloseRequested { api, .. } => {
                    if label == "main" {
                        let settings = settings_manager.load(&window.app_handle());
                        if settings.minimize_to_tray && !sidecar_manager.is_shutdown() {
                            api.prevent_close();
                            let _ = window.hide();
                        } else {
                            let _ = sidecar_manager.shutdown();
                        }
                    }
                }
                tauri::WindowEvent::Focused(focused) => {
                    if *focused && label == "main" {
                        window_manager.set_startup_ready(true);
                    }
                }
                tauri::WindowEvent::Resized(_) | tauri::WindowEvent::Moved(_) => {
                    if label == "main" {
                        let _ = window_manager.save_window_state(&window);
                    }
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}