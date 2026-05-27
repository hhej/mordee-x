'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { CheckupUpsell } from '@/components/patient/CheckupUpsell';
import { ScheduledConfirmationCard } from '@/components/patient/ScheduledConfirmationCard';
import { UpcomingAppointmentsCard } from '@/components/patient/UpcomingAppointmentsCard';
import { MyAppointmentsButton } from '@/components/patient/MyAppointmentsButton';
import { StepPill } from '@/components/patient/StepPill';
import { PatientPersonaPicker } from '@/components/patient/PatientPersonaPicker';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { getDoctor, getSpecialtyTh } from '@/lib/data';
import { usePatientStore } from '@/stores/store-patient';
import { useAppointmentStore } from '@/stores/store-appointments';
import type { TriageResult } from '@/lib/llm/schemas';

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: 'easeOut' as const },
};

const expandTransition = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto' as const },
  exit: { opacity: 0, height: 0 },
  transition: { duration: 0.2, ease: 'easeOut' as const },
};

const TRIAGE_PILL: Record<TriageResult['triage'], { emoji: string; label: string }> = {
  green: { emoji: '🟢', label: 'ดูแลตัวเองได้' },
  yellow: { emoji: '🟡', label: 'ควรปรึกษาแพทย์' },
  red: { emoji: '🔴', label: 'อาการฉุกเฉิน' },
};

function truncate(s: string, n: number): string {
  const t = s.trim();
  return t.length <= n ? t : t.slice(0, n).trimEnd() + '…';
}

