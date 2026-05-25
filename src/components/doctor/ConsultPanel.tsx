'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Loader2, MessageCircle, Pill, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/shared/GlassCard';
import { ChatStream } from '@/components/shared/ChatStream';
import { useDoctorStore } from '@/stores/store-doctor';
import { buildPrescriptionThai } from '@/lib/prescription';
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
  const inputText = useDoctorStore((s) => s.inputText);
  const setInputText = useDoctorStore((s) => s.setInputText);
  const sendDoctorMessage = useDoctorStore((s) => s.sendDoctorMessage);
  const closeAppt = useDoctorStore((s) => s.closeAppt);
  const endConsult = useDoctorStore((s) => s.endConsult);

  const suggestedRx = appointment?.cached?.summary
    ? buildPrescriptionThai(appointment.cached.summary)
    : null;
  const medCount = appointment?.cached?.summary?.self_care_plan.medications.length ?? 0;

  return (
    <AnimatePresence>
      {selectedApptId && appointment?.cached ? (
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
                <PatientBrief brief={appointment.cached.brief} patientName={appointment.patient} />
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
                  suggestedRx
                    ? {
                        label: medCount > 0 ? `ใส่คำสั่งยา (${medCount} ตัว)` : 'ใส่คำแนะนำการดูแล',
                        value: suggestedRx,
                        icon: <Pill className="size-3" />,
                      }
                    : null
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
