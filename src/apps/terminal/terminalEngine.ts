import {
  createFolder,
  deleteNode,
  getBaseName,
  getParentPath,
  listDirectory,
  normalizePath,
  readFileContent,
  renameNode,
  resolveNode,
  writeFile,
} from '../../vfs/treeOps';
import type { VfsFolderNode } from '../../vfs/types';
import type { AppId } from '../../windowManager/types';
import { evaluateExpression, formatCalcNumber } from '../calculator/calcEngine';

export interface TerminalLine {
  id: string;
  kind: 'command' | 'output' | 'error' | 'info';
  text: string;
  cwd?: string;
}

export interface TerminalExecResult {
  lines: Omit<TerminalLine, 'id'>[];
  nextCwd: string;
  nextTree?: VfsFolderNode;
  clear?: boolean;
  openApp?: {
    appId: AppId;
    filePath?: string;
  };
}

function tokenizeCommand(input: string): string[] {
  const args: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quote) {
      if (ch === quote) {
        quote = null;
      } else {
        current += ch;
      }
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (/\s/.test(ch)) {
      if (current.length > 0) {
        args.push(current);
        current = '';
      }
    } else {
      current += ch;
    }
  }
  if (current.length > 0) args.push(current);
  return args;
}

function buildAsciiTree(folder: VfsFolderNode, prefix: string = ''): string[] {
  const entries = Object.values(folder.children).sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  const lines: string[] = [];
  entries.forEach((entry, idx) => {
    const isLast = idx === entries.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    lines.push(`${prefix}${connector}${entry.name}${entry.type === 'folder' ? '/' : ''}`);
    if (entry.type === 'folder') {
      lines.push(...buildAsciiTree(entry, prefix + (isLast ? '    ' : '│   ')));
    }
  });
  return lines;
}

