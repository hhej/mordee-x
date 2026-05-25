import type { DemandForecast } from '@/lib/data';

/**
 * Presentation layer for the 7-day demand forecast (notebook 02 output).
 *
 * Two jobs, both pure:
 *  1. Turn the model's fractional `expected_bookings` (often <1/hr) into a
 *     relative busyness LEVEL a doctor can read at a glance. Levels are scaled
 *     per-specialty against that specialty's own peak, so "สูงมาก" means "busy
 *     for this clinic" regardless of absolute volume.
 *  2. Re-anchor the forecast onto the *next 7 days starting today*. The JSON is
 *     statically dated to whenever the notebook ran, so the raw window drifts
 *     into the past. The forecast is seasonal (weekly + daily), so we re-project
 *     it by matching (day-of-week, hour) — shape is preserved, dates become
 *     honest, and "วันนี้" can sit on row 0 with a live now-marker.
 *
 * No model inference happens here — we only reshape the precomputed numbers.
 */

export type DemandLevel = 0 | 1 | 2 | 3 | 4;

export const LEVEL_TH = ['เงียบ', 'น้อย', 'ปานกลาง', 'สูง', 'สูงมาก'] as const;
export const LEVEL_EN = ['Quiet', 'Low', 'Medium', 'High', 'Peak'] as const;

/** Bucket an expected-bookings value into a 0–4 level, scaled to the specialty's
 *  own peak (`max`). Mirrors the heatmap cell intensity so darker = higher level. */
export function demandLevel(expected: number, max: number): DemandLevel {
  if (max <= 0) return 0;
  const r = expected / max;
  if (r < 0.05) return 0; // effectively idle
  if (r < 0.33) return 1;
  if (r < 0.66) return 2;
  if (r < 0.85) return 3;
  return 4;
}

export interface DemandCell {
  /** Local YYYY-MM-DD of the re-anchored day. */
  date: string;
  hour: number;
  expected: number;
  ciLow: number;
  ciHigh: number;
  level: DemandLevel;
  recommended: boolean;
  /** The single cell containing "now" (today + current hour). */
  isNow: boolean;
  /** Earlier hours of today — already elapsed. */
  isPast: boolean;
}

export interface DemandRow {
  date: Date;
  dow: number;
  isToday: boolean;
  cells: DemandCell[];
}

export interface RebasedSlot {
  start: string; // ISO-ish local "YYYY-MM-DDTHH:mm"
  end: string;
  predicted_load: string;
  expected_consults: number;
  /** Window's peak level, for plain-language framing on the chip. */
  level: DemandLevel;
}

export interface DemandWeek {
  rows: DemandRow[];
  /** Specialty peak across the whole horizon — the level-scaling denominator. */
  max: number;
  nowCell: DemandCell | null;
  peakCell: DemandCell;
  /** Rounded total expected bookings across the 7-day horizon. */
  weekTotal: number;
  /** Recommended online windows, re-anchored to upcoming dates, chronological. */
  slots: RebasedSlot[];
}

function startOfDay(d: Date): Date {
  const o = new Date(d);
  o.setHours(0, 0, 0, 0);
  return o;
}

