'use client';

import { AlertTriangle, Circle, Info, ShieldAlert, ShieldCheck } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getSpecialtyTh } from '@/lib/data';
import type { TriageResult } from '@/lib/llm/schemas';

interface TriageResultCardProps {
  triage: TriageResult;
  /**
   * 'card' (default): full GlassCard with reasoning, warnings, sources.
   * 'strip': one-line red banner. Used on the hospital step to avoid
   * duplicating the 'กรณีฉุกเฉิน' heading that HospitalListCard owns.
   */
  variant?: 'card' | 'strip';
}

const TIER_STYLES: Record<TriageResult['triage'], {
  bar: string;
  // iconText: color of the icon inside the colored square. White-on-yellow
  // fails WCAG AA non-text contrast, so yellow tier uses a dark amber instead.
  iconText: string;
  badge: string;
  icon: React.ReactNode;
  label: string;
  labelEn: string;
  emoji: string;
}> = {
  green: {
    bar: 'bg-triage-green',
    iconText: 'text-white',
    badge: 'bg-triage-green/15 text-triage-green ring-triage-green/40',
    icon: <ShieldCheck className="size-5" />,
    label: 'ดูแลตัวเองได้',
    labelEn: 'Self-care appropriate',
    emoji: '🟢',
  },
  yellow: {
    bar: 'bg-triage-yellow',
    iconText: 'text-amber-950',
    badge: 'bg-triage-yellow/20 text-amber-700 dark:text-amber-300 ring-triage-yellow/50',
    icon: <Circle className="size-5" />,
    label: 'ควรปรึกษาแพทย์',
    labelEn: 'See a doctor',
    emoji: '🟡',
  },
  red: {
    bar: 'bg-triage-red',
    iconText: 'text-white',
    badge: 'bg-triage-red/15 text-triage-red ring-triage-red/40',
    icon: <ShieldAlert className="size-5" />,
    label: 'อาการฉุกเฉิน',
    labelEn: 'Emergency',
    emoji: '🔴',
  },
};

export function TriageResultCard({ triage, variant = 'card' }: TriageResultCardProps) {
  const t = TIER_STYLES[triage.triage];
  const confidencePct = Math.round(triage.confidence * 100);

  if (variant === 'strip') {
    return (
      <div
        role="status"
        className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm font-medium text-red-800 dark:text-red-300 ring-1 ring-red-200"
      >
        <span aria-hidden>🔴</span>
        <span>ระบบแนะนำให้ไปโรงพยาบาลทันที — รายละเอียดด้านล่าง</span>
      </div>
    );
  }

  return (
    <GlassCard>
      <div className="flex items-start gap-3">
        <div className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${t.iconText} ${t.bar}`}>
          {t.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-foreground md:text-lg">
              {t.emoji} {t.label}
            </h2>
            <span className="text-xs text-muted-foreground">· {t.labelEn}</span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <Popover>
              <PopoverTrigger
                className={`inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ring-1 transition-transform hover:scale-[1.03] ${t.badge}`}
                title="ความเชื่อมั่นของ AI ต่อการประเมินนี้ ไม่ใช่ความรุนแรงของอาการ"
              >
                AI ประเมินด้วยความเชื่อมั่น {confidencePct}%
                <Info className="size-3" aria-hidden />
              </PopoverTrigger>
              <PopoverContent className="w-64" align="start">
                <p className="text-xs leading-relaxed text-foreground">
                  ระดับความเชื่อมั่นของ AI ต่อการประเมินนี้ ไม่ใช่ระดับความรุนแรงของอาการ
                  <span className="mt-1 block text-muted-foreground">
                    How sure the AI is about this assessment — not how severe your symptoms are.
                  </span>
                </p>
              </PopoverContent>
            </Popover>
            {triage.specialty_hint ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-mint-50 dark:bg-mint-500/10 px-2 py-0.5 text-[11px] text-mint-800 dark:text-mint-200 ring-1 ring-mint-200/60 dark:ring-mint-500/30">
                แผนกแนะนำ · {getSpecialtyTh(triage.specialty_hint)}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-foreground">{triage.reasoning_th}</p>

      {triage.triage === 'green' ? (
        <div className="mt-4 flex gap-2 rounded-lg bg-mint-50 dark:bg-mint-500/10 px-3 py-2.5 text-sm leading-relaxed text-mint-800 dark:text-mint-200 ring-1 ring-mint-200/60 dark:ring-mint-500/30">
          <span aria-hidden>💚</span>
          <p>
            อาการของคุณดูแลเองที่บ้านได้ ยังไม่จำเป็นต้องพบแพทย์
            แต่ถ้ายังกังวลหรืออาการไม่ดีขึ้น สามารถปรึกษาแพทย์ด้านล่างได้เสมอ
            <span className="mt-1 block text-[11px] text-mint-700/80 dark:text-mint-400">
              You can likely care for this at home — a doctor isn&apos;t required, but you&apos;re
              always welcome to consult one below if you&apos;re worried.
            </span>
          </p>
        </div>
      ) : null}

      {triage.warning_signs_th.length > 0 ? (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <AlertTriangle className="size-3.5 text-amber-600" />
            สัญญาณเตือน · Warning signs
          </div>
          <ul className="flex flex-wrap gap-1.5">
            {triage.warning_signs_th.map((w, i) => (
              <li
                key={i}
                className="rounded-md bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-800 dark:text-amber-300 ring-1 ring-amber-200"
              >
                {w}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {triage.sources.length > 0 ? (
        <div className="mt-4">
          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            อ้างอิง · Sources
          </div>
          <ul className="space-y-1 text-[11px] text-muted-foreground">
            {triage.sources.map((s, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="text-mint-600">•</span>
                <span>{s.title}</span>
                {s.id ? <span className="font-mono text-[10px]">({s.id})</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-4 rounded-md bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-[11px] text-muted-foreground">
        ⚠ MorDee+ ให้คำแนะนำเบื้องต้นเท่านั้น ไม่ใช่การวินิจฉัยทางการแพทย์
        <span className="mt-0.5 block opacity-70">
          MorDee+ provides preliminary guidance only — not a medical diagnosis.
        </span>
      </p>
    </GlassCard>
  );
}
