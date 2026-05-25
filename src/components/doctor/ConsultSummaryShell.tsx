'use client';

import { useState } from 'react';
import { ArrowLeft, CalendarCheck, CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConsultSummary } from '@/components/shared/ConsultSummary';
import { useDoctorStore } from '@/stores/store-doctor';

interface ConsultSummaryShellProps {
  doctorName: string;
  doctorSpecialty: string;
}

function formatThaiDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' });
}

export function ConsultSummaryShell({ doctorName, doctorSpecialty }: ConsultSummaryShellProps) {
  const consultEnded = useDoctorStore((s) => s.consultEnded);
  const appointment = useDoctorStore((s) => s.appointment);
  const summary = useDoctorStore((s) => s.summary);
  const isSummarizing = useDoctorStore((s) => s.isSummarizing);
  const summaryError = useDoctorStore((s) => s.summaryError);
  const closeAppt = useDoctorStore((s) => s.closeAppt);

  const visible = Boolean(consultEnded && appointment);

  return (
    <>
      <ConsultSummary
        visible={visible}
        isSummarizing={isSummarizing}
        summary={summary}
        summaryError={summaryError}
        patientName={appointment?.patient ?? ''}
        patientAge={appointment?.profile?.age}
        doctorName={doctorName}
        doctorSpecialty={doctorSpecialty}
        defaultTab="cert"
        renderFollowup={({ daysFromNow, reason }) => (
          <DoctorFollowupRow
            key={`${appointment?.appt_id ?? ''}:${consultEnded ? '1' : '0'}`}
            daysFromNow={daysFromNow}
            reason={reason}
          />
        )}
      />
      {visible ? (
        <Button
          onClick={closeAppt}
          variant="default"
          size="lg"
          className="mt-4 w-full"
        >
          <ArrowLeft className="size-4" />
          เสร็จสิ้น · กลับไปคิวผู้ป่วย
        </Button>
      ) : null}
    </>
  );
}

function DoctorFollowupRow({
  daysFromNow,
  reason,
}: {
  daysFromNow: number;
  reason: string | null;
}) {
  const [booked, setBooked] = useState(false);
  const dateLabel = formatThaiDate(daysFromNow);

  if (booked) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-mint-400/60 bg-mint-100/70 px-3 py-2">
        <div className="flex items-start gap-2">
          <CalendarCheck className="mt-0.5 size-4 text-mint-800" />
          <div>
            <div className="text-sm font-medium text-mint-900">นัดติดตาม {dateLabel} เรียบร้อย</div>
            <div className="text-xs text-mint-800/80">
              ระบบจะส่งการแจ้งเตือนถึงคนไข้ก่อนถึงนัด · เพิ่มเข้าตารางอัตโนมัติ
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
            แนะนำให้นัดติดตามใน {daysFromNow} วัน · {dateLabel}
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
