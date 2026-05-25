'use client';

import { useEffect } from 'react';
import { RoleHeader } from '@/components/shared/RoleHeader';
import { DoctorPageBody } from '@/components/doctor/DoctorPageBody';
import { DoctorPersonaPicker } from '@/components/doctor/DoctorPersonaPicker';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import {
  getDemand,
  getDoctor,
  getDoctorDemo,
  getNoShow,
  type NoShowPrediction,
} from '@/lib/data';
import { useDoctorStore } from '@/stores/store-doctor';

export default function DoctorPage() {
  const doctorId = useDoctorStore((s) => s.doctorId);
  const hydrate = useDoctorStore((s) => s.hydrateDoctorId);
  const clear = useDoctorStore((s) => s.clearDoctorId);

  // Restore the previously-selected persona on first paint. Without this, a
  // page reload always drops back to the picker even when the user already
  // chose a persona in this session.
  useEffect(() => {
    hydrate();
  }, [hydrate]);

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
  // Fallback to D001's demand forecast for personas without their own — keeps
  // the demand-forecast card populated visually even though it's per-D001.
  const forecast = (demo ? getDemand(demo.id) : null) ?? getDemand('DD01');

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

  const predictions: Record<string, NoShowPrediction> = {};
  for (const appt of demo.today_appointments) {
    const ns = getNoShow(appt.prediction_id);
    if (ns) predictions[appt.prediction_id] = ns;
  }

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
          appointments={demo.today_appointments}
          predictions={predictions}
          forecast={forecast}
        />
      </main>
    </>
  );
}
