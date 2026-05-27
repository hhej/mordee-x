'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Loader2, MessageCircle, Pill, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/shared/GlassCard';
import { ChatStream } from '@/components/shared/ChatStream';
import type { DoctorAppointment } from '@/lib/data';
import { TRIAGE_CHIP, TRIAGE_LABEL_TH } from '@/lib/triage';
import { useDoctorStore } from '@/stores/store-doctor';
import { buildPrescriptionThai, partsFromSummary } from '@/lib/prescription';
import { cn } from '@/lib/utils';
import { PatientBrief } from './PatientBrief';

export function ConsultPanel() {
  const selectedApptId = useDoctorStore((s) => s.selectedApptId);
  const appointment = useDoctorStore((s) => s.appointment);
  const consultEnded = useDoctorStore((s) => s.consultEnded);
  const isSummarizing = useDoctorStore((s) => s.isSummarizing);
  const isStreaming = useDoctorStore((s) => s.isStreaming);
  const consultMessages = useDoctorStore((s) => s.consultMessages);
  const seededGreeting = useDoctorStore((s) => s.seededGreeting);
  const streamError = useDoctorStore((s) => s.streamError);
  const liveBrief = useDoctorStore((s) => s.liveBrief);
  const isFetchingBrief = useDoctorStore((s) => s.isFetchingBrief);
  const briefError = useDoctorStore((s) => s.briefError);
  const inputText = useDoctorStore((s) => s.inputText);
  const setInputText = useDoctorStore((s) => s.setInputText);
  const sendDoctorMessage = useDoctorStore((s) => s.sendDoctorMessage);
  const closeAppt = useDoctorStore((s) => s.closeAppt);
  const endConsult = useDoctorStore((s) => s.endConsult);
  const isFetchingRx = useDoctorStore((s) => s.isFetchingRx);
  const fetchPrescription = useDoctorStore((s) => s.fetchPrescription);

  // D001 ships a pre-baked summary → insert its Rx instantly (no network).
  // Everyone else drafts live via /api/prescribe on click (with local fallback).
  const cachedSummary = appointment?.cached?.summary ?? null;
  const cachedRx = cachedSummary ? buildPrescriptionThai(partsFromSummary(cachedSummary)) : null;
  const cachedMedCount = cachedSummary?.self_care_plan.medications.length ?? 0;
  // D001 ships with a pre-baked brief; D003/D005 fetch live via /api/brief.
  // If both miss (network/route failure), we degrade to a profile-only panel.
  const resolvedBrief = appointment?.cached?.brief ?? liveBrief;

  return (
    <AnimatePresence>
      {selectedApptId && appointment ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <GlassCard className="border border-mint-200/60 bg-white/70">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="size-4 text-mint-700" />
                <h2 className="text-base font-semibold text-ink md:text-lg">ห้องปรึกษา</h2>
                <span className="text-xs text-muted-foreground">
                  · {appointment.patient} · {appointment.time}
                </span>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={closeAppt} aria-label="ปิด">
                <X className="size-4" />
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <div className="rounded-xl border border-line/60 bg-white/60 p-3 md:p-4">
                {resolvedBrief ? (
                  <PatientBrief brief={resolvedBrief} patientName={appointment.patient} />
                ) : isFetchingBrief ? (
                  <BriefSkeleton />
                ) : (
                  <BriefFallback appointment={appointment} reason={briefError} />
                )}
              </div>
              <ChatStream
                messages={consultMessages}
                seededGreeting={seededGreeting}
                isStreaming={isStreaming}
                consultEnded={consultEnded}
                streamError={streamError}
                inputText={inputText}
                setInputText={setInputText}
                onSend={sendDoctorMessage}
                userLabel="คุณหมอ"
                assistantLabel="คนไข้"
                inputPlaceholder="พิมพ์ข้อความถึงคนไข้…"
                emptyHint="เริ่มการสนทนาด้วยการพิมพ์คำทักทาย…"
                suggestedAction={
                  cachedSummary
                    ? {
                        label:
                          cachedMedCount > 0
                            ? `ใส่คำสั่งยา (${cachedMedCount} ตัว)`
                            : 'ใส่คำแนะนำการดูแล',
                        value: cachedRx ?? undefined,
                        icon: <Pill className="size-3" />,
                      }
                    : {
                        label: isFetchingRx ? 'กำลังร่างคำสั่งยา…' : 'ร่างคำสั่งยา · AI',
                        onAction: fetchPrescription,
                        loading: isFetchingRx,
                        icon: <Pill className="size-3" />,
                      }
                }
              />
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <div className="text-[11px] text-muted-foreground">
                {consultMessages.length === 0 && !consultEnded
                  ? 'แชทกับคนไข้สักครู่ก่อนกด "จบการปรึกษา" เพื่อให้ AI สรุปจากบทสนทนาจริง'
                  : `${consultMessages.filter((m) => m.role === 'user').length} ข้อความจากคุณหมอ`}
              </div>
              {consultEnded ? (
                <div className="inline-flex items-center gap-1.5 rounded-md bg-mint-50 px-3 py-1.5 text-xs text-mint-800">
                  <CheckCircle2 className="size-3.5" />
                  ปรึกษาเสร็จสิ้น — ดูสรุปด้านล่าง
                </div>
              ) : (
                <Button
                  onClick={() => endConsult()}
                  variant="default"
                  disabled={isStreaming || isSummarizing}
                >
                  {isSummarizing ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      กำลังสรุป…
                    </>
                  ) : (
                    'จบการปรึกษา · End consult'
                  )}
                </Button>
              )}
            </div>
          </GlassCard>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function BriefSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-label="กำลังวิเคราะห์อาการ">
      <div className="rounded-md bg-mint-50 px-2.5 py-1.5 text-[11px] text-mint-800 ring-1 ring-mint-200/60">
        AI กำลังวิเคราะห์อาการ ~5 วินาที · คุณหมอเริ่มแชทได้เลย
      </div>
      <div className="flex animate-pulse flex-col gap-3">
        <div className="h-3 w-32 rounded bg-mint-100" />
        <div className="h-4 w-full rounded bg-slate-100" />
        <div className="h-4 w-5/6 rounded bg-slate-100" />
        <div className="mt-2 h-3 w-24 rounded bg-mint-100" />
        <div className="flex flex-wrap gap-1.5">
          <div className="h-5 w-16 rounded-full bg-slate-100" />
          <div className="h-5 w-20 rounded-full bg-slate-100" />
          <div className="h-5 w-14 rounded-full bg-slate-100" />
        </div>
        <div className="mt-2 h-3 w-20 rounded bg-mint-100" />
        <div className="h-4 w-full rounded bg-slate-100" />
        <div className="h-4 w-4/6 rounded bg-slate-100" />
      </div>
    </div>
  );
}

