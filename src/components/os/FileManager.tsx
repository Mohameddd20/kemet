import { memo, useEffect, useMemo, useState } from 'react';
import {
  ArrowUp,
  ClipboardPaste,
  Copy,
  Download,
  FileCode2,
  FileText,
  Film,
  Folder,
  FolderOpen,
  FolderPlus,
  Home,
  Image,
  Info,
  LayoutGrid,
  List,
  Monitor,
  Music,
  Play,
  RefreshCw,
  Scissors,
  Trash2,
  X,
} from 'lucide-react';
import {
  deleteHostItem,
  executeHostFile,
  fetchDiskPartitions,
  fetchHostRoots,
  getDiskFreeSpaceLabel,
  listDirectory,
  mkdirHost,
  readHostFile,
  renameHostItem,
  runWindowsExe,
  writeHostFile,
  type DiskPartitionInfo,
  type HostFsEntry,
  type HostFsRoots,
} from '../../services/systemBridge';
import { useSettingsStore } from '../../system/settingsStore';
import { useNotificationStore } from '../../system/notificationStore';
import { useDesktopStore } from '../../system/desktopStore';
import { buildUniqueCopyName } from '../../system/desktopLogic';
import { openOsApp } from '../../apps/registry';
import type { WindowAppProps } from '../../windowManager/types';
import { ContextMenu, type ContextMenuItem } from './ContextMenu';

type FileDialogState =
  | { kind: 'mkdir'; value: string }
  | { kind: 'rename'; target: HostFsEntry; value: string }
  | { kind: 'properties'; entry: HostFsEntry }
  | null;

