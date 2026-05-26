'use client';

import Image from 'next/image';
import { ArrowRight, Star, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/shared/GlassCard';
import { getDoctors, type Doctor } from '@/lib/data';
import { isOnlineNow } from '@/lib/availability';
import { useNow } from '@/lib/use-now';
import { usePatientStore } from '@/stores/store-patient';

function topRated(): Doctor[] {
  return [...getDoctors()]
    .sort((a, b) => b.rating - a.rating || b.years - a.years || a.price - b.price)
    .slice(0, 3);
}

export function InstantConsultCard() {
  const bypass = usePatientStore((s) => s.bypassToDoctorList);
  const now = useNow();
  const featured = topRated();
  const doctorCount = getDoctors().length;

  return (
    <GlassCard className="flex h-full flex-col border border-mint-300/60 bg-gradient-to-br from-mint-50/80 via-white/70 to-mint-100/40">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-lg bg-mint-600 text-white">
          <Zap className="size-3.5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-ink md:text-lg">ไม่แน่ใจอาการ?</h2>
          <div className="text-xs text-muted-foreground">พบแพทย์ตอนนี้ — ปรึกษาทันที</div>
        </div>
      </div>

      <p className="mb-3 text-xs text-ink/80">
        ข้ามขั้นตอนประเมินอาการ เลือกแพทย์จาก {doctorCount} ท่าน เริ่มแชทใน 3 นาที
      </p>

      <div className="mb-4 grid gap-2 md:grid-cols-3">
        {featured.map((d) => {
          // Online state is data-driven (availability.ts) and deterministic, so
          // the same doctors read "พร้อม" on every reload. null `now` (SSR/first
          // paint) shows neutral until the live clock ticks.
          const online = now ? isOnlineNow(d.id, now) : false;
          return (
            <div
              key={d.id}
              className="flex items-center gap-2.5 rounded-lg bg-white/70 px-2.5 py-1.5 ring-1 ring-line/40"
            >
              <Image
                src={d.avatar}
                alt={d.name_en}
                width={32}
                height={32}
                className="size-8 rounded-full object-cover ring-1 ring-line/40"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium text-ink">{d.name}</div>
                <div className="truncate text-[10px] text-muted-foreground">{d.specialty_th}</div>
              </div>
              <div className="flex shrink-0 items-center gap-0.5 text-[11px] text-mint-800">
                <Star className="size-3 fill-amber-400 stroke-amber-500" />
                {d.rating.toFixed(1)}
              </div>
              {online ? (
                <div className="ml-1 flex shrink-0 items-center gap-1 text-[10px] text-mint-700">
                  <span className="size-1.5 animate-pulse rounded-full bg-mint-500" />
                  พร้อม
                </div>
              ) : (
                <div className="ml-1 flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-slate-300" />
                  ไม่ว่าง
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Button className="mt-auto w-full" onClick={bypass}>
        ดูแพทย์ทั้งหมด · See all doctors
        <ArrowRight className="size-3.5" />
      </Button>
    </GlassCard>
  );
}
