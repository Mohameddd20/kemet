import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUp,
  ChevronRight,
  Cpu,
  Database,
  Download,
  FilePlus2,
  FileText,
  Film,
  Folder,
  FolderOpen,
  FolderPlus,
  HardDrive,
  Home,
  Image as ImageIcon,
  Info,
  Monitor,
  Music,
  Pencil,
  Play,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { ContextMenu } from '../components/ContextMenu';
import { useNotificationStore } from '../system/notificationStore';
import { useSettingsStore } from '../system/settingsStore';
import {
  deleteHostItem,
  executeHostFile,
  fetchDiskPartitions,
  fetchHostRoots,
  listHostDirectory,
  mkdirHost,
  renameHostItem,
  writeHostFile,
  type DiskPartitionInfo,
  type HostFsEntry,
  type HostFsRoots,
} from '../system/systemBridge';
import {
  formatBytes,
  listDirectory,
  normalizePath,
  resolveNode,
  searchNodes,
} from '../vfs/treeOps';
import type { VfsNode } from '../vfs/types';
import { useVfsStore } from '../vfs/vfsStore';
import { calculateVfsStats } from '../vfs/vfsTransfer';
import { launchApp } from '../windowManager/launcher';
import type { WindowAppProps } from '../windowManager/types';

type StorageMode = 'host' | 'vfs';

const VFS_SIDEBAR_LOCATIONS = [
  { label: 'Home', path: '/home/user', icon: Home },
  { label: 'Documents', path: '/home/user/Documents', icon: FolderOpen },
  { label: 'Projects', path: '/home/user/Projects', icon: Folder },
  { label: 'Notes', path: '/home/user/Notes', icon: Folder },
  { label: 'Root (/)', path: '/', icon: Database },
];

const MEDIA_EXTS = new Set(['.wav', '.mp3', '.ogg', '.mp4', '.webm', '.png', '.jpg', '.jpeg', '.webp']);
const EXEC_EXTS = new Set(['.exe', '.appimage', '.deb', '.sh']);

type InlinePromptMode =
  | { type: 'new-folder' }
  | { type: 'new-file' }
  | { type: 'rename'; targetPath: string; currentName: string }
  | null;

interface UnifiedEntry {
  name: string;
  path: string;
  type: 'folder' | 'file';
  sizeLabel: string;
  sizeBytes: number;
  updatedAt: number;
  vfsNode?: VfsNode;
}

