'use client';

import { CalendarClock, Clock4 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { DoctorAvatar } from '@/components/shared/DoctorAvatar';
import { getDoctor } from '@/lib/data';
import { usePatientStore } from '@/stores/store-patient';
import { useAppointmentStore } from '@/stores/store-appointments';
import { INSTANT_CONSULT_WAIT_EN, INSTANT_CONSULT_WAIT_TH } from '@/lib/constants';
import { ScheduleSlotGrid } from './ScheduleSlotGrid';

// Radix Dialog mounts its children only while `open` is true, so the slot grid
// gets a fresh `new Date()` anchor each time the user reopens the dialog — no
// separate "anchor" state is needed.
export function BookingDialog() {
  const open = usePatientStore((s) => s.bookingOpen);
  const doctorId = usePatientStore((s) => s.selectedDoctorId);
  const mode = usePatientStore((s) => s.bookingMode);
  const slot = usePatientStore((s) => s.bookingSlot);
  const setMode = usePatientStore((s) => s.setBookingMode);
  const cancel = usePatientStore((s) => s.cancelBooking);
  const confirm = usePatientStore((s) => s.confirmBooking);
  const appointments = useAppointmentStore((s) => s.appointments);

  const doctor = doctorId ? getDoctor(doctorId) : undefined;
  if (!doctor) return null;

  // Slots this doctor is already booked into → render unavailable in the grid so
  // two bookings can't land on the same slot (mirrors FollowupSlotDialog).
  const takenIsoSet = new Set(
    appointments
      .filter((a) => a.doctorId === doctor.id && a.status === 'scheduled')
      .map((a) => a.slotIso),
  );

  const canConfirm = mode === 'now' || (mode === 'scheduled' && slot !== null);

  const slotLabel = slot
    ? new Date(slot).toLocaleString('th-TH', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : cancel())}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <DoctorAvatar doctor={doctor} size={36} className="rounded-full" />
            <div>
              <div>จองคิว · Book · {doctor.name}</div>
              <div className="text-[11px] font-normal text-muted-foreground">
                {doctor.specialty_th} · {doctor.price.toLocaleString('th-TH')} บาท
              </div>
            </div>
          </DialogTitle>
          <DialogDescription>
            เลือกว่าจะปรึกษาทันทีหรือจองล่วงหน้า · Choose now or schedule
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'now' | 'scheduled')}>
          <TabsList>
            <TabsTrigger value="now">
              <Clock4 className="size-3.5" />
              ปรึกษาตอนนี้ · Talk now
            </TabsTrigger>
            <TabsTrigger value="scheduled">
              <CalendarClock className="size-3.5" />
              จองล่วงหน้า · Schedule
            </TabsTrigger>
          </TabsList>

          <TabsContent value="now" className="pt-4">
            <div className="rounded-xl border border-mint-200/60 bg-mint-50/40 px-4 py-6 text-center">
              <Clock4 className="mx-auto mb-2 size-7 text-mint-700" />
              <div className="text-sm font-medium text-ink">
                หมอพร้อมให้บริการใน ~{INSTANT_CONSULT_WAIT_TH}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                ระบบจะจับคู่กับ {doctor.name} ทันทีที่คุณยืนยัน
                <span className="block">Connecting in ~{INSTANT_CONSULT_WAIT_EN} once you confirm.</span>
              </p>
            </div>
          </TabsContent>

          <TabsContent value="scheduled" className="pt-4">
            <ScheduleSlotGrid doctorId={doctor.id} takenIsoSet={takenIsoSet} />
            {slotLabel ? (
              <div className="mt-3 rounded-md bg-mint-50 px-3 py-1.5 text-xs text-mint-900 ring-1 ring-mint-200/60">
                เลือก: {slotLabel}
              </div>
            ) : (
              <div className="mt-3 text-[11px] text-muted-foreground">
                คลิกเลือกช่วงเวลา ↑ เพื่อจองล่วงหน้า
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={cancel}>
            ยกเลิก
          </Button>
          <Button onClick={confirm} disabled={!canConfirm}>
            ยืนยัน จ่ายเงิน →
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
