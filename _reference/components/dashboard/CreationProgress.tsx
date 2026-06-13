"use client";

import { cn } from "@/lib/utils";

interface CreationProgressProps {
  steps: string[];
  activeIndex: number;
  isLoading?: boolean;
  loadingLabel?: string;
  className?: string;
}

export function CreationProgress({
  steps,
  activeIndex,
  isLoading = false,
  loadingLabel = "Creating project...",
  className,
}: CreationProgressProps) {
  const safeIndex = Math.min(Math.max(activeIndex, 0), Math.max(steps.length - 1, 0));
  const progress = steps.length <= 1 ? 100 : Math.round((safeIndex / (steps.length - 1)) * 100);

  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="flex items-center justify-between gap-2">
        {steps.map((step, index) => {
          const complete = index < safeIndex;
          const active = index === safeIndex;
          return (
            <div key={step} className="flex min-w-0 items-center gap-1.5">
              <span
                className={cn(
                  "h-2 w-2 rounded-full border transition-colors",
                  complete && "border-emerald-500/50 bg-emerald-500/60",
                  active && "border-zinc-300 bg-zinc-300",
                  !complete && !active && "border-zinc-700 bg-zinc-800"
                )}
              />
              <span
                className={cn(
                  "truncate text-[10px] font-medium",
                  active ? "text-zinc-300" : complete ? "text-emerald-500" : "text-zinc-700"
                )}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#2a2222]">
        <div
          className={cn("h-full rounded-full bg-zinc-300 transition-all duration-300", isLoading && "animate-pulse")}
          style={{ width: `${progress}%` }}
        />
      </div>
      {isLoading && (
        <p className="text-[10px] text-zinc-600">{loadingLabel}</p>
      )}
    </div>
  );
}
