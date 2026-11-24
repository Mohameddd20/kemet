import { memo, useEffect, useState } from 'react';
import {
  Battery,
  BatteryCharging,
  Bell,
  Bluetooth,
  ChevronUp,
  Contrast,
  Globe,
  HardDrive,
  Layers,
  Search,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { getAppMeta } from '../apps/appCatalog';
import { APP_ICONS, openOsApp } from '../apps/registry';
import { t, type LanguageId } from '../system/i18n';
import { useNotificationStore } from '../system/notificationStore';
import { useSettingsStore, type ClockFormat } from '../system/settingsStore';
import { fetchBatteryStatus, type BatteryStatusInfo } from '../system/systemBridge';
import type { AppId, WindowInstance } from '../windowManager/types';
import { useWindowStore } from '../windowManager/useWindowStore';
import { getTopFocusedWindowId } from '../windowManager/windowLogic';

interface TaskbarProps {
  startOpen: boolean;
  onToggleStart: () => void;
  searchOpen: boolean;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onOpenSearch: () => void;
  taskViewOpen: boolean;
  onToggleTaskView: () => void;
  quickSettingsOpen: boolean;
  onToggleQuickSettings: () => void;
  actionCenterOpen: boolean;
  onToggleActionCenter: () => void;
  isBrowserOnline: boolean;
}

const PINNED_TASKBAR_APPS: AppId[] = ['files', 'terminal', 'browser', 'store', 'settings'];

const TrayBatteryIndicator = memo(function TrayBatteryIndicator() {
  const [battery, setBattery] = useState<BatteryStatusInfo | null>(null);

  useEffect(() => {
    void fetchBatteryStatus().then(setBattery).catch(() => undefined);
    const id = setInterval(() => {
      void fetchBatteryStatus().then(setBattery).catch(() => undefined);
    }, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="flex items-center gap-1 text-[11px] font-mono-tabular">
      {battery?.charging ? (
        <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
      ) : (
        <Battery className="w-3.5 h-3.5 text-slate-200" />
      )}
      {battery?.available && battery.percentage !== null && (
        <span>{battery.percentage}%</span>
      )}
    </span>
  );
});

const TrayClockButton = memo(function TrayClockButton({
  language,
  clockFormat,
  actionCenterOpen,
  onToggleActionCenter,
}: {
  language: LanguageId;
  clockFormat: ClockFormat;
  actionCenterOpen: boolean;
  onToggleActionCenter: () => void;
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(id);
  }, []);

  const timeString = now.toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: clockFormat === '12h',
  });
  const dateString = now.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <button
      type="button"
      onClick={onToggleActionCenter}
      aria-expanded={actionCenterOpen}
      aria-label="System Clock and Calendar"
      className={`h-full px-2.5 flex flex-col items-center justify-center leading-tight font-mono-tabular transition-colors ${
        actionCenterOpen ? 'bg-white/15 text-white' : 'text-slate-100 hover:bg-white/10'
      }`}
    >
      <span className="text-[11px] font-medium">{timeString}</span>
      <span className="text-[10px] text-slate-300">{dateString}</span>
    </button>
  );
});

