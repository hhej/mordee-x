'use client';

import { useNow } from '@/lib/use-now';

function formatNow(d: Date): string {
  const weekday = d.toLocaleDateString('th-TH', { weekday: 'short' });
  const date = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  return `${weekday} ${date} · ${time} น.`;
}

export function LiveClock() {
  const now = useNow();
  return (
    <div className="hidden text-right text-[11px] tabular-nums leading-tight text-muted-foreground md:block">
      <div className="text-mint-700 dark:text-mint-400">{now ? formatNow(now) : ' '}</div>
    </div>
  );
}
