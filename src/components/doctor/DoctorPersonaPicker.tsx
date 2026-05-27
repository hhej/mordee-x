'use client';

import { ArrowRight, Stethoscope } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { DoctorAvatar } from '@/components/shared/DoctorAvatar';
import { DOCTOR_PERSONA_IDS, getDoctor, getDoctorDemo } from '@/lib/data';
import { useDoctorStore } from '@/stores/store-doctor';

export function DoctorPersonaPicker() {
  const setDoctorId = useDoctorStore((s) => s.setDoctorId);

  const personas = DOCTOR_PERSONA_IDS.map((id) => {
    const doctor = getDoctor(id);
    const demo = getDoctorDemo(id);
    return doctor ? { doctor, queueSize: demo?.today_appointments.length ?? 0 } : null;
  }).filter((p): p is { doctor: ReturnType<typeof getDoctor> & object; queueSize: number } =>
    p !== null && p.doctor !== undefined,
  );

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12 md:px-12 md:py-16">
      <div className="text-center">
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-mint-100 dark:bg-mint-500/15 text-mint-700 dark:text-mint-400">
          <Stethoscope className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">เลือกบัญชีผู้ใช้</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Select doctor account · เลือกบทบาทแพทย์ที่ต้องการเข้าใช้งาน
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {personas.map(({ doctor, queueSize }) => (
          <button
            key={doctor.id}
            type="button"
            onClick={() => setDoctorId(doctor.id)}
            className="group text-left"
            aria-label={`เข้าใช้งานในชื่อ ${doctor.name}`}
          >
            <GlassCard className="flex h-full flex-col gap-3 p-5 transition-all group-hover:-translate-y-1 group-hover:shadow-lg">
              <DoctorAvatar doctor={doctor} size={56} className="rounded-2xl" />
              <div>
                <div className="text-base font-semibold text-foreground">{doctor.name}</div>
                <div className="text-[11px] text-muted-foreground">{doctor.name_en}</div>
              </div>
              <div className="text-xs text-mint-700 dark:text-mint-400">
                {doctor.specialty_th}
                <span className="ml-1 text-muted-foreground">· {doctor.specialty}</span>
              </div>
              <div className="mt-auto flex items-center justify-between border-t border-border/40 pt-3 text-[11px] text-muted-foreground">
                <span>นัดวันนี้ {queueSize} ราย</span>
                <span className="inline-flex items-center gap-1 font-medium text-mint-700 dark:text-mint-400">
                  เข้าใช้งาน
                  <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </GlassCard>
          </button>
        ))}
      </div>

      <p className="text-center text-[11px] text-muted-foreground">
        บัญชีนี้เป็นตัวอย่างสำหรับการสาธิต ไม่มีการยืนยันตัวตนจริง · Demo personas only — no real auth.
      </p>
    </section>
  );
}
