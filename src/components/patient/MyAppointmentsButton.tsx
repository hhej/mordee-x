'use client';

import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNow } from '@/lib/use-now';
import { usePatientStore } from '@/stores/store-patient';
import { useAppointmentStore, upcomingForPatientFrom } from '@/stores/store-appointments';
import { UpcomingAppointmentsList } from './UpcomingAppointmentsList';

// Header affordance reachable from any step (matches the "modal + scroll, no
// navigation" rule). Hidden until the ledger has hydrated and there is at least
// one upcoming appointment, so it never flashes an empty "(0)" on first paint.
export function MyAppointmentsButton() {
  const persona = usePatientStore((s) => s.persona);
  const hydrated = useAppointmentStore((s) => s.hydrated);
  const appointments = useAppointmentStore((s) => s.appointments);
  const now = useNow();
  const [open, setOpen] = useState(false);

  if (!hydrated || !now) return null;

  const upcoming = upcomingForPatientFrom(appointments, persona.name, now);
  // Hide the trigger when there's nothing upcoming, but keep an already-open
  // dialog mounted so cancelling the last item still shows the undo strip.
  if (upcoming.length === 0 && !open) return null;

  return (
    <>
      {upcoming.length > 0 ? (
        <Button size="sm" variant="ghost" onClick={() => setOpen(true)} title="นัดหมายของฉัน">
          <CalendarDays className="size-3.5" />
          นัดหมาย
          <span className="ml-1 inline-flex min-w-4 items-center justify-center rounded-full bg-mint-600 px-1 text-[10px] font-semibold leading-4 text-white">
            {upcoming.length}
          </span>
        </Button>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>นัดหมายของฉัน · My appointments</DialogTitle>
            <DialogDescription>
              นัดหมายที่จะถึง — นัดใหม่และนัดติดตาม · ระบบจะแจ้งเตือนก่อนถึงเวลานัด
            </DialogDescription>
          </DialogHeader>
          <UpcomingAppointmentsList appointments={upcoming} now={now} />
        </DialogContent>
      </Dialog>
    </>
  );
}
