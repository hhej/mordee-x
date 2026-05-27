'use client';

import { useState } from 'react';
import { CalendarPlus, Clock, FileClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { findDoctorAppointmentByPatient } from '@/lib/data';
import type { Appointment } from '@/stores/store-appointments';
import { PatientRecordDialog } from './PatientRecordDialog';

interface FollowupAppointmentRowProps {
  appointment: Appointment;
  /** Live "now" tick from AppointmentsCard — drives the relative-day chip. */
  now?: Date | null;
}

function relativeDay(slotIso: string, now: Date): string {
  const slot = new Date(slotIso);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfSlot = new Date(slot);
  startOfSlot.setHours(0, 0, 0, 0);
  const days = Math.round((startOfSlot.getTime() - startOfToday.getTime()) / 86_400_000);
  if (days <= 0) return 'วันนี้';
  if (days === 1) return 'พรุ่งนี้';
  return `อีก ${days} วัน`;
}

// Distinct from AppointmentRow: an upcoming booking (initial or follow-up) is a
// FUTURE booking with no no-show prediction, so it must NOT flow through
// AppointmentRow (which returns null without a matching prediction). No
// NoShowBadge, no "เปิด" — these aren't in today's live queue yet.
export function FollowupAppointmentRow({ appointment, now }: FollowupAppointmentRowProps) {
  const slot = new Date(appointment.slotIso);
  const timeLabel = slot.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  const dateLabel = slot.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
  const isFollowup = appointment.kind === 'followup';
  const [recordOpen, setRecordOpen] = useState(false);
  // Upcoming bookings carry only a patient name — resolve it back to the
  // doctor's demo record (profile + past consults) so the doctor can review
  // the chart before the visit. No match → dialog shows a "no record" state.
  const record = findDoctorAppointmentByPatient(appointment.doctorId, appointment.patientName);
  const pastCount = record?.past_consults?.length ?? 0;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-mint-200/70 bg-mint-50/40 dark:bg-mint-500/10 p-3.5 md:flex-row md:items-center md:gap-4">
      <div className="flex w-28 shrink-0 flex-col gap-0.5">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-mint-700 dark:text-mint-400">
          <Clock className="size-3.5" />
          {dateLabel} · {timeLabel}
        </div>
        {now ? (
          <div className="text-[10px] tabular-nums text-muted-foreground">
            {relativeDay(appointment.slotIso, now)}
          </div>
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-foreground">{appointment.patientName}</div>
        {appointment.reason_th ? (
          <div className="line-clamp-1 text-xs text-muted-foreground">{appointment.reason_th}</div>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-mint-100 dark:bg-mint-500/15 px-2.5 py-1 text-[11px] font-medium text-mint-800 dark:text-mint-200">
          <CalendarPlus className="size-3" />
          {isFollowup ? 'นัดติดตาม · Follow-up' : 'นัดใหม่ · New'}
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setRecordOpen(true)}
          title="ดูประวัติผู้ป่วย"
        >
          <FileClock className="size-3.5" />
          ดูประวัติ
          {pastCount > 0 ? (
            <span className="ml-0.5 text-[10px] text-muted-foreground">({pastCount})</span>
          ) : null}
        </Button>
      </div>

      <PatientRecordDialog
        patientName={appointment.patientName}
        record={record}
        reason_th={appointment.reason_th}
        open={recordOpen}
        onOpenChange={setRecordOpen}
      />
    </div>
  );
}
