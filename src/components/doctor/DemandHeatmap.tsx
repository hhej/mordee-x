'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { DemandForecast } from '@/lib/data';

const HOURS = Array.from({ length: 24 }, (_, h) => h);
// Day-of-week index → label index (we display Mon→Sun for clarity)
const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun mapped to JS getDay()
const ROW_LABELS = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'];

interface Cell {
  date: string; // YYYY-MM-DD
  hour: number;
  expected: number;
  recommended: boolean;
}

interface DemandHeatmapProps {
  forecast: DemandForecast;
}

function buildGrid(forecast: DemandForecast): { rows: Cell[][]; max: number; dayDates: (string | null)[] } {
  // Identify date for each row (the first datetime per JS dow)
  const cellMap: Record<string, Cell> = {};
  let max = 0;
  for (const point of forecast.by_hour) {
    const d = new Date(point.datetime);
    const dow = d.getDay();
    const hour = d.getHours();
    const dateStr = point.datetime.slice(0, 10);
    const key = `${dow}-${hour}-${dateStr}`;
    cellMap[key] = {
      date: dateStr,
      hour,
      expected: point.expected_bookings,
      recommended: false,
    };
    if (point.expected_bookings > max) max = point.expected_bookings;
  }

  // Mark recommended slots
  for (const slot of forecast.recommended_online_slots) {
    const start = new Date(slot.start);
    const end = new Date(slot.end);
    const startMs = start.getTime();
    const endMs = end.getTime();
    for (const cell of Object.values(cellMap)) {
      const cellTs = new Date(`${cell.date}T${String(cell.hour).padStart(2, '0')}:00`).getTime();
      if (cellTs >= startMs && cellTs < endMs) {
        cell.recommended = true;
      }
    }
  }

  // Assemble Mon..Sun rows. For each dow in DOW_ORDER, pick the date that appears most.
  const rows: Cell[][] = [];
  const dayDates: (string | null)[] = [];
  for (const targetDow of DOW_ORDER) {
    const row: Cell[] = new Array(24);
    let pickedDate: string | null = null;
    for (let h = 0; h < 24; h++) {
      // find a cell for this dow + hour
      const matches = Object.values(cellMap).filter((c) => {
        const dow = new Date(`${c.date}T${String(c.hour).padStart(2, '0')}:00`).getDay();
        return dow === targetDow && c.hour === h;
      });
      const cell = matches[0];
      if (cell) {
        row[h] = cell;
        if (!pickedDate) pickedDate = cell.date;
      } else {
        row[h] = { date: '', hour: h, expected: 0, recommended: false };
      }
    }
    rows.push(row);
    dayDates.push(pickedDate);
  }
  return { rows, max, dayDates };
}

export function DemandHeatmap({ forecast }: DemandHeatmapProps) {
  const [hover, setHover] = useState<Cell | null>(null);
  const { rows, max, dayDates } = buildGrid(forecast);

  return (
    <div className="relative">
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Hour header */}
          <div className="flex pl-10">
            {HOURS.map((h) => (
              <div
                key={h}
                className="flex-1 text-center text-[9px] text-muted-foreground"
                style={{ minWidth: 18 }}
              >
                {h % 3 === 0 ? h : ''}
              </div>
            ))}
          </div>
          {/* Rows */}
          {rows.map((row, rowIdx) => (
            <div key={rowIdx} className="flex items-center">
              <div className="flex w-10 shrink-0 flex-col text-right pr-2">
                <span className="text-[10px] font-medium text-ink">{ROW_LABELS[rowIdx]}</span>
                {dayDates[rowIdx] ? (
                  <span className="text-[9px] text-muted-foreground">
                    {dayDates[rowIdx]!.slice(8, 10)}/{dayDates[rowIdx]!.slice(5, 7)}
                  </span>
                ) : null}
              </div>
              {row.map((cell, h) => {
                const intensity = max > 0 ? cell.expected / max : 0;
                const alpha = 0.08 + intensity * 0.85;
                return (
                  <div
                    key={h}
                    className={cn(
                      'flex-1 m-px rounded-[3px] transition-transform hover:scale-110',
                      cell.recommended && 'ring-2 ring-mint-600 ring-offset-1 ring-offset-white/40',
                    )}
                    style={{
                      backgroundColor: cell.date
                        ? `rgba(22, 163, 74, ${alpha})`
                        : 'rgba(0,0,0,0.03)',
                      height: 22,
                      minWidth: 18,
                    }}
                    onMouseEnter={() => cell.date && setHover(cell)}
                    onMouseLeave={() => setHover(null)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {/* Legend */}
      <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>น้อย</span>
          <div className="flex">
            {[0.1, 0.3, 0.5, 0.7, 0.9].map((a) => (
              <div
                key={a}
                className="size-3"
                style={{ backgroundColor: `rgba(22, 163, 74, ${a})` }}
              />
            ))}
          </div>
          <span>มาก</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-3 rounded-[3px] ring-2 ring-mint-600 ring-offset-1 ring-offset-white/40" />
          <span>ช่วงเวลาที่แนะนำให้เปิดออนไลน์</span>
        </div>
      </div>
      {/* Tooltip */}
      {hover ? (
        <div className="pointer-events-none mt-2 inline-flex items-center gap-2 rounded-md bg-ink/90 px-2.5 py-1 text-[11px] text-white shadow-md">
          <span className="font-medium">
            {hover.date} {String(hover.hour).padStart(2, '0')}:00
          </span>
          <span className="text-mint-200">{hover.expected.toFixed(2)} bookings</span>
          {hover.recommended ? <span className="text-mint-300">★ แนะนำ</span> : null}
        </div>
      ) : null}
    </div>
  );
}
