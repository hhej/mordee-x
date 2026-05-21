'use client';

import { AlertTriangle, Apple, Ban, BedDouble, CalendarClock, Pill } from 'lucide-react';
import type { SummaryResult } from '@/lib/llm/schemas';

interface SelfCarePlanProps {
  plan: SummaryResult['self_care_plan'];
}

export function SelfCarePlan({ plan }: SelfCarePlanProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-md bg-mint-50 px-3 py-2 text-sm text-mint-900">{plan.summary_th}</p>

      <Section icon={<Pill className="size-3.5" />} title="ยาที่ได้รับ" titleEn="Medications">
        {plan.medications.length === 0 ? (
          <p className="text-xs text-muted-foreground">— ไม่มียา (สั่งตรวจเพิ่มเติม) —</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-line/60">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">ชื่อยา</th>
                  <th className="px-3 py-2">ขนาด</th>
                  <th className="px-3 py-2">ความถี่</th>
                  <th className="px-3 py-2">ระยะเวลา</th>
                  <th className="px-3 py-2">พร้อมอาหาร</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/40">
                {plan.medications.map((m, i) => (
                  <tr key={i} className="bg-white/60">
                    <td className="px-3 py-2 font-medium text-ink">{m.name_th}</td>
                    <td className="px-3 py-2 text-muted-foreground">{m.dose_th}</td>
                    <td className="px-3 py-2 text-muted-foreground">{m.frequency_th}</td>
                    <td className="px-3 py-2 text-muted-foreground">{m.duration_th}</td>
                    <td className="px-3 py-2">
                      {m.with_food ? (
                        <span className="rounded-full bg-mint-100 px-2 py-0.5 text-[10px] text-mint-800">ใช่</span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-muted-foreground">ไม่</span>
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
          <ul className="space-y-1 text-xs text-ink">
            {plan.diet_th.map((d, i) => (
              <li key={i} className="flex gap-1.5"><span className="text-mint-600">•</span>{d}</li>
            ))}
          </ul>
        </Section>
        <Section icon={<Ban className="size-3.5" />} title="ควรหลีกเลี่ยง" titleEn="Avoid">
          <ul className="space-y-1 text-xs text-ink">
            {plan.avoid_th.map((d, i) => (
              <li key={i} className="flex gap-1.5"><span className="text-triage-red">✕</span>{d}</li>
            ))}
          </ul>
        </Section>
      </div>

      <Section icon={<BedDouble className="size-3.5" />} title="การพักผ่อน" titleEn="Rest">
        <p className="text-xs text-ink">{plan.rest_advice_th}</p>
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
        <p className="text-xs text-ink">{plan.recovery_timeline_th}</p>
      </Section>
    </div>
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
