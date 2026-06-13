"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { GridBackground } from "@/components/auth/GridBackground";

type Period = "monthly" | "weekly";

interface UsageRow {
  period: string;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  requests: number;
}

interface UsageData {
  tokensUsed: number;
  creditLimit: number;
  breakdown: UsageRow[];
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatPeriodLabel(key: string, period: Period): string {
  if (period === "monthly") {
    const [y, m] = key.split("-");
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  const d = new Date(key + "T00:00:00Z");
  const end = new Date(d);
  end.setUTCDate(d.getUTCDate() + 6);
  const s = d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const e = end.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return `${s} – ${e}`;
}

export default function UsagePage() {
  const [period, setPeriod] = useState<Period>("monthly");
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/usage?period=${period}`);
      if (!res.ok) { setError("Failed to load usage data."); return; }
      const json = await res.json() as UsageData;
      setData(json);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const pct = data && data.creditLimit > 0 ? Math.min((data.tokensUsed / data.creditLimit) * 100, 100) : 0;
  const hasLimit = (data?.creditLimit ?? 0) > 0;
  const barColor = pct >= 95 ? "#ef4444" : pct >= 80 ? "#f59e0b" : "#c4a882";

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden" style={{ background: "#1a1414" }}>
      <GridBackground />

      {/* Nav */}
      <header
        className="sticky top-0 z-40 flex items-center px-6 backdrop-blur-md"
        style={{ height: 52, borderBottom: "1px solid #2a2222", background: "rgba(26,20,20,0.92)" }}
      >
        <div className="max-w-5xl w-full mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs transition-colors"
            style={{ color: "#52403f" }}
          >
            <ArrowLeft size={13} />
            Back to projects
          </Link>
          <span
            style={{
              fontFamily: "'Satoshi', var(--font-geist-sans), sans-serif",
              fontSize: 18,
              fontWeight: 700,
              color: "#f4f4f5",
              letterSpacing: "-0.03em",
            }}
          >
            Nucode
          </span>
        </div>
      </header>

      <main className="relative z-10 flex-1 max-w-5xl w-full mx-auto px-6 py-14">
        {/* Page title */}
        <div className="mb-12">
          <p
            className="text-[11px] uppercase tracking-[0.2em] font-semibold mb-3"
            style={{ color: "#52403f" }}
          >
            Token Usage
          </p>
          <h1
            style={{
              fontFamily: "'Satoshi', var(--font-geist-sans), sans-serif",
              fontSize: "clamp(56px, 10vw, 96px)",
              fontWeight: 700,
              color: "#f4f4f5",
              letterSpacing: "-0.05em",
              lineHeight: 0.9,
            }}
          >
            Nucode
          </h1>
          <p className="text-sm mt-4" style={{ color: "#52403f" }}>
            Your API token consumption across all Nucode pipelines.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs mb-8"
            style={{ background: "#1f1414", border: "1px solid #3a2020", color: "#f87171" }}
          >
            <AlertTriangle size={13} />
            {error}
          </div>
        )}

        {/* Top stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          {[
            {
              label: "Total consumed",
              value: data ? fmt(data.tokensUsed) : "-",
              accent: true,
            },
            {
              label: "Limit",
              value: hasLimit && data ? fmt(data.creditLimit) : "Unlimited",
              accent: false,
            },
            {
              label: "Usage",
              value: hasLimit ? `${pct.toFixed(0)}%` : "-",
              accent: false,
            },
            {
              label: "Periods tracked",
              value: data ? String(data.breakdown.length) : "-",
              accent: false,
            },
          ].map((c) => (
            <div
              key={c.label}
              className="rounded-xl px-5 py-4"
              style={{ background: "#171212", border: "1px solid #2a2222" }}
            >
              <p className="text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: "#52403f" }}>
                {c.label}
              </p>
              <p
                style={{
                  fontFamily: "'Satoshi', var(--font-geist-sans), sans-serif",
                  fontSize: 26,
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                  color: c.accent ? "#c4a882" : "#71717a",
                }}
              >
                {c.value}
              </p>
            </div>
          ))}
        </div>

        {/* Progress bar (only if limit set) */}
        {hasLimit && data && (
          <div className="mb-10 rounded-xl px-5 py-4" style={{ background: "#171212", border: "1px solid #2a2222" }}>
            <div className="flex justify-between text-[11px] mb-2.5" style={{ color: "#52403f" }}>
              <span>{fmt(data.tokensUsed)} used</span>
              <span>{fmt(data.creditLimit)} limit</span>
            </div>
            <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: "#2a2222" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: barColor }}
              />
            </div>
            {pct >= 80 && (
              <p className="mt-2 text-[11px] flex items-center gap-1.5" style={{ color: pct >= 95 ? "#ef4444" : "#f59e0b" }}>
                <AlertTriangle size={10} />
                {pct >= 95 ? "Token limit nearly reached - contact your admin." : "Approaching your token limit."}
              </p>
            )}
          </div>
        )}

        {/* Period tabs + breakdown */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: "#52403f" }}>
            Breakdown
          </p>
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: "#171212", border: "1px solid #2a2222" }}>
            {(["monthly", "weekly"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className="text-[11px] px-3 py-1.5 rounded-md font-medium capitalize transition-all"
                style={period === p
                  ? { background: "#2a2222", color: "#c4a882" }
                  : { color: "#52403f" }
                }
              >
                {p === "monthly" ? "Monthly" : "Weekly"}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="py-20 text-center text-xs" style={{ color: "#3f3535" }}>
            Loading…
          </div>
        )}

        {!loading && !error && data && data.breakdown.length === 0 && (
          <div className="py-20 text-center rounded-xl" style={{ border: "1px solid #2a2222" }}>
            <p className="text-sm" style={{ color: "#3f3535" }}>No usage recorded yet.</p>
            <p className="text-xs mt-1" style={{ color: "#2a2222" }}>
              Token data is logged after each AI request.
            </p>
          </div>
        )}

        {!loading && !error && data && data.breakdown.length > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #2a2222" }}>
            {/* Table header */}
            <div
              className="grid grid-cols-5 px-5 py-3 text-[10px] uppercase tracking-widest font-semibold"
              style={{ background: "#171212", borderBottom: "1px solid #2a2222", color: "#52403f" }}
            >
              <span className="col-span-2">Period</span>
              <span className="text-right">Requests</span>
              <span className="text-right">Input / Output</span>
              <span className="text-right">Total</span>
            </div>

            {data.breakdown.map((row, i) => {
              const rowPct = hasLimit && data.creditLimit > 0
                ? (row.total_tokens / data.creditLimit) * 100
                : 0;
              return (
                <div
                  key={row.period}
                  className="grid grid-cols-5 items-center px-5 py-4 hover:bg-[#1f1818] transition-colors"
                  style={i > 0 ? { borderTop: "1px solid #1f1818" } : {}}
                >
                  <div className="col-span-2">
                    <p className="text-sm font-medium" style={{ color: "#a1a1aa" }}>
                      {formatPeriodLabel(row.period, period)}
                    </p>
                    {hasLimit && rowPct > 0 && (
                      <div className="mt-1.5 h-0.5 w-24 rounded-full overflow-hidden" style={{ background: "#2a2222" }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.min(rowPct * 10, 100)}%`, background: "#c4a882", opacity: 0.6 }}
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-right tabular-nums" style={{ color: "#52403f" }}>
                    {row.requests}
                  </p>
                  <p className="text-xs text-right tabular-nums" style={{ color: "#52403f" }}>
                    {fmt(row.input_tokens)} / {fmt(row.output_tokens)}
                  </p>
                  <p className="text-sm font-semibold text-right tabular-nums" style={{ color: "#c4a882" }}>
                    {fmt(row.total_tokens)}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-[11px] mt-8" style={{ color: "#2a2222" }}>
          The complete Nutrient demo platform - engineered by Vinayak Kamboj
        </p>
      </main>
    </div>
  );
}
