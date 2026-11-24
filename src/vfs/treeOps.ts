import type { VfsEntry, VfsFileNode, VfsFolderNode, VfsNode, VfsOpResult } from './types';

const SEED_TIME = 1763000000000;

function makeFile(id: string, name: string, content: string): VfsFileNode {
  return {
    id,
    name,
    type: 'file',
    content,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  };
}

function makeFolder(
  id: string,
  name: string,
  children: Record<string, VfsNode> = {}
): VfsFolderNode {
  return {
    id,
    name,
    type: 'folder',
    children,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  };
}

export function createDefaultVfsTree(): VfsFolderNode {
  return makeFolder('root', '', {
    home: makeFolder('home', 'home', {
      user: makeFolder('user', 'user', {
        Documents: makeFolder('docs', 'Documents', {
          'welcome.md': makeFile(
            'welcome-md',
            'welcome.md',
            `# Welcome to NizamOS\n\nمرحباً بك في نظام تشغيل الويب المتكامل.\n\n- Drag and resize any window freely.\n- Files and folders persist locally inside IndexedDB as a JSON tree.\n- Try opening Terminal and running: ls, mkdir demo, touch note.txt, or open calc.\n`
          ),
          'architecture.txt': makeFile(
            'arch-txt',
            'architecture.txt',
            `NizamOS Core Architecture\n=========================\n1. Window Manager: Zustand store + react-rnd\n2. Virtual File System: Immutable JSON Tree stored in IndexedDB\n3. Core Applications: File Manager, Terminal, Text Editor, Modular Calculator\n`
          ),
        }),
        Projects: makeFolder('projects', 'Projects', {
          'calculator-modules.md': makeFile(
            'calc-md',
            'calculator-modules.md',
            `# Calculator Modules\n\nIntegrated modes inside the Calculator app:\n- Standard Arithmetic & Memory (MC/MR/M+/M-)\n- Scientific Trigonometry & Exponents (sin, cos, tan, ln, log, x^y)\n- Programmer Base Converter & Bitwise Ops (HEX, DEC, OCT, BIN)\n- Unit Converter (Length, Storage, Temperature)\n`
          ),
          'roadmap.txt': makeFile(
            'roadmap-txt',
            'roadmap.txt',
            `[x] Window Manager (Zustand + react-rnd)\n[x] Taskbar & Start Menu\n[x] IndexedDB JSON Tree VFS\n[x] File Manager, Terminal, Text Editor, Calculator\n`
          ),
        }),
        Notes: makeFolder('notes', 'Notes', {
          'todo.txt': makeFile(
            'todo-txt',
            'todo.txt',
            `Daily Tasks:\n1. Test creating a new folder in File Manager\n2. Edit and save a file in Text Editor\n3. Reload browser to confirm IndexedDB persistence\n`
          ),
        }),
      }),
    }),
  });
}

export function splitPath(path: string): string[] {
  return path.split('/').filter((segment) => segment.length > 0);
}

export function normalizePath(inputPath: string, cwd: string = '/home/user'): string {
  const raw = inputPath.trim();
  const baseSegments = raw.startsWith('/') ? [] : splitPath(cwd);
  const parts = splitPath(raw);

  for (const part of parts) {
    if (part === '.') continue;
    if (part === '..') {
      baseSegments.pop();
    } else {
      baseSegments.push(part);
    }
  }

  return '/' + baseSegments.join('/');
}

export function getParentPath(path: string): string {
  const normalized = normalizePath(path, '/');
  const parts = splitPath(normalized);
  if (parts.length <= 1) return '/';
  return '/' + parts.slice(0, -1).join('/');
}

export function getBaseName(path: string): string {
  const normalized = normalizePath(path, '/');
  const parts = splitPath(normalized);
  return parts[parts.length - 1] ?? '';
}

