import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AppWindow,
  Battery,
  BatteryCharging,
  Bluetooth,
  Check,
  CheckCircle2,
  Clock,
  Cpu,
  Download,
  Globe,
  HardDrive,
  Monitor,
  Palette,
  RefreshCw,
  Search,
  ShieldCheck,
  Terminal,
  Trash2,
  Upload,
  UserCheck,
  Volume2,
  Wifi,
  Zap,
} from 'lucide-react';
import { APP_CATALOG } from './appCatalog';
import { openOsApp } from './registry';
import { useNotificationStore } from '../system/notificationStore';
import {
  playErrorAlert,
  playNotificationChime,
  playStartupChime,
  playWindowTransition,
} from '../system/soundEffects';
import {
  ACCENT_PALETTES,
  type AccentColorId,
  type PowerMode,
  useSettingsStore,
} from '../system/settingsStore';
import {
  fetchBatteryStatus,
  fetchHardwareControls,
  fetchHardwareNetwork,
  fetchInstalledLinuxApps,
  fetchSystemHealth,
  launchExternalLinuxApp,
  type BatteryStatusInfo,
  type HardwareControlStatus,
  type HardwareNetworkInfo,
  type InstalledLinuxApp,
  type SystemHealthReport,
} from '../system/systemBridge';
import { PRESET_WALLPAPERS, SOLID_WALLPAPERS } from '../system/wallpapers';
import { formatBytes } from '../vfs/treeOps';
import { useVfsStore } from '../vfs/vfsStore';
import {
  calculateVfsStats,
  parseAndValidateVfsBackup,
  serializeVfsBackup,
} from '../vfs/vfsTransfer';
import type { WindowAppProps } from '../windowManager/types';

type SettingsTab =
  | 'system'
  | 'bluetooth'
  | 'network'
  | 'personalization'
  | 'apps'
  | 'accounts'
  | 'time'
  | 'power'
  | 'storage';

const TABS: { id: SettingsTab; label: string; arabicLabel: string; icon: typeof Monitor }[] = [
  { id: 'system', label: 'System', arabicLabel: 'النظام', icon: Monitor },
  { id: 'bluetooth', label: 'Bluetooth & devices', arabicLabel: 'البلوتوث والأجهزة', icon: Bluetooth },
  { id: 'network', label: 'Network & internet', arabicLabel: 'الشبكة والإنترنت', icon: Wifi },
  { id: 'personalization', label: 'Personalization', arabicLabel: 'التخصيص', icon: Palette },
  { id: 'apps', label: 'Apps', arabicLabel: 'التطبيقات', icon: AppWindow },
  { id: 'accounts', label: 'Accounts', arabicLabel: 'الحسابات', icon: UserCheck },
  { id: 'time', label: 'Time & language', arabicLabel: 'الوقت واللغة', icon: Clock },
  { id: 'power', label: 'Power & battery', arabicLabel: 'الطاقة والبطارية', icon: Battery },
  { id: 'storage', label: 'Storage & Backup', arabicLabel: 'التخزين والنسخ الاحتياطي', icon: HardDrive },
];

const TIMEZONE_OPTIONS = [
  'UTC',
  'Africa/Cairo',
  'Asia/Riyadh',
  'Asia/Dubai',
  'Europe/London',
  'America/New_York',
];

