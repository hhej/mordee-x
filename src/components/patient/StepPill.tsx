'use client';

import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type StepPillProps = {
  icon: ReactNode;
  label: string;
  detail?: string;
  expanded?: boolean;
  onToggle?: () => void;
  tooltip?: string;
};

const BASE =
  'flex w-full items-center gap-2.5 rounded-full bg-mint-50/80 px-4 py-2.5 text-sm text-ink ring-1 ring-mint-200/60 transition-colors';

export function StepPill({ icon, label, detail, expanded, onToggle, tooltip }: StepPillProps) {
  const content = (
    <>
      <span className="text-base leading-none">{icon}</span>
      <span className="truncate font-medium">{label}</span>
      {detail ? <span className="ml-auto text-xs text-muted-foreground">{detail}</span> : null}
      {onToggle ? (
        <ChevronDown
          aria-hidden
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
            detail ? '' : 'ml-auto',
            expanded && 'rotate-180',
          )}
        />
      ) : null}
    </>
  );

  if (!onToggle) {
    return (
      <div
        className={cn(BASE, 'cursor-default')}
        title={tooltip}
        aria-label={tooltip ? `${label} — ${tooltip}` : label}
      >
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className={cn(BASE, 'cursor-pointer hover:bg-mint-100/80 hover:ring-mint-300/70')}
    >
      {content}
    </button>
  );
}
