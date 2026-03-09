use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use tauri::{AppHandle, Manager};
use crate::db;

// ── shared error type ──────────────────────────────────────────────────────

#[derive(Debug, thiserror::Error)]
pub enum CommandError {
    #[error("SQLite error: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("App data directory not found")]
    NoAppDataDir,
}

impl Serialize for CommandError {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(&self.to_string())
    }
}

// ── response types ─────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize)]
pub struct ProgressRecord {
    pub file_path:   String,
    pub timestamp:   f64,
    pub last_played: String,
}

// ── helpers ────────────────────────────────────────────────────────────────

fn open_db(app: &AppHandle) -> Result<rusqlite::Connection, CommandError> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|_| CommandError::NoAppDataDir)?;
    fs::create_dir_all(&dir)?;
    let path = db::db_path(&dir);
    Ok(db::open(&path)?)
}

fn now_iso() -> String {
    chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string()
}

// ── Tauri commands ─────────────────────────────────────────────────────────

/// Save (or update) playback progress for a file.
#[tauri::command]
pub fn save_progress(
    app: AppHandle,
    file_path: String,
    timestamp: f64,
) -> Result<(), CommandError> {
    let conn = open_db(&app)?;
    db::save_progress(&conn, &file_path, timestamp, &now_iso())?;
    Ok(())
}

/// Load the last saved timestamp for a file. Returns `null` if not found.
#[tauri::command]
pub fn load_progress(
    app: AppHandle,
    file_path: String,
) -> Result<Option<f64>, CommandError> {
    let conn = open_db(&app)?;
    Ok(db::load_progress(&conn, &file_path)?)
}

/// Return all tracked files sorted by last-played date (newest first).
#[tauri::command]
pub fn list_history(app: AppHandle) -> Result<Vec<ProgressRecord>, CommandError> {
    let conn = open_db(&app)?;
    let rows = db::list_all(&conn)?;
    Ok(rows
        .into_iter()
        .map(|(file_path, timestamp, last_played)| ProgressRecord {
            file_path,
            timestamp,
            last_played,
        })
        .collect())
}

/// Save the current playlist paths and active index to the database.
#[tauri::command]
pub fn save_playlist(app: AppHandle, paths: Vec<String>, current_index: i64) -> Result<(), CommandError> {
    let conn = open_db(&app)?;
    db::save_playlist(&conn, &paths, current_index)?;
    Ok(())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaylistState {
    pub paths: Vec<String>,
    pub current_index: i64,
}

/// Load the last saved playlist (paths + active index) from the database.
#[tauri::command]
pub fn load_playlist(app: AppHandle) -> Result<PlaylistState, CommandError> {
    let conn = open_db(&app)?;
    let (paths, current_index) = db::load_playlist(&conn)?;
    Ok(PlaylistState { paths, current_index })
}

/// Scan a directory and return sorted video file paths.
#[tauri::command]
pub fn list_videos_in_dir(dir_path: String) -> Result<Vec<String>, CommandError> {
    const VIDEO_EXTS: &[&str] = &["mp4", "mkv", "avi", "mov", "webm", "flv", "wmv", "m4v"];

    let dir = Path::new(&dir_path);
    let mut entries: Vec<String> = fs::read_dir(dir)?
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.path().is_file()
                && e.path()
                    .extension()
                    .and_then(|x| x.to_str())
                    .map(|ext| VIDEO_EXTS.contains(&ext.to_lowercase().as_str()))
                    .unwrap_or(false)
        })
        .map(|e| e.path().to_string_lossy().to_string())
        .collect();

    entries.sort();
    Ok(entries)
}
