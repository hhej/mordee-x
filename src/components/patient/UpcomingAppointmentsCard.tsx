'use client';

import { BellRing, CalendarCheck2 } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { useNow } from '@/lib/use-now';
import { usePatientStore } from '@/stores/store-patient';
import { useAppointmentStore, upcomingForPatientFrom } from '@/stores/store-appointments';
import { UpcomingAppointmentsList } from './UpcomingAppointmentsList';

export function UpcomingAppointmentsCard() {
  const persona = usePatientStore((s) => s.persona);
  const hydrated = useAppointmentStore((s) => s.hydrated);
  const appointments = useAppointmentStore((s) => s.appointments);
  const now = useNow();

  // SSR / first paint: render nothing until the store is hydrated and the live
  // clock has ticked, so the future-vs-now filter agrees across server+client.
  if (!hydrated || !now) return null;

  const upcoming = upcomingForPatientFrom(appointments, persona.name, now);
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

      <UpcomingAppointmentsList appointments={upcoming} now={now} />

      <div className="mt-3 flex items-start gap-2 rounded-md bg-white/60 px-3 py-2 text-[11px] text-ink/80 ring-1 ring-line/40">
        <BellRing className="mt-0.5 size-3.5 shrink-0 text-mint-700" />
        <span>ระบบจะแจ้งเตือนผ่านแอป MorDee+ ก่อนถึงเวลานัด 30 นาที — ไม่ต้องชำระเงินเพิ่ม</span>
      </div>
    </GlassCard>
  );
}
