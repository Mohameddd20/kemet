import { useEffect, useRef, useState } from 'react';
import { playStartupChime } from '../system/soundEffects';
import { KemetLogo } from './os/KemetLogo';

interface BootScreenProps {
  onComplete: () => void;
}

export function BootScreen({ onComplete }: BootScreenProps) {
  const [progress, setProgress] = useState(20);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const t1 = setTimeout(() => setProgress(68), 220);
    const t2 = setTimeout(() => setProgress(100), 520);
    const t3 = setTimeout(() => {
      playStartupChime();
      onCompleteRef.current();
    }, 850);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <div
      role="status"
      aria-label="Booting KemetOS 1.0"
      onClick={() => {
        playStartupChime();
        onCompleteRef.current();
      }}
      className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-[#070b14] text-slate-100 select-none cursor-pointer"
    >
      <div className="w-24 h-24 rounded-3xl bg-[#0b1120] border border-amber-400/40 flex items-center justify-center mb-5 p-1.5 shadow-2xl">
        <KemetLogo className="w-full h-full rounded-2xl" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-amber-300">KemetOS 1.0</h1>
      <p className="text-xs text-cyan-300/90 mt-1 mb-6">
        كيميت أو إس — تهيئة التعريفات والنواة السيادية...
      </p>

      <div className="w-60 h-1.5 rounded-full bg-slate-800 overflow-hidden border border-slate-700/60">
        <div
          className="h-full bg-gradient-to-r from-amber-400 to-cyan-400 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
