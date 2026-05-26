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

interface ResolvedPoint {
  expected: number;
  ciLow: number;
  ciHigh: number;
}

const ZERO_POINT: ResolvedPoint = { expected: 0, ciLow: 0, ciHigh: 0 };

export interface ForecastResolver {
  /** Specialty peak across the whole horizon — the stable level-scaling denominator. */
  max: number;
  /**
   * Resolve the forecast for a specific local date + hour. The notebook now emits a
   * ~14-day *dated* horizon, so within that window we return the model's genuine
   * prediction for that exact calendar date (a real Jun 3 holiday dip shows up here).
   * For dates outside the static horizon we fall back to the weekly-average seasonal
   * pattern, so the rolling view never breaks.
   */
  at(date: Date, hour: number): ResolvedPoint;
}

/**
 * Index a forecast for date-aware lookup: a `${YYYY-MM-DD}|hour` map for exact dated
 * hits, plus a `(dow,hour)` weekly-average map as the out-of-horizon fallback.
 */
export function makeForecastResolver(forecast: DemandForecast): ForecastResolver {
  const byDate = new Map<string, ResolvedPoint>();
  const acc = new Map<number, { e: number; lo: number; hi: number; n: number }>();
  let max = 0;
  for (const p of forecast.by_hour) {
    const d = new Date(p.datetime);
    byDate.set(`${localDateStr(d)}|${d.getHours()}`, {
      expected: p.expected_bookings,
      ciLow: p.ci_low,
      ciHigh: p.ci_high,
    });
    const sk = seasonalKey(d.getDay(), d.getHours());
    const a = acc.get(sk) ?? { e: 0, lo: 0, hi: 0, n: 0 };
    a.e += p.expected_bookings;
    a.lo += p.ci_low;
    a.hi += p.ci_high;
    a.n += 1;
    acc.set(sk, a);
    if (p.expected_bookings > max) max = p.expected_bookings;
  }
  const seasonal = new Map<number, ResolvedPoint>();
  for (const [sk, a] of acc) {
    seasonal.set(sk, { expected: a.e / a.n, ciLow: a.lo / a.n, ciHigh: a.hi / a.n });
  }
  return {
    max,
    at(date, hour) {
      return (
        byDate.get(`${localDateStr(date)}|${hour}`) ??
        seasonal.get(seasonalKey(date.getDay(), hour)) ??
        ZERO_POINT
      );
    },
  };
}

/**
 * Build the doctor-facing weekly model: re-anchor `forecast` onto the 7 days
 * starting at `now`'s date, tag every cell with a relative level, and mark the
 * recommended windows + the live now cell. Cells are filled from the genuine
 * dated forecast where available (rolling: the 7th day is a real new prediction),
 * falling back to the weekly seasonal pattern only past the static horizon.
 */
export function buildDemandWeek(forecast: DemandForecast, now: Date): DemandWeek {
  const resolver = makeForecastResolver(forecast);
  const max = resolver.max;

  const today0 = startOfDay(now);
  const nowHour = now.getHours();

  // 1) Build the 7×24 grid straight from the genuine dated forecast (real value
  //    per calendar date; weekly-average fallback only past the static horizon).
  const rows: DemandRow[] = [];
  let nowCell: DemandCell | null = null;
  let peakCell: DemandCell | null = null;
  let weekTotal = 0;

  for (let i = 0; i < 7; i++) {
    const date = addDays(today0, i);
    const dateStr = localDateStr(date);
    const isToday = i === 0;
    const cells: DemandCell[] = [];
    for (let h = 0; h < 24; h++) {
      const point = resolver.at(date, h);
      const isNow = isToday && h === nowHour;
      const cell: DemandCell = {
        date: dateStr,
        hour: h,
        expected: point.expected,
        ciLow: point.ciLow,
        ciHigh: point.ciHigh,
        level: demandLevel(point.expected, max),
        recommended: false, // set in pass 2 once the windows are chosen
        isNow,
        isPast: isToday && h < nowHour,
      };
      weekTotal += point.expected; // sum the DISPLAYED window only
      if (isNow) nowCell = cell;
      // Peak looks forward only — an already-elapsed hour isn't actionable.
      if (!cell.isPast && (!peakCell || cell.expected > peakCell.expected)) peakCell = cell;
      cells.push(cell);
    }
    rows.push({ date, dow: date.getDay(), isToday, cells });
  }

  // 2) Derive recommended windows from the displayed cells: contiguous runs of
  //    level ≥ 3 lasting ≥ 2h, ranked by total expected demand, top 6, future-only.
  const candidates: RebasedSlot[] = [];
  for (const row of rows) {
    let i = 0;
    while (i < row.cells.length) {
      if (row.cells[i].level >= 3 && !row.cells[i].isPast) {
        let j = i;
        while (j + 1 < row.cells.length && row.cells[j + 1].level >= 3 && !row.cells[j + 1].isPast) j += 1;
        if (j - i + 1 >= 2) {
          const run = row.cells.slice(i, j + 1);
          const start = new Date(row.date);
          start.setHours(run[0].hour, 0, 0, 0);
          const end = new Date(row.date);
          end.setHours(run[run.length - 1].hour + 1, 0, 0, 0);
          let peakLevel: DemandLevel = 0;
          let consults = 0;
          for (const c of run) {
            if (c.level > peakLevel) peakLevel = c.level;
            consults += c.expected;
          }
          candidates.push({
            start: localStamp(start),
            end: localStamp(end),
            predicted_load: peakLevel >= 4 ? 'PEAK' : 'HIGH',
            expected_consults: Math.round(consults),
            level: peakLevel,
          });
        }
        i = j + 1;
      } else {
        i += 1;
      }
    }
  }
  const slots: RebasedSlot[] = candidates
    .filter((s) => new Date(s.end).getTime() > now.getTime())
    .sort((a, b) => b.expected_consults - a.expected_consults || a.start.localeCompare(b.start))
    .slice(0, 6)
    .sort((a, b) => a.start.localeCompare(b.start));

  // Mark the chosen windows on their cells.
  const recommended = new Set<string>();
  for (const s of slots) {
    for (let t = new Date(s.start); t < new Date(s.end); t = new Date(t.getTime() + 3_600_000)) {
      recommended.add(`${localDateStr(t)}|${t.getHours()}`);
    }
  }
  for (const row of rows) {
    for (const cell of row.cells) cell.recommended = recommended.has(`${cell.date}|${cell.hour}`);
  }

  // peakCell is always assigned (7×24 > 0 cells), but satisfy the type.
  const peak = peakCell ?? rows[0].cells[0];

  return { rows, max, nowCell, peakCell: peak, weekTotal: Math.round(weekTotal), slots };
}
