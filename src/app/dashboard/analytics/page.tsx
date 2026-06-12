import type { Metadata } from "next";
import {
  BarChart,
  DataTable,
  PageHeader,
  Panel,
  StatCard,
} from "@/components/platform/widgets";
import { apiAnalytics } from "@/lib/data/platform";

export const metadata: Metadata = { title: "API analytics" };

export default function AnalyticsPage() {
  const latest = apiAnalytics[apiAnalytics.length - 1];
  const totalRequests = apiAnalytics.reduce((a, d) => a + d.requests, 0);

  return (
    <>
      <PageHeader
        title="API analytics"
        description="Production traffic across all regions, trailing 14 days. Latency budgets: p50 ≤ 650ms, p99 ≤ 3000ms on ren-3-large."
        action={
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-dusk-faint">
            all regions · UTC
          </span>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Requests (14d)" value={`${(totalRequests / 1000).toFixed(2)}B`} detail="+18.4% vs previous period" trend="up" />
        <StatCard label="p50 latency" value={`${latest.latencyP50}ms`} detail="budget 650ms · within budget" trend="up" />
        <StatCard label="p99 latency" value={`${latest.latencyP99}ms`} detail="budget 3000ms · within budget" trend="up" />
        <StatCard label="Error rate" value={`${latest.errorRate}%`} detail="SLO 0.10% · within objective" trend="up" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel title="Requests per day" meta={<span className="font-mono text-[11px] text-dusk-faint">millions</span>}>
          <BarChart
            data={apiAnalytics.map((d) => ({ label: d.label, value: d.requests }))}
            formatValue={(v) => `${v}M`}
          />
        </Panel>
        <Panel title="p50 latency" meta={<span className="font-mono text-[11px] text-dusk-faint">milliseconds</span>}>
          <BarChart
            data={apiAnalytics.map((d) => ({ label: d.label, value: d.latencyP50 }))}
            formatValue={(v) => `${v}ms`}
          />
        </Panel>
      </div>

      <Panel className="mt-4" title="Daily detail" padded={false}>
        <DataTable
          headers={["Date", "Requests", "p50", "p99", "Error rate"]}
          align={["l", "r", "r", "r", "r"]}
          rows={[...apiAnalytics].reverse().map((d) => [
            d.label,
            `${d.requests}M`,
            `${d.latencyP50}ms`,
            `${d.latencyP99}ms`,
            <span key="e" className={d.errorRate > 0.08 ? "text-signal-amber" : undefined}>
              {d.errorRate.toFixed(2)}%
            </span>,
          ])}
        />
      </Panel>
    </>
  );
}
