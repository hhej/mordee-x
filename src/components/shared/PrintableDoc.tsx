'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PrintableDocProps {
  children: ReactNode;
}

/** Stable no-op subscribe for useSyncExternalStore — the "are we on the client"
 *  snapshot never changes after mount, so there's nothing to subscribe to. */
const subscribeNoop = () => () => {};

/** Wraps a printable A4-style document (medical certificate, self-care plan).
 *
 *  Shows an on-screen preview + a Print button. For printing it renders a second
 *  copy of the document into a portal at the <body> root; the print stylesheet
 *  (globals.css `.mordee-print-doc`) then hides every *other* body child so only
 *  this document prints. This avoids the blank-page bug the old `visibility:
 *  hidden` approach had — hidden elements keep their layout box, so the tall app
 *  shell (chat transcript, cards) still padded the printout to many pages. */
export function PrintableDoc({ children }: PrintableDocProps) {
  // Portal target (document.body) only exists on the client. useSyncExternalStore
  // gives a clean SSR(false)→client(true) read without a setState-in-effect, which
  // the React Compiler lint flags as a cascading-render risk.
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);

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
