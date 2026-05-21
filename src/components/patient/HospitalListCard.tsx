'use client';

import { AlertOctagon, Phone, Siren } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { getHospitals } from '@/lib/data';

export function HospitalListCard() {
  const hospitals = getHospitals();
  return (
    <GlassCard className="border border-triage-red/40 bg-white/80">
      <div className="mb-3 flex items-start gap-2">
        <AlertOctagon className="mt-0.5 size-5 text-triage-red" />
        <div>
          <h2 className="text-base font-semibold text-triage-red md:text-lg">
            กรณีฉุกเฉิน · ไปโรงพยาบาลทันที
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            อาการของคุณอาจเป็นเรื่องด่วน MorDee+ ไม่เหมาะกับการดูแลกรณีนี้
          </p>
        </div>
      </div>

      <a
        href="tel:1669"
        className="mb-3 flex items-center justify-between rounded-xl bg-triage-red px-4 py-3 text-white shadow-sm transition-colors hover:bg-triage-red/90"
      >
        <div className="flex items-center gap-2">
          <Siren className="size-5" />
          <div>
            <div className="text-sm font-semibold">โทร 1669 · สายด่วนการแพทย์ฉุกเฉิน</div>
            <div className="text-[11px] text-white/80">บริการฟรี 24 ชั่วโมง · ทั่วประเทศ</div>
          </div>
        </div>
        <Phone className="size-5" />
      </a>

      <div className="space-y-2">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          โรงพยาบาลใกล้คุณ · Hospitals
        </div>
        {hospitals.map((h) => (
          <div
            key={h.name}
            className="flex items-center justify-between rounded-lg border border-line/60 bg-white/60 px-3 py-2"
          >
            <div>
              <div className="text-sm font-medium text-ink">{h.name}</div>
              <div className="text-[11px] text-muted-foreground">{h.name_en}</div>
            </div>
            <a
              href={`tel:${h.phone.replace(/[^0-9]/g, '')}`}
              className="inline-flex items-center gap-1.5 rounded-md bg-mint-50 px-2.5 py-1 text-xs text-mint-800 ring-1 ring-mint-200/60 transition-colors hover:bg-mint-100"
            >
              <Phone className="size-3" />
              {h.phone}
            </a>
          </div>
        ))}
      </div>

      <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-[11px] text-amber-800 ring-1 ring-amber-200">
        ⚠ MorDee+ ให้คำแนะนำเบื้องต้นเท่านั้น ไม่ใช่การวินิจฉัยทางการแพทย์
        กรุณาปรึกษาแพทย์ที่ได้รับใบอนุญาตสำหรับการตัดสินใจสำคัญ
      </p>
    </GlassCard>
  );
}
