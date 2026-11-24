export interface RealMemoryMetrics {
  totalMb: number;
  availableMb: number;
  usedMb: number;
  cachedMb: number;
  usedPercent: number;
}

export interface RealNetworkInterfaceCounter {
  name: string;
  rxBytes: number;
  txBytes: number;
}

export interface RealOsProcess {
  pid: number;
  ppid: number;
  name: string;
  cpuPercent: number;
  memPercent: number;
  memoryMb: number;
  state: string;
}

export interface RealSystemMetrics {
  timestamp: number;
  hostname: string;
  platform: string;
  arch: string;
  uptimeSec: number;
  loadAvg: number[];
  cpuModel: string;
  cpuCores: number;
  cpuPercent: number;
  corePercents: number[];
  memory: RealMemoryMetrics;
  network: {
    rxKbps: number;
    txKbps: number;
    totalKbps: number;
    rxBytes: number;
    txBytes: number;
    interfaces: RealNetworkInterfaceCounter[];
  };
  processes: RealOsProcess[];
}

export interface HostFsRoots {
  homeDir: string;
  workspaceDir: string;
  desktopDir: string;
  documentsDir: string;
  downloadsDir: string;
  picturesDir: string;
  musicDir: string;
  videosDir: string;
  allowedRoots: string[];
}

export interface DiskPartitionInfo {
  filesystem: string;
  fsType: string;
  mountPoint: string;
  label: string;
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  usedPercent: number;
}

export interface HostFsEntry {
  name: string;
  path: string;
  type: 'folder' | 'file';
  size: number;
  updatedAt: number;
  extension: string;
}

export interface HardwareNetworkInfo {
  wifiHardwareAvailable: boolean;
  reason: string;
  interfaces: Array<{
    name: string;
    address: string;
    mac: string;
    internal: boolean;
    rxBytes: number;
    txBytes: number;
  }>;
  wifiNetworks: Array<{
    ssid: string;
    signal: number;
    security: string;
    inUse: boolean;
  }>;
}

export interface HardwareControlStatus {
  backlightAvailable: boolean;
  audioAvailable: boolean;
  brightness: number;
  volume: number;
  notes: string;
}

interface TauriInternals {
  invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
}

export function isTauriRuntime(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof (window as unknown as { __TAURI_INTERNALS__?: TauriInternals }).__TAURI_INTERNALS__
      ?.invoke === 'function'
  );
}

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const internals = (window as unknown as { __TAURI_INTERNALS__: TauriInternals })
    .__TAURI_INTERNALS__;
  return internals.invoke<T>(cmd, args);
}

export async function fetchSystemMetrics(): Promise<RealSystemMetrics> {
  if (isTauriRuntime()) {
    return tauriInvoke<RealSystemMetrics>('get_system_telemetry');
  }
  const res = await fetch('/api/system/metrics');
  const data = (await res.json()) as { ok: boolean; metrics?: RealSystemMetrics; error?: string };
  if (!data.ok || !data.metrics) {
    throw new Error(data.error ?? 'Failed to fetch system metrics');
  }
  return data.metrics;
}

