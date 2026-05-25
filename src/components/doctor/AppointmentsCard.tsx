'use client';

import { CalendarDays } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { useNow } from '@/lib/use-now';
import type { DoctorAppointment, NoShowPrediction } from '@/lib/data';
import { AppointmentRow } from './AppointmentRow';

interface AppointmentsCardProps {
  appointments: DoctorAppointment[];
  predictions: Record<string, NoShowPrediction>;
  doctorId: string;
}

export function AppointmentsCard({ appointments, predictions, doctorId }: AppointmentsCardProps) {
  // Single ticker for the whole card; each row receives `now` so we don't spin
  // up N timers. useNow returns null during SSR, so rows skip the relative-time
  // chip until the first client tick — keeps hydration clean.
  const now = useNow();

  const todayLabel = now
    ? now.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' })
    : '';

  return (
    <GlassCard>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-mint-700" />
          <h2 className="text-base font-semibold text-ink md:text-lg">นัดหมายวันนี้</h2>
          <span className="text-xs text-muted-foreground">Today’s appointments</span>
          {todayLabel ? (
            <span className="ml-1 hidden text-[11px] text-mint-700 md:inline">· {todayLabel}</span>
          ) : null}
        </div>
        <div className="text-xs text-muted-foreground">{appointments.length} ราย</div>
      </div>
      <div className="flex flex-col gap-2.5">
        {appointments.map((appt) => {
          const prediction = predictions[appt.prediction_id];
          if (!prediction) return null;
          return (
            <AppointmentRow
              key={appt.appt_id}
              appointment={appt}
              prediction={prediction}
              doctorId={doctorId}
              now={now}
            />
          );
        })}
      </div>
    </GlassCard>
  );
}
