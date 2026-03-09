mod db;
mod commands;

use commands::{save_progress, load_progress, list_history, list_videos_in_dir, save_playlist, load_playlist};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            save_progress,
            load_progress,
            list_history,
            list_videos_in_dir,
            save_playlist,
            load_playlist,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