export function subscribeSystemMetrics(
  onData: (metrics: RealSystemMetrics) => void,
  onError?: (err: string) => void
): () => void {
  if (isTauriRuntime()) {
    let active = true;
    const poll = async () => {
      try {
        const m = await tauriInvoke<RealSystemMetrics>('get_system_telemetry');
        if (active) onData(m);
      } catch (e) {
        if (active) onError?.(e instanceof Error ? e.message : 'Tauri telemetry error');
      }
    };
    void poll();
    const id = setInterval(() => void poll(), 1000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }

  const source = new EventSource('/api/system/stream');
  source.onmessage = (event) => {
    try {
      const parsed = JSON.parse(event.data) as RealSystemMetrics;
      onData(parsed);
    } catch {
      // Ignore malformed SSE frame
    }
  };
  source.onerror = () => {
    onError?.('Live telemetry stream disconnected; retrying...');
  };
  return () => {
    source.close();
  };
}

export async function fetchHostRoots(): Promise<HostFsRoots> {
  if (isTauriRuntime()) {
    return tauriInvoke<HostFsRoots>('get_host_roots');
  }
  const res = await fetch('/api/fs/roots');
  const data = (await res.json()) as { ok: boolean; roots: HostFsRoots };
  if (!data.ok) throw new Error('Unable to load host directories');
  return data.roots;
}

export async function listHostDirectory(dirPath: string): Promise<{ path: string; items: HostFsEntry[] }> {
  if (isTauriRuntime()) {
    return tauriInvoke<{ path: string; items: HostFsEntry[] }>('list_directory', { dirPath });
  }
  const res = await fetch(`/api/fs/list?path=${encodeURIComponent(dirPath)}`);
  const data = (await res.json()) as {
    ok: boolean;
    path?: string;
    items?: HostFsEntry[];
    error?: string;
  };
  if (!data.ok || !data.items || !data.path) {
    throw new Error(data.error ?? 'Failed to list directory');
  }
  return { path: data.path, items: data.items };
}

export async function readHostFile(filePath: string): Promise<{ path: string; content: string; size: number }> {
  if (isTauriRuntime()) {
    return tauriInvoke<{ path: string; content: string; size: number }>('read_host_file', { filePath });
  }
  const res = await fetch(`/api/fs/read?path=${encodeURIComponent(filePath)}`);
  const data = (await res.json()) as {
    ok: boolean;
    path?: string;
    content?: string;
    size?: number;
    error?: string;
  };
  if (!data.ok || data.content === undefined || !data.path) {
    throw new Error(data.error ?? 'Failed to read file');
  }
  return { path: data.path, content: data.content, size: data.size ?? data.content.length };
}

export async function writeHostFile(filePath: string, content: string): Promise<void> {
  if (isTauriRuntime()) {
    await tauriInvoke('write_host_file', { filePath, content });
    return;
  }
  const res = await fetch('/api/fs/write', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: filePath, content }),
  });
  const data = (await res.json()) as { ok: boolean; error?: string };
  if (!data.ok) throw new Error(data.error ?? 'Failed to save file');
}

export async function writeHostBinaryFile(filePath: string, base64: string): Promise<void> {
  const res = await fetch('/api/fs/write-binary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: filePath, base64 }),
  });
  const data = (await res.json()) as { ok: boolean; error?: string };
  if (!data.ok) throw new Error(data.error ?? 'Failed to save binary file');
}

export async function mkdirHost(dirPath: string): Promise<void> {
  if (isTauriRuntime()) {
    await tauriInvoke('mkdir_host', { dirPath });
    return;
  }
  const res = await fetch('/api/fs/mkdir', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: dirPath }),
  });
  const data = (await res.json()) as { ok: boolean; error?: string };
  if (!data.ok) throw new Error(data.error ?? 'Failed to create folder');
}

export async function renameHostItem(oldPath: string, newName: string): Promise<void> {
  if (isTauriRuntime()) {
    await tauriInvoke('rename_host_item', { oldPath, newName });
    return;
  }
  const res = await fetch('/api/fs/rename', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldPath, newName }),
  });
  const data = (await res.json()) as { ok: boolean; error?: string };
  if (!data.ok) throw new Error(data.error ?? 'Failed to rename item');
}

export async function deleteHostItem(targetPath: string): Promise<void> {
  if (isTauriRuntime()) {
    await tauriInvoke('delete_host_item', { targetPath });
    return;
  }
  const res = await fetch('/api/fs/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: targetPath }),
  });
  const data = (await res.json()) as { ok: boolean; error?: string };
  if (!data.ok) throw new Error(data.error ?? 'Failed to delete item');
}

export function getHostRawUrl(filePath: string): string {
  return `/api/fs/raw?path=${encodeURIComponent(filePath)}`;
}

export async function execHostShell(
  command: string,
  cwd: string
): Promise<{ ok: boolean; stdout: string; stderr: string; exitCode: number; nextCwd: string }> {
  if (isTauriRuntime()) {
    return tauriInvoke<{ ok: boolean; stdout: string; stderr: string; exitCode: number; nextCwd: string }>(
      'exec_host_shell',
      { command, cwd }
    );
  }
  const res = await fetch('/api/shell/exec', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, cwd }),
  });
  return (await res.json()) as {
    ok: boolean;
    stdout: string;
    stderr: string;
    exitCode: number;
    nextCwd: string;
  };
}

export async function fetchHardwareNetwork(): Promise<HardwareNetworkInfo> {
  if (isTauriRuntime()) {
    return tauriInvoke<HardwareNetworkInfo>('scan_wifi_networks');
  }
  const res = await fetch('/api/hardware/network');
  const data = (await res.json()) as HardwareNetworkInfo & { ok: boolean };
  return data;
}

export async function connectWifiNetwork(
  ssid: string,
  password: string
): Promise<{ ok: boolean; message?: string; error?: string }> {
  if (isTauriRuntime()) {
    return tauriInvoke<{ ok: boolean; message?: string; error?: string }>('connect_wifi', {
      ssid,
      password,
    });
  }
  const res = await fetch('/api/hardware/wifi-connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ssid, password }),
  });
  return (await res.json()) as { ok: boolean; message?: string; error?: string };
}