function formatSlotShort(iso: string): string {
  return new Date(iso).toLocaleString('th-TH', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PatientPage() {
  const persona = usePatientStore((s) => s.persona);
  const personaPicked = usePatientStore((s) => s.personaPicked);
  const clearPersona = usePatientStore((s) => s.clearPersona);
  const hydratePersona = usePatientStore((s) => s.hydratePersona);
  const hydrateAppointments = useAppointmentStore((s) => s.hydrate);
  const step = usePatientStore((s) => s.step);
  const triage = usePatientStore((s) => s.triage);
  const summary = usePatientStore((s) => s.summary);
  const isSummarizing = usePatientStore((s) => s.isSummarizing);
  const summaryError = usePatientStore((s) => s.summaryError);
  const consultEnded = usePatientStore((s) => s.consultEnded);
  const selectedDoctorId = usePatientStore((s) => s.selectedDoctorId);
  const bookingSlot = usePatientStore((s) => s.bookingSlot);
  const endConsult = usePatientStore((s) => s.endConsult);
  const symptomText = usePatientStore((s) => s.symptomText);
  const expandedPill = usePatientStore((s) => s.expandedPill);
  const toggleExpand = usePatientStore((s) => s.toggleExpand);

  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    hydratePersona();
    hydrateAppointments();
  }, [hydratePersona, hydrateAppointments]);

  useEffect(() => {
    if (consultEnded && summaryRef.current) {
      const t = setTimeout(
        () => summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        80,
      );
      return () => clearTimeout(t);
    }
  }, [consultEnded]);

  if (!personaPicked) {
    return (
      <>
        <RoleHeader title="ผู้ป่วย · Patient" subtitle="กรุณาเลือกบทบาทก่อนเริ่ม" />
        <main className="mx-auto w-full max-w-6xl flex-1">
          <PatientPersonaPicker />
        </main>
      </>
    );
  }

  const selectedDoctor = selectedDoctorId ? getDoctor(selectedDoctorId) : undefined;
  const trimmedSymptom = symptomText.trim();
  const showSymptomPill = step !== 'symptom' && trimmedSymptom.length > 0;
  const showInteractivePills =
    step === 'consult' || step === 'summary' || step === 'scheduledConfirmed';
  const showTriagePill = showInteractivePills && triage !== null;
  const showDoctorPill = showInteractivePills && selectedDoctor !== undefined;
  const showPillStack = showSymptomPill || showTriagePill || showDoctorPill;

  return (
    <>
      <RoleHeader
        title="ผู้ป่วย · Patient"
        subtitle={persona.name}
        actions={
          <>
            <MyAppointmentsButton />
            <PatientPersonaPopover />
            <Button size="sm" variant="ghost" onClick={clearPersona} title="เปลี่ยนบทบาท">
              <RotateCcw className="size-3.5" />
              เปลี่ยนบทบาท
            </Button>
            <ResetButton />
          </>
        }
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-6 md:px-12 md:py-8">
        <div className="flex flex-col gap-5">
          {/* === Pill stack — vertical at the top of the scroll === */}
          {showPillStack ? (
            <motion.section {...fadeUp} key="pill-stack">
              <div className="flex flex-col gap-2">
                {showSymptomPill ? (
                  <StepPill
                    icon="✓"
                    label={truncate(trimmedSymptom, 40)}
                    tooltip="ต้องการแก้ไข? กด Reset ที่มุมบนเพื่อเริ่มใหม่"
                  />
                ) : null}

                {showTriagePill && triage ? (
                  <div className="flex flex-col gap-2">
                    <StepPill
                      icon={TRIAGE_PILL[triage.triage].emoji}
                      label={TRIAGE_PILL[triage.triage].label}
                      detail={triage.specialty_hint ? getSpecialtyTh(triage.specialty_hint) : undefined}
                      expanded={expandedPill === 'triage'}
                      onToggle={() => toggleExpand('triage')}
                    />
                    <AnimatePresence initial={false}>
                      {expandedPill === 'triage' ? (
                        <motion.div
                          key="triage-expand"
                          {...expandTransition}
                          className="overflow-hidden"
                        >
                          <div className="pt-1">
                            <TriageResultCard triage={triage} />
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                ) : null}

                {showDoctorPill && selectedDoctor ? (
                  <div className="flex flex-col gap-2">
                    <StepPill
                      icon="👨‍⚕️"
                      label={selectedDoctor.name}
                      detail={
                        step === 'scheduledConfirmed' && bookingSlot
                          ? formatSlotShort(bookingSlot)
                          : `${selectedDoctor.price}฿`
                      }
                      expanded={expandedPill === 'doctor'}
                      onToggle={() => toggleExpand('doctor')}
                    />
                    <AnimatePresence initial={false}>
                      {expandedPill === 'doctor' ? (
                        <motion.div
                          key="doctor-expand"
                          {...expandTransition}
                          className="overflow-hidden"
                        >
                          <div className="pt-1">
                            <DoctorMatchList selectedDoctorOnly />
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                ) : null}
              </div>
            </motion.section>
          ) : null}

          {/* === Active surface(s) by step === */}
          {step === 'symptom' ? (
            <motion.section {...fadeUp} key="hero">
              <div className="flex flex-col gap-4">
                <UpcomingAppointmentsCard />
                <SymptomChat />
                <div className="flex items-center gap-3 px-1" aria-hidden>
                  <div className="h-px flex-1 bg-line/60" />
                  <span className="whitespace-nowrap text-xs text-muted-foreground">
                    หรือข้ามไปปรึกษาทันที · or skip to instant consult
                  </span>
                  <div className="h-px flex-1 bg-line/60" />
                </div>
                <InstantConsultCard />
              </div>
            </motion.section>
          ) : null}

          {step === 'doctorList' && triage ? (
            <motion.section {...fadeUp} key="triage-full">
              <TriageResultCard triage={triage} />
            </motion.section>
          ) : null}

          {step === 'doctorList' ? (
            <motion.section {...fadeUp} key="match">
              <DoctorMatchList defaultExpandAll={triage === null} />
            </motion.section>
          ) : null}

          {step === 'hospital' && triage ? (
            <motion.section {...fadeUp} key="triage-strip">
              <TriageResultCard triage={triage} variant="strip" />
            </motion.section>
          ) : null}

          {step === 'hospital' ? (
            <motion.section {...fadeUp} key="hospital">
              <HospitalListCard />
            </motion.section>
          ) : null}

          {step === 'scheduledConfirmed' && selectedDoctor && bookingSlot ? (
            <motion.section {...fadeUp} key="scheduled-confirmed">
              <ScheduledConfirmationCard doctor={selectedDoctor} slotIso={bookingSlot} />
            </motion.section>
          ) : null}

          <PatientConsultPanel />

          {consultEnded && selectedDoctor ? (
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
                renderCheckupUpsell={() => <CheckupUpsell />}
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
