import type { Metadata } from "next";
import { PageHeader, Panel, StatCard } from "@/components/platform/widgets";
import { benchmarks, capabilityAreas, compositeScores } from "@/lib/data/benchmarks";

export const metadata: Metadata = { title: "Benchmark center" };

const models = ["Ren-1", "Ren-2", "Ren-3"] as const;
const tones: Record<(typeof models)[number], string> = {
  "Ren-1": "bg-carbon-line-strong",
  "Ren-2": "bg-dusk-faint",
  "Ren-3": "bg-brass",
};

export default function BenchmarkCenterPage() {
  const composites = compositeScores();

  return (
    <>
      <PageHeader
        title="Benchmark center"
        description="The canonical suite — fifteen evaluations across seven capability areas, run by Ledger on every release candidate. These numbers feed the public site directly; there is no second set of books."
        action={
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-dusk-faint">
            ledger@9.4.1
          </span>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {composites.map((c) => (
          <StatCard
            key={c.model}
            label={`${c.model} composite`}
            value={c.score.toFixed(1)}
            detail="mean of 15 benchmarks · 95% CI ≤ ±1.5"
          />
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        {capabilityAreas.map((area) => {
          const rows = benchmarks.filter((b) => b.area === area);
          return (
            <Panel
              key={area}
              title={area}
              meta={
                <span className="font-mono text-[11px] text-dusk-faint">
                  {rows.length} benchmark{rows.length > 1 ? "s" : ""}
                </span>
              }
            >
              <div className="space-y-6">
                {rows.map((b) => (
                  <div key={b.benchmark}>
                    <div className="flex items-baseline justify-between gap-4">
                      <p className="text-[13.5px] text-dusk">{b.benchmark}</p>
                      <p className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-dusk-faint">
                        {b.metric}
                      </p>
                    </div>
                    <div className="mt-3 space-y-2">
                      {models.map((m) => (
                        <div key={m} className="grid grid-cols-[3.2rem_1fr_3rem] items-center gap-3">
                          <span className="font-mono text-[10.5px] text-dusk-faint">{m}</span>
                          <div className="h-[5px] overflow-hidden rounded-full bg-carbon-high">
                            <div
                              className={`h-full rounded-full ${tones[m]}`}
                              style={{ width: `${b.scores[m]}%` }}
                            />
                          </div>
                          <span
                            className={`tnum text-right font-mono text-[11.5px] ${
                              m === "Ren-3" ? "text-brass" : "text-dusk-muted"
                            }`}
                          >
                            {b.scores[m].toFixed(1)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          );
        })}
      </div>
    </>
  );
}
