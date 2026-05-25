import Link from 'next/link';
import { Home } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 py-12 md:px-12 md:py-20">
      <GlassCard className="mx-auto w-full max-w-xl text-center">
        <div className="mb-3 text-3xl font-bold tracking-tight text-mint-700">MorDee+ 🌿</div>
        <h1 className="mb-2 text-2xl font-bold text-ink">ไม่พบหน้าที่คุณต้องการ</h1>
        <p className="mb-6 text-sm text-muted-foreground">Page not found · 404</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-mint-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-mint-700"
        >
          <Home className="h-4 w-4" />
          กลับหน้าหลัก · Home
        </Link>
      </GlassCard>
    </main>
  );
}
