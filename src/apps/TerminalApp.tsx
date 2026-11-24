import { useEffect, useRef, useState } from 'react';
import { useSettingsStore } from '../system/settingsStore';
import { execHostShell, fetchHostRoots } from '../system/systemBridge';
import { listDirectory } from '../vfs/treeOps';
import { useVfsStore } from '../vfs/vfsStore';
import { launchApp } from '../windowManager/launcher';
import type { WindowAppProps } from '../windowManager/types';
import { executeTerminalCommand, type TerminalLine } from './terminal/terminalEngine';

const HOST_BOOT_LINES: TerminalLine[] = [
  {
    id: 'boot-1',
    kind: 'info',
    text: 'NizamOS Host Shell — Connected to Linux /bin/bash backend.',
  },
  {
    id: 'boot-2',
    kind: 'info',
    text: "Run real commands (ls, uname -a, pwd, cat) or switch to VFS Shell.",
  },
];

export function TerminalApp({ initialDir, storageMode }: WindowAppProps) {
  const tree = useVfsStore((s) => s.tree);
  const setTree = useVfsStore((s) => s.setTree);
  const username = useSettingsStore((s) => s.username);

  const [shellMode, setShellMode] = useState<'host' | 'vfs'>(storageMode ?? 'host');
  const [hostCwd, setHostCwd] = useState(initialDir && storageMode !== 'vfs' ? initialDir : '');
  const [vfsCwd, setVfsCwd] = useState(initialDir && storageMode === 'vfs' ? initialDir : '/home/user');
  const [lines, setLines] = useState<TerminalLine[]>(HOST_BOOT_LINES);
  const [input, setInput] = useState('');
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!hostCwd) {
      void fetchHostRoots()
        .then((roots) => setHostCwd(roots.homeDir))
        .catch(() => setShellMode('vfs'));
    }
  }, [hostCwd]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const cwd = shellMode === 'host' ? hostCwd || '~' : vfsCwd;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = input;
    const trimmed = raw.trim();
    if (!trimmed && shellMode === 'host') return;

    const cmdLine: TerminalLine = {
      id: `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      kind: 'command',
      text: raw,
      cwd,
    };

    if (trimmed) {
      setHistory((prev) => [trimmed, ...prev.slice(0, 49)]);
    }
    setHistoryIdx(-1);
    setInput('');

    if (shellMode === 'host') {
      if (trimmed === 'clear') {
        setLines([]);
        return;
      }

      if (trimmed.startsWith('open ')) {
        const arg = trimmed.slice(5).trim().toLowerCase();
        if (['files', 'editor', 'terminal', 'calculator', 'browser', 'taskmgr', 'settings', 'media', 'camera'].includes(arg)) {
          launchApp(arg as Parameters<typeof launchApp>[0]);
          setLines((prev) => [
            ...prev,
            cmdLine,
            { id: `out-${Date.now()}`, kind: 'info', text: `Launched ${arg}...` },
          ]);
          return;
        }
      }

      setRunning(true);
      setLines((prev) => [...prev, cmdLine]);
      try {
        const res = await execHostShell(trimmed, hostCwd || '');
        setHostCwd(res.nextCwd);
        const outLines: TerminalLine[] = [];
        if (res.stdout) {
          res.stdout.replace(/\n$/, '').split('\n').forEach((line, idx) => {
            outLines.push({ id: `stdout-${Date.now()}-${idx}`, kind: 'output', text: line });
          });
        }
        if (res.stderr) {
          res.stderr.replace(/\n$/, '').split('\n').forEach((line, idx) => {
            outLines.push({ id: `stderr-${Date.now()}-${idx}`, kind: 'error', text: line });
          });
        }
        if (outLines.length > 0) {
          setLines((prev) => [...prev, ...outLines]);
        }
      } catch (err) {
        setLines((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            kind: 'error',
            text: err instanceof Error ? err.message : 'Host shell execution failed.',
          },
        ]);
      } finally {
        setRunning(false);
      }
      return;
    }

    const result = executeTerminalCommand(raw, vfsCwd, tree, username);
    if (result.nextTree) setTree(result.nextTree);
    setVfsCwd(result.nextCwd);

    if (result.clear) {
      setLines([]);
    } else {
      const outputLines: TerminalLine[] = result.lines.map((l, idx) => ({
        ...l,
        id: `out-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      }));
      setLines((prev) => [...prev, cmdLine, ...outputLines]);
    }

    if (result.openApp) {
      if (result.openApp.appId === 'files' && result.openApp.filePath) {
        launchApp('files', { initialDir: result.openApp.filePath, storageMode: 'vfs' });
      } else {
        launchApp(result.openApp.appId, {
          filePath: result.openApp.filePath,
          storageMode: 'vfs',
        });
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIdx = Math.min(historyIdx + 1, history.length - 1);
      setHistoryIdx(nextIdx);
      setInput(history[nextIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx <= 0) {
        setHistoryIdx(-1);
        setInput('');
      } else {
        const nextIdx = historyIdx - 1;
        setHistoryIdx(nextIdx);
        setInput(history[nextIdx]);
      }
    } else if (e.key === 'Tab' && shellMode === 'vfs') {
      e.preventDefault();
      const parts = input.split(/\s+/);
      const last = parts[parts.length - 1] ?? '';
      if (!last) return;
      const entries = listDirectory(tree, vfsCwd);
      const match = entries.find((item) => item.name.toLowerCase().startsWith(last.toLowerCase()));
      if (match) {
        parts[parts.length - 1] = match.name;
        setInput(parts.join(' '));
      }
    }
  };

  const quickCommands =
    shellMode === 'host'
      ? ['ls -la', 'uname -a', 'cat Documents/host-readme.txt', 'pwd', 'clear']
      : ['ls', 'tree', 'cat Documents/welcome.md', 'help', 'clear'];

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="flex flex-col h-full bg-slate-950 text-slate-100 font-mono text-xs select-text cursor-text"
    >
      {/* Quick Command & Shell Mode Strip */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-slate-800/80 bg-slate-900/70 overflow-x-auto">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-500 shrink-0 mr-1">Quick:</span>
          {quickCommands.map((cmd) => (
            <button
              key={cmd}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setInput(cmd);
                inputRef.current?.focus();
              }}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 whitespace-nowrap shrink-0 transition-colors"
            >
              {cmd}
            </button>
          ))}
        </div>

        <div className="flex items-center bg-slate-950 border border-slate-800 rounded p-0.5 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShellMode('host');
            }}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors whitespace-nowrap ${
              shellMode === 'host'
                ? 'os-accent-bg text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Host Shell
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShellMode('vfs');
            }}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors whitespace-nowrap ${
              shellMode === 'vfs'
                ? 'os-accent-bg text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            VFS Shell
          </button>
        </div>
      </div>

      {/* Output Log */}
      <div className="flex-1 overflow-y-auto os-scroll p-3 space-y-1 leading-relaxed">
        {lines.map((line) => (
          <div key={line.id} className="break-words whitespace-pre-wrap">
            {line.kind === 'command' ? (
              <div>
                <span className="os-accent-text">{username}@nizamos</span>
                <span className="text-slate-500">:</span>
                <span className="text-emerald-400">{line.cwd}</span>
                <span className="text-slate-400">$ </span>
                <span className="text-slate-100">{line.text}</span>
              </div>
            ) : line.kind === 'error' ? (
              <div className="text-red-400">{line.text}</div>
            ) : line.kind === 'info' ? (
              <div className="text-slate-400">{line.text}</div>
            ) : (
              <div className="text-slate-200">{line.text}</div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Prompt Input */}
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="flex items-center gap-1.5 px-3 py-2 border-t border-slate-800/80 bg-slate-900/50"
      >
        <span className="os-accent-text shrink-0">{username}@nizamos</span>
        <span className="text-slate-500 shrink-0">:</span>
        <span className="text-emerald-400 shrink-0 max-w-[160px] truncate">{cwd}</span>
        <span className="text-slate-400 shrink-0">$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          disabled={running}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Terminal command input"
          placeholder={running ? 'Running...' : 'Type a command...'}
          autoFocus
          spellCheck={false}
          autoComplete="off"
          className="flex-1 min-w-0 bg-transparent text-slate-100 placeholder:text-slate-600 focus:outline-none"
        />
      </form>
    </div>
  );
}
