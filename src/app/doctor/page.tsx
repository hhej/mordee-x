import { RoleHeader } from '@/components/shared/RoleHeader';
import { AppointmentsCard } from '@/components/doctor/AppointmentsCard';
import { ConsultPanel } from '@/components/doctor/ConsultPanel';
import { ConsultSummaryShell } from '@/components/doctor/ConsultSummaryShell';
import { DemandForecastCard } from '@/components/doctor/DemandForecastCard';
import {
  getDemand,
  getDemoScenarios,
  getDoctor,
  getNoShow,
  type NoShowPrediction,
} from '@/lib/data';

export default function DoctorPage() {
  const demo = getDemoScenarios().doctor_demo;
  const doctor = getDoctor(demo.doctor_id);
  const forecast = getDemand(demo.id);

  if (!doctor) throw new Error(`Doctor ${demo.doctor_id} not found`);
  if (!forecast) throw new Error(`Demand forecast ${demo.id} not found`);

  const predictions: Record<string, NoShowPrediction> = {};
  for (const appt of demo.today_appointments) {
    const ns = getNoShow(appt.prediction_id);
    if (ns) predictions[appt.prediction_id] = ns;
  }

  return (
    <>
      <RoleHeader title="แพทย์ · Doctor" subtitle={`${doctor.name} · ${doctor.specialty_th}`} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-6 md:px-12 md:py-8">
        <div className="flex flex-col gap-5">
          <DemandForecastCard forecast={forecast} />
          <AppointmentsCard
            appointments={demo.today_appointments}
            predictions={predictions}
            doctorId={doctor.id}
          />
          <ConsultPanel />
          <ConsultSummaryShell doctorName={doctor.name} doctorSpecialty={doctor.specialty_th} />
        </div>
      </main>
    </>
  );
}
