use std::path::PathBuf;
use std::process::Stdio;
use std::sync::atomic::{AtomicBool, AtomicU16, Ordering};
use std::sync::Arc;
use std::time::Duration;

use log::{debug, error, info, warn};
use tauri::{AppHandle, Manager, Runtime};
use tokio::process::{Child, Command};
use tokio::sync::Mutex;
use tokio::time::timeout;

use crate::settings::DesktopSettings;
use crate::window_manager::WindowManager;

const DESKTOP_SERVER_HOST: &str = "127.0.0.1";
const DESKTOP_SERVER_DEFAULT_PORT: u16 = 43211;
const DESKTOP_SERVER_DEV_PORT: u16 = 43212;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ServerStatus {
    Stopped,
    Starting,
    Running,
    Crashed,
}

pub struct SidecarManager {
    process: Arc<Mutex<Option<Child>>>,
    status: Arc<std::sync::atomic::AtomicU8>, // 0=Stopped, 1=Starting, 2=Running, 3=Crashed
    dynamic_port: Arc<AtomicU16>,
    is_shutdown: Arc<AtomicBool>,
    startup_resolved: Arc<AtomicBool>,
    is_dev: bool,
}

impl SidecarManager {
    pub fn new() -> Self {
        Self {
            process: Arc::new(Mutex::new(None)),
            status: Arc::new(std::sync::atomic::AtomicU8::new(0)),
            dynamic_port: Arc::new(AtomicU16::new(0)),
            is_shutdown: Arc::new(AtomicBool::new(false)),
            startup_resolved: Arc::new(AtomicBool::new(false)),
            is_dev: cfg!(debug_assertions),
        }
    }

    pub fn is_shutdown(&self) -> bool {
        self.is_shutdown.load(Ordering::SeqCst)
    }

    pub fn get_status(&self) -> ServerStatus {
        match self.status.load(Ordering::SeqCst) {
            0 => ServerStatus::Stopped,
            1 => ServerStatus::Starting,
            2 => ServerStatus::Running,
            3 => ServerStatus::Crashed,
            _ => ServerStatus::Stopped,
        }
    }

    pub fn get_port(&self) -> u16 {
        let dynamic = self.dynamic_port.load(Ordering::SeqCst);
        if dynamic > 0 {
            return dynamic;
        }
        if self.is_dev {
            DESKTOP_SERVER_DEV_PORT
        } else {
            DESKTOP_SERVER_DEFAULT_PORT
        }
    }


    fn get_binary_name(&self) -> Result<String, String> {
        if self.is_dev {
            if cfg!(target_os = "windows") {
                Ok("kamehouse.exe".to_string())
            } else {
                Ok("kamehouse".to_string())
            }
        } else {
            let os = std::env::consts::OS;
            let arch = std::env::consts::ARCH;
            match os {
                "windows" => Ok("kamehouse-server-windows.exe".to_string()),
                "macos" => Ok(format!("kamehouse-server-darwin-{}", arch)),
                "linux" => Ok(format!("kamehouse-server-linux-{}", arch)),
                _ => Err(format!("Unsupported OS: {}", os)),
            }
        }
    }

    fn get_binary_path<R: Runtime>(&self, app_handle: &AppHandle<R>) -> Result<PathBuf, String> {
        let binary_name = self.get_binary_name()?;
        if self.is_dev {
            // In dev, the binary is in the server directory at the root of the monorepo
            let current_dir = std::env::current_dir().unwrap_or_default();
            let server_dir = current_dir.join("..").join("..").join("server");
            Ok(server_dir.join(binary_name))
        } else {
            // In production, binaries are bundled as externalBin in tauri.conf.json
            let resource_dir = app_handle
                .path()
                .resource_dir()
                .map_err(|e| format!("Failed to get resource dir: {}", e))?;

            // Try to find the binary at the resource root first, then under "binaries" folder,
            // and try with both ".exe.exe" and ".exe" suffixes for Windows.
            let paths_to_try = if cfg!(target_os = "windows") {
                vec![
                    resource_dir.join("kamehouse-server-windows.exe.exe"),
                    resource_dir.join("kamehouse-server-windows.exe"),
                    resource_dir.join("binaries").join("kamehouse-server-windows.exe.exe"),
                    resource_dir.join("binaries").join("kamehouse-server-windows.exe"),
                ]
            } else {
                vec![
                    resource_dir.join(&binary_name),
                    resource_dir.join("binaries").join(&binary_name),
                ]
            };

            for path in &paths_to_try {
                if path.exists() {
                    return Ok(path.clone());
                }
            }

            // If none of the paths exist, return the primary one so the error message points to it
            Ok(paths_to_try[0].clone())
        }
    }

