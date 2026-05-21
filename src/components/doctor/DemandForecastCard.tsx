import { Sparkles, TrendingUp } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import type { DemandForecast } from '@/lib/data';
import { DemandHeatmap } from './DemandHeatmap';

interface DemandForecastCardProps {
  forecast: DemandForecast;
}

function formatSlot(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const dateLabel = `${s.getDate()}/${s.getMonth() + 1}`;
  const hourLabel = `${String(s.getHours()).padStart(2, '0')}-${String(e.getHours()).padStart(2, '0')}น.`;
  return `${dateLabel} ${hourLabel}`;
}

export function DemandForecastCard({ forecast }: DemandForecastCardProps) {
  const totalBookings = forecast.by_hour.reduce((sum, p) => sum + p.expected_bookings, 0);
  const peakHour = forecast.by_hour.reduce((peak, p) => (p.expected_bookings > peak.expected_bookings ? p : peak));

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
        </div>
        <span className="rounded-full bg-mint-100 px-2 py-0.5 text-[10px] font-medium text-mint-800">
          {forecast.winning_model} · MAE {forecast.model_mae.toFixed(2)}
        </span>
      </div>

      {/* KPI ribbon */}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi
          label="คาดการณ์ทั้งสัปดาห์"
          labelEn="Forecast/week"
          value={`${Math.round(totalBookings)}`}
          unit="ครั้ง"
        />
        <Kpi
          label="โอกาสรายได้เพิ่ม"
          labelEn="Revenue uplift"
          value={`+${forecast.expected_revenue_uplift_pct.toFixed(1)}%`}
          unit=""
          accent
        />
        <Kpi
          label="ช่วงพีค"
          labelEn="Peak hour"
          value={`${new Date(peakHour.datetime).getDate()}/${new Date(peakHour.datetime).getMonth() + 1} ${String(new Date(peakHour.datetime).getHours()).padStart(2, '0')}น.`}
          unit={`${peakHour.expected_bookings.toFixed(1)}/ชม.`}
        />
        <Kpi
          label="ช่วงแนะนำให้เปิด"
          labelEn="Recommended"
          value={`${forecast.recommended_online_slots.length}`}
          unit="ช่วง"
        />
      </div>

      <DemandHeatmap forecast={forecast} />

      {/* Recommended-slot chips */}
      <div className="mt-5">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-mint-800">
          <Sparkles className="size-3.5" />
          ช่วงเวลาที่ระบบแนะนำให้แพทย์เปิดออนไลน์
        </div>
        <div className="flex flex-wrap gap-2">
          {forecast.recommended_online_slots.map((slot, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 rounded-full bg-mint-100/80 px-2.5 py-1 text-xs text-mint-800 ring-1 ring-mint-300/50"
            >
              <span className="font-semibold">{formatSlot(slot.start, slot.end)}</span>
              <span className="text-mint-700">· {slot.expected_consults} คิว</span>
            </span>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}

function Kpi({
  label,
  labelEn,
  value,
  unit,
  accent,
}: {
  label: string;
  labelEn: string;
  value: string;
  unit: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-line/60 bg-white/60 p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{labelEn}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className={accent ? 'text-xl font-bold text-mint-700' : 'text-xl font-bold text-ink'}>
          {value}
        </span>
        {unit ? <span className="text-[10px] text-muted-foreground">{unit}</span> : null}
      </div>
    </div>
  );
}
