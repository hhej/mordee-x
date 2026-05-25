'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePatientStore } from '@/stores/store-patient';
import { useDoctorStore } from '@/stores/store-doctor';

// Demo-day recovery hatch. Cmd/Ctrl+Shift+0 nukes both Zustand stores and
// punts back to /. Silent — the landing page itself is the confirmation.
// Persona (localStorage) survives so the demo identity stays consistent.
export function ResetKeyListener() {
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || !e.shiftKey) return;
      // KeyboardEvent.code is layout-independent — "Digit0" is the top-row 0.
      if (e.code !== 'Digit0') return;
      e.preventDefault();
      usePatientStore.getState().reset();
      useDoctorStore.getState().reset();
      router.push('/');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);

  return null;
}