export function resolveNode(tree: VfsFolderNode, path: string, cwd: string = '/'): VfsNode | null {
  const normalized = normalizePath(path, cwd);
  if (normalized === '/') return tree;

  const segments = splitPath(normalized);
  let current: VfsNode = tree;

  for (const segment of segments) {
    if (current.type !== 'folder') return null;
    const next: VfsNode | undefined = current.children[segment];
    if (!next) return null;
    current = next;
  }

  return current;
}

export function listDirectory(tree: VfsFolderNode, path: string): VfsNode[] {
  const node = resolveNode(tree, path, '/');
  if (!node || node.type !== 'folder') return [];
  return Object.values(node.children).sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

export function validateNodeName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Name cannot be empty.';
  if (trimmed === '.' || trimmed === '..') return 'Invalid name.';
  if (trimmed.includes('/')) return 'Name cannot contain "/".';
  return null;
}

function updateFolderAtPath(
  root: VfsFolderNode,
  segments: string[],
  updater: (folder: VfsFolderNode) => VfsFolderNode
): VfsFolderNode {
  if (segments.length === 0) {
    return updater(root);
  }
  const [head, ...rest] = segments;
  const child = root.children[head];
  if (!child || child.type !== 'folder') {
    return root;
  }
  const updatedChild = updateFolderAtPath(child, rest, updater);
  return {
    ...root,
    updatedAt: Date.now(),
    children: {
      ...root.children,
      [head]: updatedChild,
    },
  };
}

function makeUniqueId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createFolder(
  tree: VfsFolderNode,
  parentPath: string,
  folderName: string
): VfsOpResult<VfsFolderNode> {
  const nameErr = validateNodeName(folderName);
  if (nameErr) return { ok: false, tree, error: nameErr };

  const cleanName = folderName.trim();
  const normalizedParent = normalizePath(parentPath, '/');
  const parentNode = resolveNode(tree, normalizedParent, '/');

  if (!parentNode || parentNode.type !== 'folder') {
    return { ok: false, tree, error: `Directory not found: ${normalizedParent}` };
  }
  if (parentNode.children[cleanName]) {
    return { ok: false, tree, error: `Item already exists: ${cleanName}` };
  }

  const now = Date.now();
  const newFolder: VfsFolderNode = {
    id: makeUniqueId('dir'),
    name: cleanName,
    type: 'folder',
    children: {},
    createdAt: now,
    updatedAt: now,
  };

  const nextTree = updateFolderAtPath(tree, splitPath(normalizedParent), (folder) => ({
    ...folder,
    updatedAt: now,
    children: {
      ...folder.children,
      [cleanName]: newFolder,
    },
  }));

  return { ok: true, tree: nextTree, data: newFolder };
}

export function writeFile(
  tree: VfsFolderNode,
  parentPath: string,
  fileName: string,
  content: string
): VfsOpResult<VfsFileNode> {
  const nameErr = validateNodeName(fileName);
  if (nameErr) return { ok: false, tree, error: nameErr };

  const cleanName = fileName.trim();
  const normalizedParent = normalizePath(parentPath, '/');
  const parentNode = resolveNode(tree, normalizedParent, '/');

  if (!parentNode || parentNode.type !== 'folder') {
    return { ok: false, tree, error: `Directory not found: ${normalizedParent}` };
  }

  const existing = parentNode.children[cleanName];
  if (existing && existing.type === 'folder') {
    return { ok: false, tree, error: `Cannot overwrite folder "${cleanName}" with a file.` };
  }

  const now = Date.now();
  const nextFile: VfsFileNode = existing
    ? {
        ...existing,
        content,
        updatedAt: now,
      }
    : {
        id: makeUniqueId('file'),
        name: cleanName,
        type: 'file',
        content,
        createdAt: now,
        updatedAt: now,
      };

  const nextTree = updateFolderAtPath(tree, splitPath(normalizedParent), (folder) => ({
    ...folder,
    updatedAt: now,
    children: {
      ...folder.children,
      [cleanName]: nextFile,
    },
  }));

  return { ok: true, tree: nextTree, data: nextFile };
}

