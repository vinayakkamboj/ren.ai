import type { Metadata } from "next";
import {
  DataTable,
  PageHeader,
  Panel,
  StatCard,
  StatusBadge,
} from "@/components/platform/widgets";
import { evalReports } from "@/lib/data/platform";

export const metadata: Metadata = { title: "Evaluation reports" };

export default function EvaluationsPage() {
  return (
    <>
      <PageHeader
        title="Evaluation reports"
        description="Every Ledger run with a reportable verdict. Regressions block release until resolved or explicitly waived by the evaluation review board."
        action={
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-dusk-faint">
            312 runs this week
          </span>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Pass" value="4" detail="of 6 reportable this period" trend="up" />
        <StatCard
          label="Regressions"
          value="1"
          detail="instruction adherence @ 8h · blocking rc"
          trend="down"
        />
        <StatCard label="Under review" value="1" detail="ren-3-fast calibration drift" />
      </div>

      <Panel className="mt-4" title="Reports" padded={false}>
        <DataTable
          headers={["Report", "Model", "Suite", "Score", "Δ", "95% CI", "Harness", "Date", "Verdict"]}
          align={["l", "l", "l", "r", "r", "r", "l", "r", "l"]}
          rows={evalReports.map((ev) => [
            <span key="i" className="font-mono text-[12px] text-dusk-muted">{ev.id}</span>,
            <span key="m" className="font-mono text-[12.5px] text-dusk">{ev.model}</span>,
            ev.suite,
            ev.score.toFixed(1),
            <span key="d" className={ev.delta >= 0 ? "text-signal-green" : "text-signal-red"}>
              {ev.delta >= 0 ? "+" : ""}
              {ev.delta.toFixed(1)}
            </span>,
            <span key="ci" className="text-dusk-muted">{ev.interval}</span>,
            <span key="h" className="font-mono text-[11.5px] text-dusk-muted">{ev.harness}</span>,
            <span key="dt" className="text-dusk-muted">{ev.date}</span>,
            <StatusBadge key="v" status={ev.verdict} />,
          ])}
        />
      </Panel>

      <Panel className="mt-4" title="Open regression · ev-7729">
        <p className="max-w-[80ch] text-[13px] leading-relaxed text-dusk-muted">
          Instruction adherence at the 8-hour horizon dropped 1.9 points on
          ren-3.2-large-rc1 relative to production. Bisection points to the
          envset-9 RL mixture; the agents team is re-running with the
          adherence-weighted curriculum from exp-0934. rc2 shows partial
          recovery (+1.1) — release review will decide whether to ship or hold.
        </p>
      </Panel>
    </>
  );
}
