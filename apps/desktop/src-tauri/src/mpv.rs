// External mpv player integration.
//
// Spawns the user's mpv binary with a JSON IPC socket (named pipe on Windows,
// unix socket elsewhere), observes playback properties and forwards them to the
// webview as Tauri events. The frontend relays progress to the Go server's
// playback-sync endpoint, so continuity/scrobbling work exactly like the web player.
//
// Events emitted to the webview:
//   mpv:started  { mediaId, episodeNumber }
//   mpv:progress { currentTime, duration, paused, mediaId, episodeNumber }
//   mpv:exited   { currentTime, duration, mediaId, episodeNumber }

use std::sync::Arc;
use std::time::Duration;

use log::{error, info, warn};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::sync::{mpsc, Mutex};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MpvPlayRequest {
    /// Absolute path (or URL) of the media to play.
    pub path: String,
    /// Title shown in mpv's window/OSD.
    #[serde(default)]
    pub title: Option<String>,
    /// Resume position in seconds.
    #[serde(default)]
    pub start_time: Option<f64>,
    #[serde(default)]
    pub media_id: i64,
    #[serde(default)]
    pub episode_number: i64,
}

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
struct MpvPlaybackEvent {
    current_time: f64,
    duration: f64,
    paused: bool,
    media_id: i64,
    episode_number: i64,
}

struct MpvSession {
    cmd_tx: mpsc::UnboundedSender<String>,
    /// Generation counter so a stale reader task can't clear a newer session.
    generation: u64,
}

pub struct MpvManager {
    session: Arc<Mutex<Option<MpvSession>>>,
    generation: std::sync::atomic::AtomicU64,
}

impl MpvManager {
    pub fn new() -> Self {
        Self {
            session: Arc::new(Mutex::new(None)),
            generation: std::sync::atomic::AtomicU64::new(0),
        }
    }

    /// Resolve the mpv binary: explicit setting first, then PATH.
    fn resolve_binary(mpv_path: &Option<String>) -> String {
        match mpv_path {
            Some(p) if !p.trim().is_empty() => p.clone(),
            _ => "mpv".to_string(),
        }
    }

    pub async fn is_available(mpv_path: &Option<String>) -> bool {
        let bin = Self::resolve_binary(mpv_path);
        let mut cmd = tokio::process::Command::new(&bin);
        cmd.arg("--version")
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .stdin(std::process::Stdio::null());
        #[cfg(windows)]
        {
            const CREATE_NO_WINDOW: u32 = 0x0800_0000;
            cmd.creation_flags(CREATE_NO_WINDOW);
        }
        match cmd.status().await {
            Ok(status) => status.success(),
            Err(_) => false,
        }
    }

