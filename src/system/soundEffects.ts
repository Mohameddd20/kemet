import { useSettingsStore } from './settingsStore';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const settings = useSettingsStore.getState();
  if (!settings.soundEffectsEnabled || settings.muted || settings.volume <= 0) {
    return null;
  }
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) {
    try {
      audioCtx = new Ctx();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume().catch(() => undefined);
  }
  return audioCtx;
}

function gainMultiplier(): number {
  const { volume } = useSettingsStore.getState();
  return Math.min(1, Math.max(0.05, volume / 100)) * 0.14;
}

function scheduleTone(
  ctx: AudioContext,
  freq: number,
  startOffsetSec: number,
  durationSec: number,
  type: OscillatorType = 'sine',
  peakGain = 1
) {
  const now = ctx.currentTime + startOffsetSec;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);

  const vol = gainMultiplier() * peakGain;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), now + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + durationSec + 0.02);
}

export function playStartupChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  // Warm glass Fmaj9 chord arpeggio
  scheduleTone(ctx, 349.23, 0.0, 0.55, 'sine', 0.85);
  scheduleTone(ctx, 440.0, 0.1, 0.58, 'sine', 0.8);
  scheduleTone(ctx, 523.25, 0.2, 0.62, 'triangle', 0.65);
  scheduleTone(ctx, 659.25, 0.32, 0.78, 'sine', 0.9);
}

export function playNotificationChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  scheduleTone(ctx, 783.99, 0.0, 0.16, 'sine', 0.75);
  scheduleTone(ctx, 1046.5, 0.09, 0.28, 'sine', 0.85);
}

export function playErrorAlert(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  scheduleTone(ctx, 220, 0.0, 0.14, 'triangle', 0.8);
  scheduleTone(ctx, 174.61, 0.11, 0.22, 'triangle', 0.85);
}

export function playWindowTransition(kind: 'open' | 'close' | 'minimize' | 'restore'): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (kind === 'open' || kind === 'restore') {
    scheduleTone(ctx, 520, 0.0, 0.07, 'sine', 0.32);
    scheduleTone(ctx, 680, 0.03, 0.08, 'sine', 0.28);
  } else {
    scheduleTone(ctx, 540, 0.0, 0.07, 'sine', 0.28);
    scheduleTone(ctx, 380, 0.03, 0.08, 'sine', 0.24);
  }
}
