'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDoctorStore } from '@/stores/store-doctor';
import type { DoctorAppointment } from '@/lib/data';
import { ConsultPanel } from './ConsultPanel';
import { ConsultSummaryShell } from './ConsultSummaryShell';

interface ConsultTakeoverProps {
  appointments: DoctorAppointment[];
  doctorName: string;
  doctorSpecialty: string;
}

export function ConsultTakeover({
  appointments,
  doctorName,
  doctorSpecialty,
}: ConsultTakeoverProps) {
  const appointment = useDoctorStore((s) => s.appointment);
  const consultEnded = useDoctorStore((s) => s.consultEnded);
  const closeAppt = useDoctorStore((s) => s.closeAppt);

  const queueRemaining = appointments.length - 1;

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-20 -mx-6 mb-4 border-b border-line/60 bg-white/80 px-6 py-3 backdrop-blur-md md:-mx-12 md:px-12">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" onClick={closeAppt}>
            <ChevronLeft className="size-4" />
            กลับไปคิวผู้ป่วย
            <span className="ml-1 text-[10px] text-muted-foreground">· Back to queue</span>
          </Button>
          {appointment ? (
            <span className="text-xs text-muted-foreground">
              กำลังปรึกษา · {appointment.patient} · {appointment.time}
            </span>
          ) : null}
          {queueRemaining > 0 ? (
            <span className="ml-auto inline-flex items-center rounded-full bg-mint-50 px-3 py-1 text-xs text-mint-800 ring-1 ring-mint-200">
              คิวรอ · {queueRemaining} ผู้ป่วย
            </span>
          ) : null}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {consultEnded ? (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <ConsultSummaryShell doctorName={doctorName} doctorSpecialty={doctorSpecialty} />
          </motion.div>
        ) : (
          <motion.div
            key="consult"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <ConsultPanel />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