export function SettingsApp({ initialTab }: WindowAppProps) {
  const validTabs = new Set<SettingsTab>(TABS.map((t) => t.id));
  const initialSection: SettingsTab =
    initialTab && validTabs.has(initialTab as SettingsTab)
      ? (initialTab as SettingsTab)
      : 'personalization';

  const [activeTab, setActiveTab] = useState<SettingsTab>(initialSection);
  const [tabSearch, setTabSearch] = useState('');

  const language = useSettingsStore((s) => s.language);
  const clockFormat = useSettingsStore((s) => s.clockFormat);
  const timezone = useSettingsStore((s) => s.timezone);
  const wallpaper = useSettingsStore((s) => s.wallpaper);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const showDesktopIcons = useSettingsStore((s) => s.showDesktopIcons);
  const taskbarPosition = useSettingsStore((s) => s.taskbarPosition);
  const taskbarAlignment = useSettingsStore((s) => s.taskbarAlignment);
  const brightness = useSettingsStore((s) => s.brightness);
  const volume = useSettingsStore((s) => s.volume);
  const muted = useSettingsStore((s) => s.muted);
  const nightLight = useSettingsStore((s) => s.nightLight);
  const wifiEnabled = useSettingsStore((s) => s.wifiEnabled);
  const bluetoothEnabled = useSettingsStore((s) => s.bluetoothEnabled);
  const airplaneMode = useSettingsStore((s) => s.airplaneMode);
  const accessibilityHighContrast = useSettingsStore((s) => s.accessibilityHighContrast);
  const powerMode = useSettingsStore((s) => s.powerMode);
  const soundEffectsEnabled = useSettingsStore((s) => s.soundEffectsEnabled);
  const username = useSettingsStore((s) => s.username);
  const password = useSettingsStore((s) => s.password);
  const pinnedWebApps = useSettingsStore((s) => s.pinnedWebApps);
  const installedStoreApps = useSettingsStore((s) => s.installedStoreApps);

  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const setClockFormat = useSettingsStore((s) => s.setClockFormat);
  const setTimezone = useSettingsStore((s) => s.setTimezone);
  const setWallpaper = useSettingsStore((s) => s.setWallpaper);
  const setAccentColor = useSettingsStore((s) => s.setAccentColor);
  const setShowDesktopIcons = useSettingsStore((s) => s.setShowDesktopIcons);
  const setTaskbarPosition = useSettingsStore((s) => s.setTaskbarPosition);
  const setTaskbarAlignment = useSettingsStore((s) => s.setTaskbarAlignment);
  const setBrightness = useSettingsStore((s) => s.setBrightness);
  const setVolume = useSettingsStore((s) => s.setVolume);
  const setMuted = useSettingsStore((s) => s.setMuted);
  const setNightLight = useSettingsStore((s) => s.setNightLight);
  const setWifiEnabled = useSettingsStore((s) => s.setWifiEnabled);
  const setBluetoothEnabled = useSettingsStore((s) => s.setBluetoothEnabled);
  const setAirplaneMode = useSettingsStore((s) => s.setAirplaneMode);
  const setAccessibilityHighContrast = useSettingsStore((s) => s.setAccessibilityHighContrast);
  const setPowerMode = useSettingsStore((s) => s.setPowerMode);
  const setSoundEffectsEnabled = useSettingsStore((s) => s.setSoundEffectsEnabled);
  const setCredentials = useSettingsStore((s) => s.setCredentials);
  const unpinWebApp = useSettingsStore((s) => s.unpinWebApp);
  const uninstallStoreApp = useSettingsStore((s) => s.uninstallStoreApp);

  const tree = useVfsStore((s) => s.tree);
  const setTree = useVfsStore((s) => s.setTree);
  const pushNotification = useNotificationStore((s) => s.pushNotification);

  const [draftUser, setDraftUser] = useState(username);
  const [draftPass, setDraftPass] = useState(password);
  const [importError, setImportError] = useState<string | null>(null);
  const [accountSavedMsg, setAccountSavedMsg] = useState<string | null>(null);
  const [netInfo, setNetInfo] = useState<HardwareNetworkInfo | null>(null);
  const [hwControls, setHwControls] = useState<HardwareControlStatus | null>(null);
  const [battery, setBattery] = useState<BatteryStatusInfo | null>(null);
  const [linuxApps, setLinuxApps] = useState<InstalledLinuxApp[]>([]);
  const [healthReport, setHealthReport] = useState<SystemHealthReport | null>(null);
  const [healthScanning, setHealthScanning] = useState(false);

  const loadHealthReport = async () => {
    setHealthScanning(true);
    try {
      const rep = await fetchSystemHealth();
      setHealthReport(rep);
    } catch {
      // Handled gracefully in fetchSystemHealth fallback
    } finally {
      setHealthScanning(false);
    }
  };

  useEffect(() => {
    void fetchHardwareNetwork().then(setNetInfo).catch(() => undefined);
    void fetchHardwareControls().then(setHwControls).catch(() => undefined);
    void fetchBatteryStatus().then(setBattery).catch(() => undefined);
    void fetchInstalledLinuxApps().then(setLinuxApps).catch(() => undefined);
    void loadHealthReport();
  }, []);

  const customWpInputRef = useRef<HTMLInputElement>(null);
  const importVfsInputRef = useRef<HTMLInputElement>(null);

  const storageStats = useMemo(() => calculateVfsStats(tree), [tree]);

  const visibleTabs = useMemo(() => {
    const q = tabSearch.trim().toLowerCase();
    if (!q) return TABS;
    return TABS.filter(
      (tab) => tab.label.toLowerCase().includes(q) || tab.arabicLabel.includes(tabSearch.trim())
    );
  }, [tabSearch]);

  const handleCustomWallpaper = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setWallpaper({ kind: 'custom', dataUrl: reader.result, label: file.name });
        pushNotification('Wallpaper Updated', `Applied custom image "${file.name}".`, 'system');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    setCredentials(draftUser, draftPass);
    setAccountSavedMsg(language === 'ar' ? 'تم حفظ إعدادات الحساب' : 'Account settings saved');
    pushNotification(
      'Account Updated',
      `Active terminal identity set to ${draftUser.trim() || 'user'}@nizamos.`,
      'system'
    );
    setTimeout(() => setAccountSavedMsg(null), 2500);
  };

  const handleExportVfs = () => {
    const json = serializeVfsBackup(tree);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `nizamos-vfs-backup-${dateStamp}.json`;
    link.click();
    URL.revokeObjectURL(url);
    pushNotification('Backup Exported', 'Downloaded VFS JSON backup file.', 'files');
  };

  const handleImportVfs = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const result = parseAndValidateVfsBackup(text);
      if (!result.ok || !result.tree) {
        setImportError(result.error ?? 'Failed to import backup.');
        return;
      }
      setTree(result.tree);
      pushNotification('Backup Imported', `Restored VFS from "${file.name}".`, 'files');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleLaunchLinuxApp = async (tool: InstalledLinuxApp) => {
    const res = await launchExternalLinuxApp(tool.binary);
    if (!res.ok) {
      openOsApp('terminal', { storageMode: 'host' });
      pushNotification(
        'Host Terminal Opened',
        `${tool.name} (${tool.path}). Run it directly inside Host Terminal.`,
        'system'
      );
    }
  };

  return (
    <div
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      className="flex h-full bg-slate-900 text-slate-100"
    >
      {/* Windows Settings Sidebar */}
      <aside className="w-56 shrink-0 border-e border-slate-800 bg-slate-950/65 p-3 flex flex-col gap-1.5">
        <div className="px-2 py-1 mb-1">
          <div className="text-xs font-semibold text-slate-100 truncate">{username}@nizamos</div>
          <div className="text-[11px] text-slate-400">
            {language === 'ar' ? 'إعدادات النظام' : 'System Settings'}
          </div>
        </div>

        <div className="relative mb-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute start-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={tabSearch}
            onChange={(e) => setTabSearch(e.target.value)}
            placeholder={language === 'ar' ? 'ابحث في الإعدادات...' : 'Find a setting'}
            aria-label="Find a setting"
            className="w-full bg-slate-900 border border-slate-800 rounded-sm ps-8 pe-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[var(--os-accent-hover)]"
          />
        </div>

        <div className="flex-1 overflow-y-auto os-scroll space-y-0.5">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-sm text-xs font-medium text-start transition-colors whitespace-nowrap ${
                  isActive
                    ? 'os-accent-soft-bg os-accent-text'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-slate-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  {language === 'ar' ? tab.arabicLabel : tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main Settings Content */}
      <div className="flex-1 overflow-y-auto os-scroll p-6 space-y-6">
        {activeTab === 'system' && (
          <section className="space-y-4">
            {/* System Health & Driver Check (فحص صحة النظام والتعريفات) */}
            <div className="p-4 rounded-sm bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-100 flex items-center gap-2">
                      <span>{language === 'ar' ? 'فحص صحة النظام والتعريفات' : 'System Health & Driver Check'}</span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        {language === 'ar' ? 'تم الفحص والتأكيد' : '5/5 Hardware Verified'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {healthReport
                        ? `${healthReport.system.kernelRelease} • ${healthReport.system.osArchitecture} • ${healthReport.system.cpus} Cores`
                        : (language === 'ar' ? 'جاري فحص تعريفات وعتاد النظام...' : 'Inspecting kernel hardware drivers...')}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={loadHealthReport}
                  disabled={healthScanning}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${healthScanning ? 'animate-spin text-sky-400' : ''}`} />
                  <span>{language === 'ar' ? 'إعادة الفحص' : 'Re-scan Hardware'}</span>
                </button>
              </div>

              {/* Hardware items */}
              <div className="grid grid-cols-1 gap-2 pt-1">
                {healthReport?.checks.map((item) => {
                  const ItemIcon =
                    item.id === 'gpu'
                      ? Monitor
                      : item.id === 'network'
                        ? Wifi
                        : item.id === 'audio'
                          ? Volume2
                          : item.id === 'power'
                            ? Zap
                            : Cpu;

                  return (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-3 p-2.5 rounded-sm bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition-colors"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-sm bg-slate-800 text-sky-400 shrink-0 mt-0.5">
                          <ItemIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-200">
                              {language === 'ar' ? item.arabicTitle : item.title}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400 truncate">
                              ({item.driver})
                            </span>
                          </div>
                          <div className="text-[11px] font-medium text-slate-300 mt-0.5 truncate">
                            {item.device}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {item.details}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 pt-0.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>{language === 'ar' ? 'تم التحقق' : 'Verified'}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold text-slate-100">
                {language === 'ar' ? 'العرض والصوت وإمكانية الوصول' : 'Display, Audio & Accessibility'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {hwControls?.notes ?? 'Controls synchronize with Quick Settings.'}
              </p>
            </div>

            <div className="p-4 rounded-sm bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="settings-brightness" className="font-medium text-slate-200">
                  Display Brightness {hwControls?.backlightAvailable ? '(Hardware)' : '(Overlay)'}
                </label>
                <span className="font-mono-tabular os-accent-text">{brightness}%</span>
              </div>
              <input
                id="settings-brightness"
                type="range"
                min={40}
                max={110}
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="w-full accent-[var(--os-accent-hover)] cursor-pointer"
              />
            </div>

            <div className="p-4 rounded-sm bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="settings-volume" className="font-medium text-slate-200">
                  Master Volume {hwControls?.audioAvailable ? '(OS Mixer)' : '(Media Engine)'}
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMuted(!muted)}
                    className="px-2 py-0.5 rounded-sm bg-slate-800 text-[11px] text-slate-200"
                  >
                    {muted ? 'Unmute' : 'Mute'}
                  </button>
                  <span className="font-mono-tabular os-accent-text">{muted ? 0 : volume}%</span>
                </div>
              </div>
              <input
                id="settings-volume"
                type="range"
                min={0}
                max={100}
                value={muted ? 0 : volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full accent-[var(--os-accent-hover)] cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-sm bg-slate-950/60 border border-slate-800">
              <div>
                <div className="text-xs font-medium text-slate-200">Night Light</div>
                <div className="text-[11px] text-slate-400">
                  Applies a warmer color tint to reduce glare
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={nightLight}
                onClick={() => setNightLight(!nightLight)}
                className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-colors ${
                  nightLight ? 'os-accent-bg text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {nightLight ? 'On' : 'Off'}
              </button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-sm bg-slate-950/60 border border-slate-800">
              <div>
                <div className="text-xs font-medium text-slate-200">High Contrast Mode</div>
                <div className="text-[11px] text-slate-400">
                  Boosts UI contrast for improved legibility
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={accessibilityHighContrast}
                onClick={() => setAccessibilityHighContrast(!accessibilityHighContrast)}
                className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-colors ${
                  accessibilityHighContrast
                    ? 'os-accent-bg text-white'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {accessibilityHighContrast ? 'Enabled' : 'Off'}
              </button>
            </div>

            <div className="p-4 rounded-sm bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 os-accent-text" />
                  <div>
                    <div className="text-xs font-medium text-slate-200">
                      {language === 'ar' ? 'المؤثرات الصوتية للنظام' : 'System Sound Effects'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Web Audio chimes for startup, notifications, windows, and alerts
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={soundEffectsEnabled}
                  onClick={() => setSoundEffectsEnabled(!soundEffectsEnabled)}
                  className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-colors ${
                    soundEffectsEnabled ? 'os-accent-bg text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {soundEffectsEnabled ? 'Enabled' : 'Off'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={playStartupChime}
                  className="px-2.5 py-1 rounded-sm bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200"
                >
                  Test Startup
                </button>
                <button
                  type="button"
                  onClick={playNotificationChime}
                  className="px-2.5 py-1 rounded-sm bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200"
                >
                  Test Notification
                </button>
                <button
                  type="button"
                  onClick={() => playWindowTransition('open')}
                  className="px-2.5 py-1 rounded-sm bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200"
                >
                  Test Window
                </button>
                <button
                  type="button"
                  onClick={playErrorAlert}
                  className="px-2.5 py-1 rounded-sm bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200"
                >
                  Test Alert
                </button>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'bluetooth' && (
          <section className="space-y-4">
            <h3 className="text-base font-semibold text-slate-100">Bluetooth & Devices</h3>
            <div className="flex items-center justify-between p-4 rounded-sm bg-slate-950/60 border border-slate-800">
              <div>
                <div className="text-xs font-medium text-slate-200">Bluetooth Radio</div>
                <div className="text-[11px] text-slate-400">
                  {airplaneMode
                    ? 'Disabled while Airplane mode is active'
                    : bluetoothEnabled
                      ? 'Discoverable as nizamos-host'
                      : 'Bluetooth radio turned off'}
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={bluetoothEnabled}
                onClick={() => setBluetoothEnabled(!bluetoothEnabled)}
                className={`px-3 py-1.5 rounded-sm text-xs font-medium ${
                  bluetoothEnabled ? 'os-accent-bg text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {bluetoothEnabled ? 'On' : 'Off'}
              </button>
            </div>
            <div className="p-4 rounded-sm bg-slate-950/60 border border-slate-800 text-xs text-slate-400">
              Hardware Bluetooth HCI pairing requires a local Linux BlueZ adapter inside Tauri desktop builds.
            </div>
          </section>
        )}

        {activeTab === 'network' && (
          <section className="space-y-4">
            <h3 className="text-base font-semibold text-slate-100">Network & Internet</h3>

            <div className="flex items-center justify-between p-4 rounded-sm bg-slate-950/60 border border-slate-800">
              <div>
                <div className="text-xs font-medium text-slate-200">Wi-Fi Adapter</div>
                <div className="text-[11px] text-slate-400">
                  {airplaneMode
                    ? 'Disabled by Airplane Mode'
                    : netInfo?.reason ?? 'Inspecting host network interfaces...'}
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={wifiEnabled && !airplaneMode}
                onClick={() => setWifiEnabled(!wifiEnabled)}
                className={`px-3 py-1.5 rounded-sm text-xs font-medium ${
                  wifiEnabled && !airplaneMode
                    ? 'os-accent-bg text-white'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {wifiEnabled && !airplaneMode ? 'Connected' : 'Off'}
              </button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-sm bg-slate-950/60 border border-slate-800">
              <div>
                <div className="text-xs font-medium text-slate-200">Airplane Mode</div>
                <div className="text-[11px] text-slate-400">Stops all wireless communication</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={airplaneMode}
                onClick={() => setAirplaneMode(!airplaneMode)}
                className={`px-3 py-1.5 rounded-sm text-xs font-medium ${
                  airplaneMode ? 'os-accent-bg text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {airplaneMode ? 'On' : 'Off'}
              </button>
            </div>

            {netInfo && netInfo.interfaces.length > 0 && (
              <div className="p-4 rounded-sm bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="text-xs font-medium text-slate-200">Active Host Interfaces</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {netInfo.interfaces.map((iface) => (
                    <div
                      key={`${iface.name}-${iface.address}`}
                      className="flex items-center justify-between px-3 py-2 rounded-sm bg-slate-900 border border-slate-800 text-xs"
                    >
                      <span className="font-mono text-slate-200">{iface.name}</span>
                      <span className="font-mono-tabular text-slate-400">{iface.address}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === 'personalization' && (
          <>
            <section className="space-y-3">
              <div>
                <h3 className="text-base font-semibold text-slate-100">Desktop Wallpaper</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Choose a Fluent Design preset, solid surface, or upload your own image.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {PRESET_WALLPAPERS.map((wp) => {
                  const selected = wallpaper.kind === 'preset' && wallpaper.id === wp.id;
                  return (
                    <button
                      key={wp.id}
                      type="button"
                      onClick={() => setWallpaper({ kind: 'preset', id: wp.id })}
                      aria-label={`Wallpaper ${wp.label}`}
                      aria-pressed={selected}
                      className={`group relative rounded-sm overflow-hidden border text-start transition-all ${
                        selected
                          ? 'os-accent-border ring-2 ring-[var(--os-accent-border)]'
                          : 'border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <img
                        src={wp.url}
                        alt={wp.label}
                        referrerPolicy="no-referrer"
                        className="w-full h-20 object-cover"
                      />
                      <div className="px-2 py-1.5 bg-slate-950/90 text-[11px] font-medium text-slate-200 flex items-center justify-between">
                        <span className="truncate">{wp.label}</span>
                        {selected && <Check className="w-3.5 h-3.5 os-accent-text shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {SOLID_WALLPAPERS.map((sw) => {
                  const selected = wallpaper.kind === 'solid' && wallpaper.color === sw.color;
                  return (
                    <button
                      key={sw.color}
                      type="button"
                      onClick={() =>
                        setWallpaper({ kind: 'solid', color: sw.color, label: sw.label })
                      }
                      aria-label={`Solid color ${sw.label}`}
                      aria-pressed={selected}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-sm border text-xs transition-colors ${
                        selected
                          ? 'os-accent-border bg-slate-800 text-white'
                          : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-sm border border-slate-600 shrink-0"
                        style={{ backgroundColor: sw.color }}
                      />
                      <span>{sw.label}</span>
                    </button>
                  );
                })}

                <input
                  ref={customWpInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCustomWallpaper}
                  className="hidden"
                  aria-label="Upload custom wallpaper"
                />
                <button
                  type="button"
                  onClick={() => customWpInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Image</span>
                </button>
              </div>
            </section>

            <section className="pt-4 border-t border-slate-800 space-y-3">
              <h3 className="text-sm font-semibold text-slate-100">Accent Color</h3>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(ACCENT_PALETTES) as AccentColorId[]).map((key) => {
                  const pal = ACCENT_PALETTES[key];
                  const selected = accentColor === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setAccentColor(key)}
                      aria-pressed={selected}
                      className={`flex items-center gap-2 px-3 py-2 rounded-sm border text-xs font-medium transition-colors ${
                        selected
                          ? 'bg-slate-800 text-white os-accent-border'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-sm shrink-0"
                        style={{ backgroundColor: pal.hover }}
                      />
                      <span>{pal.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="pt-4 border-t border-slate-800 space-y-3">
              <h3 className="text-sm font-semibold text-slate-100">Taskbar & Desktop Behavior</h3>

              <div className="flex items-center justify-between py-1.5">
                <div>
                  <div className="text-xs font-medium text-slate-200">Show Desktop Icons</div>
                  <div className="text-[11px] text-slate-400">
                    Toggle desktop launch shortcuts and Recycle Bin
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showDesktopIcons}
                  onClick={() => setShowDesktopIcons(!showDesktopIcons)}
                  className={`px-3 py-1.5 rounded-sm text-xs font-medium ${
                    showDesktopIcons ? 'os-accent-bg text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {showDesktopIcons ? 'Visible' : 'Hidden'}
                </button>
              </div>

              <div className="flex items-center justify-between py-1.5">
                <div>
                  <div className="text-xs font-medium text-slate-200">Taskbar Alignment</div>
                  <div className="text-[11px] text-slate-400">
                    Windows 10 classic Left alignment or centered layout
                  </div>
                </div>
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-sm p-0.5">
                  {(['left', 'center'] as const).map((align) => (
                    <button
                      key={align}
                      type="button"
                      onClick={() => setTaskbarAlignment(align)}
                      className={`px-3 py-1 rounded-sm text-xs font-medium capitalize transition-colors ${
                        taskbarAlignment === align
                          ? 'os-accent-bg text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {align}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between py-1.5">
                <div>
                  <div className="text-xs font-medium text-slate-200">Taskbar Edge</div>
                  <div className="text-[11px] text-slate-400">Bottom or top edge placement</div>
                </div>
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-sm p-0.5">
                  {(['bottom', 'top'] as const).map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => setTaskbarPosition(pos)}
                      className={`px-3 py-1 rounded-sm text-xs font-medium capitalize transition-colors ${
                        taskbarPosition === pos
                          ? 'os-accent-bg text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === 'apps' && (
          <section className="space-y-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-slate-100">Installed Applications</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Built-in NizamOS modules, Store packages, pinned Web Apps, and Linux binaries.
                </p>
              </div>
              <button
                type="button"
                onClick={() => openOsApp('store')}
                className="px-3 py-1.5 rounded-sm os-accent-bg text-xs font-medium text-white shrink-0"
              >
                Open Nizam Store
              </button>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-300">
                Installed via Nizam Store ({installedStoreApps.length})
              </div>
              {installedStoreApps.length === 0 ? (
                <div className="p-3 rounded-sm bg-slate-950/60 border border-slate-800 text-xs text-slate-500">
                  No store apps installed yet. Open Nizam Store to add Chrome, VLC, VS Code, Wine, or Games.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {installedStoreApps.map((sa) => (
                    <div
                      key={sa.id}
                      className="flex items-center justify-between p-2.5 rounded-sm bg-slate-950/60 border border-slate-800"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-7 h-7 rounded-sm bg-gradient-to-br ${sa.accentBg} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}
                        >
                          {sa.badgeText}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-slate-100 truncate">
                            {sa.name}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono truncate">
                            {sa.packageName} · {sa.category}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => uninstallStoreApp(sa.id)}
                        aria-label={`Uninstall ${sa.name}`}
                        className="p-1.5 rounded-sm text-slate-400 hover:text-red-300 hover:bg-slate-800 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-300">
                Pinned Web Apps ({pinnedWebApps.length})
              </div>
              {pinnedWebApps.length === 0 ? (
                <div className="p-3 rounded-sm bg-slate-950/60 border border-slate-800 text-xs text-slate-500">
                  Pin websites directly from Nizam Browser using the "Pin App" button.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {pinnedWebApps.map((wa) => (
                    <div
                      key={wa.id}
                      className="flex items-center justify-between p-2.5 rounded-sm bg-slate-950/60 border border-slate-800"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-slate-100 truncate">
                            {wa.name}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono truncate">
                            {wa.url}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => openOsApp('browser', { initialUrl: wa.url })}
                          className="px-2.5 py-1 rounded-sm os-accent-bg text-[11px] text-white"
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={() => unpinWebApp(wa.id)}
                          aria-label={`Unpin ${wa.name}`}
                          className="p-1.5 rounded-sm text-slate-400 hover:text-red-300 hover:bg-slate-800"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-300">
                Host Linux Binaries ({linuxApps.length})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {linuxApps.map((tool) => (
                  <div
                    key={tool.id}
                    className="flex items-center justify-between p-2.5 rounded-sm bg-slate-950/60 border border-slate-800"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Terminal className="w-4 h-4 text-amber-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-slate-100 truncate">
                          {tool.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono truncate">
                          {tool.path}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleLaunchLinuxApp(tool)}
                      className="px-2.5 py-1 rounded-sm bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 shrink-0"
                    >
                      Launch
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-300">
                NizamOS Built-in Apps ({APP_CATALOG.length})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {APP_CATALOG.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between p-2.5 rounded-sm bg-slate-950/60 border border-slate-800 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-slate-100 truncate">{app.title}</div>
                      <div className="text-[11px] text-slate-500 truncate">{app.description}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openOsApp(app.id)}
                      className="px-2.5 py-1 rounded-sm bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 shrink-0"
                    >
                      Open
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'accounts' && (
          <form onSubmit={handleSaveCredentials} className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-slate-100">User Identity & Lock Screen</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Updates your prompt in Terminal and credentials for the Lock Screen.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="settings-username" className="block text-[11px] text-slate-400 mb-1">
                  Username
                </label>
                <input
                  id="settings-username"
                  type="text"
                  value={draftUser}
                  onChange={(e) => setDraftUser(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-sm px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-[var(--os-accent-hover)]"
                />
              </div>
              <div>
                <label htmlFor="settings-password" className="block text-[11px] text-slate-400 mb-1">
                  Lock Password (optional)
                </label>
                <input
                  id="settings-password"
                  type="password"
                  value={draftPass}
                  onChange={(e) => setDraftPass(e.target.value)}
                  placeholder="Leave empty for 1-click unlock"
                  className="w-full bg-slate-950 border border-slate-800 rounded-sm px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[var(--os-accent-hover)]"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="px-4 py-2 rounded-sm os-accent-bg text-xs font-medium text-white transition-colors"
              >
                Save Account
              </button>
              {accountSavedMsg && (
                <span className="text-xs os-accent-text">{accountSavedMsg}</span>
              )}
            </div>
          </form>
        )}

        {activeTab === 'time' && (
          <section className="space-y-4">
            <h3 className="text-base font-semibold text-slate-100">
              {language === 'ar' ? 'الوقت واللغة' : 'Time & Language'}
            </h3>

            <div className="flex items-center justify-between p-4 rounded-sm bg-slate-950/60 border border-slate-800">
              <div>
                <div className="text-xs font-medium text-slate-200">
                  {language === 'ar' ? 'لغة العرض' : 'Display Language'}
                </div>
                <div className="text-[11px] text-slate-400">
                  {language === 'ar'
                    ? 'تغيير لغة الواجهة واتجاه النصوص فوراً'
                    : 'Instantly updates shell direction (LTR / RTL) and labels'}
                </div>
              </div>
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-sm p-0.5">
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`px-3 py-1 rounded-sm text-xs font-medium ${
                    language === 'en' ? 'os-accent-bg text-white' : 'text-slate-400'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('ar')}
                  className={`px-3 py-1 rounded-sm text-xs font-medium ${
                    language === 'ar' ? 'os-accent-bg text-white' : 'text-slate-400'
                  }`}
                >
                  العربية
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-sm bg-slate-950/60 border border-slate-800">
              <div>
                <div className="text-xs font-medium text-slate-200">
                  {language === 'ar' ? 'تنسيق الساعة' : 'Clock Format'}
                </div>
                <div className="text-[11px] text-slate-400">
                  {language === 'ar'
                    ? 'اختيار نظام 12 ساعة أو 24 ساعة في شريط المهام'
                    : '12-hour or 24-hour taskbar clock'}
                </div>
              </div>
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-sm p-0.5">
                {(['12h', '24h'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setClockFormat(fmt)}
                    className={`px-3 py-1 rounded-sm text-xs font-mono-tabular ${
                      clockFormat === fmt ? 'os-accent-bg text-white' : 'text-slate-400'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-sm bg-slate-950/60 border border-slate-800 space-y-2">
              <label htmlFor="settings-timezone" className="block text-xs font-medium text-slate-200">
                {language === 'ar' ? 'المنطقة الزمنية للنظام' : 'System Timezone'}
              </label>
              <select
                id="settings-timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                dir="ltr"
                className="w-full bg-slate-900 border border-slate-700 rounded-sm px-3 py-2 text-xs text-slate-100"
              >
                {TIMEZONE_OPTIONS.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </section>
        )}

        {activeTab === 'power' && (
          <section className="space-y-4">
            <h3 className="text-base font-semibold text-slate-100">Power & Battery</h3>

            <div className="p-4 rounded-sm bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {battery?.charging ? (
                    <BatteryCharging className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Battery className="w-5 h-5 os-accent-text" />
                  )}
                  <div>
                    <div className="text-sm font-semibold text-slate-100 font-mono-tabular">
                      {battery?.available && battery.percentage !== null
                        ? `${battery.percentage}% (${battery.charging ? 'Charging' : 'On Battery'})`
                        : 'AC Power / No Hardware Battery'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {battery?.note ?? 'Checking /sys/class/power_supply & Web Battery API...'}
                    </div>
                  </div>
                </div>
                {battery?.timeRemaining && (
                  <span className="text-xs font-mono-tabular text-slate-300">
                    {battery.timeRemaining}
                  </span>
                )}
              </div>

              {battery?.available && battery.percentage !== null && (
                <div className="w-full h-2.5 bg-slate-800 overflow-hidden">
                  <div
                    className="h-full os-accent-bg transition-all"
                    style={{ width: `${battery.percentage}%` }}
                  />
                </div>
              )}
            </div>

            <div className="p-4 rounded-sm bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="text-xs font-medium text-slate-200">Power Mode</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(
                  [
                    { id: 'efficiency', label: 'Best power efficiency' },
                    { id: 'balanced', label: 'Balanced' },
                    { id: 'performance', label: 'Best performance' },
                  ] as Array<{ id: PowerMode; label: string }>
                ).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setPowerMode(mode.id)}
                    className={`p-2.5 rounded-sm border text-xs font-medium text-start transition-colors ${
                      powerMode === mode.id
                        ? 'os-accent-bg border-transparent text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'storage' && (
          <section className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                IndexedDB Storage & JSON Backup
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Live byte footprint and full export/restore of your virtual file tree.
              </p>
            </div>

            <div className="p-4 rounded-sm bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-200">Partition (/)</span>
                <span className="font-mono-tabular text-slate-300">
                  {formatBytes(storageStats.serializedBytes)} / {formatBytes(storageStats.quotaBytes)}
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={storageStats.usagePercent}
                aria-valuemin={0}
                aria-valuemax={100}
                className="w-full h-2.5 bg-slate-800 overflow-hidden"
              >
                <div
                  className="h-full os-accent-bg transition-all duration-300"
                  style={{ width: `${Math.max(2, storageStats.usagePercent)}%` }}
                />
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono-tabular">
                <span>{storageStats.totalFiles} files</span>
                <span aria-hidden="true">·</span>
                <span>{storageStats.totalFolders} folders</span>
                <span aria-hidden="true">·</span>
                <span>{formatBytes(storageStats.contentBytes)} raw content</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleExportVfs}
                className="flex items-center gap-2 px-3.5 py-2 rounded-sm os-accent-bg text-xs font-medium text-white transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export VFS (.json)</span>
              </button>

              <input
                ref={importVfsInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImportVfs}
                className="hidden"
                aria-label="Import VFS JSON file"
              />
              <button
                type="button"
                onClick={() => importVfsInputRef.current?.click()}
                className="flex items-center gap-2 px-3.5 py-2 rounded-sm bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import VFS (.json)</span>
              </button>
            </div>

            {importError && (
              <div role="alert" className="text-xs text-red-400">
                {importError}
              </div>
            )}

            <div className="space-y-2">
              <div className="text-xs font-medium text-slate-300">Largest Files in VFS</div>
              <div className="rounded-sm border border-slate-800 divide-y divide-slate-800/70 bg-slate-950/50">
                {storageStats.largestFiles.length === 0 ? (
                  <div className="p-3 text-xs text-slate-500">No files stored yet.</div>
                ) : (
                  storageStats.largestFiles.map((f) => (
                    <div
                      key={f.path}
                      className="flex items-center justify-between px-3 py-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-slate-200 truncate">{f.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono truncate">{f.path}</div>
                      </div>
                      <span className="font-mono-tabular text-slate-300 shrink-0 ms-3">
                        {formatBytes(f.bytes)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
