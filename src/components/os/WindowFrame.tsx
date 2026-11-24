import { memo, useEffect, useState, type ReactNode } from 'react';
import { Rnd } from 'react-rnd';
import { Columns2, Maximize2, Minimize2, Minus, X } from 'lucide-react';
import { useWindowStore } from '../../windowManager/useWindowStore';
import type { WindowInstance } from '../../windowManager/types';
import { useSettingsStore } from '../../system/settingsStore';
import {
  clampWindowBounds,
  computeSnapBounds,
  getMaximizedBounds,
  getSafeWorkspaceRect,
  type SnapLayout,
} from '../../windowManager/windowLogic';

interface WindowFrameProps {
  win: WindowInstance;
  isFocused: boolean;
  icon: ReactNode;
  children: ReactNode;
}

export const WindowFrame = memo(function WindowFrame({
  win,
  isFocused,
  icon,
  children,
}: WindowFrameProps) {
  const focusWindow = useWindowStore((s) => s.focusWindow);
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const minimizeWindow = useWindowStore((s) => s.minimizeWindow);
  const toggleMaximizeWindow = useWindowStore((s) => s.toggleMaximizeWindow);
  const updateWindowBounds = useWindowStore((s) => s.updateWindowBounds);
  const language = useSettingsStore((s) => s.language);
  const isAr = language === 'ar';

  const [snapOpen, setSnapOpen] = useState(false);
  const [viewport, setViewport] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1440,
    h: typeof window !== 'undefined' ? window.innerHeight : 900,
  }));

  useEffect(() => {
    const onResize = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const safeRect = getSafeWorkspaceRect(viewport.w, viewport.h);
  const maxRect = getMaximizedBounds(viewport.w, viewport.h);
  const clampedPos = clampWindowBounds(
    { x: win.x, y: win.y, width: win.width, height: win.height },
    viewport.w,
    viewport.h
  );

  const pos = win.isMaximized
    ? { x: maxRect.x, y: maxRect.y }
    : { x: clampedPos.x, y: clampedPos.y };
  const size = win.isMaximized
    ? { width: maxRect.width, height: maxRect.height }
    : { width: clampedPos.width, height: clampedPos.height };

  const applySnap = (layout: SnapLayout) => {
    setSnapOpen(false);
    if (layout === 'full') {
      if (!win.isMaximized) toggleMaximizeWindow(win.id);
      return;
    }
    if (win.isMaximized) {
      toggleMaximizeWindow(win.id);
    }
    const snap = computeSnapBounds(layout, viewport.w, viewport.h);
    updateWindowBounds(win.id, snap);
  };

  return (
    <Rnd
      position={pos}
      size={size}
      minWidth={Math.min(340, safeRect.width)}
      minHeight={Math.min(240, safeRect.height)}
      bounds="window"
      dragHandleClassName="kemet-window-drag"
      disableDragging={win.isMaximized}
      enableResizing={!win.isMaximized}
      onMouseDown={() => {
        if (!isFocused) focusWindow(win.id);
        if (snapOpen) setSnapOpen(false);
      }}
      onDragStop={(_e, d) => {
        if (win.isMaximized) return;
        const clamped = clampWindowBounds(
          { x: d.x, y: d.y, width: win.width, height: win.height },
          viewport.w,
          viewport.h
        );
        updateWindowBounds(win.id, clamped);
      }}
      onResizeStop={(_e, _dir, ref, _delta, position) => {
        if (win.isMaximized) return;
        const clamped = clampWindowBounds(
          {
            x: Math.max(safeRect.x, position.x),
            y: Math.max(safeRect.y, position.y),
            width: ref.offsetWidth,
            height: ref.offsetHeight,
          },
          viewport.w,
          viewport.h
        );
        updateWindowBounds(win.id, clamped);
      }}
      style={{
        zIndex: win.zIndex,
        display: win.isMinimized ? 'none' : 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
      className={`transition-colors bg-[#0b1322] ${
        win.isMaximized
          ? 'rounded-none border-0 border-b border-slate-800/90'
          : isFocused
          ? 'rounded-xl border border-teal-400/45 os-window-shadow-active'
          : 'rounded-xl border border-slate-700/75 os-window-shadow-inactive opacity-95'
      }`}
    >
      {/* Slim 36px Window Titlebar with Circular Color-Coded Dots */}
      <header
        dir="ltr"
        onDoubleClick={() => toggleMaximizeWindow(win.id)}
        className={`kemet-window-drag relative h-9 shrink-0 px-3 grid grid-cols-3 items-center bg-[#09101d] border-b border-slate-800/90 select-none ${
          win.isMaximized ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded-md bg-[#111b2e] border border-teal-400/20 flex items-center justify-center shrink-0">
            {icon}
          </div>
        </div>

        <div dir="auto" className="text-center text-xs font-semibold text-slate-200 truncate px-2">
          {win.title}
        </div>

        <div className="flex items-center justify-end gap-2 shrink-0 relative">
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setSnapOpen((v) => !v);
            }}
            title={isAr ? 'تقسيم الشاشة' : 'Snap Layouts'}
            aria-label={isAr ? 'تقسيم الشاشة' : 'Snap Layouts'}
            className="w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:text-teal-300 transition-colors cursor-pointer"
          >
            <Columns2 className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              minimizeWindow(win.id);
            }}
            title={isAr ? 'تصغير' : 'Minimize'}
            aria-label={isAr ? 'تصغير' : 'Minimize'}
            className="group w-4 h-4 rounded-full bg-teal-400/20 border border-teal-400/80 hover:bg-teal-400 flex items-center justify-center transition-colors cursor-pointer"
          >
            <Minus className="w-2.5 h-2.5 text-teal-200 group-hover:text-slate-950" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleMaximizeWindow(win.id);
            }}
            title={win.isMaximized ? (isAr ? 'استعادة' : 'Restore') : isAr ? 'تكبير' : 'Maximize'}
            aria-label={win.isMaximized ? (isAr ? 'استعادة' : 'Restore') : isAr ? 'تكبير' : 'Maximize'}
            className="group w-4 h-4 rounded-full bg-amber-400/20 border border-amber-400/80 hover:bg-amber-400 flex items-center justify-center transition-colors cursor-pointer"
          >
            {win.isMaximized ? (
              <Minimize2 className="w-2 h-2 text-amber-200 group-hover:text-slate-950" />
            ) : (
              <Maximize2 className="w-2 h-2 text-amber-200 group-hover:text-slate-950" />
            )}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              closeWindow(win.id);
            }}
            title={isAr ? 'إغلاق' : 'Close'}
            aria-label={isAr ? 'إغلاق' : 'Close'}
            className="group w-4 h-4 rounded-full bg-rose-500/25 border border-rose-500/85 hover:bg-rose-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-2.5 h-2.5 text-rose-200 group-hover:text-white" />
          </button>

          {snapOpen && (
            <div
              dir={isAr ? 'rtl' : 'ltr'}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="absolute top-7 right-0 z-50 w-44 rounded-xl bg-[#111827] border border-teal-400/30 p-1.5 shadow-xl space-y-1 text-[11px]"
            >
              <button
                type="button"
                onClick={() => applySnap('left')}
                className="w-full px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center justify-between cursor-pointer"
              >
                <span>{isAr ? 'النصف الأيسر' : 'Snap Left'}</span>
                <span className="w-4 h-3 border border-teal-400 rounded-sm flex">
                  <span className="w-1/2 bg-teal-400/70 h-full" />
                </span>
              </button>
              <button
                type="button"
                onClick={() => applySnap('right')}
                className="w-full px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center justify-between cursor-pointer"
              >
                <span>{isAr ? 'النصف الأيمن' : 'Snap Right'}</span>
                <span className="w-4 h-3 border border-teal-400 rounded-sm flex justify-end">
                  <span className="w-1/2 bg-teal-400/70 h-full" />
                </span>
              </button>
              <button
                type="button"
                onClick={() => applySnap('full')}
                className="w-full px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center justify-between cursor-pointer"
              >
                <span>{isAr ? 'ملء الشاشة' : 'Full Safe Area'}</span>
                <span className="w-4 h-3 border border-amber-400 bg-amber-400/40 rounded-sm" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Flex-1 scrollable-ready content wrapper */}
      <div dir={isAr ? 'rtl' : 'ltr'} className="flex-1 min-h-0 flex flex-col overflow-hidden bg-[#0b1322]">
        {children}
      </div>
    </Rnd>
  );
});
