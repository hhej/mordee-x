import type { DemandForecast } from '@/lib/data';

export type SlotLoad = 'low' | 'med' | 'high' | 'unavailable';

export interface Slot {
  iso: string;
  load: SlotLoad;
}

/**
 * Deterministic mulberry32 PRNG. Same seed → same sequence across renders
 * and page reloads, so a given doctor always shows the same availability grid.
 */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashDoctorId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

const CLINIC_OPEN_HOUR = 9;
const CLINIC_CLOSE_HOUR = 21;

function startOfTomorrow(reference: Date): Date {
  const d = new Date(reference);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return d;
}

function pickLoad(rand: () => number, isWeekday: boolean): SlotLoad {
  // Probability table tilted busier on weekdays.
  // unavailable, low, med, high
  const weights = isWeekday ? [0.25, 0.2, 0.3, 0.25] : [0.35, 0.25, 0.25, 0.15];
  const labels: SlotLoad[] = ['unavailable', 'low', 'med', 'high'];
  const r = rand();
  let cum = 0;
  for (let i = 0; i < weights.length; i++) {
    cum += weights[i];
    if (r < cum) return labels[i];
  }
  return labels[labels.length - 1];
}

/**
 * Generate 7-day × open-hours availability for a non-D001 doctor.
 * Deterministic per doctor_id; safe to call on every render.
 *
 * @param doctorId - the doctor's id (used as seed)
 * @param now - "today" reference (defaults to current time)
 */
export function generateSlotsFor(doctorId: string, now: Date = new Date()): Slot[] {
  const rand = mulberry32(hashDoctorId(doctorId));
  const start = startOfTomorrow(now);
  const out: Slot[] = [];

  for (let day = 0; day < 7; day++) {
    const date = new Date(start);
    date.setDate(date.getDate() + day);
    const dow = date.getDay();
    const isWeekday = dow >= 1 && dow <= 5;
    for (let hour = CLINIC_OPEN_HOUR; hour < CLINIC_CLOSE_HOUR; hour++) {
      const slot = new Date(date);
      slot.setHours(hour, 0, 0, 0);
      out.push({ iso: slot.toISOString(), load: pickLoad(rand, isWeekday) });
    }
  }

  return out;
}

/**
 * Convert the real D001 demand forecast (from nb02 output) into the same
 * Slot[] shape so the booking grid renders identically for D001 and other
 * doctors. Tier thresholds chosen so the forecast's distribution roughly
 * matches the mock generator's mix.
 */
export function slotsFromDemandForecast(
  forecast: DemandForecast,
  now: Date = new Date(),
): Slot[] {
  // Find rough quantiles of expected_bookings so thresholds adapt to scale.
  const values = forecast.by_hour.map((b) => b.expected_bookings);
  const sorted = [...values].sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.floor(sorted.length * p)] ?? 0;
  const lowThreshold = q(0.3);
  const medThreshold = q(0.6);
  const highThreshold = q(0.85);

  // The Prophet output's load-by-hour pattern is what matters; its absolute
  // calendar dates are an artifact of when nb02 ran. Rebase the series so
  // the first bucket lands at startOfTomorrow(now) — keeps the grid fresh
  // without re-running the notebook every week.
  const firstIso = forecast.by_hour[0]?.datetime;
  if (!firstIso) return [];
  const firstAtNotebook = new Date(firstIso).getTime();
  const target = new Date(now);
  target.setHours(0, 0, 0, 0);
  target.setDate(target.getDate() + 1);
  const offsetMs = target.getTime() - firstAtNotebook;

  return forecast.by_hour.map((b) => {
    const rebasedIso = new Date(new Date(b.datetime).getTime() + offsetMs).toISOString();
    let load: SlotLoad;
    if (b.expected_bookings <= 0.05) load = 'unavailable';
    else if (b.expected_bookings <= lowThreshold) load = 'low';
    else if (b.expected_bookings <= medThreshold) load = 'med';
    else if (b.expected_bookings <= highThreshold) load = 'high';
    else load = 'high';
    return { iso: rebasedIso, load };
  });
}

/**
 * Group a flat slot list by calendar day. Useful for rendering a 7-column grid.
 */
export function groupSlotsByDay(slots: Slot[]): Array<{ dateKey: string; slots: Slot[] }> {
  const map = new Map<string, Slot[]>();
  for (const s of slots) {
    const dateKey = s.iso.slice(0, 10); // YYYY-MM-DD
    const arr = map.get(dateKey) ?? [];
    arr.push(s);
    map.set(dateKey, arr);
  }
  return Array.from(map.entries())
    .map(([dateKey, arr]) => ({ dateKey, slots: arr }))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}
