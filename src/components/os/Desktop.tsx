import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownUp,
  ClipboardPaste,
  Copy,
  Cpu,
  FilePlus2,
  FileText,
  FolderOpen,
  FolderPlus,
  Image as ImageIcon,
  Info,
  Lock,
  Pin,
  RefreshCw,
  RotateCcw,
  Scissors,
  Terminal,
  Trash2,
  X,
} from 'lucide-react';
import { APP_ICONS, openBrowserOrChromeStore, openOsApp } from '../../apps/registry';
import { useWindowStore } from '../../windowManager/useWindowStore';
import type { AppId, WindowAppProps, WindowInstance } from '../../windowManager/types';
import {
  isLiteModeEffective,
  useSettingsStore,
} from '../../system/settingsStore';
import { useNotificationStore } from '../../system/notificationStore';
import { useDesktopStore, type VirtualDesktopShortcut } from '../../system/desktopStore';
import {
  buildUniqueCopyName,
  cellKey,
  cellToPixels,
  getDefaultSlotForIndex,
  snapToDesktopGrid,
  type GridCell,
} from '../../system/desktopLogic';
import { getPresetWallpaperUrl } from '../../system/wallpapers';
import {
  deleteHostItem,
  fetchHostRoots,
  fetchRealSystemSpecs,
  listDirectory,
  mkdirHost,
  readHostFile,
  renameHostItem,
  writeHostFile,
  type HostFsEntry,
  type PowerActionType,
} from '../../services/systemBridge';
import { BootScreen } from '../BootScreen';
import { LockScreen } from '../LockScreen';
import { SleepOverlay } from '../SleepOverlay';
import { TopTelemetryBar } from './TopTelemetryBar';
import { LeftHexDock } from './LeftHexDock';
import { KemetPortal } from './KemetPortal';
import { WindowFrame } from './WindowFrame';
import { AppVectorIcon } from './AppVectorIcons';
import { ContextMenu, type ContextMenuItem } from './ContextMenu';

type ActiveContextMenu = {
  x: number;
  y: number;
  items: ContextMenuItem[];
};

type DesktopDialogState =
  | { kind: 'mkdir'; value: string; targetCell?: GridCell }
  | { kind: 'mkfile'; value: string; targetCell?: GridCell }
  | { kind: 'rename'; target: HostFsEntry; value: string }
  | { kind: 'rename-virtual'; target: VirtualDesktopShortcut; value: string }
  | { kind: 'properties'; title: string; rows: Array<{ label: string; value: string }> }
  | null;

type DesktopRenderItem =
  | {
      itemId: string;
      kind: 'core';
      shortcut: {
        id: string;
        appId: AppId;
        vectorId: string;
        initialDir?: string;
        labelAr: string;
        labelEn: string;
        description: string;
      };
    }
  | {
      itemId: string;
      kind: 'virtual';
      shortcut: VirtualDesktopShortcut;
    }
  | {
      itemId: string;
      kind: 'host';
      entry: HostFsEntry;
    };

interface DragState {
  itemId: string;
  startClientX: number;
  startClientY: number;
  originPixelX: number;
  originPixelY: number;
  currentPixelX: number;
  currentPixelY: number;
  active: boolean;
}

