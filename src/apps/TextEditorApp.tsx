import { useEffect, useMemo, useState } from 'react';
import { FilePlus, FolderOpen, Save, X } from 'lucide-react';
import { useNotificationStore } from '../system/notificationStore';
import {
  fetchHostRoots,
  listHostDirectory,
  readHostFile,
  writeHostFile,
  type HostFsEntry,
} from '../system/systemBridge';
import {
  getBaseName,
  getParentPath,
  normalizePath,
  readFileContent,
  searchNodes,
} from '../vfs/treeOps';
import { useVfsStore } from '../vfs/vfsStore';
import { useWindowStore } from '../windowManager/useWindowStore';
import type { WindowAppProps } from '../windowManager/types';

export function TextEditorApp({
  windowId,
  filePath: initialFilePath,
  storageMode: initialMode,
}: WindowAppProps) {
  const tree = useVfsStore((s) => s.tree);
  const saveFile = useVfsStore((s) => s.saveFile);
  const updateWindowTitle = useWindowStore((s) => s.updateWindowTitle);
  const pushNotification = useNotificationStore((s) => s.pushNotification);

  const [storageMode, setStorageMode] = useState<'host' | 'vfs'>(
    initialMode ?? (initialFilePath?.startsWith('/home/user/') ? 'vfs' : 'host')
  );
  const [activePath, setActivePath] = useState<string>(
    initialFilePath ?? (initialMode === 'vfs' ? '/home/user/Documents/welcome.md' : '')
  );
  const [hostDocsDir, setHostDocsDir] = useState<string>('');
  const [hostFiles, setHostFiles] = useState<HostFsEntry[]>([]);
  const [content, setContent] = useState<string>('');
  const [savedSnapshot, setSavedSnapshot] = useState<string>('');
  const [showOpenDrawer, setShowOpenDrawer] = useState(false);
  const [showSaveAs, setShowSaveAs] = useState(false);
  const [saveAsPath, setSaveAsPath] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');

  // Resolve host Documents directory on mount
  useEffect(() => {
    void fetchHostRoots()
      .then(async (roots) => {
        setHostDocsDir(roots.documentsDir);
        const listing = await listHostDirectory(roots.documentsDir).catch(() => ({
          path: roots.documentsDir,
          items: [] as HostFsEntry[],
        }));
        setHostFiles(listing.items.filter((i) => i.type === 'file'));
        if (!initialFilePath && storageMode === 'host') {
          setActivePath(`${roots.documentsDir}/host-readme.txt`);
        }
      })
      .catch(() => {
        if (!initialFilePath) {
          setStorageMode('vfs');
          setActivePath('/home/user/Documents/welcome.md');
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load active file from Host Disk or VFS
  useEffect(() => {
    if (!activePath) return;

    if (storageMode === 'host') {
      let active = true;
      void readHostFile(activePath)
        .then((res) => {
          if (!active) return;
          setContent(res.content);
          setSavedSnapshot(res.content);
          updateWindowTitle(windowId, `Text Editor — ${getBaseName(activePath)}`);
        })
        .catch(() => {
          if (!active) return;
          setContent('');
          setSavedSnapshot('');
          updateWindowTitle(windowId, `Text Editor — ${getBaseName(activePath) || 'Untitled'}`);
        });
      return () => {
        active = false;
      };
    }

    const res = readFileContent(tree, activePath);
    if (res.ok && res.content !== undefined) {
      setContent(res.content);
      setSavedSnapshot(res.content);
      updateWindowTitle(windowId, `Text Editor — ${getBaseName(activePath)}`);
    } else if (!initialFilePath) {
      setContent('');
      setSavedSnapshot('');
      updateWindowTitle(windowId, 'Text Editor — Untitled');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePath, storageMode]);

  const isDirty = content !== savedSnapshot;

  const stats = useMemo(() => {
    const lines = content ? content.split('\n').length : 1;
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    const chars = content.length;
    return { lines, words, chars };
  }, [content]);

  const allVfsFiles = useMemo(() => {
    return searchNodes(tree, '', 50).filter((item) => item.node.type === 'file');
  }, [tree]);

  const handleSave = async () => {
    if (storageMode === 'host') {
      const target = activePath || `${hostDocsDir || '/tmp'}/note-${Date.now().toString().slice(-4)}.txt`;
      try {
        await writeHostFile(target, content);
        setActivePath(target);
        setSavedSnapshot(content);
        const name = getBaseName(target);
        updateWindowTitle(windowId, `Text Editor — ${name}`);
        setStatusMessage('Saved to Host Disk');
        pushNotification('File Saved', `Saved "${name}" to host disk.`, 'files');
        if (hostDocsDir) {
          const listing = await listHostDirectory(hostDocsDir).catch(() => null);
          if (listing) setHostFiles(listing.items.filter((i) => i.type === 'file'));
        }
        setTimeout(() => setStatusMessage(null), 2000);
      } catch (err) {
        setStatusMessage(err instanceof Error ? err.message : 'Host save failed');
      }
      return;
    }

    const normalized = normalizePath(activePath, '/home/user');
    const parent = getParentPath(normalized);
    const name = getBaseName(normalized);
    const res = saveFile(parent, name, content);
    if (res.ok) {
      setSavedSnapshot(content);
      setActivePath(normalized);
      updateWindowTitle(windowId, `Text Editor — ${name}`);
      setStatusMessage('Saved to IndexedDB');
      pushNotification('File Saved', `Saved "${name}" to IndexedDB.`, 'files');
      setTimeout(() => setStatusMessage(null), 2000);
    } else {
      setStatusMessage(res.error ?? 'Save failed');
    }
  };

  const handleSaveAsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (storageMode === 'host') {
      const target = saveAsPath.trim();
      if (!target) return;
      try {
        await writeHostFile(target, content);
        setActivePath(target);
        setSavedSnapshot(content);
        setShowSaveAs(false);
        updateWindowTitle(windowId, `Text Editor — ${getBaseName(target)}`);
        setStatusMessage(`Saved to ${target}`);
        setTimeout(() => setStatusMessage(null), 2000);
      } catch (err) {
        setStatusMessage(err instanceof Error ? err.message : 'Host save failed');
      }
      return;
    }

    const target = normalizePath(saveAsPath, '/home/user/Documents');
    const parent = getParentPath(target);
    const name = getBaseName(target);
    const res = saveFile(parent, name, content);
    if (res.ok) {
      setActivePath(target);
      setSavedSnapshot(content);
      setShowSaveAs(false);
      updateWindowTitle(windowId, `Text Editor — ${name}`);
      setStatusMessage(`Saved as ${target}`);
      setTimeout(() => setStatusMessage(null), 2000);
    } else {
      setStatusMessage(res.error ?? 'Could not save file');
    }
  };

  const handleNewFile = () => {
    const suffix = Date.now().toString().slice(-4);
    const untitledPath =
      storageMode === 'host'
        ? `${hostDocsDir || '/tmp'}/note-${suffix}.txt`
        : `/home/user/Notes/note-${suffix}.txt`;
    setActivePath(untitledPath);
    setContent('');
    setSavedSnapshot('');
    updateWindowTitle(windowId, `Text Editor — ${getBaseName(untitledPath)}`);
  };

  const fontClass =
    fontSize === 'sm' ? 'text-xs' : fontSize === 'lg' ? 'text-base' : 'text-sm';

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-slate-800 bg-slate-950/60">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleNewFile}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors whitespace-nowrap"
          >
            <FilePlus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>

          <button
            type="button"
            onClick={() => setShowOpenDrawer((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors whitespace-nowrap"
          >
            <FolderOpen className="w-3.5 h-3.5 os-accent-text" />
            <span>Open</span>
          </button>

          <button
            type="button"
            onClick={() => void handleSave()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md os-accent-bg text-xs font-medium text-white transition-colors whitespace-nowrap"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSaveAsPath(activePath);
              setShowSaveAs((v) => !v);
            }}
            className="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors whitespace-nowrap"
          >
            Save As
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-md p-0.5">
            {(['host', 'vfs'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setStorageMode(m);
                  if (m === 'vfs' && !activePath.startsWith('/home/user')) {
                    setActivePath('/home/user/Documents/welcome.md');
                  } else if (m === 'host' && hostDocsDir && activePath.startsWith('/home/user/')) {
                    setActivePath(`${hostDocsDir}/host-readme.txt`);
                  }
                }}
                className={`px-2 py-0.5 text-[11px] font-medium rounded ${
                  storageMode === m
                    ? 'os-accent-soft-bg os-accent-text'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m === 'host' ? 'Host' : 'VFS'}
              </button>
            ))}
          </div>

          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-md p-0.5">
            {(['sm', 'md', 'lg'] as const).map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => setFontSize(sz)}
                aria-label={`Font size ${sz}`}
                className={`px-2 py-0.5 text-[11px] font-medium rounded uppercase ${
                  fontSize === sz ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {sz}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Save As inline bar */}
      {showSaveAs && (
        <form
          onSubmit={(e) => void handleSaveAsSubmit(e)}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800/80 border-b border-slate-700"
        >
          <label htmlFor="save-as-input" className="text-xs text-slate-300 shrink-0">
            Path:
          </label>
          <input
            id="save-as-input"
            type="text"
            value={saveAsPath}
            onChange={(e) => setSaveAsPath(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-slate-100 focus:outline-none focus:border-[var(--os-accent-hover)]"
          />
          <button
            type="submit"
            className="px-3 py-1 rounded os-accent-bg text-xs font-medium text-white"
          >
            Save File
          </button>
          <button
            type="button"
            onClick={() => setShowSaveAs(false)}
            aria-label="Close Save As"
            className="p-1 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* Main Workspace */}
      <div className="flex-1 flex min-h-0">
        {showOpenDrawer && (
          <div className="w-56 shrink-0 border-r border-slate-800 bg-slate-950/70 flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
              <span className="text-xs font-medium text-slate-300">
                {storageMode === 'host' ? 'Host Documents' : 'Open from VFS'}
              </span>
              <button
                type="button"
                onClick={() => setShowOpenDrawer(false)}
                aria-label="Close file picker"
                className="text-slate-400 hover:text-slate-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto os-scroll p-1.5 space-y-0.5">
              {storageMode === 'host'
                ? hostFiles.map((entry) => (
                    <button
                      key={entry.path}
                      type="button"
                      onClick={() => {
                        setActivePath(entry.path);
                        setShowOpenDrawer(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors ${
                        activePath === entry.path
                          ? 'os-accent-soft-bg os-accent-text'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="font-medium truncate">{entry.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">{entry.path}</div>
                    </button>
                  ))
                : allVfsFiles.map((entry) => (
                    <button
                      key={entry.path}
                      type="button"
                      onClick={() => {
                        setActivePath(entry.path);
                        setShowOpenDrawer(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors ${
                        activePath === entry.path
                          ? 'os-accent-soft-bg os-accent-text'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="font-medium truncate">{entry.node.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">{entry.path}</div>
                    </button>
                  ))}
            </div>
          </div>
        )}

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
              e.preventDefault();
              void handleSave();
            }
          }}
          dir="auto"
          spellCheck={false}
          aria-label="Document content"
          placeholder="Start typing your document..."
          className={`flex-1 w-full h-full resize-none bg-slate-900 p-4 text-slate-100 placeholder:text-slate-600 focus:outline-none leading-relaxed font-mono os-scroll select-text ${fontClass}`}
        />
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between gap-4 px-3 py-1.5 border-t border-slate-800 bg-slate-950/70 text-[11px] text-slate-400 font-mono-tabular">
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate">{activePath || 'Untitled'}</span>
          <span aria-hidden="true">·</span>
          <span className={isDirty ? 'text-amber-400' : 'text-slate-400'}>
            {statusMessage ?? (isDirty ? 'Unsaved changes' : `Saved (${storageMode === 'host' ? 'Host' : 'VFS'})`)}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span>{stats.lines} ln</span>
          <span aria-hidden="true">·</span>
          <span>{stats.words} words</span>
          <span aria-hidden="true">·</span>
          <span>{stats.chars} chars</span>
        </div>
      </div>
    </div>
  );
}
