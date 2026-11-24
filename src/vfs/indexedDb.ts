import { createDefaultVfsTree } from './treeOps';
import type { VfsFolderNode } from './types';

const DB_NAME = 'nizamos_vfs_db';
const DB_VERSION = 1;
const STORE_NAME = 'vfs_store';
const TREE_KEY = 'root_tree';

let memoryFallbackTree: VfsFolderNode | null = null;

function openVfsDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB.'));
  });
}

export async function loadVfsTree(): Promise<VfsFolderNode> {
  try {
    const db = await openVfsDb();
    const existing = await new Promise<VfsFolderNode | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(TREE_KEY);
      req.onsuccess = () => resolve(req.result as VfsFolderNode | undefined);
      req.onerror = () => reject(req.error);
    });

    if (existing && existing.type === 'folder' && existing.children) {
      db.close();
      return existing;
    }

    const seeded = createDefaultVfsTree();
    await saveVfsTree(seeded);
    db.close();
    return seeded;
  } catch {
    if (!memoryFallbackTree) {
      memoryFallbackTree = createDefaultVfsTree();
    }
    return memoryFallbackTree;
  }
}

export async function saveVfsTree(tree: VfsFolderNode): Promise<void> {
  memoryFallbackTree = tree;
  try {
    const db = await openVfsDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(tree, TREE_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    db.close();
  } catch {
    // Fallback already updated in memory
  }
}

export async function resetVfsTree(): Promise<VfsFolderNode> {
  const seeded = createDefaultVfsTree();
  await saveVfsTree(seeded);
  return seeded;
}
