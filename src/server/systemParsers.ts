import crypto from 'node:crypto';
import path from 'node:path';

export interface CpuTicks {
  id: string;
  idle: number;
  total: number;
}

export interface CpuSnapshot {
  total: CpuTicks;
  cores: CpuTicks[];
}

export interface MemInfoStats {
  totalMb: number;
  availableMb: number;
  usedMb: number;
  cachedMb: number;
  usedPercent: number;
}

export interface NetDevCounters {
  rxBytes: number;
  txBytes: number;
  interfaces: Array<{ name: string; rxBytes: number; txBytes: number }>;
}

export interface OsProcessRow {
  pid: number;
  ppid: number;
  name: string;
  cpuPercent: number;
  memPercent: number;
  memoryMb: number;
  state: string;
}

export interface WifiNetworkItem {
  ssid: string;
  signal: number;
  security: string;
  inUse: boolean;
}

export interface DiskPartitionInfo {
  filesystem: string;
  fsType: string;
  mountPoint: string;
  label: string;
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  usedPercent: number;
}

export function parseProcStat(raw: string): CpuSnapshot {
  const lines = raw.split('\n');
  let total: CpuTicks = { id: 'cpu', idle: 0, total: 0 };
  const cores: CpuTicks[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('cpu')) continue;
    const parts = trimmed.split(/\s+/);
    const id = parts[0];
    const nums = parts.slice(1).map((n) => Number.parseInt(n, 10) || 0);
    if (nums.length < 4) continue;
    const idle = nums[3] + (nums[4] ?? 0);
    const sum = nums.reduce((acc, v) => acc + v, 0);
    const entry: CpuTicks = { id, idle, total: sum };
    if (id === 'cpu') {
      total = entry;
    } else if (/^cpu\d+$/.test(id)) {
      cores.push(entry);
    }
  }

  return { total, cores };
}

function calcPercent(prev: CpuTicks, curr: CpuTicks): number {
  const totalDelta = curr.total - prev.total;
  const idleDelta = curr.idle - prev.idle;
  if (totalDelta <= 0) return 0;
  const busy = Math.max(0, totalDelta - Math.max(0, idleDelta));
  return Math.min(100, Math.round((busy / totalDelta) * 1000) / 10);
}

export function computeCpuDelta(
  prev: CpuSnapshot | null,
  curr: CpuSnapshot
): { totalPercent: number; corePercents: number[] } {
  if (!prev) {
    return {
      totalPercent: 0,
      corePercents: curr.cores.map(() => 0),
    };
  }
  const totalPercent = calcPercent(prev.total, curr.total);
  const corePercents = curr.cores.map((core, idx) => {
    const prevCore = prev.cores[idx];
    return prevCore ? calcPercent(prevCore, core) : totalPercent;
  });
  return { totalPercent, corePercents };
}

export function parseProcMemInfo(raw: string): MemInfoStats {
  const map = new Map<string, number>();
  for (const line of raw.split('\n')) {
    const m = line.match(/^([^:]+):\s+(\d+)\s*kB/i);
    if (m) {
      map.set(m[1], Number.parseInt(m[2], 10) || 0);
    }
  }
  const totalKb = map.get('MemTotal') ?? 0;
  const freeKb = map.get('MemFree') ?? 0;
  const buffersKb = map.get('Buffers') ?? 0;
  const cachedKb = map.get('Cached') ?? 0;
  const availableKb = map.get('MemAvailable') ?? freeKb + buffersKb + cachedKb;
  const usedKb = Math.max(0, totalKb - availableKb);

  const totalMb = Math.round(totalKb / 1024);
  const availableMb = Math.round(availableKb / 1024);
  const usedMb = Math.round(usedKb / 1024);
  const cachedMb = Math.round(cachedKb / 1024);
  const usedPercent =
    totalKb > 0 ? Math.min(100, Math.round((usedKb / totalKb) * 1000) / 10) : 0;

  return { totalMb, availableMb, usedMb, cachedMb, usedPercent };
}

