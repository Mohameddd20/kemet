import {
  connectWifiNetwork,
  deleteHostItem,
  downloadBrowserFile,
  execHostShell,
  executeHostFile,
  fetchBatteryStatus,
  fetchDiskPartitions,
  fetchHardwareControls,
  fetchHardwareNetwork,
  fetchHostRoots,
  fetchSystemHealth,
  fetchSystemMetrics,
  installStorePackage,
  isTauriRuntime,
  launchExternalLinuxApp,
  listHostDirectory,
  mkdirHost,
  openTauriExternalWebview,
  readHostFile,
  renameHostItem,
  setHardwareBrightness,
  setHardwareVolume,
  writeHostFile,
  type DiskPartitionInfo,
  type HostFsEntry,
  type HostFsRoots,
  type RealSystemMetrics,
} from '../system/systemBridge';

export {
  connectWifiNetwork,
  deleteHostItem,
  downloadBrowserFile,
  execHostShell,
  executeHostFile,
  fetchBatteryStatus,
  fetchDiskPartitions,
  fetchHardwareControls,
  fetchHardwareNetwork,
  fetchHostRoots,
  fetchSystemHealth,
  fetchSystemMetrics,
  isTauriRuntime,
  listHostDirectory,
  mkdirHost,
  readHostFile,
  renameHostItem,
  setHardwareBrightness,
  setHardwareVolume,
  writeHostFile,
  type DiskPartitionInfo,
  type HostFsEntry,
  type HostFsRoots,
  type RealSystemMetrics,
};
import type {
  SystemCheckpoint,
  SystemUpdateItem,
  UpdateManifest,
} from '../system/updateManifest';

interface TauriInternals {
  invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
}

interface TauriEventInternals {
  listen?: <T>(
    event: string,
    handler: (payload: { payload: T }) => void
  ) => Promise<() => void>;
}

async function invokeTauri<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const internals = (window as unknown as { __TAURI_INTERNALS__?: TauriInternals }).__TAURI_INTERNALS__;
  if (!internals?.invoke) {
    throw new Error('Tauri runtime not active');
  }
  return internals.invoke<T>(cmd, args);
}

export interface PciDriverItem {
  slot: string;
  deviceClass: string;
  deviceName: string;
  kernelDriver: string;
}

export interface RealHardwareSpecs {
  osName: string;
  kernel: string;
  arch: string;
  hostname: string;
  cpuModel: string;
  cpuCores: number;
  ramTotalGb: number;
  ramUsedGb: number;
  ramAvailableGb: number;
  ramUsedPercent: number;
  gpuModel: string;
  gpuDriver: string;
  storageLabel: string;
  storageDevices?: Array<{
    name: string;
    size: string;
    mountpoint?: string | null;
    fstype?: string | null;
    model?: string | null;
  }>;
  wifiChipset: string;
  wifiDriver: string;
  wifiSsid?: string | null;
  wifiSignal?: number | null;
  audioController: string;
  audioDriver: string;
  cameraDetected: boolean;
  cameraDevices: string[];
  cameraDriver: string;
  battery?: {
    available: boolean;
    percentage: number | null;
    charging: boolean;
  };
  pciDevices: PciDriverItem[];
}

export async function fetchRealSystemSpecs(): Promise<RealHardwareSpecs> {
  if (isTauriRuntime()) {
    return invokeTauri<RealHardwareSpecs>('get_real_hardware_specs');
  }
  const res = await fetch('/api/system/hardware-specs');
  const data = (await res.json()) as { ok: boolean; specs?: RealHardwareSpecs; error?: string };
  if (data.ok && data.specs) {
    return data.specs;
  }
  throw new Error(data.error ?? 'Failed to fetch real host hardware specs from backend');
}

export function subscribeThrottledTelemetry(
  intervalMs: number,
  onData: (metrics: RealSystemMetrics) => void,
  onError?: (err: string) => void
): () => void {
  let active = true;
  const poll = async () => {
    try {
      const m = await fetchSystemMetrics();
      if (active) onData(m);
    } catch (e) {
      if (active) onError?.(e instanceof Error ? e.message : 'Telemetry probe error');
    }
  };
  void poll();
  const id = setInterval(() => void poll(), Math.max(1500, intervalMs));
  return () => {
    active = false;
    clearInterval(id);
  };
}

export async function freeSystemRam(): Promise<{
  ok: boolean;
  freedMb: number;
  availableMb: number;
  totalMb: number;
}> {
  if (isTauriRuntime()) {
    return invokeTauri('free_system_ram');
  }
  const res = await fetch('/api/system/free-ram', { method: 'POST' });
  return (await res.json()) as {
    ok: boolean;
    freedMb: number;
    availableMb: number;
    totalMb: number;
  };
}

