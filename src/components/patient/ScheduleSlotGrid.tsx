'use client';

import { getDemand } from '@/lib/data';
import {
  generateSlotsFor,
  groupSlotsByDay,
  slotsFromDemandForecast,
  type Slot,
  type SlotLoad,
} from '@/lib/slot-generator';
import { usePatientStore } from '@/stores/store-patient';

interface ScheduleSlotGridProps {
  doctorId: string;
  /** "Now" anchor — pass a Date that's refreshed when the booking modal opens
   *  so a slot picked at 14:30 doesn't show '14:00 today' as still available
   *  even if the dialog stays mounted across day boundaries. */
  now?: Date;
}

const LOAD_STYLES: Record<SlotLoad, { dot: string; chip: string; label: string }> = {
  unavailable: {
    dot: 'bg-slate-200',
    chip: 'cursor-not-allowed bg-slate-50 text-slate-400 ring-line/40',
    label: 'เต็ม',
  },
  high: {
    dot: 'bg-amber-400',
    chip: 'bg-white text-ink ring-line/60 hover:ring-mint-300',
    label: 'หนาแน่น',
  },
  med: {
    dot: 'bg-mint-400',
    chip: 'bg-white text-ink ring-line/60 hover:ring-mint-300',
    label: 'ปานกลาง',
  },
  low: {
    dot: 'bg-mint-600',
    chip: 'bg-white text-ink ring-line/60 hover:ring-mint-300',
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

export function ScheduleSlotGrid({ doctorId, now }: ScheduleSlotGridProps) {
  const selected = usePatientStore((s) => s.bookingSlot);
  const setSlot = usePatientStore((s) => s.setBookingSlot);

  const anchor = now ?? new Date();
  const slots: Slot[] = (() => {
    if (doctorId === 'D001') {
      const forecast = getDemand('DD01');
      if (forecast) return slotsFromDemandForecast(forecast, anchor);
    }
    return generateSlotsFor(doctorId, anchor);
  })();

  const grouped = groupSlotsByDay(slots);

  return (
    <div className="max-h-[360px] overflow-y-auto pr-1">
      <div className="mb-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        <span>ความหนาแน่น:</span>
        <LegendDot tier="low" />
        <LegendDot tier="med" />
        <LegendDot tier="high" />
        <LegendDot tier="unavailable" />
        {doctorId === 'D001' ? (
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-mint-700">
            ✨ จากโมเดล Prophet จริง
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
