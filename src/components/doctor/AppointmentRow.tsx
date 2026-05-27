'use client';

import { useState } from 'react';
import { ChevronRight, Clock, FileClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DoctorAppointment, NoShowPrediction } from '@/lib/data';
import { getPatientSegment } from '@/lib/data';
import { NoShowBadge } from './NoShowBadge';
import { PastConsultsDialog } from './PastConsultsDialog';
import { useDoctorStore } from '@/stores/store-doctor';

interface AppointmentRowProps {
  appointment: DoctorAppointment;
  prediction: NoShowPrediction;
  doctorId: string;
  /** Live "now" tick from AppointmentsCard — drives the relative-time chip. */
  now?: Date | null;
}

/** Minutes → Thai "ชม./น." label: 45 → "45 น.", 61 → "1 ชม. 1 น.", 120 → "2 ชม." */
function hmLabel(totalMin: number): string {
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours === 0) return `${mins} น.`;
  return mins ? `${hours} ชม. ${mins} น.` : `${hours} ชม.`;
}

function relativeChip(time: string, now: Date): { label: string; tone: 'soon' | 'upcoming' | 'past' } {
  // appointment.time is "HH:MM" today-local; anchor to today's wall clock.
  const [h, m] = time.split(':').map(Number);
  const appt = new Date(now);
  appt.setHours(h, m, 0, 0);
  let diffMin = Math.round((appt.getTime() - now.getTime()) / 60_000);
  // The queue only spans a few hours around "now", so if the HH:MM parse landed
  // on the wrong side of midnight (e.g. 00:15 read as this morning when it's
  // 23:33 tonight), fold it back into the nearest 24h window.
  if (diffMin > 720) diffMin -= 1440;
  else if (diffMin < -720) diffMin += 1440;
  // Past/future both roll up into ชม.+น. once over an hour (e.g. "ผ่านไป 1 ชม.
  // 1 น." instead of "ผ่านไป 61 น.").
  if (diffMin < -5) return { label: `ผ่านไป ${hmLabel(Math.abs(diffMin))}`, tone: 'past' };
  if (diffMin <= 0) return { label: 'ถึงเวลาแล้ว', tone: 'soon' };
  if (diffMin <= 30) return { label: `อีก ${hmLabel(diffMin)}`, tone: 'soon' };
  return { label: `อีก ${hmLabel(diffMin)}`, tone: 'upcoming' };
}

export function AppointmentRow({ appointment, prediction, doctorId, now }: AppointmentRowProps) {
  const selectedApptId = useDoctorStore((s) => s.selectedApptId);
  const openAppt = useDoctorStore((s) => s.openAppt);
  const isSelected = selectedApptId === appointment.appt_id;
  const rel = now ? relativeChip(appointment.time, now) : null;
  const [historyOpen, setHistoryOpen] = useState(false);
  const pastConsults = appointment.past_consults ?? [];
  // Patient cohort from the segmentation model (nb04). Muted slate pill + a
  // coloured dot — deliberately distinct from the triage and no-show palettes.
  const segment = getPatientSegment(appointment.appt_id);

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-border/70 bg-white/60 dark:bg-slate-800/50 p-4 transition-all md:flex-row md:items-center md:gap-4',
        isSelected && 'border-mint-400 bg-mint-50/80 dark:bg-mint-500/10 shadow-sm',
      )}
    >
      <div className="flex w-24 shrink-0 flex-col gap-0.5">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-mint-700 dark:text-mint-400">
          <Clock className="size-3.5" />
          {appointment.time}
        </div>
        {rel ? (
          <div
            className={cn(
              'text-[10px] tabular-nums',
              rel.tone === 'soon' && 'text-mint-700 dark:text-mint-400',
              rel.tone === 'upcoming' && 'text-muted-foreground',
              rel.tone === 'past' && 'text-amber-700 dark:text-amber-500',
            )}
          >
            {rel.label}
          </div>
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-foreground">{appointment.patient}</div>
        <div className="line-clamp-1 text-xs text-muted-foreground">{appointment.symptom}</div>
        {segment ? (
          <span
            className="mt-1 inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-slate-200/70 dark:ring-slate-700"
            title={`กลุ่มผู้ป่วย · ${segment.label_en}`}
          >
            <span className="size-1.5 rounded-full" style={{ backgroundColor: segment.color }} />
            {segment.label_th}
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-2 md:gap-3">
        <NoShowBadge prediction={prediction} />
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setHistoryOpen(true)}
          title="ดูประวัติการปรึกษาก่อนหน้า"
        >
          <FileClock className="size-3.5" />
          ประวัติ
          {pastConsults.length > 0 ? (
            <span className="ml-0.5 text-[10px] text-muted-foreground">({pastConsults.length})</span>
          ) : null}
        </Button>
        <Button
          size="sm"
          variant={isSelected ? 'secondary' : 'default'}
          onClick={() => openAppt(appointment, doctorId)}
        >
          {isSelected ? 'กำลังปรึกษา' : 'เปิด'}
          <ChevronRight className="size-3.5" />
        </Button>
      </div>

      <PastConsultsDialog
        patientName={appointment.patient}
        consults={pastConsults}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />
    </div>
  );
}
