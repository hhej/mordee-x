'use client';

import { CalendarClock, FileClock, Pill, Stethoscope } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { PastConsult, PastConsultMessage } from '@/lib/data';

interface PastConsultsDialogProps {
  patientName: string;
  consults: PastConsult[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PastConsultsDialog({
  patientName,
  consults,
  open,
  onOpenChange,
}: PastConsultsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileClock className="size-4 text-mint-700" />
            ประวัติการปรึกษา
            <span className="text-xs font-normal text-muted-foreground">· Past consultations</span>
          </DialogTitle>
          <DialogDescription>{patientName}</DialogDescription>
        </DialogHeader>

        {consults.length === 0 ? (
          <div className="grid place-items-center gap-1 py-10 text-center">
            <FileClock className="size-7 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">ยังไม่มีประวัติการปรึกษาก่อนหน้า</p>
            <p className="text-xs text-muted-foreground/70">No prior consultations</p>
          </div>
        ) : (
          <div className="-mr-1 flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-1">
            {consults.map((c, i) => (
              <ConsultCard key={i} consult={c} />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ConsultCard({ consult }: { consult: PastConsult }) {
  return (
    <div className="rounded-xl border border-line/60 bg-white/60 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-mint-700">
          <CalendarClock className="size-3.5" />
          {consult.date_label}
        </div>
        {consult.doctor_name || consult.specialty_th ? (
          <div className="text-[11px] text-muted-foreground">
            {[consult.doctor_name, consult.specialty_th].filter(Boolean).join(' · ')}
          </div>
        ) : null}
      </div>

      <p className="mt-1.5 text-sm font-medium text-ink">{consult.reason_th}</p>

      {consult.dx_th || consult.rx_th ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {consult.dx_th ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-mint-50 px-2 py-0.5 text-[11px] text-mint-800 ring-1 ring-mint-200/60">
              <Stethoscope className="size-3" />
              {consult.dx_th}
            </span>
          ) : null}
          {consult.rx_th ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
              <Pill className="size-3" />
              {consult.rx_th}
            </span>
          ) : null}
        </div>
      ) : null}

      {consult.transcript.length > 0 ? (
        <div className="mt-3 space-y-2 border-t border-line/50 pt-3">
          {consult.transcript.map((m, i) => (
            <TranscriptBubble key={i} msg={m} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

// Static, read-only mirror of ChatStream's bubble look: doctor on the right in
// mint, patient on the left in slate.
function TranscriptBubble({ msg }: { msg: PastConsultMessage }) {
  const isDoctor = msg.role === 'doctor';
  return (
    <div className={cn('flex', isDoctor ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-3 py-1.5 text-sm',
          isDoctor ? 'rounded-br-md bg-mint-600 text-white' : 'rounded-bl-md bg-slate-100 text-ink',
        )}
      >
        <div
          className={cn(
            'mb-0.5 text-[10px] font-medium uppercase tracking-wide',
            isDoctor ? 'text-mint-100' : 'text-muted-foreground',
          )}
        >
          {isDoctor ? 'แพทย์' : 'คนไข้'}
        </div>
        <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
      </div>
    </div>
  );
}
