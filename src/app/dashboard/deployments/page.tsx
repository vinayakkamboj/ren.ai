import type { Metadata } from "next";
import {
  DataTable,
  PageHeader,
  Panel,
  ProgressBar,
  StatCard,
  StatusBadge,
} from "@/components/platform/widgets";
import { deployments } from "@/lib/data/platform";

export const metadata: Metadata = { title: "Deployments" };

export default function DeploymentsPage() {
  return (
    <>
      <PageHeader
        title="Deployment monitoring"
        description="Serving fleet across nine regions. Uptime SLA 99.95% on production tiers; one region degraded, mitigation in progress."
        action={
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-dusk-faint">
            {deployments.length} deployments
          </span>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Healthy" value={String(deployments.filter((d) => d.status === "healthy").length)} detail="of 6 deployments" trend="up" />
        <StatCard label="Degraded" value="1" detail="eu-west-1 · elevated p99 since 04:10 UTC" trend="down" />
        <StatCard label="Fleet uptime (30d)" value="99.97%" detail="SLA 99.95% · met" trend="up" />
      </div>

      <Panel className="mt-4" title="Serving fleet" padded={false}>
        <DataTable
          headers={["Deployment", "Model", "Region", "Traffic", "Uptime (30d)", "p50", "Version", "Status"]}
          align={["l", "l", "l", "l", "r", "r", "l", "l"]}
          rows={deployments.map((d) => [
            <span key="i" className="font-mono text-[12px] text-dusk-muted">{d.id}</span>,
            <span key="m" className="font-mono text-[12.5px] text-dusk">{d.model}</span>,
            d.region,
            <div key="t" className="flex w-28 items-center gap-2.5">
              <ProgressBar value={d.traffic} />
              <span className="tnum font-mono text-[11px] text-dusk-muted">{d.traffic}%</span>
            </div>,
            <span key="u" className={d.uptime < 99.95 ? "text-signal-amber" : undefined}>
              {d.uptime.toFixed(2)}%
            </span>,
            `${d.latencyP50}ms`,
            <span key="v" className="font-mono text-[11.5px] text-dusk-muted">{d.version}</span>,
            <StatusBadge key="s" status={d.status} />,
          ])}
        />
      </Panel>

      <Panel className="mt-4" title="Active incident · eu-west-1">
        <p className="max-w-[80ch] text-[13px] leading-relaxed text-dusk-muted">
          Elevated p99 latency on ren-3-fast in eu-west-1 following the 3.1.3 →
          3.1.4 rollout pause. Traffic is being rebalanced toward eu-central-1
          while the node pool recycles. Customer impact: p99 +320ms on ~9% of
          EU traffic; error rate unaffected. Postmortem will publish to the
          public status page per policy.
        </p>
      </Panel>
    </>
  );
}