export function Desktop() {
  const language = useSettingsStore((s) => s.language);
  const wallpaper = useSettingsStore((s) => s.wallpaper);
  const brightness = useSettingsStore((s) => s.brightness);
  const nightLight = useSettingsStore((s) => s.nightLight);
  const showDesktopIcons = useSettingsStore((s) => s.showDesktopIcons);
  const performanceProfile = useSettingsStore((s) => s.performanceProfile);
  const liteDetected = useSettingsStore((s) => s.liteModeDetected);
  const setLiteModeDetected = useSettingsStore((s) => s.setLiteModeDetected);
  const moveToRecycleBin = useSettingsStore((s) => s.moveToRecycleBin);
  const pushNotification = useNotificationStore((s) => s.pushNotification);

  const iconPositions = useDesktopStore((s) => s.iconPositions);
  const hiddenCoreIds = useDesktopStore((s) => s.hiddenCoreIds);
  const virtualShortcuts = useDesktopStore((s) => s.virtualShortcuts);
  const clipboard = useDesktopStore((s) => s.clipboard);
  const setIconPosition = useDesktopStore((s) => s.setIconPosition);
  const clearIconPositions = useDesktopStore((s) => s.clearIconPositions);
  const hideCoreShortcut = useDesktopStore((s) => s.hideCoreShortcut);
  const restoreAllCoreShortcuts = useDesktopStore((s) => s.restoreAllCoreShortcuts);
  const addVirtualShortcut = useDesktopStore((s) => s.addVirtualShortcut);
  const renameVirtualShortcut = useDesktopStore((s) => s.renameVirtualShortcut);
  const removeVirtualShortcut = useDesktopStore((s) => s.removeVirtualShortcut);
  const setClipboard = useDesktopStore((s) => s.setClipboard);

  const windows = useWindowStore((s) => s.windows);
  const focusWindow = useWindowStore((s) => s.focusWindow);
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const minimizeAll = useWindowStore((s) => s.minimizeAll);
  const toggleTaskbarWindow = useWindowStore((s) => s.toggleTaskbarWindow);

  const visibleWindows = windows.filter((w) => !w.isMinimized && !w.isClosing);
  const hasMaximizedWindow = visibleWindows.some((w) => w.isMaximized);
  const activeWindowId =
    visibleWindows.length > 0
      ? visibleWindows.reduce((top, cur) => (cur.zIndex > top.zIndex ? cur : top), visibleWindows[0]).id
      : null;

  const isAr = language === 'ar';
  const liteActive = isLiteModeEffective(performanceProfile, liteDetected);

  const urlParams =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const autostart = urlParams?.get('autostart') === '1';

  const [booting, setBooting] = useState(!autostart);
  const [locked, setLocked] = useState(!autostart);
  const [sleeping, setSleeping] = useState(false);
  const [portalOpen, setPortalOpen] = useState(false);
  const [selectedIconId, setSelectedIconId] = useState<string | null>(null);
  const [desktopDir, setDesktopDir] = useState<string>('');
  const [desktopEntries, setDesktopEntries] = useState<HostFsEntry[]>([]);
  const [pinnedApps, setPinnedApps] = useState<AppId[]>(['files', 'store', 'browser', 'terminal', 'settings']);
  const [contextMenu, setContextMenu] = useState<ActiveContextMenu | null>(null);
  const [dialog, setDialog] = useState<DesktopDialogState>(null);
  const [isRefreshingDesktop, setIsRefreshingDesktop] = useState(false);
  const [viewport, setViewport] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1440,
    h: typeof window !== 'undefined' ? window.innerHeight : 900,
  }));
  const [dragState, setDragState] = useState<DragState | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const justDraggedRef = useRef(false);
  const lastShortcutLaunchRef = useRef<{ id: string; at: number } | null>(null);

  useEffect(() => {
    const onResize = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const launchDesktopTarget = useCallback((id: string, launcher: () => void) => {
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      return;
    }
    const now = Date.now();
    const prev = lastShortcutLaunchRef.current;
    if (prev && prev.id === id && now - prev.at < 450) {
      return;
    }
    lastShortcutLaunchRef.current = { id, at: now };
    launcher();
  }, []);

  const loadDesktopData = useCallback(async () => {
    try {
      const [hw, roots] = await Promise.all([
        fetchRealSystemSpecs(),
        fetchHostRoots().catch(() => null),
      ]);
      setLiteModeDetected(hw.ramTotalGb > 0 && hw.ramTotalGb <= 4.5);
      if (roots?.desktopDir) {
        setDesktopDir(roots.desktopDir);
        const dirData = await listDirectory(roots.desktopDir).catch(() => null);
        if (dirData) {
          setDesktopEntries(
            dirData.items
              .filter((item) => !item.name.startsWith('.'))
              .slice(0, 24)
          );
        }
      }
    } catch {
      // ignore initial probe errors
    }
  }, [setLiteModeDetected]);

  const refreshDesktop = useCallback(async () => {
    setIsRefreshingDesktop(true);
    setContextMenu(null);
    await loadDesktopData();
    window.setTimeout(() => {
      setIsRefreshingDesktop(false);
    }, 140);
  }, [loadDesktopData]);

  useEffect(() => {
    void loadDesktopData();
    const onExternalRefresh = () => {
      void loadDesktopData();
    };
    window.addEventListener('kemetos-desktop-refresh', onExternalRefresh);
    return () => window.removeEventListener('kemetos-desktop-refresh', onExternalRefresh);
  }, [loadDesktopData]);

  const handleOpenApp = useCallback(
    (appId: AppId, props?: Omit<WindowAppProps, 'windowId'>) => {
      openOsApp(appId, props);
    },
    []
  );

  const handleSelectWindow = useCallback(
    (win: WindowInstance) => {
      if (win.isMinimized) {
        toggleTaskbarWindow(win.id);
      } else {
        focusWindow(win.id);
      }
    },
    [focusWindow, toggleTaskbarWindow]
  );

  const handlePowerUiAction = useCallback((action: PowerActionType) => {
    if (action === 'lock' || action === 'logout') {
      setLocked(true);
    } else if (action === 'sleep') {
      setSleeping(true);
    } else if (action === 'reboot' || action === 'poweroff') {
      setBooting(true);
    }
  }, []);

  const wallpaperUrl =
    wallpaper.kind === 'preset'
      ? getPresetWallpaperUrl(wallpaper.id)
      : wallpaper.kind === 'custom'
      ? wallpaper.dataUrl
      : undefined;
  const solidColor = wallpaper.kind === 'solid' ? wallpaper.color : undefined;

  // Clean core desktop shortcuts matching top-left column layout
  const coreShortcuts: Array<{
    id: string;
    appId: AppId;
    vectorId: string;
    initialDir?: string;
    labelAr: string;
    labelEn: string;
    description: string;
  }> = [
    {
      id: 'trash-bin',
      appId: 'recycle',
      vectorId: 'trash',
      labelAr: 'سلة المحذوفات',
      labelEn: 'Trash',
      description: isAr ? 'الملفات المحذوفة مؤقتاً' : 'Deleted Items Bin',
    },
    {
      id: 'this-computer',
      appId: 'files',
      vectorId: 'mypc',
      initialDir: '__computer__',
      labelAr: 'هذا الكمبيوتر',
      labelEn: 'My PC',
      description: isAr ? 'الأقراص والأجهزة المتصلة بالنظام' : 'System Disks & Drives',
    },
    {
      id: 'home-files',
      appId: 'files',
      vectorId: 'home-folder',
      labelAr: 'الملفات',
      labelEn: 'Home',
      description: isAr ? 'مجلد المستخدم الشخصي /home/kemet' : 'User Home Directory /home/kemet',
    },
    {
      id: 'kemet-browser',
      appId: 'browser',
      vectorId: 'chrome',
      labelAr: 'Google Chrome',
      labelEn: 'Google Chrome',
      description: isAr ? 'تشغيل Google Chrome أو تثبيته من المتجر' : 'Launch or Install Google Chrome',
    },
    {
      id: 'kemet-store',
      appId: 'store',
      vectorId: 'store',
      labelAr: 'متجر كيميت',
      labelEn: 'Kemet Store',
      description: isAr ? 'مركز تثبيت البرامج والحزم الأصلية' : 'Native Application & Package Store',
    },
  ];

  const desktopItems = useMemo<DesktopRenderItem[]>(() => {
    const visibleCore: DesktopRenderItem[] = coreShortcuts
      .filter((s) => !hiddenCoreIds.includes(s.id))
      .map((shortcut) => ({ itemId: shortcut.id, kind: 'core', shortcut }));

    const virtualList: DesktopRenderItem[] = virtualShortcuts.map((shortcut) => ({
      itemId: shortcut.id,
      kind: 'virtual',
      shortcut,
    }));

    const hostList: DesktopRenderItem[] = desktopEntries.map((entry) => ({
      itemId: entry.path,
      kind: 'host',
      entry,
    }));

    return [...visibleCore, ...virtualList, ...hostList];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hiddenCoreIds, virtualShortcuts, desktopEntries, isAr]);

  const resolvedItemCells = useMemo(() => {
    const map: Record<string, GridCell> = {};
    const occupied = new Set<string>();

    // First assign items that already have saved non-colliding grid coordinates
    for (const item of desktopItems) {
      const saved = iconPositions[item.itemId];
      if (saved && !occupied.has(cellKey(saved))) {
        map[item.itemId] = saved;
        occupied.add(cellKey(saved));
      }
    }

    // Assign clean default grid cells for any remaining items
    let fallbackIndex = 0;
    for (const item of desktopItems) {
      if (map[item.itemId]) continue;
      let candidate = getDefaultSlotForIndex(fallbackIndex, viewport.h);
      while (occupied.has(cellKey(candidate))) {
        fallbackIndex += 1;
        candidate = getDefaultSlotForIndex(fallbackIndex, viewport.h);
      }
      map[item.itemId] = candidate;
      occupied.add(cellKey(candidate));
      fallbackIndex += 1;
    }

    return map;
  }, [desktopItems, iconPositions, viewport.h]);

  const resolvedCellsRef = useRef(resolvedItemCells);
  resolvedCellsRef.current = resolvedItemCells;

  const findNearestFreeCell = useCallback(
    (clientX?: number, clientY?: number, excludeItemId?: string): GridCell => {
      const occupied = new Set<string>();
      for (const [id, cell] of Object.entries(resolvedCellsRef.current)) {
        if (id !== excludeItemId) {
          occupied.add(cellKey(cell));
        }
      }
      const px = typeof clientX === 'number' ? clientX - 42 : 16;
      const py = typeof clientY === 'number' ? clientY - 40 : 50;
      return snapToDesktopGrid(px, py, viewport.w, viewport.h, occupied);
    },
    [viewport.w, viewport.h]
  );

  const openDesktopItem = useCallback(
    (item: DesktopRenderItem) => {
      if (item.kind === 'core' || item.kind === 'virtual') {
        if (item.shortcut.appId === 'browser') {
          void openBrowserOrChromeStore();
          return;
        }
        handleOpenApp(
          item.shortcut.appId,
          item.shortcut.initialDir ? { initialDir: item.shortcut.initialDir } : undefined
        );
      } else if (item.entry.type === 'folder') {
        handleOpenApp('files', { initialDir: item.entry.path });
      } else {
        handleOpenApp('editor', { filePath: item.entry.path, storageMode: 'host' });
      }
    },
    [handleOpenApp]
  );

  const copyDesktopItem = useCallback(
    (item: DesktopRenderItem, mode: 'copy' | 'cut') => {
      if (item.kind === 'host') {
        setClipboard({
          kind: 'host-entry',
          mode,
          entry: item.entry,
          parentPath: desktopDir,
        });
        pushNotification(
          item.entry.name,
          mode === 'cut'
            ? isAr
              ? 'تم قص العنصر إلى الحافظة.'
              : 'Cut to clipboard.'
            : isAr
            ? 'تم نسخ العنصر إلى الحافظة.'
            : 'Copied to clipboard.',
          'system'
        );
        return;
      }

      const label = isAr ? item.shortcut.labelAr : item.shortcut.labelEn;
      setClipboard({
        kind: 'desktop-shortcut',
        mode,
        shortcut: { ...item.shortcut },
      });
      pushNotification(
        label,
        mode === 'cut'
          ? isAr
            ? 'تم قص الاختصار (اختر لصق لنقله).'
            : 'Shortcut cut (paste to move).'
          : isAr
          ? 'تم نسخ الاختصار إلى الحافظة.'
          : 'Shortcut copied to clipboard.',
        'system'
      );
    },
    [desktopDir, isAr, pushNotification, setClipboard]
  );

  const deleteDesktopItem = useCallback(
    async (item: DesktopRenderItem) => {
      if (item.kind === 'core') {
        if (item.shortcut.id === 'trash-bin') {
          pushNotification(
            isAr ? 'سلة المحذوفات' : 'Trash',
            isAr ? 'لا يمكن إزالة سلة المحذوفات الرئيسية.' : 'Main Trash bin cannot be removed.',
            'system'
          );
          return;
        }
        hideCoreShortcut(item.shortcut.id);
        moveToRecycleBin({
          name: isAr ? item.shortcut.labelAr : item.shortcut.labelEn,
          originalParentPath: desktopDir || '/home/kemet/Desktop',
          originalPath: `desktop://${item.shortcut.id}`,
          type: 'file',
          content: item.shortcut.description,
          source: 'desktop-shortcut',
          shortcutId: item.shortcut.id,
          appId: item.shortcut.appId,
          vectorId: item.shortcut.vectorId,
          initialDir: item.shortcut.initialDir,
          labelAr: item.shortcut.labelAr,
          labelEn: item.shortcut.labelEn,
        });
        setSelectedIconId(null);
        pushNotification(
          isAr ? item.shortcut.labelAr : item.shortcut.labelEn,
          isAr ? 'تمت الإزالة إلى سلة المحذوفات.' : 'Moved shortcut to Trash.',
          'system'
        );
        return;
      }

      if (item.kind === 'virtual') {
        removeVirtualShortcut(item.shortcut.id);
        moveToRecycleBin({
          name: isAr ? item.shortcut.labelAr : item.shortcut.labelEn,
          originalParentPath: desktopDir || '/home/kemet/Desktop',
          originalPath: `desktop://${item.shortcut.id}`,
          type: 'file',
          content: item.shortcut.description,
          source: 'desktop-virtual',
          shortcutId: item.shortcut.id,
          appId: item.shortcut.appId,
          vectorId: item.shortcut.vectorId,
          initialDir: item.shortcut.initialDir,
          labelAr: item.shortcut.labelAr,
          labelEn: item.shortcut.labelEn,
        });
        setSelectedIconId(null);
        pushNotification(
          isAr ? item.shortcut.labelAr : item.shortcut.labelEn,
          isAr ? 'تم حذف الاختصار إلى سلة المحذوفات.' : 'Moved shortcut to Trash.',
          'system'
        );
        return;
      }

      try {
        let content = '';
        if (item.entry.type === 'file') {
          const fileData = await readHostFile(item.entry.path).catch(() => null);
          content = fileData?.content ?? '';
        }
        await deleteHostItem(item.entry.path);
        moveToRecycleBin({
          name: item.entry.name,
          originalParentPath: desktopDir,
          originalPath: item.entry.path,
          type: item.entry.type === 'folder' ? 'folder' : 'file',
          content,
          source: 'host',
        });
        setSelectedIconId(null);
        await loadDesktopData();
        pushNotification(
          item.entry.name,
          isAr ? 'تم الحذف إلى سلة المحذوفات.' : 'Moved to Trash.',
          'system'
        );
      } catch (err) {
        pushNotification(
          item.entry.name,
          err instanceof Error ? err.message : 'Delete failed',
          'system'
        );
      }
    },
    [desktopDir, hideCoreShortcut, isAr, loadDesktopData, moveToRecycleBin, pushNotification, removeVirtualShortcut]
  );

  const handlePasteToDesktop = useCallback(
    async (clientX?: number, clientY?: number) => {
      if (!clipboard) return;
      const targetCell = findNearestFreeCell(clientX, clientY);

      if (clipboard.kind === 'desktop-shortcut') {
        const src = clipboard.shortcut;
        if (clipboard.mode === 'cut') {
          setIconPosition(src.id, findNearestFreeCell(clientX, clientY, src.id));
          setClipboard(null);
          setSelectedIconId(src.id);
          return;
        }

        const existingLabels = desktopItems.map((d) =>
          d.kind === 'host' ? d.entry.name : isAr ? d.shortcut.labelAr : d.shortcut.labelEn
        );
        const baseLabel = isAr ? src.labelAr : src.labelEn;
        const copyLabel = buildUniqueCopyName(baseLabel, existingLabels, isAr);
        const newId = `virt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;

        addVirtualShortcut({
          id: newId,
          appId: src.appId,
          vectorId: src.vectorId,
          initialDir: src.initialDir,
          labelAr: copyLabel,
          labelEn: copyLabel,
          description: src.description,
        });
        setIconPosition(newId, targetCell);
        setSelectedIconId(newId);
        pushNotification(copyLabel, isAr ? 'تم لصق النسخة على سطح المكتب.' : 'Pasted shortcut on Desktop.', 'system');
        return;
      }

      if (!desktopDir) return;
      const src = clipboard.entry;
      const existingNames = desktopEntries.map((e) => e.name);
      const destName =
        clipboard.mode === 'cut' && !existingNames.includes(src.name)
          ? src.name
          : buildUniqueCopyName(src.name, existingNames, isAr);
      const destPath = `${desktopDir}/${destName}`;

      try {
        if (src.type === 'folder') {
          await mkdirHost(destPath);
          if (clipboard.mode === 'cut' && src.path !== destPath) {
            await deleteHostItem(src.path).catch(() => undefined);
            setClipboard(null);
          }
        } else {
          const data = await readHostFile(src.path);
          await writeHostFile(destPath, data.content);
          if (clipboard.mode === 'cut' && src.path !== destPath) {
            await deleteHostItem(src.path);
            setClipboard(null);
          }
        }
        setIconPosition(destPath, targetCell);
        await loadDesktopData();
        setSelectedIconId(destPath);
        pushNotification(
          destName,
          clipboard.mode === 'cut'
            ? isAr
              ? 'تم نقل العنصر إلى سطح المكتب.'
              : 'Moved item to Desktop.'
            : isAr
            ? 'تم لصق العنصر على سطح المكتب.'
            : 'Pasted item on Desktop.',
          'system'
        );
      } catch (err) {
        pushNotification(src.name, err instanceof Error ? err.message : 'Paste failed', 'system');
      }
    },
    [
      addVirtualShortcut,
      clipboard,
      desktopDir,
      desktopEntries,
      desktopItems,
      findNearestFreeCell,
      isAr,
      loadDesktopData,
      pushNotification,
      setClipboard,
      setIconPosition,
    ]
  );

  // Global keyboard shortcuts (Alt+Space, Ctrl+L, F5 Refresh, Ctrl+C/X/V, Delete, F2)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey && e.code === 'Space') || (e.key === 'Meta' && !e.shiftKey)) {
        e.preventDefault();
        setPortalOpen((prev) => !prev);
        return;
      }
      if (e.key === 'Escape') {
        setPortalOpen(false);
        setContextMenu(null);
        setDialog(null);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setLocked(true);
        return;
      }

      const target = e.target as HTMLElement | null;
      const isEditingText =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);
      if (isEditingText || dialog || locked || booting) return;

      const selectedItem = selectedIconId
        ? desktopItems.find((i) => i.itemId === selectedIconId) ?? null
        : null;

      if (e.key === 'F5' && visibleWindows.length === 0) {
        e.preventDefault();
        void refreshDesktop();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && selectedItem) {
        e.preventDefault();
        copyDesktopItem(selectedItem, 'copy');
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x' && selectedItem) {
        e.preventDefault();
        copyDesktopItem(selectedItem, 'cut');
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v' && clipboard && visibleWindows.length === 0) {
        e.preventDefault();
        void handlePasteToDesktop();
      } else if (e.key === 'Delete' && selectedItem) {
        e.preventDefault();
        void deleteDesktopItem(selectedItem);
      } else if (e.key === 'F2' && selectedItem) {
        if (selectedItem.kind === 'host') {
          e.preventDefault();
          setDialog({ kind: 'rename', target: selectedItem.entry, value: selectedItem.entry.name });
        } else if (selectedItem.kind === 'virtual') {
          e.preventDefault();
          setDialog({
            kind: 'rename-virtual',
            target: selectedItem.shortcut,
            value: isAr ? selectedItem.shortcut.labelAr : selectedItem.shortcut.labelEn,
          });
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    booting,
    clipboard,
    copyDesktopItem,
    deleteDesktopItem,
    desktopItems,
    dialog,
    handlePasteToDesktop,
    isAr,
    locked,
    refreshDesktop,
    selectedIconId,
    visibleWindows.length,
  ]);

  const handleStartIconDrag = (
    e: React.PointerEvent,
    itemId: string,
    originPixelX: number,
    originPixelY: number
  ) => {
    if (e.button !== 0) return;
    const initial: DragState = {
      itemId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      originPixelX,
      originPixelY,
      currentPixelX: originPixelX,
      currentPixelY: originPixelY,
      active: false,
    };
    dragStateRef.current = initial;

    const onMove = (ev: PointerEvent) => {
      const cur = dragStateRef.current;
      if (!cur) return;
      const dx = ev.clientX - cur.startClientX;
      const dy = ev.clientY - cur.startClientY;
      const movedEnough = cur.active || Math.hypot(dx, dy) >= 6;
      if (!movedEnough) return;
      const next: DragState = {
        ...cur,
        active: true,
        currentPixelX: cur.originPixelX + dx,
        currentPixelY: cur.originPixelY + dy,
      };
      dragStateRef.current = next;
      setDragState(next);
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      const cur = dragStateRef.current;
      dragStateRef.current = null;
      setDragState(null);
      if (cur?.active) {
        justDraggedRef.current = true;
        window.setTimeout(() => {
          justDraggedRef.current = false;
        }, 200);
        const occupied = new Set<string>();
        for (const [id, cell] of Object.entries(resolvedCellsRef.current)) {
          if (id !== cur.itemId) occupied.add(cellKey(cell));
        }
        const snapped = snapToDesktopGrid(
          cur.currentPixelX,
          cur.currentPixelY,
          viewport.w,
          viewport.h,
          occupied
        );
        setIconPosition(cur.itemId, snapped);
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const openWallpaperContextMenu = (x: number, y: number) => {
    const pasteTargetLabel = clipboard
      ? clipboard.kind === 'host-entry'
        ? clipboard.entry.name
        : isAr
        ? clipboard.shortcut.labelAr
        : clipboard.shortcut.labelEn
      : null;

    const items: ContextMenuItem[] = [
      {
        id: 'refresh',
        label: isAr ? 'تحديث (F5)' : 'Refresh (F5)',
        icon: <RefreshCw className="w-3.5 h-3.5 text-cyan-300" />,
        onSelect: () => void refreshDesktop(),
      },
      {
        id: 'paste',
        label: pasteTargetLabel
          ? isAr
            ? `لصق (${pasteTargetLabel})`
            : `Paste (${pasteTargetLabel})`
          : isAr
          ? 'لصق'
          : 'Paste',
        icon: <ClipboardPaste className="w-3.5 h-3.5 text-emerald-300" />,
        disabled: !clipboard,
        onSelect: () => void handlePasteToDesktop(x, y),
      },
      {
        id: 'new-folder',
        label: isAr ? 'مجلد جديد' : 'New Folder',
        icon: <FolderPlus className="w-3.5 h-3.5 text-amber-300" />,
        dividerBefore: true,
        onSelect: () =>
          setDialog({
            kind: 'mkdir',
            value: isAr ? 'مجلد جديد' : 'New Folder',
            targetCell: findNearestFreeCell(x, y),
          }),
      },
      {
        id: 'new-file',
        label: isAr ? 'ملف نصي جديد' : 'New Text File',
        icon: <FilePlus2 className="w-3.5 h-3.5 text-teal-300" />,
        onSelect: () =>
          setDialog({
            kind: 'mkfile',
            value: isAr ? 'ملاحظة جديدة.txt' : 'New Note.txt',
            targetCell: findNearestFreeCell(x, y),
          }),
      },
      {
        id: 'sort-icons',
        label: isAr ? 'ترتيب الأيقونات' : 'Auto-Arrange Icons',
        icon: <ArrowDownUp className="w-3.5 h-3.5 text-slate-300" />,
        dividerBefore: true,
        onSelect: () => {
          clearIconPositions();
          setDesktopEntries((prev) =>
            [...prev].sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name))
          );
          pushNotification(
            'KemetOS',
            isAr ? 'تم ترتيب أيقونات سطح المكتب.' : 'Desktop icons arranged.',
            'system'
          );
        },
      },
    ];

    if (hiddenCoreIds.length > 0) {
      items.push({
        id: 'restore-core',
        label: isAr
          ? `استعادة الأيقونات المحذوفة (${hiddenCoreIds.length})`
          : `Restore Removed Icons (${hiddenCoreIds.length})`,
        icon: <RotateCcw className="w-3.5 h-3.5 text-amber-300" />,
        onSelect: () => {
          restoreAllCoreShortcuts();
          pushNotification(
            'KemetOS',
            isAr ? 'تمت استعادة أيقونات سطح المكتب.' : 'Desktop shortcuts restored.',
            'system'
          );
        },
      });
    }

    items.push(
      {
        id: 'open-terminal',
        label: isAr ? 'فتح التيرمينال هنا' : 'Open Terminal Here',
        icon: <Terminal className="w-3.5 h-3.5 text-cyan-300" />,
        dividerBefore: true,
        onSelect: () => handleOpenApp('terminal'),
      },
      {
        id: 'change-wallpaper',
        label: isAr ? 'تغيير الخلفية' : 'Change Wallpaper',
        icon: <ImageIcon className="w-3.5 h-3.5 text-emerald-300" />,
        onSelect: () => handleOpenApp('settings', { initialTab: 'appearance' }),
      },
      {
        id: 'system-props',
        label: isAr ? 'خصائص النظام' : 'System Properties',
        icon: <Cpu className="w-3.5 h-3.5 text-amber-300" />,
        onSelect: () => handleOpenApp('hardware'),
      },
      {
        id: 'lock-session',
        label: isAr ? 'قفل الجلسة' : 'Lock Session',
        icon: <Lock className="w-3.5 h-3.5" />,
        danger: true,
        dividerBefore: true,
        onSelect: () => setLocked(true),
      }
    );

    setContextMenu({ x, y, items });
  };

  const openShortcutContextMenu = (
    x: number,
    y: number,
    item: Extract<DesktopRenderItem, { kind: 'core' | 'virtual' }>
  ) => {
    setSelectedIconId(item.itemId);
    const label = isAr ? item.shortcut.labelAr : item.shortcut.labelEn;
    const menuItems: ContextMenuItem[] = [
      {
        id: 'open',
        label: isAr ? 'فتح' : 'Open',
        icon: <FolderOpen className="w-3.5 h-3.5 text-amber-300" />,
        onSelect: () => openDesktopItem(item),
      },
      {
        id: 'cut',
        label: isAr ? 'قص' : 'Cut',
        icon: <Scissors className="w-3.5 h-3.5 text-amber-300" />,
        dividerBefore: true,
        onSelect: () => copyDesktopItem(item, 'cut'),
      },
      {
        id: 'copy',
        label: isAr ? 'نسخ' : 'Copy',
        icon: <Copy className="w-3.5 h-3.5 text-cyan-300" />,
        onSelect: () => copyDesktopItem(item, 'copy'),
      },
    ];

    if (item.kind === 'virtual') {
      menuItems.push({
        id: 'rename',
        label: isAr ? 'إعادة تسمية' : 'Rename',
        icon: <FileText className="w-3.5 h-3.5 text-cyan-300" />,
        onSelect: () =>
          setDialog({
            kind: 'rename-virtual',
            target: item.shortcut,
            value: label,
          }),
      });
    }

    if (item.shortcut.id !== 'trash-bin') {
      menuItems.push({
        id: 'delete',
        label: isAr ? 'إزالة إلى سلة المحذوفات' : 'Remove to Trash',
        icon: <Trash2 className="w-3.5 h-3.5" />,
        danger: true,
        dividerBefore: true,
        onSelect: () => void deleteDesktopItem(item),
      });
    }

    menuItems.push({
      id: 'properties',
      label: isAr ? 'الخصائص' : 'Properties',
      icon: <Info className="w-3.5 h-3.5 text-cyan-300" />,
      dividerBefore: true,
      onSelect: () =>
        setDialog({
          kind: 'properties',
          title: label,
          rows: [
            {
              label: isAr ? 'النوع' : 'Type',
              value:
                item.kind === 'virtual'
                  ? isAr
                    ? 'اختصار منسوخ على سطح المكتب'
                    : 'Copied Desktop Shortcut'
                  : isAr
                  ? 'اختصار نظام أساسي'
                  : 'Core System Shortcut',
            },
            { label: isAr ? 'الوصف' : 'Description', value: item.shortcut.description },
            { label: isAr ? 'المعرف' : 'Target', value: item.shortcut.appId },
          ],
        }),
    });

    setContextMenu({ x, y, items: menuItems });
  };

  const openHostDesktopItemMenu = (
    x: number,
    y: number,
    item: Extract<DesktopRenderItem, { kind: 'host' }>
  ) => {
    const entry = item.entry;
    setSelectedIconId(entry.path);
    setContextMenu({
      x,
      y,
      items: [
        {
          id: 'open',
          label: isAr ? 'فتح' : 'Open',
          icon: <FolderOpen className="w-3.5 h-3.5 text-amber-300" />,
          onSelect: () => openDesktopItem(item),
        },
        {
          id: 'cut',
          label: isAr ? 'قص' : 'Cut',
          icon: <Scissors className="w-3.5 h-3.5 text-amber-300" />,
          dividerBefore: true,
          onSelect: () => copyDesktopItem(item, 'cut'),
        },
        {
          id: 'copy',
          label: isAr ? 'نسخ' : 'Copy',
          icon: <Copy className="w-3.5 h-3.5 text-cyan-300" />,
          onSelect: () => copyDesktopItem(item, 'copy'),
        },
        {
          id: 'rename',
          label: isAr ? 'إعادة تسمية' : 'Rename',
          icon: <FileText className="w-3.5 h-3.5 text-cyan-300" />,
          onSelect: () => setDialog({ kind: 'rename', target: entry, value: entry.name }),
        },
        {
          id: 'delete',
          label: isAr ? 'حذف إلى سلة المهملات' : 'Move to Trash',
          icon: <Trash2 className="w-3.5 h-3.5" />,
          danger: true,
          dividerBefore: true,
          onSelect: () => void deleteDesktopItem(item),
        },
        {
          id: 'properties',
          label: isAr ? 'الخصائص' : 'Properties',
          icon: <Info className="w-3.5 h-3.5 text-amber-300" />,
          dividerBefore: true,
          onSelect: () =>
            setDialog({
              kind: 'properties',
              title: entry.name,
              rows: [
                {
                  label: isAr ? 'النوع' : 'Type',
                  value: entry.type === 'folder' ? (isAr ? 'مجلد' : 'Folder') : isAr ? 'ملف' : 'File',
                },
                { label: isAr ? 'المسار' : 'Path', value: entry.path },
                { label: isAr ? 'الحجم' : 'Size', value: `${entry.size} B` },
              ],
            }),
        },
      ],
    });
  };

  const handleDockContextMenu = (
    e: React.MouseEvent,
    appId: AppId,
    label: string,
    matchingWindows: WindowInstance[]
  ) => {
    const isPinned = pinnedApps.includes(appId);
    const items: ContextMenuItem[] = [
      {
        id: 'new-window',
        label: isAr ? 'فتح نافذة جديدة' : 'Open New Window',
        icon: <FolderOpen className="w-3.5 h-3.5 text-cyan-300" />,
        onSelect: () => {
          if (appId === 'browser') {
            void openBrowserOrChromeStore();
            return;
          }
          handleOpenApp(appId);
        },
      },
      {
        id: 'pin-toggle',
        label: isPinned
          ? isAr
            ? 'إزالة من الشريط'
            : 'Unpin from Dock'
          : isAr
          ? 'تثبيت في الشريط'
          : 'Pin to Dock',
        icon: <Pin className="w-3.5 h-3.5 text-amber-300" />,
        onSelect: () => {
          setPinnedApps((prev) =>
            prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]
          );
          pushNotification(
            label,
            isPinned
              ? isAr
                ? 'تمت إزالة التثبيت من الشريط.'
                : 'Unpinned from dock.'
              : isAr
              ? 'تم تثبيت التطبيق في الشريط.'
              : 'Pinned to dock.',
            'system'
          );
        },
      },
    ];

    if (matchingWindows.length > 0) {
      items.push({
        id: 'close-window',
        label: isAr ? 'إغلاق النافذة' : 'Close Window',
        icon: <X className="w-3.5 h-3.5" />,
        danger: true,
        dividerBefore: true,
        onSelect: () => {
          for (const win of matchingWindows) {
            closeWindow(win.id);
          }
        },
      });
    }

    setContextMenu({ x: e.clientX, y: e.clientY, items });
  };

  const handleSubmitDialog = async () => {
    if (!dialog) return;
    if (dialog.kind === 'mkdir') {
      const name = dialog.value.trim();
      if (!name || !desktopDir) return;
      const newPath = `${desktopDir}/${name}`;
      try {
        await mkdirHost(newPath);
        if (dialog.targetCell) setIconPosition(newPath, dialog.targetCell);
        await loadDesktopData();
        setSelectedIconId(newPath);
        setDialog(null);
      } catch (err) {
        pushNotification(name, err instanceof Error ? err.message : 'Failed to create folder', 'system');
      }
    } else if (dialog.kind === 'mkfile') {
      const name = dialog.value.trim();
      if (!name || !desktopDir) return;
      const newPath = `${desktopDir}/${name}`;
      try {
        await writeHostFile(newPath, '');
        if (dialog.targetCell) setIconPosition(newPath, dialog.targetCell);
        await loadDesktopData();
        setSelectedIconId(newPath);
        setDialog(null);
      } catch (err) {
        pushNotification(name, err instanceof Error ? err.message : 'Failed to create file', 'system');
      }
    } else if (dialog.kind === 'rename') {
      const name = dialog.value.trim();
      if (!name || name === dialog.target.name) {
        setDialog(null);
        return;
      }
      try {
        await renameHostItem(dialog.target.path, name);
        await loadDesktopData();
        setDialog(null);
      } catch (err) {
        pushNotification(name, err instanceof Error ? err.message : 'Rename failed', 'system');
      }
    } else if (dialog.kind === 'rename-virtual') {
      const name = dialog.value.trim();
      if (!name) {
        setDialog(null);
        return;
      }
      renameVirtualShortcut(dialog.target.id, name);
      setDialog(null);
    }
  };

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      style={{
        backgroundColor: solidColor ?? '#070b14',
        filter: !liteActive
          ? `brightness(${brightness}%) ${nightLight ? 'sepia(0.22)' : ''}`.trim()
          : undefined,
      }}
      onClick={() => {
        setSelectedIconId(null);
        setContextMenu(null);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        openWallpaperContextMenu(e.clientX, e.clientY);
      }}
      className="relative w-screen h-screen overflow-hidden select-none text-slate-100"
    >
      {/* Desktop Wallpaper */}
      {wallpaperUrl && (
        <img
          src={wallpaperUrl}
          alt="KemetOS Desktop Wallpaper"
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
          className="kemet-wallpaper-img absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
      )}
      <div className="absolute inset-0 bg-[#070b14]/15 pointer-events-none" />

      {/* 1. Compact Top Telemetry Pill */}
      <TopTelemetryBar
        onOpenHardwareHub={() => handleOpenApp('hardware')}
        onOpenSettings={(tab) => handleOpenApp('settings', { initialTab: tab })}
      />

      {/* 2. Centered Bottom Dock / Full-Width Maximized Taskbar */}
      <LeftHexDock
        windows={windows}
        activeWindowId={activeWindowId}
        hasMaximizedWindow={hasMaximizedWindow}
        portalOpen={portalOpen}
        onTogglePortal={() => setPortalOpen((p) => !p)}
        onLaunchApp={(id) => handleOpenApp(id)}
        onSelectWindow={handleSelectWindow}
        onMinimizeAll={minimizeAll}
        onDockItemContextMenu={handleDockContextMenu}
      />

      {/* 3. Movable Free-Grid Desktop Icons Layer */}
      {showDesktopIcons && (
        <div
          dir="ltr"
          data-testid="desktop-icons-layer"
          className={`fixed inset-0 z-10 pointer-events-none transition-opacity duration-100 ${
            isRefreshingDesktop ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {desktopItems.map((item) => {
            const selected = selectedIconId === item.itemId;
            const cell = resolvedItemCells[item.itemId] ?? { col: 0, row: 0 };
            const basePixels = cellToPixels(cell);
            const isDragging = dragState?.active && dragState.itemId === item.itemId;
            const pxX = isDragging ? dragState.currentPixelX : basePixels.x;
            const pxY = isDragging ? dragState.currentPixelY : basePixels.y;

            const isCutDimmed =
              clipboard &&
              clipboard.mode === 'cut' &&
              ((clipboard.kind === 'host-entry' &&
                item.kind === 'host' &&
                clipboard.entry.path === item.entry.path) ||
                (clipboard.kind === 'desktop-shortcut' &&
                  item.kind !== 'host' &&
                  clipboard.shortcut.id === item.shortcut.id));

            const label =
              item.kind === 'host'
                ? item.entry.name
                : isAr
                ? item.shortcut.labelAr
                : item.shortcut.labelEn;

            return (
              <button
                key={item.itemId}
                type="button"
                data-desktop-item={item.itemId}
                style={{ left: pxX, top: pxY }}
                onPointerDown={(e) => handleStartIconDrag(e, item.itemId, basePixels.x, basePixels.y)}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIconId(item.itemId);
                  setContextMenu(null);
                  launchDesktopTarget(item.itemId, () => openDesktopItem(item));
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (item.kind === 'host') {
                    openHostDesktopItemMenu(e.clientX, e.clientY, item);
                  } else {
                    openShortcutContextMenu(e.clientX, e.clientY, item);
                  }
                }}
                className={`absolute w-[84px] p-1.5 rounded-xl flex flex-col items-center gap-1 pointer-events-auto ${
                  isDragging
                    ? 'z-30 scale-105 bg-teal-400/25 ring-1 ring-teal-400 shadow-2xl cursor-grabbing opacity-95'
                    : `transition-[left,top,background-color] duration-150 cursor-pointer ${
                        selected
                          ? 'bg-teal-400/20 ring-1 ring-teal-400/60'
                          : 'hover:bg-white/10'
                      } ${isCutDimmed ? 'opacity-50' : ''}`
                }`}
              >
                {item.kind === 'host' ? (
                  item.entry.type === 'folder' ? (
                    <AppVectorIcon id="files" className="w-10 h-10 drop-shadow-[0_4px_10px_rgba(0,0,0,0.75)]" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-slate-900/75 border border-slate-700/70 flex items-center justify-center shadow-lg">
                      <FileText className="w-5 h-5 text-cyan-300" />
                    </div>
                  )
                ) : (
                  <AppVectorIcon
                    id={item.shortcut.vectorId}
                    className="w-10 h-10 drop-shadow-[0_4px_10px_rgba(0,0,0,0.75)]"
                  />
                )}
                <span
                  dir="auto"
                  className="text-[11px] font-semibold text-white text-center leading-tight line-clamp-2 [text-shadow:0_1px_4px_rgba(0,0,0,0.95)]"
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* 4. Window Manager Layer */}
      {windows.map((win) => {
        const AppComp = win.component;
        const IconComp = APP_ICONS[win.appId];
        return (
          <WindowFrame
            key={win.id}
            win={win}
            isFocused={win.id === activeWindowId}
            icon={<IconComp className="w-3.5 h-3.5 text-amber-300" />}
          >
            <AppComp windowId={win.id} {...win.props} />
          </WindowFrame>
        );
      })}

      {/* 6. Reusable Right-Click Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isRtl={isAr}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* 7. Clean Inline Dialog (New Folder / New File / Rename / Properties) */}
      {dialog && (
        <div
          onClick={() => setDialog(null)}
          className="fixed inset-0 z-[320] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-[#0b1120] border border-amber-400/30 p-5 shadow-2xl space-y-4"
          >
            {dialog.kind === 'properties' ? (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-amber-300">{dialog.title}</h3>
                  <button
                    type="button"
                    onClick={() => setDialog(null)}
                    className="text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2 text-xs">
                  {dialog.rows.map((r) => (
                    <div key={r.label} className="flex justify-between gap-3 border-b border-slate-800/70 pb-1.5">
                      <span className="text-slate-400 shrink-0">{r.label}</span>
                      <span dir="auto" className="text-slate-100 text-left break-all">{r.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSubmitDialog();
                }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-amber-300">
                    {dialog.kind === 'mkdir'
                      ? isAr
                        ? 'إنشاء مجلد جديد'
                        : 'Create New Folder'
                      : dialog.kind === 'mkfile'
                      ? isAr
                        ? 'إنشاء ملف نصي جديد'
                        : 'Create New File'
                      : isAr
                      ? 'إعادة التسمية'
                      : 'Rename Item'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setDialog(null)}
                    className="text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <input
                  type="text"
                  autoFocus
                  value={dialog.value}
                  onChange={(e) => setDialog({ ...dialog, value: e.target.value })}
                  className="w-full rounded-xl bg-[#070b14] border border-slate-700 focus:border-amber-400/60 px-3.5 py-2 text-xs text-white focus:outline-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDialog(null)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer"
                  >
                    {isAr ? 'حفظ' : 'Save'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 8. Kemet Portal Overlay */}
      <KemetPortal
        isOpen={portalOpen}
        onClose={() => setPortalOpen(false)}
        onOpenApp={handleOpenApp}
        onPowerUiAction={handlePowerUiAction}
      />

      {/* 9. Session Overlays */}
      {booting && <BootScreen onComplete={() => setBooting(false)} />}
      {!booting && locked && (
        <LockScreen
          wallpaperUrl={wallpaperUrl}
          solidColor={solidColor}
          onUnlock={() => setLocked(false)}
        />
      )}
      {sleeping && <SleepOverlay onWake={() => setSleeping(false)} />}
    </div>
  );
}
