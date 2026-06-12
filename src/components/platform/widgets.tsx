import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-serif text-[1.7rem] font-normal tracking-tight text-dusk">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-[64ch] text-[13.5px] leading-relaxed text-dusk-muted">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Panel({
  title,
  meta,
  className,
  children,
  padded = true,
}: {
  title?: string;
  meta?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  padded?: boolean;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-carbon-line bg-carbon-raised",
        className,
      )}
    >
      {title ? (
        <header className="flex items-center justify-between gap-4 border-b border-carbon-line px-5 py-3.5">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-dusk-muted">
            {title}
          </h2>
          {meta}
        </header>
      ) : null}
      <div className={cn(padded && "p-5")}>{children}</div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  detail,
  trend,
}: {
  label: string;
  value: string;
  detail?: string;
  trend?: "up" | "down" | "flat";
}) {
  return (
    <div className="rounded-xl border border-carbon-line bg-carbon-raised p-5">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-dusk-faint">
        {label}
      </p>
      <p className="tnum mt-2.5 font-serif text-[1.9rem] leading-none tracking-tight text-dusk">
        {value}
      </p>
      {detail ? (
        <p
          className={cn(
            "tnum mt-2.5 text-[12px]",
            trend === "up" && "text-signal-green",
            trend === "down" && "text-signal-red",
            (!trend || trend === "flat") && "text-dusk-muted",
          )}
        >
          {detail}
        </p>
      ) : null}
    </div>
  );
}

const statusTones: Record<string, string> = {
  running: "bg-signal-green/15 text-signal-green",
  completed: "bg-carbon-high text-dusk-muted",
  failed: "bg-signal-red/15 text-signal-red",
  queued: "bg-signal-amber/15 text-signal-amber",
  paused: "bg-carbon-high text-dusk-muted",
  healthy: "bg-signal-green/15 text-signal-green",
  degraded: "bg-signal-amber/15 text-signal-amber",
  draining: "bg-carbon-high text-dusk-muted",
  production: "bg-signal-green/15 text-signal-green",
  staging: "bg-signal-amber/15 text-signal-amber",
  research: "bg-brass/15 text-brass",
  deprecated: "bg-carbon-high text-dusk-faint",
  pass: "bg-signal-green/15 text-signal-green",
  regression: "bg-signal-red/15 text-signal-red",
  review: "bg-signal-amber/15 text-signal-amber",
  screened: "bg-signal-green/15 text-signal-green",
  pending: "bg-signal-amber/15 text-signal-amber",
  flagged: "bg-signal-red/15 text-signal-red",
  concluded: "bg-carbon-high text-dusk-muted",
  analyzing: "bg-signal-amber/15 text-signal-amber",
  nominal: "bg-signal-green/15 text-signal-green",
  attention: "bg-signal-amber/15 text-signal-amber",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em]",
        statusTones[status] ?? "bg-carbon-high text-dusk-muted",
      )}
    >
      {status}
    </span>
  );
}

export function DataTable({
  headers,
  rows,
  align,
}: {
  headers: string[];
  rows: React.ReactNode[][];
  /** "r" right-aligns the column at that index */
  align?: ("l" | "r")[];
}) {
  return (
    <div className="platform-scroll overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th
                key={h}
                className={cn(
                  "border-b border-carbon-line px-5 py-3 font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-dusk-faint",
                  align?.[i] === "r" && "text-right",
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              className="group border-b border-carbon-line/60 transition-colors duration-150 last:border-b-0 hover:bg-carbon-high/40"
            >
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={cn(
                    "tnum px-5 py-3.5 text-[13px] text-dusk",
                    align?.[ci] === "r" && "text-right",
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ProgressBar({
  value,
  tone = "brass",
  className,
}: {
  value: number;
  tone?: "brass" | "green" | "amber" | "red";
  className?: string;
}) {
  const tones = {
    brass: "bg-brass",
    green: "bg-signal-green",
    amber: "bg-signal-amber",
    red: "bg-signal-red",
  };
  return (
    <div className={cn("h-[5px] w-full overflow-hidden rounded-full bg-carbon-high", className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-500", tones[tone])}
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  );
}

/** Minimal inline SVG sparkline. */
export function Sparkline({
  data,
  className,
  stroke = "var(--color-brass)",
  width = 120,
  height = 32,
}: {
  data: number[];
  className?: string;
  stroke?: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) {
    return <span className="font-mono text-[11px] text-dusk-faint">—</span>;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 3;
  const pts = data
    .map((v, i) => {
      const x = pad + (i * (width - pad * 2)) / (data.length - 1);
      const y = height - pad - ((v - min) / range) * (height - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
      aria-hidden
    >
      <polyline
        points={pts}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Vertical bar chart used for API analytics and benchmark deltas. */
export function BarChart({
  data,
  height = 180,
  formatValue = (v) => String(v),
}: {
  data: { label: string; value: number }[];
  height?: number;
  formatValue?: (v: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value)) || 1;
  return (
    <div>
      <div className="flex items-end gap-[6px]" style={{ height }}>
        {data.map((d) => (
          <div key={d.label} className="group relative flex h-full flex-1 flex-col justify-end">
            <div
              className="rounded-t-[3px] bg-brass/70 transition-colors duration-200 group-hover:bg-brass"
              style={{ height: `${(d.value / max) * 100}%` }}
            />
            <div className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-carbon-line-strong bg-carbon px-2 py-1 font-mono text-[10px] text-dusk opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              {d.label} · {formatValue(d.value)}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between font-mono text-[9.5px] uppercase tracking-[0.08em] text-dusk-faint">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}