export type PowerActionType = 'poweroff' | 'reboot' | 'sleep' | 'logout' | 'lock';

export async function runPowerAction(
  action: PowerActionType
): Promise<{ ok: boolean; mode: 'tauri' | 'web'; message: string }> {
  if (isTauriRuntime()) {
    try {
      await invokeTauri('system_power_action', { action });
      return { ok: true, mode: 'tauri', message: `Executed system ${action}` };
    } catch (err) {
      return {
        ok: false,
        mode: 'tauri',
        message: err instanceof Error ? err.message : `Failed to run ${action}`,
      };
    }
  }
  return {
    ok: true,
    mode: 'web',
    message: `Web preview mode: "${action}" calls systemctl/loginctl directly inside KemetOS ISO.`,
  };
}

export async function setWifiState(
  enabled: boolean
): Promise<{ ok: boolean; enabled: boolean; note?: string }> {
  if (isTauriRuntime()) {
    return invokeTauri('set_wifi_state', { enabled });
  }
  const res = await fetch('/api/hardware/wifi-radio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled }),
  });
  return (await res.json()) as { ok: boolean; enabled: boolean; note?: string };
}

export async function isAppInstalled(
  cmd: string,
  packageName?: string
): Promise<{ installed: boolean; dpkgInstalled?: boolean; path: string | null }> {
  if (isTauriRuntime()) {
    return invokeTauri('is_app_installed', { cmd, packageName });
  }
  const res = await fetch(`/api/apps/check?cmd=${encodeURIComponent(cmd)}`);
  const data = (await res.json()) as { installed?: boolean; path?: string | null };
  return { installed: Boolean(data.installed), path: data.path ?? null };
}

export async function launchNativeApp(
  cmd: string,
  args: string[] = []
): Promise<{ ok: boolean; installed: boolean; mode: 'tauri' | 'web'; error?: string }> {
  if (isTauriRuntime()) {
    try {
      const res = await invokeTauri<{ ok: boolean; installed?: boolean; error?: string }>(
        'launch_system_app',
        { cmd, args }
      );
      return {
        ok: res.ok,
        installed: res.installed ?? res.ok,
        mode: 'tauri',
        error: res.error,
      };
    } catch (err) {
      return {
        ok: false,
        installed: false,
        mode: 'tauri',
        error: err instanceof Error ? err.message : `Failed to start ${cmd}`,
      };
    }
  }
  const check = await isAppInstalled(cmd);
  return {
    ok: false,
    installed: check.installed,
    mode: 'web',
    error: check.installed
      ? `تم التحقق من وجود ${cmd} (${check.path}). يعمل كنافذة X11 مستقلة داخل جلسة KemetOS ISO.`
      : `الحزمة ${cmd} غير مثبتة بعد — يمكن تثبيتها بنقرة واحدة من متجر كيميت.`,
  };
}

export async function launchAppNative(
  binary: string,
  args: string[] = []
): Promise<{ ok: boolean; mode: 'tauri' | 'web'; error?: string }> {
  if (isTauriRuntime()) {
    try {
      await invokeTauri('launch_system_app', { cmd: binary, args });
      return { ok: true, mode: 'tauri' };
    } catch {
      const fallback = await launchExternalLinuxApp(binary, args);
      return { ok: fallback.ok, mode: 'tauri', error: fallback.error };
    }
  }
  return {
    ok: false,
    mode: 'web',
    error: `Web preview mode: "${binary}" runs natively inside KemetOS Linux ISO.`,
  };
}

export async function runWindowsExe(
  exePath: string
): Promise<{ ok: boolean; runner?: string; winePrefix?: string; error?: string }> {
  if (isTauriRuntime()) {
    try {
      return await invokeTauri('run_compatibility_binary', { filePath: exePath });
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Wine execution failed' };
    }
  }
  const res = await fetch('/api/fs/exec-file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: exePath }),
  });
  return (await res.json()) as {
    ok: boolean;
    runner?: string;
    error?: string;
  };
}

export async function openEmbeddedBrowser(
  url: string,
  title?: string,
  useChromium = false
): Promise<{ ok: boolean; mode: 'tauri' | 'web'; error?: string }> {
  if (isTauriRuntime()) {
    try {
      await invokeTauri('open_real_browser', { url, title, useChromium });
      return { ok: true, mode: 'tauri' };
    } catch {
      try {
        await openTauriExternalWebview(url, title ?? 'متصفح كيميت');
        return { ok: true, mode: 'tauri' };
      } catch (err) {
        return {
          ok: false,
          mode: 'tauri',
          error: err instanceof Error ? err.message : 'WebKitGTK window launch failed',
        };
      }
    }
  }
  return { ok: false, mode: 'web' };
}

