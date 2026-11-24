import { memo, useEffect, useRef, useState } from 'react';
import { Play, Terminal, X } from 'lucide-react';
import { openOsApp } from '../apps/registry';
import { useNotificationStore } from '../system/notificationStore';

interface RunDialogProps {
  onClose: () => void;
}

export const RunDialog = memo(function RunDialog({ onClose }: RunDialogProps) {
  const [cmd, setCmd] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const pushNotification = useNotificationStore((s) => s.pushNotification);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleRun = () => {
    const trimmed = cmd.trim().toLowerCase();
    if (!trimmed) {
      onClose();
      return;
    }

    if (trimmed === 'cmd' || trimmed === 'bash' || trimmed === 'terminal') {
      openOsApp('terminal');
    } else if (trimmed === 'notepad' || trimmed === 'edit') {
      openOsApp('editor');
    } else if (trimmed === 'calc' || trimmed === 'calculator') {
      openOsApp('calculator');
    } else if (trimmed === 'explorer' || trimmed === 'files') {
      openOsApp('files');
    } else if (trimmed === 'settings') {
      openOsApp('settings');
    } else if (trimmed === 'store') {
      openOsApp('store');
    } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      openOsApp('browser', { initialUrl: trimmed });
    } else {
      pushNotification('Run Command', `Executing command: ${cmd}`, 'system');
      openOsApp('terminal', { initialCommand: cmd });
    }
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-label="Run Dialog"
      className="fixed inset-0 z-[9999] bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden flex flex-col p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/15 text-sky-400">
              <Play className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Run</h3>
              <p className="text-xs text-slate-400">Type the name of a program, folder, or internet resource.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400 shrink-0">Open:</span>
          <input
            ref={inputRef}
            type="text"
            value={cmd}
            onChange={(e) => setCmd(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRun();
              if (e.key === 'Escape') onClose();
            }}
            placeholder="e.g. terminal, files, calc, notepad"
            className="flex-1 h-9 px-3 rounded-md bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={handleRun}
            className="px-4 py-1.5 rounded-md os-accent-bg text-white text-xs font-medium hover:brightness-110 transition-colors"
          >
            OK
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
});
