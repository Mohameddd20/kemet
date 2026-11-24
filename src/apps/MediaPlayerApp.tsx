import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FileAudio,
  Film,
  FolderOpen,
  Image as ImageIcon,
  Pause,
  Play,
  RefreshCw,
  Upload,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useSettingsStore } from '../system/settingsStore';
import {
  fetchHostRoots,
  getHostRawUrl,
  listHostDirectory,
  type HostFsEntry,
} from '../system/systemBridge';
import type { WindowAppProps } from '../windowManager/types';

type MediaKind = 'audio' | 'video' | 'image';

interface MediaItem {
  name: string;
  src: string;
  kind: MediaKind;
  sourceLabel: string;
}

const AUDIO_EXTS = new Set(['.wav', '.mp3', '.ogg', '.m4a', '.flac']);
const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov', '.mkv']);
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif']);

function detectKind(filename: string): MediaKind | null {
  const idx = filename.lastIndexOf('.');
  if (idx === -1) return null;
  const ext = filename.slice(idx).toLowerCase();
  if (AUDIO_EXTS.has(ext)) return 'audio';
  if (VIDEO_EXTS.has(ext)) return 'video';
  if (IMAGE_EXTS.has(ext)) return 'image';
  return null;
}

export function MediaPlayerApp({ mediaPath }: WindowAppProps) {
  const volume = useSettingsStore((s) => s.volume);
  const setVolume = useSettingsStore((s) => s.setVolume);

  const [playlist, setPlaylist] = useState<MediaItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [scanDir, setScanDir] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadHostMedia = async (explicitPath?: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const roots = await fetchHostRoots();
      const targetFolders = [roots.musicDir, roots.picturesDir, roots.downloadsDir, roots.desktopDir];
      const collected: MediaItem[] = [];

      if (explicitPath) {
        const kind = detectKind(explicitPath);
        if (kind) {
          collected.push({
            name: explicitPath.split('/').pop() ?? explicitPath,
            src: getHostRawUrl(explicitPath),
            kind,
            sourceLabel: explicitPath,
          });
        }
      }

      for (const dir of targetFolders) {
        try {
          const listing = await listHostDirectory(dir);
          listing.items.forEach((entry: HostFsEntry) => {
            if (entry.type !== 'file') return;
            const kind = detectKind(entry.name);
            if (!kind) return;
            if (collected.some((c) => c.sourceLabel === entry.path)) return;
            collected.push({
              name: entry.name,
              src: getHostRawUrl(entry.path),
              kind,
              sourceLabel: entry.path,
            });
          });
        } catch {
          // Skip unreadable optional folders
        }
      }

      setScanDir(`${roots.musicDir} · ${roots.picturesDir}`);
      setPlaylist(collected);
      setActiveIndex(0);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to scan host media folders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadHostMedia(mediaPath);
  }, [mediaPath]);

  useEffect(() => {
    if (mediaRef.current) {
      mediaRef.current.volume = Math.min(1, Math.max(0, volume / 100));
    }
  }, [volume, activeIndex]);

  const currentItem = playlist[activeIndex] ?? null;

  const handleUploadLocal = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const kind =
      file.type.startsWith('video/')
        ? 'video'
        : file.type.startsWith('image/')
          ? 'image'
          : 'audio';
    const objectUrl = URL.createObjectURL(file);
    setPlaylist((prev) => [
      {
        name: file.name,
        src: objectUrl,
        kind,
        sourceLabel: 'Local Browser File',
      },
      ...prev,
    ]);
    setActiveIndex(0);
    setIsPlaying(false);
    e.target.value = '';
  };

  const togglePlay = () => {
    const el = mediaRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      el.pause();
      setIsPlaying(false);
    }
  };

  const formattedTime = useMemo(() => {
    const fmt = (sec: number) => {
      if (!Number.isFinite(sec) || sec < 0) return '0:00';
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      return `${m}:${String(s).padStart(2, '0')}`;
    };
    return `${fmt(currentTime)} / ${fmt(duration)}`;
  }, [currentTime, duration]);

  return (
    <div className="flex h-full bg-slate-900 text-slate-100">
      {/* Playlist Sidebar */}
      <aside className="w-56 shrink-0 border-r border-slate-800 bg-slate-950/60 flex flex-col">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-800">
          <div className="text-xs font-semibold text-slate-200">Host Media Library</div>
          <button
            type="button"
            onClick={() => void loadHostMedia()}
            aria-label="Refresh media library"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto os-scroll p-2 space-y-1">
          {loading ? (
            <div className="p-3 text-xs text-slate-500">Scanning host disk...</div>
          ) : playlist.length === 0 ? (
            <div className="p-3 text-xs text-slate-500">
              No audio, video, or image files found in Music, Pictures, or Downloads.
            </div>
          ) : (
            playlist.map((item, idx) => {
              const Icon =
                item.kind === 'video' ? Film : item.kind === 'image' ? ImageIcon : FileAudio;
              const selected = idx === activeIndex;
              return (
                <button
                  key={`${item.sourceLabel}-${idx}`}
                  type="button"
                  onClick={() => {
                    setActiveIndex(idx);
                    setIsPlaying(false);
                    setCurrentTime(0);
                    setDuration(0);
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-left text-xs transition-colors ${
                    selected
                      ? 'os-accent-soft-bg os-accent-text font-medium'
                      : 'text-slate-300 hover:bg-slate-800/80'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="truncate">{item.name}</div>
                    <div className="text-[10px] text-slate-500 capitalize">{item.kind}</div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="p-2.5 border-t border-slate-800">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,video/*,image/*"
            onChange={handleUploadLocal}
            className="hidden"
            aria-label="Open local media file"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Open Local File</span>
          </button>
        </div>
      </aside>

      {/* Player Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-4 py-2 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <FolderOpen className="w-3.5 h-3.5 os-accent-text shrink-0" />
            <span className="truncate text-slate-300 font-mono">
              {currentItem ? currentItem.sourceLabel : scanDir || 'Host Disk'}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 shrink-0">Direct Host Stream</span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-950/80 min-h-0">
          {errorMsg ? (
            <div className="text-xs text-red-400">{errorMsg}</div>
          ) : !currentItem ? (
            <div className="text-center space-y-2">
              <FileAudio className="w-10 h-10 text-slate-600 mx-auto" />
              <div className="text-sm font-medium text-slate-300">No Media Selected</div>
              <div className="text-xs text-slate-500">
                Select a media file from your host folders or upload one locally.
              </div>
            </div>
          ) : currentItem.kind === 'image' ? (
            <img
              src={currentItem.src}
              alt={currentItem.name}
              referrerPolicy="no-referrer"
              className="max-h-full max-w-full rounded-lg border border-slate-800 object-contain"
            />
          ) : currentItem.kind === 'video' ? (
            <video
              key={currentItem.src}
              ref={(el) => {
                mediaRef.current = el;
              }}
              src={currentItem.src}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              onEnded={() => setIsPlaying(false)}
              className="max-h-full max-w-full rounded-lg border border-slate-800 bg-black"
            />
          ) : (
            <div className="w-full max-w-md p-6 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-3">
              <div className="w-14 h-14 rounded-xl os-accent-soft-bg border border-[var(--os-accent-border)] flex items-center justify-center mx-auto">
                <FileAudio className="w-7 h-7 os-accent-text" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-100 truncate">
                  {currentItem.name}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 font-mono truncate">
                  {currentItem.sourceLabel}
                </div>
              </div>
              <audio
                key={currentItem.src}
                ref={(el) => {
                  mediaRef.current = el;
                }}
                src={currentItem.src}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                onEnded={() => setIsPlaying(false)}
              />
            </div>
          )}
        </div>

        {/* Transport Controls */}
        <div className="px-4 py-3 border-t border-slate-800 bg-slate-950/90 flex items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            disabled={!currentItem || currentItem.kind === 'image'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="flex items-center justify-center w-9 h-9 rounded-lg os-accent-bg text-white disabled:opacity-40 transition-colors shrink-0"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            disabled={!currentItem || currentItem.kind === 'image' || duration === 0}
            aria-label="Seek media position"
            onChange={(e) => {
              const t = Number(e.target.value);
              setCurrentTime(t);
              if (mediaRef.current) mediaRef.current.currentTime = t;
            }}
            className="flex-1 accent-[var(--os-accent-hover)] cursor-pointer"
          />

          <span className="text-[11px] font-mono-tabular text-slate-400 shrink-0">
            {formattedTime}
          </span>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setVolume(volume === 0 ? 75 : 0)}
              aria-label={volume === 0 ? 'Unmute' : 'Mute'}
              className="p-1 text-slate-300 hover:text-white"
            >
              {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              aria-label="Media player volume"
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-20 accent-[var(--os-accent-hover)] cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
