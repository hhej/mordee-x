'use client';

import Image from 'next/image';
import { BellRing, CalendarCheck2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/shared/GlassCard';
import type { Doctor } from '@/lib/data';
import { usePatientStore } from '@/stores/store-patient';

interface ScheduledConfirmationCardProps {
  doctor: Doctor;
  slotIso: string;
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

  return (
    <GlassCard className="border border-mint-300/60 bg-gradient-to-br from-mint-50/80 via-white/70 to-mint-100/40">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-mint-600 text-white">
          <CalendarCheck2 className="size-4" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-ink md:text-lg">จองเรียบร้อย</h2>
          <div className="text-xs text-muted-foreground">Booking confirmed</div>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3 rounded-xl border border-line/60 bg-white/70 p-3">
        <Image
          src={doctor.avatar}
          alt={doctor.name_en}
          width={48}
          height={48}
          className="size-12 rounded-xl object-cover ring-1 ring-line/40"
          unoptimized
        />
        <div className="flex-1">
          <div className="text-sm font-medium text-ink">{doctor.name}</div>
          <div className="text-[11px] text-muted-foreground">{doctor.specialty_th}</div>
        </div>
      </div>

      <div className="mb-4 rounded-xl bg-mint-50/70 px-4 py-3 ring-1 ring-mint-200/60">
        <div className="text-[11px] uppercase tracking-wide text-mint-700">เวลานัด · Appointment</div>
        <div className="mt-0.5 text-base font-semibold text-mint-900">{slotLabel}</div>
      </div>

      <div className="mb-4 flex items-start gap-2 rounded-md bg-white/60 px-3 py-2 text-[12px] text-ink/80 ring-1 ring-line/40">
        <BellRing className="mt-0.5 size-3.5 shrink-0 text-mint-700" />
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
