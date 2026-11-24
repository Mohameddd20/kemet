import { useEffect, useMemo, useState } from 'react';
import {
  Cloud,
  CloudSun,
  Cpu,
  FolderOpen,
  Globe,
  Image,
  Lock,
  Menu,
  Moon,
  Power,
  RefreshCw,
  Settings,
  Sun,
  Terminal,
  User,
} from 'lucide-react';
import { APP_CATALOG } from '../apps/appCatalog';
import { APP_ICONS, openInstalledStoreApp, openOsApp } from '../apps/registry';
import { t } from '../system/i18n';
import { useNotificationStore } from '../system/notificationStore';
import { useSettingsStore } from '../system/settingsStore';
import {
  fetchInstalledLinuxApps,
  fetchLiveWeather,
  fetchSystemMetrics,
  launchExternalLinuxApp,
  type InstalledLinuxApp,
  type RealSystemMetrics,
  type WeatherInfo,
} from '../system/systemBridge';
import type { AppId } from '../windowManager/types';

interface StartMenuProps {
  onClose: () => void;
  onLock: () => void;
  onSleep: () => void;
  onRestart: () => void;
}

function getWeatherConditionText(code: number | null, lang: 'en' | 'ar'): string {
  if (code === null) return lang === 'ar' ? 'غير متاح' : 'Unavailable';
  if (code === 0) return lang === 'ar' ? 'صحو' : 'Clear Sky';
  if (code <= 3) return lang === 'ar' ? 'غائم جزئياً' : 'Partly Cloudy';
  if (code <= 48) return lang === 'ar' ? 'ضباب' : 'Foggy';
  if (code <= 67) return lang === 'ar' ? 'أمطار' : 'Rain';
  if (code <= 77) return lang === 'ar' ? 'ثلوج' : 'Snow';
  return lang === 'ar' ? 'عاصف' : 'Stormy';
}

