import { Construction } from "lucide-react";

type EmptyStateProps = {
  title: string;
  titleEn?: string;
  phase: string;
};

export function EmptyState({ title, titleEn, phase }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex items-center gap-2 text-mint-700">
        <Construction className="h-5 w-5" />
        <h3 className="text-lg font-semibold">{title}</h3>
        {titleEn ? (
          <span className="text-sm font-normal text-muted-foreground">
            · {titleEn}
          </span>
        ) : null}
      </div>
      <p className="text-sm text-muted-foreground">
        ⏳ ส่วนนี้จะมาใน {phase} · Coming in {phase}
      </p>
    </div>
  );
}
