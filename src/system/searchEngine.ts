import type { AppId } from '../windowManager/types';

export interface SearchableAppItem {
  id: AppId;
  title: string;
  arabicTitle: string;
  description: string;
}

export interface SearchableFileItem {
  name: string;
  path: string;
}

export interface SearchableWebAppItem {
  id: string;
  name: string;
  url: string;
}

export interface SearchableStoreAppItem {
  id: string;
  name: string;
  arabicName: string;
  category: string;
  launchMode: 'web' | 'terminal' | 'tauri' | 'emulator';
  launchUrl?: string;
}

export interface UnifiedSearchResult {
  id: string;
  kind: 'app' | 'file' | 'webapp' | 'storeapp' | 'command' | 'math' | 'web';
  title: string;
  subtitle: string;
  score: number;
  appId?: AppId;
  filePath?: string;
  url?: string;
  storeAppId?: string;
  commandAction?: 'lock' | 'restart' | 'sleep' | 'settings-network' | 'settings-language' | 'settings-power';
}

const SYSTEM_COMMANDS: Array<{
  id: string;
  keywords: string[];
  title: string;
  subtitle: string;
  action: NonNullable<UnifiedSearchResult['commandAction']>;
}> = [
  {
    id: 'cmd-lock',
    keywords: ['lock', 'قفل', 'screen'],
    title: 'Lock NizamOS Screen',
    subtitle: 'System command · Security',
    action: 'lock',
  },
  {
    id: 'cmd-sleep',
    keywords: ['sleep', 'سكون', 'suspend'],
    title: 'Put System to Sleep',
    subtitle: 'Power command',
    action: 'sleep',
  },
  {
    id: 'cmd-restart',
    keywords: ['restart', 'reboot', 'اعادة', 'إعادة'],
    title: 'Restart Session',
    subtitle: 'Power command',
    action: 'restart',
  },
  {
    id: 'cmd-wifi',
    keywords: ['wifi', 'network', 'internet', 'واي فاي', 'شبكة'],
    title: 'Network & Internet Settings',
    subtitle: 'Open Settings > Network',
    action: 'settings-network',
  },
  {
    id: 'cmd-lang',
    keywords: ['language', 'arabic', 'english', 'لغة', 'عربي'],
    title: 'Language & Time Settings',
    subtitle: 'Switch EN / العربية or clock format',
    action: 'settings-language',
  },
  {
    id: 'cmd-power',
    keywords: ['battery', 'power', 'بطارية', 'طاقة'],
    title: 'Power & Battery Settings',
    subtitle: 'Inspect battery & power plan',
    action: 'settings-power',
  },
];

function trySafeArithmetic(raw: string): string | null {
  const expr = raw.replace(/^=\s*/, '').trim();
  if (!expr || !/^[0-9+\-*/().\s%]+$/.test(expr) || !/[+\-*/%]/.test(expr)) {
    return null;
  }
  try {
    const fn = new Function(`"use strict"; return (${expr});`) as () => unknown;
    const value = fn();
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)));
    }
    return null;
  } catch {
    return null;
  }
}

export function searchSystemEverything(
  query: string,
  apps: SearchableAppItem[],
  files: SearchableFileItem[],
  webApps: SearchableWebAppItem[],
  storeApps: SearchableStoreAppItem[] = []
): UnifiedSearchResult[] {
  const trimmed = query.trim();
  const q = trimmed.toLowerCase();

  if (!q) {
    return apps.slice(0, 6).map((app, i) => ({
      id: `app-${app.id}`,
      kind: 'app',
      title: app.title,
      subtitle: app.arabicTitle,
      score: 100 - i,
      appId: app.id,
    }));
  }

  const results: UnifiedSearchResult[] = [];

  const mathResult = trySafeArithmetic(trimmed);
  if (mathResult !== null) {
    results.push({
      id: 'math-eval',
      kind: 'math',
      title: `= ${mathResult}`,
      subtitle: `Calculator quick answer for "${trimmed}"`,
      score: 150,
      appId: 'calculator',
    });
  }

  for (const app of apps) {
    const titleLower = app.title.toLowerCase();
    const descLower = app.description.toLowerCase();
    let score = 0;
    if (titleLower === q) score = 120;
    else if (titleLower.startsWith(q)) score = 105;
    else if (titleLower.includes(q) || app.arabicTitle.includes(trimmed)) score = 90;
    else if (descLower.includes(q)) score = 70;

    if (score > 0) {
      results.push({
        id: `app-${app.id}`,
        kind: 'app',
        title: app.title,
        subtitle: `${app.arabicTitle} · ${app.description}`,
        score,
        appId: app.id,
      });
    }
  }

  for (const webApp of webApps) {
    const nameLower = webApp.name.toLowerCase();
    if (nameLower.includes(q) || webApp.url.toLowerCase().includes(q)) {
      results.push({
        id: `webapp-${webApp.id}`,
        kind: 'webapp',
        title: webApp.name,
        subtitle: `Web App · ${webApp.url}`,
        score: nameLower.startsWith(q) ? 98 : 82,
        appId: 'browser',
        url: webApp.url,
      });
    }
  }

  for (const file of files) {
    const nameLower = file.name.toLowerCase();
    const pathLower = file.path.toLowerCase();
    if (nameLower.includes(q) || pathLower.includes(q)) {
      results.push({
        id: `file-${file.path}`,
        kind: 'file',
        title: file.name,
        subtitle: file.path,
        score: nameLower.startsWith(q) ? 95 : 75,
        appId: 'editor',
        filePath: file.path,
      });
    }
  }

  for (const sa of storeApps) {
    const nameLower = sa.name.toLowerCase();
    if (nameLower.includes(q) || sa.arabicName.includes(trimmed) || sa.category.toLowerCase().includes(q)) {
      results.push({
        id: `store-${sa.id}`,
        kind: 'storeapp',
        title: sa.name,
        subtitle: `Nizam Store · ${sa.category}`,
        score: nameLower.startsWith(q) ? 102 : 85,
        appId: sa.launchMode === 'web' && sa.launchUrl ? 'browser' : 'store',
        url: sa.launchUrl,
        storeAppId: sa.id,
      });
    }
  }

  for (const cmd of SYSTEM_COMMANDS) {
    if (
      cmd.title.toLowerCase().includes(q) ||
      cmd.keywords.some((k) => k.includes(q) || q.includes(k))
    ) {
      results.push({
        id: cmd.id,
        kind: 'command',
        title: cmd.title,
        subtitle: cmd.subtitle,
        score: 88,
        commandAction: cmd.action,
      });
    }
  }

  if (trimmed.length >= 2) {
    const targetUrl =
      trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? trimmed
        : trimmed.includes('.') && !trimmed.includes(' ')
          ? `https://${trimmed}`
          : `https://html.duckduckgo.com/html/?q=${encodeURIComponent(trimmed)}`;

    results.push({
      id: 'web-fallback',
      kind: 'web',
      title: `Search the web for "${trimmed}"`,
      subtitle: targetUrl,
      score: 30,
      appId: 'browser',
      url: targetUrl,
    });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 12);
}
