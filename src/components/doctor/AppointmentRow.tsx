'use client';

import { ChevronRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DoctorAppointment, NoShowPrediction } from '@/lib/data';
import { NoShowBadge } from './NoShowBadge';
import { useDoctorStore } from '@/stores/store-doctor';

interface AppointmentRowProps {
  appointment: DoctorAppointment;
  prediction: NoShowPrediction;
  doctorId: string;
}

export function AppointmentRow({ appointment, prediction, doctorId }: AppointmentRowProps) {
  const selectedApptId = useDoctorStore((s) => s.selectedApptId);
  const openAppt = useDoctorStore((s) => s.openAppt);
  const isSelected = selectedApptId === appointment.appt_id;

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-line/70 bg-white/60 p-4 transition-all md:flex-row md:items-center md:gap-4',
        isSelected && 'border-mint-400 bg-mint-50/80 shadow-sm',
      )}
    >
      <div className="flex w-20 shrink-0 items-center gap-1.5 text-sm font-semibold text-mint-700">
        <Clock className="size-3.5" />
        {appointment.time}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-ink">{appointment.patient}</div>
        <div className="line-clamp-1 text-xs text-muted-foreground">{appointment.symptom}</div>
      </div>
      <div className="flex items-center gap-3">
        <NoShowBadge prediction={prediction} />
        <Button
          size="sm"
          variant={isSelected ? 'secondary' : 'default'}
          onClick={() => openAppt(appointment, doctorId)}
        >
          {isSelected ? 'กำลังปรึกษา' : 'เปิด'}
          <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
