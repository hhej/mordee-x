'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function Pill() {
  const params = useSearchParams();
  if (params.get('mock') !== '1') return null;
  return (
    <div
      role="status"
      aria-label="Demo mode — canned data, no live AI calls"
      className="pointer-events-none fixed right-3 top-14 z-50 inline-flex items-center gap-1.5 rounded-full bg-mint-100 px-2.5 py-1 text-[11px] font-semibold text-mint-800 ring-1 ring-mint-300/70 shadow-sm dark:bg-mint-500/15 dark:text-mint-200 dark:ring-mint-500/30"
    >
      <span aria-hidden>🎭</span>
      Demo mode · mock data
    </div>
  );
}

// useSearchParams must be inside a Suspense boundary in the App Router.
export function MockModeBanner() {
  return (
    <Suspense fallback={null}>
      <Pill />
    </Suspense>
  );
}