export async function installRealApp(
  appId: string,
  onProgress?: (line: string) => void
): Promise<{ ok: boolean; nativeInstalled?: boolean; logs?: string[]; note?: string; error?: string }> {
  if (isTauriRuntime()) {
    let unlisten: (() => void) | undefined;
    try {
      const eventApi = (window as unknown as { __TAURI_INTERNALS__?: TauriEventInternals })
        .__TAURI_INTERNALS__;
      if (eventApi?.listen && onProgress) {
        unlisten = await eventApi.listen<{ appId?: string; line?: string }>(
          'install-progress',
          (ev) => {
            if (ev.payload?.line) onProgress(ev.payload.line);
          }
        );
      }
      return await invokeTauri('install_real_app', { appId });
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Tauri install failed' };
    } finally {
      unlisten?.();
    }
  }
  onProgress?.(`$ sudo apt-get install -y ${appId}`);
  const pkgMap: Record<string, string> = {
    chrome: 'google-chrome-stable',
    vscode: 'code',
    obs: 'obs-studio',
  };
  return installStorePackage(pkgMap[appId] ?? appId);
}

export interface InstallChromeResponse {
  ok: boolean;
  nativeInstalled: boolean;
  launched?: boolean;
  requiresTauriLinux?: boolean;
  officialDebUrl: string;
  contentLengthMb?: number | null;
  binaryPath?: string | null;
  messageAr?: string;
  logs: string[];
  note?: string;
  error?: string;
}

export async function installGoogleChrome(
  onProgress?: (ev: { line?: string; progress?: number; stage?: string }) => void
): Promise<InstallChromeResponse> {
  const officialDebUrl =
    'https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb';

  if (isTauriRuntime()) {
    let unlisten: (() => void) | undefined;
    try {
      const eventApi = (window as unknown as { __TAURI_INTERNALS__?: TauriEventInternals })
        .__TAURI_INTERNALS__;
      if (eventApi?.listen && onProgress) {
        unlisten = await eventApi.listen<{
          appId?: string;
          line?: string;
          progress?: number;
          stage?: string;
        }>('install-progress', (ev) => {
          if (!ev.payload) return;
          if (!ev.payload.appId || ev.payload.appId === 'google-chrome') {
            onProgress({
              line: ev.payload.line,
              progress: ev.payload.progress,
              stage: ev.payload.stage,
            });
          }
        });
      }
      const res = await invokeTauri<Partial<InstallChromeResponse>>('install_google_chrome');
      return {
        ok: Boolean(res.ok),
        nativeInstalled: Boolean(res.nativeInstalled),
        launched: Boolean(res.launched),
        officialDebUrl,
        binaryPath: res.binaryPath ?? null,
        logs: Array.isArray(res.logs) ? res.logs : [],
        note: res.note,
        error: res.error,
      };
    } catch (err) {
      return {
        ok: false,
        nativeInstalled: false,
        officialDebUrl,
        logs: [],
        error: err instanceof Error ? err.message : 'Tauri Chrome installer error',
      };
    } finally {
      unlisten?.();
    }
  }

  const res = await fetch('/api/store/install-chrome', { method: 'POST' });
  const data = (await res.json()) as Partial<InstallChromeResponse>;
  const logs = Array.isArray(data.logs) ? data.logs : [];
  for (const line of logs) {
    onProgress?.({ line, stage: 'probe' });
  }
  return {
    ok: Boolean(data.ok),
    nativeInstalled: Boolean(data.nativeInstalled),
    launched: Boolean(data.launched),
    requiresTauriLinux: Boolean(data.requiresTauriLinux),
    officialDebUrl: data.officialDebUrl ?? officialDebUrl,
    contentLengthMb: data.contentLengthMb ?? null,
    binaryPath: data.binaryPath ?? null,
    messageAr: data.messageAr,
    logs,
    note: data.note,
    error: data.error,
  };
}

