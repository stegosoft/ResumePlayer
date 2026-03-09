import { invoke } from "@tauri-apps/api/core";
import type { ProgressRecord } from "../types";

/** Save current playback position */
export const saveProgress = (filePath: string, timestamp: number) =>
  invoke<void>("save_progress", { filePath, timestamp });

/** Load last saved timestamp; returns null if not found */
export const loadProgress = (filePath: string) =>
  invoke<number | null>("load_progress", { filePath });

/** List all history entries */
export const listHistory = () => invoke<ProgressRecord[]>("list_history");

/** List all video files in the given directory, sorted by filename */
export const listVideosInDir = (dirPath: string) =>
  invoke<string[]>("list_videos_in_dir", { dirPath });

/** Persist the playlist to the database */
export const savePlaylist = (paths: string[], currentIndex: number) =>
  invoke<void>("save_playlist", { paths, currentIndex });

/** Load the persisted playlist from the database */
export const loadPlaylist = () =>
  invoke<{ paths: string[]; currentIndex: number }>("load_playlist");
