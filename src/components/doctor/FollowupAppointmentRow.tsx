'use client';

import { CalendarPlus, Clock } from 'lucide-react';
import type { Appointment } from '@/stores/store-appointments';

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

// Distinct from AppointmentRow: a follow-up is a FUTURE booking with no no-show
// prediction, so it must NOT flow through AppointmentRow (which returns null
// without a matching prediction). No NoShowBadge, no "เปิด" — these aren't in
// today's live queue yet.
export function FollowupAppointmentRow({ appointment, now }: FollowupAppointmentRowProps) {
  const slot = new Date(appointment.slotIso);
  const timeLabel = slot.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  const dateLabel = slot.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-mint-200/70 bg-mint-50/40 p-3.5 md:flex-row md:items-center md:gap-4">
      <div className="flex w-28 shrink-0 flex-col gap-0.5">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-mint-700">
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
        <div className="truncate text-sm font-semibold text-ink">{appointment.patientName}</div>
        {appointment.reason_th ? (
          <div className="line-clamp-1 text-xs text-muted-foreground">{appointment.reason_th}</div>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center">
        <span className="inline-flex items-center gap-1 rounded-full bg-mint-100 px-2.5 py-1 text-[11px] font-medium text-mint-800">
          <CalendarPlus className="size-3" />
          นัดติดตาม · Follow-up
        </span>
      </div>
    </div>
  );
}