export function deleteNode(tree: VfsFolderNode, targetPath: string): VfsOpResult<null> {
  const normalized = normalizePath(targetPath, '/');
  if (normalized === '/' || normalized === '/home' || normalized === '/home/user') {
    return { ok: false, tree, error: `Protected system path cannot be deleted: ${normalized}` };
  }

  const parentPath = getParentPath(normalized);
  const name = getBaseName(normalized);
  const parentNode = resolveNode(tree, parentPath, '/');

  if (!parentNode || parentNode.type !== 'folder' || !parentNode.children[name]) {
    return { ok: false, tree, error: `Item not found: ${normalized}` };
  }

  const now = Date.now();
  const nextTree = updateFolderAtPath(tree, splitPath(parentPath), (folder) => {
    const rest = { ...folder.children };
    delete rest[name];
    return {
      ...folder,
      updatedAt: now,
      children: rest,
    };
  });

  return { ok: true, tree: nextTree, data: null };
}

export function renameNode(
  tree: VfsFolderNode,
  targetPath: string,
  newName: string
): VfsOpResult<VfsNode> {
  const nameErr = validateNodeName(newName);
  if (nameErr) return { ok: false, tree, error: nameErr };

  const normalized = normalizePath(targetPath, '/');
  if (normalized === '/' || normalized === '/home' || normalized === '/home/user') {
    return { ok: false, tree, error: `Protected system path cannot be renamed: ${normalized}` };
  }

  const cleanNewName = newName.trim();
  const parentPath = getParentPath(normalized);
  const oldName = getBaseName(normalized);
  const parentNode = resolveNode(tree, parentPath, '/');

  if (!parentNode || parentNode.type !== 'folder') {
    return { ok: false, tree, error: `Directory not found: ${parentPath}` };
  }

  const target = parentNode.children[oldName];
  if (!target) {
    return { ok: false, tree, error: `Item not found: ${normalized}` };
  }

  if (cleanNewName === oldName) {
    return { ok: true, tree, data: target };
  }

  if (parentNode.children[cleanNewName]) {
    return { ok: false, tree, error: `An item named "${cleanNewName}" already exists.` };
  }

  const now = Date.now();
  const renamed: VfsNode = {
    ...target,
    name: cleanNewName,
    updatedAt: now,
  };

  const nextTree = updateFolderAtPath(tree, splitPath(parentPath), (folder) => {
    const rest = { ...folder.children };
    delete rest[oldName];
    rest[cleanNewName] = renamed;
    return {
      ...folder,
      updatedAt: now,
      children: rest,
    };
  });

  return { ok: true, tree: nextTree, data: renamed };
}

export function readFileContent(tree: VfsFolderNode, filePath: string): { ok: boolean; content?: string; error?: string } {
  const normalized = normalizePath(filePath, '/');
  const node = resolveNode(tree, normalized, '/');
  if (!node) return { ok: false, error: `File not found: ${normalized}` };
  if (node.type !== 'file') return { ok: false, error: `Path is a directory: ${normalized}` };
  return { ok: true, content: node.content };
}

export function searchNodes(tree: VfsFolderNode, query: string, limit: number = 25): VfsEntry[] {
  const q = query.trim().toLowerCase();
  const results: VfsEntry[] = [];

  function walk(folder: VfsFolderNode, currentPath: string) {
    if (results.length >= limit) return;
    for (const child of Object.values(folder.children)) {
      const childPath = currentPath === '/' ? `/${child.name}` : `${currentPath}/${child.name}`;
      if (!q || child.name.toLowerCase().includes(q)) {
        results.push({ path: childPath, node: child });
      }
      if (child.type === 'folder') {
        walk(child, childPath);
      }
      if (results.length >= limit) break;
    }
  }

  walk(tree, '/');
  return results;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
