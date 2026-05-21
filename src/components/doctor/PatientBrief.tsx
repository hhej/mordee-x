'use client';

import { AlertTriangle, FileText, HelpCircle, ListChecks, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BriefResult } from '@/lib/llm/schemas';
import { useDoctorStore } from '@/stores/store-doctor';

const LIKELIHOOD_STYLE: Record<BriefResult['ddx'][number]['likelihood'], string> = {
  high: 'bg-mint-100 text-mint-800 ring-mint-300/60',
  medium: 'bg-amber-100/70 text-amber-700 ring-amber-300/60',
  low: 'bg-slate-100 text-slate-600 ring-slate-300/60',
};

const LIKELIHOOD_TH: Record<BriefResult['ddx'][number]['likelihood'], string> = {
  high: 'น่าจะใช่',
  medium: 'ปานกลาง',
  low: 'น่าจะไม่ใช่',
};

interface PatientBriefProps {
  brief: BriefResult;
  patientName: string;
}

export function PatientBrief({ brief, patientName }: PatientBriefProps) {
  const setInputText = useDoctorStore((s) => s.setInputText);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-mint-700">
          <FileText className="size-3.5" />
          Pre-consult brief · สรุปก่อนปรึกษา
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">{patientName}</div>
        <p className="mt-2 text-sm font-medium text-ink">{brief.one_liner}</p>
      </div>

      <Section icon={<ListChecks className="size-3.5" />} title="อาการสำคัญ" titleEn="Key symptoms">
        <ul className="flex flex-wrap gap-1.5">
          {brief.key_symptoms.map((s, i) => (
            <li
              key={i}
              className="rounded-full bg-mint-50 px-2 py-0.5 text-xs text-mint-800 ring-1 ring-mint-200/60"
            >
              {s}
            </li>
          ))}
        </ul>
      </Section>

      {brief.history_flags.length > 0 ? (
        <Section title="ประวัติที่เกี่ยวข้อง" titleEn="History flags">
          <ul className="flex flex-wrap gap-1.5">
            {brief.history_flags.map((h, i) => (
              <li
                key={i}
                className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
              >
                {h}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section icon={<Stethoscope className="size-3.5" />} title="DDx" titleEn="Differential">
        <div className="flex flex-col gap-1.5">
          {brief.ddx.map((d, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-md border border-line/60 bg-white/70 px-2.5 py-1.5 text-xs"
            >
              <span
                className={cn(
                  'mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ring-1',
                  LIKELIHOOD_STYLE[d.likelihood],
                )}
              >
                {LIKELIHOOD_TH[d.likelihood]}
              </span>
              <div className="min-w-0">
                <div className="font-medium text-ink">{d.diagnosis}</div>
                <div className="text-[11px] text-muted-foreground">{d.rationale}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section icon={<HelpCircle className="size-3.5" />} title="คำถามแนะนำ" titleEn="Suggested questions">
        <ol className="ml-4 list-decimal space-y-1 text-xs marker:text-mint-600">
          {brief.suggested_questions_th.map((q, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => setInputText(q)}
                className="text-left text-ink underline-offset-2 transition-colors hover:text-mint-700 hover:underline"
                title="คลิกเพื่อใส่คำถามนี้ลงในช่องแชท"
              >
                {q}
              </button>
            </li>
          ))}
        </ol>
      </Section>

      {brief.red_flags.length > 0 ? (
        <Section
          icon={<AlertTriangle className="size-3.5 text-triage-red" />}
          title="สัญญาณเตือน"
          titleEn="Red flags"
        >
          <ul className="flex flex-wrap gap-1.5">
            {brief.red_flags.map((f, i) => (
              <li
                key={i}
                className="rounded-md bg-triage-red/10 px-2 py-0.5 text-xs text-triage-red ring-1 ring-triage-red/30"
              >
                {f}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}

function Section({
  icon,
  title,
  titleEn,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  titleEn: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        <span>{title}</span>
        <span className="text-[10px] normal-case text-muted-foreground/70">· {titleEn}</span>
      </div>
      {children}
    </div>
  );
}
