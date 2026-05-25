'use client';

import { useState } from 'react';
import { ChevronRight, Clock, FileClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DoctorAppointment, NoShowPrediction } from '@/lib/data';
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

function relativeChip(time: string, now: Date): { label: string; tone: 'soon' | 'upcoming' | 'past' } {
  // appointment.time is "HH:MM" today-local; anchor to today's wall clock.
  const [h, m] = time.split(':').map(Number);
  const appt = new Date(now);
  appt.setHours(h, m, 0, 0);
  const diffMin = Math.round((appt.getTime() - now.getTime()) / 60_000);
  if (diffMin < -5) return { label: `ผ่านไป ${Math.abs(diffMin)} น.`, tone: 'past' };
  if (diffMin <= 0) return { label: 'ถึงเวลาแล้ว', tone: 'soon' };
  if (diffMin <= 30) return { label: `อีก ${diffMin} น.`, tone: 'soon' };
  if (diffMin < 60) return { label: `อีก ${diffMin} น.`, tone: 'upcoming' };
  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  return { label: mins ? `อีก ${hours} ชม. ${mins} น.` : `อีก ${hours} ชม.`, tone: 'upcoming' };
}

export function AppointmentRow({ appointment, prediction, doctorId, now }: AppointmentRowProps) {
  const selectedApptId = useDoctorStore((s) => s.selectedApptId);
  const openAppt = useDoctorStore((s) => s.openAppt);
  const isSelected = selectedApptId === appointment.appt_id;
  const rel = now ? relativeChip(appointment.time, now) : null;
  const [historyOpen, setHistoryOpen] = useState(false);
  const pastConsults = appointment.past_consults ?? [];

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-line/70 bg-white/60 p-4 transition-all md:flex-row md:items-center md:gap-4',
        isSelected && 'border-mint-400 bg-mint-50/80 shadow-sm',
      )}
    >
      <div className="flex w-24 shrink-0 flex-col gap-0.5">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-mint-700">
          <Clock className="size-3.5" />
          {appointment.time}
        </div>
        {rel ? (
          <div
            className={cn(
              'text-[10px] tabular-nums',
              rel.tone === 'soon' && 'text-mint-700',
              rel.tone === 'upcoming' && 'text-muted-foreground',
              rel.tone === 'past' && 'text-amber-700',
            )}
          >
            {rel.label}
          </div>
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-ink">{appointment.patient}</div>
        <div className="line-clamp-1 text-xs text-muted-foreground">{appointment.symptom}</div>
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