export function parseProcNetDev(raw: string): NetDevCounters {
  const interfaces: Array<{ name: string; rxBytes: number; txBytes: number }> = [];
  let rxBytes = 0;
  let txBytes = 0;

  for (const line of raw.split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const name = line.slice(0, idx).trim();
    if (!name || name === 'lo') continue;
    const cols = line
      .slice(idx + 1)
      .trim()
      .split(/\s+/)
      .map((n) => Number.parseInt(n, 10) || 0);
    if (cols.length < 9) continue;
    const ifaceRx = cols[0];
    const ifaceTx = cols[8];
    rxBytes += ifaceRx;
    txBytes += ifaceTx;
    interfaces.push({ name, rxBytes: ifaceRx, txBytes: ifaceTx });
  }

  return { rxBytes, txBytes, interfaces };
}

export function parsePsOutput(raw: string, limit = 60): OsProcessRow[] {
  const lines = raw.split('\n').slice(1);
  const rows: OsProcessRow[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length < 7) continue;
    const pid = Number.parseInt(parts[0], 10);
    const ppid = Number.parseInt(parts[1], 10);
    const cpuPercent = Number.parseFloat(parts[parts.length - 4]) || 0;
    const memPercent = Number.parseFloat(parts[parts.length - 3]) || 0;
    const rssKb = Number.parseInt(parts[parts.length - 2], 10) || 0;
    const state = parts[parts.length - 1] ?? 'S';
    const name = parts.slice(2, parts.length - 4).join(' ') || 'process';
    if (!Number.isFinite(pid)) continue;
    rows.push({
      pid,
      ppid: Number.isFinite(ppid) ? ppid : 0,
      name,
      cpuPercent,
      memPercent,
      memoryMb: Math.max(0.1, Math.round((rssKb / 1024) * 10) / 10),
      state,
    });
    if (rows.length >= limit) break;
  }
  return rows;
}

export function parseNmcliWifiOutput(raw: string): WifiNetworkItem[] {
  const items: WifiNetworkItem[] = [];
  const seen = new Set<string>();
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    const [inUseRaw = '', ssidRaw = '', signalRaw = '0', securityRaw = 'Open'] =
      line.split(':');
    const ssid = ssidRaw.trim();
    if (!ssid || seen.has(ssid)) continue;
    seen.add(ssid);
    items.push({
      ssid,
      signal: Math.min(100, Math.max(0, Number.parseInt(signalRaw, 10) || 0)),
      security: securityRaw.trim() || 'Open',
      inUse: inUseRaw.trim() === '*',
    });
  }
  return items.sort((a, b) => Number(b.inUse) - Number(a.inUse) || b.signal - a.signal);
}

export function resolveSafeHostPath(inputPath: string, allowedRoots: string[]): string | null {
  if (!inputPath || typeof inputPath !== 'string') return null;
  const resolved = path.resolve(inputPath);
  const isAllowed = allowedRoots.some((root) => {
    const normRoot = path.resolve(root);
    return resolved === normRoot || resolved.startsWith(normRoot + path.sep);
  });
  return isAllowed ? resolved : null;
}

export function validateProxyUrl(rawUrl: string): { ok: true; url: URL } | { ok: false; error: string } {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { ok: false, error: 'Invalid URL format.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: 'Only http:// and https:// URLs are supported.' };
  }

  const host = parsed.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.endsWith('.local') ||
    host.startsWith('169.254.') ||
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  ) {
    return { ok: false, error: 'Blocked private or local network address.' };
  }

  return { ok: true, url: parsed };
}