    /// Stop the current session (if any) by asking mpv to quit.
    pub async fn stop(&self) {
        let session = self.session.lock().await;
        if let Some(s) = session.as_ref() {
            let _ = s.cmd_tx.send(r#"{"command":["quit"]}"#.to_string());
        }
    }

    pub async fn play(
        &self,
        app: AppHandle,
        mpv_path: Option<String>,
        req: MpvPlayRequest,
    ) -> Result<(), String> {
        // Replace any existing session: ask it to quit, then drop the handle.
        {
            let mut session = self.session.lock().await;
            if let Some(s) = session.take() {
                let _ = s.cmd_tx.send(r#"{"command":["quit"]}"#.to_string());
            }
        }

        let generation = self
            .generation
            .fetch_add(1, std::sync::atomic::Ordering::SeqCst)
            + 1;

        let bin = Self::resolve_binary(&mpv_path);
        let ipc_path = ipc_socket_path(generation);

        let mut cmd = tokio::process::Command::new(&bin);
        cmd.arg(format!("--input-ipc-server={}", ipc_path))
            .arg("--keep-open=no")
            .arg("--force-window=yes")
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .stdin(std::process::Stdio::null());

        if let Some(title) = &req.title {
            cmd.arg(format!("--force-media-title={}", title));
        }
        if let Some(start) = req.start_time {
            if start > 1.0 {
                cmd.arg(format!("--start={:.3}", start));
            }
        }
        cmd.arg(&req.path);

        #[cfg(windows)]
        {
            const CREATE_NO_WINDOW: u32 = 0x0800_0000;
            cmd.creation_flags(CREATE_NO_WINDOW);
        }

        let mut child = cmd
            .spawn()
            .map_err(|e| format!("No se pudo lanzar mpv ({}): {}", bin, e))?;

        info!("[mpv] Launched {} for {}", bin, req.path);

        // Connect to the IPC socket, retrying while mpv boots.
        let stream = match connect_ipc(&ipc_path, Duration::from_secs(10)).await {
            Ok(s) => s,
            Err(e) => {
                let _ = child.start_kill();
                return Err(format!("No se pudo conectar al IPC de mpv: {}", e));
            }
        };

        let (reader, mut writer) = tokio::io::split(stream);
        let (cmd_tx, mut cmd_rx) = mpsc::unbounded_channel::<String>();

        {
            let mut session = self.session.lock().await;
            *session = Some(MpvSession {
                cmd_tx: cmd_tx.clone(),
                generation,
            });
        }

        // Writer task: serialize commands to the socket.
        tauri::async_runtime::spawn(async move {
            while let Some(line) = cmd_rx.recv().await {
                if writer.write_all(line.as_bytes()).await.is_err() {
                    break;
                }
                if writer.write_all(b"\n").await.is_err() {
                    break;
                }
            }
        });

        // Observe the properties we care about.
        for (id, prop) in [(1, "time-pos"), (2, "duration"), (3, "pause")] {
            let _ = cmd_tx.send(format!(r#"{{"command":["observe_property",{},"{}"]}}"#, id, prop));
        }

        let _ = app.emit(
            "mpv:started",
            serde_json::json!({ "mediaId": req.media_id, "episodeNumber": req.episode_number }),
        );

        // Reader task: parse mpv events, throttle progress, emit exit event.
        let session_ref = self.session.clone();
        let media_id = req.media_id;
        let episode_number = req.episode_number;
        tauri::async_runtime::spawn(async move {
            let mut lines = BufReader::new(reader).lines();
            let mut current_time: f64 = req.start_time.unwrap_or(0.0);
            let mut duration: f64 = 0.0;
            let mut paused = false;
            let mut last_emit = std::time::Instant::now() - Duration::from_secs(10);

            while let Ok(Some(line)) = lines.next_line().await {
                let Ok(msg) = serde_json::from_str::<serde_json::Value>(&line) else {
                    continue;
                };
                if msg.get("event").and_then(|e| e.as_str()) != Some("property-change") {
                    continue;
                }
                let name = msg.get("name").and_then(|n| n.as_str()).unwrap_or("");
                match name {
                    "time-pos" => {
                        if let Some(v) = msg.get("data").and_then(|d| d.as_f64()) {
                            current_time = v;
                        }
                    }
                    "duration" => {
                        if let Some(v) = msg.get("data").and_then(|d| d.as_f64()) {
                            duration = v;
                        }
                    }
                    "pause" => {
                        if let Some(v) = msg.get("data").and_then(|d| d.as_bool()) {
                            paused = v;
                        }
                    }
                    _ => continue,
                }

                // Throttle to ~1 event/sec; pause toggles flush immediately.
                if name == "pause" || last_emit.elapsed() >= Duration::from_secs(1) {
                    last_emit = std::time::Instant::now();
                    let _ = app.emit(
                        "mpv:progress",
                        MpvPlaybackEvent {
                            current_time,
                            duration,
                            paused,
                            media_id,
                            episode_number,
                        },
                    );
                }
            }

            // Socket closed: mpv exited (user closed the window or quit command).
            info!("[mpv] IPC closed, playback ended at {:.1}s", current_time);
            let _ = app.emit(
                "mpv:exited",
                MpvPlaybackEvent {
                    current_time,
                    duration,
                    paused,
                    media_id,
                    episode_number,
                },
            );

            // Clear the session only if it is still ours.
            let mut session = session_ref.lock().await;
            if session.as_ref().map(|s| s.generation) == Some(generation) {
                *session = None;
            }
        });

        // Reap the child in the background so it doesn't zombie.
        tauri::async_runtime::spawn(async move {
            match child.wait().await {
                Ok(status) if !status.success() => {
                    warn!("[mpv] Process exited with status {}", status)
                }
                Err(e) => error!("[mpv] Failed to wait for process: {}", e),
                _ => {}
            }
        });

        Ok(())
    }
}

fn ipc_socket_path(generation: u64) -> String {
    #[cfg(windows)]
    {
        format!(r"\\.\pipe\kamehouse-mpv-{}-{}", std::process::id(), generation)
    }
    #[cfg(not(windows))]
    {
        format!(
            "{}/kamehouse-mpv-{}-{}.sock",
            std::env::temp_dir().display(),
            std::process::id(),
            generation
        )
    }
}

#[cfg(windows)]
type IpcStream = tokio::net::windows::named_pipe::NamedPipeClient;
#[cfg(not(windows))]
type IpcStream = tokio::net::UnixStream;

async fn connect_ipc(path: &str, timeout: Duration) -> Result<IpcStream, String> {
    let deadline = std::time::Instant::now() + timeout;
    loop {
        #[cfg(windows)]
        let attempt = tokio::net::windows::named_pipe::ClientOptions::new().open(path);
        #[cfg(not(windows))]
        let attempt = tokio::net::UnixStream::connect(path).await;

        match attempt {
            Ok(stream) => return Ok(stream),
            Err(e) => {
                if std::time::Instant::now() >= deadline {
                    return Err(e.to_string());
                }
                tokio::time::sleep(Duration::from_millis(150)).await;
            }
        }
    }
}
