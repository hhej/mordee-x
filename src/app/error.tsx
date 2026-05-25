'use client';

import Link from 'next/link';
import { Home, RefreshCw } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 py-12 md:px-12 md:py-20">
      <GlassCard className="mx-auto w-full max-w-xl text-center">
        <div className="mb-3 text-3xl font-bold tracking-tight text-mint-700">MorDee+ 🌿</div>
        <h1 className="mb-2 text-2xl font-bold text-ink">เกิดข้อผิดพลาดบางอย่าง</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Something went wrong. Try again, or go back to the home page.
        </p>
        {error.digest ? (
          <p className="mb-6 font-mono text-[11px] text-muted-foreground/70">ref · {error.digest}</p>
        ) : null}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full bg-mint-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-mint-700"
          >
            <RefreshCw className="h-4 w-4" />
            ลองอีกครั้ง · Retry
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-mint-700 ring-1 ring-mint-300 transition-colors hover:bg-mint-50"
          >
            <Home className="h-4 w-4" />
            กลับหน้าหลัก · Home
          </Link>
        </div>
      </GlassCard>
    </main>
  );
}
