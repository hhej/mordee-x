'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, Users } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { getDoctors, type Doctor } from '@/lib/data';
import { usePatientStore } from '@/stores/store-patient';
import { DoctorMatchCard } from './DoctorMatchCard';

export function DoctorMatchList() {
  const matched = usePatientStore((s) => s.matched);
  const isMatching = usePatientStore((s) => s.isMatching);
  const matchError = usePatientStore((s) => s.matchError);
  const [showRest, setShowRest] = useState(false);

  const allDoctors = getDoctors();
  const byId = new Map(allDoctors.map((d) => [d.id, d]));
  const topThree: Array<{ doctor: Doctor; reason: string }> = matched
    .map((r) => {
      const doctor = byId.get(r.doctor_id);
      return doctor ? { doctor, reason: r.reason_th } : null;
    })
    .filter((x): x is { doctor: Doctor; reason: string } => x !== null);

  const matchedIds = new Set(topThree.map((m) => m.doctor.id));
  const rest = allDoctors.filter((d) => !matchedIds.has(d.id));

  return (
    <GlassCard>
      <div className="mb-3 flex items-center gap-2">
        <Users className="size-4 text-mint-700" />
        <h2 className="text-base font-semibold text-ink md:text-lg">เลือกแพทย์ที่เหมาะกับคุณ</h2>
        <span className="text-xs text-muted-foreground">· Choose your doctor</span>
        {isMatching ? (
          <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            กำลังจัดอันดับ…
          </span>
        ) : null}
      </div>

      {matchError ? (
        <div className="mb-3 rounded-md bg-amber-50 px-3 py-1.5 text-[11px] text-amber-800 ring-1 ring-amber-200">
          ⚠ จัดอันดับล้มเหลว: {matchError}
        </div>
      ) : null}

      {topThree.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-3">
          {topThree.map(({ doctor, reason }) => (
            <DoctorMatchCard key={doctor.id} doctor={doctor} reason={reason} highlighted />
          ))}
        </div>
      ) : isMatching ? (
        <div className="grid gap-3 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-2xl border border-line/40 bg-white/40"
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">ยังไม่มีคำแนะนำ — ลองเลือกจากรายชื่อทั้งหมดด้านล่าง</p>
      )}

      <button
        type="button"
        onClick={() => setShowRest((v) => !v)}
        className="mt-4 inline-flex items-center gap-1.5 text-xs text-mint-700 hover:text-mint-800"
      >
        {showRest ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        {showRest ? 'ซ่อนรายชื่อทั้งหมด' : `ดูแพทย์ทั้งหมด (${rest.length})`}
      </button>

      {showRest ? (
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {rest.map((d) => (
            <DoctorMatchCard key={d.id} doctor={d} />
          ))}
        </div>
      ) : null}
    </GlassCard>
  );
}
