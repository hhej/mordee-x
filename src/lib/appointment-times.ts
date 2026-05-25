import type { DoctorAppointment } from '@/lib/data';

// Demo-friendly offsets in minutes from the session anchor. The first slot lands
// just before "now" so it reads "ถึงเวลาแล้ว" and the doctor naturally opens it;
// the rest are spaced for a tight, on-screen ~2h story. Appointments past index 2
// keep stepping by STEP_MIN so longer queues stay plausible.
const OFFSETS_MIN = [-3, 40, 125];
const STEP_MIN = 90;

function offsetFor(index: number): number {
  if (index < OFFSETS_MIN.length) return OFFSETS_MIN[index];
  return OFFSETS_MIN[OFFSETS_MIN.length - 1] + (index - OFFSETS_MIN.length + 1) * STEP_MIN;
}

/** Round a Date to the nearest 5 minutes so displayed times look like real bookings. */
function roundTo5(d: Date): Date {
  const out = new Date(d);
  const m = out.getMinutes();
  out.setMinutes(Math.round(m / 5) * 5, 0, 0);
  return out;
}

function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Rebase the appointment queue onto the live wall clock. The JSON `time` values
 * are static and drift out of sync with demo day; here we re-anchor them to
 * `anchor` (a fixed session-start time — see useSessionAnchor) so the queue
 * straddles "now" no matter when the demo runs. Order is preserved; everything
 * else on each appointment (profile / cached / past_consults) is carried through.
 */
export function rebaseAppointments(
  appts: DoctorAppointment[],
  anchor: Date,
): DoctorAppointment[] {
  return appts.map((a, i) => {
    const t = roundTo5(new Date(anchor.getTime() + offsetFor(i) * 60_000));
    return { ...a, time: hhmm(t) };
  });
}
