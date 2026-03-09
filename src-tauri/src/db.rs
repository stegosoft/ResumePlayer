use rusqlite::{Connection, Result, params};
use std::path::Path;

/// Opens (or creates) the SQLite database at the given path.
pub fn open(db_path: &str) -> Result<Connection> {
    let conn = Connection::open(db_path)?;
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS video_progress (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            file_path   TEXT    NOT NULL UNIQUE,
            timestamp   REAL    NOT NULL DEFAULT 0.0,
            last_played TEXT    NOT NULL
        );
        CREATE TABLE IF NOT EXISTS playlist_state (
            id    INTEGER PRIMARY KEY,
            paths TEXT    NOT NULL DEFAULT '[]'
        );",
    )?;
    Ok(conn)
}

/// Upsert (insert or replace) the playback progress for a video file.
pub fn save_progress(conn: &Connection, file_path: &str, timestamp: f64, last_played: &str) -> Result<()> {
    conn.execute(
        "INSERT INTO video_progress (file_path, timestamp, last_played)
         VALUES (?1, ?2, ?3)
         ON CONFLICT(file_path) DO UPDATE SET
             timestamp   = excluded.timestamp,
             last_played = excluded.last_played",
        params![file_path, timestamp, last_played],
    )?;
    Ok(())
}

/// Load the saved timestamp for a given file path.
/// Returns `None` if no record exists.
pub fn load_progress(conn: &Connection, file_path: &str) -> Result<Option<f64>> {
    let mut stmt = conn.prepare(
        "SELECT timestamp FROM video_progress WHERE file_path = ?1",
    )?;
    let mut rows = stmt.query(params![file_path])?;
    if let Some(row) = rows.next()? {
        Ok(Some(row.get(0)?))
    } else {
        Ok(None)
    }
}

/// List all tracked files (path + timestamp) sorted by last_played desc.
pub fn list_all(conn: &Connection) -> Result<Vec<(String, f64, String)>> {
    let mut stmt = conn.prepare(
        "SELECT file_path, timestamp, last_played
         FROM video_progress
         ORDER BY last_played DESC",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok((row.get(0)?, row.get(1)?, row.get(2)?))
    })?;
    rows.collect()
}

/// Persist the current playlist (paths + active index) as a JSON object.
pub fn save_playlist(conn: &Connection, paths: &[String], current_index: i64) -> Result<()> {
    let json = serde_json::json!({ "paths": paths, "currentIndex": current_index }).to_string();
    conn.execute(
        "INSERT INTO playlist_state (id, paths) VALUES (1, ?1)
         ON CONFLICT(id) DO UPDATE SET paths = excluded.paths",
        params![json],
    )?;
    Ok(())
}

/// Load the persisted playlist.
/// Returns (paths, current_index); handles both old (plain array) and new (object) formats.
pub fn load_playlist(conn: &Connection) -> Result<(Vec<String>, i64)> {
    let mut stmt = conn.prepare("SELECT paths FROM playlist_state WHERE id = 1")?;
    let mut rows = stmt.query([])?;
    if let Some(row) = rows.next()? {
        let json: String = row.get(0)?;
        let val: serde_json::Value = serde_json::from_str(&json)
            .unwrap_or(serde_json::Value::Array(vec![]));
        if val.is_array() {
            // Legacy format: plain array of paths
            let paths: Vec<String> = serde_json::from_value(val).unwrap_or_default();
            Ok((paths, 0))
        } else {
            let paths: Vec<String> = val["paths"]
                .as_array()
                .map(|a| a.iter().filter_map(|v| v.as_str().map(String::from)).collect())
                .unwrap_or_default();
            let current_index = val["currentIndex"].as_i64().unwrap_or(0);
            Ok((paths, current_index))
        }
    } else {
        Ok((vec![], 0))
    }
}

/// Resolve the absolute database path inside the app data directory.
pub fn db_path(app_data_dir: &Path) -> String {
    app_data_dir
        .join("progress.db")
        .to_string_lossy()
        .to_string()
}