    /// Preflight cleanup: if a previous KameHouse sidecar (typically orphaned by an abrupt
    /// `tauri dev` restart / Ctrl-C) is still listening on `port`, terminate it so the freshly
    /// spawned server can bind the port. We confirm the shape via `/api/v1/status`
    /// (`isDesktopSidecar == true`) before killing so we never touch an unrelated process that
    /// happens to occupy the port.
    async fn reap_orphan_on_port(&self, port: u16) {
        let client = reqwest::Client::new();
        let url = format!("http://{}:{}/api/v1/status", DESKTOP_SERVER_HOST, port);

        let orphan_pid = match timeout(Duration::from_millis(500), client.get(&url).send()).await {
            Ok(Ok(resp)) if resp.status().is_success() => {
                match resp.json::<serde_json::Value>().await {
                    Ok(body) => {
                        let is_sidecar = body.get("isDesktopSidecar").and_then(|v| v.as_bool()).unwrap_or(false);
                        let pid = body.get("pid").and_then(|v| v.as_u64());
                        if is_sidecar {
                            pid
                        } else {
                            None
                        }
                    }
                    Err(_) => None,
                }
            }
            // No response / error / non-2xx: no orphan to reap, healthy fast path.
            _ => return,
        };

        let pid = match orphan_pid {
            Some(pid) if pid > 0 => pid,
            _ => return,
        };

        warn!("[Sidecar] Found orphan KameHouse sidecar (pid {}) on port {}, terminating", pid, port);

        #[cfg(windows)]
        {
            let _ = std::process::Command::new("taskkill")
                .args(["/PID", &pid.to_string(), "/F"])
                .output();
        }
        #[cfg(unix)]
        {
            let _ = std::process::Command::new("kill")
                .args(["-9", &pid.to_string()])
                .output();
        }

        // Wait (up to ~2s) for the port to actually free up before we let the new process try to
        // bind it, avoiding a race against the dying process' socket / TIME_WAIT.
        for _ in 0..20 {
            tokio::time::sleep(Duration::from_millis(100)).await;
            match timeout(Duration::from_millis(300), client.get(&url).send()).await {
                Ok(Ok(_)) => continue, // still responding, keep waiting
                _ => break,            // port no longer answers -> freed
            }
        }
    }

    pub async fn launch<R: Runtime>(
        &self,
        app_handle: &AppHandle<R>,
        settings: DesktopSettings,
        window_manager: Arc<WindowManager>,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        if self.is_shutdown.load(Ordering::SeqCst) {
            return Ok(());
        }

        info!("[Sidecar] Attempting to launch server");

        // Check for -no-binary flag
        if std::env::args().any(|arg| arg == "-no-binary") {
            info!("[Sidecar] Skipping server launch due to -no-binary flag");
            self.set_status(ServerStatus::Running);
            self.startup_resolved.store(true, Ordering::SeqCst);
            window_manager.finalize_startup(app_handle, "no-binary-flag");
            return Ok(());
        }

        let binary_path = self.get_binary_path(app_handle)
            .map_err(|e| -> Box<dyn std::error::Error + Send + Sync> { e.into() })?;
        info!("[Sidecar] Using binary: {:?}", binary_path);

        if !binary_path.exists() {
            let err = format!("Server binary not found at {:?}", binary_path);
            error!("[Sidecar] {}", err);
            self.set_status(ServerStatus::Crashed);
            let _ = window_manager.show_crash_screen(app_handle, &err);
            return Err(err.into());
        }

        // Make binary executable on Unix
        #[cfg(not(target_os = "windows"))]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut perms = std::fs::metadata(&binary_path)?.permissions();
            perms.set_mode(0o755);
            std::fs::set_permissions(&binary_path, perms)?;
        }

