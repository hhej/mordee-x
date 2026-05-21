'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Check, CreditCard, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getDoctor } from '@/lib/data';
import { usePatientStore } from '@/stores/store-patient';

export function MockPaymentDialog() {
  const open = usePatientStore((s) => s.paymentOpen);
  const doctorId = usePatientStore((s) => s.selectedDoctorId);
  const mode = usePatientStore((s) => s.bookingMode);
  const slot = usePatientStore((s) => s.bookingSlot);
  const isPaying = usePatientStore((s) => s.isPaying);
  const cancel = usePatientStore((s) => s.cancelPayment);
  const complete = usePatientStore((s) => s.completePayment);

  const [done, setDone] = useState(false);
  const doctor = doctorId ? getDoctor(doctorId) : undefined;
  if (!doctor) return null;

  const slotLabel =
    mode === 'now'
      ? 'ทันที (~3 นาที)'
      : slot
        ? new Date(slot).toLocaleString('th-TH', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })
        : '—';

  const onPay = async () => {
    await complete();
    setDone(true);
    setTimeout(() => setDone(false), 400);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !isPaying) cancel();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ยืนยันการชำระเงิน</DialogTitle>
          <DialogDescription>สรุปคำสั่งซื้อก่อนเริ่มปรึกษา</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl border border-line/60 bg-white/70 p-3">
            <Image
              src={doctor.avatar}
              alt={doctor.name_en}
              width={48}
              height={48}
              className="size-12 rounded-xl object-cover ring-1 ring-line/40"
              unoptimized
            />
            <div className="flex-1">
              <div className="text-sm font-medium text-ink">{doctor.name}</div>
              <div className="text-[11px] text-muted-foreground">{doctor.specialty_th}</div>
            </div>
            <div className="text-right">
              <div className="text-base font-semibold text-ink">
                {doctor.price.toLocaleString('th-TH')} ฿
              </div>
              <div className="text-[10px] text-muted-foreground">ค่าปรึกษา</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div className="rounded-md bg-slate-50 px-3 py-1.5">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">เวลา</div>
              <div className="text-ink">{slotLabel}</div>
            </div>
            <div className="rounded-md bg-slate-50 px-3 py-1.5">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">ช่องทาง</div>
              <div className="text-ink">แชทกับคุณหมอ · MorDee+</div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={cancel} disabled={isPaying}>
            ยกเลิก
          </Button>
          <Button onClick={onPay} disabled={isPaying || done} className="min-w-[140px]">
            {isPaying ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                กำลังประมวลผล…
              </>
            ) : done ? (
              <>
                <Check className="size-3.5" />
                สำเร็จ
              </>
            ) : (
              <>
                <CreditCard className="size-3.5" />
                พร้อมเพย์ จ่าย {doctor.price.toLocaleString('th-TH')} ฿
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
