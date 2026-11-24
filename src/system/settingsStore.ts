import { create } from 'zustand';
import type { LanguageId } from './i18n';
import { setHardwareBrightness, setHardwareVolume, setWifiRadioState } from './systemBridge';
import type { PresetWallpaperId } from './wallpapers';

export type AccentColorId =
  | 'mint-teal'
  | 'electric-blue'
  | 'neon-green'
  | 'amber-gold'
  | 'violet'
  | 'crimson';

export type WallpaperSelection =
  | { kind: 'preset'; id: PresetWallpaperId }
  | { kind: 'solid'; color: string; label: string }
  | { kind: 'custom'; dataUrl: string; label: string };

export type TaskbarAlignment = 'left' | 'center';
export type ClockFormat = '12h' | '24h';
export type PowerMode = 'performance' | 'balanced' | 'efficiency';
export type PerformanceProfile = 'auto' | 'lite' | 'balanced' | 'gaming';

export interface PinnedWebApp {
  id: string;
  name: string;
  url: string;
  category: string;
}

export interface RecentFileItem {
  name: string;
  path: string;
  storageMode: 'host' | 'vfs';
  openedAt: number;
}

export interface RecycledVfsItem {
  id: string;
  name: string;
  originalParentPath: string;
  originalPath: string;
  type: 'file' | 'folder';
  content: string;
  deletedAt: number;
  source?: 'vfs' | 'host' | 'desktop-shortcut' | 'desktop-virtual';
  shortcutId?: string;
  appId?: string;
  vectorId?: string;
  initialDir?: string;
  labelAr?: string;
  labelEn?: string;
}

export interface InstalledStoreApp {
  id: string;
  name: string;
  arabicName: string;
  category: string;
  packageName: string;
  binary: string;
  launchMode: 'web' | 'terminal' | 'tauri' | 'emulator';
  launchUrl?: string;
  badgeText: string;
  accentBg: string;
  installedAt: number;
  hostNote?: string;
}

export interface StoreOperationRecord {
  id: string;
  title: string;
  command: string;
  status: 'completed' | 'running' | 'failed';
  timestamp: number;
  details?: string;
}

export interface BrowserDownloadItem {
  id: string;
  filename: string;
  path: string;
  url: string;
  sizeBytes: number;
  downloadedAt: number;
}

export interface AccentPalette {
  id: AccentColorId;
  label: string;
  accent: string;
  hover: string;
  text: string;
  soft: string;
  border: string;
}

export const ACCENT_PALETTES: Record<AccentColorId, AccentPalette> = {
  'mint-teal': {
    id: 'mint-teal',
    label: 'Kemet Mint Teal',
    accent: '#10b981',
    hover: '#2dd4bf',
    text: '#2dd4bf',
    soft: 'rgba(45, 212, 191, 0.16)',
    border: 'rgba(45, 212, 191, 0.55)',
  },
  'electric-blue': {
    id: 'electric-blue',
    label: 'Ocean Blue',
    accent: '#0078d4',
    hover: '#2b88d8',
    text: '#60cdff',
    soft: 'rgba(0, 120, 212, 0.22)',
    border: 'rgba(96, 205, 255, 0.55)',
  },
  'neon-green': {
    id: 'neon-green',
    label: 'Emerald Pulse',
    accent: '#059669',
    hover: '#10b981',
    text: '#34d399',
    soft: 'rgba(52, 211, 153, 0.16)',
    border: 'rgba(52, 211, 153, 0.55)',
  },
  'amber-gold': {
    id: 'amber-gold',
    label: 'Pharaoh Gold',
    accent: '#d97706',
    hover: '#f59e0b',
    text: '#fbbf24',
    soft: 'rgba(251, 191, 36, 0.16)',
    border: 'rgba(251, 191, 36, 0.55)',
  },
  violet: {
    id: 'violet',
    label: 'Cyber Violet',
    accent: '#7c3aed',
    hover: '#8b5cf6',
    text: '#a78bfa',
    soft: 'rgba(167, 139, 250, 0.16)',
    border: 'rgba(167, 139, 250, 0.55)',
  },
  crimson: {
    id: 'crimson',
    label: 'Crimson Pulse',
    accent: '#e11d48',
    hover: '#f43f5e',
    text: '#fb7185',
    soft: 'rgba(251, 113, 133, 0.16)',
    border: 'rgba(251, 113, 133, 0.55)',
  },
};

