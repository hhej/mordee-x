'use client';

import { useState } from 'react';
import { BellRing, CalendarCheck, CalendarPlus, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePatientStore } from '@/stores/store-patient';
import { useAppointmentStore } from '@/stores/store-appointments';
import { FollowupSlotDialog } from './FollowupSlotDialog';

interface FollowupCalloutProps {
  daysFromNow: number;
  reason: string | null;
}

function dateFromNow(daysFromNow: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d;
}

function formatThaiDate(date: Date): string {
  return date.toLocaleDateString('th-TH', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });
}

function formatThaiSlot(iso: string): string {
  return new Date(iso).toLocaleString('th-TH', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type Mode = 'suggest' | 'booked' | 'declined';

export function FollowupCallout({ daysFromNow, reason }: FollowupCalloutProps) {
  const doctorId = usePatientStore((s) => s.selectedDoctorId);
  const persona = usePatientStore((s) => s.persona);
  const addAppointment = useAppointmentStore((s) => s.addAppointment);
  const cancel = useAppointmentStore((s) => s.cancel);

  const [mode, setMode] = useState<Mode>('suggest');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bookedSlot, setBookedSlot] = useState<string | null>(null);
  const [declinedId, setDeclinedId] = useState<string | null>(null);

  const suggestedDate = dateFromNow(daysFromNow);
  const dateLabel = formatThaiDate(suggestedDate);

  if (!doctorId) return null;

  const handleBooked = (iso: string) => {
    addAppointment({
      doctorId,
      patientName: persona.name,
      slotIso: iso,
      kind: 'followup',
      reason_th: reason ?? undefined,
      createdByRole: 'patient',
    });
    setBookedSlot(iso);
    setMode('booked');
  };

  const handleDecline = () => {
    // Record the decline in the ledger (realism), keep its id so "เปลี่ยนใจ"
    // can void it. slotIso is the suggested day as a placeholder — declined
    // entries never surface in upcoming lists (status filter excludes them).
    const appt = addAppointment({
      doctorId,
      patientName: persona.name,
      slotIso: suggestedDate.toISOString(),
      kind: 'followup',
      reason_th: reason ?? undefined,
      createdByRole: 'patient',
      status: 'declined',
    });
    setDeclinedId(appt.id);
    setMode('declined');
  };

  const handleUndo = () => {
    if (declinedId) cancel(declinedId);
    setDeclinedId(null);
    setMode('suggest');
  };

  if (mode === 'booked' && bookedSlot) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-mint-400/60 bg-mint-100/70 dark:bg-mint-500/15 px-3 py-2">
        <div className="flex items-start gap-2">
          <CalendarCheck className="mt-0.5 size-4 text-mint-800 dark:text-mint-200" />
          <div>
            <div className="text-sm font-medium text-mint-900 dark:text-mint-200">
              ✓ นัดติดตาม {formatThaiSlot(bookedSlot)} เรียบร้อย
            </div>
            <div className="flex items-center gap-1 text-xs text-mint-800/80 dark:text-mint-200/80">
              <BellRing className="size-3" />
              ระบบจะส่งการแจ้งเตือนก่อนนัดล่วงหน้า · ยังไม่ต้องชำระเงินตอนนี้
            </div>
          </div>
        </div>
        <Button size="sm" variant="outline" disabled>
          ✓ จองแล้ว
        </Button>
      </div>
    );
  }

  if (mode === 'declined') {
    return (
      <div className="flex items-center justify-between rounded-lg border border-border/60 bg-slate-50/80 dark:bg-slate-800/60 px-3 py-2">
        <div className="text-xs text-muted-foreground">
          คุณเลือกไม่นัดติดตามในตอนนี้ · No follow-up booked
        </div>
        <Button size="sm" variant="ghost" onClick={handleUndo}>
          <RotateCcw className="size-3.5" />
          เปลี่ยนใจ
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-mint-300/60 bg-mint-50/60 dark:bg-mint-500/10 px-3 py-2">
        <div className="flex items-start gap-2">
          <CalendarPlus className="mt-0.5 size-4 text-mint-700 dark:text-mint-400" />
          <div>
            <div className="text-sm font-medium text-mint-900 dark:text-mint-200">
              แนะนำให้ติดตามอาการในอีก {daysFromNow} วัน · ตั้งแต่ {dateLabel}
            </div>
            {reason ? <div className="text-xs text-mint-800/80 dark:text-mint-200/80">{reason}</div> : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={handleDecline}>
            <X className="size-3.5" />
            ไม่สะดวก
          </Button>
          <Button size="sm" variant="default" onClick={() => setDialogOpen(true)}>
            จองนัดติดตาม
          </Button>
        </div>
      </div>

      <FollowupSlotDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        doctorId={doctorId}
        suggestedDate={suggestedDate}
        reason={reason}
        onConfirm={handleBooked}
      />
    </>
  );
}