function BriefFallback({
  appointment,
  reason,
}: {
  appointment: DoctorAppointment;
  reason: string | null;
}) {
  const profile = appointment.profile;
  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Patient · ข้อมูลคนไข้
        </div>
        <div className="mt-0.5 text-sm font-medium text-ink">{appointment.patient}</div>
        {profile ? (
          <div className="mt-0.5 text-xs text-muted-foreground">
            {profile.age} ปี · {profile.gender === 'female' ? 'หญิง' : 'ชาย'}
          </div>
        ) : null}
      </div>

      {profile ? (
        <div>
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1',
              TRIAGE_CHIP[profile.triage],
            )}
          >
            Triage · {TRIAGE_LABEL_TH[profile.triage]}
          </span>
        </div>
      ) : null}

      <div>
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          อาการ · Symptom
        </div>
        <p className="mt-1 text-sm text-ink">{appointment.symptom}</p>
      </div>

      {profile?.history ? (
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            ประวัติ · History
          </div>
          <p className="mt-1 text-sm text-ink">{profile.history}</p>
        </div>
      ) : null}

      <div className="rounded-md bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800 ring-1 ring-amber-200/60">
        ใช้ข้อมูลย่อ — สรุปอัตโนมัติไม่พร้อมใช้งาน
        {reason ? <span className="ml-1 text-amber-700/80">({reason})</span> : null}
      </div>
    </div>
  );
}