export interface SystemSettingsState {
  wallpaper: WallpaperSelection;
  accentColor: AccentColorId;
  showDesktopIcons: boolean;
  taskbarPosition: 'bottom' | 'top';
  taskbarAlignment: TaskbarAlignment;
  language: LanguageId;
  clockFormat: ClockFormat;
  timezone: string;
  brightness: number;
  volume: number;
  muted: boolean;
  nightLight: boolean;
  wifiEnabled: boolean;
  bluetoothEnabled: boolean;
  airplaneMode: boolean;
  batterySaver: boolean;
  accessibilityHighContrast: boolean;
  powerMode: PowerMode;
  performanceProfile: PerformanceProfile;
  liteModeDetected: boolean;
  webkitDisableCompositing: boolean;
  soundEffectsEnabled: boolean;
  username: string;
  password: string;
  pcName: string;
  oobeCompleted: boolean;
  desktopLayout: 'windows' | 'hybrid';
  pinnedWebApps: PinnedWebApp[];
  installedStoreApps: InstalledStoreApp[];
  storeHistory: StoreOperationRecord[];
  pendingUpdatesCount: number;
  browserDownloads: BrowserDownloadItem[];
  recentFiles: RecentFileItem[];
  recycleBin: RecycledVfsItem[];
  setWallpaper: (wp: WallpaperSelection) => void;
  setAccentColor: (color: AccentColorId) => void;
  setShowDesktopIcons: (show: boolean) => void;
  setTaskbarPosition: (pos: 'bottom' | 'top') => void;
  setTaskbarAlignment: (align: TaskbarAlignment) => void;
  setLanguage: (lang: LanguageId) => void;
  setClockFormat: (fmt: ClockFormat) => void;
  setTimezone: (tz: string) => void;
  setBrightness: (val: number) => void;
  setVolume: (val: number) => void;
  setMuted: (muted: boolean) => void;
  setNightLight: (enabled: boolean) => void;
  setWifiEnabled: (enabled: boolean) => void;
  setBluetoothEnabled: (enabled: boolean) => void;
  setAirplaneMode: (enabled: boolean) => void;
  setBatterySaver: (enabled: boolean) => void;
  setAccessibilityHighContrast: (enabled: boolean) => void;
  setPowerMode: (mode: PowerMode) => void;
  setPerformanceProfile: (profile: PerformanceProfile) => void;
  setLiteModeDetected: (detected: boolean) => void;
  setWebkitDisableCompositing: (disabled: boolean) => void;
  setSoundEffectsEnabled: (enabled: boolean) => void;
  setCredentials: (username: string, password: string) => void;
  setPcName: (name: string) => void;
  setOobeCompleted: (completed: boolean) => void;
  setDesktopLayout: (layout: 'windows' | 'hybrid') => void;
  pinWebApp: (app: PinnedWebApp) => void;
  unpinWebApp: (id: string) => void;
  installStoreApp: (app: Omit<InstalledStoreApp, 'installedAt'>) => void;
  uninstallStoreApp: (id: string) => void;
  addStoreOperation: (op: Omit<StoreOperationRecord, 'id' | 'timestamp'>) => void;
  applyPendingUpdates: () => void;
  addBrowserDownload: (item: Omit<BrowserDownloadItem, 'id' | 'downloadedAt'>) => void;
  clearBrowserDownloads: () => void;
  addRecentFile: (item: Omit<RecentFileItem, 'openedAt'>) => void;
  moveToRecycleBin: (item: Omit<RecycledVfsItem, 'id' | 'deletedAt'>) => void;
  removeFromRecycleBin: (id: string) => void;
  emptyRecycleBin: () => void;
}

const STORAGE_KEY = 'kemetos_settings_v1';

interface PersistedSettings {
  wallpaper: WallpaperSelection;
  accentColor: AccentColorId;
  showDesktopIcons: boolean;
  taskbarPosition: 'bottom' | 'top';
  taskbarAlignment: TaskbarAlignment;
  language: LanguageId;
  clockFormat: ClockFormat;
  timezone: string;
  brightness: number;
  volume: number;
  muted: boolean;
  nightLight: boolean;
  wifiEnabled: boolean;
  bluetoothEnabled: boolean;
  airplaneMode: boolean;
  batterySaver: boolean;
  accessibilityHighContrast: boolean;
  powerMode: PowerMode;
  performanceProfile: PerformanceProfile;
  webkitDisableCompositing: boolean;
  soundEffectsEnabled: boolean;
  username: string;
  password: string;
  pcName: string;
  oobeCompleted: boolean;
  desktopLayout: 'windows' | 'hybrid';
  pinnedWebApps: PinnedWebApp[];
  installedStoreApps: InstalledStoreApp[];
  storeHistory: StoreOperationRecord[];
  pendingUpdatesCount: number;
  browserDownloads: BrowserDownloadItem[];
  recentFiles: RecentFileItem[];
  recycleBin: RecycledVfsItem[];
}