export function StartMenu({ onClose, onLock, onSleep, onRestart }: StartMenuProps) {
  const language = useSettingsStore((s) => s.language);
  const username = useSettingsStore((s) => s.username);
  const taskbarPosition = useSettingsStore((s) => s.taskbarPosition);
  const taskbarAlignment = useSettingsStore((s) => s.taskbarAlignment);
  const pinnedWebApps = useSettingsStore((s) => s.pinnedWebApps);
  const installedStoreApps = useSettingsStore((s) => s.installedStoreApps);
  const pushNotification = useNotificationStore((s) => s.pushNotification);

  const [railExpanded, setRailExpanded] = useState(false);
  const [powerMenuOpen, setPowerMenuOpen] = useState(false);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [metrics, setMetrics] = useState<RealSystemMetrics | null>(null);
  const [linuxApps, setLinuxApps] = useState<InstalledLinuxApp[]>([]);

  useEffect(() => {
    void fetchLiveWeather().then(setWeather).catch(() => undefined);
    void fetchSystemMetrics().then(setMetrics).catch(() => undefined);
    void fetchInstalledLinuxApps().then(setLinuxApps).catch(() => undefined);
  }, []);

  const groupedApps = useMemo(() => {
    const items = APP_CATALOG.map((app) => ({
      key: `app-${app.id}`,
      label: language === 'ar' ? app.arabicTitle : app.title,
      secondary: language === 'ar' ? app.title : app.arabicTitle,
      appId: app.id as AppId,
      sortKey: app.title.toUpperCase(),
    }));

    items.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

    const groups: Array<{ letter: string; entries: typeof items }> = [];
    for (const item of items) {
      const letter = item.sortKey.charAt(0);
      let grp = groups.find((g) => g.letter === letter);
      if (!grp) {
        grp = { letter, entries: [] };
        groups.push(grp);
      }
      grp.entries.push(item);
    }
    return groups;
  }, [language]);

  const now = new Date();
  const dayNumber = now.getDate();
  const weekdayLabel = now.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
    weekday: 'long',
  });
  const monthLabel = now.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
    month: 'short',
  });

  const posClass =
    taskbarPosition === 'top'
      ? taskbarAlignment === 'center'
        ? 'top-10 left-1/2 -translate-x-1/2'
        : language === 'ar'
          ? 'top-10 right-0'
          : 'top-10 left-0'
      : taskbarAlignment === 'center'
        ? 'bottom-10 left-1/2 -translate-x-1/2'
        : language === 'ar'
          ? 'bottom-10 right-0'
          : 'bottom-10 left-0';

  const handleLaunchLinuxTool = async (tool: InstalledLinuxApp) => {
    const res = await launchExternalLinuxApp(tool.binary);
    if (res.ok) {
      pushNotification('Launched Native App', `Started ${tool.name} (${tool.binary}).`, 'system');
      onClose();
      return;
    }
    // In browser mode, open interactive Terminal directly at host shell
    openOsApp('terminal', { storageMode: 'host' });
    pushNotification(
      'Host Binary Detected',
      `${tool.name} (${tool.path}). Opened Host Terminal to run it interactively.`,
      'system'
    );
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-label="Start Menu"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      onMouseDown={(e) => e.stopPropagation()}
      className={`fixed ${posClass} z-[9992] w-[min(96vw,730px)] h-[520px] rounded-lg os-acrylic start-menu-slide-up border border-slate-700/80 flex overflow-hidden`}
    >
      {/* Column 1: Windows 10 Left Navigation Rail */}
      <nav
        aria-label="Start Navigation Rail"
        className={`relative shrink-0 bg-slate-950/75 border-e border-slate-800/80 flex flex-col justify-between transition-[width] duration-150 ${
          railExpanded ? 'w-44' : 'w-12'
        }`}
      >
        <div>
          <button
            type="button"
            onClick={() => setRailExpanded((v) => !v)}
            aria-label={t(language, railExpanded ? 'collapseMenu' : 'expandMenu')}
            title={t(language, railExpanded ? 'collapseMenu' : 'expandMenu')}
            className="w-full h-11 flex items-center gap-3 px-3.5 text-slate-200 hover:bg-slate-800/90 transition-colors"
          >
            <Menu className="w-4 h-4 shrink-0" />
            {railExpanded && (
              <span className="text-xs font-semibold truncate">{t(language, 'start')}</span>
            )}
          </button>
        </div>

        <div className="flex flex-col pb-1">
          <button
            type="button"
            onClick={() => {
              openOsApp('settings', { initialTab: 'accounts' });
              onClose();
            }}
            title={`${username}@nizamos`}
            className="w-full h-11 flex items-center gap-3 px-3.5 text-slate-200 hover:bg-slate-800/90 transition-colors"
          >
            <User className="w-4 h-4 os-accent-text shrink-0" />
            {railExpanded && (
              <span className="text-xs truncate">{username}@nizamos</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              openOsApp('files', { storageMode: 'vfs', initialDir: '/home/user/Documents' });
              onClose();
            }}
            title={t(language, 'documents')}
            className="w-full h-11 flex items-center gap-3 px-3.5 text-slate-200 hover:bg-slate-800/90 transition-colors"
          >
            <FolderOpen className="w-4 h-4 shrink-0" />
            {railExpanded && <span className="text-xs truncate">{t(language, 'documents')}</span>}
          </button>

          <button
            type="button"
            onClick={() => {
              openOsApp('camera');
              onClose();
            }}
            title={t(language, 'pictures')}
            className="w-full h-11 flex items-center gap-3 px-3.5 text-slate-200 hover:bg-slate-800/90 transition-colors"
          >
            <Image className="w-4 h-4 shrink-0" />
            {railExpanded && <span className="text-xs truncate">{t(language, 'pictures')}</span>}
          </button>

          <button
            type="button"
            onClick={() => {
              openOsApp('settings');
              onClose();
            }}
            title={t(language, 'settings')}
            className="w-full h-11 flex items-center gap-3 px-3.5 text-slate-200 hover:bg-slate-800/90 transition-colors"
          >
            <Settings className="w-4 h-4 shrink-0" />
            {railExpanded && <span className="text-xs truncate">{t(language, 'settings')}</span>}
          </button>

          <div className="relative">
            {powerMenuOpen && (
              <div
                className={`absolute bottom-11 ${
                  language === 'ar' ? 'right-1' : 'left-1'
                } z-30 w-40 bg-slate-900 border border-slate-700 shadow-2xl py-1`}
              >
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSleep();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800"
                >
                  <Moon className="w-3.5 h-3.5 os-accent-text" />
                  <span>{t(language, 'sleep')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onLock();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t(language, 'lock')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRestart();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t(language, 'restart')}</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setPowerMenuOpen((v) => !v)}
              aria-expanded={powerMenuOpen}
              aria-label="Power options"
              title={t(language, 'power')}
              className={`w-full h-11 flex items-center gap-3 px-3.5 transition-colors ${
                powerMenuOpen
                  ? 'os-accent-bg text-white'
                  : 'text-slate-200 hover:bg-slate-800/90'
              }`}
            >
              <Power className="w-4 h-4 shrink-0" />
              {railExpanded && <span className="text-xs truncate">{t(language, 'power')}</span>}
            </button>
          </div>
        </div>
      </nav>

      {/* Column 2: Alphabetical All Apps List */}
      <div className="w-56 shrink-0 border-e border-slate-800/80 overflow-y-auto os-scroll p-2.5 space-y-3">
        <div className="px-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          {t(language, 'allApps')}
        </div>

        <div className="space-y-2.5">
          {groupedApps.map((group) => (
            <div key={group.letter} className="space-y-0.5">
              <div className="px-2 py-0.5 text-[11px] font-semibold os-accent-text">
                {group.letter}
              </div>
              {group.entries.map((entry) => {
                const Icon = APP_ICONS[entry.appId];
                return (
                  <button
                    key={entry.key}
                    type="button"
                    onClick={() => {
                      openOsApp(entry.appId);
                      onClose();
                    }}
                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-sm hover:bg-slate-800/90 text-start transition-colors"
                  >
                    <div className="w-6 h-6 rounded-sm os-accent-bg flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-xs text-slate-100 truncate">{entry.label}</span>
                  </button>
                );
              })}
            </div>
          ))}

          {installedStoreApps.length > 0 && (
            <div className="space-y-0.5 pt-1 border-t border-slate-800/80">
              <div className="px-2 py-0.5 text-[11px] font-semibold text-sky-400">
                {language === 'ar' ? 'تطبيقات المتجر المثبتة' : 'Store Apps & Games'}
              </div>
              {installedStoreApps.map((sa) => (
                <button
                  key={sa.id}
                  type="button"
                  onClick={() => {
                    void openInstalledStoreApp(sa);
                    onClose();
                  }}
                  className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-sm hover:bg-slate-800/90 text-start transition-colors"
                >
                  <div
                    className={`w-6 h-6 rounded-sm bg-gradient-to-br ${sa.accentBg} flex items-center justify-center text-[9px] font-bold text-white shrink-0`}
                  >
                    {sa.badgeText}
                  </div>
                  <span className="text-xs text-slate-100 truncate">
                    {language === 'ar' ? sa.arabicName : sa.name}
                  </span>
                </button>
              ))}
            </div>
          )}

          {pinnedWebApps.length > 0 && (
            <div className="space-y-0.5 pt-1 border-t border-slate-800/80">
              <div className="px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                {language === 'ar' ? 'تطبيقات الويب' : 'Web Apps'}
              </div>
              {pinnedWebApps.map((wa) => (
                <button
                  key={wa.id}
                  type="button"
                  onClick={() => {
                    openOsApp('browser', { initialUrl: wa.url });
                    onClose();
                  }}
                  className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-sm hover:bg-slate-800/90 text-start transition-colors"
                >
                  <div className="w-6 h-6 rounded-sm bg-emerald-600 flex items-center justify-center shrink-0">
                    <Globe className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-xs text-slate-100 truncate">{wa.name}</span>
                </button>
              ))}
            </div>
          )}

          {linuxApps.length > 0 && (
            <div className="space-y-0.5 pt-1 border-t border-slate-800/80">
              <div className="px-2 py-0.5 text-[11px] font-semibold text-amber-400">
                {language === 'ar' ? 'أدوات لينكس المثبتة' : 'Host Linux Tools'}
              </div>
              {linuxApps.slice(0, 5).map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => void handleLaunchLinuxTool(tool)}
                  className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-sm hover:bg-slate-800/90 text-start transition-colors"
                >
                  <div className="w-6 h-6 rounded-sm bg-slate-800 flex items-center justify-center shrink-0">
                    <Terminal className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <span className="text-xs text-slate-200 truncate">{tool.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Column 3: Windows 10 Live Tiles Grid */}
      <div className="flex-1 overflow-y-auto os-scroll p-3.5 space-y-4">
        {/* Productivity Group */}
        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-slate-200">{t(language, 'productivity')}</h3>
          <div className="grid grid-cols-4 gap-1.5 auto-rows-[76px]">
            {/* Wide Live Calendar Tile */}
            <button
              type="button"
              onClick={() => {
                openOsApp('settings', { initialTab: 'time' });
                onClose();
              }}
              className="col-span-2 p-3 bg-sky-700 hover:bg-sky-600 border border-white/10 hover:border-white/35 text-start flex flex-col justify-between transition-all"
            >
              <div className="flex items-start justify-between">
                <span className="text-[11px] font-medium text-sky-100">{weekdayLabel}</span>
                <span className="text-[11px] font-medium text-sky-200">{monthLabel}</span>
              </div>
              <div className="text-2xl font-bold font-mono-tabular text-white leading-none">
                {dayNumber}
              </div>
            </button>

            <TileAppButton appId="files" label={language === 'ar' ? 'الملفات' : 'Files'} onClose={onClose} />
            <TileAppButton appId="editor" label={language === 'ar' ? 'المحرر' : 'Editor'} onClose={onClose} />
            <TileAppButton appId="calculator" label={language === 'ar' ? 'الحاسبة' : 'Calc'} onClose={onClose} />
            <TileAppButton appId="recycle" label={t(language, 'recycleBin')} onClose={onClose} />

            {/* Wide System Monitor Live Tile */}
            <button
              type="button"
              onClick={() => {
                openOsApp('taskmgr');
                onClose();
              }}
              className="col-span-2 p-3 bg-slate-800/95 hover:bg-slate-800 border border-slate-700 hover:border-white/35 text-start flex flex-col justify-between transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-300">
                  {t(language, 'taskManager')}
                </span>
                <Cpu className="w-4 h-4 os-accent-text" />
              </div>
              <div className="flex items-baseline gap-3 font-mono-tabular">
                <span className="text-base font-semibold text-white">
                  CPU {metrics ? `${Math.round(metrics.cpuPercent)}%` : '—'}
                </span>
                <span className="text-xs text-slate-300">
                  RAM {metrics ? `${Math.round(metrics.memory.usedPercent)}%` : '—'}
                </span>
              </div>
            </button>
          </div>
        </section>

        {/* Explore Group */}
        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-slate-200">{t(language, 'explore')}</h3>
          <div className="grid grid-cols-4 gap-1.5 auto-rows-[76px]">
            {/* Wide Live Weather Tile (Open-Meteo) */}
            <button
              type="button"
              onClick={() => {
                openOsApp('browser', { initialUrl: 'https://html.duckduckgo.com/html/?q=Cairo+weather' });
                onClose();
              }}
              className="col-span-2 p-3 bg-gradient-to-br from-blue-700 to-indigo-800 hover:brightness-110 border border-white/10 hover:border-white/35 text-start flex flex-col justify-between transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-blue-100 truncate">
                  {weather?.locationLabel ?? 'Cairo, EG'}
                </span>
                {weather?.weatherCode === 0 ? (
                  <Sun className="w-4 h-4 text-amber-300 shrink-0" />
                ) : weather?.weatherCode !== null && (weather?.weatherCode ?? 0) <= 3 ? (
                  <CloudSun className="w-4 h-4 text-sky-200 shrink-0" />
                ) : (
                  <Cloud className="w-4 h-4 text-slate-200 shrink-0" />
                )}
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-2xl font-semibold font-mono-tabular text-white">
                  {weather?.available && weather.temperatureC !== null
                    ? `${weather.temperatureC}°`
                    : '—'}
                </span>
                <span className="text-[11px] text-blue-100 truncate">
                  {getWeatherConditionText(weather?.weatherCode ?? null, language)}
                </span>
              </div>
            </button>

            <TileAppButton appId="browser" label={language === 'ar' ? 'المتصفح' : 'Browser'} onClose={onClose} />
            <TileAppButton appId="store" label={language === 'ar' ? 'المتجر' : 'Store'} onClose={onClose} />
          </div>
        </section>

        {/* Build & System Group */}
        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-slate-200">{t(language, 'build')}</h3>
          <div className="grid grid-cols-4 gap-1.5 auto-rows-[72px]">
            <TileAppButton appId="terminal" label={language === 'ar' ? 'الطرفية' : 'Terminal'} onClose={onClose} />
            <TileAppButton appId="media" label={language === 'ar' ? 'الوسائط' : 'Media'} onClose={onClose} />
            <TileAppButton appId="camera" label={language === 'ar' ? 'الكاميرا' : 'Camera'} onClose={onClose} />
            <TileAppButton appId="settings" label={t(language, 'settings')} onClose={onClose} />
          </div>
        </section>
      </div>
    </div>
  );
}

function TileAppButton({
  appId,
  label,
  onClose,
}: {
  appId: AppId;
  label: string;
  onClose: () => void;
}) {
  const Icon = APP_ICONS[appId];
  return (
    <button
      type="button"
      onClick={() => {
        openOsApp(appId);
        onClose();
      }}
      className="p-2.5 bg-slate-800/85 hover:bg-slate-700/90 border border-slate-700/70 hover:border-white/40 flex flex-col items-center justify-between text-center transition-all"
    >
      <div className="flex-1 flex items-center justify-center">
        <Icon className="w-6 h-6 os-accent-text" />
      </div>
      <span className="text-[11px] font-medium text-slate-100 truncate w-full">{label}</span>
    </button>
  );
}
