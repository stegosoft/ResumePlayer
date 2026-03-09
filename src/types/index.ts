export interface ProgressRecord {
  file_path: string;
  timestamp: number;
  last_played: string;
}

export interface VideoState {
  currentFile: string | null;
  playlist: string[];
  currentIndex: number;
}
