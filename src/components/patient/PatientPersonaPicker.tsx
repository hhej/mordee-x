'use client';

import { ArrowRight, UserRound } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { PATIENT_PERSONA_PRESETS, usePatientStore } from '@/stores/store-patient';

export function PatientPersonaPicker() {
  const pickPersona = usePatientStore((s) => s.pickPersona);

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12 md:px-12 md:py-16">
      <div className="text-center">
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-mint-100 text-mint-700">
          <UserRound className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold text-ink md:text-3xl">เลือกบทบาทผู้ป่วย</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a patient persona · ใช้สำหรับการสาธิต ปรับแก้ภายหลังได้
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PATIENT_PERSONA_PRESETS.map(({ id, persona, label_en }) => (
          <button
            key={id}
            type="button"
            onClick={() => pickPersona(persona)}
            className="group text-left"
            aria-label={`เลือกบทบาท ${persona.name}`}
          >
            <GlassCard className="flex h-full flex-col gap-2 p-5 transition-all group-hover:-translate-y-1 group-hover:shadow-lg">
              <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-mint-100 text-mint-700">
                <UserRound className="size-6" />
              </div>
              <div>
                <div className="text-base font-semibold text-ink">{persona.name}</div>
                <div className="text-[11px] text-muted-foreground">
                  อายุ {persona.age} ปี · {persona.gender === 'F' ? 'หญิง' : 'ชาย'}
                  <span className="ml-1 opacity-70">· {label_en}</span>
                </div>
              </div>

              <div className="mt-1 flex flex-col gap-1 text-[11px] text-muted-foreground">
                {persona.conditions.length ? (
                  <div>โรคประจำตัว: <span className="text-ink">{persona.conditions.join(', ')}</span></div>
                ) : (
                  <div className="text-muted-foreground/70">ไม่มีโรคประจำตัว</div>
                )}
                {persona.allergies.length ? (
                  <div>แพ้: <span className="text-ink">{persona.allergies.join(', ')}</span></div>
                ) : null}
              </div>

              <div className="mt-auto flex items-center justify-end border-t border-line/40 pt-3 text-[11px] font-medium text-mint-700">
                เริ่มใช้งาน
                <ArrowRight className="ml-1 h-3 w-3" />
              </div>
            </GlassCard>
          </button>
        ))}
      </div>

      <p className="text-center text-[11px] text-muted-foreground">
        เลือกแล้วสามารถแก้ไขประวัติเพิ่มเติมได้จากปุ่ม “บัญชี” บนหัวจอ ·
        Demo personas only — edit details after selecting.
      </p>
    </section>
  );
}
