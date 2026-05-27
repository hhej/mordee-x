'use client';

import { useState } from 'react';
import { ArrowLeft, CalendarCheck, CalendarPlus, Loader2, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConsultSummary } from '@/components/shared/ConsultSummary';
import { useDoctorStore } from '@/stores/store-doctor';
import { useAppointmentStore } from '@/stores/store-appointments';
import { firstBookableSlot } from '@/lib/availability';
import { useNow } from '@/lib/use-now';

interface ConsultSummaryShellProps {
  doctorName: string;
  doctorSpecialty: string;
}

function dateFromNow(daysFromNow: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d;
}

function formatThaiDate(date: Date): string {
  return date.toLocaleDateString('th-TH', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });
}

function formatThaiSlot(iso: string): string {
  return new Date(iso).toLocaleString('th-TH', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const FOLLOWUP_PRESETS: ReadonlyArray<{ days: number; label: string }> = [
  { days: 7, label: '1 สัปดาห์' },
  { days: 14, label: '2 สัปดาห์' },
  { days: 30, label: '1 เดือน' },
];

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
          disabled={isSummarizing}
          variant="default"
          size="lg"
          className="mt-4 w-full"
        >
          {isSummarizing ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              กำลังออกใบรับรอง…
            </>
          ) : (
            <>
              <ArrowLeft className="size-4" />
              เสร็จสิ้น · กลับไปคิวผู้ป่วย
            </>
          )}
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
  const doctorId = useDoctorStore((s) => s.doctorId);
  const appointment = useDoctorStore((s) => s.appointment);
  const addAppointment = useAppointmentStore((s) => s.addAppointment);
  const appointments = useAppointmentStore((s) => s.appointments);
  const now = useNow() ?? new Date();

  const isPreset = FOLLOWUP_PRESETS.some((p) => p.days === daysFromNow);
  const [days, setDays] = useState(Math.max(1, daysFromNow));
  const [isCustom, setIsCustom] = useState(!isPreset);
  const [bookedSlot, setBookedSlot] = useState<string | null>(null);

  if (bookedSlot) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-mint-400/60 bg-mint-100/70 px-3 py-2">
        <div className="flex items-start gap-2">
          <CalendarCheck className="mt-0.5 size-4 text-mint-800" />
          <div>
            <div className="text-sm font-medium text-mint-900">
              นัดติดตาม {formatThaiSlot(bookedSlot)} เรียบร้อย
            </div>
            <div className="text-xs text-mint-800/80">
              ระบบจะส่งการแจ้งเตือนถึงคนไข้ก่อนถึงนัด · เพิ่มเข้าตารางอัตโนมัติ
            </div>
          </div>
        </div>
        <Button size="sm" variant="outline" disabled>
          ✓ นัดแล้ว
        </Button>
      </div>
    );
  }

  const targetDate = dateFromNow(days);

  const handleConfirm = () => {
    if (!doctorId || !appointment) return;
    const takenIsoSet = new Set(
      appointments
        .filter((a) => a.doctorId === doctorId && a.status === 'scheduled')
        .map((a) => a.slotIso),
    );
    // Auto-pick the first free slot on/after the chosen window; fall back to
    // the target day at 10:00 if the week is fully booked.
    const slotIso =
      firstBookableSlot(doctorId, now, targetDate, takenIsoSet) ??
      (() => {
        const d = new Date(targetDate);
        d.setHours(10, 0, 0, 0);
        return d.toISOString();
      })();
    addAppointment({
      doctorId,
      patientName: appointment.patient,
      slotIso,
      kind: 'followup',
      reason_th: reason ?? undefined,
      createdByRole: 'doctor',
    });
    setBookedSlot(slotIso);
  };

  return (
    <div className="rounded-lg border border-mint-300/60 bg-mint-50/60 px-3 py-2.5">
      <div className="flex items-start gap-2">
        <CalendarPlus className="mt-0.5 size-4 text-mint-700" />
        <div className="flex-1">
          <div className="text-sm font-medium text-mint-900">
            นัดติดตามอาการ · ตั้งวันนัดครั้งถัดไป
          </div>
          {reason ? <div className="text-xs text-mint-800/80">{reason}</div> : null}
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {FOLLOWUP_PRESETS.map((p) => {
          const active = !isCustom && days === p.days;
          return (
            <button
              key={p.days}
              type="button"
              onClick={() => {
                setDays(p.days);
                setIsCustom(false);
              }}
              className={`rounded-md px-2.5 py-1 text-xs ring-1 transition-colors ${
                active
                  ? 'bg-mint-600 text-white ring-mint-700'
                  : 'bg-white text-ink ring-line/60 hover:ring-mint-300'
              }`}
            >
              {p.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setIsCustom(true)}
          className={`rounded-md px-2.5 py-1 text-xs ring-1 transition-colors ${
            isCustom
              ? 'bg-mint-600 text-white ring-mint-700'
              : 'bg-white text-ink ring-line/60 hover:ring-mint-300'
          }`}
        >
          กำหนดเอง
        </button>

        {isCustom ? (
          <div className="inline-flex items-center gap-1 rounded-md bg-white px-1 py-0.5 ring-1 ring-line/60">
            <button
              type="button"
              aria-label="ลดจำนวนวัน"
              onClick={() => setDays((d) => Math.max(1, d - 1))}
              className="grid size-6 place-items-center rounded text-mint-700 hover:bg-mint-50"
            >
              <Minus className="size-3.5" />
            </button>
            <span className="min-w-[3.5rem] text-center text-xs tabular-nums text-ink">
              {days} วัน
            </span>
            <button
              type="button"
              aria-label="เพิ่มจำนวนวัน"
              onClick={() => setDays((d) => Math.min(180, d + 1))}
              className="grid size-6 place-items-center rounded text-mint-700 hover:bg-mint-50"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-2.5 flex items-center justify-between">
        <div className="text-xs text-mint-800/80">
          ตรงกับ {formatThaiDate(targetDate)} เป็นต้นไป
        </div>
        <Button size="sm" variant="default" onClick={handleConfirm}>
          ยืนยันนัดติดตาม →
        </Button>
      </div>
    </div>
  );
}
