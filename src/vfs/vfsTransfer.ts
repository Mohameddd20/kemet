import type { VfsFolderNode, VfsNode } from './types';

export interface VfsStorageStats {
  totalFiles: number;
  totalFolders: number;
  contentBytes: number;
  serializedBytes: number;
  quotaBytes: number;
  usagePercent: number;
  largestFiles: { name: string; path: string; bytes: number }[];
}

export interface VfsBackupPayload {
  format: 'nizamos-vfs-v1';
  exportedAt: string;
  tree: VfsFolderNode;
}

const DEFAULT_QUOTA_BYTES = 5 * 1024 * 1024; // 5 MB virtual partition display quota

export function calculateVfsStats(
  tree: VfsFolderNode,
  quotaBytes: number = DEFAULT_QUOTA_BYTES
): VfsStorageStats {
  let totalFiles = 0;
  let totalFolders = 0;
  let contentBytes = 0;
  const fileSizes: { name: string; path: string; bytes: number }[] = [];

  function walk(node: VfsFolderNode, currentPath: string) {
    for (const child of Object.values(node.children)) {
      const childPath = currentPath === '/' ? `/${child.name}` : `${currentPath}/${child.name}`;
      if (child.type === 'folder') {
        totalFolders += 1;
        walk(child, childPath);
      } else {
        totalFiles += 1;
        const byteSize = new TextEncoder().encode(child.content).length;
        contentBytes += byteSize;
        fileSizes.push({ name: child.name, path: childPath, bytes: byteSize });
      }
    }
  }

  walk(tree, '/');

  const serializedBytes = new TextEncoder().encode(JSON.stringify(tree)).length;
  const usagePercent = Math.min(
    100,
    Math.round((serializedBytes / Math.max(1, quotaBytes)) * 1000) / 10
  );

  fileSizes.sort((a, b) => b.bytes - a.bytes);

  return {
    totalFiles,
    totalFolders,
    contentBytes,
    serializedBytes,
    quotaBytes,
    usagePercent,
    largestFiles: fileSizes.slice(0, 5),
  };
}

export function serializeVfsBackup(tree: VfsFolderNode): string {
  const payload: VfsBackupPayload = {
    format: 'nizamos-vfs-v1',
    exportedAt: new Date().toISOString(),
    tree,
  };
  return JSON.stringify(payload, null, 2);
}

function isValidVfsNode(node: unknown): node is VfsNode {
  if (!node || typeof node !== 'object') return false;
  const record = node as Record<string, unknown>;
  if (typeof record.id !== 'string' || typeof record.name !== 'string') return false;
  if (typeof record.createdAt !== 'number' || typeof record.updatedAt !== 'number') return false;

  if (record.type === 'file') {
    return typeof record.content === 'string';
  }

  if (record.type === 'folder') {
    if (!record.children || typeof record.children !== 'object' || Array.isArray(record.children)) {
      return false;
    }
    return Object.values(record.children as Record<string, unknown>).every((child) =>
      isValidVfsNode(child)
    );
  }

  return false;
}

export function parseAndValidateVfsBackup(rawJson: string): {
  ok: boolean;
  tree?: VfsFolderNode;
  error?: string;
} {
  if (!rawJson || !rawJson.trim()) {
    return { ok: false, error: 'Backup file is empty.' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return { ok: false, error: 'Invalid JSON syntax in backup file.' };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'Backup root must be a JSON object.' };
  }

  const obj = parsed as Record<string, unknown>;
  const candidateTree = obj.format === 'nizamos-vfs-v1' && obj.tree ? obj.tree : parsed;

  if (!isValidVfsNode(candidateTree) || candidateTree.type !== 'folder') {
    return { ok: false, error: 'Invalid VFS tree structure.' };
  }

  return { ok: true, tree: candidateTree };
}
