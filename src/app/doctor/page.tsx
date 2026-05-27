'use client';

import { useEffect } from 'react';
import { RoleHeader } from '@/components/shared/RoleHeader';
import { DoctorPageBody } from '@/components/doctor/DoctorPageBody';
import { DoctorPersonaPicker } from '@/components/doctor/DoctorPersonaPicker';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import {
  getDemandForDoctor,
  getDoctor,
  getDoctorDemo,
  getNoShow,
  getSegments,
  type NoShowPrediction,
} from '@/lib/data';
import { useDoctorStore } from '@/stores/store-doctor';
import { useAppointmentStore } from '@/stores/store-appointments';

/** How many rows the doctor sees in the queue at once. The full pool
 *  (today + standby) is larger; we slice down so finished consults are
 *  visibly replaced by stand-by patients sliding in. */
const QUEUE_SIZE = 3;

export default function DoctorPage() {
  const doctorId = useDoctorStore((s) => s.doctorId);
  const consumedApptIds = useDoctorStore((s) => s.consumedApptIds);
  const hydrate = useDoctorStore((s) => s.hydrateDoctorId);
  const clear = useDoctorStore((s) => s.clearDoctorId);
  const hydrateAppointments = useAppointmentStore((s) => s.hydrate);

  // Restore the previously-selected persona on first paint. Without this, a
  // page reload always drops back to the picker even when the user already
  // chose a persona in this session. Also hydrate the shared appointment ledger
  // so AppointmentsCard can show scheduled follow-ups.
  useEffect(() => {
    hydrate();
    hydrateAppointments();
  }, [hydrate, hydrateAppointments]);

  if (!doctorId) {
    return (
      <>
        <RoleHeader title="แพทย์ · Doctor" subtitle="กรุณาเลือกบัญชีก่อนเริ่มใช้งาน" />
        <main className="mx-auto w-full max-w-6xl flex-1">
          <DoctorPersonaPicker />
        </main>
      </>
    );
  }

  const doctor = getDoctor(doctorId);
  const demo = getDoctorDemo(doctorId);
  // Each doctor inherits its specialty's pooled demand forecast (4 GPs share
  // one GP forecast, etc.); falls back to GP/DD01 only if the specialty is missing.
  const forecast = getDemandForDoctor(doctorId);

  if (!doctor || !demo || !forecast) {
    return (
      <>
        <RoleHeader title="แพทย์ · Doctor" subtitle="ไม่พบข้อมูลบัญชีนี้" />
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 md:px-12">
          <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
            ข้อมูลของบัญชี {doctorId} ยังไม่พร้อมใช้งาน — กรุณาเลือกบัญชีใหม่
          </div>
          <Button size="sm" variant="ghost" onClick={clear} className="mt-3">
            <RotateCcw className="size-3.5" />
            เปลี่ยนบัญชี · Switch
          </Button>
        </main>
      </>
    );
  }

  // Visible queue = (today + standby) − already-consulted, capped to QUEUE_SIZE.
  // When the doctor finishes a consult, closeAppt adds the appt_id to the
  // consumed set; the next render drops it and the next standby slides in.
  const pool = [...demo.today_appointments, ...(demo.standby_appointments ?? [])];
  const visibleAppointments = pool
    .filter((a) => !consumedApptIds.has(a.appt_id))
    .slice(0, QUEUE_SIZE);

  const predictions: Record<string, NoShowPrediction> = {};
  for (const appt of visibleAppointments) {
    const ns = getNoShow(appt.prediction_id);
    if (ns) predictions[appt.prediction_id] = ns;
  }

  const segments = getSegments();

  return (
    <>
      <RoleHeader
        title="แพทย์ · Doctor"
        subtitle={`${doctor.name} · ${doctor.specialty_th}`}
        actions={
          <Button size="sm" variant="ghost" onClick={clear}>
            <RotateCcw className="size-3.5" />
            เปลี่ยนบัญชี
          </Button>
        }
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-6 md:px-12 md:py-8">
        <DoctorPageBody
          doctorId={doctor.id}
          doctorName={doctor.name}
          doctorSpecialty={doctor.specialty_th}
          appointments={visibleAppointments}
          predictions={predictions}
          forecast={forecast}
          segments={segments}
        />
      </main>
    </>
  );
}