const DEFAULT_SETTINGS: PersistedSettings = {
  wallpaper: { kind: 'preset', id: 'prism' },
  accentColor: 'mint-teal',
  showDesktopIcons: true,
  taskbarPosition: 'bottom',
  taskbarAlignment: 'center',
  language: 'ar',
  clockFormat: '12h',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Cairo',
  brightness: 100,
  volume: 75,
  muted: false,
  nightLight: false,
  wifiEnabled: true,
  bluetoothEnabled: false,
  airplaneMode: false,
  batterySaver: false,
  accessibilityHighContrast: false,
  powerMode: 'balanced',
  performanceProfile: 'auto',
  webkitDisableCompositing: false,
  soundEffectsEnabled: true,
  username: 'kemet',
  password: '',
  pcName: 'kemetos',
  oobeCompleted: true,
  desktopLayout: 'windows',
  pinnedWebApps: [],
  installedStoreApps: [
    {
      id: 'firefox',
      name: 'Firefox ESR',
      arabicName: 'متصفح فيرفكس',
      category: 'Internet',
      packageName: 'firefox-esr',
      binary: 'firefox',
      launchMode: 'web',
      launchUrl: 'https://duckduckgo.com',
      badgeText: 'FF',
      accentBg: 'from-orange-500 to-amber-600',
      installedAt: Date.now() - 86400000,
    },
  ],
  storeHistory: [
    {
      id: 'hist-init-1',
      title: 'تحديث مستودعات KemetOS 1.0 (Debian Bookworm)',
      command: 'apt-get update',
      status: 'completed',
      timestamp: Date.now() - 3600000,
      details: 'تمت مزامنة حزم النظام الأساسية بنجاح.',
    },
  ],
  pendingUpdatesCount: 1,
  browserDownloads: [],
  recentFiles: [],
  recycleBin: [],
};

function syncDocumentDirection(lang: LanguageId) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lang === 'ar' ? 'ar' : 'en';
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
}

export function isLiteModeEffective(
  profile: PerformanceProfile,
  liteDetected: boolean
): boolean {
  return profile === 'lite' || (profile === 'auto' && liteDetected);
}

export function syncLiteModeClass(profile: PerformanceProfile, liteDetected: boolean) {
  if (typeof document === 'undefined') return;
  const enabled = isLiteModeEffective(profile, liteDetected);
  document.documentElement.classList.toggle('kemet-lite-mode', enabled);
}

