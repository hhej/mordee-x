'use client';

import { CalendarPlus, FileClock, FolderClosed, IdCard } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { TRIAGE_CHIP, TRIAGE_LABEL_TH } from '@/lib/triage';
import type { DoctorAppointment } from '@/lib/data';
import { ConsultCard } from './PastConsultsDialog';

interface PatientRecordDialogProps {
  patientName: string;
  /** The matched mock record (demographics + past consults), if the patient is
   *  in the doctor's demo roster. Undefined → "no prior record" state. */
  record?: DoctorAppointment;
  /** Reason for the upcoming visit, carried on the appointment itself. */
  reason_th?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PatientRecordDialog({
  patientName,
  record,
  reason_th,
  open,
  onOpenChange,
}: PatientRecordDialogProps) {
  const profile = record?.profile;
  const consults = record?.past_consults ?? [];
  // Truly nothing on file: not in the demo roster (no profile) and no history.
  const empty = !profile && consults.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IdCard className="size-4 text-mint-700" />
            ประวัติผู้ป่วย
            <span className="text-xs font-normal text-muted-foreground">· Patient record</span>
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <span className="font-medium text-ink">{patientName}</span>
            {profile ? (
              <span className="text-muted-foreground">
                · อายุ {profile.age} ปี · {profile.gender === 'female' ? 'หญิง' : 'ชาย'}
              </span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="-mr-1 flex max-h-[64vh] flex-col gap-4 overflow-y-auto pr-1">
          {profile ? (
            <span
              className={cn(
                'inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1',
                TRIAGE_CHIP[profile.triage],
              )}
            >
              Triage · {TRIAGE_LABEL_TH[profile.triage]}
            </span>
          ) : null}

          {reason_th ? (
            <section className="rounded-xl border border-mint-200/70 bg-mint-50/40 p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <CalendarPlus className="size-3" />
                เหตุผลนัด · Reason for visit
              </div>
              <p className="mt-1 text-sm text-ink">{reason_th}</p>
            </section>
          ) : null}

          {profile?.history ? (
            <section>
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                ประวัติการรักษา · History
              </div>
              <p className="mt-1 text-sm text-ink">{profile.history}</p>
            </section>
          ) : null}

          {consults.length > 0 ? (
            <section className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <FileClock className="size-3" />
                การปรึกษาก่อนหน้า · Past consults
                <span className="text-muted-foreground/70">({consults.length})</span>
              </div>
              {consults.map((c, i) => (
                <ConsultCard key={i} consult={c} />
              ))}
            </section>
          ) : null}

          {empty ? (
            <div className="grid place-items-center gap-1 py-8 text-center">
              <FolderClosed className="size-7 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">ยังไม่มีประวัติในระบบ</p>
              <p className="text-xs text-muted-foreground/70">No prior record on file</p>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
