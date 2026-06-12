import type { Metadata } from "next";
import {
  DataTable,
  PageHeader,
  Panel,
  StatCard,
  StatusBadge,
} from "@/components/platform/widgets";
import { datasets } from "@/lib/data/platform";

export const metadata: Metadata = { title: "Datasets" };

export default function DatasetsPage() {
  return (
    <>
      <PageHeader
        title="Dataset management"
        description="Training corpora with full provenance. Nothing enters a run without a contamination screen against the active benchmark suite."
        action={
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-dusk-faint">
            {datasets.length} active
          </span>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total tokens" value="3.96T" detail="across active corpora" />
        <StatCard
          label="Contamination screens"
          value="5 / 6"
          detail="1 flagged — quarantined from training"
          trend="down"
        />
        <StatCard label="Provenance coverage" value="100%" detail="every document traceable to source" trend="up" />
      </div>

      <Panel className="mt-4" title="Corpora" padded={false}>
        <DataTable
          headers={["Dataset", "Domain", "Size", "Tokens", "Provenance", "Contamination", "Updated"]}
          align={["l", "l", "r", "r", "l", "l", "r"]}
          rows={datasets.map((d) => [
            <span key="n" className="font-mono text-[12.5px] text-dusk">{d.name}</span>,
            d.domain,
            d.size,
            d.tokens,
            <span key="p" className="capitalize text-dusk-muted">{d.provenance}</span>,
            <StatusBadge key="c" status={d.contamination} />,
            <span key="u" className="text-dusk-muted">{d.updated}</span>,
          ])}
        />
      </Panel>

      <Panel className="mt-4" title="Quarantine note">
        <p className="max-w-[80ch] text-[13px] leading-relaxed text-dusk-muted">
          <span className="font-mono text-signal-red">partner-engineering-repos-v2</span>{" "}
          was flagged on June 2 after the screen matched 41 files against
          SWE-bench Verified task repositories. The corpus is excluded from all
          runs pending re-curation; affected benchmark results are unaffected
          (the corpus has never entered training). Per policy, the incident is
          logged publicly in the methodology portal.
        </p>
      </Panel>
    </>
  );
}
