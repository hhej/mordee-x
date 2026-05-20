import { cn } from "@/lib/utils";

export function GlassCard({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "glass rounded-2xl p-6 transition-all duration-300 hover:shadow-lg",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
