'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Building2,
  CalendarCheck,
  Loader2,
  RotateCcw,
  Sparkles,
  Stethoscope,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCheckupProgram } from '@/lib/data';
import { usePatientStore } from '@/stores/store-patient';
import type { CheckupResult } from '@/lib/llm/schemas';

const RELEVANCE_LABEL: Record<CheckupResult['relevance'], string> = {
  high: 'เหมาะกับคุณมาก',
  medium: 'น่าสนใจ',
  low: 'ทางเลือกเสริม',
};

export function CheckupUpsell() {
  const checkup = usePatientStore((s) => s.checkup);
  const isMatching = usePatientStore((s) => s.isMatchingCheckup);
  const error = usePatientStore((s) => s.checkupError);
  const fetchCheckup = usePatientStore((s) => s.fetchCheckup);
  const [booked, setBooked] = useState(false);

  // Idle — trigger button. Frame as optional so it never feels like a hard sell.
  if (!checkup && !isMatching && !error) {
    return (
      <div className="mt-5 border-t border-border/60 pt-4">
        <Button variant="outline" className="w-full" onClick={() => fetchCheckup()}>
          <Sparkles className="size-4 text-mint-600" />
          ดูโปรแกรมตรวจสุขภาพที่เหมาะกับคุณ
        </Button>
        <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
          AI จะแนะนำแพ็กเกจตรวจสุขภาพจากผลการปรึกษาของคุณ · optional
        </p>
      </div>
    );
  }

  if (isMatching) {
    return (
      <div className="mt-5 border-t border-border/60 pt-4">
        <div className="flex items-center justify-center gap-2 rounded-lg bg-mint-50 dark:bg-mint-500/10 px-3 py-6 text-sm text-mint-800 dark:text-mint-200">
          <Loader2 className="size-4 animate-spin" />
          กำลังจับคู่โปรแกรมตรวจสุขภาพที่เหมาะกับคุณ…
        </div>
      </div>
    );
  }

  if (error && !checkup) {
    return (
      <div className="mt-5 border-t border-border/60 pt-4">
        <div className="flex flex-col items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 px-3 py-5 text-center ring-1 ring-amber-200">
          <AlertTriangle className="size-5 text-amber-700 dark:text-amber-400" />
          <div className="text-xs text-amber-800 dark:text-amber-300">แนะนำโปรแกรมไม่สำเร็จ · {error}</div>
          <Button size="sm" variant="outline" onClick={() => fetchCheckup()}>
            <RotateCcw className="size-3.5" />
            ลองอีกครั้ง · Retry
          </Button>
        </div>
      </div>
    );
  }

  const program = checkup ? getCheckupProgram(checkup.program_id) : undefined;
  if (!checkup || !program) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="mt-5 border-t border-border/60 pt-4"
    >
      <div className="rounded-2xl border border-mint-300/60 bg-gradient-to-b from-mint-50/80 to-white p-4">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-mint-100 dark:bg-mint-500/15 px-2.5 py-1 text-[11px] text-mint-800 dark:text-mint-200">
          <Sparkles className="size-3" />
          AI จับคู่จากผลปรึกษา
        </div>

        <p className="text-sm font-medium text-mint-900 dark:text-mint-200">{checkup.headline_th}</p>

        <div className="mt-3 rounded-xl border border-border/60 bg-white/70 dark:bg-slate-800/60 p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                <Building2 className="size-3 shrink-0" />
                {program.hospital_th}
                <span className="opacity-60">· {program.hospital_en}</span>
              </div>
              <h3 className="mt-1 text-sm font-semibold text-foreground">{program.name_th}</h3>
              <p className="text-xs text-muted-foreground">
                {program.name_en} · {program.duration_th}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-base font-bold text-mint-700 dark:text-mint-400">
                {program.price.toLocaleString('th-TH')}฿
              </div>
              <span className="rounded-full bg-mint-100 dark:bg-mint-500/15 px-1.5 py-0.5 text-[10px] text-mint-800 dark:text-mint-200">
                {RELEVANCE_LABEL[checkup.relevance]}
              </span>
            </div>
          </div>

          <ul className="mt-3 grid gap-1 md:grid-cols-2">
            {program.tests_th.map((t, i) => (
              <li key={i} className="flex gap-1.5 text-xs text-foreground">
                <span className="text-mint-600">•</span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-3 flex gap-2 rounded-md bg-mint-50 dark:bg-mint-500/10 px-3 py-2 text-xs text-mint-900 dark:text-mint-200">
          <Stethoscope className="mt-0.5 size-3.5 shrink-0 text-mint-700 dark:text-mint-400" />
          <span>{checkup.reason_th}</span>
        </p>

        {booked ? (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-mint-400/60 bg-mint-100/70 dark:bg-mint-500/15 px-3 py-2">
            <CalendarCheck className="mt-0.5 size-4 text-mint-800 dark:text-mint-200" />
            <div className="text-xs text-mint-900 dark:text-mint-200">
              ✓ บันทึกความสนใจแล้ว — ทีมงานจะติดต่อกลับเพื่อนัดหมายตรวจสุขภาพ
              <span className="ml-1 opacity-70">· ยังไม่ต้องชำระเงินตอนนี้</span>
            </div>
          </div>
        ) : (
          <Button className="mt-3 w-full" onClick={() => setBooked(true)}>
            สนใจ · จองตรวจสุขภาพ
          </Button>
        )}

        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          ราคาเป็นโดยประมาณ อาจเปลี่ยนแปลงตามโปรโมชันของโรงพยาบาล
        </p>
      </div>
    </motion.div>
  );
}