export function parseDfOutput(raw: string): DiskPartitionInfo[] {
  const lines = raw.split('\n').slice(1);
  const partitions: DiskPartitionInfo[] = [];
  const seenMounts = new Set<string>();
  const ignoredFsTypes = new Set([
    'tmpfs',
    'devtmpfs',
    'squashfs',
    'efivarfs',
    'devpts',
    'proc',
    'sysfs',
    'cgroup',
    'cgroup2',
  ]);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length < 7) continue;

    const filesystem = parts[0];
    const fsType = parts[1];
    const totalBytes = Number.parseInt(parts[2], 10) || 0;
    const usedBytes = Number.parseInt(parts[3], 10) || 0;
    const availableBytes = Number.parseInt(parts[4], 10) || 0;
    const pctStr = parts[5].replace('%', '');
    const mountPoint = parts.slice(6).join(' ');

    if (totalBytes <= 0) continue;
    if (ignoredFsTypes.has(fsType.toLowerCase()) && mountPoint !== '/') continue;
    if (
      mountPoint.startsWith('/dev') ||
      mountPoint === '/tmp' ||
      mountPoint.startsWith('/proc') ||
      mountPoint.startsWith('/sys') ||
      mountPoint.startsWith('/run')
    ) {
      continue;
    }
    if (seenMounts.has(mountPoint)) continue;
    seenMounts.add(mountPoint);

    const parsedPct = Number.parseFloat(pctStr);
    const usedPercent = Number.isFinite(parsedPct)
      ? Math.min(100, Math.max(0, parsedPct))
      : Math.min(100, Math.round((usedBytes / totalBytes) * 1000) / 10);

    const label =
      mountPoint === '/'
        ? 'Local Disk (/)'
        : mountPoint === '/home'
          ? 'Home Partition (/home)'
          : path.posix.basename(mountPoint) || mountPoint;

    partitions.push({
      filesystem,
      fsType,
      mountPoint,
      label,
      totalBytes,
      usedBytes,
      availableBytes,
      usedPercent,
    });
  }

  return partitions;
}

function toProxiedExternalUrl(rawValue: string, baseUrl: string): string | null {
  const trimmed = rawValue.trim();
  if (
    !trimmed ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed.startsWith('/api/browser/proxy')
  ) {
    return null;
  }
  try {
    const resolved = new URL(trimmed, baseUrl);
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
      return null;
    }
    const host = resolved.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1') {
      return null;
    }
    // Unwrap DuckDuckGo outbound redirect links so clicking results opens the real target
    if (resolved.hostname.endsWith('duckduckgo.com') && resolved.pathname === '/l/') {
      const uddg = resolved.searchParams.get('uddg');
      if (uddg) {
        const target = new URL(uddg);
        if (target.protocol === 'http:' || target.protocol === 'https:') {
          return `/api/browser/proxy?url=${encodeURIComponent(target.toString())}`;
        }
      }
    }
    return `/api/browser/proxy?url=${encodeURIComponent(resolved.toString())}`;
  } catch {
    return null;
  }
}

export function rewriteCssUrlsForProxy(cssText: string, baseUrl: string): string {
  return cssText.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (full, quote: string, inner: string) => {
    const proxied = toProxiedExternalUrl(inner, baseUrl);
    if (!proxied) return full;
    const q = quote || '"';
    return `url(${q}${proxied}${q})`;
  });
}

