'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PrintableDocProps {
  children: ReactNode;
}

/** Wraps a printable A4-style document (medical certificate, self-care plan).
 *
 *  Shows an on-screen preview + a Print button. For printing it renders a second
 *  copy of the document into a portal at the <body> root; the print stylesheet
 *  (globals.css `.mordee-print-doc`) then hides every *other* body child so only
 *  this document prints. This avoids the blank-page bug the old `visibility:
 *  hidden` approach had — hidden elements keep their layout box, so the tall app
 *  shell (chat transcript, cards) still padded the printout to many pages. */
export function PrintableDoc({ children }: PrintableDocProps) {
  const [mounted, setMounted] = useState(false);
  // Portal target (document.body) only exists on the client.
  useEffect(() => setMounted(true), []);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-end">
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="size-3.5" />
          พิมพ์ / Print
        </Button>
      </div>

      {/* On-screen preview */}
      <div className="mx-auto w-full max-w-2xl">{children}</div>

      {/* Print-only copy, portaled to <body> so it prints alone */}
      {mounted
        ? createPortal(
            <div className="mordee-print-doc">
              <div className="mx-auto w-full max-w-2xl">{children}</div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
