'use client';

import { useState } from 'react';
import { Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { PatientCohortsCard } from './PatientCohortsCard';
import type { PatientSegmentsData } from '@/lib/data';

interface PatientCohortsDialogProps {
  data: PatientSegmentsData;
}

/** Opens the patient-segmentation analytics in a modal. Kept off the main
 *  doctor dashboard so the daily flow (appointments + demand) stays clinical,
 *  not admin-heavy — per the app's "everything is modal + scroll" rule. */
export function PatientCohortsDialog({ data }: PatientCohortsDialogProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Layers className="size-3.5" />
        กลุ่มผู้ป่วย
        <span className="hidden text-xs text-muted-foreground sm:inline">· Patient cohorts</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
          <DialogTitle className="sr-only">กลุ่มผู้ป่วย · Patient cohorts</DialogTitle>
          <PatientCohortsCard data={data} />
        </DialogContent>
      </Dialog>
    </>
  );
}
