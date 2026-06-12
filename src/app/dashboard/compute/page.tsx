import type { Metadata } from "next";
import {
  PageHeader,
  Panel,
  ProgressBar,
  Sparkline,
  StatCard,
  StatusBadge,
} from "@/components/platform/widgets";
import { gpuClusters, platformStats } from "@/lib/data/platform";

export const metadata: Metadata = { title: "GPU utilization" };

export default function ComputePage() {
  return (
    <>
      <PageHeader
        title="GPU utilization"
        description="Fleet allocation across the three Kiln clusters. Utilization sampled per minute; the series below shows the trailing 12 hours."
        action={
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-dusk-faint">
            {platformStats.totalGpus.toLocaleString()} GPUs total
          </span>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Fleet utilization" value={`${platformStats.meanUtilization}%`} detail="weighted by cluster size" trend="up" />
        <StatCard label="Power draw" value="18.7 MW" detail="of 24 MW provisioned" />
        <StatCard label="Hardware health" value="99.2%" detail="61 nodes cordoned for maintenance" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        {gpuClusters.map((cluster) => (
          <Panel
            key={cluster.id}
            title={cluster.name}
            meta={<StatusBadge status={cluster.health} />}
          >
            <div className="flex items-end justify-between">
              <div>
                <p className="tnum font-serif text-[2.2rem] leading-none text-dusk">
                  {cluster.utilization}%
                </p>
                <p className="mt-2 font-mono text-[11px] text-dusk-faint">
                  {cluster.gpus.toLocaleString()} GPUs · {cluster.power}
                </p>
              </div>
              <Sparkline data={cluster.utilizationSeries} width={110} height={36} />
            </div>

            <div className="mt-6 space-y-3 border-t border-carbon-line pt-5">
              {cluster.allocations.map((a) => (
                <div key={a.team} className="grid grid-cols-[8.5rem_1fr_2.6rem] items-center gap-3">
                  <span className="truncate text-[12px] text-dusk-muted">{a.team}</span>
                  <ProgressBar
                    value={a.share}
                    tone={a.team === "Headroom" ? "green" : "brass"}
                  />
                  <span className="tnum text-right font-mono text-[11px] text-dusk-muted">
                    {a.share}%
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        ))}
      </div>

      <Panel className="mt-4" title="Scheduler note">
        <p className="max-w-[80ch] text-[13px] leading-relaxed text-dusk-muted">
          Kiln Serve flagged for attention: utilization headroom is below the
          12% reserve policy during EU peak hours. Capacity review proposes
          shifting 256 GPUs from Kiln East post-run-4127, or accelerating the
          serve-pool expansion scheduled for July. Decision owner: infra
          steering, Tuesday.
        </p>
      </Panel>
    </>
  );
}
