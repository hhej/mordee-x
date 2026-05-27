'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, Users } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { getDoctors, type Doctor } from '@/lib/data';
import { usePatientStore } from '@/stores/store-patient';
import { DoctorMatchCard } from './DoctorMatchCard';

interface DoctorMatchListProps {
  /**
   * When true, all 15 doctors render expanded by default and the top-3
   * highlight banner is hidden. Used for the bypass-triage flow.
   */
  defaultExpandAll?: boolean;
  /**
   * When true, render only the selected doctor (from store.selectedDoctorId)
   * as a single card. Used inside the doctor pill expand on consult/summary.
   */
  selectedDoctorOnly?: boolean;
}

export function DoctorMatchList({
  defaultExpandAll = false,
  selectedDoctorOnly = false,
}: DoctorMatchListProps) {
  const matched = usePatientStore((s) => s.matched);
  const isMatching = usePatientStore((s) => s.isMatching);
  const matchError = usePatientStore((s) => s.matchError);
  const triage = usePatientStore((s) => s.triage);
  const selectedDoctorId = usePatientStore((s) => s.selectedDoctorId);
  const [showRest, setShowRest] = useState(defaultExpandAll);

  const allDoctors = getDoctors();
  const byId = new Map(allDoctors.map((d) => [d.id, d]));

  if (selectedDoctorOnly) {
    const doctor = selectedDoctorId ? byId.get(selectedDoctorId) : undefined;
    if (!doctor) return null;
    const reason = matched.find((m) => m.doctor_id === selectedDoctorId)?.reason_th ?? '';
    return (
      <GlassCard>
        <div className="mb-3 flex items-center gap-2">
          <Users className="size-4 text-mint-700 dark:text-mint-400" />
          <h2 className="text-base font-semibold text-foreground md:text-lg">หมอที่คุณเลือก</h2>
          <span className="text-xs text-muted-foreground">· Your doctor</span>
        </div>
        <div className="grid gap-3 md:grid-cols-1">
          <DoctorMatchCard doctor={doctor} reason={reason} highlighted />
        </div>
      </GlassCard>
    );
  }

  const topThree: Array<{ doctor: Doctor; reason: string }> = matched
    .map((r) => {
      const doctor = byId.get(r.doctor_id);
      return doctor ? { doctor, reason: r.reason_th } : null;
    })
    .filter((x): x is { doctor: Doctor; reason: string } => x !== null);

  const matchedIds = new Set(topThree.map((m) => m.doctor.id));
  const rest = allDoctors.filter((d) => !matchedIds.has(d.id));
  const bypass = triage === null;

  return (
    <GlassCard>
      <div className="mb-3 flex items-center gap-2">
        <Users className="size-4 text-mint-700 dark:text-mint-400" />
        <h2 className="text-base font-semibold text-foreground md:text-lg">
          {bypass ? 'เลือกแพทย์ที่คุณอยากปรึกษา' : 'เลือกแพทย์ที่เหมาะกับคุณ'}
        </h2>
        <span className="text-xs text-muted-foreground">
          · {bypass ? 'All doctors' : 'Choose your doctor'}
        </span>
        {isMatching ? (
          <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            กำลังจัดอันดับ…
          </span>
        ) : null}
      </div>

      {matchError ? (
        <div className="mb-3 rounded-md bg-amber-50 dark:bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-800 dark:text-amber-300 ring-1 ring-amber-200">
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
              className="h-44 animate-pulse rounded-2xl border border-border/40 bg-white/40 dark:bg-slate-800/50"
            />
          ))}
        </div>
      ) : !bypass ? (
        <p className="text-xs text-muted-foreground">
          ยังไม่มีคำแนะนำ — ลองเลือกจากรายชื่อทั้งหมดด้านล่าง
        </p>
      ) : null}

      {!defaultExpandAll ? (
        <button
          type="button"
          onClick={() => setShowRest((v) => !v)}
          className="mt-4 inline-flex items-center gap-1.5 text-xs text-mint-700 dark:text-mint-400 hover:text-mint-800"
        >
          {showRest ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          {showRest ? 'ซ่อนรายชื่อทั้งหมด' : `ดูแพทย์ทั้งหมด (${rest.length})`}
        </button>
      ) : null}

      {showRest ? (
        <div
          className={`grid gap-3 md:grid-cols-3 ${
            defaultExpandAll && topThree.length === 0 ? 'mt-0' : 'mt-3'
          }`}
        >
          {rest.map((d) => (
            <DoctorMatchCard key={d.id} doctor={d} />
          ))}
        </div>
      ) : null}
    </GlassCard>
  );
}
