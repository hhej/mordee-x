'use client';

import { useRouter } from 'next/navigation';
import { Home, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePatientStore } from '@/stores/store-patient';

/**
 * "Back to home" CTA shown under the consult summary, mirroring the doctor
 * side's "เสร็จสิ้น · กลับไปคิวผู้ป่วย" button. Disabled while the AI is still
 * summarizing so the patient can only leave once everything is complete.
 */
export function ConsultDoneButton() {
  const router = useRouter();
  const consultEnded = usePatientStore((s) => s.consultEnded);
  const selectedDoctorId = usePatientStore((s) => s.selectedDoctorId);
  const isSummarizing = usePatientStore((s) => s.isSummarizing);
  const reset = usePatientStore((s) => s.reset);

  if (!consultEnded || !selectedDoctorId) return null;

  const onClick = () => {
    reset();
    router.push('/');
  };

  return (
    <Button
      onClick={onClick}
      disabled={isSummarizing}
      variant="default"
      size="lg"
      className="mt-4 w-full"
    >
      {isSummarizing ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          กำลังสรุปการปรึกษา… โปรดรอสักครู่
        </>
      ) : (
        <>
          <Home className="size-4" />
          เริ่มการปรึกษาใหม่ · กลับหน้าแรก
        </>
      )}
    </Button>
  );
}
