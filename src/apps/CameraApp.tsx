import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, FolderOpen, RefreshCw, VideoOff } from 'lucide-react';
import { useNotificationStore } from '../system/notificationStore';
import { fetchHostRoots, writeHostBinaryFile } from '../system/systemBridge';
import { launchApp } from '../windowManager/launcher';
import type { WindowAppProps } from '../windowManager/types';

export function CameraApp(_props: WindowAppProps) {
  const pushNotification = useNotificationStore((s) => s.pushNotification);

  const [status, setStatus] = useState<'initializing' | 'ready' | 'unavailable'>('initializing');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [resolution, setResolution] = useState<string>('');
  const [lastSavedPath, setLastSavedPath] = useState<string | null>(null);
  const [picturesDir, setPicturesDir] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    void fetchHostRoots()
      .then((roots) => setPicturesDir(roots.picturesDir))
      .catch(() => undefined);
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    stopStream();
    setStatus('initializing');
    setErrorMsg('');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus('unavailable');
      setErrorMsg('MediaDevices API is unavailable in this browser context.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      const track = stream.getVideoTracks()[0];
      const settings = track?.getSettings();
      if (settings?.width && settings?.height) {
        setResolution(`${settings.width}×${settings.height}`);
      }
      setStatus('ready');
    } catch (err) {
      setStatus('unavailable');
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'No physical webcam found or camera permission was denied.'
      );
    }
  }, [stopStream]);

  useEffect(() => {
    void startCamera();
    return () => stopStream();
  }, [startCamera, stopStream]);

  const handleCapture = async () => {
    const video = videoRef.current;
    if (!video || status !== 'ready') return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    const roots = await fetchHostRoots();
    const targetPath = `${roots.picturesDir}/capture-${Date.now()}.png`;
    await writeHostBinaryFile(targetPath, dataUrl);
    setLastSavedPath(targetPath);
    pushNotification('Photo Captured', `Saved to ${targetPath}`, 'system');
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-950/70 text-xs">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 os-accent-text" />
          <span className="font-semibold">Camera</span>
          {resolution && (
            <span className="text-[11px] text-slate-400 font-mono-tabular">
              · {resolution}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => void startCamera()}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reconnect</span>
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center bg-slate-950 p-4 min-h-0">
        {status === 'unavailable' ? (
          <div className="max-w-sm text-center space-y-3 p-6 rounded-xl bg-slate-900/90 border border-slate-800">
            <VideoOff className="w-10 h-10 text-slate-500 mx-auto" />
            <div className="text-sm font-semibold text-slate-200">No Camera Device Detected</div>
            <p className="text-xs text-slate-400 leading-relaxed">{errorMsg}</p>
            <p className="text-[11px] text-slate-500">
              Photos captured when a webcam is connected are saved directly to{' '}
              <span className="font-mono text-slate-300">{picturesDir || '~/Pictures'}</span>.
            </p>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="max-h-full max-w-full rounded-xl border border-slate-800 bg-black"
          />
        )}
      </div>

      <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-800 bg-slate-950/80 text-xs">
        <div className="text-[11px] text-slate-400 font-mono truncate max-w-sm">
          {lastSavedPath ? `Last photo: ${lastSavedPath}` : `Target: ${picturesDir || '~/Pictures'}`}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {picturesDir && (
            <button
              type="button"
              onClick={() => launchApp('files', { initialDir: picturesDir, storageMode: 'host' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Open Pictures</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleCapture()}
            disabled={status !== 'ready'}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md os-accent-bg text-white font-medium disabled:opacity-40"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Capture Photo</span>
          </button>
        </div>
      </div>
    </div>
  );
}
