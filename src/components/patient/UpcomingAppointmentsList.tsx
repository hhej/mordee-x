'use client';

import { useState } from 'react';
import { Clock4, RotateCcw, X } from 'lucide-react';
import { DoctorAvatar } from '@/components/shared/DoctorAvatar';
import { Button } from '@/components/ui/button';
import { getDoctor } from '@/lib/data';
import { useAppointmentStore, type Appointment } from '@/stores/store-appointments';

function formatCountdown(slot: Date, now: Date): string {
  const diffMs = slot.getTime() - now.getTime();
  const totalMin = Math.round(Math.abs(diffMs) / 60_000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin - days * 60 * 24) / 60);
  const minutes = totalMin % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} วัน`);
  if (hours > 0) parts.push(`${hours} ชั่วโมง`);
  if (days === 0 && minutes > 0) parts.push(`${minutes} นาที`);
  if (parts.length === 0) parts.push('ไม่ถึงนาที');
  return `อีก ${parts.join(' ')}`;
}

function slotLabel(iso: string): string {
  return new Date(iso).toLocaleString('th-TH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface UpcomingAppointmentsListProps {
  /** Pre-filtered, sorted upcoming appointments for the current patient. */
  appointments: Appointment[];
  now: Date;
}

// Row rendering + cancel/undo, shared by UpcomingAppointmentsCard (start screen)
// and MyAppointmentsButton (header dialog). Cancel flips the ledger status so the
// row leaves the upcoming filter immediately; an inline strip offers a one-tap undo.
export function UpcomingAppointmentsList({ appointments, now }: UpcomingAppointmentsListProps) {
  const cancel = useAppointmentStore((s) => s.cancel);
  const restore = useAppointmentStore((s) => s.restore);
  const [recentlyCancelled, setRecentlyCancelled] = useState<{ id: string; label: string } | null>(
    null,
  );

  const handleCancel = (appt: Appointment) => {
    const doctor = getDoctor(appt.doctorId);
    cancel(appt.id);
    setRecentlyCancelled({
      id: appt.id,
      label: `${doctor?.name ?? 'แพทย์'} · ${slotLabel(appt.slotIso)}`,
    });
  };

  const handleUndo = () => {
    if (recentlyCancelled) restore(recentlyCancelled.id);
    setRecentlyCancelled(null);
  };

  return (
    <div className="flex flex-col gap-2.5">
      {recentlyCancelled ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-line/60 bg-slate-50/80 px-3 py-2">
          <div className="min-w-0 text-xs text-muted-foreground">
            ยกเลิกนัดแล้ว · <span className="truncate">{recentlyCancelled.label}</span>
          </div>
          <Button size="sm" variant="ghost" onClick={handleUndo}>
            <RotateCcw className="size-3.5" />
            เปลี่ยนใจ
          </Button>
        </div>
      ) : null}

      {appointments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line/60 bg-white/40 px-4 py-6 text-center text-sm text-muted-foreground">
          ยังไม่มีนัดหมาย · No upcoming appointments
        </div>
      ) : (
        appointments.map((appt) => {
          const doctor = getDoctor(appt.doctorId);
          return (
            <div
              key={appt.id}
              className="flex items-center gap-3 rounded-xl border border-line/60 bg-white/70 p-3"
            >
              {doctor ? <DoctorAvatar doctor={doctor} size={40} /> : null}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium text-ink">
                    {doctor?.name ?? 'แพทย์'}
                  </span>
                  <span className="shrink-0 rounded-full bg-mint-100 px-1.5 py-0.5 text-[10px] font-medium text-mint-800">
                    {appt.kind === 'followup' ? 'นัดติดตาม' : 'นัดใหม่'}
                  </span>
                </div>
                <div className="truncate text-xs text-mint-900">{slotLabel(appt.slotIso)}</div>
                {appt.reason_th ? (
                  <div className="truncate text-[11px] text-muted-foreground">{appt.reason_th}</div>
                ) : null}
                <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] tabular-nums text-mint-700">
                  <Clock4 className="size-3" />
                  {formatCountdown(new Date(appt.slotIso), now)}
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0 text-muted-foreground hover:text-red-600"
                onClick={() => handleCancel(appt)}
                title="ยกเลิกนัด"
              >
                <X className="size-3.5" />
                ยกเลิก
              </Button>
            </div>
          );
        })
      )}
    </div>
  );
}
