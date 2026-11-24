export interface QuickLaunchSite {
  id: string;
  label: string;
  url: string;
  category: 'Search' | 'Video' | 'Code' | 'AI' | 'Reference' | 'Local';
}

export const QUICK_LAUNCH_SITES: QuickLaunchSite[] = [
  {
    id: 'site-google',
    label: 'Google',
    url: 'https://www.google.com/search?q=NizamOS',
    category: 'Search',
  },
  {
    id: 'site-duckduckgo',
    label: 'DuckDuckGo',
    url: 'https://html.duckduckgo.com/html/?q=operating+system',
    category: 'Search',
  },
  {
    id: 'site-youtube',
    label: 'YouTube',
    url: 'https://www.youtube.com',
    category: 'Video',
  },
  {
    id: 'site-github',
    label: 'GitHub',
    url: 'https://github.com/explore',
    category: 'Code',
  },
  {
    id: 'site-chatgpt',
    label: 'ChatGPT',
    url: 'https://chatgpt.com',
    category: 'AI',
  },
  {
    id: 'site-wikipedia',
    label: 'Wikipedia',
    url: 'https://en.m.wikipedia.org/wiki/Operating_system',
    category: 'Reference',
  },
  {
    id: 'site-welcome',
    label: 'VFS Welcome',
    url: 'nizamos://home/user/Documents/welcome.md',
    category: 'Local',
  },
];

export function resolveBrowserInput(rawInput: string): string {
  const trimmed = rawInput.trim();
  if (!trimmed) return 'nizamos://home/user/Documents/welcome.md';

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('nizamos://')
  ) {
    return trimmed;
  }

  if (trimmed.startsWith('/')) {
    return `nizamos://${trimmed.slice(1)}`;
  }

  // Domain-like input without spaces (e.g. example.com, docs.python.org/3)
  if (!trimmed.includes(' ') && /^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  // Real internet search engine routed cleanly via /api/browser/proxy
  return `https://html.duckduckgo.com/html/?q=${encodeURIComponent(trimmed)}`;
}

export function deriveTabTitle(url: string): string {
  if (url.startsWith('nizamos://')) {
    const file = url.split('/').pop() || 'Document';
    return file;
  }
  try {
    const parsed = new URL(url);
    const q = parsed.searchParams.get('q') || parsed.searchParams.get('search');
    if (q) {
      return `Search: ${q}`;
    }
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url.slice(0, 24);
  }
}
