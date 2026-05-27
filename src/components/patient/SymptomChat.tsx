'use client';

import { useEffect, useState } from 'react';
import { Info, Loader2, Send, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/shared/GlassCard';
import { getPatientDemo } from '@/lib/data';
import { usePatientStore } from '@/stores/store-patient';

const CHIPS: Array<{ id: 'PD01' | 'PD02' | 'PD03'; emoji: string; label: string }> = [
  { id: 'PD01', emoji: '🤢', label: 'ปวดท้อง ท้องเสีย' },
  { id: 'PD02', emoji: '❤️', label: 'เจ็บหน้าอก' },
  { id: 'PD03', emoji: '🌡️', label: 'ปวดหัว เครียด' },
];

export function SymptomChat() {
  const symptomText = usePatientStore((s) => s.symptomText);
  const setSymptomText = usePatientStore((s) => s.setSymptomText);
  const submit = usePatientStore((s) => s.submitSymptom);
  const isTriaging = usePatientStore((s) => s.isTriaging);
  const triageError = usePatientStore((s) => s.triageError);
  const step = usePatientStore((s) => s.step);

  const disabled = isTriaging || step !== 'symptom';
  const [shake, setShake] = useState(false);

  // tiny visual cue when the user clicks a chip
  useEffect(() => {
    if (!shake) return;
    const t = setTimeout(() => setShake(false), 350);
    return () => clearTimeout(t);
  }, [shake]);

  const onSelectChip = (id: 'PD01' | 'PD02' | 'PD03') => {
    const demo = getPatientDemo(id);
    if (!demo) return;
    setSymptomText(demo.symptom_input);
    setShake(true);
  };

  const onSubmit = async () => {
    if (!symptomText.trim() || disabled) return;
    await submit();
  };

  return (
    <GlassCard>
      <div className="mb-3 flex items-center gap-2">
        <Stethoscope className="size-4 text-mint-700 dark:text-mint-400" />
        <h2 className="text-base font-semibold text-foreground md:text-lg">อาการของคุณเป็นอย่างไร</h2>
        <span className="text-xs text-muted-foreground">· How are you feeling?</span>
      </div>

      <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
        เล่าอาการทั้งหมดให้ละเอียดในข้อความเดียว — มีอาการอะไรบ้าง เป็นมานานแค่ไหน รุนแรงระดับใด
        และมีโรคประจำตัวหรือยาที่ใช้อยู่หรือไม่ เพื่อให้ AI สรุปและแนะนำขั้นตอนถัดไปได้แม่นยำ
        <span className="mt-0.5 block text-muted-foreground/70">
          · Tell us everything in one message — symptoms, how long, how severe, plus any conditions
          or medications — so our AI can summarize it and guide your next step.
        </span>
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        {CHIPS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelectChip(c.id)}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-sm text-foreground ring-1 ring-border/70 transition-all hover:bg-mint-50 dark:hover:bg-mint-500/10 hover:ring-mint-300 dark:hover:ring-mint-500/30 disabled:opacity-50"
          >
            <span>{c.emoji}</span>
            <span>{c.label}</span>
          </button>
        ))}
      </div>

      <div className="mb-3 flex gap-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-900 dark:text-amber-200 ring-1 ring-amber-200 dark:ring-amber-500/30">
        <Info className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
        <p>
          AI จะประเมินจากข้อความนี้เพียงครั้งเดียว ไม่มีถาม-ตอบเพิ่ม — โปรดเล่าอาการให้ครบในครั้งเดียว
          <span className="mt-0.5 block text-amber-700/80 dark:text-amber-300/80">
            The AI assesses this single message — there&apos;s no follow-up chat, so include
            everything.
          </span>
        </p>
      </div>

      <div
        className={`relative ${shake ? 'animate-pulse' : ''}`}
      >
        <label htmlFor="symptom-input" className="sr-only">
          อาการของคุณ · Describe your symptoms
        </label>
        <textarea
          id="symptom-input"
          value={symptomText}
          onChange={(e) => setSymptomText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              onSubmit();
            }
          }}
          rows={3}
          maxLength={4000}
          disabled={disabled}
          placeholder="พิมพ์อาการทั้งหมดให้ละเอียด... เช่น ปวดหัวตุบ ๆ มา 2 วัน คลื่นไส้ มีไข้ต่ำ ๆ กินยาพาราแล้วไม่ดีขึ้น มีโรคประจำตัวความดัน"
          className="w-full resize-none rounded-xl border border-border/70 bg-white/80 dark:bg-slate-800/60 px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-mint-400 focus:ring-2 focus:ring-mint-200/50 disabled:opacity-60"
        />
      </div>

      {triageError ? (
        <div className="mt-2 rounded-md bg-triage-red/10 px-3 py-1.5 text-[11px] text-triage-red ring-1 ring-triage-red/30">
          ⚠ ประเมินอาการล้มเหลว: {triageError}
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="text-[11px] text-muted-foreground">
          {step === 'symptom'
            ? 'AI จะช่วยประเมินระดับความรุนแรงและแนะนำขั้นตอนถัดไป'
            : 'กดปุ่ม "ลองอาการอื่น" ด้านบนเพื่อเริ่มใหม่'}
        </div>
        <Button onClick={onSubmit} disabled={!symptomText.trim() || disabled}>
          {isTriaging ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              กำลังประเมิน…
            </>
          ) : (
            <>
              <Send className="size-3.5" />
              ส่ง
            </>
          )}
        </Button>
      </div>
    </GlassCard>
  );
}
