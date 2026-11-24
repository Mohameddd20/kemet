import { create } from 'zustand';
import { loadVfsTree, resetVfsTree, saveVfsTree } from './indexedDb';
import {
  createDefaultVfsTree,
  createFolder,
  deleteNode,
  renameNode,
  writeFile,
} from './treeOps';
import type { VfsFileNode, VfsFolderNode, VfsOpResult } from './types';

interface VfsStoreState {
  tree: VfsFolderNode;
  isLoaded: boolean;
  isSaving: boolean;
  initVfs: () => Promise<void>;
  setTree: (nextTree: VfsFolderNode) => void;
  mkdir: (parentPath: string, folderName: string) => VfsOpResult<VfsFolderNode>;
  saveFile: (parentPath: string, fileName: string, content: string) => VfsOpResult<VfsFileNode>;
  removeItem: (targetPath: string) => VfsOpResult<null>;
  renameItem: (targetPath: string, newName: string) => VfsOpResult<unknown>;
  resetFs: () => Promise<void>;
}

export const useVfsStore = create<VfsStoreState>((set, get) => ({
  tree: createDefaultVfsTree(),
  isLoaded: false,
  isSaving: false,

  initVfs: async () => {
    const loaded = await loadVfsTree();
    set({ tree: loaded, isLoaded: true });
  },

  setTree: (nextTree) => {
    set({ tree: nextTree, isSaving: true });
    void saveVfsTree(nextTree).finally(() => set({ isSaving: false }));
  },

  mkdir: (parentPath, folderName) => {
    const res = createFolder(get().tree, parentPath, folderName);
    if (res.ok) {
      get().setTree(res.tree);
    }
    return res;
  },

  saveFile: (parentPath, fileName, content) => {
    const res = writeFile(get().tree, parentPath, fileName, content);
    if (res.ok) {
      get().setTree(res.tree);
    }
    return res;
  },

  removeItem: (targetPath) => {
    const res = deleteNode(get().tree, targetPath);
    if (res.ok) {
      get().setTree(res.tree);
    }
    return res;
  },

  renameItem: (targetPath, newName) => {
    const res = renameNode(get().tree, targetPath, newName);
    if (res.ok) {
      get().setTree(res.tree);
    }
    return res;
  },

  resetFs: async () => {
    const seeded = await resetVfsTree();
    set({ tree: seeded, isLoaded: true });
  },
}));
