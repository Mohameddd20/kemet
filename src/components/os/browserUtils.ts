export type BrowserNavigationTarget =
  | { mode: 'newtab'; displayUrl: string; title: string }
  | { mode: 'search'; query: string; displayUrl: string; title: string }
  | { mode: 'web'; url: string; displayUrl: string; title: string };

export function isSelfKemetUrl(raw: string): boolean {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return false;
  if (trimmed.startsWith('/')) return true;
  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const host = parsed.hostname.toLowerCase();
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host === '[::1]' ||
      host.endsWith('.localhost')
    );
  } catch {
    return false;
  }
}

export function decodeDisplayUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return 'kemet://newtab';
  try {
    return decodeURI(trimmed);
  } catch {
    return trimmed;
  }
}

export function resolveOmniboxInput(raw: string): BrowserNavigationTarget {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === 'kemet://newtab' || trimmed === 'about:blank') {
    return {
      mode: 'newtab',
      displayUrl: 'kemet://newtab',
      title: 'تبويب جديد',
    };
  }

  if (trimmed.startsWith('kemet://search?q=')) {
    const query = decodeURIComponent(trimmed.slice('kemet://search?q='.length)).trim();
    return query
      ? {
          mode: 'search',
          query,
          displayUrl: `kemet://search?q=${query}`,
          title: query,
        }
      : {
          mode: 'newtab',
          displayUrl: 'kemet://newtab',
          title: 'تبويب جديد',
        };
  }

  // Guard against localhost/relative KemetOS self-recursion
  if (trimmed.startsWith('/')) {
    return {
      mode: 'newtab',
      displayUrl: 'kemet://newtab',
      title: 'تبويب جديد',
    };
  }

  const looksLikeUrl =
    /^https?:\/\//i.test(trimmed) ||
    (!trimmed.includes(' ') && /^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+/.test(trimmed));

  if (looksLikeUrl) {
    const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    if (isSelfKemetUrl(candidate)) {
      return {
        mode: 'newtab',
        displayUrl: 'kemet://newtab',
        title: 'تبويب جديد',
      };
    }
    try {
      const parsed = new URL(candidate);
      const hostname = parsed.hostname.replace(/^www\./, '');
      // If user pasted a search URL like duckduckgo.com/?q=..., handle as clean search view
      const qParam = parsed.searchParams.get('q');
      if (
        (hostname.includes('duckduckgo.com') || hostname.includes('google.com')) &&
        qParam &&
        qParam.trim()
      ) {
        const cleanQuery = qParam.trim();
        return {
          mode: 'search',
          query: cleanQuery,
          displayUrl: `https://${hostname}/?q=${cleanQuery}`,
          title: cleanQuery,
        };
      }
      return {
        mode: 'web',
        url: parsed.toString(),
        displayUrl: decodeDisplayUrl(parsed.toString()),
        title: hostname,
      };
    } catch {
      // Fall through to search
    }
  }

  return {
    mode: 'search',
    query: trimmed,
    displayUrl: `kemet://search?q=${trimmed}`,
    title: trimmed,
  };
}
