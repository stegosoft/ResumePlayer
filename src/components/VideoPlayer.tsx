import { useRef, useCallback, useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { useVideoProgress } from "../hooks/useVideoProgress";

const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0];
const VIDEO_FILTERS = [{ name: "Videos", extensions: ["mp4","mkv","avi","mov","wmv","flv","webm","m4v","ts","mts","m2ts","3gp","ogv"] }];

export default function VideoPlayer() {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(true);
  const [isOpening, setIsOpening] = useState(false);
  // Drag-to-reorder state
  const dragFrom = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const {
    currentFile, playlist, currentIndex, videoError,
    openFile, selectPlaylistItem, handleEnded, addFilesToPlaylist, removeFromPlaylist, reorderPlaylist,
    playbackRate, setPlaybackRate,
    loopStart, loopEnd, setLoopPoint, clearLoop,
  } = useVideoProgress(videoRef);

  // Tauri drag-drop
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    getCurrentWindow()
      .onDragDropEvent((event) => {
        if (event.payload.type === "drop") {
          const paths = event.payload.paths;
          if (paths && paths.length > 0) openFile(paths[0]);
        }
      })
      .then((fn) => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, [openFile]);

  // Fullscreen change listener
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Arrow keys: seek ±10 seconds
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        e.stopPropagation();
        video.currentTime = Math.max(0, video.currentTime - 10);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        e.stopPropagation();
        video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
      }
    };
    // Use capture phase to intercept before the native <video controls> handler
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) containerRef.current.requestFullscreen();
    else document.exitFullscreen();
  }, []);

  // Open a single file via native dialog
  const handleOpenFile = useCallback(async () => {
    setIsOpening(true);
    try {
      const selected = await openDialog({
        multiple: false,
        filters: VIDEO_FILTERS,
      });
      if (selected) await openFile(selected as string);
    } finally {
      setIsOpening(false);
    }
  }, [openFile]);

  // Add files to playlist via native dialog
  const handleAddToPlaylist = useCallback(async () => {
    const selected = await openDialog({
      multiple: true,
      filters: VIDEO_FILTERS,
    });
    if (!selected) return;
    const paths = Array.isArray(selected) ? selected : [selected];
    if (paths.length > 0) addFilesToPlaylist(paths);
  }, [addFilesToPlaylist]);

  // Browser drag-drop fallback
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      const path = (file as unknown as { path?: string }).path;
      if (path) openFile(path);
    },
    [openFile]
  );

  const isLooping = loopStart !== null && loopEnd !== null && loopStart < loopEnd;

  const fmtTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = (t % 60).toFixed(1).padStart(4, "0");
    return `${m}:${s}`;
  };

  // Derive a human-readable status message
  const statusMsg = (() => {
    if (isOpening) return "⏳ 正在開啟檔案…";
    if (videoError) return `⚠ ${videoError}`;
    if (currentFile) return currentFile;
    return "尚未載入檔案 — 拖曳影片或按 Open File";
  })();

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100">
      {/* Toolbar */}
      <header className="flex items-center gap-3 px-4 py-2 bg-zinc-900 border-b border-zinc-800">
        <span className="text-lg font-semibold tracking-wide text-violet-400">▶ ResumePlayer</span>
        <button
          onClick={handleOpenFile}
          disabled={isOpening}
          className="ml-auto px-3 py-1 text-sm rounded bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-wait transition"
        >
          {isOpening ? "⏳ 開啟中…" : "Open File"}
        </button>
        {playlist.length > 0 && (
          <button
            onClick={() => setShowPlaylist((v) => !v)}
            className="px-3 py-1 text-sm rounded bg-zinc-700 hover:bg-zinc-600 transition"
          >
            {showPlaylist ? "Hide Playlist" : "Show Playlist"}
          </button>
        )}
      </header>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video pane */}
        <div
          ref={containerRef}
          className="flex-1 flex flex-col bg-black"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <div className="flex-1 flex items-center justify-center min-h-0">
            {currentFile ? (
              <video
                ref={videoRef}
                className="max-h-full max-w-full outline-none"
                controls
                onEnded={handleEnded}
              />
            ) : (
              <div className="flex flex-col items-center gap-4 select-none">
                {isOpening ? (
                  <p className="text-violet-400 text-sm animate-pulse">⏳ 正在開啟檔案對話框…</p>
                ) : (
                  <>
                    <p className="text-zinc-400 text-sm">拖曳影片到此處，或</p>
                    <button
                      onClick={handleOpenFile}
                      className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm transition"
                    >
                      選擇影片檔案
                    </button>
                    <p className="text-zinc-600 text-xs">支援 MP4、MKV、AVI、MOV、WMV… 等格式</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Custom control bar (only when a file is loaded) */}
          {currentFile && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 bg-zinc-900/95 border-t border-zinc-800 text-xs">
              {/* Speed */}
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400">Speed</span>
                <select
                  value={playbackRate}
                  onChange={(e) => setPlaybackRate(Number(e.target.value))}
                  className="bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-zinc-200 cursor-pointer"
                >
                  {SPEEDS.map((s) => (
                    <option key={s} value={s}>{s}×</option>
                  ))}
                </select>
              </div>

              {/* A-B Loop */}
              <div className="flex items-center gap-1.5">
                <span className={`text-zinc-400 ${isLooping ? "text-emerald-400" : ""}`}>
                  Loop
                </span>
                <button
                  onClick={() => setLoopPoint("A")}
                  title="Set loop start (A) to current time"
                  className={`px-2 py-0.5 rounded transition ${
                    loopStart !== null
                      ? "bg-emerald-700 text-white"
                      : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                  }`}
                >
                  {loopStart !== null ? `A: ${fmtTime(loopStart)}` : "Set A"}
                </button>
                <button
                  onClick={() => setLoopPoint("B")}
                  title="Set loop end (B) to current time"
                  className={`px-2 py-0.5 rounded transition ${
                    loopEnd !== null
                      ? "bg-emerald-700 text-white"
                      : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                  }`}
                >
                  {loopEnd !== null ? `B: ${fmtTime(loopEnd)}` : "Set B"}
                </button>
                {(loopStart !== null || loopEnd !== null) && (
                  <button
                    onClick={clearLoop}
                    className="px-2 py-0.5 rounded bg-red-900 hover:bg-red-800 text-red-300 transition"
                  >
                    ✕ Clear
                  </button>
                )}
                {isLooping && (
                  <span className="text-emerald-500 font-semibold animate-pulse">⟳ Looping</span>
                )}
              </div>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                title="Toggle fullscreen"
                className="ml-auto px-3 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
              >
                {isFullscreen ? "⊡ Exit Fullscreen" : "⛶ Fullscreen"}
              </button>
            </div>
          )}
        </div>

        {/* Playlist sidebar */}
        {playlist.length > 0 && showPlaylist && (
          <aside className="w-64 flex flex-col bg-zinc-900 border-l border-zinc-800">
            <div className="flex items-center px-3 py-2 border-b border-zinc-800 gap-2">
              <span className="text-xs text-zinc-500 uppercase tracking-widest flex-1">
                Playlist ({playlist.length})
              </span>
              <button
                onClick={handleAddToPlaylist}
                title="Add files to playlist"
                className="text-xs px-2 py-0.5 rounded bg-violet-700 hover:bg-violet-600 text-white transition"
              >
                + Add
              </button>
            </div>
            <ul className="flex-1 overflow-y-auto">
              {playlist.map((p, i) => {
                const name = p.split(/[\\/]/).pop() ?? p;
                const isDragTarget = dragOver === i;
                return (
                  <li
                    key={p}
                    draggable
                    onDragStart={() => { dragFrom.current = i; }}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(i); }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragFrom.current !== null) reorderPlaylist(dragFrom.current, i);
                      dragFrom.current = null;
                      setDragOver(null);
                    }}
                    onDragEnd={() => { dragFrom.current = null; setDragOver(null); }}
                    className={`flex items-center group border-t-2 transition-colors ${
                      isDragTarget ? "border-violet-400" : "border-transparent"
                    }`}
                  >
                    {/* drag handle */}
                    <span className="pl-2 pr-1 text-zinc-600 group-hover:text-zinc-400 cursor-grab active:cursor-grabbing select-none">
                      ⠿
                    </span>
                    <button
                      onClick={() => selectPlaylistItem(i)}
                      className={`flex-1 text-left px-2 py-2 text-sm truncate transition
                        ${i === currentIndex
                          ? "bg-violet-700 text-white"
                          : "hover:bg-zinc-800 text-zinc-300"}`}
                      title={p}
                    >
                      <span className="text-zinc-500 mr-1.5">{i + 1}.</span>
                      {name}
                    </button>
                    <button
                      onClick={() => removeFromPlaylist(i)}
                      title="Remove from playlist"
                      className="hidden group-hover:flex items-center px-2 text-zinc-500 hover:text-red-400 transition"
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>
        )}
      </div>

      {/* Status bar */}
      <footer className={`px-4 py-1 text-xs bg-zinc-900 border-t border-zinc-800 truncate ${
        isOpening ? "text-violet-400" :
        videoError ? "text-red-400" :
        currentFile ? "text-zinc-500" : "text-zinc-600"
      }`}>
        {statusMsg}
        {isLooping && currentFile && (
          <span className="ml-3 text-emerald-700">
            ⟳ Loop: {fmtTime(loopStart!)} → {fmtTime(loopEnd!)}
          </span>
        )}
      </footer>
    </div>
  );
}
