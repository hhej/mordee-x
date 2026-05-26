'use client';

import { BellRing, CalendarCheck2, Clock4 } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { DoctorAvatar } from '@/components/shared/DoctorAvatar';
import { getDoctor } from '@/lib/data';
import { useNow } from '@/lib/use-now';
import { usePatientStore } from '@/stores/store-patient';
import { useAppointmentStore, type Appointment } from '@/stores/store-appointments';

function formatCountdown(slot: Date, now: Date): string {
  const diffMs = slot.getTime() - now.getTime();
  const totalMin = Math.round(Math.abs(diffMs) / 60_000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin - days * 60 * 24) / 60);
  const minutes = totalMin % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} วัน`);
  if (hours > 0) parts.push(`${hours} ชั่วโมง`);
  if (days === 0 && minutes > 0) parts.push(`${minutes} นาที`);
  if (parts.length === 0) parts.push('ไม่ถึงนาที');
  return `อีก ${parts.join(' ')}`;
}

function slotLabel(iso: string): string {
  return new Date(iso).toLocaleString('th-TH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function UpcomingAppointmentsCard() {
  const persona = usePatientStore((s) => s.persona);
  const hydrated = useAppointmentStore((s) => s.hydrated);
  const appointments = useAppointmentStore((s) => s.appointments);
  const now = useNow();

  // SSR / first paint: render nothing until the store is hydrated and the live
  // clock has ticked, so the future-vs-now filter agrees across server+client.
  if (!hydrated || !now) return null;

  const upcoming: Appointment[] = appointments
    .filter(
      (a) =>
        a.patientName === persona.name &&
        a.status === 'scheduled' &&
        new Date(a.slotIso).getTime() >= now.getTime(),
    )
    .sort((a, b) => a.slotIso.localeCompare(b.slotIso));

  if (upcoming.length === 0) return null;

  return (
    <GlassCard className="border border-mint-300/60 bg-gradient-to-br from-mint-50/80 via-white/70 to-mint-100/40">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-lg bg-mint-600 text-white">
          <CalendarCheck2 className="size-3.5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-ink md:text-lg">นัดหมายของฉัน</h2>
          <div className="text-xs text-muted-foreground">Upcoming appointments</div>
        </div>
        <span className="ml-auto text-xs text-muted-foreground">{upcoming.length} รายการ</span>
      </div>

      <div className="flex flex-col gap-2.5">
        {upcoming.map((appt) => {
          const doctor = getDoctor(appt.doctorId);
          return (
            <div
              key={appt.id}
              className="flex items-center gap-3 rounded-xl border border-line/60 bg-white/70 p-3"
            >
              {doctor ? <DoctorAvatar doctor={doctor} size={40} /> : null}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium text-ink">
                    {doctor?.name ?? 'แพทย์'}
                  </span>
                  <span className="shrink-0 rounded-full bg-mint-100 px-1.5 py-0.5 text-[10px] font-medium text-mint-800">
                    {appt.kind === 'followup' ? 'นัดติดตาม' : 'นัดใหม่'}
                  </span>
                </div>
                <div className="truncate text-xs text-mint-900">{slotLabel(appt.slotIso)}</div>
                <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] tabular-nums text-mint-700">
                  <Clock4 className="size-3" />
                  {formatCountdown(new Date(appt.slotIso), now)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-md bg-white/60 px-3 py-2 text-[11px] text-ink/80 ring-1 ring-line/40">
        <BellRing className="mt-0.5 size-3.5 shrink-0 text-mint-700" />
        <span>ระบบจะแจ้งเตือนผ่านแอป MorDee+ ก่อนถึงเวลานัด 30 นาที — ไม่ต้องชำระเงินเพิ่ม</span>
      </div>
    </GlassCard>
  );
}
