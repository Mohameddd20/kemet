import { memo, useEffect, useState, type MouseEvent } from 'react';
import type { AppId, WindowInstance } from '../../windowManager/types';
import { useSettingsStore } from '../../system/settingsStore';
import { openBrowserOrChromeStore } from '../../apps/registry';
import { KemetLogo } from './KemetLogo';
import { AppVectorIcon } from './AppVectorIcons';

interface LeftHexDockProps {
  windows: WindowInstance[];
  activeWindowId: string | null;
  hasMaximizedWindow?: boolean;
  portalOpen: boolean;
  onTogglePortal: () => void;
  onLaunchApp: (appId: AppId) => void;
  onSelectWindow: (win: WindowInstance) => void;
  onMinimizeAll?: () => void;
  onDockItemContextMenu?: (
    e: MouseEvent,
    appId: AppId,
    label: string,
    matchingWindows: WindowInstance[]
  ) => void;
}

export const LeftHexDock = memo(function LeftHexDock({
  windows,
  activeWindowId,
  hasMaximizedWindow = false,
  portalOpen,
  onTogglePortal,
  onLaunchApp,
  onSelectWindow,
  onMinimizeAll,
  onDockItemContextMenu,
}: LeftHexDockProps) {
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const clockFormat = useSettingsStore((s) => s.clockFormat);
  const isAr = language === 'ar';

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(id);
  }, []);

  const timeStr = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: clockFormat === '12h',
  });

  const leftItems: Array<{
    appId: AppId;
    iconId: string;
    labelAr: string;
    labelEn: string;
  }> = [
    {
      appId: 'files',
      iconId: 'files',
      labelAr: 'مدير الملفات',
      labelEn: 'Files',
    },
    {
      appId: 'browser',
      iconId: 'chrome',
      labelAr: 'متصفح KemetOS',
      labelEn: 'Chrome / Browser',
    },
  ];

  const rightItems: Array<{
    appId: AppId;
    iconId: string;
    labelAr: string;
    labelEn: string;
  }> = [
    {
      appId: 'store',
      iconId: 'store',
      labelAr: 'متجر كيميت',
      labelEn: 'Kemet Store',
    },
    {
      appId: 'terminal',
      iconId: 'terminal',
      labelAr: 'التيرمينال',
      labelEn: 'Terminal',
    },
    {
      appId: 'settings',
      iconId: 'settings',
      labelAr: 'الإعدادات',
      labelEn: 'Settings',
    },
  ];

  const renderDockButton = (item: (typeof leftItems)[number]) => {
    const matching = windows.filter((w) => w.appId === item.appId);
    const isOpen = matching.length > 0;
    const isFocused = matching.some((w) => w.id === activeWindowId && !w.isMinimized);
    const label = isAr ? item.labelAr : item.labelEn;

    return (
      <button
        key={item.appId}
        type="button"
        onClick={() => {
          if (matching.length === 1) {
            onSelectWindow(matching[0]);
          } else if (item.appId === 'browser') {
            void openBrowserOrChromeStore();
          } else {
            onLaunchApp(item.appId);
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDockItemContextMenu?.(e, item.appId, label, matching);
        }}
        title={label}
        aria-label={label}
        className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 cursor-pointer ${
          isFocused
            ? 'bg-white/12 ring-1 ring-teal-400/50'
            : 'hover:bg-white/10 hover:-translate-y-0.5'
        }`}
      >
        <AppVectorIcon id={item.iconId} className="w-7 h-7 drop-shadow-md" />
        {isOpen && (
          <span
            className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 rounded-full ${
              isFocused ? 'w-4 bg-teal-400' : 'w-2 bg-amber-300'
            }`}
          />
        )}
      </button>
    );
  };

  const dockCenterContent = (
    <>
      {leftItems.map(renderDockButton)}

      <div className="w-px h-6 bg-slate-700/70 mx-0.5" />

      {/* Center Launcher Emblem */}
      <button
        type="button"
        onClick={onTogglePortal}
        title={isAr ? 'بوابة كيميت' : 'Kemet Portal'}
        aria-label={isAr ? 'بوابة كيميت' : 'Kemet Portal'}
        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 cursor-pointer ${
          portalOpen
            ? 'bg-amber-400/20 ring-1 ring-amber-400'
            : 'hover:bg-white/10 hover:-translate-y-0.5'
        }`}
      >
        <KemetLogo className="w-7 h-7 rounded-lg" />
      </button>

      <div className="w-px h-6 bg-slate-700/70 mx-0.5" />

      {rightItems.map(renderDockButton)}
    </>
  );

  if (hasMaximizedWindow) {
    return (
      <aside
        aria-label="Kemet Bottom Dock"
        dir="ltr"
        className="fixed bottom-0 inset-x-0 h-12 z-[190] select-none bg-[#070b14]/98 backdrop-blur-md border-t border-slate-800/90 px-2 sm:px-4 flex items-center justify-center sm:justify-between"
      >
        <div className="hidden sm:flex items-center gap-2 min-w-[110px]">
          <span className="text-[11px] font-bold tracking-wide text-amber-300/90">KemetOS</span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">{dockCenterContent}</div>

        <div className="hidden sm:flex items-center justify-end gap-2.5 min-w-[110px]">
          <button
            type="button"
            onClick={() => setLanguage(isAr ? 'en' : 'ar')}
            className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700/70 text-[10px] font-bold text-slate-200 cursor-pointer"
            title={isAr ? 'تبديل اللغة' : 'Switch Language'}
          >
            {isAr ? 'AR' : 'EN'}
          </button>
          <span className="text-[11px] font-mono-tabular text-slate-300 whitespace-nowrap">
            {timeStr}
          </span>
          {onMinimizeAll && (
            <button
              type="button"
              onClick={onMinimizeAll}
              title={isAr ? 'إظهار سطح المكتب' : 'Show Desktop'}
              aria-label={isAr ? 'إظهار سطح المكتب' : 'Show Desktop'}
              className="w-2.5 h-7 rounded-sm border-l border-slate-700/80 hover:bg-teal-400/25 transition-colors cursor-pointer"
            />
          )}
        </div>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Kemet Bottom Dock"
      dir="ltr"
      className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 select-none w-max max-w-[calc(100vw-20px)]"
    >
      <div className="px-2.5 py-1.5 rounded-2xl bg-[#0b1324]/92 backdrop-blur-md border border-slate-700/75 shadow-[0_14px_40px_rgba(0,0,0,0.75)] flex items-center gap-1.5 sm:gap-2">
        {dockCenterContent}
      </div>
    </aside>
  );
});