export async function setWifiRadioState(
  enabled: boolean
): Promise<{ ok: boolean; enabled: boolean; note?: string }> {
  if (isTauriRuntime()) {
    return tauriInvoke('set_wifi_state', { enabled });
  }
  const res = await fetch('/api/hardware/wifi-radio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled }),
  });
  return (await res.json()) as { ok: boolean; enabled: boolean; note?: string };
}

export async function fetchHardwareControls(): Promise<HardwareControlStatus> {
  if (isTauriRuntime()) {
    return tauriInvoke<HardwareControlStatus>('get_hardware_controls');
  }
  const res = await fetch('/api/hardware/controls');
  const data = (await res.json()) as HardwareControlStatus & { ok: boolean };
  return data;
}

export async function setHardwareBrightness(
  value: number
): Promise<{ ok: boolean; value: number; appliedToHardware: boolean }> {
  if (isTauriRuntime()) {
    return tauriInvoke<{ ok: boolean; value: number; appliedToHardware: boolean }>(
      'set_brightness',
      { value }
    );
  }
  const res = await fetch('/api/hardware/brightness', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  });
  return (await res.json()) as { ok: boolean; value: number; appliedToHardware: boolean };
}

export async function setHardwareVolume(
  value: number
): Promise<{ ok: boolean; value: number; appliedToHardware: boolean }> {
  if (isTauriRuntime()) {
    return tauriInvoke<{ ok: boolean; value: number; appliedToHardware: boolean }>(
      'set_volume',
      { value }
    );
  }
  const res = await fetch('/api/hardware/volume', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  });
  return (await res.json()) as { ok: boolean; value: number; appliedToHardware: boolean };
}

export async function openTauriExternalWebview(url: string, title: string): Promise<void> {
  if (!isTauriRuntime()) {
    throw new Error('Multi-Webview requires Tauri desktop runtime.');
  }
  await tauriInvoke('open_multi_webview', { url, title });
}

export interface BatteryStatusInfo {
  available: boolean;
  percentage: number | null;
  charging: boolean;
  timeRemaining: string | null;
  source: 'web-battery' | 'sysfs' | 'upower' | 'acpi' | 'none';
  note: string;
}

interface NavigatorBatteryManager {
  level: number;
  charging: boolean;
  dischargingTime: number;
  chargingTime: number;
}

export async function fetchBatteryStatus(): Promise<BatteryStatusInfo> {
  if (isTauriRuntime()) {
    try {
      return await tauriInvoke<BatteryStatusInfo>('get_battery_status');
    } catch {
      // fall through
    }
  }

  // First probe backend hardware battery (sysfs / upower / acpi)
  try {
    const res = await fetch('/api/hardware/battery');
    const data = (await res.json()) as BatteryStatusInfo & { ok?: boolean };
    if (data.available && data.percentage !== null) {
      return data;
    }
  } catch {
    // ignore backend error
  }

  // Next check Web Battery API (Chrome/Edge/Android)
  if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
    try {
      const getBat = (navigator as unknown as { getBattery: () => Promise<NavigatorBatteryManager> })
        .getBattery;
      const bat = await getBat();
      const pct = Math.round(bat.level * 100);
      const sec = bat.charging ? bat.chargingTime : bat.dischargingTime;
      let timeRemaining: string | null = null;
      if (Number.isFinite(sec) && sec > 0 && sec < 86400 * 3) {
        const hrs = Math.floor(sec / 3600);
        const mins = Math.floor((sec % 3600) / 60);
        timeRemaining = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
      }
      return {
        available: true,
        percentage: pct,
        charging: bat.charging,
        timeRemaining,
        source: 'web-battery',
        note: 'Read via Browser Battery Status API.',
      };
    } catch {
      // Web Battery blocked or unsupported
    }
  }

  return {
    available: false,
    percentage: null,
    charging: false,
    timeRemaining: null,
    source: 'none',
    note: 'AC power / no physical battery sensor exposed by host.',
  };
}

export interface WeatherInfo {
  available: boolean;
  locationLabel: string;
  temperatureC: number | null;
  weatherCode: number | null;
  windSpeedKmh: number | null;
  updatedAt: number;
  note?: string;
}

export async function fetchLiveWeather(lat = 30.0444, lon = 31.2357, label = 'Cairo, EG'): Promise<WeatherInfo> {
  const res = await fetch(
    `/api/system/weather?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&label=${encodeURIComponent(label)}`
  );
  const data = (await res.json()) as WeatherInfo & { ok?: boolean };
  return data;
}