        // Prepare arguments
        let mut args = Vec::new();
        if self.is_dev {
            let data_dir = if let Ok(test_dir) = std::env::var("TEST_DATADIR") {
                test_dir
            } else {
                let app_data = dirs::data_dir().unwrap_or_default();
                app_data.join("kamehouse-dev").to_string_lossy().to_string()
            };
            args.push("-datadir".to_string());
            args.push(data_dir);
        }
        args.push("-desktop-sidecar".to_string());
        args.push("true".to_string());

        // Prepare environment
        let mut env_vars = std::collections::HashMap::new();
        env_vars.insert("KAMEHOUSE_PORT".to_string(), self.get_port().to_string());
        env_vars.insert("KAMEHOUSE_ENV".to_string(), "production".to_string());

        if self.is_dev {
            env_vars.insert(
                "KAMEHOUSE_DEV_CORS_ORIGINS".to_string(),
                "http://localhost:43210,http://127.0.0.1:43210,http://localhost,http://127.0.0.1".to_string(),
            );
        }

        // Apply settings
        if settings.disable_hardware_acceleration {
            env_vars.insert("KAMEHOUSE_DISABLE_GPU".to_string(), "1".to_string());
        }

        // Reap any orphaned KameHouse sidecar still holding our port before spawning, so the
        // new process can bind cleanly instead of dying with "port is busy".
        self.reap_orphan_on_port(self.get_port()).await;

        info!("[Sidecar] Spawning server process: {:?} with args: {:?}", binary_path, args);

        // Spawn the process
        let mut cmd = Command::new(&binary_path);
        cmd.args(&args)
            .envs(&env_vars)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .kill_on_drop(true);

        let mut child = cmd.spawn()?;

        // Set status to starting
        self.set_status(ServerStatus::Starting);

        // Take stdout and stderr
        let stdout = child.stdout.take();
        let stderr = child.stderr.take();
        let dynamic_port = self.dynamic_port.clone();
        let status = self.status.clone();
        let startup_resolved = self.startup_resolved.clone();
        let window_manager_clone = window_manager.clone();
        let app_handle_clone = app_handle.clone();

        // Handle stdout
        if let Some(stdout) = stdout {
            let dynamic_port = dynamic_port.clone();
            let status = status.clone();
            let startup_resolved = startup_resolved.clone();
            let window_manager = window_manager_clone.clone();
            let app_handle = app_handle_clone.clone();

            tokio::spawn(async move {
                use tokio::io::{AsyncBufReadExt, BufReader};
                let reader = BufReader::new(stdout);
                let mut lines = reader.lines();

                while let Ok(Some(line)) = lines.next_line().await {
                    debug!("[Go Server STDOUT] {}", line);

                    // Check for port handshake
                    if let Some(port_str) = line.split("[KAMEHOUSE_PORT_HANDSHAKE:").nth(1) {
                        if let Some(port_str) = port_str.split(']').next() {
                            if let Ok(port) = port_str.trim().parse::<u16>() {
                                if port > 0 {
                                    dynamic_port.store(port, Ordering::SeqCst);
                                    info!("[Sidecar] Received port handshake: {}", port);
                                }
                            }
                        }
                    }

                    // Check if frontend connected
                    if status.load(Ordering::SeqCst) != 2 && line.contains("Client connected") {
                        info!("[Sidecar] Frontend connected, finalizing startup");
                        if !startup_resolved.load(Ordering::SeqCst) {
                            startup_resolved.store(true, Ordering::SeqCst);
                            status.store(2, Ordering::SeqCst); // Running
                            window_manager.finalize_startup(&app_handle, "websocket client connection");
                        }
                    }
                }
            });
        }

        // Handle stderr
        if let Some(stderr) = stderr {
            tokio::spawn(async move {
                use tokio::io::{AsyncBufReadExt, BufReader};
                let reader = BufReader::new(stderr);
                let mut lines = reader.lines();

                while let Ok(Some(line)) = lines.next_line().await {
                    error!("[Go Server STDERR] {}", line);
                }
            });
        }

        // Store the process
        *self.process.lock().await = Some(child);

        // Start polling for server readiness
        let process_arc = self.process.clone();
        let status = self.status.clone();
        let dynamic_port = self.dynamic_port.clone();
        let startup_resolved = self.startup_resolved.clone();
        let is_shutdown = self.is_shutdown.clone();
        let window_manager = window_manager_clone;
        let app_handle = app_handle_clone;

