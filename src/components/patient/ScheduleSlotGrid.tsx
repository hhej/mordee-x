'use client';

import { getDemandForDoctor } from '@/lib/data';
import {
  generateSlotsFor,
  groupSlotsByDay,
  slotsFromDemandForecast,
  type Slot,
  type SlotLoad,
} from '@/lib/slot-generator';
import { usePatientStore } from '@/stores/store-patient';

/** Friendly label for the forecasting model that drove these slots. */
const MODEL_LABEL: Record<string, string> = {
  prophet: 'Prophet',
  lightgbm: 'LightGBM',
  sarima: 'SARIMA',
  seasonal_naive: 'โปรไฟล์ตามฤดูกาล',
};

interface ScheduleSlotGridProps {
  doctorId: string;
  /** "Now" anchor — pass a Date that's refreshed when the booking modal opens
   *  so a slot picked at 14:30 doesn't show '14:00 today' as still available
   *  even if the dialog stays mounted across day boundaries. */
  now?: Date;
  /** Controlled slot list. When provided, bypasses internal forecast/mock
   *  generation — used by the follow-up dialog to feed availability.ts output
   *  (taken slots removed, restricted to the follow-up window). */
  slots?: Slot[];
  /** Slots this doctor is already booked into — marked 'unavailable' so no two
   *  bookings land on the same slot. Applied only on the internal-generation
   *  path; the `slots` prop is assumed pre-filtered (follow-up dialog). */
  takenIsoSet?: Set<string>;
  /** Controlled selection. When `onSelect` is provided, the grid reads/writes
   *  these instead of the patient store's bookingSlot. */
  value?: string | null;
  onSelect?: (iso: string) => void;
}

const LOAD_STYLES: Record<SlotLoad, { dot: string; chip: string; label: string }> = {
  unavailable: {
    dot: 'bg-slate-200 dark:bg-slate-700',
    chip: 'cursor-not-allowed bg-slate-50 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 ring-border/40',
    label: 'เต็ม',
  },
  high: {
    dot: 'bg-amber-400',
    chip: 'bg-card text-foreground ring-border/60 hover:ring-mint-300 dark:hover:ring-mint-500/30',
    label: 'หนาแน่น',
  },
  med: {
    dot: 'bg-mint-400',
    chip: 'bg-card text-foreground ring-border/60 hover:ring-mint-300 dark:hover:ring-mint-500/30',
    label: 'ปานกลาง',
  },
  low: {
    dot: 'bg-mint-600',
    chip: 'bg-card text-foreground ring-border/60 hover:ring-mint-300 dark:hover:ring-mint-500/30',
    label: 'ว่าง',
  },
};

function thaiDateLabel(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = d.toLocaleDateString('th-TH', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  if (d.getTime() === today.getTime()) return `วันนี้ · ${dateStr}`;
  if (d.getTime() === tomorrow.getTime()) return `พรุ่งนี้ · ${dateStr}`;
  return dateStr;
}

function thaiHourLabel(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:00`;
}

export function ScheduleSlotGrid({
  doctorId,
  now,
  slots: slotsProp,
  takenIsoSet,
  value,
  onSelect,
}: ScheduleSlotGridProps) {
  // Hooks must run unconditionally; the controlled props (when present) take
  // precedence over these store-backed defaults.
  const storeSelected = usePatientStore((s) => s.bookingSlot);
  const setStoreSlot = usePatientStore((s) => s.setBookingSlot);
  const controlled = onSelect !== undefined;
  const selected = controlled ? value ?? null : storeSelected;
  const setSlot = controlled ? onSelect : setStoreSlot;

  const anchor = now ?? new Date();
  // Every doctor inherits its specialty's demand forecast; slots are driven by
  // the real model output when available, else fall back to mock generation.
  // A `slots` prop short-circuits this (follow-up dialog feeds availability.ts).
  const forecast = slotsProp ? undefined : getDemandForDoctor(doctorId);
  const generated: Slot[] =
    slotsProp ?? (forecast ? slotsFromDemandForecast(forecast, anchor) : generateSlotsFor(doctorId, anchor));
  // On the internal-generation path, grey out slots the doctor is already booked
  // for. The `slots` prop path is assumed pre-filtered, so leave it untouched.
  const slots: Slot[] =
    slotsProp || !takenIsoSet
      ? generated
      : generated.map((s) => (takenIsoSet.has(s.iso) ? { ...s, load: 'unavailable' } : s));

  const grouped = groupSlotsByDay(slots);

  return (
    <div className="max-h-[360px] overflow-y-auto pr-1">
      <div className="mb-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        <span>ความหนาแน่น:</span>
        <LegendDot tier="low" />
        <LegendDot tier="med" />
        <LegendDot tier="high" />
        <LegendDot tier="unavailable" />
        {forecast ? (
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-mint-700 dark:text-mint-400">
            ✨ จากโมเดล {MODEL_LABEL[forecast.winning_model] ?? forecast.winning_model} จริง
          </span>
        ) : null}
      </div>

      <div className="space-y-3">
        {grouped.map(({ dateKey, slots: daySlots }) => (
          <div key={dateKey}>
            <div className="mb-1.5 text-[11px] font-medium text-muted-foreground">
              {thaiDateLabel(dateKey)}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {daySlots.map((slot) => {
                const styles = LOAD_STYLES[slot.load];
                const isSelected = selected === slot.iso;
                const disabled = slot.load === 'unavailable';
                return (
                  <button
                    key={slot.iso}
                    type="button"
                    disabled={disabled}
                    onClick={() => setSlot(slot.iso)}
                    title={styles.label}
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] ring-1 transition-colors ${
                      isSelected
                        ? 'bg-mint-600 text-white ring-mint-700'
                        : styles.chip
                    }`}
                  >
                    <span className={`size-1.5 rounded-full ${isSelected ? 'bg-white' : styles.dot}`} />
                    {thaiHourLabel(slot.iso)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LegendDot({ tier }: { tier: SlotLoad }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`size-1.5 rounded-full ${LOAD_STYLES[tier].dot}`} />
      {LOAD_STYLES[tier].label}
    </span>
  );
}