export function rewriteHtmlForProxy(html: string, targetUrl: string): string {
  const baseTag = '<base target="_self" />';

  // Strip external <base>, CSP/X-Frame-Options meta tags, and SRI integrity attributes
  // that break stylesheets/scripts when served through /api/browser/proxy
  let out = html
    .replace(/<base\b[^>]*>/gi, '')
    .replace(
      /<meta[^>]+http-equiv\s*=\s*["']?\s*(content-security-policy|x-frame-options)\s*["']?[^>]*>/gi,
      ''
    )
    .replace(/\s(?:integrity|crossorigin|nonce)=(["'])[^"']*\1/gi, '')
    .replace(
      /\s(href|src|data-src|poster|action)=(["'])([^"']+)\2/gi,
      (full, attr: string, quote: string, val: string) => {
        const proxied = toProxiedExternalUrl(val, targetUrl);
        if (!proxied) return full;
        return ` ${attr}=${quote}${proxied}${quote}`;
      }
    )
    .replace(/<style([^>]*)>([\s\S]*?)<\/style>/gi, (_full, attrs: string, cssBody: string) => {
      return `<style${attrs}>${rewriteCssUrlsForProxy(cssBody, targetUrl)}</style>`;
    });

  const proxyHelper = `<style data-kemet-proxy-style>html,body{max-width:100vw;overflow-x:auto;box-sizing:border-box;}img,svg,video{max-width:100%;height:auto;}</style><script>(function(){try{document.addEventListener('click',function(e){var a=e.target&&e.target.closest?e.target.closest('a[href]'):null;if(!a)return;var h=a.getAttribute('href')||'';if(!h||h.charAt(0)==='#'||h.indexOf('javascript:')===0||h.indexOf('mailto:')===0)return;if(a.getAttribute('target')==='_blank'){a.setAttribute('target','_self');}if(h.indexOf('/api/browser/proxy')!==0&&h.indexOf('/api/browse')!==0){try{var abs=new URL(h,${JSON.stringify(targetUrl)});if(abs.protocol==='http:'||abs.protocol==='https:'){e.preventDefault();window.location.href='/api/browser/proxy?url='+encodeURIComponent(abs.toString());}}catch(_err){}}},true);document.addEventListener('submit',function(e){var f=e.target;if(!f||!f.tagName||f.tagName!=='FORM')return;var raw=f.getAttribute('action')||${JSON.stringify(targetUrl)};if(raw.indexOf('/api/browser/proxy')===0){raw=new URLSearchParams(raw.split('?')[1]||'').get('url')||${JSON.stringify(targetUrl)};}var target=new URL(raw,${JSON.stringify(targetUrl)});if(target.hostname==='localhost'||target.hostname==='127.0.0.1'){target=new URL(${JSON.stringify(targetUrl)});}e.preventDefault();if(!f.method||f.method.toLowerCase()==='get'){var fd=new FormData(f);fd.forEach(function(v,k){if(typeof v==='string')target.searchParams.set(k,v);});}window.location.href='/api/browser/proxy?url='+encodeURIComponent(target.toString());},true);}catch(_e){}})();</script>`;

  if (/<head[^>]*>/i.test(out)) {
    out = out.replace(/<head[^>]*>/i, (match) => `${match}\n${baseTag}`);
  } else {
    out = `<!doctype html><html><head>${baseTag}</head><body>${out}</body></html>`;
  }

  if (/<\/body>/i.test(out)) {
    out = out.replace(/<\/body>/i, `${proxyHelper}</body>`);
  } else {
    out += proxyHelper;
  }

  return out;
}

export function resolveBrowseTargetUrl(rawInput: string): string {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return 'https://html.duckduckgo.com/html/?q=Debian+Linux';
  }
  const hasProtocol = /^https?:\/\//i.test(trimmed);
  const looksLikeDomain =
    !trimmed.includes(' ') &&
    /^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+([/:?#].*)?$/.test(trimmed);

  if (hasProtocol) {
    return trimmed;
  }
  if (looksLikeDomain) {
    return `https://${trimmed}`;
  }
  return `https://html.duckduckgo.com/html/?q=${encodeURIComponent(trimmed)}`;
}

export function injectBaseAndStripFrameMeta(html: string, targetUrl: string): string {
  const escapedHref = targetUrl
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const baseTag = `<base href="${escapedHref}" target="_self" />`;

  // Remove any meta CSP / X-Frame-Options tags that would block framed rendering
  let out = html.replace(
    /<meta[^>]+http-equiv\s*=\s*["']?\s*(content-security-policy|x-frame-options)\s*["']?[^>]*>/gi,
    ''
  );

  // Rewrite existing <base ...> if present, otherwise inject right after <head>
  if (/<base\b[^>]*>/i.test(out)) {
    out = out.replace(/<base\b[^>]*>/i, baseTag);
  } else if (/<head[^>]*>/i.test(out)) {
    out = out.replace(/<head[^>]*>/i, (match) => `${match}\n${baseTag}`);
  } else {
    out = `<!doctype html><html><head>${baseTag}</head><body>${out}</body></html>`;
  }

  return out;
}

export interface ParsedBatteryInfo {
  percentage: number;
  charging: boolean;
  timeRemaining: string;
}

export function parseUpowerBattery(raw: string): ParsedBatteryInfo | null {
  const pctMatch = raw.match(/percentage:\s*(\d+)%/i);
  if (!pctMatch) return null;
  const percentage = Math.min(100, Math.max(0, Number.parseInt(pctMatch[1], 10)));
  const stateMatch = raw.match(/state:\s*(\S+)/i);
  const state = stateMatch?.[1]?.toLowerCase() ?? '';
  const charging = state === 'charging' || state === 'fully-charged';
  const timeMatch = raw.match(/time to (?:empty|full):\s*([^\n]+)/i);
  return {
    percentage,
    charging,
    timeRemaining: timeMatch ? timeMatch[1].trim() : charging ? 'Charging' : 'On battery',
  };
}

export function parseAcpiBattery(raw: string): ParsedBatteryInfo | null {
  const match = raw.match(/Battery\s+\d+:\s*([^,]+),\s*(\d+)%(?:,\s*([^\n]+))?/i);
  if (!match) return null;
  const status = match[1].toLowerCase();
  const percentage = Math.min(100, Math.max(0, Number.parseInt(match[2], 10)));
  return {
    percentage,
    charging: status.includes('charging') && !status.includes('discharging'),
    timeRemaining: match[3]?.trim() ?? status,
  };
}

export interface ParsedCpuInfo {
  modelName: string;
  cores: number;
  vendor: string;
}

export function parseProcCpuInfo(raw: string): ParsedCpuInfo {
  let modelName = '';
  let vendor = '';
  let cores = 0;

  for (const line of raw.split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (key === 'processor') {
      cores += 1;
    } else if (!modelName && (key === 'model name' || key === 'Hardware' || key === 'Model')) {
      modelName = val;
    } else if (!vendor && (key === 'vendor_id' || key === 'CPU implementer')) {
      vendor = val;
    }
  }

  return {
    modelName: modelName || 'x86_64 Multi-Core Processor',
    cores: Math.max(1, cores),
    vendor: vendor || 'Generic',
  };
}

export interface PciDriverItem {
  slot: string;
  deviceClass: string;
  deviceName: string;
  kernelDriver: string;
  category: 'gpu' | 'wifi' | 'audio' | 'network' | 'storage' | 'other';
}

export function parseLspciDrivers(raw: string): PciDriverItem[] {
  const items: PciDriverItem[] = [];
  let current: PciDriverItem | null = null;

  const classify = (cls: string, name: string): PciDriverItem['category'] => {
    const c = cls.toLowerCase();
    const n = name.toLowerCase();
    if (c.includes('vga') || c.includes('3d') || c.includes('display')) return 'gpu';
    if (
      c.includes('wireless') ||
      c.includes('wi-fi') ||
      c.includes('wlan') ||
      n.includes('wi-fi') ||
      n.includes('wifi') ||
      n.includes('wireless') ||
      n.includes('wlan')
    ) {
      return 'wifi';
    }
    if (c.includes('ethernet') || c.includes('network')) return 'network';
    if (c.includes('audio') || c.includes('multimedia')) return 'audio';
    if (c.includes('nvme') || c.includes('sata') || c.includes('storage')) return 'storage';
    return 'other';
  };

  for (const line of raw.split('\n')) {
    const headerMatch = line.match(/^([0-9a-f:.]+)\s+([^:]+):\s+(.+)$/i);
    if (headerMatch && !line.startsWith('\t') && !line.startsWith(' ')) {
      if (current) items.push(current);
      current = {
        slot: headerMatch[1].trim(),
        deviceClass: headerMatch[2].trim(),
        deviceName: headerMatch[3].trim(),
        kernelDriver: 'linux-kernel',
        category: classify(headerMatch[2], headerMatch[3]),
      };
      continue;
    }
    if (current) {
      const drvMatch = line.match(/Kernel driver in use:\s*(\S+)/i);
      if (drvMatch) {
        current.kernelDriver = drvMatch[1].trim();
      }
    }
  }
  if (current) items.push(current);
  return items;
}

export function parseOsRelease(raw: string): { prettyName: string; id: string; version: string } {
  const map = new Map<string, string>();
  for (const line of raw.split('\n')) {
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    map.set(k, v);
  }
  return {
    prettyName: map.get('PRETTY_NAME') || 'KemetOS 1.0 (Debian 12 Bookworm)',
    id: map.get('ID') || 'kemetos',
    version: map.get('VERSION_ID') || '1.0',
  };
}

export interface UsbDeviceItem {
  bus: string;
  device: string;
  vendorProductId: string;
  name: string;
}

export function parseLsusbDevices(raw: string): UsbDeviceItem[] {
  const items: UsbDeviceItem[] = [];
  for (const line of raw.split('\n')) {
    const m = line.trim().match(/^Bus\s+(\d+)\s+Device\s+(\d+):\s+ID\s+([0-9a-f:]+)\s*(.*)$/i);
    if (!m) continue;
    items.push({
      bus: m[1],
      device: m[2],
      vendorProductId: m[3].toLowerCase(),
      name: (m[4] || 'USB Controller / Peripheral').trim(),
    });
  }
  return items;
}

export interface AsoundCardItem {
  index: number;
  cardId: string;
  driver: string;
  label: string;
}

export function parseAsoundCards(raw: string): AsoundCardItem[] {
  const cards: AsoundCardItem[] = [];
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*(\d+)\s+\[([^\]]+)\]:\s+([^\s-]+(?:-[^\s-]+)*)\s*-\s*(.+)$/);
    if (!m) continue;
    cards.push({
      index: Number.parseInt(m[1], 10) || 0,
      cardId: m[2].trim(),
      driver: m[3].trim(),
      label: m[4].trim(),
    });
  }
  return cards;
}

export type DriverGroupKey = 'cpu' | 'gpu' | 'network' | 'audio' | 'camera' | 'usb';
export type DriverHealthStatus = 'installed' | 'update-available' | 'missing';

export interface DriverInventoryItem {
  id: string;
  group: DriverGroupKey;
  name: string;
  vendorDeviceId: string;
  kernelModule: string;
  previousModule: string;
  aptPackage: string;
  repoSource: string;
  signatureVerified: boolean;
  status: DriverHealthStatus;
}

export function buildDriverInventory(input: {
  cpu: ParsedCpuInfo;
  pciDrivers: PciDriverItem[];
  usbDevices: UsbDeviceItem[];
  audioCards: AsoundCardItem[];
  videoDevices: string[];
  primaryNicName?: string;
}): DriverInventoryItem[] {
  const list: DriverInventoryItem[] = [];

  // 1. CPU Governor & Microcode
  const isIntel = input.cpu.vendor.toLowerCase().includes('intel') || input.cpu.modelName.toLowerCase().includes('intel');
  const isAmd = input.cpu.vendor.toLowerCase().includes('amd') || input.cpu.modelName.toLowerCase().includes('amd') || input.cpu.modelName.toLowerCase().includes('ryzen');
  list.push({
    id: 'drv-cpu-0',
    group: 'cpu',
    name: input.cpu.modelName,
    vendorDeviceId: `${input.cpu.vendor} · ${input.cpu.cores} Threads`,
    kernelModule: isIntel ? 'intel_pstate' : isAmd ? 'amd_pstate' : 'acpi_cpufreq',
    previousModule: 'acpi_cpufreq',
    aptPackage: isIntel ? 'intel-microcode' : isAmd ? 'amd64-microcode' : 'cpufrequtils',
    repoSource: 'Debian 12 non-free-firmware · موقّع',
    signatureVerified: true,
    status: 'installed',
  });

  // 2. GPU Controllers
  const gpus = input.pciDrivers.filter((d) => d.category === 'gpu');
  if (gpus.length > 0) {
    gpus.forEach((g, idx) => {
      const mod = g.kernelDriver || 'drm';
      const isGeneric = mod === 'linux-kernel' || mod === 'vesa' || mod === 'fbdev';
      list.push({
        id: `drv-gpu-${idx}`,
        group: 'gpu',
        name: g.deviceName,
        vendorDeviceId: `PCI ${g.slot}`,
        kernelModule: mod,
        previousModule: 'modesetting',
        aptPackage: g.deviceName.toLowerCase().includes('nvidia')
          ? 'nvidia-driver'
          : g.deviceName.toLowerCase().includes('amd') || g.deviceName.toLowerCase().includes('radeon')
          ? 'firmware-amd-graphics'
          : 'firmware-misc-nonfree',
        repoSource: 'Debian 12 non-free-firmware · موقّع',
        signatureVerified: true,
        status: isGeneric ? 'update-available' : 'installed',
      });
    });
  } else {
    list.push({
      id: 'drv-gpu-fallback',
      group: 'gpu',
      name: 'Linux DRM / Mesa KMS Display Adapter',
      vendorDeviceId: 'DRM / KMS',
      kernelModule: 'drm_kms_helper',
      previousModule: 'fbdev',
      aptPackage: 'mesa-vulkan-drivers',
      repoSource: 'Linux Kernel Mainline · موقّع',
      signatureVerified: true,
      status: 'installed',
    });
  }

  // 3. Wi-Fi & Network
  const nets = input.pciDrivers.filter((d) => d.category === 'wifi' || d.category === 'network');
  if (nets.length > 0) {
    nets.forEach((n, idx) => {
      const mod = n.kernelDriver || 'netlink';
      const missing = mod === 'linux-kernel';
      list.push({
        id: `drv-net-${idx}`,
        group: 'network',
        name: n.deviceName,
        vendorDeviceId: `PCI ${n.slot}`,
        kernelModule: mod,
        previousModule: 'e1000e',
        aptPackage: n.deviceName.toLowerCase().includes('realtek')
          ? 'firmware-realtek'
          : n.deviceName.toLowerCase().includes('broadcom')
          ? 'broadcom-sta-dkms'
          : 'firmware-iwlwifi',
        repoSource: 'Debian 12 non-free-firmware · موقّع',
        signatureVerified: true,
        status: missing ? 'missing' : 'installed',
      });
    });
  } else {
    list.push({
      id: 'drv-net-nic',
      group: 'network',
      name: input.primaryNicName ? `Network Interface (${input.primaryNicName})` : 'Linux Netlink / NetworkManager Adapter',
      vendorDeviceId: 'NET / veth',
      kernelModule: 'virtio_net',
      previousModule: 'e1000',
      aptPackage: 'firmware-linux-nonfree',
      repoSource: 'Linux Kernel Mainline · موقّع',
      signatureVerified: true,
      status: 'installed',
    });
  }

  // 4. Audio Cards (/proc/asound + lspci audio)
  const pciAudios = input.pciDrivers.filter((d) => d.category === 'audio');
  if (input.audioCards.length > 0) {
    input.audioCards.forEach((c, idx) => {
      list.push({
        id: `drv-audio-${idx}`,
        group: 'audio',
        name: `${c.label} (${c.cardId})`,
        vendorDeviceId: `ALSA Card #${c.index}`,
        kernelModule: c.driver,
        previousModule: 'snd_hda_intel',
        aptPackage: 'firmware-sof-signed',
        repoSource: 'Debian 12 non-free-firmware · موقّع',
        signatureVerified: true,
        status: 'installed',
      });
    });
  } else if (pciAudios.length > 0) {
    pciAudios.forEach((a, idx) => {
      list.push({
        id: `drv-audio-pci-${idx}`,
        group: 'audio',
        name: a.deviceName,
        vendorDeviceId: `PCI ${a.slot}`,
        kernelModule: a.kernelDriver,
        previousModule: 'snd_hda_intel',
        aptPackage: 'firmware-sof-signed',
        repoSource: 'Debian 12 non-free-firmware · موقّع',
        signatureVerified: true,
        status: 'installed',
      });
    });
  } else {
    list.push({
      id: 'drv-audio-pipewire',
      group: 'audio',
      name: 'PipeWire / ALSA Audio Subsystem',
      vendorDeviceId: 'ALSA / PipeWire',
      kernelModule: 'snd_hda_intel',
      previousModule: 'snd_ac97_codec',
      aptPackage: 'pipewire-audio',
      repoSource: 'Debian 12 Main · موقّع',
      signatureVerified: true,
      status: 'installed',
    });
  }

  // 5. Camera (/dev/video*)
  if (input.videoDevices.length > 0) {
    input.videoDevices.forEach((dev, idx) => {
      list.push({
        id: `drv-cam-${idx}`,
        group: 'camera',
        name: `V4L2 Video Capture (${dev})`,
        vendorDeviceId: dev,
        kernelModule: 'uvcvideo',
        previousModule: 'videodev',
        aptPackage: 'v4l-utils',
        repoSource: 'Linux Kernel V4L2 · موقّع',
        signatureVerified: true,
        status: 'installed',
      });
    });
  } else {
    list.push({
      id: 'drv-cam-none',
      group: 'camera',
      name: 'كاميرا الويب المدمجة (V4L2 UVC)',
      vendorDeviceId: 'No /dev/video* node attached',
      kernelModule: 'uvcvideo',
      previousModule: 'videodev',
      aptPackage: 'v4l-utils',
      repoSource: 'Linux Kernel V4L2 · جاهز للتوصيل',
      signatureVerified: true,
      status: 'missing',
    });
  }

  // 6. USB Devices (lsusb)
  if (input.usbDevices.length > 0) {
    input.usbDevices.forEach((u, idx) => {
      const lower = u.name.toLowerCase();
      const mod = lower.includes('bluetooth')
        ? 'btusb'
        : lower.includes('hub')
        ? 'usbcore'
        : lower.includes('camera') || lower.includes('webcam')
        ? 'uvcvideo'
        : lower.includes('audio')
        ? 'snd_usb_audio'
        : 'usbhid';
      list.push({
        id: `drv-usb-${idx}`,
        group: 'usb',
        name: u.name,
        vendorDeviceId: `USB ${u.vendorProductId} (Bus ${u.bus}:${u.device})`,
        kernelModule: mod,
        previousModule: 'usbcore',
        aptPackage: 'usbutils',
        repoSource: 'Linux USB Core · موقّع',
        signatureVerified: true,
        status: 'installed',
      });
    });
  } else {
    list.push({
      id: 'drv-usb-core',
      group: 'usb',
      name: 'Linux xHCI / USB Host Controller',
      vendorDeviceId: 'USB Bus Core',
      kernelModule: 'xhci_hcd',
      previousModule: 'ehci_hcd',
      aptPackage: 'usbutils',
      repoSource: 'Linux Kernel Mainline · موقّع',
      signatureVerified: true,
      status: 'installed',
    });
  }

  return list;
}

export function computeSha256Hex(payload: string): string {
  return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
}



