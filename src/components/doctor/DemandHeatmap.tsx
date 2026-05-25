'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { LEVEL_EN, LEVEL_TH, type DemandCell, type DemandWeek } from '@/lib/demand-forecast';

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const DOW_TH = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

interface DemandHeatmapProps {
  week: DemandWeek;
}

/** Cell fill: green ramp scaled to the specialty peak, so the darkest cells are
 *  this clinic's busiest hours regardless of absolute volume. */
function cellColor(cell: DemandCell, max: number): string {
  if (cell.expected <= 0) return 'rgba(0,0,0,0.035)';
  const intensity = max > 0 ? cell.expected / max : 0;
  const alpha = 0.1 + intensity * 0.8;
  return `rgba(22, 163, 74, ${alpha})`;
}

export function DemandHeatmap({ week }: DemandHeatmapProps) {
  const [hover, setHover] = useState<DemandCell | null>(null);
  const { rows, max } = week;

  return (
    <div className="relative">
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Hour header */}
          <div className="flex pl-12">
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
          {/* Rows — today first, then the next 6 days in order */}
          {rows.map((row) => (
            <div key={row.date.toISOString()} className="flex items-center">
              <div className="flex w-12 shrink-0 flex-col text-right pr-2">
                <span
                  className={cn(
                    'text-[10px] font-medium',
                    row.isToday ? 'text-mint-700' : 'text-ink',
                  )}
                >
                  {row.isToday ? 'วันนี้' : DOW_TH[row.dow]}
                </span>
                <span className="text-[9px] text-muted-foreground">
                  {row.date.getDate()}/{row.date.getMonth() + 1}
                </span>
              </div>
              {row.cells.map((cell) => (
                <div
                  key={cell.hour}
                  className={cn(
                    'relative flex-1 m-px rounded-[3px] transition-transform hover:scale-110',
                    cell.recommended && 'ring-2 ring-mint-600 ring-offset-1 ring-offset-white/40',
                    cell.isPast && 'opacity-40',
                  )}
                  style={{
                    backgroundColor: cellColor(cell, max),
                    height: 22,
                    minWidth: 18,
                  }}
                  onMouseEnter={() => setHover(cell)}
                  onMouseLeave={() => setHover(null)}
                >
                  {cell.isNow ? (
                    <span className="absolute inset-0 rounded-[3px] ring-2 ring-ink/70 ring-offset-1 ring-offset-white/40" />
                  ) : null}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-y-2 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>เงียบ</span>
          <div className="flex">
            {[0.1, 0.3, 0.5, 0.7, 0.9].map((a) => (
              <div key={a} className="size-3" style={{ backgroundColor: `rgba(22, 163, 74, ${a})` }} />
            ))}
          </div>
          <span>คนไข้เยอะ</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="size-3 rounded-[3px] ring-2 ring-ink/70 ring-offset-1 ring-offset-white/40" />
            <span>ตอนนี้</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="size-3 rounded-[3px] ring-2 ring-mint-600 ring-offset-1 ring-offset-white/40" />
            <span>ช่วงแนะนำให้เปิด</span>
          </div>
        </div>
      </div>
      {/* Tooltip */}
      {hover ? (
        <div className="pointer-events-none mt-2 inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-md bg-ink/90 px-2.5 py-1 text-[11px] text-white shadow-md">
          <span className="font-medium">
            {Number(hover.date.slice(8, 10))}/{Number(hover.date.slice(5, 7))} {String(hover.hour).padStart(2, '0')}:00
          </span>
          <span className="text-mint-200">
            {LEVEL_TH[hover.level]} · {LEVEL_EN[hover.level]}
          </span>
          <span className="text-white/70">คาด ~{hover.expected.toFixed(2)} คิว/ชม.</span>
          {hover.recommended ? <span className="text-mint-300">★ แนะนำเปิด</span> : null}
        </div>
      ) : null}
    </div>
  );
}
