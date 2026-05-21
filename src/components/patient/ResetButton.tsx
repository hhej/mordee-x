'use client';

import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePatientStore } from '@/stores/store-patient';

export function ResetButton() {
  const reset = usePatientStore((s) => s.reset);
  const onClick = () => {
    reset();
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  return (
    <Button variant="ghost" size="sm" onClick={onClick} title="ลองอาการอื่น">
      <RotateCcw className="size-3.5" />
      ลองอาการอื่น
    </Button>
  );
}
