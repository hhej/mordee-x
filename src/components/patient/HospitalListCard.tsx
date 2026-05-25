'use client';

import { AlertOctagon, Clock, MapPin, Navigation, Phone, RotateCcw, Siren } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { Button } from '@/components/ui/button';
import { getHospitals } from '@/lib/data';
import { usePatientStore } from '@/stores/store-patient';

export function HospitalListCard() {
  const hospitals = getHospitals();
  const reset = usePatientStore((s) => s.reset);
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
            <span className="block">Your symptoms may be urgent — please go to a hospital now.</span>
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
            <div className="text-[11px] text-white/80">บริการฟรี 24 ชั่วโมง · ทั่วประเทศ · Free nationwide 24/7</div>
          </div>
        </div>
        <Phone className="size-5" />
      </a>

      <div className="mb-3 flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={reset}
          className="text-muted-foreground hover:text-ink"
        >
          <RotateCcw className="size-3.5" />
          ฉันไม่ได้เป็นแบบนั้น · กลับไปประเมินอาการใหม่
        </Button>
      </div>

      <div className="space-y-2">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          โรงพยาบาลใกล้คุณ · Nearby hospitals
        </div>
        {hospitals.map((h) => (
          <div
            key={h.name}
            className="rounded-lg border border-line/60 bg-white/60 px-3 py-2.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-medium text-ink">{h.name}</div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-mint-50 px-2 py-0.5 text-[10px] font-medium text-mint-800 ring-1 ring-mint-200/60">
                    <Navigation className="size-2.5" />
                    {h.distance_label}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground">{h.name_en}</div>
                <div className="mt-1.5 flex items-start gap-1.5 text-[11px] text-muted-foreground">
                  <MapPin className="mt-0.5 size-3 shrink-0" />
                  <div>
                    <div>{h.address_th}</div>
                    <div className="text-muted-foreground/80">{h.address_en}</div>
                  </div>
                </div>
                <div className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Clock className="size-3" />
                  {h.hours}
                </div>
              </div>
              <a
                href={`tel:${h.phone.replace(/[^0-9]/g, '')}`}
                className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-md bg-mint-50 px-2.5 py-1 text-xs text-mint-800 ring-1 ring-mint-200/60 transition-colors hover:bg-mint-100"
              >
                <Phone className="size-3" />
                {h.phone}
              </a>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-[11px] text-amber-800 ring-1 ring-amber-200">
        ⚠ MorDee+ ให้คำแนะนำเบื้องต้นเท่านั้น ไม่ใช่การวินิจฉัยทางการแพทย์
        กรุณาปรึกษาแพทย์ที่ได้รับใบอนุญาตสำหรับการตัดสินใจสำคัญ
        <span className="mt-1 block text-amber-700/80">
          MorDee+ provides initial guidance only — not a medical diagnosis. Please consult a licensed clinician for any important decision.
        </span>
      </p>
    </GlassCard>
  );
}