        tokio::spawn(async move {
            let mut probe_interval = tokio::time::interval(Duration::from_millis(100));
            let mut probe_count = 0;
            const MAX_PROBES: u32 = 300; // 30 seconds max

            // Build the HTTP client once and reuse it across probes (connection pooling)
            // instead of allocating a fresh client every 500ms.
            let client = reqwest::Client::new();

            loop {
                probe_interval.tick().await;
                probe_count += 1;

                if is_shutdown.load(Ordering::SeqCst) {
                    break;
                }

                let mut process_lock = process_arc.lock().await;
                let process_exited = match process_lock.as_mut() {
                    None => true,
                    Some(p) => p.try_wait().map(|s| s.is_some()).unwrap_or(true),
                };
                if process_exited {
                    drop(process_lock);
                    if !startup_resolved.load(Ordering::SeqCst) {
                        status.store(3, Ordering::SeqCst); // Crashed
                        error!("[Sidecar] Server process exited prematurely");
                        let _ = window_manager.show_crash_screen(&app_handle, "Server process exited before starting");
                    }
                    break;
                }
                drop(process_lock);

                // Check if server is reachable via HTTP
                let url = format!("http://{}:{}/api/v1/status", DESKTOP_SERVER_HOST, dynamic_port.load(Ordering::SeqCst).max(if cfg!(debug_assertions) { DESKTOP_SERVER_DEV_PORT } else { DESKTOP_SERVER_DEFAULT_PORT }));
                if let Ok(Ok(resp)) = timeout(Duration::from_secs(1), client.get(&url).send()).await {
                    if resp.status().is_success() && !startup_resolved.load(Ordering::SeqCst) {
                        info!("[Sidecar] Server ready via HTTP probe");
                        startup_resolved.store(true, Ordering::SeqCst);
                        status.store(2, Ordering::SeqCst); // Running
                        window_manager.finalize_startup(&app_handle, "HTTP status probe");
                        break;
                    }
                }

                if probe_count >= MAX_PROBES {
                    if !startup_resolved.load(Ordering::SeqCst) {
                        status.store(3, Ordering::SeqCst); // Crashed
                        error!("[Sidecar] Server startup timeout");
                        let _ = window_manager.show_crash_screen(&app_handle, "Server startup timeout");
                    }
                    break;
                }
            }
        });

        Ok(())
    }

    pub async fn restart<R: Runtime>(
        &self,
        app_handle: &AppHandle<R>,
        settings: DesktopSettings,
        window_manager: Arc<WindowManager>,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        info!("[Sidecar] Restarting server...");

        // Kill existing process
        self.kill().await;

        // Reset state
        self.startup_resolved.store(false, Ordering::SeqCst);
        self.status.store(0, Ordering::SeqCst);
        self.dynamic_port.store(0, Ordering::SeqCst);

        // Launch again
        self.launch(app_handle, settings, window_manager).await
    }

    pub async fn kill(&self) {
        info!("[Sidecar] Killing server process");

        let mut process_lock = self.process.lock().await;
        if let Some(mut child) = process_lock.take() {
            // Try graceful shutdown first
            #[cfg(unix)]
            {
                use std::os::unix::process::CommandExt;
                let _ = child.kill().await;
            }
            #[cfg(windows)]
            {
                let _ = child.kill().await;
            }

            // Wait for process to exit with timeout
            match timeout(Duration::from_secs(3), child.wait()).await {
                Ok(Ok(status)) => {
                    info!("[Sidecar] Server process exited with status: {:?}", status);
                }
                Ok(Err(e)) => {
                    warn!("[Sidecar] Error waiting for server process: {}", e);
                }
                Err(_) => {
                    warn!("[Sidecar] Server process did not exit in time, force killing");
                    #[cfg(windows)]
                    {
                        if let Some(id) = child.id() {
                            let _ = std::process::Command::new("taskkill")
                                .args(["/PID", &id.to_string(), "/F"])
                                .output();
                        }
                    }
                    #[cfg(unix)]
                    {
                        let _ = child.kill().await;
                    }
                }
            }
        }
    }

    pub async fn shutdown(&self) {
        info!("[Sidecar] Shutting down sidecar manager");
        self.is_shutdown.store(true, Ordering::SeqCst);
        self.kill().await;
    }

    fn set_status(&self, status: ServerStatus) {
        self.status.store(status as u8, Ordering::SeqCst);
    }
}

impl Default for SidecarManager {
    fn default() -> Self {
        Self::new()
    }
}