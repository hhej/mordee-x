'use client';

import { useDoctorStore } from '@/stores/store-doctor';
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

  if (inConsult) {
    return (
      <ConsultTakeover
        appointments={appointments}
        doctorName={doctorName}
        doctorSpecialty={doctorSpecialty}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <DemandForecastCard forecast={forecast} />
      <AppointmentsCard
        appointments={appointments}
        predictions={predictions}
        doctorId={doctorId}
      />
    </div>
  );
}
