use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;
use log::{debug, info};
use tauri::{
    AppHandle, Emitter, Manager, Runtime, WebviewUrl, WebviewWindowBuilder, WindowEvent,
};

use crate::settings::{DesktopSettings, SettingsManager, WindowBounds};

#[allow(dead_code)]
pub struct WindowManager {
    startup_ready: Arc<std::sync::RwLock<bool>>,
    should_maximize: Arc<std::sync::RwLock<bool>>,
    is_shutdown: Arc<std::sync::RwLock<bool>>,
    settings_manager: Arc<SettingsManager>,
    /// Monotonic counter used to debounce window-state saves: only the most
    /// recent queued save (matching the latest generation) is written to disk.
    save_generation: Arc<AtomicU64>,
}

#[allow(dead_code)]
impl WindowManager {
    pub fn new(settings_manager: Arc<SettingsManager>) -> Self {
        Self {
            startup_ready: Arc::new(std::sync::RwLock::new(false)),
            should_maximize: Arc::new(std::sync::RwLock::new(false)),
            is_shutdown: Arc::new(std::sync::RwLock::new(false)),
            settings_manager,
            save_generation: Arc::new(AtomicU64::new(0)),
        }
    }

    pub fn create_windows<R: Runtime>(
        &self,
        app_handle: &AppHandle<R>,
        is_dev: bool,
        settings: DesktopSettings,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        info!("[WindowManager] Creating windows");

        // Create main window
        self.create_main_window(app_handle, is_dev, &settings)?;

        // Create crash screen
        self.create_crash_window(app_handle, is_dev)?;

        Ok(())
    }

    fn create_main_window<R: Runtime>(
        &self,
        app_handle: &AppHandle<R>,
        is_dev: bool,
        settings: &DesktopSettings,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        info!("[WindowManager] Creating main window");

        *self.startup_ready.write().unwrap() = false;

        let url = if is_dev {
            WebviewUrl::External("http://127.0.0.1:43210".parse().unwrap())
        } else {
            WebviewUrl::App("app://-".into())
        };

        let mut builder = WebviewWindowBuilder::new(app_handle, "main", url)
            .title("KameHouse")
            .inner_size(1920.0, 1080.0)
            .min_inner_size(800.0, 600.0)
            .resizable(true)
            .fullscreen(false)
            .visible(!settings.open_in_background)
            .background_color(tauri::window::Color(9, 9, 11, 255))
            .decorations(true)
            .transparent(false);

        #[cfg(target_os = "macos")]
        {
            if !is_dev {
                builder = builder.title_bar_style(tauri::TitleBarStyle::HiddenInset);
            }
        }

        if let Some(bounds) = &settings.window_bounds {
            builder = builder
                .position(bounds.x as f64, bounds.y as f64)
                .inner_size(bounds.width as f64, bounds.height as f64);
        } else {
            builder = builder.center();
        }

        let window = builder.build()?;

        #[cfg(debug_assertions)]
        if is_dev {
            window.open_devtools();
        }

        // Handle window events
        let window_clone = window.clone();
        // Close/tray/shutdown and window-state persistence are handled centrally in
        // lib.rs's `on_window_event`. Here we only relay fullscreen changes to the frontend.
        window.on_window_event(move |event| {
            match event {
                WindowEvent::Focused(focused) => {
                    debug!("[WindowManager] Main window focused: {}", focused);
                }
                WindowEvent::Resized(_) => {
                    let _ = window_clone.emit("window:fullscreen", window_clone.is_fullscreen().unwrap_or(false));
                }
                _ => {}
            }
        });

        Ok(())
    }

    fn create_crash_window<R: Runtime>(
        &self,
        app_handle: &AppHandle<R>,
        is_dev: bool,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        info!("[WindowManager] Creating crash window");

        let url = if is_dev {
            WebviewUrl::External("http://127.0.0.1:43210/splashscreen/crash".parse().unwrap())
        } else {
            WebviewUrl::App("app://-/splashscreen/crash".into())
        };

        WebviewWindowBuilder::new(app_handle, "crash", url)
            .title("KameHouse - Error")
            .inner_size(800.0, 600.0)
            .resizable(false)
            .decorations(false)
            .visible(false)
            .center()
            .build()?;

        Ok(())
    }

    pub fn finalize_startup<R: Runtime>(&self, app_handle: &AppHandle<R>, source: &str) {
        info!("[WindowManager] Finalizing startup from: {}", source);
        *self.startup_ready.write().unwrap() = true;
    }

