import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// D1 — lightweight per-IP rate limit on the public API routes. Every /api/* route
// makes paid Gemini calls and the demo is deployed at a public URL with no auth,
// so without this anyone could loop a route and drain the API quota/cost.
//
// In-memory sliding window. NOTE: state lives in the function instance, so on
// Vercel (Fluid Compute) it is *approximate* — not shared across instances and
// reset on cold start. That is adequate to stop casual abuse of a demo; the
// production-grade path is a Vercel Firewall rate rule (see FUTURE_WORK.md §D1).

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 60; // per IP per window — a full consult stays well under this
const MAX_TRACKED_IPS = 5_000; // bound the map's memory

const hits = new Map<string, { count: number; resetAt: number }>();

export const config = { matcher: '/api/:path*' };

export function proxy(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  const now = Date.now();
  const rec = hits.get(ip);

  if (!rec || now > rec.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    rec.count += 1;
    if (rec.count > MAX_REQUESTS) {
      const retryAfter = Math.ceil((rec.resetAt - now) / 1000);
      return NextResponse.json(
        { error: 'Too many requests — please slow down.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } },
      );
    }
  }

  // Opportunistic cleanup so the map can't grow unbounded under many distinct IPs.
  if (hits.size > MAX_TRACKED_IPS) {
    for (const [key, value] of hits) {
      if (now > value.resetAt) hits.delete(key);
    }
  }

  return NextResponse.next();
}
