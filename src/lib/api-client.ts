// Tiny fetch wrapper that forwards ?mock=1 from the page URL into every
// /api/* call. Keeps the demo "mock mode" toggle on a single URL query
// param — no env var, no separate routes. SSR-safe: if window is absent
// (during prerender) it falls back to plain fetch.

export function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  if (typeof window === 'undefined') return fetch(input, init);
  const pageParams = new URLSearchParams(window.location.search);
  const mock = pageParams.get('mock');
  if (mock !== '1') return fetch(input, init);

  const sep = input.includes('?') ? '&' : '?';
  return fetch(`${input}${sep}mock=1`, init);
}

export function isMockMode(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('mock') === '1';
}