const TaskbarAppButton = memo(function TaskbarAppButton({
  appId,
  language,
  taskbarPosition,
  activeWin,
  isOpen,
  isFocused,
  hovered,
  onHover,
  onToggleWindow,
  onCloseWindow,
}: {
  appId: AppId;
  language: LanguageId;
  taskbarPosition: 'bottom' | 'top';
  activeWin: WindowInstance | undefined;
  isOpen: boolean;
  isFocused: boolean;
  hovered: boolean;
  onHover: (id: string | null) => void;
  onToggleWindow: (id: string) => void;
  onCloseWindow: (id: string) => void;
}) {
  const Icon = APP_ICONS[appId];
  const meta = getAppMeta(appId);
  const label = language === 'ar' ? meta.arabicTitle : meta.title;

  return (
    <div
      className="relative h-full shrink-0"
      onMouseEnter={() => onHover(appId)}
      onMouseLeave={() => onHover(null)}
    >
      <button
        type="button"
        onClick={() => {
          if (activeWin) {
            onToggleWindow(activeWin.id);
          } else {
            openOsApp(appId);
          }
        }}
        aria-label={label}
        aria-pressed={isFocused}
        title={label}
        className={`relative h-full w-11 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--os-accent-hover)] ${
          isFocused
            ? 'bg-white/15 text-white'
            : isOpen
              ? 'bg-white/5 text-slate-200 hover:bg-white/10'
              : 'text-slate-300 hover:bg-white/10 hover:text-white'
        }`}
      >
        <Icon className={`w-4 h-4 ${isFocused ? 'os-accent-text' : ''}`} />
        {isOpen && (
          <span
            aria-hidden="true"
            className={`absolute bottom-0 transition-all h-[3px] os-accent-bg ${
              isFocused ? 'left-1 right-1' : 'left-3 right-3 opacity-80'
            }`}
          />
        )}
      </button>

      {hovered && isOpen && activeWin && (
        <div
          className={`absolute ${
            taskbarPosition === 'top' ? 'top-11' : 'bottom-11'
          } left-1/2 -translate-x-1/2 z-[9998] w-48 rounded-md os-acrylic os-menu-enter border border-slate-700 p-2 space-y-1.5`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Icon className="w-3.5 h-3.5 os-accent-text shrink-0" />
              <span className="text-[11px] font-medium text-slate-100 truncate">
                {activeWin.title}
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCloseWindow(activeWin.id);
              }}
              aria-label={`Close ${activeWin.title}`}
              className="p-0.5 rounded-sm text-slate-400 hover:text-white hover:bg-red-600 shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => onToggleWindow(activeWin.id)}
            className="w-full h-14 rounded-sm bg-slate-950/90 border border-slate-800 flex items-center justify-center gap-2 text-[11px] text-slate-400 hover:text-white"
          >
            <Icon className="w-5 h-5 os-accent-text" />
            <span>
              {activeWin.isMinimized
                ? language === 'ar'
                  ? 'استعادة'
                  : 'Restore'
                : `${activeWin.width}×${activeWin.height}`}
            </span>
          </button>
        </div>
      )}
    </div>
  );
});

