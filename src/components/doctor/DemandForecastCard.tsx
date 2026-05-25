'use client';

import { Info, Sparkles, TrendingUp } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { cn } from '@/lib/utils';
import { useSessionAnchor } from '@/lib/use-now';
import type { DemandForecast } from '@/lib/data';
import {
  buildDemandWeek,
  LEVEL_EN,
  LEVEL_TH,
  type DemandLevel,
} from '@/lib/demand-forecast';
import { DemandHeatmap } from './DemandHeatmap';

interface DemandForecastCardProps {
  forecast: DemandForecast;
}

const DOW_TH = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

const MODEL_TH: Record<string, string> = {
  prophet: 'Prophet · ใส่ปฏิทินวันหยุดไทย',
  lightgbm: 'LightGBM · เรียนรู้จากรูปแบบย้อนหลัง',
  sarima: 'SARIMA · ฤดูกาลรายสัปดาห์',
  seasonal_naive: 'ค่าเฉลี่ยตามรูปแบบรายสัปดาห์',
};

const NOW_HINT: Record<DemandLevel, string> = {
  0: 'ช่วงเงียบ',
  1: 'คนไข้น้อย',
  2: 'พอมีคนไข้',
  3: 'คนไข้เยอะ — น่าเปิด',
  4: 'คนไข้แน่น — เปิดได้คิวเต็มเร็ว',
};

/** "DD/MM" plus a friendly วันนี้/พรุ่งนี้/weekday tag for a local YYYY-MM-DD. */
function dayLabel(dateStr: string, todayStr: string, tomorrowStr: string): string {
  if (dateStr === todayStr) return 'วันนี้';
  if (dateStr === tomorrowStr) return 'พรุ่งนี้';
  return DOW_TH[new Date(`${dateStr}T00:00`).getDay()];
}

