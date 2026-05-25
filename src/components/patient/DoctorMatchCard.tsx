'use client';

import Image from 'next/image';
import { CalendarDays, Sparkles, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Doctor } from '@/lib/data';
import { usePatientStore } from '@/stores/store-patient';

interface DoctorMatchCardProps {
  doctor: Doctor;
  reason?: string;
  highlighted?: boolean;
}

export function DoctorMatchCard({ doctor, reason, highlighted }: DoctorMatchCardProps) {
  const selectDoctor = usePatientStore((s) => s.selectDoctor);

  return (
    <div
      className={`flex h-full flex-col rounded-2xl border bg-white/80 p-4 transition-shadow ${
        highlighted
          ? 'border-mint-400/80 shadow-[0_0_0_2px_rgba(34,197,94,0.08),0_8px_24px_-12px_rgba(34,197,94,0.25)]'
          : 'border-line/60 hover:shadow-sm'
      }`}
    >
      {highlighted ? (
        <div className="mb-2 inline-flex w-fit items-center gap-1 rounded-full bg-mint-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-mint-800">
          <Sparkles className="size-3" />
          AI แนะนำ
        </div>
      ) : null}

      <div className="flex items-start gap-3">
        <Image
          src={doctor.avatar}
          alt={doctor.name_en}
          width={56}
          height={56}
          className="size-14 rounded-xl object-cover ring-1 ring-line/40"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-ink">{doctor.name}</div>
          <div className="truncate text-[11px] text-muted-foreground">{doctor.name_en}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
            <span className="text-mint-800">{doctor.specialty_th}</span>
            <span>· {doctor.years} ปี</span>
            <span className="inline-flex items-center gap-0.5">
              <Star className="size-3 fill-amber-400 stroke-amber-500" />
              {doctor.rating.toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      {reason ? (
        <div className="mt-3 rounded-md bg-mint-50/60 px-2.5 py-1.5 text-xs leading-relaxed text-mint-900 ring-1 ring-mint-200/60">
          {reason}
        </div>
      ) : null}

      <div className="mt-auto flex items-center justify-between gap-2 pt-3">
        <div className="text-sm">
          <span className="font-semibold text-ink">{doctor.price.toLocaleString('th-TH')}</span>{' '}
          <span className="text-[11px] text-muted-foreground">บาท / ปรึกษา</span>
        </div>
        <Button size="sm" onClick={() => selectDoctor(doctor.id)}>
          <CalendarDays className="size-3.5" />
          จอง
        </Button>
      </div>
    </div>
  );
}