    pub fn show_crash_screen<R: Runtime>(&self, app_handle: &AppHandle<R>, message: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        if let Some(main) = app_handle.get_webview_window("main") {
            let _ = main.destroy();
        }

        if let Some(crash) = app_handle.get_webview_window("crash") {
            let _ = crash.show();
            let _ = crash.emit("crash", message);
        }

        Ok(())
    }

    pub fn show_main_window<R: Runtime>(&self, app_handle: &AppHandle<R>) {
        if let Some(window) = app_handle.get_webview_window("main") {
            let settings = self.settings_manager.load(app_handle);

            if window.is_minimized().unwrap_or(false) {
                let _ = window.unminimize();
            }

            if !window.is_visible().unwrap_or(false) {
                let _ = window.show();
            }

            if settings.window_maximized && !window.is_maximized().unwrap_or(false) {
                let _ = window.maximize();
            }

            let _ = window.set_focus();
        }
    }

    pub fn hide_main_window<R: Runtime>(&self, app_handle: &AppHandle<R>) {
        if let Some(window) = app_handle.get_webview_window("main") {
            let _ = window.hide();
        }
    }

    pub fn set_shutdown(&self, val: bool) {
        *self.is_shutdown.write().unwrap() = val;
    }

    pub fn is_shutdown(&self) -> bool {
        *self.is_shutdown.read().unwrap()
    }

    pub fn is_startup_ready(&self) -> bool {
        *self.startup_ready.read().unwrap()
    }

    pub fn set_startup_ready(&self, val: bool) {
        *self.startup_ready.write().unwrap() = val;
    }

    pub fn emit_to_main<R: Runtime>(&self, app_handle: &AppHandle<R>, event: &str, payload: impl serde::Serialize + Clone) {
        if let Some(main) = app_handle.get_webview_window("main") {
            let _ = main.emit(event, payload);
        }
    }

    pub fn save_window_state<R: Runtime>(&self, window: &tauri::Window<R>) -> Result<(), String> {
        let is_maximized = window.is_maximized().unwrap_or(false);
        
        let position = window.outer_position().unwrap_or(tauri::PhysicalPosition { x: 0, y: 0 });
        let size = window.inner_size().unwrap_or(tauri::PhysicalSize { width: 800, height: 600 });
        
        let bounds = if !is_maximized {
            Some(WindowBounds {
                x: position.x,
                y: position.y,
                width: size.width,
                height: size.height,
            })
        } else {
            None
        };

        let app_handle = window.app_handle();
        let mut settings = self.settings_manager.load(app_handle);

        settings.window_maximized = is_maximized;
        if bounds.is_some() {
            settings.window_bounds = bounds;
        }

        self.settings_manager.save(app_handle, &settings)
    }

    /// Debounced variant of [`save_window_state`]. Called on every `Resized`/`Moved`
    /// event during a drag; captures the current bounds synchronously (window queries
    /// must run on the event thread) and defers the disk write by 500ms. Only the most
    /// recent queued save actually writes, so a burst of events becomes a single write.
    pub fn queue_save_window_state<R: Runtime>(&self, window: &tauri::Window<R>) {
        let is_maximized = window.is_maximized().unwrap_or(false);
        let position = window.outer_position().unwrap_or(tauri::PhysicalPosition { x: 0, y: 0 });
        let size = window.inner_size().unwrap_or(tauri::PhysicalSize { width: 800, height: 600 });

        let bounds = if !is_maximized {
            Some(WindowBounds {
                x: position.x,
                y: position.y,
                width: size.width,
                height: size.height,
            })
        } else {
            None
        };

        let app_handle = window.app_handle().clone();
        let settings_manager = self.settings_manager.clone();
        let generation = self.save_generation.clone();
        let my_gen = generation.fetch_add(1, Ordering::SeqCst) + 1;

        tauri::async_runtime::spawn(async move {
            tokio::time::sleep(Duration::from_millis(500)).await;
            // A newer event superseded this one; skip the write.
            if generation.load(Ordering::SeqCst) != my_gen {
                return;
            }

            let mut settings = settings_manager.load(&app_handle);
            settings.window_maximized = is_maximized;
            if bounds.is_some() {
                settings.window_bounds = bounds;
            }
            let _ = settings_manager.save(&app_handle, &settings);
        });
    }
}

impl Default for WindowManager {
    fn default() -> Self {
        Self::new(Arc::new(SettingsManager::new()))
    }
}