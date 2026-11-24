import { create } from 'zustand';
import { playWindowTransition } from '../system/soundEffects';
import type { OpenWindowParams, WindowBounds, WindowInstance } from './types';
import {
  closeWindowInList,
  createWindowInstance,
  focusWindowInList,
  minimizeWindowInList,
  toggleMaximizeWindowInList,
  updateWindowBoundsInList,
  updateWindowTitleInList,
} from './windowLogic';

interface WindowStoreState {
  windows: WindowInstance[];
  openWindow: (params: OpenWindowParams) => string;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  minimizeAll: () => void;
  toggleMaximizeWindow: (id: string) => void;
  toggleTaskbarWindow: (id: string) => void;
  updateWindowBounds: (id: string, bounds: Partial<WindowBounds>) => void;
  updateWindowTitle: (id: string, title: string) => void;
}

export const useWindowStore = create<WindowStoreState>((set, get) => ({
  windows: [],

  openWindow: (params) => {
    const current = get().windows;
    // If opening a specific file in Text Editor that's already open, focus it instead of duplicating
    if (params.props?.filePath) {
      const existingFileWin = current.find(
        (w) => !w.isClosing && w.appId === params.appId && w.props?.filePath === params.props?.filePath
      );
      if (existingFileWin) {
        set({ windows: focusWindowInList(current, existingFileWin.id) });
        return existingFileWin.id;
      }
    }

    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 760;

    const newWin = createWindowInstance(current, {
      ...params,
      viewportWidth: params.viewportWidth ?? viewportWidth,
      viewportHeight: params.viewportHeight ?? viewportHeight,
    });

    playWindowTransition('open');
    set({ windows: [...current, newWin] });
    return newWin.id;
  },

  closeWindow: (id) => {
    const target = get().windows.find((w) => w.id === id);
    if (!target || target.isClosing) return;

    playWindowTransition('close');

    if (typeof window === 'undefined' || target.isMinimized) {
      set({ windows: closeWindowInList(get().windows, id) });
      return;
    }

    set({
      windows: get().windows.map((w) => (w.id === id ? { ...w, isClosing: true } : w)),
    });
    window.setTimeout(() => {
      set({ windows: closeWindowInList(get().windows, id) });
    }, 175);
  },

  focusWindow: (id) => {
    set({ windows: focusWindowInList(get().windows, id) });
  },

  minimizeWindow: (id) => {
    const current = get().windows;
    const target = current.find((w) => w.id === id);
    if (!target || target.isMinimized || target.isMinimizing) return;

    playWindowTransition('minimize');
    set({
      windows: current.map((w) => (w.id === id ? { ...w, isMinimizing: true } : w)),
    });
    window.setTimeout(() => {
      set({
        windows: get().windows.map((w) =>
          w.id === id ? { ...w, isMinimized: true, isMinimizing: false } : w
        ),
      });
    }, 180);
  },

  minimizeAll: () => {
    playWindowTransition('minimize');
    set({
      windows: get().windows.map((w) => ({ ...w, isMinimized: true, isMinimizing: false })),
    });
  },

  toggleMaximizeWindow: (id) => {
    set({ windows: toggleMaximizeWindowInList(get().windows, id) });
  },

  toggleTaskbarWindow: (id) => {
    const current = get().windows;
    const target = current.find((w) => w.id === id);
    if (!target) return;

    const visible = current.filter((w) => !w.isMinimized);
    const maxZ = visible.reduce((m, w) => Math.max(m, w.zIndex), 0);

    if (!target.isMinimized && target.zIndex === maxZ) {
      get().minimizeWindow(id);
    } else {
      playWindowTransition('open');
      const wasMinimized = target.isMinimized;
      set({
        windows: focusWindowInList(current, id).map((w) =>
          w.id === id && wasMinimized ? { ...w, isRestoring: true, isMinimized: false } : w
        ),
      });
      if (wasMinimized) {
        window.setTimeout(() => {
          set({
            windows: get().windows.map((w) => (w.id === id ? { ...w, isRestoring: false } : w)),
          });
        }, 180);
      }
    }
  },

  updateWindowBounds: (id, bounds) => {
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 760;
    set({
      windows: updateWindowBoundsInList(
        get().windows,
        id,
        bounds,
        viewportWidth,
        viewportHeight
      ),
    });
  },

  updateWindowTitle: (id, title) => {
    set({ windows: updateWindowTitleInList(get().windows, id, title) });
  },
}));
