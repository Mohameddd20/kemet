import type { AppId, WindowInstance } from '../../windowManager/types';

export interface ProcessMetricRow {
  windowId: string;
  appId: AppId;
  title: string;
  status: 'Active' | 'Minimized';
  cpuPercent: number;
  memoryMb: number;
}

export interface SystemPerformanceSample {
  cpu: number;
  memoryMb: number;
  networkKbps: number;
}

const APP_BASE_RAM: Record<AppId, number> = {
  files: 48,
  terminal: 34,
  editor: 42,
  calculator: 26,
  settings: 38,
  taskmgr: 52,
  browser: 118,
  media: 64,
  camera: 72,
  store: 60,
  recycle: 24,
  hardware: 44,
  updates: 40,
  compatibility: 46,
  welcome: 28,
  learn: 28,
  about: 26,
};

const APP_BASE_CPU: Record<AppId, number> = {
  files: 1.4,
  terminal: 0.9,
  editor: 1.1,
  calculator: 0.4,
  settings: 0.8,
  taskmgr: 2.1,
  browser: 4.5,
  media: 2.8,
  camera: 3.4,
  store: 1.5,
  recycle: 0.3,
  hardware: 1.2,
  updates: 1.0,
  compatibility: 1.3,
  welcome: 0.4,
  learn: 0.4,
  about: 0.3,
};

export function estimateProcessMetrics(
  windows: WindowInstance[],
  focusedWindowId: string | null,
  tick: number
): ProcessMetricRow[] {
  return windows.map((win, idx) => {
    const baseCpu = APP_BASE_CPU[win.appId] ?? 1.0;
    const baseRam = APP_BASE_RAM[win.appId] ?? 40;
    const isFocused = win.id === focusedWindowId && !win.isMinimized;

    const wave = Math.sin(tick * 0.9 + idx * 1.7);
    const cpuMultiplier = win.isMinimized ? 0.35 : isFocused ? 1.5 : 1.0;
    const cpu = Math.max(0.1, Math.round((baseCpu * cpuMultiplier + wave * 0.6) * 10) / 10);
    const ramJitter = Math.round(Math.cos(tick * 0.6 + idx * 2.1) * 4);
    const memoryMb = Math.max(16, baseRam + ramJitter + (win.isMaximized ? 8 : 0));

    return {
      windowId: win.id,
      appId: win.appId,
      title: win.title,
      status: win.isMinimized ? 'Minimized' : 'Active',
      cpuPercent: cpu,
      memoryMb,
    };
  });
}

export function computeSystemSample(
  processes: ProcessMetricRow[],
  wifiOnline: boolean,
  tick: number
): SystemPerformanceSample {
  const procCpu = processes.reduce((sum, p) => sum + p.cpuPercent, 0);
  const procRam = processes.reduce((sum, p) => sum + p.memoryMb, 0);

  const kernelCpu = 2.4 + Math.abs(Math.sin(tick * 0.5)) * 2.2;
  const cpu = Math.min(99, Math.round((kernelCpu + procCpu) * 10) / 10);
  const memoryMb = 240 + procRam;
  const hasBrowser = processes.some((p) => p.appId === 'browser' && p.status === 'Active');
  const networkKbps = !wifiOnline
    ? 0
    : hasBrowser
      ? Math.round(140 + Math.abs(Math.sin(tick * 1.1)) * 280)
      : Math.round(8 + Math.abs(Math.cos(tick * 0.7)) * 18);

  return { cpu, memoryMb, networkKbps };
}

export function pushMetricSample<T>(series: T[], next: T, maxLen: number = 24): T[] {
  const combined = [...series, next];
  if (combined.length <= maxLen) return combined;
  return combined.slice(combined.length - maxLen);
}

export function buildSvgPolylinePoints(
  values: number[],
  width: number,
  height: number,
  maxValue: number
): string {
  if (values.length === 0) return '';
  const safeMax = Math.max(1, maxValue);
  if (values.length === 1) {
    const y = height - (Math.min(safeMax, Math.max(0, values[0])) / safeMax) * height;
    return `0,${y.toFixed(1)} ${width},${y.toFixed(1)}`;
  }

  return values
    .map((val, idx) => {
      const x = (idx / (values.length - 1)) * width;
      const clamped = Math.min(safeMax, Math.max(0, val));
      const y = height - (clamped / safeMax) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}
