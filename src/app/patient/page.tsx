'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { RoleHeader } from '@/components/shared/RoleHeader';
import { ConsultSummary } from '@/components/shared/ConsultSummary';
import { PatientPersonaPopover } from '@/components/patient/PatientPersonaPopover';
import { ResetButton } from '@/components/patient/ResetButton';
import { SymptomChat } from '@/components/patient/SymptomChat';
import { InstantConsultCard } from '@/components/patient/InstantConsultCard';
import { TriageResultCard } from '@/components/patient/TriageResultCard';
import { HospitalListCard } from '@/components/patient/HospitalListCard';
import { DoctorMatchList } from '@/components/patient/DoctorMatchList';
import { PatientConsultPanel } from '@/components/patient/PatientConsultPanel';
import { BookingDialog } from '@/components/patient/BookingDialog';
import { MockPaymentDialog } from '@/components/patient/MockPaymentDialog';
import { FollowupCallout } from '@/components/patient/FollowupCallout';
import { ScheduledConfirmationCard } from '@/components/patient/ScheduledConfirmationCard';
import { getDoctor } from '@/lib/data';
import { usePatientStore } from '@/stores/store-patient';

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: 'easeOut' as const },
};

export default function PatientPage() {
  const persona = usePatientStore((s) => s.persona);
  const hydratePersona = usePatientStore((s) => s.hydratePersona);
  const step = usePatientStore((s) => s.step);
  const triage = usePatientStore((s) => s.triage);
  const summary = usePatientStore((s) => s.summary);
  const isSummarizing = usePatientStore((s) => s.isSummarizing);
  const summaryError = usePatientStore((s) => s.summaryError);
  const consultEnded = usePatientStore((s) => s.consultEnded);
  const selectedDoctorId = usePatientStore((s) => s.selectedDoctorId);
  const bookingSlot = usePatientStore((s) => s.bookingSlot);
  const endConsult = usePatientStore((s) => s.endConsult);

  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    hydratePersona();
  }, [hydratePersona]);

  useEffect(() => {
    if (consultEnded && summaryRef.current) {
      const t = setTimeout(
        () => summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        80,
      );
      return () => clearTimeout(t);
    }
  }, [consultEnded]);

  const selectedDoctor = selectedDoctorId ? getDoctor(selectedDoctorId) : undefined;
  const showHero = step === 'symptom';
  const showTriage = triage !== null && step !== 'symptom' && step !== 'scheduledConfirmed';
  const showHospital = step === 'hospital';
  const showScheduledConfirmed = step === 'scheduledConfirmed';
  const showFlow =
    step === 'doctorList' || step === 'consult' || step === 'summary';
  const showSummary = consultEnded;

  return (
    <>
      <RoleHeader
        title="ผู้ป่วย · Patient"
        subtitle={persona.name}
        actions={
          <>
            <PatientPersonaPopover />
            <ResetButton />
          </>
        }
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-6 md:px-12 md:py-8">
        <div className="flex flex-col gap-5">
          {showHero ? (
            <motion.section {...fadeUp} key="hero">
              <div className="grid gap-5 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <SymptomChat />
                <InstantConsultCard />
              </div>
            </motion.section>
          ) : (
            <motion.section {...fadeUp} key="symptom-collapsed">
              <SymptomChat />
            </motion.section>
          )}

          {showTriage ? (
            <motion.section {...fadeUp} key="triage">
              <TriageResultCard triage={triage} />
            </motion.section>
          ) : null}

          {showHospital ? (
            <motion.section {...fadeUp} key="hospital">
              <HospitalListCard />
            </motion.section>
          ) : null}

          {showScheduledConfirmed && selectedDoctor && bookingSlot ? (
            <motion.section {...fadeUp} key="scheduled-confirmed">
              <ScheduledConfirmationCard doctor={selectedDoctor} slotIso={bookingSlot} />
            </motion.section>
          ) : null}

          {showFlow ? (
            <motion.section {...fadeUp} key="match">
              <DoctorMatchList defaultExpandAll={triage === null} />
            </motion.section>
          ) : null}

          <PatientConsultPanel />

          {showSummary && selectedDoctor ? (
            <motion.section {...fadeUp} key="summary" ref={summaryRef}>
              <ConsultSummary
                visible={Boolean(consultEnded && selectedDoctor)}
                isSummarizing={isSummarizing}
                summary={summary}
                summaryError={summaryError}
                patientName={persona.name}
                patientAge={persona.age}
                doctorName={selectedDoctor.name}
                doctorSpecialty={selectedDoctor.specialty_th}
                defaultTab="care"
                onRetry={endConsult}
                renderFollowup={({ daysFromNow, reason }) => (
                  <FollowupCallout daysFromNow={daysFromNow} reason={reason} />
                )}
              />
            </motion.section>
          ) : null}
        </div>
      </main>

      <BookingDialog />
      <MockPaymentDialog />
    </>
  );
}
