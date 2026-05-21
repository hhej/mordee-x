'use client';

import { ArrowDown, ArrowUp, CalendarCheck2, CalendarClock, CalendarX2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { NoShowPrediction } from '@/lib/data';
import { translateFactor } from '@/lib/risk-factors';

// IMPORTANT: this badge represents NO-SHOW PROBABILITY (will the patient skip
// the appointment), NOT clinical severity. The palette deliberately avoids the
// triage-red/green/yellow tokens used elsewhere in the app — those mean
// "medical emergency / OK to self-care" and would be misread here.

const TIER_STYLES: Record<
  NoShowPrediction['risk_tier'],
  { bg: string; text: string; ring: string; label: string; Icon: typeof CalendarCheck2 }
> = {
  LOW: {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    ring: 'ring-slate-300/60',
    label: 'มาตามนัด',
    Icon: CalendarCheck2,
  },
  MED: {
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    ring: 'ring-amber-300/60',
    label: 'อาจไม่มา',
    Icon: CalendarClock,
  },
  HIGH: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    ring: 'ring-orange-300/70',
    label: 'เสี่ยงไม่มา',
    Icon: CalendarX2,
  },
};

const ACTION_TH: Record<NoShowPrediction['recommended_action'], string> = {
  single_reminder: 'ส่ง SMS เตือน 1 ครั้ง',
  escalated_reminder: 'ส่ง SMS + โทรยืนยัน',
  require_confirmation: 'ขอยืนยันก่อนนัด (โทร)',
};

interface NoShowBadgeProps {
  prediction: NoShowPrediction;
}

export function NoShowBadge({ prediction }: NoShowBadgeProps) {
  const style = TIER_STYLES[prediction.risk_tier];
  const noShowPct = Math.round(prediction.p_no_show * 100);
  const showPct = 100 - noShowPct;
  const Icon = style.Icon;
  const factors = prediction.top_shap.slice(0, 3).map((f) => translateFactor(f.feature, f.value, f.shap));

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          'inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition-all hover:scale-[1.03]',
          style.bg,
          style.text,
          style.ring,
        )}
        aria-label="ดูเหตุผลของการพยากรณ์การมานัด"
        title="พยากรณ์ว่าคนไข้จะมาตามนัดหรือไม่ (no-show prediction) — ไม่ใช่ระดับความรุนแรงของโรค"
      >
        <Icon className="size-3.5 opacity-80" />
        <span>{style.label}</span>
        <span className="font-semibold">{noShowPct}%</span>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="flex flex-col gap-2.5">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              พยากรณ์การมานัด · No-show ML
            </div>
            <div className={cn('mt-0.5 flex items-baseline gap-1.5', style.text)}>
              <span className="text-base font-semibold">โอกาสไม่มา {noShowPct}%</span>
              <span className="text-xs text-muted-foreground">(มา {showPct}%)</span>
            </div>
          </div>
          <ul className="flex flex-col gap-1.5">
            {factors.map((f, i) => (
              <li key={i} className="flex items-center justify-between gap-2 text-sm">
                <div className="flex items-center gap-1.5">
                  {f.direction === 'up' ? (
                    <ArrowUp className="size-3.5 text-triage-red" />
                  ) : (
                    <ArrowDown className="size-3.5 text-triage-green" />
                  )}
                  <span className="text-ink">{f.th}</span>
                </div>
                <span className="text-xs text-muted-foreground">{f.value_th}</span>
              </li>
            ))}
          </ul>
          <div className="rounded-md bg-mint-50 px-2.5 py-1.5 text-xs text-mint-800">
            <span className="font-medium">แนะนำ: </span>
            {ACTION_TH[prediction.recommended_action]}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
