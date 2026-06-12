import { cn } from "@/lib/utils";

export function Badge({
  className,
  children,
  tone = "neutral",
}: {
  className?: string;
  children: React.ReactNode;
  tone?: "neutral" | "bronze" | "outline";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em]",
        tone === "neutral" && "bg-paper-deep text-graphite",
        tone === "bronze" && "bg-bronze-wash text-bronze-deep",
        tone === "outline" && "border border-line text-graphite",
        className,
      )}
    >
      {children}
    </span>
  );
}
