'use client';

import { PrintableDoc } from '@/components/shared/PrintableDoc';
import type { SummaryResult } from '@/lib/llm/schemas';

interface MedicalCertificateProps {
  summary: SummaryResult;
  patientName: string;
  patientAge?: number;
  doctorName: string;
  doctorSpecialty: string;
}

const FACILITY_NAME = 'MorDee+ Telemedicine คลินิก';

function fillCertPlaceholders(text: string, age: number | undefined, todayTh: string): string {
  return text
    .replace(/\[ระบุอายุ\]/g, age ? String(age) : '—')
    .replace(/\[อายุ\]/g, age ? String(age) : '—')
    .replace(/\[ชื่อสถานพยาบาล\]/g, FACILITY_NAME)
    .replace(/\[สถานพยาบาล\]/g, FACILITY_NAME)
    .replace(/\[วันที่ปัจจุบัน\]/g, todayTh)
    .replace(/\[วันที่\]/g, todayTh);
}

export function MedicalCertificate({
  summary,
  patientName,
  patientAge,
  doctorName,
  doctorSpecialty,
}: MedicalCertificateProps) {
  const today = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const certText = fillCertPlaceholders(summary.certificate_text_th, patientAge, today);

  return (
    <PrintableDoc>
      <div className="border border-border/80 bg-card p-8 shadow-sm">
          <div className="border-b border-mint-300 pb-4 text-center">
            <div className="text-xs uppercase tracking-[0.2em] text-mint-700 dark:text-mint-400">MorDee+ Telemedicine</div>
            <h3 className="mt-1 text-2xl font-bold text-foreground">ใบรับรองแพทย์</h3>
            <div className="text-xs text-muted-foreground">Medical Certificate</div>
          </div>

          <div className="mt-6 space-y-3 text-sm leading-relaxed text-foreground">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                คนไข้: <span className="font-medium text-foreground">{patientName}</span>
                {patientAge ? <span className="text-muted-foreground"> · อายุ {patientAge} ปี</span> : null}
              </span>
              <span>วันที่: {today}</span>
            </div>
            <div className="rounded-md bg-mint-50/60 dark:bg-mint-500/10 px-3 py-2 text-xs">
              <span className="font-medium text-mint-800 dark:text-mint-200">การวินิจฉัย · Diagnosis:</span>{' '}
              {summary.diagnosis_th} ({summary.diagnosis}) ·{' '}
              <span className="font-mono text-[11px] text-muted-foreground">ICD-10: {summary.icd10}</span>
            </div>
            <p className="whitespace-pre-wrap text-justify indent-8">{certText}</p>
          </div>

          <div className="mt-10 flex items-end justify-end">
            <div className="text-right text-sm">
              <div className="mb-1 inline-block w-56 border-b border-ink/50"></div>
              <div className="font-semibold text-foreground">{doctorName}</div>
              <div className="text-xs text-muted-foreground">{doctorSpecialty}</div>
              <div className="mt-1 text-[10px] text-muted-foreground">MorDee+ · {today}</div>
            </div>
          </div>
        </div>
    </PrintableDoc>
  );
}
