'use client';

// global-error.tsx replaces the root layout when an error throws inside
// app/layout.tsx itself. Must declare <html> and <body>. Keeps the same
// mint wordmark + retry pattern as error.tsx for consistency.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="th">
      <body className="min-h-screen bg-white flex items-center justify-center font-sans text-ink">
        <div className="w-full max-w-xl rounded-2xl bg-white p-8 text-center shadow-xl ring-1 ring-mint-200/60">
          <div className="mb-3 text-3xl font-bold tracking-tight text-mint-700">MorDee+ 🌿</div>
          <h1 className="mb-2 text-2xl font-bold">เกิดข้อผิดพลาดร้ายแรง</h1>
          <p className="mb-6 text-sm text-mint-900/60">
            A critical error occurred. Please reload the page.
          </p>
          {error.digest ? (
            <p className="mb-6 font-mono text-[11px] text-mint-900/50">ref · {error.digest}</p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full bg-mint-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-mint-700"
          >
            โหลดใหม่ · Reload
          </button>
        </div>
      </body>
    </html>
  );
}
