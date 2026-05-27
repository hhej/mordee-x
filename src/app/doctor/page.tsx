'use client';

import { useEffect, useState } from 'react';
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
  specialtySlug,
  type DemandForecast,
  type NoShowPrediction,
  type PatientSegmentsData,
} from '@/lib/data';
import { useDoctorStore } from '@/stores/store-doctor';
import { useAppointmentStore } from '@/stores/store-appointments';

/** How many rows the doctor sees in the queue at once. The full pool
 *  (today + standby) is larger; we slice down so finished consults are
 *  visibly replaced by stand-by patients sliding in. */
const QUEUE_SIZE = 3;

/** ML pulled live from the DB-backed /api/predict, tagged with the doctor it
 *  belongs to so a persona switch can't briefly show the previous doctor's data. */
type MlFromDb = {
  forDoctor: string;
  forecast?: DemandForecast;
  predictions: Record<string, NoShowPrediction>;
  segments?: PatientSegmentsData;
};

export default function DoctorPage() {
  const doctorId = useDoctorStore((s) => s.doctorId);
  const consumedApptIds = useDoctorStore((s) => s.consumedApptIds);
  const hydrate = useDoctorStore((s) => s.hydrateDoctorId);
  const clear = useDoctorStore((s) => s.clearDoctorId);
  const hydrateAppointments = useAppointmentStore((s) => s.hydrate);
  const [mlFromDb, setMlFromDb] = useState<MlFromDb | null>(null);

  // Restore the previously-selected persona on first paint. Without this, a
  // page reload always drops back to the picker even when the user already
  // chose a persona in this session. Also hydrate the shared appointment ledger
  // so AppointmentsCard can show scheduled follow-ups.
  useEffect(() => {
    hydrate();
    hydrateAppointments();
  }, [hydrate, hydrateAppointments]);

  // Synchronous lookups from the bundled JSON. These render instantly and serve
  // as the fallback whenever the DB fetch below hasn't landed (or failed).
  const doctor = doctorId ? getDoctor(doctorId) : undefined;
  const demo = doctorId ? getDoctorDemo(doctorId) : undefined;
  // Each doctor inherits its specialty's pooled demand forecast (4 GPs share
  // one GP forecast, etc.); falls back to GP/DD01 only if the specialty is missing.
  const forecastFallback = doctorId ? getDemandForDoctor(doctorId) : undefined;

  // Visible queue = (today + standby) − already-consulted, capped to QUEUE_SIZE.
  // When the doctor finishes a consult, closeAppt adds the appt_id to the
  // consumed set; the next render drops it and the next standby slides in.
  const pool = demo ? [...demo.today_appointments, ...(demo.standby_appointments ?? [])] : [];
  const visibleAppointments = pool
    .filter((a) => !consumedApptIds.has(a.appt_id))
    .slice(0, QUEUE_SIZE);
  const predictionIds = visibleAppointments.map((a) => a.prediction_id);
  const predictionIdsKey = predictionIds.join(',');

  // Step 5 — pull the dashboard's ML (demand forecast, no-show risk, patient
  // segments) from the DB-backed /api/predict (Neon + pgvector). Each fetch is
  // independent; a failure just leaves that card on its JSON fallback, so the
  // demo can never break. Re-runs when the doctor or the visible queue changes.
  useEffect(() => {
    if (!doctorId) return;
    const doc = getDoctor(doctorId);
    if (!doc) return;
    const ids = predictionIdsKey ? predictionIdsKey.split(',') : [];
    let cancelled = false;

    (async () => {
      const slug = specialtySlug(doc.specialty);
      const [demandRes, segRes, ...nsResults] = await Promise.allSettled([
        fetch(`/api/predict?type=demand&id=${encodeURIComponent(slug)}`),
        fetch('/api/predict?type=segments'),
        ...ids.map((id) => fetch(`/api/predict?type=no_show&id=${encodeURIComponent(id)}`)),
      ]);

      const next: MlFromDb = { forDoctor: doctorId, predictions: {} };
      if (demandRes.status === 'fulfilled' && demandRes.value.ok) {
        next.forecast = (await demandRes.value.json()) as DemandForecast;
      }
      if (segRes.status === 'fulfilled' && segRes.value.ok) {
        next.segments = (await segRes.value.json()) as PatientSegmentsData;
      }
      await Promise.all(
        nsResults.map(async (r, i) => {
          if (r.status === 'fulfilled' && r.value.ok) {
            next.predictions[ids[i]] = (await r.value.json()) as NoShowPrediction;
          }
        }),
      );
      if (!cancelled) setMlFromDb(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [doctorId, predictionIdsKey]);

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

  if (!doctor || !demo || !forecastFallback) {
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

  // DB values win; the synchronous JSON fills any gap (and applies only to the
  // current doctor — a stale fetch from a previous persona is ignored).
  const fromDb = mlFromDb?.forDoctor === doctorId ? mlFromDb : null;

  const predictions: Record<string, NoShowPrediction> = {};
  for (const appt of visibleAppointments) {
    const ns = getNoShow(appt.prediction_id);
    if (ns) predictions[appt.prediction_id] = ns;
  }
  Object.assign(predictions, fromDb?.predictions ?? {});

  const forecast = fromDb?.forecast ?? forecastFallback;
  const segments = fromDb?.segments ?? getSegments();

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
