'use client';

import { useState } from 'react';
import { BellRing, CalendarCheck, CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FollowupCalloutProps {
  daysFromNow: number;
  reason: string | null;
}

function formatThaiDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toLocaleDateString('th-TH', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });
}

export function FollowupCallout({ daysFromNow, reason }: FollowupCalloutProps) {
  const [booked, setBooked] = useState(false);
  const dateLabel = formatThaiDate(daysFromNow);

  if (booked) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-mint-400/60 bg-mint-100/70 px-3 py-2">
        <div className="flex items-start gap-2">
          <CalendarCheck className="mt-0.5 size-4 text-mint-800" />
          <div>
            <div className="text-sm font-medium text-mint-900">
              ✓ นัดติดตาม {dateLabel} เรียบร้อย
            </div>
            <div className="flex items-center gap-1 text-xs text-mint-800/80">
              <BellRing className="size-3" />
              ระบบจะส่งการแจ้งเตือนก่อนนัดล่วงหน้า · ยังไม่ต้องชำระเงินตอนนี้
            </div>
          </div>
        </div>
        <Button size="sm" variant="outline" disabled>
          ✓ จองแล้ว
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-mint-300/60 bg-mint-50/60 px-3 py-2">
      <div className="flex items-start gap-2">
        <CalendarPlus className="mt-0.5 size-4 text-mint-700" />
        <div>
          <div className="text-sm font-medium text-mint-900">
            แนะนำให้ติดตามอาการในอีก {daysFromNow} วัน · {dateLabel}
          </div>
          {reason ? <div className="text-xs text-mint-800/80">{reason}</div> : null}
        </div>
      </div>
      <Button size="sm" variant="default" onClick={() => setBooked(true)}>
        จองนัดติดตาม
      </Button>
    </div>
  );
}
