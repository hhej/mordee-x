'use client';

import { AlertTriangle, Circle, ShieldAlert, ShieldCheck } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import type { TriageResult } from '@/lib/llm/schemas';

interface TriageResultCardProps {
  triage: TriageResult;
}

const TIER_STYLES: Record<TriageResult['triage'], {
  bar: string;
  badge: string;
  icon: React.ReactNode;
  label: string;
  labelEn: string;
  emoji: string;
}> = {
  green: {
    bar: 'bg-triage-green',
    badge: 'bg-triage-green/15 text-triage-green ring-triage-green/40',
    icon: <ShieldCheck className="size-5" />,
    label: 'ดูแลตัวเองได้',
    labelEn: 'Self-care appropriate',
    emoji: '🟢',
  },
  yellow: {
    bar: 'bg-triage-yellow',
    badge: 'bg-triage-yellow/20 text-amber-700 ring-triage-yellow/50',
    icon: <Circle className="size-5" />,
    label: 'ควรปรึกษาแพทย์',
    labelEn: 'See a doctor',
    emoji: '🟡',
  },
  red: {
    bar: 'bg-triage-red',
    badge: 'bg-triage-red/15 text-triage-red ring-triage-red/40',
    icon: <ShieldAlert className="size-5" />,
    label: 'อาการฉุกเฉิน',
    labelEn: 'Emergency',
    emoji: '🔴',
  },
};

export function TriageResultCard({ triage }: TriageResultCardProps) {
  const t = TIER_STYLES[triage.triage];
  const confidencePct = Math.round(triage.confidence * 100);

  return (
    <GlassCard>
      <div className="flex items-start gap-3">
        <div className={`flex size-12 shrink-0 items-center justify-center rounded-2xl text-white ${t.bar}`}>
          {t.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-ink md:text-lg">
              {t.emoji} {t.label}
            </h2>
            <span className="text-xs text-muted-foreground">· {t.labelEn}</span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ring-1 ${t.badge}`}
            >
              ความมั่นใจ {confidencePct}%
            </span>
            {triage.specialty_hint ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-mint-50 px-2 py-0.5 text-[11px] text-mint-800 ring-1 ring-mint-200/60">
                แผนกแนะนำ · {triage.specialty_hint}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-ink">{triage.reasoning_th}</p>

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
                className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] text-amber-800 ring-1 ring-amber-200"
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

      <p className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-[11px] text-muted-foreground">
        ⚠ MorDee+ ให้คำแนะนำเบื้องต้นเท่านั้น ไม่ใช่การวินิจฉัยทางการแพทย์
      </p>
    </GlassCard>
  );
}
