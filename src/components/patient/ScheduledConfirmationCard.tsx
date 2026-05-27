'use client';

import { BellRing, CalendarCheck2, RotateCcw, Clock4 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/shared/GlassCard';
import { DoctorAvatar } from '@/components/shared/DoctorAvatar';
import { useNow } from '@/lib/use-now';
import type { Doctor } from '@/lib/data';
import { usePatientStore } from '@/stores/store-patient';

interface ScheduledConfirmationCardProps {
  doctor: Doctor;
  slotIso: string;
}

function formatCountdown(slot: Date, now: Date): string {
  const diffMs = slot.getTime() - now.getTime();
  const past = diffMs < 0;
  const totalMin = Math.round(Math.abs(diffMs) / 60_000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin - days * 60 * 24) / 60);
  const minutes = totalMin % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} วัน`);
  if (hours > 0) parts.push(`${hours} ชั่วโมง`);
  if (days === 0 && minutes > 0) parts.push(`${minutes} นาที`);
  if (parts.length === 0) parts.push('ไม่ถึงนาที');
  const body = parts.join(' ');
  return past ? `เลยเวลานัด ${body} แล้ว` : `อีก ${body}`;
}

export function ScheduledConfirmationCard({ doctor, slotIso }: ScheduledConfirmationCardProps) {
  const reset = usePatientStore((s) => s.reset);
  const slotDate = new Date(slotIso);
  const slotLabel = slotDate.toLocaleString('th-TH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Live countdown — refresh every 30s. 30s is fine because the smallest unit
  // we render is minutes; sub-minute precision would just churn React.
  const now = useNow();
  const countdown = now ? formatCountdown(slotDate, now) : null;
  const isPast = now ? slotDate.getTime() < now.getTime() : false;

  return (
    <GlassCard className="border border-mint-300/60 bg-gradient-to-br from-mint-50/80 via-white/70 to-mint-100/40">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-mint-600 text-white">
          <CalendarCheck2 className="size-4" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground md:text-lg">จองเรียบร้อย</h2>
          <div className="text-xs text-muted-foreground">Booking confirmed</div>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3 rounded-xl border border-border/60 bg-white/70 dark:bg-slate-800/60 p-3">
        <DoctorAvatar doctor={doctor} size={48} />
        <div className="flex-1">
          <div className="text-sm font-medium text-foreground">{doctor.name}</div>
          <div className="text-[11px] text-muted-foreground">{doctor.specialty_th}</div>
        </div>
      </div>

      <div className="mb-4 rounded-xl bg-mint-50/70 dark:bg-mint-500/10 px-4 py-3 ring-1 ring-mint-200/60 dark:ring-mint-500/30">
        <div className="text-[11px] uppercase tracking-wide text-mint-700 dark:text-mint-300">เวลานัด · Appointment</div>
        <div className="mt-0.5 text-base font-semibold text-mint-900 dark:text-mint-200">{slotLabel}</div>
        {countdown ? (
          <div
            className={`mt-1 inline-flex items-center gap-1 text-[11px] tabular-nums ${
              isPast ? 'text-amber-700 dark:text-amber-400' : 'text-mint-700 dark:text-mint-300'
            }`}
          >
            <Clock4 className="size-3" />
            {countdown}
          </div>
        ) : null}
      </div>

      <div className="mb-4 flex items-start gap-2 rounded-md bg-white/60 dark:bg-slate-800/50 px-3 py-2 text-[12px] text-foreground/80 ring-1 ring-border/40">
        <BellRing className="mt-0.5 size-3.5 shrink-0 text-mint-700 dark:text-mint-400" />
        <span>
          ระบบจะส่งการแจ้งเตือนผ่านแอป MorDee+ ก่อนถึงเวลานัด 30 นาที — กลับมาเปิดแอปได้เลย ไม่ต้องชำระเงินเพิ่ม
        </span>
      </div>

      <Button variant="ghost" size="sm" onClick={reset} className="w-full">
        <RotateCcw className="size-3.5" />
        ฉันจองผิดเวลา · เริ่มใหม่
      </Button>
    </GlassCard>
  );
}