function addDays(d: Date, n: number): Date {
  const o = new Date(d);
  o.setDate(o.getDate() + n);
  return o;
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function localStamp(d: Date): string {
  return `${localDateStr(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** key = day-of-week × 24 + hour. The 168h horizon covers each (dow,hour) once,
 *  so this is a clean bijection back to the seasonal value. */
function seasonalKey(dow: number, hour: number): number {
  return dow * 24 + hour;
}

/**
 * Build the doctor-facing weekly model: re-anchor `forecast` onto the 7 days
 * starting at `now`'s date, tag every cell with a relative level, and mark the
 * recommended windows + the live now cell.
 */
export function buildDemandWeek(forecast: DemandForecast, now: Date): DemandWeek {
  // Seasonal lookup: (dow, hour) → forecast point.
  const lookup = new Map<number, { expected: number; ciLow: number; ciHigh: number }>();
  let max = 0;
  let weekTotal = 0;
  for (const p of forecast.by_hour) {
    const d = new Date(p.datetime);
    lookup.set(seasonalKey(d.getDay(), d.getHours()), {
      expected: p.expected_bookings,
      ciLow: p.ci_low,
      ciHigh: p.ci_high,
    });
    if (p.expected_bookings > max) max = p.expected_bookings;
    weekTotal += p.expected_bookings;
  }

  const today0 = startOfDay(now);
  const todayDow = today0.getDay();
  const nowHour = now.getHours();

  // Re-anchor recommended slots by shifting each to the next occurrence of its
  // weekday on/after today, preserving hour-of-day and duration.
  const slots: RebasedSlot[] = forecast.recommended_online_slots
    .map((s) => {
      const sd = new Date(s.start);
      const ed = new Date(s.end);
      const offset = (sd.getDay() - todayDow + 7) % 7;
      const dayBase = addDays(today0, offset);
      const newStart = new Date(dayBase);
      newStart.setHours(sd.getHours(), sd.getMinutes(), 0, 0);
      const newEnd = new Date(newStart.getTime() + (ed.getTime() - sd.getTime()));
      // Level = busiest hour inside the window. Walk the original timestamps:
      // re-anchoring preserves (dow,hour), so the seasonal values are identical.
      let peakInWindow = 0;
      for (let t = new Date(sd); t < ed; t = new Date(t.getTime() + 3_600_000)) {
        const cell = lookup.get(seasonalKey(t.getDay(), t.getHours()));
        if (cell && cell.expected > peakInWindow) peakInWindow = cell.expected;
      }
      return {
        start: localStamp(newStart),
        end: localStamp(newEnd),
        predicted_load: s.predicted_load,
        expected_consults: s.expected_consults,
        level: demandLevel(peakInWindow, max),
      };
    })
    // A window that has already ended isn't a recommendation anymore. The end
    // stamp is local wall-time, so parse it back the same way for comparison.
    .filter((s) => new Date(s.end).getTime() > now.getTime())
    .sort((a, b) => a.start.localeCompare(b.start));

  // Fast membership test for "is this (date,hour) inside a recommended window".
  const recommended = new Set<string>();
  for (const s of slots) {
    const sd = new Date(s.start);
    const ed = new Date(s.end);
    for (let t = new Date(sd); t < ed; t = new Date(t.getTime() + 3_600_000)) {
      recommended.add(`${localDateStr(t)}|${t.getHours()}`);
    }
  }

  const rows: DemandRow[] = [];
  let nowCell: DemandCell | null = null;
  let peakCell: DemandCell | null = null;

  for (let i = 0; i < 7; i++) {
    const date = addDays(today0, i);
    const dow = date.getDay();
    const dateStr = localDateStr(date);
    const isToday = i === 0;
    const cells: DemandCell[] = [];
    for (let h = 0; h < 24; h++) {
      const point = lookup.get(seasonalKey(dow, h)) ?? { expected: 0, ciLow: 0, ciHigh: 0 };
      const isNow = isToday && h === nowHour;
      const cell: DemandCell = {
        date: dateStr,
        hour: h,
        expected: point.expected,
        ciLow: point.ciLow,
        ciHigh: point.ciHigh,
        level: demandLevel(point.expected, max),
        recommended: recommended.has(`${dateStr}|${h}`),
        isNow,
        isPast: isToday && h < nowHour,
      };
      if (isNow) nowCell = cell;
      // Peak looks forward only — an already-elapsed hour isn't actionable.
      if (!cell.isPast && (!peakCell || cell.expected > peakCell.expected)) peakCell = cell;
      cells.push(cell);
    }
    rows.push({ date, dow, isToday, cells });
  }

  // peakCell is always assigned (7×24 > 0 cells), but satisfy the type.
  const peak = peakCell ?? rows[0].cells[0];

  return { rows, max, nowCell, peakCell: peak, weekTotal: Math.round(weekTotal), slots };
}
