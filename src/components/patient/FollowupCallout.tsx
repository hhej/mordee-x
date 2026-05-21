'use client';

import { CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePatientStore } from '@/stores/store-patient';

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
  const reopen = usePatientStore((s) => s.reopenBookingForFollowup);
  return (
    <div className="flex items-center justify-between rounded-lg border border-mint-300/60 bg-mint-50/60 px-3 py-2">
      <div className="flex items-start gap-2">
        <CalendarPlus className="mt-0.5 size-4 text-mint-700" />
        <div>
          <div className="text-sm font-medium text-mint-900">
            แนะนำให้ติดตามอาการในอีก {daysFromNow} วัน · {formatThaiDate(daysFromNow)}
          </div>
          {reason ? <div className="text-xs text-mint-800/80">{reason}</div> : null}
        </div>
      </div>
      <Button size="sm" variant="default" onClick={reopen}>
        จองนัดติดตาม
      </Button>
    </div>
  );
}
