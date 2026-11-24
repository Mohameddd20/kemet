import { useEffect, useRef, useState } from 'react';
import { execHostShell, fetchRealSystemSpecs } from '../../services/systemBridge';
import type { WindowAppProps } from '../../windowManager/types';

interface TerminalLine {
  id: string;
  kind: 'cmd' | 'out' | 'err';
  text: string;
}

export function TerminalApp({ initialCommand }: WindowAppProps) {
  const [cwd, setCwd] = useState('~');
  const [input, setInput] = useState('');
  const [lines, setLines] = useState<TerminalLine[]>([
    {
      id: 'welcome-1',
      kind: 'out',
      text: 'KemetOS 1.0 Sovereign Bash Shell — Debian Bookworm amd64',
    },
    {
      id: 'welcome-2',
      kind: 'out',
      text: 'Type "neofetch" for live hardware specs, or "help" for available commands.',
    },
  ]);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines]);

  const runCommand = async (rawCmd: string) => {
    const trimmed = rawCmd.trim();
    if (!trimmed) return;

    setLines((prev) => [
      ...prev,
      { id: `c-${Date.now()}`, kind: 'cmd', text: `kemet@kemetos:${cwd}$ ${trimmed}` },
    ]);

    if (trimmed === 'clear') {
      setLines([]);
      return;
    }

    if (trimmed === 'help') {
      setLines((prev) => [
        ...prev,
        {
          id: `o-${Date.now()}`,
          kind: 'out',
          text: [
            'Built-in & Host Linux Commands:',
            '  neofetch   Show KemetOS 1.0 specs & real CPU/GPU/RAM telemetry',
            '  ls         List directory contents on host disk',
            '  whoami     Current live user (kemet)',
            '  uname -a   Print Linux kernel version',
            '  clear      Clear terminal output',
          ].join('\n'),
        },
      ]);
      return;
    }

    if (trimmed === 'whoami') {
      setLines((prev) => [...prev, { id: `o-${Date.now()}`, kind: 'out', text: 'kemet' }]);
      return;
    }

    if (trimmed === 'neofetch') {
      const specs = await fetchRealSystemSpecs();
      setLines((prev) => [
        ...prev,
        {
          id: `nf-${Date.now()}`,
          kind: 'out',
          text: [
            '         /\\          kemet@kemetos',
            '        /  \\         -------------',
            `       / /\\ \\        OS: ${specs.osName}`,
            `      / ____ \\       Kernel: ${specs.kernel}`,
            `     /_/    \\_\\      CPU: ${specs.cpuModel} (${specs.cpuCores} cores)`,
            `    [KEMET OS]       GPU: ${specs.gpuModel}`,
            `                     Memory: ${specs.ramUsedGb} GB / ${specs.ramTotalGb} GB`,
            `                     Wi-Fi: ${specs.wifiChipset} (${specs.wifiDriver})`,
          ].join('\n'),
        },
      ]);
      return;
    }

    const res = await execHostShell(trimmed, cwd === '~' ? '' : cwd);
    if (res.nextCwd) setCwd(res.nextCwd);
    if (res.stdout) {
      setLines((prev) => [...prev, { id: `s-${Date.now()}`, kind: 'out', text: res.stdout }]);
    }
    if (res.stderr) {
      setLines((prev) => [...prev, { id: `e-${Date.now()}`, kind: 'err', text: res.stderr }]);
    }
  };

  useEffect(() => {
    if (initialCommand) {
      void runCommand(initialCommand);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCommand]);

  return (
    <div
      dir="ltr"
      className="h-full flex flex-col bg-[#070b14] text-slate-100 font-mono-tabular text-xs select-text"
    >
      <div ref={scrollRef} className="flex-1 overflow-y-auto os-scroll p-4 space-y-1.5 whitespace-pre-wrap">
        {lines.map((line) => (
          <div
            key={line.id}
            className={
              line.kind === 'cmd'
                ? 'text-amber-300 font-bold'
                : line.kind === 'err'
                ? 'text-rose-400'
                : 'text-cyan-100'
            }
          >
            {line.text}
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const val = input;
          setInput('');
          void runCommand(val);
        }}
        className="px-4 py-2.5 bg-[#0b1120] border-t border-amber-400/20 flex items-center gap-2"
      >
        <span className="text-amber-300 font-bold shrink-0">kemet@kemetos:{cwd}$</span>
        <input
          type="text"
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type Linux command (neofetch, ls, uname -a)..."
          className="w-full bg-transparent text-cyan-200 focus:outline-none"
        />
      </form>
    </div>
  );
}