export function FileManagerApp({ initialDir, storageMode: initialMode }: WindowAppProps) {
  const tree = useVfsStore((s) => s.tree);
  const mkdir = useVfsStore((s) => s.mkdir);
  const saveFile = useVfsStore((s) => s.saveFile);
  const removeItem = useVfsStore((s) => s.removeItem);
  const renameItem = useVfsStore((s) => s.renameItem);
  const language = useSettingsStore((s) => s.language);
  const pushNotification = useNotificationStore((s) => s.pushNotification);
  const moveToRecycleBin = useSettingsStore((s) => s.moveToRecycleBin);

  const [mode, setMode] = useState<StorageMode>(initialMode ?? 'host');
  const [showThisPc, setShowThisPc] = useState<boolean>(!initialDir);
  const [hostRoots, setHostRoots] = useState<HostFsRoots | null>(null);
  const [disks, setDisks] = useState<DiskPartitionInfo[]>([]);
  const [hostPath, setHostPath] = useState<string>(initialDir ?? '');
  const [hostItems, setHostItems] = useState<HostFsEntry[]>([]);
  const [hostLoading, setHostLoading] = useState<boolean>(false);

  const [vfsPath, setVfsPath] = useState<string>(
    initialMode === 'vfs' && initialDir ? initialDir : '/home/user'
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [promptMode, setPromptMode] = useState<InlinePromptMode>(null);
  const [promptValue, setPromptValue] = useState('');
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [execBanner, setExecBanner] = useState<{
    title: string;
    ok: boolean;
    output: string;
  } | null>(null);
  const [contextTarget, setContextTarget] = useState<{
    x: number;
    y: number;
    entry: UnifiedEntry;
  } | null>(null);
  const [propertiesTarget, setPropertiesTarget] = useState<UnifiedEntry | null>(null);

  const vfsStats = useMemo(() => calculateVfsStats(tree), [tree]);

  const loadHostDir = useCallback(async (targetDir: string) => {
    setHostLoading(true);
    setFeedbackError(null);
    try {
      const res = await listHostDirectory(targetDir);
      setHostPath(res.path);
      setHostItems(res.items);
      setShowThisPc(false);
    } catch (err) {
      setFeedbackError(err instanceof Error ? err.message : 'Unable to read host folder.');
    } finally {
      setHostLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void fetchHostRoots()
      .then((roots) => {
        if (!active) return;
        setHostRoots(roots);
        if (initialDir && initialMode !== 'vfs') {
          void loadHostDir(initialDir);
        } else {
          setHostPath(roots.homeDir);
        }
      })
      .catch(() => {
        if (!active) return;
        if (mode === 'host' && initialDir) {
          setFeedbackError('Host disk backend unavailable; switch to Browser VFS.');
        }
      });
    void fetchDiskPartitions()
      .then((parts) => {
        if (active) setDisks(parts);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [initialDir, initialMode, loadHostDir]);

  const currentPath = mode === 'host' ? hostPath : vfsPath;

  const userLibraryCards = useMemo(() => {
    if (!hostRoots) return [];
    return [
      { id: 'desktop', label: language === 'ar' ? 'سطح المكتب' : 'Desktop', path: hostRoots.desktopDir, icon: Monitor, color: 'text-sky-400', bg: 'bg-sky-500/15' },
      { id: 'downloads', label: language === 'ar' ? 'التنزيلات' : 'Downloads', path: hostRoots.downloadsDir, icon: Download, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
      { id: 'documents', label: language === 'ar' ? 'المستندات' : 'Documents', path: hostRoots.documentsDir, icon: FileText, color: 'text-amber-400', bg: 'bg-amber-500/15' },
      { id: 'pictures', label: language === 'ar' ? 'الصور' : 'Pictures', path: hostRoots.picturesDir, icon: ImageIcon, color: 'text-violet-400', bg: 'bg-violet-500/15' },
      { id: 'music', label: language === 'ar' ? 'الموسيقى' : 'Music', path: hostRoots.musicDir, icon: Music, color: 'text-rose-400', bg: 'bg-rose-500/15' },
      { id: 'videos', label: language === 'ar' ? 'الفيديو' : 'Videos', path: hostRoots.videosDir, icon: Film, color: 'text-cyan-400', bg: 'bg-cyan-500/15' },
    ];
  }, [hostRoots, language]);

  const hostSidebarLocations = useMemo(() => {
    if (!hostRoots) return [];
    return [
      { label: 'Home (~)', path: hostRoots.homeDir, icon: Home },
      { label: 'Desktop', path: hostRoots.desktopDir, icon: Monitor },
      { label: 'Documents', path: hostRoots.documentsDir, icon: FolderOpen },
      { label: 'Downloads', path: hostRoots.downloadsDir, icon: Download },
      { label: 'Pictures', path: hostRoots.picturesDir, icon: ImageIcon },
      { label: 'Music', path: hostRoots.musicDir, icon: Music },
      { label: 'Videos', path: hostRoots.videosDir, icon: Film },
      { label: 'Workspace', path: hostRoots.workspaceDir, icon: HardDrive },
    ];
  }, [hostRoots]);

  const breadcrumbs = useMemo(() => {
    if (showThisPc) return [{ label: language === 'ar' ? 'جهاز الكمبيوتر' : 'This PC', path: '__this_pc__' }];
    const parts = currentPath.split('/').filter(Boolean);
    const crumbs = [{ label: '/', path: '/' }];
    let acc = '';
    for (const part of parts) {
      acc += `/${part}`;
      crumbs.push({ label: part, path: acc });
    }
    return crumbs;
  }, [currentPath, showThisPc, language]);

  const entries: UnifiedEntry[] = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (mode === 'host') {
      const filtered = q
        ? hostItems.filter((item) => item.name.toLowerCase().includes(q))
        : hostItems;
      return filtered.map((item) => ({
        name: item.name,
        path: item.path,
        type: item.type,
        sizeLabel: item.type === 'folder' ? 'Folder' : formatBytes(item.size),
        sizeBytes: item.size,
        updatedAt: item.updatedAt,
      }));
    }

    if (q) {
      return searchNodes(tree, q).map((item) => ({
        name: item.node.name,
        path: item.path,
        type: item.node.type,
        sizeLabel:
          item.node.type === 'folder'
            ? `${Object.keys(item.node.children).length} items`
            : formatBytes(item.node.content.length),
        sizeBytes: item.node.type === 'file' ? item.node.content.length : 0,
        updatedAt: item.node.updatedAt,
        vfsNode: item.node,
      }));
    }

    return listDirectory(tree, vfsPath).map((node) => ({
      name: node.name,
      path: vfsPath === '/' ? `/${node.name}` : `${vfsPath}/${node.name}`,
      type: node.type,
      sizeLabel:
        node.type === 'folder'
          ? `${Object.keys(node.children).length} items`
          : formatBytes(node.content.length),
      sizeBytes: node.type === 'file' ? node.content.length : 0,
      updatedAt: node.updatedAt,
      vfsNode: node,
    }));
  }, [mode, hostItems, tree, vfsPath, searchQuery]);

  const canGoUp =
    !showThisPc &&
    (mode === 'host'
      ? Boolean(hostRoots && hostPath && !hostRoots.allowedRoots.includes(hostPath) && hostPath !== '/')
      : vfsPath !== '/');

  const navigateTo = (target: string) => {
    if (target === '__this_pc__') {
      setShowThisPc(true);
      setSelectedPath(null);
      return;
    }
    setSelectedPath(null);
    setSearchQuery('');
    setFeedbackError(null);
    setShowThisPc(false);
    if (mode === 'host') {
      void loadHostDir(target);
      return;
    }
    const normalized = normalizePath(target, '/');
    const node = resolveNode(tree, normalized, '/');
    if (node && node.type === 'folder') {
      setVfsPath(normalized);
    }
  };

  const handleGoUp = () => {
    if (!canGoUp) {
      setShowThisPc(true);
      return;
    }
    if (mode === 'host') {
      const idx = hostPath.lastIndexOf('/');
      const parent = idx <= 0 ? '/' : hostPath.slice(0, idx);
      void loadHostDir(parent);
      return;
    }
    navigateTo(normalizePath(`${vfsPath}/..`, '/'));
  };

  const handleRunExecutable = async (entry: UnifiedEntry) => {
    setExecBanner({ title: `Executing ${entry.name}...`, ok: true, output: 'Dispatching host runner...' });
    const res = await executeHostFile(entry.path);
    if (res.ok) {
      setExecBanner({
        title: `Executed ${entry.name} (${res.runner ?? 'host'})`,
        ok: true,
        output: res.stdout?.trim() || 'Completed successfully.',
      });
      pushNotification('Executable Completed', `${entry.name} ran via ${res.runner ?? 'host'}.`, 'system');
    } else {
      setExecBanner({
        title: `Cannot Execute ${entry.name}`,
        ok: false,
        output: res.error || res.stdout || 'Execution unavailable.',
      });
    }
  };

  const handleOpenItem = (entry: UnifiedEntry) => {
    if (entry.type === 'folder') {
      navigateTo(entry.path);
      return;
    }
    if (mode === 'host') {
      const dotIdx = entry.name.lastIndexOf('.');
      const ext = dotIdx !== -1 ? entry.name.slice(dotIdx).toLowerCase() : '';
      if (EXEC_EXTS.has(ext)) {
        void handleRunExecutable(entry);
        return;
      }
      if (MEDIA_EXTS.has(ext)) {
        launchApp('media', { mediaPath: entry.path });
      } else {
        launchApp('editor', { filePath: entry.path, storageMode: 'host' });
      }
      return;
    }
    launchApp('editor', { filePath: entry.path, storageMode: 'vfs' });
  };

  const startPrompt = (m: InlinePromptMode) => {
    setFeedbackError(null);
    setPromptMode(m);
    setPromptValue(m?.type === 'rename' ? m.currentName : '');
  };

  const submitPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptMode) return;
    const clean = promptValue.trim();
    if (!clean) {
      setFeedbackError('Name cannot be empty.');
      return;
    }

    if (mode === 'host') {
      const targetDir = hostPath || hostRoots?.homeDir || '';
      try {
        if (promptMode.type === 'new-folder') {
          await mkdirHost(`${targetDir}/${clean}`);
          pushNotification('Host Folder Created', `Created ${targetDir}/${clean}`, 'files');
        } else if (promptMode.type === 'new-file') {
          const targetName = clean.includes('.') ? clean : `${clean}.txt`;
          await writeHostFile(`${targetDir}/${targetName}`, '');
          pushNotification('Host File Created', `Created ${targetDir}/${targetName}`, 'files');
        } else if (promptMode.type === 'rename') {
          await renameHostItem(promptMode.targetPath, clean);
          pushNotification('Host Item Renamed', `Renamed to "${clean}".`, 'files');
        }
        setPromptMode(null);
        setPromptValue('');
        await loadHostDir(targetDir);
      } catch (err) {
        setFeedbackError(err instanceof Error ? err.message : 'Host filesystem error.');
      }
      return;
    }

    if (promptMode.type === 'new-folder') {
      const res = mkdir(vfsPath, clean);
      if (!res.ok) {
        setFeedbackError(res.error ?? 'Could not create folder.');
        return;
      }
      pushNotification('Folder Created', `Created "${clean}" in ${vfsPath}.`, 'files');
      setPromptMode(null);
      setPromptValue('');
      return;
    }

    if (promptMode.type === 'new-file') {
      const targetName = clean.includes('.') ? clean : `${clean}.txt`;
      const res = saveFile(vfsPath, targetName, '');
      if (!res.ok) {
        setFeedbackError(res.error ?? 'Could not create file.');
        return;
      }
      pushNotification('File Created', `Created "${targetName}" in ${vfsPath}.`, 'files');
      setPromptMode(null);
      setPromptValue('');
      return;
    }

    if (promptMode.type === 'rename') {
      const res = renameItem(promptMode.targetPath, clean);
      if (!res.ok) {
        setFeedbackError(res.error ?? 'Could not rename item.');
        return;
      }
      pushNotification('Item Renamed', `Renamed to "${clean}".`, 'files');
      setSelectedPath(null);
      setPromptMode(null);
      setPromptValue('');
    }
  };

  const handleDeleteSelected = async (targetPath?: string) => {
    const pathToDelete = targetPath ?? selectedPath;
    if (!pathToDelete) return;

    if (mode === 'host') {
      try {
        await deleteHostItem(pathToDelete);
        pushNotification('Host Item Deleted', `Removed ${pathToDelete}.`, 'files');
        if (selectedPath === pathToDelete) setSelectedPath(null);
        await loadHostDir(hostPath);
      } catch (err) {
        setFeedbackError(err instanceof Error ? err.message : 'Could not delete host item.');
      }
      return;
    }

    const nodeToDelete = resolveNode(tree, pathToDelete, '/');
    const res = removeItem(pathToDelete);
    if (!res.ok) {
      setFeedbackError(res.error ?? 'Could not delete item.');
      return;
    }
    if (nodeToDelete) {
      const lastSlash = pathToDelete.lastIndexOf('/');
      const parentPath = lastSlash <= 0 ? '/' : pathToDelete.slice(0, lastSlash);
      moveToRecycleBin({
        name: nodeToDelete.name,
        originalParentPath: parentPath,
        originalPath: pathToDelete,
        type: nodeToDelete.type,
        content: nodeToDelete.type === 'file' ? nodeToDelete.content : '',
      });
    }
    pushNotification('Moved to Recycle Bin', `${pathToDelete}`, 'files');
    setFeedbackError(null);
    if (selectedPath === pathToDelete) setSelectedPath(null);
  };

  const selectedEntry = entries.find((e) => e.path === selectedPath);

  return (
    <div
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      className="flex h-full bg-slate-900 text-slate-100"
    >
      {/* Sidebar */}
      <aside className="w-44 shrink-0 border-e border-slate-800 bg-slate-950/60 p-2.5 flex flex-col gap-1">
        <div className="p-0.5 rounded-md bg-slate-900 border border-slate-800 grid grid-cols-2 gap-0.5 mb-1.5">
          <button
            type="button"
            onClick={() => {
              setMode('host');
              setFeedbackError(null);
              if (hostRoots && !hostPath && !showThisPc) void loadHostDir(hostRoots.homeDir);
            }}
            className={`py-1 px-1.5 rounded text-[11px] font-medium transition-colors whitespace-nowrap ${
              mode === 'host'
                ? 'os-accent-bg text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Host Disk
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('vfs');
              setShowThisPc(false);
              setFeedbackError(null);
            }}
            className={`py-1 px-1.5 rounded text-[11px] font-medium transition-colors whitespace-nowrap ${
              mode === 'vfs'
                ? 'os-accent-bg text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Browser VFS
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowThisPc(true)}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-start transition-colors mb-1 ${
            showThisPc
              ? 'os-accent-soft-bg os-accent-text'
              : 'text-slate-200 hover:bg-slate-800/80'
          }`}
        >
          <Monitor className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{language === 'ar' ? 'جهاز الكمبيوتر' : 'This PC'}</span>
        </button>

        <div className="px-2 py-1 text-[11px] font-medium text-slate-400">
          {mode === 'host' ? 'Quick Access' : 'VFS Locations'}
        </div>

        <div className="flex-1 overflow-y-auto os-scroll space-y-0.5">
          {(mode === 'host' ? hostSidebarLocations : VFS_SIDEBAR_LOCATIONS).map((loc) => {
            const Icon = loc.icon;
            const active = !showThisPc && currentPath === loc.path && !searchQuery;
            return (
              <button
                key={loc.path}
                type="button"
                onClick={() => navigateTo(loc.path)}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-start transition-colors whitespace-nowrap ${
                  active
                    ? 'os-accent-soft-bg os-accent-text'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{loc.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-auto pt-2 border-t border-slate-800/80 px-2 text-[11px] text-slate-500">
          {mode === 'host' ? 'Real Host FS' : 'IndexedDB VFS'}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            <button
              type="button"
              onClick={handleGoUp}
              disabled={!canGoUp && showThisPc}
              aria-label="Up one folder"
              className="p-1.5 rounded-md text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors shrink-0"
            >
              <ArrowUp className="w-4 h-4" />
            </button>

            {mode === 'host' && (
              <button
                type="button"
                onClick={() => {
                  if (showThisPc) {
                    void fetchDiskPartitions().then(setDisks).catch(() => undefined);
                  } else if (hostPath) {
                    void loadHostDir(hostPath);
                  }
                }}
                aria-label="Refresh directory"
                className="p-1.5 rounded-md text-slate-300 hover:bg-slate-800 transition-colors shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${hostLoading ? 'animate-spin' : ''}`} />
              </button>
            )}

            <nav aria-label="Breadcrumb" className="flex items-center gap-0.5 text-xs overflow-x-auto min-w-0">
              {breadcrumbs.map((crumb, idx) => (
                <div key={crumb.path} className="flex items-center gap-0.5 shrink-0">
                  {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-600" />}
                  <button
                    type="button"
                    onClick={() => navigateTo(crumb.path)}
                    className={`px-1.5 py-1 rounded hover:bg-slate-800 transition-colors whitespace-nowrap ${
                      idx === breadcrumbs.length - 1
                        ? 'text-slate-100 font-medium'
                        : 'text-slate-400'
                    }`}
                  >
                    {crumb.label}
                  </button>
                </div>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {!showThisPc && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute start-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  aria-label="Search files"
                  className="w-28 focus:w-36 transition-all bg-slate-950/70 border border-slate-800 rounded-md ps-8 pe-2 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[var(--os-accent-hover)]"
                />
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                if (showThisPc) setShowThisPc(false);
                startPrompt({ type: 'new-folder' });
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors whitespace-nowrap shrink-0"
            >
              <FolderPlus className="w-3.5 h-3.5 os-accent-text" />
              <span>New Folder</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (showThisPc) setShowThisPc(false);
                startPrompt({ type: 'new-file' });
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md os-accent-bg text-xs font-medium text-white transition-colors whitespace-nowrap shrink-0"
            >
              <FilePlus2 className="w-3.5 h-3.5" />
              <span>New File</span>
            </button>
          </div>
        </div>

        {/* Inline Creation / Rename Bar */}
        {promptMode && (
          <form
            onSubmit={(e) => void submitPrompt(e)}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800/70 border-b border-slate-700"
          >
            <label htmlFor="vfs-inline-input" className="text-xs font-medium text-slate-300 shrink-0">
              {promptMode.type === 'new-folder'
                ? 'Folder name:'
                : promptMode.type === 'new-file'
                  ? 'File name:'
                  : 'Rename to:'}
            </label>
            <input
              id="vfs-inline-input"
              type="text"
              autoFocus
              value={promptValue}
              onChange={(e) => setPromptValue(e.target.value)}
              placeholder={promptMode.type === 'new-folder' ? 'e.g. Assets' : 'e.g. notes.txt'}
              className="flex-1 min-w-0 bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-100 focus:outline-none focus:border-[var(--os-accent-hover)]"
            />
            <button
              type="submit"
              className="px-3 py-1 rounded os-accent-bg text-xs font-medium text-white whitespace-nowrap"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => {
                setPromptMode(null);
                setFeedbackError(null);
              }}
              aria-label="Cancel action"
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </form>
        )}

        {feedbackError && (
          <div
            role="alert"
            className="flex items-center justify-between px-3 py-1.5 bg-red-950/60 border-b border-red-800/70 text-xs text-red-200"
          >
            <span>{feedbackError}</span>
            <button
              type="button"
              onClick={() => setFeedbackError(null)}
              aria-label="Dismiss error"
              className="text-red-300 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {execBanner && (
          <div
            className={`flex items-start justify-between gap-3 px-3 py-2 border-b text-xs ${
              execBanner.ok
                ? 'bg-emerald-950/50 border-emerald-800/70 text-emerald-100'
                : 'bg-amber-950/50 border-amber-800/70 text-amber-100'
            }`}
          >
            <div className="min-w-0 space-y-0.5">
              <div className="font-semibold flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 shrink-0" />
                <span>{execBanner.title}</span>
              </div>
              <pre className="text-[11px] font-mono whitespace-pre-wrap break-words opacity-90">
                {execBanner.output}
              </pre>
            </div>
            <button
              type="button"
              onClick={() => setExecBanner(null)}
              aria-label="Close execution status"
              className="p-1 text-slate-300 hover:text-white shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* This PC Dashboard OR File Table */}
        <div className="flex-1 overflow-y-auto os-scroll">
          {showThisPc ? (
            <div className="p-5 space-y-6">
              {/* Folders Grid */}
              <section className="space-y-3">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  {language === 'ar' ? 'المجلدات الشخصية' : 'Folders'} ({userLibraryCards.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {userLibraryCards.map((folder) => {
                    const Icon = folder.icon;
                    return (
                      <button
                        key={folder.id}
                        type="button"
                        onClick={() => {
                          setMode('host');
                          void loadHostDir(folder.path);
                        }}
                        className="flex items-center gap-3 p-3 rounded-md bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 text-start transition-colors"
                      >
                        <div className={`w-10 h-10 rounded-md ${folder.bg} flex items-center justify-center shrink-0`}>
                          <Icon className={`w-5 h-5 ${folder.color}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-100 truncate">
                            {folder.label}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono truncate" dir="ltr">
                            {folder.path}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Devices and Drives */}
              <section className="space-y-3">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  {language === 'ar' ? 'الأجهزة ومحركات الأقراص' : 'Devices and drives'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {disks.map((disk) => {
                    const isCritical = disk.usedPercent > 90;
                    return (
                      <button
                        key={`${disk.filesystem}-${disk.mountPoint}`}
                        type="button"
                        onClick={() => {
                          setMode('host');
                          const target =
                            hostRoots?.allowedRoots.find((r) => disk.mountPoint === r) ??
                            hostRoots?.workspaceDir ??
                            hostRoots?.homeDir;
                          if (target) void loadHostDir(target);
                        }}
                        className="p-3.5 rounded-md bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 text-start space-y-2 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <HardDrive className="w-5 h-5 os-accent-text shrink-0" />
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-100 truncate">
                                {disk.label}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono truncate" dir="ltr">
                                {disk.fsType} · {disk.filesystem}
                              </div>
                            </div>
                          </div>
                          <span
                            className={`text-xs font-mono-tabular font-semibold ${
                              isCritical ? 'text-red-400' : 'text-slate-300'
                            }`}
                          >
                            {disk.usedPercent.toFixed(0)}%
                          </span>
                        </div>

                        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              isCritical ? 'bg-red-500' : 'os-accent-bg'
                            }`}
                            style={{ width: `${Math.max(2, disk.usedPercent)}%` }}
                          />
                        </div>

                        <div className="text-[11px] text-slate-400 font-mono-tabular">
                          {formatBytes(disk.availableBytes)} free of {formatBytes(disk.totalBytes)}
                        </div>
                      </button>
                    );
                  })}

                  {/* Browser IndexedDB Virtual Drive Card */}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('vfs');
                      setShowThisPc(false);
                    }}
                    className="p-3.5 rounded-md bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 text-start space-y-2 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Database className="w-5 h-5 text-emerald-400 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-100 truncate">
                            NizamOS IndexedDB Drive (VFS:)
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono truncate">
                            {vfsStats.totalFiles} files · {vfsStats.totalFolders} folders
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-mono-tabular font-semibold text-emerald-400">
                        {vfsStats.usagePercent}%
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          vfsStats.usagePercent > 90 ? 'bg-red-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.max(2, vfsStats.usagePercent)}%` }}
                      />
                    </div>

                    <div className="text-[11px] text-slate-400 font-mono-tabular">
                      {formatBytes(vfsStats.quotaBytes - vfsStats.serializedBytes)} free of{' '}
                      {formatBytes(vfsStats.quotaBytes)}
                    </div>
                  </button>
                </div>
              </section>
            </div>
          ) : entries.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center">
              <Folder className="w-10 h-10 text-slate-600 mb-3" />
              <p className="text-sm font-medium text-slate-300">
                {hostLoading
                  ? 'Loading host directory...'
                  : searchQuery
                    ? 'No matching files or folders'
                    : 'This folder is empty'}
              </p>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                {searchQuery
                  ? 'Try another keyword or clear your search filter.'
                  : mode === 'host'
                    ? 'Create a new folder or file directly on your host disk.'
                    : 'Create a new folder or text file to store it in IndexedDB.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-900/95 border-b border-slate-800 text-[11px] font-medium text-slate-400">
                <tr>
                  <th className="py-2 px-3">Name</th>
                  <th className="py-2 px-3 w-28">Type</th>
                  <th className="py-2 px-3 w-24 text-right">Size</th>
                  <th className="py-2 px-3 w-28 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {entries.map((entry) => {
                  const isSelected = selectedPath === entry.path;
                  const dotIdx = entry.name.lastIndexOf('.');
                  const ext = dotIdx !== -1 ? entry.name.slice(dotIdx).toLowerCase() : '';
                  const isMedia = entry.type === 'file' && MEDIA_EXTS.has(ext);
                  const isExec = entry.type === 'file' && EXEC_EXTS.has(ext);
                  return (
                    <tr
                      key={entry.path}
                      onClick={() => setSelectedPath(entry.path)}
                      onDoubleClick={() => handleOpenItem(entry)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedPath(entry.path);
                        setContextTarget({ x: e.clientX, y: e.clientY, entry });
                      }}
                      className={`group cursor-pointer transition-colors ${
                        isSelected ? 'os-accent-soft-bg' : 'hover:bg-slate-800/50'
                      }`}
                    >
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {entry.type === 'folder' ? (
                            <Folder className="w-4 h-4 os-accent-text shrink-0" />
                          ) : isExec ? (
                            <Play className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : isMedia ? (
                            <Film className="w-4 h-4 text-amber-400 shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPath(entry.path);
                            }}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              handleOpenItem(entry);
                            }}
                            className="text-start font-medium text-slate-200 hover:text-white truncate focus:outline-none"
                          >
                            {entry.name}
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-slate-400">
                        {entry.type === 'folder'
                          ? 'Folder'
                          : isExec
                            ? `App (${ext})`
                            : isMedia
                              ? 'Media'
                              : 'File'}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-400 font-mono-tabular">
                        {entry.sizeLabel}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenItem(entry);
                            }}
                            aria-label={`Open ${entry.name}`}
                            className="px-2 py-1 rounded text-[11px] font-medium os-accent-text hover:bg-slate-800"
                          >
                            {isExec ? 'Run' : 'Open'}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              startPrompt({
                                type: 'rename',
                                targetPath: entry.path,
                                currentName: entry.name,
                              });
                            }}
                            aria-label={`Rename ${entry.name}`}
                            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-700"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDeleteSelected(entry.path);
                            }}
                            aria-label={`Delete ${entry.name}`}
                            className="p-1 rounded text-slate-400 hover:text-red-300 hover:bg-red-950/60"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-slate-800 bg-slate-950/60 text-[11px] text-slate-400 font-mono-tabular">
          <span>
            {showThisPc
              ? `${userLibraryCards.length} folders · ${disks.length + 1} drives`
              : `${entries.length} ${entries.length === 1 ? 'item' : 'items'} (${mode === 'host' ? 'Host Disk' : 'VFS'})`}
          </span>
          <span className="truncate max-w-xs">
            {selectedEntry ? `Selected: ${selectedEntry.path}` : 'Double-click to open or run'}
          </span>
        </div>
      </div>

      {contextTarget && (
        <ContextMenu
          x={contextTarget.x}
          y={contextTarget.y}
          onClose={() => setContextTarget(null)}
          items={[
            {
              id: 'open',
              label: contextTarget.entry.type === 'folder' ? 'Open Folder' : 'Open / Run',
              icon: FolderOpen,
              onSelect: () => handleOpenItem(contextTarget.entry),
            },
            {
              id: 'rename',
              label: 'Rename',
              icon: Pencil,
              onSelect: () =>
                startPrompt({
                  type: 'rename',
                  targetPath: contextTarget.entry.path,
                  currentName: contextTarget.entry.name,
                }),
            },
            {
              id: 'properties',
              label: 'Properties',
              icon: Info,
              onSelect: () => setPropertiesTarget(contextTarget.entry),
            },
            {
              id: 'delete',
              label: 'Delete',
              icon: Trash2,
              danger: true,
              dividerBefore: true,
              onSelect: () => void handleDeleteSelected(contextTarget.entry.path),
            },
          ]}
        />
      )}

      {propertiesTarget && (
        <div
          role="dialog"
          aria-label={`Properties of ${propertiesTarget.name}`}
          className="fixed inset-0 z-[9997] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setPropertiesTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 os-accent-text" />
                <h3 className="text-xs font-semibold text-slate-100">Properties</h3>
              </div>
              <button
                type="button"
                onClick={() => setPropertiesTarget(null)}
                aria-label="Close properties"
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400">Name</dt>
                <dd className="text-slate-100 font-medium truncate">{propertiesTarget.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400">Path</dt>
                <dd className="text-slate-200 font-mono truncate">{propertiesTarget.path}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400">Storage</dt>
                <dd className="text-slate-200">{mode === 'host' ? 'Host Disk' : 'IndexedDB VFS'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400">Size</dt>
                <dd className="text-slate-200 font-mono-tabular">
                  {propertiesTarget.type === 'folder'
                    ? propertiesTarget.sizeLabel
                    : `${formatBytes(propertiesTarget.sizeBytes)} (${propertiesTarget.sizeBytes} B)`}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400">Modified</dt>
                <dd className="text-slate-300 font-mono-tabular">
                  {new Date(propertiesTarget.updatedAt).toLocaleString()}
                </dd>
              </div>
            </dl>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setPropertiesTarget(null)}
                className="px-3 py-1.5 rounded-md os-accent-bg text-xs font-medium text-white"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
