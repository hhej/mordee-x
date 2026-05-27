'use client';

import { useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DoctorAvatar } from '@/components/shared/DoctorAvatar';
import { getDoctor } from '@/lib/data';
import { availableSlotsFor } from '@/lib/availability';
import { useNow } from '@/lib/use-now';
import { useAppointmentStore } from '@/stores/store-appointments';
import { ScheduleSlotGrid } from './ScheduleSlotGrid';

interface FollowupSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctorId: string;
  /** Doctor-suggested earliest follow-up day; the grid starts here. */
  suggestedDate: Date;
  reason: string | null;
  /** Called with the chosen slot ISO once the patient confirms. */
  onConfirm: (iso: string) => void;
}

// Follow-ups are free (no MockPaymentDialog) — this picker writes nothing to the
// patient booking/payment store. It just surfaces the doctor's free slots from
// the suggested date onward (availability.ts removes already-booked ones) and
// hands the chosen ISO back to the caller.
export function FollowupSlotDialog({
  open,
  onOpenChange,
  doctorId,
  suggestedDate,
  reason,
  onConfirm,
}: FollowupSlotDialogProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const appointments = useAppointmentStore((s) => s.appointments);
  const now = useNow() ?? new Date();

  const doctor = getDoctor(doctorId);
  if (!doctor) return null;

  // Slots this doctor is already booked into → render unavailable in the grid.
  const takenIsoSet = new Set(
    appointments
      .filter((a) => a.doctorId === doctorId && a.status === 'scheduled')
      .map((a) => a.slotIso),
  );

  const slots = availableSlotsFor(doctorId, now, { fromDate: suggestedDate, takenIsoSet });

  const selectedLabel = selected
    ? new Date(selected).toLocaleString('th-TH', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const confirm = () => {
    if (!selected) return;
    onConfirm(selected);
    setSelected(null);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setSelected(null);
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <DoctorAvatar doctor={doctor} size={36} className="rounded-full" />
            <div>
              <div>นัดติดตาม · Follow-up · {doctor.name}</div>
              <div className="text-[11px] font-normal text-muted-foreground">
                {doctor.specialty_th} · ไม่มีค่าใช้จ่ายเพิ่มเติม
              </div>
            </div>
          </DialogTitle>
          <DialogDescription>
            เลือกช่วงเวลาที่สะดวก — แสดงเฉพาะเวลาที่หมอว่าง ตั้งแต่วันที่แนะนำเป็นต้นไป
          </DialogDescription>
        </DialogHeader>

        {reason ? (
          <div className="flex items-start gap-2 rounded-md bg-mint-50/70 dark:bg-mint-500/10 px-3 py-2 text-xs text-mint-900 dark:text-mint-200 ring-1 ring-mint-200/60 dark:ring-mint-500/30">
            <CalendarPlus className="mt-0.5 size-3.5 shrink-0 text-mint-700 dark:text-mint-400" />
            <span>{reason}</span>
          </div>
        ) : null}

        {slots.length > 0 ? (
          <ScheduleSlotGrid
            doctorId={doctorId}
            now={now}
            slots={slots}
            value={selected}
            onSelect={setSelected}
          />
        ) : (
          <div className="rounded-xl border border-dashed border-border/60 bg-white/40 dark:bg-slate-800/50 px-4 py-6 text-center text-sm text-muted-foreground">
            ไม่มีช่วงเวลาว่างในสัปดาห์นี้ — ลองติดต่อทีมงาน MorDee+
          </div>
        )}

        {selectedLabel ? (
          <div className="rounded-md bg-mint-50 dark:bg-mint-500/10 px-3 py-1.5 text-xs text-mint-900 dark:text-mint-200 ring-1 ring-mint-200/60 dark:ring-mint-500/30">
            เลือก: {selectedLabel}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            ยกเลิก
          </Button>
          <Button onClick={confirm} disabled={!selected}>
            ยืนยันนัดติดตาม →
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
