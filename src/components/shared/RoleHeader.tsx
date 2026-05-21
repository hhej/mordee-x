import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

type RoleHeaderProps = {
  title: string;
  subtitle?: string;
  /** Optional slot rendered to the left of the title block (e.g. persona popover + reset). */
  actions?: ReactNode;
};

export function RoleHeader({ title, subtitle, actions }: RoleHeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-5 md:px-12">
      <Link
        href="/"
        className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-mint-700"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>MorDee+ 🌿</span>
      </Link>
      <div className="flex items-center gap-3">
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        <div className="text-right">
          <div className="text-sm font-semibold text-ink md:text-base">
            {title}
          </div>
          {subtitle ? (
            <div className="text-xs text-muted-foreground">{subtitle}</div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
