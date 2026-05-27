'use client';

import { AlertTriangle, Apple, Ban, BedDouble, CalendarClock, Pill } from 'lucide-react';
import { PrintableDoc } from '@/components/shared/PrintableDoc';
import type { SummaryResult } from '@/lib/llm/schemas';

interface SelfCarePlanProps {
  plan: SummaryResult['self_care_plan'];
  /** Patient name + age for the printed letterhead — optional so the live UI keeps working without them. */
  patientName?: string;
  patientAge?: number;
  doctorName?: string;
  doctorSpecialty?: string;
}

export function SelfCarePlan({
  plan,
  patientName,
  patientAge,
  doctorName,
  doctorSpecialty,
}: SelfCarePlanProps) {
  const today = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const showLetterhead = Boolean(patientName || doctorName);

  return (
    <PrintableDoc>
      <div className="care-print-card border border-border/80 bg-card p-6 shadow-sm md:p-8">
          {showLetterhead ? (
            <div className="mb-6 border-b border-mint-300 pb-4 text-center">
              <div className="text-xs uppercase tracking-[0.2em] text-mint-700 dark:text-mint-400">MorDee+ Telemedicine</div>
              <h3 className="mt-1 text-2xl font-bold text-foreground">แผนการดูแลตนเอง</h3>
              <div className="text-xs text-muted-foreground">Self-Care Plan</div>
              <div className="mt-3 flex items-center justify-between px-2 text-xs text-muted-foreground">
                <span>
                  {patientName ? (
                    <>
                      คนไข้: <span className="font-medium text-foreground">{patientName}</span>
                      {patientAge ? <span className="text-muted-foreground"> · อายุ {patientAge} ปี</span> : null}
                    </>
                  ) : null}
                </span>
                <span>วันที่: {today}</span>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-4">
            <p className="rounded-md bg-mint-50 dark:bg-mint-500/10 px-3 py-2 text-sm text-mint-900 dark:text-mint-200">{plan.summary_th}</p>

            <Section icon={<Pill className="size-3.5" />} title="ยาที่ได้รับ" titleEn="Medications">
              {plan.medications.length === 0 ? (
                <p className="text-xs text-muted-foreground">— ไม่มียา (สั่งตรวจเพิ่มเติม) —</p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-border/60">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">ชื่อยา</th>
                        <th className="px-3 py-2">ขนาด</th>
                        <th className="px-3 py-2">ความถี่</th>
                        <th className="px-3 py-2">ระยะเวลา</th>
                        <th className="px-3 py-2">พร้อมอาหาร</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {plan.medications.map((m, i) => (
                        <tr key={i} className="bg-white/60 dark:bg-slate-800/50">
                          <td className="px-3 py-2 font-medium text-foreground">{m.name_th}</td>
                          <td className="px-3 py-2 text-muted-foreground">{m.dose_th}</td>
                          <td className="px-3 py-2 text-muted-foreground">{m.frequency_th}</td>
                          <td className="px-3 py-2 text-muted-foreground">{m.duration_th}</td>
                          <td className="px-3 py-2">
                            {m.with_food ? (
                              <span className="rounded-full bg-mint-100 dark:bg-mint-500/15 px-2 py-0.5 text-[10px] text-mint-800 dark:text-mint-200">ใช่</span>
                            ) : (
                              <span className="rounded-full bg-slate-100 dark:bg-slate-800/60 px-2 py-0.5 text-[10px] text-muted-foreground">ไม่</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            <div className="grid gap-4 md:grid-cols-2">
              <Section icon={<Apple className="size-3.5" />} title="อาหารแนะนำ" titleEn="Diet">
                <ul className="space-y-1 text-xs text-foreground">
                  {plan.diet_th.map((d, i) => (
                    <li key={i} className="flex gap-1.5"><span className="text-mint-600">•</span>{d}</li>
                  ))}
                </ul>
              </Section>
              <Section icon={<Ban className="size-3.5" />} title="ควรหลีกเลี่ยง" titleEn="Avoid">
                <ul className="space-y-1 text-xs text-foreground">
                  {plan.avoid_th.map((d, i) => (
                    <li key={i} className="flex gap-1.5"><span className="text-triage-red">✕</span>{d}</li>
                  ))}
                </ul>
              </Section>
            </div>

            <Section icon={<BedDouble className="size-3.5" />} title="การพักผ่อน" titleEn="Rest">
              <p className="text-xs text-foreground">{plan.rest_advice_th}</p>
            </Section>

            <Section icon={<AlertTriangle className="size-3.5 text-triage-red" />} title="สัญญาณเตือน" titleEn="Warning signs">
              <ul className="flex flex-wrap gap-1.5">
                {plan.warning_signs_th.map((w, i) => (
                  <li
                    key={i}
                    className="rounded-md bg-triage-red/10 px-2 py-0.5 text-[11px] text-triage-red ring-1 ring-triage-red/30"
                  >
                    {w}
                  </li>
                ))}
              </ul>
            </Section>

            <Section icon={<CalendarClock className="size-3.5" />} title="ระยะเวลาคาดว่าจะหาย" titleEn="Recovery">
              <p className="text-xs text-foreground">{plan.recovery_timeline_th}</p>
            </Section>
          </div>

          {showLetterhead && doctorName ? (
            <div className="mt-8 flex items-end justify-end">
              <div className="text-right text-sm">
                <div className="mb-1 inline-block w-56 border-b border-ink/50"></div>
                <div className="font-semibold text-foreground">{doctorName}</div>
                {doctorSpecialty ? (
                  <div className="text-xs text-muted-foreground">{doctorSpecialty}</div>
                ) : null}
                <div className="mt-1 text-[10px] text-muted-foreground">MorDee+ · {today}</div>
              </div>
            </div>
          ) : null}
        </div>
    </PrintableDoc>
  );
}

function Section({
  icon,
  title,
  titleEn,
  children,
}: {
  icon: React.ReactNode;
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
