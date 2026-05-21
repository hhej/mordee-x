'use client';

import Image from 'next/image';
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
import { getDoctor } from '@/lib/data';
import { usePatientStore } from '@/stores/store-patient';
import { ScheduleSlotGrid } from './ScheduleSlotGrid';

export function BookingDialog() {
  const open = usePatientStore((s) => s.bookingOpen);
  const doctorId = usePatientStore((s) => s.selectedDoctorId);
  const mode = usePatientStore((s) => s.bookingMode);
  const slot = usePatientStore((s) => s.bookingSlot);
  const setMode = usePatientStore((s) => s.setBookingMode);
  const cancel = usePatientStore((s) => s.cancelBooking);
  const confirm = usePatientStore((s) => s.confirmBooking);

  const doctor = doctorId ? getDoctor(doctorId) : undefined;
  if (!doctor) return null;

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
            <Image
              src={doctor.avatar}
              alt={doctor.name_en}
              width={36}
              height={36}
              className="size-9 rounded-full object-cover ring-1 ring-line/40"
              unoptimized
            />
            <div>
              <div>จองคิว · {doctor.name}</div>
              <div className="text-[11px] font-normal text-muted-foreground">
                {doctor.specialty_th} · {doctor.price.toLocaleString('th-TH')} บาท
              </div>
            </div>
          </DialogTitle>
          <DialogDescription>เลือกว่าจะปรึกษาทันทีหรือจองล่วงหน้า</DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'now' | 'scheduled')}>
          <TabsList>
            <TabsTrigger value="now">
              <Clock4 className="size-3.5" />
              ปรึกษาตอนนี้
            </TabsTrigger>
            <TabsTrigger value="scheduled">
              <CalendarClock className="size-3.5" />
              จองล่วงหน้า
            </TabsTrigger>
          </TabsList>

          <TabsContent value="now" className="pt-4">
            <div className="rounded-xl border border-mint-200/60 bg-mint-50/40 px-4 py-6 text-center">
              <Clock4 className="mx-auto mb-2 size-7 text-mint-700" />
              <div className="text-sm font-medium text-ink">
                หมอพร้อมให้บริการใน ~3 นาที
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                ระบบจะจับคู่กับ {doctor.name} ทันทีที่คุณยืนยัน
              </p>
            </div>
          </TabsContent>

          <TabsContent value="scheduled" className="pt-4">
            <ScheduleSlotGrid doctorId={doctor.id} />
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
