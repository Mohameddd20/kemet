import { create } from 'zustand';
import type { AppId } from '../windowManager/types';
import type { HostFsEntry } from '../services/systemBridge';
import type { GridCell } from './desktopLogic';

export interface VirtualDesktopShortcut {
  id: string;
  appId: AppId;
  vectorId: string;
  initialDir?: string;
  labelAr: string;
  labelEn: string;
  description: string;
}

export type SystemClipboardItem =
  | {
      kind: 'host-entry';
      mode: 'copy' | 'cut';
      entry: HostFsEntry;
      parentPath: string;
    }
  | {
      kind: 'desktop-shortcut';
      mode: 'copy' | 'cut';
      shortcut: {
        id: string;
        appId: AppId;
        vectorId: string;
        initialDir?: string;
        labelAr: string;
        labelEn: string;
        description: string;
      };
    };

interface PersistedDesktopState {
  iconPositions: Record<string, GridCell>;
  hiddenCoreIds: string[];
  virtualShortcuts: VirtualDesktopShortcut[];
}

interface DesktopStoreState extends PersistedDesktopState {
  clipboard: SystemClipboardItem | null;
  setIconPosition: (id: string, cell: GridCell) => void;
  setManyIconPositions: (positions: Record<string, GridCell>) => void;
  clearIconPositions: () => void;
  hideCoreShortcut: (id: string) => void;
  restoreCoreShortcut: (id: string) => void;
  restoreAllCoreShortcuts: () => void;
  addVirtualShortcut: (item: VirtualDesktopShortcut) => void;
  renameVirtualShortcut: (id: string, newLabel: string) => void;
  removeVirtualShortcut: (id: string) => void;
  setClipboard: (item: SystemClipboardItem | null) => void;
}

const DESKTOP_STORAGE_KEY = 'kemetos_desktop_v1';

const DEFAULT_DESKTOP_STATE: PersistedDesktopState = {
  iconPositions: {},
  hiddenCoreIds: [],
  virtualShortcuts: [],
};

function loadDesktopState(): PersistedDesktopState {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_DESKTOP_STATE;
  }
  try {
    const raw = window.localStorage.getItem(DESKTOP_STORAGE_KEY);
    if (!raw) return DEFAULT_DESKTOP_STATE;
    const parsed = JSON.parse(raw) as Partial<PersistedDesktopState>;
    return {
      iconPositions:
        parsed.iconPositions && typeof parsed.iconPositions === 'object'
          ? parsed.iconPositions
          : {},
      hiddenCoreIds: Array.isArray(parsed.hiddenCoreIds) ? parsed.hiddenCoreIds : [],
      virtualShortcuts: Array.isArray(parsed.virtualShortcuts) ? parsed.virtualShortcuts : [],
    };
  } catch {
    return DEFAULT_DESKTOP_STATE;
  }
}

function saveDesktopState(state: PersistedDesktopState) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(DESKTOP_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

function extractDesktopPersisted(s: DesktopStoreState): PersistedDesktopState {
  return {
    iconPositions: s.iconPositions,
    hiddenCoreIds: s.hiddenCoreIds,
    virtualShortcuts: s.virtualShortcuts,
  };
}

const initialDesktop = loadDesktopState();

export const useDesktopStore = create<DesktopStoreState>((set, get) => ({
  ...initialDesktop,
  clipboard: null,

  setIconPosition: (id, cell) => {
    set({
      iconPositions: { ...get().iconPositions, [id]: cell },
    });
    saveDesktopState(extractDesktopPersisted(get()));
  },

  setManyIconPositions: (positions) => {
    set({
      iconPositions: { ...get().iconPositions, ...positions },
    });
    saveDesktopState(extractDesktopPersisted(get()));
  },

  clearIconPositions: () => {
    set({ iconPositions: {} });
    saveDesktopState(extractDesktopPersisted(get()));
  },

  hideCoreShortcut: (id) => {
    const prev = get().hiddenCoreIds;
    if (prev.includes(id)) return;
    set({ hiddenCoreIds: [...prev, id] });
    saveDesktopState(extractDesktopPersisted(get()));
  },

  restoreCoreShortcut: (id) => {
    set({
      hiddenCoreIds: get().hiddenCoreIds.filter((item) => item !== id),
    });
    saveDesktopState(extractDesktopPersisted(get()));
  },

  restoreAllCoreShortcuts: () => {
    set({ hiddenCoreIds: [] });
    saveDesktopState(extractDesktopPersisted(get()));
  },

  addVirtualShortcut: (item) => {
    set({
      virtualShortcuts: [...get().virtualShortcuts, item],
    });
    saveDesktopState(extractDesktopPersisted(get()));
  },

  renameVirtualShortcut: (id, newLabel) => {
    set({
      virtualShortcuts: get().virtualShortcuts.map((item) =>
        item.id === id ? { ...item, labelAr: newLabel, labelEn: newLabel } : item
      ),
    });
    saveDesktopState(extractDesktopPersisted(get()));
  },

  removeVirtualShortcut: (id) => {
    const nextPositions = { ...get().iconPositions };
    delete nextPositions[id];
    set({
      virtualShortcuts: get().virtualShortcuts.filter((item) => item.id !== id),
      iconPositions: nextPositions,
    });
    saveDesktopState(extractDesktopPersisted(get()));
  },

  setClipboard: (clipboard) => set({ clipboard }),
}));
