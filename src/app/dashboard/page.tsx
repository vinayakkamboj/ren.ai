import Link from "next/link";
import {
  PageHeader,
  Panel,
  StatCard,
  StatusBadge,
  ProgressBar,
  Sparkline,
} from "@/components/platform/widgets";
import {
  apiAnalytics,
  evalReports,
  gpuClusters,
  platformStats,
  trainingRuns,
} from "@/lib/data/platform";

export default function OverviewPage() {
  const activeRuns = trainingRuns.filter(
    (r) => r.status === "running" || r.status === "queued",
  );
  const latestEvals = evalReports.slice(0, 4);
  const todayRequests = apiAnalytics[apiAnalytics.length - 1];

  return (
    <>
      <PageHeader
        title="Overview"
        description="Friday, June 12, 2026 · Kiln clusters nominal · ren-3.2 release review scheduled Monday"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active training runs"
          value={String(platformStats.activeRuns)}
          detail={`${platformStats.queuedRuns} queued`}
        />
        <StatCard
          label="Fleet utilization"
          value={`${platformStats.meanUtilization}%`}
          detail={`${platformStats.totalGpus.toLocaleString()} GPUs across 3 clusters`}
          trend="up"
        />
        <StatCard
          label="Evals this week"
          value={String(platformStats.evalsThisWeek)}
          detail="1 regression flagged"
          trend="flat"
        />
        <StatCard
          label="API requests (today)"
          value={`${todayRequests.requests}M`}
          detail={`p50 ${todayRequests.latencyP50}ms · err ${todayRequests.errorRate}%`}
          trend="up"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Panel
          title="Training runs"
          meta={
            <Link href="/dashboard/training" className="font-mono text-[11px] text-brass transition-colors hover:text-dusk">
              View all →
            </Link>
          }
          padded={false}
        >
          <ul>
            {activeRuns.map((run) => (
              <li
                key={run.id}
                className="flex items-center gap-5 border-b border-carbon-line/60 px-5 py-4 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <p className="truncate font-mono text-[12.5px] text-dusk">{run.name}</p>
                    <StatusBadge status={run.status} />
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-dusk-faint">
                    {run.model} · {run.gpus.toLocaleString()} GPUs · {run.cluster}
                  </p>
                  <ProgressBar value={run.progress} className="mt-2.5 max-w-sm" />
                </div>
                <div className="hidden text-right sm:block">
                  <p className="tnum font-mono text-[12.5px] text-dusk">
                    {run.status === "queued" ? "—" : `loss ${run.loss.toFixed(3)}`}
                  </p>
                  <Sparkline data={run.lossCurve} width={96} height={26} className="mt-1" />
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="GPU clusters"
          meta={
            <Link href="/dashboard/compute" className="font-mono text-[11px] text-brass transition-colors hover:text-dusk">
              Detail →
            </Link>
          }
          padded={false}
        >
          <ul>
            {gpuClusters.map((c) => (
              <li key={c.id} className="border-b border-carbon-line/60 px-5 py-4 last:border-b-0">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] text-dusk">{c.name}</p>
                  <StatusBadge status={c.health} />
                </div>
                <div className="mt-2 flex items-center gap-4">
                  <ProgressBar
                    value={c.utilization}
                    tone={c.utilization > 90 ? "amber" : "brass"}
                    className="flex-1"
                  />
                  <span className="tnum w-20 text-right font-mono text-[11.5px] text-dusk-muted">
                    {c.utilization}% · {(c.gpus / 1024).toFixed(0)}k
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel
          title="Latest evaluations"
          meta={
            <Link href="/dashboard/evaluations" className="font-mono text-[11px] text-brass transition-colors hover:text-dusk">
              Reports →
            </Link>
          }
          padded={false}
        >
          <ul>
            {latestEvals.map((ev) => (
              <li
                key={ev.id}
                className="flex items-center justify-between gap-4 border-b border-carbon-line/60 px-5 py-3.5 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] text-dusk">{ev.suite}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-dusk-faint">{ev.model}</p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <span className="tnum font-mono text-[12.5px] text-dusk">
                    {ev.score.toFixed(1)}
                    <span className={ev.delta >= 0 ? "text-signal-green" : "text-signal-red"}>
                      {" "}
                      {ev.delta >= 0 ? "+" : ""}
                      {ev.delta.toFixed(1)}
                    </span>
                  </span>
                  <StatusBadge status={ev.verdict} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="API requests · trailing 14 days" meta={<span className="font-mono text-[11px] text-dusk-faint">millions / day</span>}>
          <div className="flex items-end gap-1.5" style={{ height: 150 }}>
            {apiAnalytics.map((d) => {
              const max = Math.max(...apiAnalytics.map((x) => x.requests));
              return (
                <div key={d.label} className="group relative flex h-full flex-1 flex-col justify-end">
                  <div
                    className="rounded-t-[3px] bg-brass/70 transition-colors duration-200 group-hover:bg-brass"
                    style={{ height: `${(d.requests / max) * 100}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between font-mono text-[9.5px] uppercase tracking-[0.08em] text-dusk-faint">
            <span>{apiAnalytics[0].label}</span>
            <span>{apiAnalytics[apiAnalytics.length - 1].label}</span>
          </div>
        </Panel>
      </div>
    </>
  );
}
