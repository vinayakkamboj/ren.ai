"use client";

import { useEffect, useState } from "react";
import { Zap, AlertTriangle } from "lucide-react";

interface Credits {
  tokensUsed: number;
  creditLimit: number;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function CreditsBar() {
  const [credits, setCredits] = useState<Credits | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/credits")
      .then((r) => r.json())
      .then((d: Credits) => setCredits(d))
      .catch(() => null);
  }, []);

  if (!credits) return null;

  const { tokensUsed, creditLimit } = credits;
  const hasLimit = creditLimit > 0;
  const pct = hasLimit ? Math.min((tokensUsed / creditLimit) * 100, 100) : 0;
  const isWarning = hasLimit && pct >= 80;
  const isCritical = hasLimit && pct >= 95;

  const barColor = isCritical
    ? "#ef4444"
    : isWarning
    ? "#f59e0b"
    : "#c4a882";

  return (
    <div
      className="max-w-6xl mx-auto px-6 py-2.5 flex items-center gap-4"
    >
      <div className="flex items-center gap-1.5 shrink-0">
        {isCritical ? (
          <AlertTriangle size={12} style={{ color: "#ef4444" }} />
        ) : (
          <Zap size={12} style={{ color: "#52403f" }} />
        )}
        <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#52403f" }}>
          Credits
        </span>
      </div>

      {hasLimit ? (
        <>
          {/* Progress bar */}
          <div className="flex-1 max-w-48 h-1 rounded-full overflow-hidden" style={{ background: "#2a2222" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: barColor }}
            />
          </div>
          <span className="text-[11px] tabular-nums shrink-0" style={{ color: isCritical ? "#ef4444" : isWarning ? "#f59e0b" : "#71717a" }}>
            {fmt(tokensUsed)}
            <span style={{ color: "#3f3535" }}> / {fmt(creditLimit)}</span>
          </span>
          {isCritical && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: "#3a1515", color: "#f87171", border: "1px solid #5a2020" }}>
              Limit nearly reached
            </span>
          )}
        </>
      ) : (
        <span className="text-[11px] tabular-nums" style={{ color: "#3f3535" }}>
          {fmt(tokensUsed)} tokens used &mdash; <span style={{ color: "#2a2222" }}>no limit set</span>
        </span>
      )}
    </div>
  );
}