export const FileManager = memo(function FileManager({ initialDir }: WindowAppProps) {
  const language = useSettingsStore((s) => s.language);
  const recycleBin = useSettingsStore((s) => s.recycleBin);
  const moveToRecycleBin = useSettingsStore((s) => s.moveToRecycleBin);
  const pushNotification = useNotificationStore((s) => s.pushNotification);
  const clipboard = useDesktopStore((s) => s.clipboard);
  const setClipboard = useDesktopStore((s) => s.setClipboard);
  const isAr = language === 'ar';

  const [roots, setRoots] = useState<HostFsRoots | null>(null);
  const [currentPath, setCurrentPath] = useState(initialDir || '');
  const [items, setItems] = useState<HostFsEntry[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [freeSpaceLabel, setFreeSpaceLabel] = useState('...');
  const [inTrashView, setInTrashView] = useState(false);
  const [inComputerView, setInComputerView] = useState(false);
  const [disks, setDisks] = useState<DiskPartitionInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);
  const [dialog, setDialog] = useState<FileDialogState>(null);

  const loadPath = async (targetPath: string) => {
    setInTrashView(false);
    setInComputerView(false);
    setLoading(true);
    try {
      const res = await listDirectory(targetPath);
      setCurrentPath(res.path);
      setItems(res.items);
      setSelectedPath(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const [r, diskList] = await Promise.all([
          fetchHostRoots(),
          fetchDiskPartitions().catch(() => [] as DiskPartitionInfo[]),
        ]);
        if (!mounted) return;
        setRoots(r);
        setDisks(diskList);
        if (initialDir === '__computer__') {
          setInComputerView(true);
          setCurrentPath(r.homeDir);
        } else {
          await loadPath(initialDir || r.homeDir);
        }
        const free = await getDiskFreeSpaceLabel(isAr);
        if (mounted) setFreeSpaceLabel(free);
      } catch {
        // ignore
      }
    };
    void init();
    return () => {
      mounted = false;
    };
  }, [initialDir, isAr]);

  const sortedItems = useMemo(
    () =>
      items
        .filter((i) => !i.name.startsWith('.'))
        .sort((a, b) => {
          if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
          return a.name.localeCompare(b.name);
        }),
    [items]
  );

  const totalBytes = useMemo(
    () => sortedItems.reduce((acc, item) => acc + (item.size || 0), 0),
    [sortedItems]
  );

  const formatBytes = (b: number) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
  };

  const handleOpenEntry = async (entry: HostFsEntry) => {
    if (entry.type === 'folder') {
      await loadPath(entry.path);
      return;
    }

    const ext = entry.extension.toLowerCase();
    if (ext === '.exe' || ext === '.msi') {
      const res = await runWindowsExe(entry.path);
      pushNotification(
        'Kemet Wine Engine',
        res.ok
          ? isAr
            ? `تم تشغيل ${entry.name} عبر محرك Wine (${res.runner ?? 'wine64'}).`
            : `Running ${entry.name} via Wine.`
          : res.error ?? 'Wine requires KemetOS ISO desktop.',
        'system'
      );
      return;
    }

    if (ext === '.deb' || ext === '.sh' || ext === '.appimage') {
      const res = await executeHostFile(entry.path);
      pushNotification(entry.name, res.stdout || res.error || 'Executed host file.', 'system');
      return;
    }

    if (['.mp4', '.mkv', '.webm', '.mp3', '.wav', '.ogg', '.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
      openOsApp('media', { mediaPath: entry.path, storageMode: 'host' });
      return;
    }

    openOsApp('editor', { filePath: entry.path, storageMode: 'host' });
  };

  const handlePaste = async () => {
    if (!clipboard || clipboard.kind !== 'host-entry' || !currentPath) return;
    const src = clipboard.entry;
    const existingNames = items.map((i) => i.name);
    const destName =
      clipboard.mode === 'cut' && !existingNames.includes(src.name)
        ? src.name
        : buildUniqueCopyName(src.name, existingNames, isAr);

    try {
      if (src.type === 'folder') {
        await mkdirHost(`${currentPath}/${destName}`);
        if (clipboard.mode === 'cut' && src.path !== `${currentPath}/${destName}`) {
          await deleteHostItem(src.path).catch(() => undefined);
          setClipboard(null);
        }
      } else {
        const data = await readHostFile(src.path);
        await writeHostFile(`${currentPath}/${destName}`, data.content);
        if (clipboard.mode === 'cut' && src.path !== `${currentPath}/${destName}`) {
          await deleteHostItem(src.path);
          setClipboard(null);
        }
      }
      await loadPath(currentPath);
      window.dispatchEvent(new CustomEvent('kemetos-desktop-refresh'));
      pushNotification(
        destName,
        clipboard.mode === 'cut'
          ? isAr
            ? 'تم نقل العنصر بنجاح.'
            : 'Item moved.'
          : isAr
          ? 'تم لصق العنصر بنجاح.'
          : 'Item pasted.',
        'system'
      );
    } catch (err) {
      pushNotification(src.name, err instanceof Error ? err.message : 'Paste failed', 'system');
    }
  };

  const openEntryContextMenu = (x: number, y: number, entry: HostFsEntry) => {
    setSelectedPath(entry.path);
    const ext = entry.extension.toLowerCase();
    const isWindowsBinary = ext === '.exe' || ext === '.msi';

    const menuItems: ContextMenuItem[] = [
      {
        id: 'open',
        label: isAr ? 'فتح' : 'Open',
        icon: <FolderOpen className="w-3.5 h-3.5 text-amber-300" />,
        onSelect: () => void handleOpenEntry(entry),
      },
    ];

    if (isWindowsBinary) {
      menuItems.push({
        id: 'wine',
        label: isAr ? 'تشغيل عبر Wine' : 'Run via Wine',
        icon: <Play className="w-3.5 h-3.5 text-cyan-300" />,
        onSelect: () => void handleOpenEntry(entry),
      });
    }

    menuItems.push(
      {
        id: 'rename',
        label: isAr ? 'إعادة تسمية' : 'Rename',
        icon: <FileText className="w-3.5 h-3.5 text-cyan-300" />,
        onSelect: () => setDialog({ kind: 'rename', target: entry, value: entry.name }),
      },
      {
        id: 'copy',
        label: isAr ? 'نسخ' : 'Copy',
        icon: <Copy className="w-3.5 h-3.5 text-slate-300" />,
        onSelect: () => {
          setClipboard({ kind: 'host-entry', mode: 'copy', entry, parentPath: currentPath });
          pushNotification(entry.name, isAr ? 'تم نسخ العنصر.' : 'Copied to clipboard.', 'system');
        },
      },
      {
        id: 'cut',
        label: isAr ? 'قص' : 'Cut',
        icon: <Scissors className="w-3.5 h-3.5 text-amber-300" />,
        onSelect: () => {
          setClipboard({ kind: 'host-entry', mode: 'cut', entry, parentPath: currentPath });
          pushNotification(entry.name, isAr ? 'تم قص العنصر.' : 'Cut to clipboard.', 'system');
        },
      },
      {
        id: 'delete',
        label: isAr ? 'حذف إلى سلة المهملات' : 'Move to Trash',
        icon: <Trash2 className="w-3.5 h-3.5" />,
        danger: true,
        dividerBefore: true,
        onSelect: async () => {
          try {
            let content = '';
            if (entry.type === 'file') {
              const data = await readHostFile(entry.path).catch(() => null);
              content = data?.content ?? '';
            }
            await deleteHostItem(entry.path);
            moveToRecycleBin({
              name: entry.name,
              originalParentPath: currentPath,
              originalPath: entry.path,
              type: entry.type === 'folder' ? 'folder' : 'file',
              content,
              source: 'host',
            });
            await loadPath(currentPath);
            window.dispatchEvent(new CustomEvent('kemetos-desktop-refresh'));
            pushNotification(entry.name, isAr ? 'تم النقل إلى سلة المحذوفات.' : 'Moved to Trash.', 'system');
          } catch (err) {
            pushNotification(entry.name, err instanceof Error ? err.message : 'Delete failed', 'system');
          }
        },
      },
      {
        id: 'properties',
        label: isAr ? 'الخصائص' : 'Properties',
        icon: <Info className="w-3.5 h-3.5 text-amber-300" />,
        dividerBefore: true,
        onSelect: () => setDialog({ kind: 'properties', entry }),
      }
    );

    setCtxMenu({ x, y, items: menuItems });
  };

  const openBlankContextMenu = (x: number, y: number) => {
    const menuItems: ContextMenuItem[] = [
      {
        id: 'mkdir',
        label: isAr ? 'مجلد جديد' : 'New Folder',
        icon: <FolderPlus className="w-3.5 h-3.5 text-amber-300" />,
        onSelect: () => setDialog({ kind: 'mkdir', value: isAr ? 'مجلد جديد' : 'New Folder' }),
      },
      {
        id: 'refresh',
        label: isAr ? 'تحديث' : 'Refresh',
        icon: <RefreshCw className="w-3.5 h-3.5 text-cyan-300" />,
        onSelect: () => void loadPath(currentPath),
      },
    ];

    if (clipboard && clipboard.kind === 'host-entry') {
      menuItems.splice(1, 0, {
        id: 'paste',
        label: isAr ? `لصق (${clipboard.entry.name})` : `Paste (${clipboard.entry.name})`,
        icon: <ClipboardPaste className="w-3.5 h-3.5 text-emerald-300" />,
        onSelect: () => void handlePaste(),
      });
    }

    setCtxMenu({ x, y, items: menuItems });
  };

  const handleSubmitDialog = async () => {
    if (!dialog) return;
    if (dialog.kind === 'mkdir') {
      const clean = dialog.value.trim();
      if (!clean || !currentPath) return;
      try {
        await mkdirHost(`${currentPath}/${clean}`);
        await loadPath(currentPath);
        setDialog(null);
      } catch (err) {
        pushNotification(clean, err instanceof Error ? err.message : 'Could not create folder', 'system');
      }
    } else if (dialog.kind === 'rename') {
      const clean = dialog.value.trim();
      if (!clean || clean === dialog.target.name) {
        setDialog(null);
        return;
      }
      try {
        await renameHostItem(dialog.target.path, clean);
        await loadPath(currentPath);
        setDialog(null);
      } catch (err) {
        pushNotification(clean, err instanceof Error ? err.message : 'Could not rename item', 'system');
      }
    }
  };

  const places = roots
    ? [
        { label: isAr ? 'المجلد الشخصي' : 'Home', path: roots.homeDir, icon: Home },
        { label: isAr ? 'سطح المكتب' : 'Desktop', path: roots.desktopDir, icon: Monitor },
        { label: isAr ? 'المستندات' : 'Documents', path: roots.documentsDir, icon: FileText },
        { label: isAr ? 'التنزيلات' : 'Downloads', path: roots.downloadsDir, icon: Download },
        { label: isAr ? 'الموسيقى' : 'Music', path: roots.musicDir, icon: Music },
        { label: isAr ? 'الصور' : 'Pictures', path: roots.picturesDir, icon: Image },
        { label: isAr ? 'الفيديوهات' : 'Videos', path: roots.videosDir, icon: Film },
      ]
    : [];

  const goParent = () => {
    if (!currentPath || currentPath === '/') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    void loadPath('/' + parts.join('/'));
  };

  const currentLabel =
    roots && currentPath === roots.homeDir
      ? isAr
        ? 'المجلد الشخصي'
        : 'Home'
      : currentPath;

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      onClick={() => setCtxMenu(null)}
      className="flex-1 min-h-0 flex bg-[#0b1120] text-slate-100 select-none overflow-hidden relative"
    >
      {/* Sidebar: الأماكن */}
      <aside className="w-52 shrink-0 bg-[#070b14] border-l rtl:border-l ltr:border-r border-slate-800 p-4 flex flex-col justify-between overflow-y-auto os-scroll">
        <div className="space-y-1.5">
          <div className="px-2.5 pb-1.5 text-[11px] font-bold text-amber-300 uppercase tracking-wider">
            {isAr ? 'الأماكن' : 'Places'}
          </div>
          <button
            type="button"
            onClick={() => {
              setInTrashView(false);
              setInComputerView(true);
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              inComputerView
                ? 'bg-cyan-400/15 border border-cyan-400/35 text-cyan-200'
                : 'text-slate-300 hover:bg-slate-800/70 border border-transparent'
            }`}
          >
            <Monitor className="w-4 h-4 text-amber-300 shrink-0" />
            <span className="truncate">{isAr ? 'هذا الكمبيوتر' : 'This Computer'}</span>
          </button>
          {places.map((p) => {
            const Icon = p.icon;
            const active = !inTrashView && !inComputerView && currentPath === p.path;
            return (
              <button
                key={p.path}
                type="button"
                onClick={() => void loadPath(p.path)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-amber-400/15 border border-amber-400/35 text-amber-200'
                    : 'text-slate-300 hover:bg-slate-800/70 border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4 text-cyan-300 shrink-0" />
                <span className="truncate">{p.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              setInComputerView(false);
              setInTrashView(true);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              inTrashView
                ? 'bg-rose-500/15 border border-rose-400/35 text-rose-200'
                : 'text-slate-300 hover:bg-slate-800/70 border border-transparent'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Trash2 className="w-4 h-4 text-rose-300" />
              <span>{isAr ? 'سلة المهملات' : 'Trash'}</span>
            </span>
            {recycleBin.length > 0 && (
              <span className="text-[10px] font-mono-tabular text-amber-300">{recycleBin.length}</span>
            )}
          </button>
        </div>

        <div className="rounded-xl bg-[#0f172a] border border-slate-800 p-3 text-[11px] text-slate-400 leading-relaxed">
          {isAr
            ? 'انقر بزر الفأرة الأيمن على أي ملف للنسخ أو التسمية أو التشغيل عبر Wine.'
            : 'Right-click any item to rename, copy, delete, or launch via Wine.'}
        </div>
      </aside>

      {/* Main Browser Pane */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
        {/* Top Path Bar */}
        <div className="shrink-0 px-5 py-3 bg-[#070b14]/90 border-b border-slate-800 flex items-center gap-2.5">
          <button
            type="button"
            onClick={goParent}
            title={isAr ? 'الأعلى' : 'Up'}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => void loadPath(currentPath)}
            title={isAr ? 'تحديث' : 'Refresh'}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <div className="flex-1 bg-[#0b1120] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-amber-200 font-mono-tabular truncate">
            {inTrashView
              ? isAr
                ? 'سلة المهملات'
                : 'Trash'
              : inComputerView
              ? isAr
                ? 'هذا الكمبيوتر — الأقراص والأجهزة'
                : 'This Computer — Disks & Drives'
              : currentLabel}
          </div>

          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="Grid View"
              className={`p-1.5 rounded-lg cursor-pointer ${
                viewMode === 'grid' ? 'bg-amber-400/20 text-amber-300' : 'text-slate-400'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-label="List View"
              className={`p-1.5 rounded-lg cursor-pointer ${
                viewMode === 'list' ? 'bg-amber-400/20 text-amber-300' : 'text-slate-400'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Directory Listing */}
        <div
          onContextMenu={(e) => {
            if (inTrashView || inComputerView) return;
            e.preventDefault();
            e.stopPropagation();
            openBlankContextMenu(e.clientX, e.clientY);
          }}
          className="flex-1 min-h-0 overflow-y-auto os-scroll p-6"
        >
          {inComputerView ? (
            <div className="space-y-4">
              <div className="text-xs font-bold text-slate-400">
                {isAr ? 'الأقراص والأقسام المكتشفة' : 'Detected Disks & Partitions'}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {disks.map((d) => {
                  const totalGb = (d.totalBytes / 1073741824).toFixed(1);
                  const availGb = (d.availableBytes / 1073741824).toFixed(1);
                  return (
                    <button
                      key={d.mountPoint}
                      type="button"
                      onClick={() => {
                        if (d.mountPoint === '/' && roots) {
                          void loadPath(roots.homeDir);
                        }
                      }}
                      className="rounded-2xl bg-[#070b14] border border-slate-800 hover:border-cyan-400/40 p-5 text-right rtl:text-right ltr:text-left space-y-3 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white">{d.label}</span>
                        <span className="text-[11px] font-mono-tabular text-cyan-300">{d.fsType}</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-l from-cyan-400 to-teal-400"
                          style={{ width: `${Math.min(100, Math.max(4, d.usedPercent))}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-slate-400 font-mono-tabular">
                        <span>{isAr ? `متاح ${availGb} GB من ${totalGb} GB` : `${availGb} GB free of ${totalGb} GB`}</span>
                        <span className="text-amber-300">{d.mountPoint}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : inTrashView ? (
            recycleBin.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                {isAr ? 'سلة المهملات فارغة' : 'Trash is empty'}
              </div>
            ) : (
              <div className="space-y-2.5">
                {recycleBin.map((r) => (
                  <div key={r.id} className="rounded-xl bg-[#070b14] border border-slate-800 px-4 py-3 text-xs flex justify-between">
                    <span>{r.name}</span>
                    <span className="text-slate-500 font-mono-tabular">{r.originalPath}</span>
                  </div>
                ))}
              </div>
            )
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
              {sortedItems.map((item) => {
                const selected = selectedPath === item.path;
                const isExe = item.extension.toLowerCase() === '.exe';
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => setSelectedPath(item.path)}
                    onDoubleClick={() => void handleOpenEntry(item)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openEntryContextMenu(e.clientX, e.clientY, item);
                    }}
                    className={`flex flex-col items-center gap-2.5 p-3.5 rounded-2xl border transition-colors cursor-pointer ${
                      selected
                        ? 'bg-amber-400/15 border-amber-400/50'
                        : 'bg-[#070b14]/55 border-transparent hover:border-slate-700 hover:bg-[#0f172a]'
                    }`}
                  >
                    {item.type === 'folder' ? (
                      <Folder className="w-11 h-11 text-amber-400 fill-amber-400/25" />
                    ) : isExe ? (
                      <Play className="w-10 h-10 text-cyan-400" />
                    ) : item.extension === '.sh' || item.extension === '.ts' ? (
                      <FileCode2 className="w-10 h-10 text-emerald-300" />
                    ) : (
                      <FileText className="w-10 h-10 text-slate-300" />
                    )}
                    <span dir="ltr" className="text-xs text-slate-100 text-center break-all line-clamp-2">
                      {item.name}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80 rounded-2xl border border-slate-800 bg-[#070b14]/70">
              {sortedItems.map((item) => (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => setSelectedPath(item.path)}
                  onDoubleClick={() => void handleOpenEntry(item)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openEntryContextMenu(e.clientX, e.clientY, item);
                  }}
                  className="w-full px-4 py-3 flex items-center justify-between text-xs hover:bg-amber-400/10 cursor-pointer"
                >
                  <span className="flex items-center gap-2.5 truncate">
                    {item.type === 'folder' ? (
                      <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : (
                      <FileText className="w-4 h-4 text-cyan-300 shrink-0" />
                    )}
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className="font-mono-tabular text-slate-400 shrink-0">
                    {item.type === 'folder' ? '—' : formatBytes(item.size)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Status Bar */}
        <footer className="shrink-0 px-5 py-2.5 bg-[#070b14] border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono-tabular">
          <span>
            {isAr
              ? `العناصر: ${sortedItems.length} · ${formatBytes(totalBytes)}`
              : `Items: ${sortedItems.length} · ${formatBytes(totalBytes)}`}
          </span>
          <span className="text-cyan-300">{freeSpaceLabel}</span>
        </footer>
      </div>

      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          isRtl={isAr}
          items={ctxMenu.items}
          onClose={() => setCtxMenu(null)}
        />
      )}

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
                  <h3 className="text-sm font-bold text-amber-300">{dialog.entry.name}</h3>
                  <button
                    type="button"
                    onClick={() => setDialog(null)}
                    className="text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between gap-3 border-b border-slate-800/70 pb-1.5">
                    <span className="text-slate-400">{isAr ? 'النوع' : 'Type'}</span>
                    <span>{dialog.entry.type === 'folder' ? (isAr ? 'مجلد' : 'Folder') : dialog.entry.extension || (isAr ? 'ملف' : 'File')}</span>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-slate-800/70 pb-1.5">
                    <span className="text-slate-400">{isAr ? 'الحجم' : 'Size'}</span>
                    <span>{formatBytes(dialog.entry.size)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-400">{isAr ? 'المسار' : 'Path'}</span>
                    <span dir="ltr" className="text-slate-200 break-all text-left">{dialog.entry.path}</span>
                  </div>
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
    </div>
  );
});
