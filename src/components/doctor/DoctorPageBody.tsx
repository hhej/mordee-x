'use client';

import { useDoctorStore } from '@/stores/store-doctor';
import { useSessionAnchor } from '@/lib/use-now';
import { rebaseAppointments } from '@/lib/appointment-times';
import type { DemandForecast, DoctorAppointment, NoShowPrediction } from '@/lib/data';
import { AppointmentsCard } from './AppointmentsCard';
import { DemandForecastCard } from './DemandForecastCard';
import { ConsultTakeover } from './ConsultTakeover';

interface DoctorPageBodyProps {
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  appointments: DoctorAppointment[];
  predictions: Record<string, NoShowPrediction>;
  forecast: DemandForecast;
}

export function DoctorPageBody({
  doctorId,
  doctorName,
  doctorSpecialty,
  appointments,
  predictions,
  forecast,
}: DoctorPageBodyProps) {
  const selectedApptId = useDoctorStore((s) => s.selectedApptId);
  const inConsult = selectedApptId !== null;

  // Rebase the static JSON times onto the live wall clock so the queue always
  // straddles "now" on demo day. `anchor` is null during SSR + first paint
  // (falls back to JSON times → no hydration mismatch), then fixed thereafter
  // so the relative-time chips count down without the displayed HH:MM drifting.
  const anchor = useSessionAnchor();
  const appts = anchor ? rebaseAppointments(appointments, anchor) : appointments;

  if (inConsult) {
    return (
      <ConsultTakeover
        appointments={appts}
        doctorName={doctorName}
        doctorSpecialty={doctorSpecialty}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <AppointmentsCard
        appointments={appts}
        predictions={predictions}
        doctorId={doctorId}
      />
      <DemandForecastCard forecast={forecast} />
    </div>
  );
}
