import { memo, useEffect, useRef, useState } from 'react';
import {
  Activity,
  FilePlus2,
  FolderPlus,
  Globe,
  Palette,
  RefreshCw,
  Terminal,
  X,
} from 'lucide-react';
import { APP_CATALOG, type AppCatalogEntry } from '../apps/appCatalog';
import { APP_ICONS, openInstalledStoreApp, openOsApp } from '../apps/registry';
import { t, type LanguageId } from '../system/i18n';
import { useNotificationStore } from '../system/notificationStore';
import { useSettingsStore, type InstalledStoreApp } from '../system/settingsStore';
import { getPresetWallpaperUrl } from '../system/wallpapers';
import { useVfsStore } from '../vfs/vfsStore';
import { useWindowStore } from '../windowManager/useWindowStore';
import { getTopFocusedWindowId } from '../windowManager/windowLogic';
import { TopMenuBar } from './TopMenuBar';
import { SpotlightSearch } from './SpotlightSearch';
import { RunDialog } from './RunDialog';
import { OobeWizard } from './OobeWizard';
import { ActionCenter } from './ActionCenter';
import { BootScreen } from './BootScreen';
import { ContextMenu } from './ContextMenu';
import { LockScreen } from './LockScreen';
import { QuickSettingsFlyout } from './QuickSettingsFlyout';
import { SearchFlyout } from './SearchFlyout';
import { SleepOverlay } from './SleepOverlay';
import { StartMenu } from './StartMenu';
import { Taskbar } from './Taskbar';
import { TaskViewOverlay } from './TaskViewOverlay';
import { WindowFrame } from './WindowFrame';

interface ShortcutProps<T> {
  app: T;
  language: LanguageId;
  isSelected: boolean;
  onSelect: () => void;
  onOpen: () => void;
}

const DesktopShortcutButton = memo(function DesktopShortcutButton({
  app,
  language,
  isSelected,
  onSelect,
  onOpen,
}: ShortcutProps<AppCatalogEntry>) {
  const Icon = APP_ICONS[app.id];
  const displayLabel = language === 'ar' ? app.arabicTitle : app.title;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      aria-label={`Open ${app.title}`}
      data-selected={isSelected ? 'true' : 'false'}
      className={`group flex flex-col items-center justify-center w-22 py-1.5 px-1.5 rounded-sm transition-colors cursor-pointer select-none focus-visible:outline-none ${
        isSelected
          ? 'bg-sky-500/25 border border-sky-400/60 ring-1 ring-sky-400/40 text-white shadow-sm'
          : 'hover:bg-white/12 border border-transparent hover:border-white/20 text-slate-100'
      }`}
    >
      <div className="w-8 h-8 flex items-center justify-center mb-1">
        <Icon className="w-6 h-6 text-sky-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] group-hover:scale-105 transition-transform" />
      </div>
      <span
        dir={language === 'ar' ? 'rtl' : 'ltr'}
        className="text-[11px] font-medium text-white text-center leading-tight line-clamp-2 drop-shadow-[0_1px_3px_rgba(0,0,0,0.98)]"
      >
        {displayLabel}
      </span>
    </button>
  );
});

const DesktopStoreShortcutButton = memo(function DesktopStoreShortcutButton({
  app,
  language,
  isSelected,
  onSelect,
  onOpen,
}: ShortcutProps<InstalledStoreApp>) {
  const displayLabel = language === 'ar' ? app.arabicName : app.name;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      aria-label={`Open ${app.name}`}
      data-selected={isSelected ? 'true' : 'false'}
      className={`group flex flex-col items-center justify-center w-22 py-1.5 px-1.5 rounded-sm transition-colors cursor-pointer select-none focus-visible:outline-none ${
        isSelected
          ? 'bg-sky-500/25 border border-sky-400/60 ring-1 ring-sky-400/40 text-white shadow-sm'
          : 'hover:bg-white/12 border border-transparent hover:border-white/20 text-slate-100'
      }`}
    >
      <div
        className={`w-8 h-8 rounded-lg bg-gradient-to-br ${app.accentBg} flex items-center justify-center mb-1 text-[10px] font-bold text-white shadow-md group-hover:scale-105 transition-transform`}
      >
        {app.badgeText}
      </div>
      <span
        dir={language === 'ar' ? 'rtl' : 'ltr'}
        className="text-[11px] font-medium text-white text-center leading-tight line-clamp-2 drop-shadow-[0_1px_3px_rgba(0,0,0,0.98)]"
      >
        {displayLabel}
      </span>
    </button>
  );
});