function loadInitialSettings(): PersistedSettings {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_SETTINGS;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<PersistedSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      username:
        typeof parsed.username === 'string' && parsed.username.trim()
          ? parsed.username.trim()
          : DEFAULT_SETTINGS.username,
      pinnedWebApps: Array.isArray(parsed.pinnedWebApps) ? parsed.pinnedWebApps : [],
      installedStoreApps: Array.isArray(parsed.installedStoreApps)
        ? parsed.installedStoreApps
        : DEFAULT_SETTINGS.installedStoreApps,
      storeHistory: Array.isArray(parsed.storeHistory)
        ? parsed.storeHistory
        : DEFAULT_SETTINGS.storeHistory,
      browserDownloads: Array.isArray(parsed.browserDownloads) ? parsed.browserDownloads : [],
      recentFiles: Array.isArray(parsed.recentFiles) ? parsed.recentFiles : [],
      recycleBin: Array.isArray(parsed.recycleBin) ? parsed.recycleBin : [],
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function persistSettings(state: PersistedSettings) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

export function applyAccentCssVariables(accentId: AccentColorId) {
  if (typeof document === 'undefined') return;
  const palette = ACCENT_PALETTES[accentId] ?? ACCENT_PALETTES['mint-teal'];
  const root = document.documentElement;
  root.style.setProperty('--os-accent', palette.accent);
  root.style.setProperty('--os-accent-hover', palette.hover);
  root.style.setProperty('--os-accent-text', palette.text);
  root.style.setProperty('--os-accent-soft', palette.soft);
  root.style.setProperty('--os-accent-border', palette.border);
}

function extractPersisted(state: SystemSettingsState): PersistedSettings {
  return {
    wallpaper: state.wallpaper,
    accentColor: state.accentColor,
    showDesktopIcons: state.showDesktopIcons,
    taskbarPosition: state.taskbarPosition,
    taskbarAlignment: state.taskbarAlignment,
    language: state.language,
    clockFormat: state.clockFormat,
    timezone: state.timezone,
    brightness: state.brightness,
    volume: state.volume,
    muted: state.muted,
    nightLight: state.nightLight,
    wifiEnabled: state.wifiEnabled,
    bluetoothEnabled: state.bluetoothEnabled,
    airplaneMode: state.airplaneMode,
    batterySaver: state.batterySaver,
    accessibilityHighContrast: state.accessibilityHighContrast,
    powerMode: state.powerMode,
    performanceProfile: state.performanceProfile,
    webkitDisableCompositing: state.webkitDisableCompositing,
    soundEffectsEnabled: state.soundEffectsEnabled,
    username: state.username,
    password: state.password,
    pcName: state.pcName,
    oobeCompleted: state.oobeCompleted,
    desktopLayout: state.desktopLayout,
    pinnedWebApps: state.pinnedWebApps,
    installedStoreApps: state.installedStoreApps,
    storeHistory: state.storeHistory,
    pendingUpdatesCount: state.pendingUpdatesCount,
    browserDownloads: state.browserDownloads,
    recentFiles: state.recentFiles,
    recycleBin: state.recycleBin,
  };
}

const initial = loadInitialSettings();
applyAccentCssVariables(initial.accentColor);
syncDocumentDirection(initial.language);
syncLiteModeClass(initial.performanceProfile, false);

export const useSettingsStore = create<SystemSettingsState>((set, get) => ({
  ...initial,
  liteModeDetected: false,

  setWallpaper: (wallpaper) => {
    set({ wallpaper });
    persistSettings(extractPersisted(get()));
  },

  setAccentColor: (accentColor) => {
    applyAccentCssVariables(accentColor);
    set({ accentColor });
    persistSettings(extractPersisted(get()));
  },

  setShowDesktopIcons: (showDesktopIcons) => {
    set({ showDesktopIcons });
    persistSettings(extractPersisted(get()));
  },

  setTaskbarPosition: (taskbarPosition) => {
    set({ taskbarPosition });
    persistSettings(extractPersisted(get()));
  },

  setTaskbarAlignment: (taskbarAlignment) => {
    set({ taskbarAlignment });
    persistSettings(extractPersisted(get()));
  },

  setLanguage: (language) => {
    syncDocumentDirection(language);
    set({ language });
    persistSettings(extractPersisted(get()));
  },

  setClockFormat: (clockFormat) => {
    set({ clockFormat });
    persistSettings(extractPersisted(get()));
  },

  setTimezone: (timezone) => {
    set({ timezone });
    persistSettings(extractPersisted(get()));
  },

  setBrightness: (brightness) => {
    const clamped = Math.min(110, Math.max(40, brightness));
    set({ brightness: clamped });
    persistSettings(extractPersisted(get()));
    void setHardwareBrightness(clamped).catch(() => undefined);
  },

  setVolume: (volume) => {
    const clamped = Math.min(100, Math.max(0, Math.round(volume)));
    set({ volume: clamped, muted: clamped === 0 });
    persistSettings(extractPersisted(get()));
    void setHardwareVolume(clamped).catch(() => undefined);
  },

  setMuted: (muted) => {
    set({ muted });
    persistSettings(extractPersisted(get()));
    void setHardwareVolume(muted ? 0 : get().volume).catch(() => undefined);
  },

  setNightLight: (nightLight) => {
    set({ nightLight });
    persistSettings(extractPersisted(get()));
  },

  setWifiEnabled: (wifiEnabled) => {
    set({ wifiEnabled, airplaneMode: wifiEnabled ? false : get().airplaneMode });
    persistSettings(extractPersisted(get()));
    void setWifiRadioState(wifiEnabled).catch(() => undefined);
  },

  setBluetoothEnabled: (bluetoothEnabled) => {
    set({ bluetoothEnabled });
    persistSettings(extractPersisted(get()));
  },

  setAirplaneMode: (airplaneMode) => {
    const nextWifi = airplaneMode ? false : true;
    set({
      airplaneMode,
      wifiEnabled: nextWifi,
      bluetoothEnabled: airplaneMode ? false : get().bluetoothEnabled,
    });
    persistSettings(extractPersisted(get()));
    void setWifiRadioState(nextWifi).catch(() => undefined);
  },

  setBatterySaver: (batterySaver) => {
    set({
      batterySaver,
      powerMode: batterySaver ? 'efficiency' : 'balanced',
    });
    persistSettings(extractPersisted(get()));
  },

  setAccessibilityHighContrast: (accessibilityHighContrast) => {
    set({ accessibilityHighContrast });
    persistSettings(extractPersisted(get()));
  },

  setPowerMode: (powerMode) => {
    set({
      powerMode,
      batterySaver: powerMode === 'efficiency',
    });
    persistSettings(extractPersisted(get()));
  },

  setPerformanceProfile: (performanceProfile) => {
    syncLiteModeClass(performanceProfile, get().liteModeDetected);
    set({ performanceProfile });
    persistSettings(extractPersisted(get()));
  },

  setLiteModeDetected: (liteModeDetected) => {
    syncLiteModeClass(get().performanceProfile, liteModeDetected);
    set({ liteModeDetected });
  },

  setWebkitDisableCompositing: (webkitDisableCompositing) => {
    set({ webkitDisableCompositing });
    persistSettings(extractPersisted(get()));
  },

  setSoundEffectsEnabled: (soundEffectsEnabled) => {
    set({ soundEffectsEnabled });
    persistSettings(extractPersisted(get()));
  },

  setCredentials: (username, password) => {
    const cleanUser = username.trim() || 'kemet';
    set({ username: cleanUser, password });
    persistSettings(extractPersisted(get()));
  },

  pinWebApp: (app) => {
    const existing = get().pinnedWebApps;
    if (existing.some((item) => item.url === app.url)) return;
    set({ pinnedWebApps: [app, ...existing].slice(0, 12) });
    persistSettings(extractPersisted(get()));
  },

  unpinWebApp: (id) => {
    set({ pinnedWebApps: get().pinnedWebApps.filter((a) => a.id !== id) });
    persistSettings(extractPersisted(get()));
  },

  installStoreApp: (app) => {
    const entry: InstalledStoreApp = { ...app, installedAt: Date.now() };
    const filtered = get().installedStoreApps.filter((a) => a.id !== app.id);
    set({ installedStoreApps: [entry, ...filtered] });
    persistSettings(extractPersisted(get()));
  },

  uninstallStoreApp: (id) => {
    set({
      installedStoreApps: get().installedStoreApps.filter((a) => a.id !== id),
    });
    persistSettings(extractPersisted(get()));
  },

  addStoreOperation: (op) => {
    const entry: StoreOperationRecord = {
      ...op,
      id: `op-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    };
    set({ storeHistory: [entry, ...get().storeHistory].slice(0, 40) });
    persistSettings(extractPersisted(get()));
  },

  applyPendingUpdates: () => {
    set({ pendingUpdatesCount: 0 });
    persistSettings(extractPersisted(get()));
  },

  addBrowserDownload: (item) => {
    const entry: BrowserDownloadItem = {
      ...item,
      id: `dl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      downloadedAt: Date.now(),
    };
    set({
      browserDownloads: [entry, ...get().browserDownloads].slice(0, 30),
    });
    persistSettings(extractPersisted(get()));
  },

  clearBrowserDownloads: () => {
    set({ browserDownloads: [] });
    persistSettings(extractPersisted(get()));
  },

  addRecentFile: (item) => {
    const next: RecentFileItem = { ...item, openedAt: Date.now() };
    const filtered = get().recentFiles.filter((r) => r.path !== item.path);
    set({ recentFiles: [next, ...filtered].slice(0, 12) });
    persistSettings(extractPersisted(get()));
  },

  moveToRecycleBin: (item) => {
    const entry: RecycledVfsItem = {
      ...item,
      id: `bin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      deletedAt: Date.now(),
    };
    set({ recycleBin: [entry, ...get().recycleBin].slice(0, 50) });
    persistSettings(extractPersisted(get()));
  },

  removeFromRecycleBin: (id) => {
    set({ recycleBin: get().recycleBin.filter((item) => item.id !== id) });
    persistSettings(extractPersisted(get()));
  },

  emptyRecycleBin: () => {
    set({ recycleBin: [] });
    persistSettings(extractPersisted(get()));
  },

  setPcName: (pcName) => {
    const clean = pcName.trim() || 'kemetos';
    set({ pcName: clean });
    persistSettings(extractPersisted(get()));
  },

  setOobeCompleted: (oobeCompleted) => {
    set({ oobeCompleted });
    persistSettings(extractPersisted(get()));
  },

  setDesktopLayout: (desktopLayout) => {
    set({ desktopLayout });
    persistSettings(extractPersisted(get()));
  },
}));
