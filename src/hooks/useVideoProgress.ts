import { useState, useEffect, useRef, useCallback } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { saveProgress, loadProgress, listVideosInDir, savePlaylist, loadPlaylist } from "../lib/tauri";

const SAVE_INTERVAL_MS = 5_000;

export function useVideoProgress(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [currentFile, setCurrentFile]   = useState<string | null>(null);
  const [playlist, setPlaylist]         = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [videoError, setVideoError]     = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [loopStart, setLoopStart]       = useState<number | null>(null);
  const [loopEnd, setLoopEnd]           = useState<number | null>(null);

  const saveTimer        = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingSavedTime = useRef<number | null>(null);
  // Refs so event handlers always see latest values without re-registering
  const playbackRateRef  = useRef(1.0);
  const loopStartRef     = useRef<number | null>(null);
  const loopEndRef       = useRef<number | null>(null);
  // Guard so we don't overwrite user-changed playlist with the initial DB load
  const playlistInitialized = useRef(false);

  useEffect(() => { playbackRateRef.current = playbackRate; }, [playbackRate]);
  useEffect(() => { loopStartRef.current = loopStart; },     [loopStart]);
  useEffect(() => { loopEndRef.current   = loopEnd; },       [loopEnd]);

  // Apply speed changes to a running video immediately
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = playbackRate;
  }, [playbackRate, videoRef]);

  // ── Playlist persistence ────────────────────────────────────────────────

  // Load saved playlist once on mount
  useEffect(() => {
    loadPlaylist()
      .then(({ paths, currentIndex: savedIndex }) => {
        if (!playlistInitialized.current && paths.length > 0) {
          playlistInitialized.current = true;
          const idx = Math.max(0, Math.min(savedIndex, paths.length - 1));
          setPlaylist(paths);
          setCurrentIndex(idx);
          // Restore the last-playing file without rebuilding the playlist
          loadFileOnly(paths[idx]);
        } else {
          playlistInitialized.current = true;
        }
      })
      .catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save playlist (+ current index) whenever either changes
  useEffect(() => {
    if (!playlistInitialized.current) return;
    if (playlist.length === 0) return;
    savePlaylist(playlist, currentIndex).catch(console.error);
  }, [playlist, currentIndex]);

  // ── File opening ────────────────────────────────────────────────────────

  /** Load a file into the player WITHOUT touching the playlist or currentIndex */
  const loadFileOnly = useCallback(async (filePath: string) => {
    if (!filePath) return;
    setVideoError(null);
    pendingSavedTime.current = null;
    setLoopStart(null);
    setLoopEnd(null);
    const savedTime = await loadProgress(filePath).catch(() => null);
    pendingSavedTime.current = savedTime ?? null;
    setCurrentFile(filePath);
  }, []);

  const openFile = useCallback(async (filePath: string) => {
    if (!filePath) return;

    // Build playlist from sibling video files
    const dirPath = filePath.replace(/[\\/][^\\/]+$/, "");
    try {
      const files = await listVideosInDir(dirPath);
      playlistInitialized.current = true; // mark as initialized so save fires
      setPlaylist(files);
      setCurrentIndex(files.indexOf(filePath));
    } catch (e) {
      console.error("listVideosInDir failed:", e);
    }

    await loadFileOnly(filePath);
  }, [loadFileOnly]);

  /** Select a playlist item by index (does NOT rebuild the playlist) */
  const selectPlaylistItem = useCallback((index: number) => {
    setCurrentIndex(index);
    setPlaylist((prev) => {
      loadFileOnly(prev[index]);
      return prev;
    });
  }, [loadFileOnly]);

  /** Add extra files to the playlist without replacing it */
  const addFilesToPlaylist = useCallback((filePaths: string[]) => {
    setPlaylist((prev) => {
      const unique = filePaths.filter((p) => !prev.includes(p));
      return [...prev, ...unique];
    });
  }, []);

  /** Remove a file from the playlist by index */
  const removeFromPlaylist = useCallback((index: number) => {
    setPlaylist((prev) => prev.filter((_, i) => i !== index));
    setCurrentIndex((prev) => {
      if (index < prev) return prev - 1;
      return prev;
    });
  }, []);

  /** Reorder playlist by moving item at `from` to position `to` */
  const reorderPlaylist = useCallback((from: number, to: number) => {
    if (from === to) return;
    setPlaylist((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setCurrentIndex((prev) => {
      if (prev === from) return to;
      if (from < prev && to >= prev) return prev - 1;
      if (from > prev && to <= prev) return prev + 1;
      return prev;
    });
  }, []);

  // ── Video loading ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!currentFile) return;
    const video = videoRef.current;
    if (!video) return;

    const assetUrl = convertFileSrc(currentFile);
    console.log("[ResumePlayer] loading:", assetUrl);

    video.src = assetUrl;
    video.load();

    const onCanPlay = () => {
      const t = pendingSavedTime.current;
      pendingSavedTime.current = null; // consume so canplay doesn't fire twice

      video.playbackRate = playbackRateRef.current;

      if (t && t > 0) {
        // Must wait for seek to finish before calling play(),
        // otherwise the browser aborts the seek with a NotAllowedError.
        const onSeeked = () => {
          video.removeEventListener("seeked", onSeeked);
          video.play().catch(console.error);
        };
        video.addEventListener("seeked", onSeeked);
        video.currentTime = t;
      } else {
        video.play().catch(console.error);
      }
    };

    const onError = () => {
      const err = video.error;
      const msg = err ? `MediaError ${err.code}: ${err.message}` : "Unknown video error";
      console.error("[ResumePlayer] video error:", msg, "| src:", video.src);
      setVideoError(msg);
    };

    // A-B loop: seek back to A when current time passes B
    const onTimeUpdate = () => {
      const a = loopStartRef.current;
      const b = loopEndRef.current;
      if (a !== null && b !== null && a < b && video.currentTime >= b) {
        video.currentTime = a;
      }
    };

    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("error", onError);
    video.addEventListener("timeupdate", onTimeUpdate);
    return () => {
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("error", onError);
      video.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [currentFile, videoRef]);

  // ── Periodic progress save ───────────────────────────────────────────────

  useEffect(() => {
    if (!currentFile) return;
    saveTimer.current = setInterval(() => {
      const video = videoRef.current;
      if (video && !video.paused && video.currentTime > 0) {
        saveProgress(currentFile, video.currentTime).catch(console.error);
      }
    }, SAVE_INTERVAL_MS);
    return () => { if (saveTimer.current) clearInterval(saveTimer.current); };
  }, [currentFile, videoRef]);

  // ── Auto-advance ─────────────────────────────────────────────────────────

  // Auto-advance to next file (skip if A-B loop is active)
  const handleEnded = useCallback(async () => {
    if (loopStartRef.current !== null && loopEndRef.current !== null) return;
    if (!currentFile) return;
    await saveProgress(currentFile, 0).catch(console.error);
    const nextIndex = currentIndex + 1;
    if (nextIndex < playlist.length) {
      setCurrentIndex(nextIndex);
      loadFileOnly(playlist[nextIndex]);
    }
  }, [currentFile, currentIndex, playlist, loadFileOnly]);

  // ── Loop controls ────────────────────────────────────────────────────────

  /** Set loop point A or B to the current playback position */
  const setLoopPoint = useCallback((point: "A" | "B") => {
    const video = videoRef.current;
    if (!video) return;
    const time = video.currentTime;
    if (point === "A") { setLoopStart(time); loopStartRef.current = time; }
    else               { setLoopEnd(time);   loopEndRef.current   = time; }
  }, [videoRef]);

  const clearLoop = useCallback(() => {
    setLoopStart(null); loopStartRef.current = null;
    setLoopEnd(null);   loopEndRef.current   = null;
  }, []);

  return {
    currentFile, playlist, currentIndex, videoError,
    openFile, selectPlaylistItem, handleEnded, addFilesToPlaylist, removeFromPlaylist, reorderPlaylist,
    playbackRate, setPlaybackRate,
    loopStart, loopEnd, setLoopPoint, clearLoop,
  };
}
