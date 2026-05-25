'use client';

import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
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
import { INSTANT_CONSULT_WAIT_TH } from '@/lib/constants';

export function MockPaymentDialog() {
  const open = usePatientStore((s) => s.paymentOpen);
  const doctorId = usePatientStore((s) => s.selectedDoctorId);
  const mode = usePatientStore((s) => s.bookingMode);
  const slot = usePatientStore((s) => s.bookingSlot);
  const isPaying = usePatientStore((s) => s.isPaying);
  const paymentSuccess = usePatientStore((s) => s.paymentSuccess);
  const cancel = usePatientStore((s) => s.cancelPayment);
  const complete = usePatientStore((s) => s.completePayment);

  const doctor = doctorId ? getDoctor(doctorId) : undefined;
  if (!doctor) return null;

  const slotLabel =
    mode === 'now'
      ? `ทันที (~${INSTANT_CONSULT_WAIT_TH})`
      : slot
        ? new Date(slot).toLocaleString('th-TH', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })
        : '—';

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !isPaying && !paymentSuccess) cancel();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            ยืนยันการชำระเงิน
            <span className="ml-2 text-xs font-normal text-muted-foreground">· Confirm payment</span>
          </DialogTitle>
          <DialogDescription>สรุปคำสั่งซื้อก่อนเริ่มปรึกษา · Review before starting the consult</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl border border-line/60 bg-white/70 p-3">
              <Image
                src={doctor.avatar}
                alt={`รูปคุณหมอ ${doctor.name_en}`}
                width={48}
                height={48}
                className="size-12 rounded-xl object-cover ring-1 ring-line/40"
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
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">เวลา · Time</div>
                <div className="text-ink">{slotLabel}</div>
              </div>
              <div className="rounded-md bg-slate-50 px-3 py-1.5">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">ช่องทาง · Channel</div>
                <div className="text-ink">แชทกับคุณหมอ · MorDee+</div>
              </div>
            </div>
          </div>

          {/* Success affirmation — covers the dialog body during PAYMENT_SUCCESS_FLASH_MS
             window before the dialog auto-closes into the consult. */}
          <AnimatePresence>
            {paymentSuccess ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-white/95 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ scale: 0.5, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                  className="flex size-16 items-center justify-center rounded-full bg-mint-500 text-white shadow-[0_8px_24px_-8px_rgba(34,197,94,0.5)]"
                >
                  <Check className="size-8" strokeWidth={3} />
                </motion.div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-ink">ชำระเงินสำเร็จ</div>
                  <div className="text-[11px] text-muted-foreground">
                    Payment confirmed ·{' '}
                    {mode === 'scheduled' ? 'กำลังยืนยันการนัด…' : 'กำลังเริ่มห้องปรึกษา…'}
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={cancel} disabled={isPaying || paymentSuccess}>
            ยกเลิก
          </Button>
          <Button onClick={complete} disabled={isPaying || paymentSuccess} className="min-w-[140px]">
            {isPaying ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                กำลังประมวลผล…
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