export function Taskbar({
  startOpen,
  onToggleStart,
  searchOpen,
  searchQuery,
  onSearchQueryChange,
  onOpenSearch,
  taskViewOpen,
  onToggleTaskView,
  quickSettingsOpen,
  onToggleQuickSettings,
  actionCenterOpen,
  onToggleActionCenter,
  isBrowserOnline,
}: TaskbarProps) {
  const windows = useWindowStore((s) => s.windows);
  const toggleTaskbarWindow = useWindowStore((s) => s.toggleTaskbarWindow);
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const minimizeAll = useWindowStore((s) => s.minimizeAll);

  const language = useSettingsStore((s) => s.language);
  const clockFormat = useSettingsStore((s) => s.clockFormat);
  const taskbarPosition = useSettingsStore((s) => s.taskbarPosition);
  const taskbarAlignment = useSettingsStore((s) => s.taskbarAlignment);
  const wifiEnabled = useSettingsStore((s) => s.wifiEnabled);
  const bluetoothEnabled = useSettingsStore((s) => s.bluetoothEnabled);
  const airplaneMode = useSettingsStore((s) => s.airplaneMode);
  const accessibilityHighContrast = useSettingsStore((s) => s.accessibilityHighContrast);
  const volume = useSettingsStore((s) => s.volume);
  const muted = useSettingsStore((s) => s.muted);
  const pinnedWebApps = useSettingsStore((s) => s.pinnedWebApps);
  const setLanguage = useSettingsStore((s) => s.setLanguage);

  const notificationsCount = useNotificationStore((s) => s.notifications.length);

  const [hiddenTrayOpen, setHiddenTrayOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [hoveredAppId, setHoveredAppId] = useState<string | null>(null);

  const topFocusedId = getTopFocusedWindowId(windows);
  const effectiveOnline = wifiEnabled && !airplaneMode && isBrowserOnline;

  // Combine pinned apps and any unpinned currently open apps
  const openUnpinnedAppIds = Array.from(
    new Set(
      windows
        .map((w) => w.appId)
        .filter((appId) => !PINNED_TASKBAR_APPS.includes(appId))
    )
  );
  const taskbarAppIds = [...PINNED_TASKBAR_APPS, ...openUnpinnedAppIds];

  return (
    <footer
      aria-label="Taskbar"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      className={`relative z-[9995] h-10 shrink-0 flex items-center justify-between bg-slate-950/84 backdrop-blur-2xl select-none ${
        taskbarPosition === 'top'
          ? 'border-b border-slate-800/90'
          : 'border-t border-slate-800/90'
      }`}
    >
      {/* Left / Center Section: Start + White Search Box + Task View + Pinned & Open Apps */}
      <div
        className={`flex items-center h-full min-w-0 flex-1 ${
          taskbarAlignment === 'center' ? 'justify-center' : 'justify-start'
        }`}
      >
        {/* Windows 10 Fluent Start Button */}
        <button
          type="button"
          onClick={onToggleStart}
          aria-expanded={startOpen}
          aria-label="Start Menu"
          title={t(language, 'start')}
          className={`h-full w-11 flex items-center justify-center shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--os-accent-hover)] ${
            startOpen ? 'os-accent-soft-bg os-accent-text' : 'text-slate-100 hover:bg-white/10'
          }`}
        >
          <span className="grid grid-cols-2 gap-0.5 w-4 h-4" aria-hidden="true">
            <span className="bg-current opacity-95" />
            <span className="bg-current opacity-95" />
            <span className="bg-current opacity-95" />
            <span className="bg-current opacity-95" />
          </span>
        </button>

        {/* Windows 10 Wide White Search Box */}
        <div
          className={`relative h-full flex items-center shrink-0 transition-all ${
            searchOpen ? 'w-64 sm:w-72' : 'w-44 sm:w-60'
          }`}
        >
          <Search
            className={`w-3.5 h-3.5 text-slate-700 absolute ${
              language === 'ar' ? 'right-3' : 'left-3'
            } top-1/2 -translate-y-1/2 pointer-events-none`}
          />
          <input
            type="search"
            value={searchQuery}
            onFocus={onOpenSearch}
            onClick={onOpenSearch}
            onChange={(e) => {
              if (!searchOpen) onOpenSearch();
              onSearchQueryChange(e.target.value);
            }}
            placeholder={t(language, 'searchPlaceholder')}
            aria-label={t(language, 'searchPlaceholder')}
            className={`w-full h-full bg-white text-slate-900 placeholder:text-slate-600 text-xs font-medium ${
              language === 'ar' ? 'pr-9 pl-2.5' : 'pl-9 pr-2.5'
            } border-0 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--os-accent)]`}
          />
        </div>

        {/* Task View Button */}
        <button
          type="button"
          onClick={onToggleTaskView}
          aria-pressed={taskViewOpen}
          aria-label={t(language, 'taskView')}
          title={t(language, 'taskView')}
          className={`h-full w-10 flex items-center justify-center shrink-0 transition-colors ${
            taskViewOpen
              ? 'os-accent-soft-bg os-accent-text'
              : 'text-slate-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
        </button>

        {/* Pinned & Running Applications */}
        <div className="flex items-center h-full min-w-0 overflow-x-auto os-scroll">
          {taskbarAppIds.map((appId) => {
            const matchingWindows = windows.filter((w) => w.appId === appId);
            const activeWin =
              matchingWindows.find((w) => w.id === topFocusedId && !w.isMinimized) ??
              matchingWindows[0];
            const isOpen = matchingWindows.length > 0;
            const isFocused = Boolean(
              activeWin && activeWin.id === topFocusedId && !activeWin.isMinimized
            );
            return (
              <TaskbarAppButton
                key={appId}
                appId={appId}
                language={language}
                taskbarPosition={taskbarPosition}
                activeWin={activeWin}
                isOpen={isOpen}
                isFocused={isFocused}
                hovered={hoveredAppId === appId}
                onHover={setHoveredAppId}
                onToggleWindow={toggleTaskbarWindow}
                onCloseWindow={closeWindow}
              />
            );
          })}

          {/* Pinned Web Apps */}
          {pinnedWebApps.slice(0, 3).map((wa) => (
            <button
              key={wa.id}
              type="button"
              onClick={() => openOsApp('browser', { initialUrl: wa.url })}
              aria-label={`Open ${wa.name}`}
              title={wa.name}
              className="h-full w-10 flex items-center justify-center text-emerald-400 hover:bg-white/10 transition-colors shrink-0"
            >
              <Globe className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Right Section: System Tray */}
      <div className="flex items-center h-full shrink-0">
        {/* Hidden Tray Chevron */}
        <div className="relative h-full">
          <button
            type="button"
            onClick={() => {
              setLangMenuOpen(false);
              setHiddenTrayOpen((v) => !v);
            }}
            aria-expanded={hiddenTrayOpen}
            aria-label={t(language, 'hiddenIcons')}
            title={t(language, 'hiddenIcons')}
            className="h-full px-1.5 flex items-center justify-center text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          {hiddenTrayOpen && (
            <div
              onMouseDown={(e) => e.stopPropagation()}
              className={`absolute ${
                taskbarPosition === 'top' ? 'top-11' : 'bottom-11'
              } end-0 z-[9997] p-2 rounded-md os-acrylic os-menu-enter border border-slate-700 grid grid-cols-3 gap-1 w-32`}
            >
              <button
                type="button"
                onClick={() => {
                  openOsApp('files');
                  setHiddenTrayOpen(false);
                }}
                title="Host Disk"
                aria-label="Host Disk"
                className="p-2 hover:bg-slate-800 flex items-center justify-center text-slate-200"
              >
                <HardDrive className="w-4 h-4 os-accent-text" />
              </button>
              <button
                type="button"
                onClick={() => {
                  onToggleQuickSettings();
                  setHiddenTrayOpen(false);
                }}
                title={t(language, 'bluetooth')}
                aria-label={t(language, 'bluetooth')}
                className="p-2 hover:bg-slate-800 flex items-center justify-center text-slate-200"
              >
                <Bluetooth
                  className={`w-4 h-4 ${bluetoothEnabled ? 'os-accent-text' : 'text-slate-500'}`}
                />
              </button>
              <button
                type="button"
                onClick={() => {
                  onToggleQuickSettings();
                  setHiddenTrayOpen(false);
                }}
                title={t(language, 'accessibility')}
                aria-label={t(language, 'accessibility')}
                className="p-2 hover:bg-slate-800 flex items-center justify-center text-slate-200"
              >
                <Contrast
                  className={`w-4 h-4 ${
                    accessibilityHighContrast ? 'text-amber-300' : 'text-slate-400'
                  }`}
                />
              </button>
            </div>
          )}
        </div>

        {/* Quick Settings Cluster: Battery + Wi-Fi + Volume */}
        <button
          type="button"
          onClick={onToggleQuickSettings}
          aria-expanded={quickSettingsOpen}
          aria-label={t(language, 'quickSettings')}
          title={t(language, 'quickSettings')}
          className={`h-full flex items-center gap-2 px-2 transition-colors ${
            quickSettingsOpen ? 'bg-white/15 text-white' : 'text-slate-200 hover:bg-white/10'
          }`}
        >
          <TrayBatteryIndicator />

          {effectiveOnline ? (
            <Wifi className="w-3.5 h-3.5 text-slate-100" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-slate-500" />
          )}

          {muted || volume === 0 ? (
            <VolumeX className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <Volume2 className="w-3.5 h-3.5 text-slate-100" />
          )}
        </button>

        {/* Language Switcher (ENG / عربي) */}
        <div className="relative h-full">
          <button
            type="button"
            onClick={() => {
              setHiddenTrayOpen(false);
              setLangMenuOpen((v) => !v);
            }}
            aria-expanded={langMenuOpen}
            aria-label="Switch Language"
            className="h-full px-2 flex items-center justify-center text-[11px] font-semibold text-slate-200 hover:bg-white/10 transition-colors"
          >
            {language === 'ar' ? 'عربي' : 'ENG'}
          </button>
          {langMenuOpen && (
            <div
              onMouseDown={(e) => e.stopPropagation()}
              className={`absolute ${
                taskbarPosition === 'top' ? 'top-11' : 'bottom-11'
              } end-0 z-[9997] w-44 rounded-md os-acrylic os-menu-enter border border-slate-700 py-1`}
            >
              <button
                type="button"
                onClick={() => {
                  setLanguage('en');
                  setLangMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-slate-800 ${
                  language === 'en' ? 'os-accent-text font-semibold' : 'text-slate-200'
                }`}
              >
                <span>English (US)</span>
                <span className="font-mono text-[10px]">ENG</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setLanguage('ar');
                  setLangMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-slate-800 ${
                  language === 'ar' ? 'os-accent-text font-semibold' : 'text-slate-200'
                }`}
              >
                <span>العربية</span>
                <span className="text-[10px]">عربي</span>
              </button>
            </div>
          )}
        </div>

        {/* 2-Line Clock & Date -> Opens Calendar + Action Center */}
        <TrayClockButton
          language={language}
          clockFormat={clockFormat}
          actionCenterOpen={actionCenterOpen}
          onToggleActionCenter={onToggleActionCenter}
        />

        {/* Action Center Notification Icon */}
        <button
          type="button"
          onClick={onToggleActionCenter}
          aria-label="Action Center"
          className={`h-full px-2 flex items-center gap-1 transition-colors ${
            actionCenterOpen ? 'bg-white/15 os-accent-text' : 'text-slate-200 hover:bg-white/10'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          {notificationsCount > 0 && (
            <span className="text-[10px] font-mono-tabular">{notificationsCount}</span>
          )}
        </button>

        {/* Far-Right Show Desktop Sliver */}
        <button
          type="button"
          onClick={minimizeAll}
          aria-label={t(language, 'showDesktop')}
          title={t(language, 'showDesktop')}
          className="h-full w-2 border-s border-slate-700/80 hover:bg-white/20 transition-colors shrink-0"
        />
      </div>
    </footer>
  );
}
