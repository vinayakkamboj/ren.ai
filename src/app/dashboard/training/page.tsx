import type { Metadata } from "next";
import {
  DataTable,
  PageHeader,
  Panel,
  ProgressBar,
  Sparkline,
  StatCard,
  StatusBadge,
} from "@/components/platform/widgets";
import { trainingRuns } from "@/lib/data/platform";

export const metadata: Metadata = { title: "Training runs" };

export default function TrainingPage() {
  const totalGpusInUse = trainingRuns
    .filter((r) => r.status === "running")
    .reduce((a, r) => a + r.gpus, 0);

  return (
    <>
      <PageHeader
        title="Training runs"
        description="Live and recent runs across Kiln West and Kiln East. Loss curves sampled hourly; alerts route to the owning team."
        action={
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-dusk-faint">
            {totalGpusInUse.toLocaleString()} GPUs allocated
          </span>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Running" value={String(trainingRuns.filter((r) => r.status === "running").length)} detail="ren-4 pretrain + ren-3.2 RL" />
        <StatCard label="Failed (7d)" value="1" detail="run-4118 · router divergence at 0.18T" trend="down" />
        <StatCard label="Cluster queue depth" value={String(trainingRuns.filter((r) => r.status === "queued").length)} detail="est. start in 9h" />
      </div>

      <Panel className="mt-4" title="All runs" padded={false}>
        <DataTable
          headers={["Run", "Status", "Progress", "Loss", "Curve", "Tokens", "GPUs", "Cluster", "Owner"]}
          align={["l", "l", "l", "r", "l", "r", "r", "l", "l"]}
          rows={trainingRuns.map((r) => [
            <div key="n">
              <span className="font-mono text-[12.5px] text-dusk">{r.name}</span>
              <p className="mt-0.5 font-mono text-[10.5px] text-dusk-faint">{r.model}</p>
            </div>,
            <StatusBadge key="s" status={r.status} />,
            <div key="p" className="flex w-32 items-center gap-2.5">
              <ProgressBar
                value={r.progress}
                tone={r.status === "failed" ? "red" : r.status === "completed" ? "green" : "brass"}
              />
              <span className="tnum font-mono text-[11px] text-dusk-muted">{r.progress}%</span>
            </div>,
            r.status === "queued" ? (
              <span key="l" className="text-dusk-faint">—</span>
            ) : (
              <span key="l">
                {r.loss.toFixed(3)}{" "}
                <span className={r.lossDelta <= 0 ? "text-signal-green" : "text-signal-red"}>
                  {r.lossDelta > 0 ? "+" : ""}
                  {r.lossDelta.toFixed(3)}
                </span>
              </span>
            ),
            <Sparkline
              key="c"
              data={r.lossCurve}
              width={88}
              height={24}
              stroke={r.status === "failed" ? "var(--color-signal-red)" : "var(--color-brass)"}
            />,
            r.tokensSeen,
            r.gpus.toLocaleString(),
            <span key="cl" className="font-mono text-[12px] text-dusk-muted">{r.cluster}</span>,
            <span key="o" className="text-dusk-muted">{r.owner}</span>,
          ])}
        />
      </Panel>
    </>
  );
}
