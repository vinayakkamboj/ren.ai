import type { Metadata } from "next";
import {
  PageHeader,
  Panel,
  StatusBadge,
} from "@/components/platform/widgets";
import { experiments } from "@/lib/data/platform";

export const metadata: Metadata = { title: "Experiments" };

export default function ExperimentsPage() {
  return (
    <>
      <PageHeader
        title="Experiment comparison"
        description="Hypothesis-driven A/B comparisons. Significance computed by Ledger with pre-registered analysis plans — no peeking, no p-hacking."
        action={
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-dusk-faint">
            {experiments.length} tracked
          </span>
        }
      />

      <div className="grid gap-4 xl:grid-cols-2">
        {experiments.map((exp) => {
          const improvedDown = exp.metric.includes("error") || exp.metric.includes("Exploits");
          const improved = improvedDown
            ? exp.variantScore < exp.baselineScore
            : exp.variantScore > exp.baselineScore;
          const max = Math.max(exp.baselineScore, exp.variantScore) || 1;
          return (
            <Panel key={exp.id} title={exp.id} meta={<StatusBadge status={exp.status} />}>
              <h3 className="max-w-[48ch] text-[14.5px] leading-relaxed text-dusk">
                {exp.hypothesis}
              </h3>
              <p className="mt-2 font-mono text-[11px] text-dusk-faint">
                owner · {exp.owner} &nbsp;·&nbsp; metric · {exp.metric} &nbsp;·&nbsp; {exp.significance}
              </p>

              <div className="mt-6 space-y-4">
                {[
                  { name: exp.baseline, score: exp.baselineScore, variant: false },
                  { name: exp.variant, score: exp.variantScore, variant: true },
                ].map((arm) => (
                  <div key={arm.name} className="grid grid-cols-[10rem_1fr_3.5rem] items-center gap-4">
                    <span className="truncate font-mono text-[11.5px] text-dusk-muted">
                      {arm.name}
                    </span>
                    <div className="h-[6px] overflow-hidden rounded-full bg-carbon-high">
                      <div
                        className={
                          arm.variant
                            ? improved
                              ? "h-full rounded-full bg-brass"
                              : "h-full rounded-full bg-signal-amber"
                            : "h-full rounded-full bg-carbon-line-strong"
                        }
                        style={{ width: `${(arm.score / max) * 100}%` }}
                      />
                    </div>
                    <span
                      className={`tnum text-right font-mono text-[12px] ${
                        arm.variant ? "text-dusk" : "text-dusk-muted"
                      }`}
                    >
                      {arm.score.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>

              <p className="mt-5 border-t border-carbon-line pt-3.5 font-mono text-[11px] text-dusk-muted">
                Δ{" "}
                <span className={improved ? "text-signal-green" : "text-signal-amber"}>
                  {(exp.variantScore - exp.baselineScore > 0 ? "+" : "") +
                    (exp.variantScore - exp.baselineScore).toFixed(1)}
                </span>{" "}
                {improvedDown ? "(lower is better)" : ""}
              </p>
            </Panel>
          );
        })}
      </div>
    </>
  );
}
