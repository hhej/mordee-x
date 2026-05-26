import { getDemandForDoctor } from '@/lib/data';
import {
  generateSlotsFor,
  hashDoctorId,
  slotsFromDemandForecast,
  type Slot,
} from '@/lib/slot-generator';

// Single source of truth for doctor availability. Drives BOTH:
//   1. the "skip to chat with doctor" instant-consult online badge (isOnlineNow)
//   2. the follow-up slot grid (availableSlotsFor)
// Pure + client-safe (no fs, no store import) — callers pass in the set of
// already-booked slots from the appointment store so this stays testable and
// deterministic. Determinism matters: the demo must show the same online state
// and the same grid on every reload, so we lean only on hashDoctorId, never
// Math.random.

const CLINIC_OPEN_HOUR = 9;
const CLINIC_CLOSE_HOUR = 21;

/** ~60% of doctors are "online" during clinic hours, deterministic per doctor.
 *  Outside 09:00–21:00 nobody is online. Stable across renders/reloads. */
export function isOnlineNow(doctorId: string, now: Date): boolean {
  const hour = now.getHours();
  if (hour < CLINIC_OPEN_HOUR || hour >= CLINIC_CLOSE_HOUR) return false;
  return hashDoctorId(doctorId) % 100 < 60;
}

export interface AvailableSlotsOptions {
  /** Only return slots on or after the start of this day (the follow-up window). */
  fromDate?: Date;
  /** Slots a doctor is already booked for — rendered as 'unavailable'. */
  takenIsoSet?: Set<string>;
}

/**
 * The doctor's bookable slots over the next 7 days, with already-booked slots
 * marked unavailable and (optionally) everything before `fromDate` dropped.
 * Mirrors ScheduleSlotGrid's slot resolution so the grid renders identically.
 */
export function availableSlotsFor(
  doctorId: string,
  now: Date,
  opts: AvailableSlotsOptions = {},
): Slot[] {
  const { fromDate, takenIsoSet } = opts;
  const forecast = getDemandForDoctor(doctorId);
  const base = forecast
    ? slotsFromDemandForecast(forecast, now)
    : generateSlotsFor(doctorId, now);

  const fromMs = fromDate ? startOfDay(fromDate).getTime() : null;

  const out: Slot[] = [];
  for (const slot of base) {
    if (fromMs !== null && new Date(slot.iso).getTime() < fromMs) continue;
    const taken = takenIsoSet?.has(slot.iso) ?? false;
    out.push(taken ? { ...slot, load: 'unavailable' } : slot);
  }
  return out;
}

/** First bookable (non-unavailable) slot on or after `fromDate`, or null. Used
 *  by the doctor side to auto-pick a concrete slot from a chosen window. */
export function firstBookableSlot(
  doctorId: string,
  now: Date,
  fromDate: Date,
  takenIsoSet?: Set<string>,
): string | null {
  const slots = availableSlotsFor(doctorId, now, { fromDate, takenIsoSet });
  const open = slots.find((s) => s.load !== 'unavailable');
  return open?.iso ?? null;
}

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}