export async function installPackage(
  packageName: string,
  onProgress?: (line: string) => void
): Promise<{ ok: boolean; nativeInstalled?: boolean; logs?: string[]; note?: string; error?: string }> {
  if (isTauriRuntime()) {
    let unlisten: (() => void) | undefined;
    try {
      const eventApi = (window as unknown as { __TAURI_INTERNALS__?: TauriEventInternals })
        .__TAURI_INTERNALS__;
      if (eventApi?.listen && onProgress) {
        unlisten = await eventApi.listen<{ appId?: string; line?: string }>(
          'install-progress',
          (ev) => {
            if (ev.payload?.line) onProgress(ev.payload.line);
          }
        );
      }
      return await invokeTauri('install_deb_package', { packageName });
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Tauri apt install failed' };
    } finally {
      unlisten?.();
    }
  }
  return installStorePackage(packageName);
}

export async function installBundle(
  packages: string[]
): Promise<{ ok: boolean; note: string }> {
  if (isTauriRuntime()) {
    try {
      return await invokeTauri('install_bundle', { packages });
    } catch (err) {
      return {
        ok: false,
        note: err instanceof Error ? err.message : 'Tauri bundle install failed',
      };
    }
  }
  const results = await Promise.all(packages.map((pkg) => installStorePackage(pkg)));
  const allOk = results.every((r) => r.ok);
  return {
    ok: allOk,
    note: allOk
      ? `تم تثبيت الحزمة البرمجية (${packages.join(' + ')}) بنجاح.`
      : results.map((r) => r.note || r.error).filter(Boolean).join(' · '),
  };
}

export async function listDirectory(
  dirPath: string
): Promise<{ path: string; items: HostFsEntry[] }> {
  return listHostDirectory(dirPath);
}

export async function getDiskFreeSpaceLabel(isArabic: boolean): Promise<string> {
  if (isTauriRuntime()) {
    const avail = await invokeTauri<string>('get_disk_free_space');
    return isArabic ? `المساحة الفارغة: ${avail}` : `Free space: ${avail}`;
  }
  const disks = await fetchDiskPartitions();
  const rootDisk = disks.find((d) => d.mountPoint === '/') ?? disks[0];
  if (rootDisk) {
    const gb = (rootDisk.availableBytes / (1024 * 1024 * 1024)).toFixed(1);
    return isArabic ? `المساحة الفارغة: ${gb} جيجابايت` : `Free space: ${gb} GB`;
  }
  return isArabic ? 'المساحة الفارغة: غير متاح' : 'Free space: Unavailable';
}

export type DriverGroupKey = 'cpu' | 'gpu' | 'network' | 'audio' | 'camera' | 'usb';
export type DriverHealthStatus = 'installed' | 'update-available' | 'missing';

export interface DriverInventoryItem {
  id: string;
  group: DriverGroupKey;
  name: string;
  vendorDeviceId: string;
  kernelModule: string;
  previousModule: string;
  aptPackage: string;
  repoSource: string;
  signatureVerified: boolean;
  status: DriverHealthStatus;
}

export async function scanFullDrivers(): Promise<{
  ok: boolean;
  scannedAt: number;
  kernelRelease: string;
  drivers: DriverInventoryItem[];
}> {
  if (isTauriRuntime()) {
    return invokeTauri('scan_hardware_drivers');
  }
  const res = await fetch('/api/drivers/scan');
  return (await res.json()) as {
    ok: boolean;
    scannedAt: number;
    kernelRelease: string;
    drivers: DriverInventoryItem[];
  };
}

export async function runDriverAction(payload: {
  action: 'install' | 'reprobe' | 'rollback';
  kernelModule: string;
  previousModule?: string;
  aptPackage?: string;
}): Promise<{
  ok: boolean;
  action: string;
  activeModule?: string;
  status?: DriverHealthStatus;
  logs: string[];
}> {
  if (isTauriRuntime()) {
    return invokeTauri('manage_kernel_driver', {
      action: payload.action,
      kernelModule: payload.kernelModule,
      previousModule: payload.previousModule,
      aptPackage: payload.aptPackage,
    });
  }
  const res = await fetch('/api/drivers/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return (await res.json()) as {
    ok: boolean;
    action: string;
    activeModule?: string;
    status?: DriverHealthStatus;
    logs: string[];
  };
}

export interface SystemUpdatesCheckResponse {
  ok: boolean;
  version: string;
  osName: string;
  kernel: string;
  checkedAt: number;
  manifest: UpdateManifest;
  updates: SystemUpdateItem[];
  checkpoints: SystemCheckpoint[];
}

export async function checkSystemUpdates(): Promise<SystemUpdatesCheckResponse> {
  if (isTauriRuntime()) {
    return invokeTauri<SystemUpdatesCheckResponse>('check_system_updates');
  }
  const res = await fetch('/api/updates/check');
  return (await res.json()) as SystemUpdatesCheckResponse;
}

