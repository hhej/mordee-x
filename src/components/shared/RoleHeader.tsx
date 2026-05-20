import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type RoleHeaderProps = {
  title: string;
  subtitle?: string;
};

export function RoleHeader({ title, subtitle }: RoleHeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-5 md:px-12">
      <Link
        href="/"
        className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-mint-700"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>MorDee+ 🌿</span>
      </Link>
      <div className="text-right">
        <div className="text-sm font-semibold text-ink md:text-base">
          {title}
        </div>
        {subtitle ? (
          <div className="text-xs text-muted-foreground">{subtitle}</div>
        ) : null}
      </div>
    </header>
  );
}