export interface InstalledLinuxApp {
  id: string;
  name: string;
  binary: string;
  path: string;
  category: string;
}

export async function fetchInstalledLinuxApps(): Promise<InstalledLinuxApp[]> {
  const res = await fetch('/api/system/linux-apps');
  const data = (await res.json()) as { ok: boolean; apps?: InstalledLinuxApp[] };
  return data.ok && Array.isArray(data.apps) ? data.apps : [];
}

export async function launchExternalLinuxApp(
  binary: string,
  args: string[] = []
): Promise<{ ok: boolean; error?: string }> {
  if (!isTauriRuntime()) {
    return {
      ok: false,
      error: `Desktop runtime (Tauri) required to launch native GUI/CLI binary "${binary}".`,
    };
  }
  try {
    await tauriInvoke('launch_linux_app', { binary, args });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Launch failed' };
  }
}

export async function fetchDiskPartitions(): Promise<DiskPartitionInfo[]> {
  if (isTauriRuntime()) {
    try {
      return await tauriInvoke<DiskPartitionInfo[]>('get_disk_partitions');
    } catch {
      // Fall back to HTTP API
    }
  }
  const res = await fetch('/api/fs/disks');
  const data = (await res.json()) as { ok: boolean; disks?: DiskPartitionInfo[] };
  return data.ok && Array.isArray(data.disks) ? data.disks : [];
}

export async function executeHostFile(
  filePath: string
): Promise<{ ok: boolean; runner?: string; stdout?: string; stderr?: string; error?: string }> {
  if (isTauriRuntime()) {
    try {
      return await tauriInvoke('execute_host_file', { filePath });
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Execution failed' };
    }
  }
  const res = await fetch('/api/fs/exec-file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: filePath }),
  });
  return (await res.json()) as {
    ok: boolean;
    runner?: string;
    stdout?: string;
    stderr?: string;
    error?: string;
  };
}

export async function downloadBrowserFile(
  url: string,
  filename?: string
): Promise<{ ok: boolean; filename?: string; path?: string; sizeBytes?: number; error?: string }> {
  const res = await fetch('/api/browser/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, filename }),
  });
  return (await res.json()) as {
    ok: boolean;
    filename?: string;
    path?: string;
    sizeBytes?: number;
    error?: string;
  };
}

export async function installStorePackage(
  packageName: string
): Promise<{ ok: boolean; nativeInstalled?: boolean; binaryPath?: string; note?: string; error?: string }> {
  if (isTauriRuntime()) {
    try {
      return await tauriInvoke('install_store_package', { packageName });
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Tauri installer error' };
    }
  }
  const res = await fetch('/api/store/install', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ packageName }),
  });
  return (await res.json()) as {
    ok: boolean;
    nativeInstalled?: boolean;
    binaryPath?: string;
    note?: string;
    error?: string;
  };
}

export interface SystemHealthCheckItem {
  id: 'gpu' | 'network' | 'audio' | 'power' | 'memory';
  title: string;
  arabicTitle: string;
  status: 'verified' | 'detected';
  device: string;
  driver: string;
  details: string;
}

export interface SystemHealthReport {
  timestamp: number;
  system: {
    hostname: string;
    osArchitecture: string;
    kernelRelease: string;
    platform: string;
    cpus: number;
    cpuModel: string;
  };
  checks: SystemHealthCheckItem[];
}

export async function fetchSystemHealth(): Promise<SystemHealthReport> {
  let report: SystemHealthReport;
  if (isTauriRuntime()) {
    report = await tauriInvoke<SystemHealthReport>('get_system_health');
  } else {
    const res = await fetch('/api/system/health');
    const data = (await res.json()) as { ok: boolean; health?: SystemHealthReport };
    if (data.ok && data.health) {
      report = data.health;
    } else {
      throw new Error('Unable to probe backend system health');
    }
  }

  // Client WebGL enrichment for GPU if browser/WebKit has direct GPU context
  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const dbg = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
        if (dbg) {
          const renderer = (gl as WebGLRenderingContext).getParameter(dbg.UNMASKED_RENDERER_WEBGL);
          if (renderer && typeof renderer === 'string') {
            const gpuCheck = report.checks.find((c) => c.id === 'gpu');
            if (gpuCheck) {
              gpuCheck.device = renderer;
              gpuCheck.status = 'verified';
              gpuCheck.details = `Hardware GPU: ${renderer} (OpenGL/WebGL direct driver pipeline)`;
            }
          }
        }
      }
    } catch {
      // Ignore WebGL probe failure
    }
  }

  return report;
}