export async function applySystemUpdates(
  packages: string[],
  label?: string
): Promise<{
  ok: boolean;
  appliedCount: number;
  checkpoint?: SystemCheckpoint;
  checkpoints: SystemCheckpoint[];
  logs: string[];
}> {
  if (isTauriRuntime()) {
    return invokeTauri('apply_system_updates', { packages });
  }
  const res = await fetch('/api/updates/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ packages, label }),
  });
  return (await res.json()) as {
    ok: boolean;
    appliedCount: number;
    checkpoint?: SystemCheckpoint;
    checkpoints: SystemCheckpoint[];
    logs: string[];
  };
}

export async function rollbackSystemCheckpoint(checkpointId: string): Promise<{
  ok: boolean;
  restored?: SystemCheckpoint;
  checkpoints: SystemCheckpoint[];
  logs: string[];
}> {
  const res = await fetch('/api/updates/rollback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ checkpointId }),
  });
  return (await res.json()) as {
    ok: boolean;
    restored?: SystemCheckpoint;
    checkpoints: SystemCheckpoint[];
    logs: string[];
  };
}

export async function uninstallStorePackage(
  packageName: string
): Promise<{ ok: boolean; note?: string; error?: string }> {
  if (isTauriRuntime()) {
    return invokeTauri('uninstall_deb_package', { packageName });
  }
  const res = await fetch('/api/store/uninstall', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ packageName }),
  });
  return (await res.json()) as { ok: boolean; note?: string; error?: string };
}

export interface CompatibilityRuntimesReport {
  ok: boolean;
  checkedAt: number;
  arch: string;
  totalMb: number;
  availableMb: number;
  wineInstalled: boolean;
  wine64Installed: boolean;
  winetricksInstalled: boolean;
  winePrefix: string;
  winePrefixInitialized: boolean;
  wineRunning: boolean;
  wineApps: Array<{ name: string; folder: string; arch: '64-bit' | '32-bit' }>;
  dllOverrides: Array<{ id: string; label: string; installed: boolean }>;
  waydroidInstalled: boolean;
  kvmAvailable: boolean;
  cpuVirtualization: boolean;
  nativeBinaries: Array<{ name: string; path: string | null; installed: boolean }>;
  sandboxLimits: {
    maxOpenFiles: string;
    cpuCores: number;
    displayServer: string;
  };
}

export async function checkCompatibilityRuntimes(): Promise<CompatibilityRuntimesReport> {
  if (isTauriRuntime()) {
    return invokeTauri<CompatibilityRuntimesReport>('check_compatibility_runtimes');
  }
  const res = await fetch('/api/compatibility/runtimes');
  return (await res.json()) as CompatibilityRuntimesReport;
}

export async function stopWineServer(): Promise<{
  ok: boolean;
  reclaimedMb: number;
  availableMb: number;
  logs: string[];
}> {
  if (isTauriRuntime()) {
    return invokeTauri('stop_wine_server');
  }
  const res = await fetch('/api/compatibility/stop-wine', { method: 'POST' });
  return (await res.json()) as {
    ok: boolean;
    reclaimedMb: number;
    availableMb: number;
    logs: string[];
  };
}

export async function inspectBinaryDeps(target: string): Promise<{
  ok: boolean;
  path: string;
  libraries: Array<{ name: string; resolvedPath: string | null; isMissing: boolean }>;
  missingCount: number;
  lddRaw?: string;
  error?: string;
}> {
  if (isTauriRuntime()) {
    return invokeTauri('inspect_binary_deps', { target });
  }
  const res = await fetch('/api/compatibility/inspect-deps', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target }),
  });
  return (await res.json()) as {
    ok: boolean;
    path: string;
    libraries: Array<{ name: string; resolvedPath: string | null; isMissing: boolean }>;
    missingCount: number;
    lddRaw?: string;
    error?: string;
  };
}

export async function installWinetricksRuntime(verb: string): Promise<{
  ok: boolean;
  verb: string;
  installed: boolean;
  logs: string[];
}> {
  if (isTauriRuntime()) {
    return invokeTauri('install_winetricks_runtime', { verb });
  }
  const res = await fetch('/api/compatibility/winetricks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ verb }),
  });
  return (await res.json()) as { ok: boolean; verb: string; installed: boolean; logs: string[] };
}

export async function setupWaydroidRuntime(): Promise<{
  ok: boolean;
  logs: string[];
}> {
  if (isTauriRuntime()) {
    return invokeTauri('setup_waydroid_runtime');
  }
  const res = await fetch('/api/compatibility/waydroid-setup', { method: 'POST' });
  return (await res.json()) as { ok: boolean; logs: string[] };
}