export function executeTerminalCommand(
  rawInput: string,
  cwd: string,
  tree: VfsFolderNode,
  username: string = 'user'
): TerminalExecResult {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { lines: [], nextCwd: cwd };
  }

  // Handle simple echo redirection: echo "hello" > file.txt
  const redirectMatch = trimmed.match(/^echo\s+(.+?)\s*(>>|>)\s*(\S+)$/);
  if (redirectMatch) {
    const [, rawText, op, target] = redirectMatch;
    const text = rawText.replace(/^["']|["']$/g, '');
    const fullPath = normalizePath(target, cwd);
    const parent = getParentPath(fullPath);
    const name = getBaseName(fullPath);
    let finalContent = text;
    if (op === '>>') {
      const existing = readFileContent(tree, fullPath);
      if (existing.ok && existing.content !== undefined) {
        finalContent = existing.content ? `${existing.content}\n${text}` : text;
      }
    }
    const res = writeFile(tree, parent, name, finalContent);
    if (!res.ok) {
      return {
        lines: [{ kind: 'error', text: res.error ?? 'Failed to write file.' }],
        nextCwd: cwd,
      };
    }
    return {
      lines: [{ kind: 'info', text: `Saved ${fullPath}` }],
      nextCwd: cwd,
      nextTree: res.tree,
    };
  }

  const tokens = tokenizeCommand(trimmed);
  const cmd = tokens[0]?.toLowerCase() ?? '';
  const args = tokens.slice(1);

  switch (cmd) {
    case 'help':
      return {
        nextCwd: cwd,
        lines: [
          { kind: 'info', text: 'NizamOS Shell — Available commands:' },
          { kind: 'output', text: '  ls [path]             List directory contents' },
          { kind: 'output', text: '  cd <path>             Change directory (supports .., ~, /)' },
          { kind: 'output', text: '  pwd                   Print working directory' },
          { kind: 'output', text: '  tree [path]           Display folder hierarchy' },
          { kind: 'output', text: '  cat <file>            Print file contents' },
          { kind: 'output', text: '  mkdir <name>          Create a new folder' },
          { kind: 'output', text: '  touch <file>          Create an empty file' },
          { kind: 'output', text: '  echo "text" > <file>  Write text to a file' },
          { kind: 'output', text: '  mv <src> <newName>    Rename file or folder' },
          { kind: 'output', text: '  rm <path>             Delete file or folder' },
          { kind: 'output', text: '  calc <expr>           Evaluate math expression' },
          { kind: 'output', text: '  open <app|file>       Launch files, editor, calc, browser, settings, taskmgr' },
          { kind: 'output', text: '  whoami / date / clear System utilities' },
        ],
      };

    case 'clear':
      return { lines: [], nextCwd: cwd, clear: true };

    case 'pwd':
      return { lines: [{ kind: 'output', text: cwd }], nextCwd: cwd };

    case 'whoami':
      return { lines: [{ kind: 'output', text: `${username}@nizamos` }], nextCwd: cwd };

    case 'date':
      return { lines: [{ kind: 'output', text: new Date().toLocaleString() }], nextCwd: cwd };

    case 'echo':
      return { lines: [{ kind: 'output', text: args.join(' ') }], nextCwd: cwd };

    case 'ls': {
      const targetArg = args[0] === '~' ? '/home/user' : args[0] ?? '.';
      const targetPath = normalizePath(targetArg, cwd);
      const node = resolveNode(tree, targetPath, '/');
      if (!node) {
        return {
          nextCwd: cwd,
          lines: [{ kind: 'error', text: `ls: cannot access '${targetArg}': No such file or directory` }],
        };
      }
      if (node.type === 'file') {
        return { nextCwd: cwd, lines: [{ kind: 'output', text: node.name }] };
      }
      const items = listDirectory(tree, targetPath);
      if (items.length === 0) {
        return { nextCwd: cwd, lines: [{ kind: 'info', text: '(empty directory)' }] };
      }
      const formatted = items.map((item) =>
        item.type === 'folder' ? `${item.name}/` : `${item.name} (${item.content.length} B)`
      );
      return {
        nextCwd: cwd,
        lines: formatted.map((text) => ({ kind: 'output', text })),
      };
    }

    case 'cd': {
      const rawTarget = !args[0] || args[0] === '~' ? '/home/user' : args[0];
      const nextPath = normalizePath(rawTarget.replace(/^~(?=\/)/, '/home/user'), cwd);
      const node = resolveNode(tree, nextPath, '/');
      if (!node) {
        return {
          nextCwd: cwd,
          lines: [{ kind: 'error', text: `cd: no such directory: ${rawTarget}` }],
        };
      }
      if (node.type !== 'folder') {
        return {
          nextCwd: cwd,
          lines: [{ kind: 'error', text: `cd: not a directory: ${rawTarget}` }],
        };
      }
      return { lines: [], nextCwd: nextPath };
    }

    case 'tree': {
      const targetPath = normalizePath(args[0] ?? '.', cwd);
      const node = resolveNode(tree, targetPath, '/');
      if (!node || node.type !== 'folder') {
        return {
          nextCwd: cwd,
          lines: [{ kind: 'error', text: `tree: invalid directory '${args[0] ?? '.'}'` }],
        };
      }
      const lines = buildAsciiTree(node);
      return {
        nextCwd: cwd,
        lines: [
          { kind: 'info', text: targetPath },
          ...(lines.length > 0
            ? lines.map((text) => ({ kind: 'output' as const, text }))
            : [{ kind: 'info' as const, text: '(empty)' }]),
        ],
      };
    }

    case 'cat': {
      if (!args[0]) {
        return { nextCwd: cwd, lines: [{ kind: 'error', text: 'cat: missing file operand' }] };
      }
      const fullPath = normalizePath(args[0], cwd);
      const res = readFileContent(tree, fullPath);
      if (!res.ok) {
        return { nextCwd: cwd, lines: [{ kind: 'error', text: res.error ?? 'Read error' }] };
      }
      const contentLines = (res.content ?? '').split('\n');
      return {
        nextCwd: cwd,
        lines: contentLines.map((text) => ({ kind: 'output', text })),
      };
    }

    case 'mkdir': {
      if (!args[0]) {
        return { nextCwd: cwd, lines: [{ kind: 'error', text: 'mkdir: missing folder name' }] };
      }
      const fullPath = normalizePath(args[0], cwd);
      const parent = getParentPath(fullPath);
      const name = getBaseName(fullPath);
      const res = createFolder(tree, parent, name);
      if (!res.ok) {
        return { nextCwd: cwd, lines: [{ kind: 'error', text: res.error ?? 'mkdir failed' }] };
      }
      return {
        nextCwd: cwd,
        nextTree: res.tree,
        lines: [{ kind: 'info', text: `Created directory ${fullPath}` }],
      };
    }

    case 'touch': {
      if (!args[0]) {
        return { nextCwd: cwd, lines: [{ kind: 'error', text: 'touch: missing file name' }] };
      }
      const fullPath = normalizePath(args[0], cwd);
      const existing = resolveNode(tree, fullPath, '/');
      if (existing) {
        return { nextCwd: cwd, lines: [{ kind: 'info', text: `File already exists: ${fullPath}` }] };
      }
      const parent = getParentPath(fullPath);
      const name = getBaseName(fullPath);
      const res = writeFile(tree, parent, name, '');
      if (!res.ok) {
        return { nextCwd: cwd, lines: [{ kind: 'error', text: res.error ?? 'touch failed' }] };
      }
      return {
        nextCwd: cwd,
        nextTree: res.tree,
        lines: [{ kind: 'info', text: `Created file ${fullPath}` }],
      };
    }

    case 'rm': {
      if (!args[0]) {
        return { nextCwd: cwd, lines: [{ kind: 'error', text: 'rm: missing path' }] };
      }
      const fullPath = normalizePath(args[0], cwd);
      const res = deleteNode(tree, fullPath);
      if (!res.ok) {
        return { nextCwd: cwd, lines: [{ kind: 'error', text: res.error ?? 'rm failed' }] };
      }
      return {
        nextCwd: cwd,
        nextTree: res.tree,
        lines: [{ kind: 'info', text: `Removed ${fullPath}` }],
      };
    }

    case 'mv': {
      if (args.length < 2) {
        return { nextCwd: cwd, lines: [{ kind: 'error', text: 'mv: usage: mv <path> <newName>' }] };
      }
      const fullPath = normalizePath(args[0], cwd);
      const res = renameNode(tree, fullPath, args[1]);
      if (!res.ok) {
        return { nextCwd: cwd, lines: [{ kind: 'error', text: res.error ?? 'mv failed' }] };
      }
      return {
        nextCwd: cwd,
        nextTree: res.tree,
        lines: [{ kind: 'info', text: `Renamed to ${args[1]}` }],
      };
    }

    case 'calc': {
      const expr = args.join(' ');
      if (!expr) {
        return { nextCwd: cwd, lines: [{ kind: 'error', text: 'calc: usage: calc <expression>' }] };
      }
      try {
        const val = evaluateExpression(expr);
        return { nextCwd: cwd, lines: [{ kind: 'output', text: `= ${formatCalcNumber(val)}` }] };
      } catch (err) {
        return {
          nextCwd: cwd,
          lines: [{ kind: 'error', text: err instanceof Error ? err.message : 'Invalid expression' }],
        };
      }
    }

    case 'open': {
      const target = args[0];
      if (!target) {
        return {
          nextCwd: cwd,
          lines: [{ kind: 'error', text: 'open: specify app name or file path' }],
        };
      }
      const lower = target.toLowerCase();
      if (lower === 'files' || lower === 'explorer') {
        return { nextCwd: cwd, lines: [{ kind: 'info', text: 'Opening File Manager...' }], openApp: { appId: 'files' } };
      }
      if (lower === 'calc' || lower === 'calculator') {
        return { nextCwd: cwd, lines: [{ kind: 'info', text: 'Opening Calculator...' }], openApp: { appId: 'calculator' } };
      }
      if (lower === 'editor' || lower === 'notepad') {
        return { nextCwd: cwd, lines: [{ kind: 'info', text: 'Opening Text Editor...' }], openApp: { appId: 'editor' } };
      }
      if (lower === 'terminal') {
        return { nextCwd: cwd, lines: [{ kind: 'info', text: 'Opening Terminal...' }], openApp: { appId: 'terminal' } };
      }
      if (lower === 'settings') {
        return { nextCwd: cwd, lines: [{ kind: 'info', text: 'Opening Settings...' }], openApp: { appId: 'settings' } };
      }
      if (lower === 'taskmgr' || lower === 'tasks') {
        return { nextCwd: cwd, lines: [{ kind: 'info', text: 'Opening Task Manager...' }], openApp: { appId: 'taskmgr' } };
      }
      if (lower === 'browser' || lower === 'web') {
        return { nextCwd: cwd, lines: [{ kind: 'info', text: 'Opening Web Browser...' }], openApp: { appId: 'browser' } };
      }

      const fullPath = normalizePath(target, cwd);
      const node = resolveNode(tree, fullPath, '/');
      if (!node) {
        return { nextCwd: cwd, lines: [{ kind: 'error', text: `open: not found '${target}'` }] };
      }
      if (node.type === 'folder') {
        return {
          nextCwd: cwd,
          lines: [{ kind: 'info', text: `Opening folder ${fullPath}...` }],
          openApp: { appId: 'files', filePath: fullPath },
        };
      }
      return {
        nextCwd: cwd,
        lines: [{ kind: 'info', text: `Opening ${fullPath} in Text Editor...` }],
        openApp: { appId: 'editor', filePath: fullPath },
      };
    }

    default:
      return {
        nextCwd: cwd,
        lines: [
          {
            kind: 'error',
            text: `Command not found: ${cmd}. Type 'help' to see available commands.`,
          },
        ],
      };
  }
}
