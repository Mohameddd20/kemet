import type { OpenWindowParams, WindowBounds, WindowInstance } from './types';

export const SAFE_TOP = 46;
export const SAFE_LEFT = 104;
export const SAFE_RIGHT = 20;
export const SAFE_BOTTOM = 72;
export const MAXIMIZED_TASKBAR_HEIGHT = 48;
const BASE_Z_INDEX = 100;

export type SnapLayout = 'left' | 'right' | 'full';

export function getMaximizedBounds(
  viewportWidth: number = 1280,
  viewportHeight: number = 760
): WindowBounds {
  return {
    x: 0,
    y: 0,
    width: Math.max(320, viewportWidth),
    height: Math.max(240, viewportHeight - MAXIMIZED_TASKBAR_HEIGHT),
  };
}

export function getSafeWorkspaceRect(
  viewportWidth: number = 1280,
  viewportHeight: number = 760
): WindowBounds {
  const isCompact = viewportWidth < 640;
  const leftGutter = isCompact ? 10 : SAFE_LEFT;
  const rightGutter = isCompact ? 10 : SAFE_RIGHT;
  const topGutter = isCompact ? 46 : SAFE_TOP;
  const bottomGutter = isCompact ? 68 : SAFE_BOTTOM;

  const minSafeW = isCompact ? 240 : 360;
  const minSafeH = isCompact ? 220 : 280;

  const width = Math.max(minSafeW, viewportWidth - leftGutter - rightGutter);
  const height = Math.max(minSafeH, viewportHeight - topGutter - bottomGutter);
  return {
    x: leftGutter,
    y: topGutter,
    width,
    height,
  };
}

export function computeSnapBounds(
  layout: SnapLayout,
  viewportWidth: number = 1280,
  viewportHeight: number = 760
): WindowBounds {
  if (layout === 'full') return getMaximizedBounds(viewportWidth, viewportHeight);
  const safe = getSafeWorkspaceRect(viewportWidth, viewportHeight);
  const gap = 8;
  const minHalf = Math.min(360, safe.width);
  const halfWidth = Math.max(minHalf, Math.floor((safe.width - gap) / 2));
  if (layout === 'left') {
    return { x: safe.x, y: safe.y, width: halfWidth, height: safe.height };
  }
  return {
    x: safe.x + safe.width - halfWidth,
    y: safe.y,
    width: halfWidth,
    height: safe.height,
  };
}

export function clampWindowBounds(
  bounds: WindowBounds,
  viewportWidth: number = 1280,
  viewportHeight: number = 760
): WindowBounds {
  const safe = getSafeWorkspaceRect(viewportWidth, viewportHeight);
  const minW = Math.min(360, safe.width);
  const minH = Math.min(260, safe.height);
  const width = Math.min(Math.max(minW, bounds.width), safe.width);
  const height = Math.min(Math.max(minH, bounds.height), safe.height);

  const maxX = Math.max(safe.x, safe.x + safe.width - width);
  const maxY = Math.max(safe.y, safe.y + safe.height - height);

  return {
    x: Math.min(Math.max(safe.x, bounds.x), maxX),
    y: Math.min(Math.max(safe.y, bounds.y), maxY),
    width,
    height,
  };
}

export function getNextZIndex(windows: WindowInstance[]): number {
  if (windows.length === 0) return BASE_Z_INDEX;
  return Math.max(...windows.map((w) => w.zIndex)) + 1;
}

export function getTopFocusedWindowId(windows: WindowInstance[]): string | null {
  const visible = windows.filter((w) => !w.isMinimized);
  if (visible.length === 0) return null;
  let top = visible[0];
  for (const w of visible) {
    if (w.zIndex > top.zIndex) {
      top = w;
    }
  }
  return top.id;
}

export function computeCascadedBounds(
  existingCount: number,
  defaultWidth: number,
  defaultHeight: number,
  viewportWidth: number = 1280,
  viewportHeight: number = 760
): WindowBounds {
  const safe = getSafeWorkspaceRect(viewportWidth, viewportHeight);
  const width = Math.min(defaultWidth, safe.width);
  const height = Math.min(defaultHeight, safe.height);

  const step = (existingCount % 5) * 24;
  const centeredX = safe.x + Math.round((safe.width - width) / 2);
  const centeredY = safe.y + Math.round((safe.height - height) / 2);

  return clampWindowBounds(
    {
      x: centeredX + step - 24,
      y: centeredY + step - 24,
      width,
      height,
    },
    viewportWidth,
    viewportHeight
  );
}

export function focusWindowInList(windows: WindowInstance[], id: string): WindowInstance[] {
  const target = windows.find((w) => w.id === id);
  if (!target) return windows;
  const maxZ = windows.reduce((max, w) => Math.max(max, w.zIndex), BASE_Z_INDEX - 1);
  if (target.zIndex === maxZ && !target.isMinimized) {
    return windows;
  }
  const nextZ = maxZ + 1;
  return windows.map((w) => (w.id === id ? { ...w, isMinimized: false, zIndex: nextZ } : w));
}

export function minimizeWindowInList(windows: WindowInstance[], id: string): WindowInstance[] {
  return windows.map((w) => (w.id === id ? { ...w, isMinimized: true } : w));
}

export function toggleMaximizeWindowInList(windows: WindowInstance[], id: string): WindowInstance[] {
  const nextZ = getNextZIndex(windows);
  return windows.map((w) =>
    w.id === id
      ? { ...w, isMaximized: !w.isMaximized, isMinimized: false, zIndex: nextZ }
      : w
  );
}

export function closeWindowInList(windows: WindowInstance[], id: string): WindowInstance[] {
  return windows.filter((w) => w.id !== id);
}

export function updateWindowBoundsInList(
  windows: WindowInstance[],
  id: string,
  bounds: Partial<WindowBounds>,
  viewportWidth?: number,
  viewportHeight?: number
): WindowInstance[] {
  return windows.map((w) => {
    if (w.id !== id) return w;
    const merged: WindowBounds = {
      x: bounds.x ?? w.x,
      y: bounds.y ?? w.y,
      width: bounds.width ?? w.width,
      height: bounds.height ?? w.height,
    };
    const clamped =
      viewportWidth && viewportHeight
        ? clampWindowBounds(merged, viewportWidth, viewportHeight)
        : {
            ...merged,
            x: Math.max(SAFE_LEFT, merged.x),
            y: Math.max(SAFE_TOP, merged.y),
          };
    return { ...w, ...clamped };
  });
}

export function updateWindowTitleInList(
  windows: WindowInstance[],
  id: string,
  title: string
): WindowInstance[] {
  return windows.map((w) => (w.id === id ? { ...w, title } : w));
}

export function createWindowInstance(
  windows: WindowInstance[],
  params: OpenWindowParams
): WindowInstance {
  const bounds = computeCascadedBounds(
    windows.length,
    params.defaultWidth,
    params.defaultHeight,
    params.viewportWidth,
    params.viewportHeight
  );
  const id =
    params.id ??
    `${params.appId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  return {
    id,
    appId: params.appId,
    title: params.title,
    component: params.component,
    isMinimized: false,
    isMaximized: false,
    zIndex: getNextZIndex(windows),
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    props: params.props,
  };
}
