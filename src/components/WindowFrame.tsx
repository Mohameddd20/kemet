import { memo, useState } from 'react';
import { Rnd } from 'react-rnd';
import { Copy, Minus, Square, X } from 'lucide-react';
import { APP_ICONS } from '../apps/registry';
import type { WindowInstance } from '../windowManager/types';
import { useWindowStore } from '../windowManager/useWindowStore';

interface WindowFrameProps {
  win: WindowInstance;
  isFocused: boolean;
}

type SnapRegion = 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export const WindowFrame = memo(function WindowFrame({ win, isFocused }: WindowFrameProps) {
  const focusWindow = useWindowStore((s) => s.focusWindow);
  const minimizeWindow = useWindowStore((s) => s.minimizeWindow);
  const toggleMaximizeWindow = useWindowStore((s) => s.toggleMaximizeWindow);
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const updateWindowBounds = useWindowStore((s) => s.updateWindowBounds);

  const [snapMenuOpen, setSnapMenuOpen] = useState(false);

  const Icon = APP_ICONS[win.appId];
  const AppComponent = win.component;

  const applySnap = (region: SnapRegion) => {
    const layer = document.querySelector('[data-testid="window-layer"]');
    const rect = layer?.getBoundingClientRect();
    const w = rect?.width ?? window.innerWidth;
    const h = rect?.height ?? Math.max(400, window.innerHeight - 40);
    const halfW = Math.floor(w / 2);
    const halfH = Math.floor(h / 2);

    if (win.isMaximized) {
      toggleMaximizeWindow(win.id);
    }

    switch (region) {
      case 'left':
        updateWindowBounds(win.id, { x: 0, y: 0, width: halfW, height: h });
        break;
      case 'right':
        updateWindowBounds(win.id, { x: halfW, y: 0, width: w - halfW, height: h });
        break;
      case 'top-left':
        updateWindowBounds(win.id, { x: 0, y: 0, width: halfW, height: halfH });
        break;
      case 'top-right':
        updateWindowBounds(win.id, { x: halfW, y: 0, width: w - halfW, height: halfH });
        break;
      case 'bottom-left':
        updateWindowBounds(win.id, { x: 0, y: halfH, width: halfW, height: h - halfH });
        break;
      case 'bottom-right':
        updateWindowBounds(win.id, { x: halfW, y: halfH, width: w - halfW, height: h - halfH });
        break;
    }
    setSnapMenuOpen(false);
    focusWindow(win.id);
  };

  return (
    <Rnd
      position={win.isMaximized ? { x: 0, y: 0 } : { x: win.x, y: win.y }}
      size={
        win.isMaximized
          ? { width: '100%', height: '100%' }
          : { width: win.width, height: win.height }
      }
      minWidth={340}
      minHeight={260}
      bounds="parent"
      dragHandleClassName="window-drag-handle"
      disableDragging={win.isMaximized}
      enableResizing={!win.isMaximized}
      style={{
        zIndex: win.zIndex,
        display: win.isMinimized && !win.isMinimizing ? 'none' : 'flex',
      }}
      onMouseDown={() => focusWindow(win.id)}
      onDragStop={(_e, d) => {
        if (!win.isMaximized) {
          updateWindowBounds(win.id, { x: d.x, y: d.y });
        }
      }}
      onResizeStop={(_e, _direction, ref, _delta, position) => {
        if (!win.isMaximized) {
          updateWindowBounds(win.id, {
            width: ref.offsetWidth,
            height: ref.offsetHeight,
            x: position.x,
            y: position.y,
          });
        }
      }}
      className="pointer-events-auto flex-col"
    >
      <section
        aria-label={win.title}
        data-window-id={win.id}
        data-focused={isFocused ? 'true' : 'false'}
        className={`flex flex-col w-full h-full min-h-0 overflow-hidden bg-slate-900 border transition-shadow duration-150 ${
          win.isClosing || win.isMinimizing
            ? 'window-minimize'
            : win.isRestoring
              ? 'window-restore'
              : 'window-pop-in'
        } ${win.isMaximized ? 'rounded-none border-0' : 'rounded-lg'} ${
          isFocused
            ? 'os-accent-border os-window-shadow-active'
            : 'border-slate-700/75 os-window-shadow-inactive'
        }`}
      >
        {/* Fast Solid Acrylic Title Bar (Zero Backdrop-Blur for 60fps) */}
        <header
          onDoubleClick={() => toggleMaximizeWindow(win.id)}
          className={`window-drag-handle flex items-center justify-between h-9 ps-3 border-b shrink-0 cursor-grab active:cursor-grabbing ${
            isFocused
              ? 'bg-slate-900 border-slate-800 text-slate-100'
              : 'bg-slate-950 border-slate-800/80 text-slate-400'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Icon
              className={`w-3.5 h-3.5 shrink-0 ${isFocused ? 'os-accent-text' : 'text-slate-500'}`}
            />
            <h2 className="text-xs font-medium truncate">{win.title}</h2>
          </div>

          <div
            onMouseDown={(e) => e.stopPropagation()}
            className="flex items-center h-full shrink-0"
          >
            <button
              type="button"
              onClick={() => minimizeWindow(win.id)}
              aria-label={`Minimize ${win.title}`}
              className="w-10 h-full flex items-center justify-center text-slate-300 hover:bg-slate-800 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            <div
              className="relative h-full"
              onMouseEnter={() => setSnapMenuOpen(true)}
              onMouseLeave={() => setSnapMenuOpen(false)}
            >
              <button
                type="button"
                onClick={() => toggleMaximizeWindow(win.id)}
                aria-label={win.isMaximized ? `Restore ${win.title}` : `Maximize ${win.title}`}
                className="w-10 h-full flex items-center justify-center text-slate-300 hover:bg-slate-800 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                {win.isMaximized ? (
                  <Copy className="w-3.5 h-3.5" />
                ) : (
                  <Square className="w-3.5 h-3.5" />
                )}
              </button>

              {snapMenuOpen && (
                <div
                  aria-label="Snap Layouts"
                  className="absolute top-9 right-0 z-[9999] w-44 p-2 rounded-md bg-slate-900 border border-slate-700 shadow-2xl space-y-1.5"
                >
                  <div className="text-[10px] font-medium text-slate-400 px-1">Snap Layout</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => applySnap('left')}
                      aria-label="Snap Left Half"
                      className="h-9 rounded-sm border border-slate-700 bg-slate-950 p-1 grid grid-cols-2 gap-0.5 hover:border-[var(--os-accent-hover)]"
                    >
                      <span className="os-accent-bg rounded-[1px]" />
                      <span className="bg-slate-800 rounded-[1px]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applySnap('right')}
                      aria-label="Snap Right Half"
                      className="h-9 rounded-sm border border-slate-700 bg-slate-950 p-1 grid grid-cols-2 gap-0.5 hover:border-[var(--os-accent-hover)]"
                    >
                      <span className="bg-slate-800 rounded-[1px]" />
                      <span className="os-accent-bg rounded-[1px]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applySnap('top-left')}
                      aria-label="Snap Top Left"
                      className="h-9 rounded-sm border border-slate-700 bg-slate-950 p-1 grid grid-cols-2 grid-rows-2 gap-0.5 hover:border-[var(--os-accent-hover)]"
                    >
                      <span className="os-accent-bg rounded-[1px]" />
                      <span className="bg-slate-800 rounded-[1px]" />
                      <span className="bg-slate-800 rounded-[1px]" />
                      <span className="bg-slate-800 rounded-[1px]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applySnap('bottom-right')}
                      aria-label="Snap Bottom Right"
                      className="h-9 rounded-sm border border-slate-700 bg-slate-950 p-1 grid grid-cols-2 grid-rows-2 gap-0.5 hover:border-[var(--os-accent-hover)]"
                    >
                      <span className="bg-slate-800 rounded-[1px]" />
                      <span className="bg-slate-800 rounded-[1px]" />
                      <span className="bg-slate-800 rounded-[1px]" />
                      <span className="os-accent-bg rounded-[1px]" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => closeWindow(win.id)}
              aria-label={`Close ${win.title}`}
              className="w-10 h-full flex items-center justify-center text-slate-300 hover:bg-red-600 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Window Body */}
        <div className="flex-1 min-h-0 overflow-hidden bg-slate-900">
          <AppComponent windowId={win.id} {...win.props} />
        </div>
      </section>
    </Rnd>
  );
});
