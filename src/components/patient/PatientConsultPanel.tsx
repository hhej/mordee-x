'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Loader2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/shared/GlassCard';
import { ChatStream } from '@/components/shared/ChatStream';
import { DoctorAvatar } from '@/components/shared/DoctorAvatar';
import { getDoctor } from '@/lib/data';
import { usePatientStore } from '@/stores/store-patient';

export function PatientConsultPanel() {
  const step = usePatientStore((s) => s.step);
  const doctorId = usePatientStore((s) => s.selectedDoctorId);
  const persona = usePatientStore((s) => s.persona);
  const consultMessages = usePatientStore((s) => s.consultMessages);
  const isStreaming = usePatientStore((s) => s.isStreaming);
  const consultEnded = usePatientStore((s) => s.consultEnded);
  const streamError = usePatientStore((s) => s.streamError);
  const inputText = usePatientStore((s) => s.inputText);
  const setInputText = usePatientStore((s) => s.setInputText);
  const sendPatientMessage = usePatientStore((s) => s.sendPatientMessage);
  const kickoff = usePatientStore((s) => s.kickoffConsult);
  const endConsult = usePatientStore((s) => s.endConsult);
  const isSummarizing = usePatientStore((s) => s.isSummarizing);
  const ref = useRef<HTMLDivElement>(null);
  const kickedRef = useRef(false);

  const visible = step === 'consult' || step === 'summary';
  const doctor = doctorId ? getDoctor(doctorId) : undefined;

  useEffect(() => {
    if (step !== 'consult') {
      kickedRef.current = false;
      return;
    }
    if (kickedRef.current) return;
    kickedRef.current = true;
    void kickoff();
  }, [step, kickoff]);

  useEffect(() => {
    if (visible && ref.current) {
      setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    }
  }, [visible]);

  if (!visible || !doctor) return null;

  const doctorParticle = doctor.gender === 'F' ? 'ค่ะ' : 'ครับ';
  const patientParticle = persona.gender === 'F' ? 'ค่ะ' : 'ครับ';
  const inputPlaceholder = `พิมพ์ข้อความถึงคุณหมอ… (${patientParticle})`;

  return (
    <AnimatePresence>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <GlassCard className="border border-mint-200/60 bg-white/70 dark:bg-slate-800/60">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="size-4 text-mint-700 dark:text-mint-400" />
              <h2 className="text-base font-semibold text-foreground md:text-lg">ห้องปรึกษา</h2>
            </div>
            <div className="flex items-center gap-2">
              <DoctorAvatar doctor={doctor} size={28} className="rounded-full" />
              <div className="text-right">
                <div className="text-xs font-medium text-foreground">{doctor.name}</div>
                <div className="text-[10px] text-muted-foreground">{doctor.specialty_th}</div>
              </div>
            </div>
          </div>

          <ChatStream
            messages={consultMessages}
            seededGreeting={null}
            isStreaming={isStreaming}
            consultEnded={consultEnded}
            streamError={streamError}
            inputText={inputText}
            setInputText={setInputText}
            onSend={sendPatientMessage}
            userLabel={persona.name}
            assistantLabel={doctor.name}
            inputPlaceholder={inputPlaceholder}
            emptyHint={`กำลังเชื่อมต่อกับคุณหมอ${doctorParticle}…`}
          />

          <div className="mt-4 flex items-center justify-between gap-2">
            <div className="text-[11px] text-muted-foreground">
              {consultMessages.length === 0
                ? 'คุณหมอกำลังทักทาย…'
                : `${consultMessages.filter((m) => m.role === 'user').length} ข้อความจากคุณ`}
            </div>
            {consultEnded ? (
              <div className="inline-flex items-center gap-1.5 rounded-md bg-mint-50 dark:bg-mint-500/10 px-3 py-1.5 text-xs text-mint-800 dark:text-mint-200">
                <CheckCircle2 className="size-3.5" />
                ปรึกษาเสร็จสิ้น — ดูสรุปด้านล่าง
              </div>
            ) : (
              <Button
                onClick={() => endConsult()}
                variant="default"
                disabled={
                  isStreaming ||
                  isSummarizing ||
                  consultMessages.filter((m) => m.role === 'user').length < 2
                }
                title={
                  consultMessages.filter((m) => m.role === 'user').length < 2
                    ? 'แชทกับคุณหมอก่อนสักครู่'
                    : undefined
                }
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
    </AnimatePresence>
  );
}