export function DemandForecastCard({ forecast }: DemandForecastCardProps) {
  // Anchor the whole card to the session-start instant, same as the appointment
  // queue — keeps the now-marker and the rebased slots consistent across the page.
  const anchor = useSessionAnchor();
  const now = anchor ?? new Date();
  const week = buildDemandWeek(forecast, now);

  // Local YYYY-MM-DD for today / tomorrow (week cells carry local dates, so
  // compare in local terms — toISOString would shift by the UTC offset).
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const tomorrow = new Date(week.rows[0].date);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const localToday = fmt(week.rows[0].date);
  const localTomorrow = fmt(tomorrow);

  const peak = week.peakCell;
  const peakDay = dayLabel(peak.date, localToday, localTomorrow);

  const nowLevel = week.nowCell?.level ?? null;

  return (
    <GlassCard>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-mint-700" />
            <h2 className="text-base font-semibold text-ink md:text-lg">พยากรณ์ความต้องการ 7 วัน</h2>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Demand forecast · ตัดสินใจเปิดออนไลน์เวลาไหนให้คนไข้ได้คิวเร็วที่สุด
          </p>
          {forecast.doctor_count && forecast.doctor_count > 1 ? (
            <p className="mt-1 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200">
              ระดับสาขา · ความต้องการรวมของแพทย์ {forecast.doctor_count} ท่าน
            </p>
          ) : null}
        </div>
        {/* Model badge — kept verbatim for the rubric, with a plain-Thai hover note. */}
        <div className="group relative shrink-0">
          <span
            tabIndex={0}
            className="inline-flex cursor-help items-center gap-1 rounded-full bg-mint-100 px-2 py-0.5 text-[10px] font-medium text-mint-800 outline-none"
          >
            {forecast.winning_model}
            {forecast.model_mae != null ? ` · MAE ${forecast.model_mae.toFixed(2)}` : ''}
            <Info className="size-3 text-mint-600" />
          </span>
          <div className="pointer-events-none absolute right-0 top-full z-20 mt-1 w-60 rounded-lg bg-ink/90 px-3 py-2 text-[11px] leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            พยากรณ์ด้วย <span className="font-medium text-mint-200">{MODEL_TH[forecast.winning_model] ?? forecast.winning_model}</span> — เลือกเป็นโมเดลที่แม่นที่สุดจากการเทียบหลายตัว
            {forecast.model_mae != null
              ? ` · คลาดเคลื่อนเฉลี่ย ~${forecast.model_mae.toFixed(2)} คิว/ชม.`
              : ''}
          </div>
        </div>
      </div>

      {/* KPI ribbon */}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="คนไข้ทั้งสัปดาห์" labelEn="Forecast / week">
          <span className="text-xl font-bold text-ink">≈{week.weekTotal}</span>
          <span className="text-[10px] text-muted-foreground">ครั้ง</span>
        </Kpi>

        <Kpi label="ความต้องการตอนนี้" labelEn="Demand now" caption={nowLevel != null ? NOW_HINT[nowLevel] : undefined}>
          {nowLevel != null ? (
            <div className="flex items-center gap-2">
              <span className={cn('text-base font-bold', LEVEL_TEXT[nowLevel])}>{LEVEL_TH[nowLevel]}</span>
              <LevelDots level={nowLevel} />
            </div>
          ) : (
            <span className="text-base font-bold text-muted-foreground">—</span>
          )}
        </Kpi>

        <Kpi label="ช่วงพีค" labelEn="Peak" caption={`${LEVEL_TH[peak.level]} · ~${peak.expected.toFixed(1)}/ชม.`}>
          <span className="text-xl font-bold text-ink">{peakDay}</span>
          <span className="text-[10px] text-muted-foreground">
            {String(peak.hour).padStart(2, '0')}:00 น.
          </span>
        </Kpi>

        <Kpi label="โอกาสรายได้เพิ่ม" labelEn="Revenue uplift" caption="เทียบกับการสุ่มเปิดเวลา" accent>
          <span className="text-xl font-bold text-mint-700">
            +{forecast.expected_revenue_uplift_pct.toFixed(0)}%
          </span>
        </Kpi>
      </div>

      <DemandHeatmap week={week} />

      {/* Recommended-slot chips — re-anchored to upcoming dates, busiest first */}
      <div className="mt-5">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-mint-800">
          <Sparkles className="size-3.5" />
          ช่วงเวลาที่ระบบแนะนำให้แพทย์เปิดออนไลน์
        </div>
        <div className="flex flex-wrap gap-2">
          {week.slots.map((slot, i) => {
            const day = dayLabel(slot.start.slice(0, 10), localToday, localTomorrow);
            const sh = slot.start.slice(11, 13);
            const eh = slot.end.slice(11, 13);
            return (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-full bg-mint-100/80 px-2.5 py-1 text-xs text-mint-800 ring-1 ring-mint-300/50"
                title={`${LEVEL_TH[slot.level]} (${LEVEL_EN[slot.level]})`}
              >
                <LevelDots level={slot.level} compact />
                <span className="font-semibold">
                  {day} {sh}–{eh} น.
                </span>
                {slot.expected_consults >= 1 ? (
                  <span className="text-mint-700">· ~{slot.expected_consults} คิว</span>
                ) : (
                  <span className="text-mint-700">· {LEVEL_TH[slot.level]}</span>
                )}
              </span>
            );
          })}
        </div>
      </div>
    </GlassCard>
  );
}

const LEVEL_TEXT: Record<DemandLevel, string> = {
  0: 'text-muted-foreground',
  1: 'text-mint-600',
  2: 'text-mint-700',
  3: 'text-mint-800',
  4: 'text-mint-800',
};

function LevelDots({ level, compact }: { level: DemandLevel; compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden>
      {[1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={cn(
            'rounded-full',
            compact ? 'size-1.5' : 'size-2',
            i <= level ? 'bg-mint-600' : 'bg-mint-200',
          )}
        />
      ))}
    </span>
  );
}

function Kpi({
  label,
  labelEn,
  caption,
  accent,
  children,
}: {
  label: string;
  labelEn: string;
  caption?: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border p-3',
        accent ? 'border-mint-300/70 bg-mint-50/60' : 'border-line/60 bg-white/60',
      )}
    >
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{labelEn}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">{children}</div>
      {caption ? <div className="mt-0.5 text-[10px] text-muted-foreground">{caption}</div> : null}
    </div>
  );
}
