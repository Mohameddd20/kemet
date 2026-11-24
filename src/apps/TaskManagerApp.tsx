import { memo, useEffect, useState } from 'react';
import { Activity, Cpu, HardDrive, MemoryStick, Network, Server, XCircle } from 'lucide-react';
import {
  isTauriRuntime,
  subscribeSystemMetrics,
  type RealSystemMetrics,
} from '../system/systemBridge';
import { useWindowStore } from '../windowManager/useWindowStore';
import { getTopFocusedWindowId } from '../windowManager/windowLogic';
import type { WindowAppProps } from '../windowManager/types';
import { buildSvgPolylinePoints, pushMetricSample } from './taskManager/perfUtils';

type TaskMgrTab = 'processes' | 'performance';
type ProcessView = 'os' | 'windows';

function formatUptime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}h ${m}m ${s}s`;
}

function formatGb(mb: number): string {
  return `${(mb / 1024).toFixed(2)} GB`;
}

export const TaskManagerApp = memo(function TaskManagerApp(_props: WindowAppProps) {
  const windows = useWindowStore((s) => s.windows);
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const focusWindow = useWindowStore((s) => s.focusWindow);

  const [activeTab, setActiveTab] = useState<TaskMgrTab>('processes');
  const [procView, setProcView] = useState<ProcessView>('os');
  const [isSimpleView, setIsSimpleView] = useState(false);
  const [metrics, setMetrics] = useState<RealSystemMetrics | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [cpuHistory, setCpuHistory] = useState<number[]>([]);
  const [ramHistory, setRamHistory] = useState<number[]>([]);
  const [netHistory, setNetHistory] = useState<number[]>([]);

  const topFocusedId = getTopFocusedWindowId(windows);

  useEffect(() => {
    const unsubscribe = subscribeSystemMetrics(
      (sample) => {
        setStreamError(null);
        setMetrics(sample);
        setCpuHistory((prev) => pushMetricSample(prev, sample.cpuPercent, 30));
        setRamHistory((prev) => pushMetricSample(prev, sample.memory.usedMb, 30));
        setNetHistory((prev) => pushMetricSample(prev, sample.network.totalKbps, 30));
      },
      (err) => setStreamError(err)
    );
    return unsubscribe;
  }, []);

  const totalRamMb = metrics?.memory.totalMb ?? 1024;
  const maxNetKbps = Math.max(100, ...netHistory, 1);

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100">
      {/* Header Tabs */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-800 bg-slate-950/60">
        <div className="flex items-center gap-2">
          <div
            role="tablist"
            aria-label="Task Manager Views"
            className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'processes'}
              onClick={() => setActiveTab('processes')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === 'processes'
                  ? 'os-accent-bg text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Processes ({metrics ? metrics.processes.length : windows.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'performance'}
              onClick={() => setActiveTab('performance')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === 'performance'
                  ? 'os-accent-bg text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Performance
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsSimpleView(!isSimpleView)}
            className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 transition-colors"
          >
            {isSimpleView ? 'More Details' : 'Simple View'}
          </button>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono-tabular">
          <span>CPU {metrics ? `${metrics.cpuPercent.toFixed(1)}%` : '--'}</span>
          <span aria-hidden="true">·</span>
          <span>
            RAM{' '}
            {metrics
              ? `${formatGb(metrics.memory.usedMb)} / ${formatGb(metrics.memory.totalMb)}`
              : '--'}
          </span>
        </div>
      </div>

      {streamError && (
        <div className="px-3 py-1.5 bg-amber-950/50 border-b border-amber-800/60 text-[11px] text-amber-200">
          {streamError}
        </div>
      )}

      {activeTab === 'processes' ? (
        <div className="flex-1 flex flex-col min-h-0">
          {isSimpleView ? (
            <div className="flex-1 overflow-y-auto os-scroll p-4 space-y-2">
              <div className="text-xs font-semibold text-slate-300 pb-1">Running Apps ({windows.length})</div>
              {windows.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">No active applications running.</div>
              ) : (
                windows.map((win) => (
                  <div
                    key={win.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-100">{win.title}</div>
                      <div className="text-[10px] text-slate-500 font-mono">App ID: {win.appId}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => closeWindow(win.id)}
                      className="px-3 py-1 rounded bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                    >
                      End Task
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : (
            <>
          {/* Process Source Switcher */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800/80 bg-slate-900/80">
            <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-md border border-slate-800">
              <button
                type="button"
                onClick={() => setProcView('os')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap ${
                  procView === 'os'
                    ? 'os-accent-soft-bg os-accent-text'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                OS Processes ({metrics?.processes.length ?? 0})
              </button>
              <button
                type="button"
                onClick={() => setProcView('windows')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap ${
                  procView === 'windows'
                    ? 'os-accent-soft-bg os-accent-text'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Window Apps ({windows.length})
              </button>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              {isTauriRuntime() ? 'sysinfo (Rust)' : '/proc + ps (Host)'}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto os-scroll">
            {procView === 'os' ? (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-900/95 border-b border-slate-800 text-[11px] font-medium text-slate-400">
                  <tr>
                    <th className="py-2 px-3 w-20">PID</th>
                    <th className="py-2 px-3">Command</th>
                    <th className="py-2 px-3 w-20">State</th>
                    <th className="py-2 px-3 w-20 text-right">CPU</th>
                    <th className="py-2 px-3 w-24 text-right">RSS Memory</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {!metrics ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        Reading live host processes...
                      </td>
                    </tr>
                  ) : (
                    metrics.processes.map((proc) => (
                      <tr key={proc.pid} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2 px-3 font-mono-tabular text-slate-400">{proc.pid}</td>
                        <td className="py-2 px-3 font-medium text-slate-100 truncate max-w-[240px]">
                          {proc.name}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-400">
                          {proc.state}
                        </td>
                        <td className="py-2 px-3 text-right font-mono-tabular text-slate-200">
                          {proc.cpuPercent.toFixed(1)}%
                        </td>
                        <td className="py-2 px-3 text-right font-mono-tabular text-slate-200">
                          {proc.memoryMb.toFixed(1)} MB
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-900/95 border-b border-slate-800 text-[11px] font-medium text-slate-400">
                  <tr>
                    <th className="py-2 px-3">Window / App</th>
                    <th className="py-2 px-3 w-24">Status</th>
                    <th className="py-2 px-3 w-28">Bounds</th>
                    <th className="py-2 px-3 w-28 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {windows.map((win) => {
                    const isActive = win.id === topFocusedId && !win.isMinimized;
                    return (
                      <tr
                        key={win.id}
                        onClick={() => focusWindow(win.id)}
                        className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-slate-100 truncate max-w-[240px]">
                            {win.title}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono truncate">
                            {win.id}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={
                              win.isMinimized
                                ? 'text-slate-400'
                                : isActive
                                  ? 'os-accent-text font-medium'
                                  : 'text-slate-200'
                            }
                          >
                            {win.isMinimized ? 'Minimized' : 'Active'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono-tabular text-[11px] text-slate-400">
                          {Math.round(win.width)}×{Math.round(win.height)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              closeWindow(win.id);
                            }}
                            aria-label={`End Task ${win.title}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-950/60 hover:bg-red-600 border border-red-800/70 text-[11px] font-medium text-red-200 hover:text-white transition-colors whitespace-nowrap"
                          >
                            <XCircle className="w-3 h-3" />
                            <span>End Task</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
            </>
          )}

          <div className="flex items-center justify-between px-3 py-2 border-t border-slate-800 bg-slate-950/70 text-[11px] text-slate-400 font-mono-tabular">
            <span>
              {metrics ? `${metrics.processes.length} host PIDs · ${windows.length} windows` : `${windows.length} windows`}
            </span>
            <span>
              {metrics
                ? `Load: ${metrics.loadAvg.join(', ')} · Uptime: ${formatUptime(metrics.uptimeSec)}`
                : 'Connecting telemetry...'}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto os-scroll p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* CPU Chart */}
            <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-200">
                  <Cpu className="w-4 h-4 os-accent-text" />
                  <span>Host CPU</span>
                </div>
                <span className="text-sm font-semibold font-mono-tabular os-accent-text">
                  {metrics ? `${metrics.cpuPercent.toFixed(1)}%` : '--'}
                </span>
              </div>
              <svg
                viewBox="0 0 220 72"
                className="w-full h-20 bg-slate-900/70 rounded border border-slate-800/80"
              >
                <polyline
                  fill="none"
                  stroke="var(--os-accent-hover)"
                  strokeWidth="2"
                  points={buildSvgPolylinePoints(cpuHistory, 220, 72, 100)}
                />
              </svg>
              <div className="text-[11px] text-slate-400 truncate">
                {metrics ? `${metrics.cpuCores} cores · ${metrics.cpuModel}` : 'Reading CPU...'}
              </div>
            </div>

            {/* RAM Chart */}
            <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-200">
                  <MemoryStick className="w-4 h-4 text-emerald-400" />
                  <span>Physical RAM</span>
                </div>
                <span className="text-sm font-semibold font-mono-tabular text-emerald-400">
                  {metrics ? `${formatGb(metrics.memory.usedMb)}` : '--'}
                </span>
              </div>
              <svg
                viewBox="0 0 220 72"
                className="w-full h-20 bg-slate-900/70 rounded border border-slate-800/80"
              >
                <polyline
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="2"
                  points={buildSvgPolylinePoints(ramHistory, 220, 72, totalRamMb)}
                />
              </svg>
              <div className="text-[11px] text-slate-400 font-mono-tabular">
                {metrics
                  ? `${formatGb(metrics.memory.usedMb)} / ${formatGb(metrics.memory.totalMb)} (${metrics.memory.usedPercent.toFixed(1)}%)`
                  : 'Reading /proc/meminfo...'}
              </div>
            </div>

            {/* Network Chart */}
            <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-200">
                  <Network className="w-4 h-4 text-amber-400" />
                  <span>Network I/O</span>
                </div>
                <span className="text-sm font-semibold font-mono-tabular text-amber-400">
                  {metrics ? `${metrics.network.totalKbps.toFixed(1)} Kbps` : '--'}
                </span>
              </div>
              <svg
                viewBox="0 0 220 72"
                className="w-full h-20 bg-slate-900/70 rounded border border-slate-800/80"
              >
                <polyline
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="2"
                  points={buildSvgPolylinePoints(netHistory, 220, 72, maxNetKbps)}
                />
              </svg>
              <div className="text-[11px] text-slate-400 font-mono-tabular">
                {metrics
                  ? `RX ${metrics.network.rxKbps} · TX ${metrics.network.txKbps} Kbps`
                  : 'Reading /proc/net/dev...'}
              </div>
            </div>
          </div>

          {/* Per-Core CPU Utilization */}
          {metrics && metrics.corePercents.length > 0 && (
            <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-100">
                <HardDrive className="w-4 h-4 os-accent-text" />
                <span>Per-Core Utilization</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {metrics.corePercents.map((pct, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono-tabular">
                      <span className="text-slate-400">CPU {idx}</span>
                      <span className="text-slate-200">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full os-accent-bg transition-all duration-300"
                        style={{ width: `${Math.max(2, pct)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Real System Metadata */}
          <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-100">
              <Server className="w-4 h-4 os-accent-text" />
              <span>Host Kernel & Hardware Telemetry</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
              <div>
                <div className="text-[11px] text-slate-500">Hostname & Arch</div>
                <div className="font-medium text-slate-200 font-mono truncate">
                  {metrics ? `${metrics.hostname} (${metrics.arch})` : 'NizamOS'}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Kernel</div>
                <div className="font-medium text-slate-200 font-mono truncate">
                  {metrics?.platform ?? 'Linux'}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Uptime</div>
                <div className="font-medium font-mono-tabular text-slate-200">
                  {metrics ? formatUptime(metrics.uptimeSec) : '--'}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Telemetry Source</div>
                <div className="font-medium text-slate-200 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 os-accent-text" />
                  <span>{isTauriRuntime() ? 'Rust sysinfo' : 'Linux /proc SSE'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
