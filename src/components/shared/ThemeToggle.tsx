'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Light/dark toggle. Position-agnostic — pass `className` for the header slot
 *  or the landing floating button. The icon is driven purely by the `.dark`
 *  class via Tailwind `dark:` utilities (not a JS theme read), so the markup is
 *  identical on server and client: no hydration mismatch, no mounted guard. */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();

  // onClick only fires post-hydration, by which point next-themes has resolved
  // the active theme, so reading it here is safe.
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={cn(className)}
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      aria-label="สลับโหมดสว่าง/มืด · Toggle light/dark mode"
      title="สลับโหมดสว่าง/มืด · Light/Dark"
    >
      <Moon className="size-3.5 dark:hidden" />
      <Sun className="hidden size-3.5 dark:block" />
    </Button>
  );
}
