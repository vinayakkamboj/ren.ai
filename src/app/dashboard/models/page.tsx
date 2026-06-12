import type { Metadata } from "next";
import {
  DataTable,
  PageHeader,
  Panel,
  StatCard,
  StatusBadge,
} from "@/components/platform/widgets";
import { modelRegistry } from "@/lib/data/platform";

export const metadata: Metadata = { title: "Model registry" };

export default function ModelRegistryPage() {
  return (
    <>
      <PageHeader
        title="Model registry"
        description="Every model artifact with a serving identity — production, staging, and research checkpoints. Composite scores from the latest Ledger run."
        action={
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-dusk-faint">
            {modelRegistry.length} registered
          </span>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="In production"
          value={String(modelRegistry.filter((m) => m.stage === "production").length)}
          detail="ren-3-large · ren-3-fast · ren-2-large"
        />
        <StatCard label="Release candidates" value="1" detail="ren-3.2-large-rc2 · review Monday" trend="up" />
        <StatCard label="Research checkpoints" value="161" detail="ren-4-base, evaluated every 10B tokens" />
      </div>

      <Panel className="mt-4" title="Registry" padded={false}>
        <DataTable
          headers={["Model", "Family", "Stage", "Context", "Composite", "Checkpoints", "Regions", "Released"]}
          align={["l", "l", "l", "r", "r", "r", "r", "r"]}
          rows={modelRegistry.map((m) => [
            <span key="n" className="font-mono text-[12.5px] text-dusk">{m.name}</span>,
            m.family,
            <StatusBadge key="s" status={m.stage} />,
            m.context,
            <span key="c" className={m.composite >= 78 ? "text-brass" : undefined}>
              {m.composite.toFixed(1)}
            </span>,
            String(m.checkpoints),
            String(m.servingRegions),
            <span key="r" className="text-dusk-muted">{m.released}</span>,
          ])}
        />
      </Panel>
    </>
  );
}