export function Desktop() {
  const initVfs = useVfsStore((s) => s.initVfs);
  const isVfsLoaded = useVfsStore((s) => s.isLoaded);
  const mkdir = useVfsStore((s) => s.mkdir);
  const saveFile = useVfsStore((s) => s.saveFile);
  const windows = useWindowStore((s) => s.windows);

  const wallpaper = useSettingsStore((s) => s.wallpaper);
  const showDesktopIcons = useSettingsStore((s) => s.showDesktopIcons);
  const taskbarPosition = useSettingsStore((s) => s.taskbarPosition);
  const language = useSettingsStore((s) => s.language);
  const brightness = useSettingsStore((s) => s.brightness);
  const nightLight = useSettingsStore((s) => s.nightLight);
  const accessibilityHighContrast = useSettingsStore((s) => s.accessibilityHighContrast);
  const pinnedWebApps = useSettingsStore((s) => s.pinnedWebApps);
  const installedStoreApps = useSettingsStore((s) => s.installedStoreApps);
  const oobeCompleted = useSettingsStore((s) => s.oobeCompleted);
  const desktopLayout = useSettingsStore((s) => s.desktopLayout);

  const notifications = useNotificationStore((s) => s.notifications);
  const pushNotification = useNotificationStore((s) => s.pushNotification);
  const dismissToast = useNotificationStore((s) => s.dismissToast);

  const [isBooting, setIsBooting] = useState(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('autostart') !== '1' && params.get('noboot') !== '1';
  });
  const [isLocked, setIsLocked] = useState(false);
  const [isSleeping, setIsSleeping] = useState(false);
  const [showOobeWizard, setShowOobeWizard] = useState(false);

  const [startOpen, setStartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [taskViewOpen, setTaskViewOpen] = useState(false);
  const [quickSettingsOpen, setQuickSettingsOpen] = useState(false);
  const [actionCenterOpen, setActionCenterOpen] = useState(false);
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [runOpen, setRunOpen] = useState(false);
  const [desktopMenu, setDesktopMenu] = useState<{ x: number; y: number } | null>(null);
  const [selectedIconId, setSelectedIconId] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const [refreshFlash, setRefreshFlash] = useState(false);
  const [isBrowserOnline, setIsBrowserOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const bootOpenedRef = useRef(false);

  // Global NizamOS Shortcuts (Alt + Space, Win + E, Win + R, Win + D, Win + L)
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if (e.altKey && e.code === 'Space') {
        e.preventDefault();
        setSpotlightOpen((v) => !v);
        return;
      }

      if ((e.metaKey || e.ctrlKey) && !isInput) {
        const key = e.key.toLowerCase();
        if (key === 'e') {
          e.preventDefault();
          openOsApp('files');
        } else if (key === 'r') {
          e.preventDefault();
          setRunOpen(true);
        } else if (key === 'd') {
          e.preventDefault();
          useWindowStore.getState().windows.forEach((w) => useWindowStore.getState().minimizeWindow(w.id));
        } else if (key === 'l') {
          e.preventDefault();
          setIsLocked(true);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  useEffect(() => {
    void initVfs();
  }, [initVfs]);

  useEffect(() => {
    const onOnline = () => setIsBrowserOnline(true);
    const onOffline = () => setIsBrowserOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    setImgFailed(false);
  }, [wallpaper]);

  // Support Enter to open selected desktop shortcut & Escape to deselect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedIconId) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIconId.startsWith('store-')) {
          const storeId = selectedIconId.replace('store-', '');
          const sa = installedStoreApps.find((a) => a.id === storeId);
          if (sa) void openInstalledStoreApp(sa);
        } else if (selectedIconId.startsWith('web-')) {
          const webId = selectedIconId.replace('web-', '');
          const wa = pinnedWebApps.find((a) => a.id === webId);
          if (wa) openOsApp('browser', { initialUrl: wa.url });
        } else {
          openOsApp(selectedIconId as any);
        }
      } else if (e.key === 'Escape') {
        setSelectedIconId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIconId, installedStoreApps, pinnedWebApps]);

  // Open initial workspace windows once VFS is loaded
  useEffect(() => {
    if (!isVfsLoaded || bootOpenedRef.current) return;
    bootOpenedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    if (params.get('clean') === '1') return;

    if (useWindowStore.getState().windows.length === 0) {
      const filesId = openOsApp('files');
      const calcId = openOsApp('calculator');

      if (window.innerWidth >= 1280) {
        useWindowStore.getState().updateWindowBounds(filesId, {
          x: 204,
          y: 36,
          width: 700,
          height: 490,
        });
        useWindowStore.getState().updateWindowBounds(calcId, {
          x: 928,
          y: 56,
          width: 430,
          height: 570,
        });
      } else if (window.innerWidth >= 1024) {
        useWindowStore.getState().updateWindowBounds(filesId, {
          x: 132,
          y: 36,
          width: 680,
          height: 470,
        });
        useWindowStore.getState().updateWindowBounds(calcId, {
          x: 560,
          y: 72,
          width: 420,
          height: 550,
        });
      }
    }
  }, [isVfsLoaded]);

  const closeAllFlyouts = () => {
    setStartOpen(false);
    setSearchOpen(false);
    setQuickSettingsOpen(false);
    setActionCenterOpen(false);
    setDesktopMenu(null);
  };

  const topFocusedId = getTopFocusedWindowId(windows);
  const activeToasts = notifications.filter((n) => n.toastVisible).slice(0, 3);

  const resolvedWallpaperUrl =
    wallpaper.kind === 'preset'
      ? getPresetWallpaperUrl(wallpaper.id)
      : wallpaper.kind === 'custom'
        ? wallpaper.dataUrl
        : undefined;

  const solidBgColor = wallpaper.kind === 'solid' ? wallpaper.color : undefined;

  const handleCreateDesktopFolder = () => {
    const suffix = Date.now().toString().slice(-4);
    const name = `Folder-${suffix}`;
    const res = mkdir('/home/user', name);
    if (res.ok) {
      pushNotification('Folder Created', `Created /home/user/${name}`, 'files');
    }
  };

  const handleCreateDesktopFile = () => {
    const suffix = Date.now().toString().slice(-4);
    const name = `Note-${suffix}.txt`;
    const res = saveFile('/home/user', name, '');
    if (res.ok) {
      pushNotification('File Created', `Created /home/user/${name}`, 'files');
      openOsApp('editor', { filePath: `/home/user/${name}` });
    }
  };

  const handleRefreshDesktop = () => {
    setRefreshFlash(true);
    void initVfs();
    pushNotification('Desktop Refreshed', 'Synchronized IndexedDB file system.', 'system');
    setTimeout(() => setRefreshFlash(false), 180);
  };

  const handleRestart = () => {
    closeAllFlyouts();
    setTaskViewOpen(false);
    setIsSleeping(false);
    setIsLocked(false);
    setIsBooting(true);
  };

  const taskbarElement = (
    <Taskbar
      startOpen={startOpen}
      onToggleStart={() => {
        const next = !startOpen;
        closeAllFlyouts();
        setTaskViewOpen(false);
        setStartOpen(next);
      }}
      searchOpen={searchOpen}
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      onOpenSearch={() => {
        closeAllFlyouts();
        setTaskViewOpen(false);
        setSearchOpen(true);
      }}
      taskViewOpen={taskViewOpen}
      onToggleTaskView={() => {
        closeAllFlyouts();
        setTaskViewOpen((v) => !v);
      }}
      quickSettingsOpen={quickSettingsOpen}
      onToggleQuickSettings={() => {
        const next = !quickSettingsOpen;
        closeAllFlyouts();
        setTaskViewOpen(false);
        setQuickSettingsOpen(next);
      }}
      actionCenterOpen={actionCenterOpen}
      onToggleActionCenter={() => {
        const next = !actionCenterOpen;
        closeAllFlyouts();
        setTaskViewOpen(false);
        setActionCenterOpen(next);
      }}
      isBrowserOnline={isBrowserOnline}
    />
  );

  return (
    <div
      dir="ltr"
      onMouseDown={() => {
        if (startOpen || searchOpen || quickSettingsOpen || actionCenterOpen || desktopMenu) {
          closeAllFlyouts();
        }
      }}
      className={`flex flex-col w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 ${
        accessibilityHighContrast ? 'contrast-125 saturate-125' : ''
      }`}
    >
      {isBooting && <BootScreen onComplete={() => setIsBooting(false)} />}

      {isSleeping && <SleepOverlay onWake={() => setIsSleeping(false)} />}

      {!isBooting && !isSleeping && isLocked && (
        <LockScreen
          wallpaperUrl={resolvedWallpaperUrl}
          solidColor={solidBgColor}
          onUnlock={() => setIsLocked(false)}
        />
      )}

      {taskbarPosition === 'top' && taskbarElement}

      {/* Desktop Canvas */}
      <main
        onClick={() => setSelectedIconId(null)}
        onContextMenu={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('[data-window-id]')) return;
          e.preventDefault();
          closeAllFlyouts();
          setDesktopMenu({ x: e.clientX, y: e.clientY });
        }}
        style={solidBgColor ? { backgroundColor: solidBgColor } : undefined}
        className={`relative flex-1 min-h-0 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 transition-opacity duration-150 ${
          refreshFlash ? 'opacity-85' : 'opacity-100'
        }`}
      >
        {/* Wallpaper Layer */}
        {resolvedWallpaperUrl && !imgFailed && (
          <img
            src={resolvedWallpaperUrl}
            alt="NizamOS Desktop Wallpaper"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            style={{ filter: `brightness(${brightness}%)` }}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none transition-[filter] duration-150"
          />
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-slate-950/15 pointer-events-none"
        />

        {/* Night Light Overlay */}
        {nightLight && (
          <div
            aria-hidden="true"
            className="absolute inset-0 z-[9996] bg-amber-500/12 pointer-events-none mix-blend-screen"
          />
        )}

        {/* Windows Crisp Borderless Desktop Shortcuts (Double-Click To Open, Single-Click Selects) */}
        {showDesktopIcons && (
          <nav
            aria-label="Desktop Shortcuts"
            className="relative z-10 inline-flex flex-col flex-wrap max-h-full content-start gap-1.5 p-3"
          >
            {APP_CATALOG.map((app) => (
              <DesktopShortcutButton
                key={app.id}
                app={app}
                language={language}
                isSelected={selectedIconId === app.id}
                onSelect={() => setSelectedIconId(app.id)}
                onOpen={() => openOsApp(app.id)}
              />
            ))}

            {installedStoreApps.map((sa) => (
              <DesktopStoreShortcutButton
                key={sa.id}
                app={sa}
                language={language}
                isSelected={selectedIconId === `store-${sa.id}`}
                onSelect={() => setSelectedIconId(`store-${sa.id}`)}
                onOpen={() => void openInstalledStoreApp(sa)}
              />
            ))}

            {pinnedWebApps.slice(0, 3).map((wa) => {
              const isSelected = selectedIconId === `web-${wa.id}`;
              return (
                <button
                  key={wa.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedIconId(`web-${wa.id}`);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    openOsApp('browser', { initialUrl: wa.url });
                  }}
                  aria-label={`Open Web App ${wa.name}`}
                  data-selected={isSelected ? 'true' : 'false'}
                  className={`group flex flex-col items-center justify-center w-22 py-1.5 px-1.5 rounded-sm transition-colors cursor-pointer select-none focus-visible:outline-none ${
                    isSelected
                      ? 'bg-sky-500/25 border border-sky-400/60 ring-1 ring-sky-400/40 text-white shadow-sm'
                      : 'hover:bg-white/12 border border-transparent hover:border-white/20 text-slate-100'
                  }`}
                >
                  <div className="w-8 h-8 flex items-center justify-center mb-1">
                    <Globe className="w-6 h-6 text-emerald-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] group-hover:scale-105 transition-transform" />
                  </div>
                  <span className="text-[11px] font-medium text-white text-center leading-tight line-clamp-2 drop-shadow-[0_1px_3px_rgba(0,0,0,0.98)]">
                    {wa.name}
                  </span>
                </button>
              );
            })}
          </nav>
        )}

        {/* Window Manager Layer (LTR preserved for react-rnd coordinates) */}
        <div
          dir="ltr"
          data-testid="window-layer"
          className="absolute inset-0 z-20 pointer-events-none"
        >
          {windows.map((win) => (
            <WindowFrame key={win.id} win={win} isFocused={win.id === topFocusedId} />
          ))}
        </div>

        {/* Floating Toasts */}
        {activeToasts.length > 0 && !actionCenterOpen && !quickSettingsOpen && (
          <div
            aria-live="polite"
            dir={language === 'ar' ? 'rtl' : 'ltr'}
            className={`fixed ${
              taskbarPosition === 'top' ? 'top-14 right-3' : 'bottom-14 right-3'
            } z-[9985] flex flex-col gap-2 w-72 pointer-events-none`}
          >
            {activeToasts.map((toast) => (
              <div
                key={toast.id}
                className="pointer-events-auto flex items-start justify-between gap-2 p-3 rounded-lg os-acrylic os-flyout-enter border border-slate-700/80"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-100 truncate">
                    {toast.title}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 break-words">
                    {toast.message}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  aria-label={`Close notification ${toast.title}`}
                  className="p-1 rounded-sm text-slate-400 hover:text-white shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Flyouts & Overlays */}
        {startOpen && (
          <StartMenu
            onClose={() => setStartOpen(false)}
            onLock={() => setIsLocked(true)}
            onSleep={() => setIsSleeping(true)}
            onRestart={handleRestart}
          />
        )}

        {searchOpen && (
          <SearchFlyout
            query={searchQuery}
            onQueryChange={setSearchQuery}
            onClose={() => setSearchOpen(false)}
            onLock={() => setIsLocked(true)}
            onSleep={() => setIsSleeping(true)}
            onRestart={handleRestart}
          />
        )}

        {quickSettingsOpen && (
          <QuickSettingsFlyout
            isBrowserOnline={isBrowserOnline}
            onClose={() => setQuickSettingsOpen(false)}
          />
        )}

        {actionCenterOpen && (
          <ActionCenter
            onClose={() => setActionCenterOpen(false)}
            onOpenQuickSettings={() => {
              setActionCenterOpen(false);
              setQuickSettingsOpen(true);
            }}
          />
        )}

        {taskViewOpen && <TaskViewOverlay onClose={() => setTaskViewOpen(false)} />}

        {/* Desktop Right-Click Context Menu */}
        {desktopMenu && (
          <ContextMenu
            x={desktopMenu.x}
            y={desktopMenu.y}
            onClose={() => setDesktopMenu(null)}
            items={[
              {
                id: 'new-folder',
                label: t(language, 'newFolder'),
                icon: FolderPlus,
                onSelect: handleCreateDesktopFolder,
              },
              {
                id: 'new-file',
                label: t(language, 'newFile'),
                icon: FilePlus2,
                onSelect: handleCreateDesktopFile,
              },
              {
                id: 'open-terminal',
                label: t(language, 'openTerminalHere'),
                icon: Terminal,
                dividerBefore: true,
                onSelect: () => openOsApp('terminal', { storageMode: 'host' }),
              },
              {
                id: 'task-manager',
                label: t(language, 'taskManager'),
                icon: Activity,
                onSelect: () => openOsApp('taskmgr'),
              },
              {
                id: 'personalize',
                label: t(language, 'personalize'),
                icon: Palette,
                dividerBefore: true,
                onSelect: () => openOsApp('settings', { initialTab: 'personalization' }),
              },
              {
                id: 'refresh',
                label: t(language, 'refresh'),
                icon: RefreshCw,
                onSelect: handleRefreshDesktop,
              },
            ]}
          />
        )}
      </main>

      {taskbarPosition === 'bottom' && taskbarElement}
    </div>
  );
}
