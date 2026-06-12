import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageIntro } from "@/components/site/page-intro";
import { modelGenerations } from "@/lib/data/models";
import { benchmarks } from "@/lib/data/benchmarks";

export const metadata: Metadata = {
  title: "Models",
  description:
    "The Ren model lineage — Ren-1, Ren-2, Ren-3 — with research milestones, training improvements, and benchmark progression.",
};

export default function ModelsPage() {
  return (
    <>
      <PageIntro
        eyebrow="Model evolution"
        title={
          <>
            A lineage, <em className="text-bronze-deep">not a leaderboard</em>.
          </>
        }
        lede="Each generation of Ren is a thesis about intelligence — proposed, trained, measured, and published. This is the full record of where the capability came from."
      />

      <Container>
        {modelGenerations.map((gen, i) => {
          const isLatest = i === modelGenerations.length - 1;
          return (
            <section
              key={gen.id}
              className="grid gap-10 border-b border-line py-20 md:py-28 lg:grid-cols-[16rem_1fr]"
            >
              <Reveal>
                <div className="lg:sticky lg:top-28">
                  <h2 className="font-serif text-display font-normal text-ink">{gen.name}</h2>
                  <div className="mt-4">
                    <Badge tone={isLatest ? "bronze" : "neutral"}>{gen.epoch}</Badge>
                  </div>
                  <dl className="mt-8 space-y-3 font-mono text-[12px] text-graphite">
                    <div className="flex justify-between border-t border-line pt-3">
                      <dt className="uppercase tracking-[0.1em] text-graphite-soft">Released</dt>
                      <dd>{gen.released}</dd>
                    </div>
                    <div className="flex justify-between border-t border-line pt-3">
                      <dt className="uppercase tracking-[0.1em] text-graphite-soft">Context</dt>
                      <dd>{gen.contextWindow}</dd>
                    </div>
                    <div className="flex justify-between border-t border-line pt-3">
                      <dt className="uppercase tracking-[0.1em] text-graphite-soft">Composite</dt>
                      <dd className="text-ink">{gen.composite.toFixed(1)}</dd>
                    </div>
                  </dl>
                </div>
              </Reveal>

              <Reveal delay={0.1}>
                <p className="max-w-[58ch] font-serif text-title leading-[1.55] text-ink-soft text-pretty">
                  {gen.thesis}
                </p>

                <div className="mt-12 grid gap-12 md:grid-cols-2">
                  <div>
                    <h3 className="font-mono text-[11px] uppercase tracking-eyebrow text-bronze">
                      Research milestones
                    </h3>
                    <ul className="mt-5 space-y-4">
                      {gen.milestones.map((m) => (
                        <li key={m} className="flex gap-3 text-[15px] leading-relaxed text-ink-soft">
                          <span aria-hidden className="mt-[0.65em] block size-1 shrink-0 rounded-full bg-bronze-soft" />
                          {m}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-mono text-[11px] uppercase tracking-eyebrow text-bronze">
                      Training improvements
                    </h3>
                    <ul className="mt-5 space-y-4">
                      {gen.training.map((t) => (
                        <li key={t} className="flex gap-3 text-[15px] leading-relaxed text-ink-soft">
                          <span aria-hidden className="mt-[0.65em] block size-1 shrink-0 rounded-full bg-bronze-soft" />
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-12 overflow-hidden rounded-2xl border border-line">
                  <div className="border-b border-line bg-paper-deep/50 px-6 py-3">
                    <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-graphite">
                      Benchmark gains
                    </span>
                  </div>
                  <div className="grid gap-px bg-line sm:grid-cols-3">
                    {gen.gains.map((g) => (
                      <div key={g.label} className="bg-paper px-6 py-5">
                        <p className="text-[12.5px] text-graphite">{g.label}</p>
                        <p className="tnum mt-1.5 font-serif text-title text-ink">{g.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            </section>
          );
        })}

        {/* Full benchmark table */}
        <section className="py-20 md:py-28">
          <Reveal>
            <h2 className="font-serif text-display font-normal text-ink">
              The complete record
            </h2>
            <p className="mt-5 max-w-[54ch] text-lede text-graphite">
              All fifteen benchmarks, all three generations. Identical harnesses,
              no selective reporting.
            </p>
          </Reveal>
          <Reveal delay={0.1} className="mt-12 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line-strong font-mono text-[11px] uppercase tracking-[0.1em] text-graphite-soft">
                  <th className="py-3 pr-4 font-medium">Benchmark</th>
                  <th className="py-3 pr-4 font-medium">Area</th>
                  <th className="tnum py-3 pr-4 text-right font-medium">Ren-1</th>
                  <th className="tnum py-3 pr-4 text-right font-medium">Ren-2</th>
                  <th className="tnum py-3 text-right font-medium">Ren-3</th>
                </tr>
              </thead>
              <tbody>
                {benchmarks.map((b) => (
                  <tr key={b.benchmark} className="border-b border-line text-[14px]">
                    <td className="py-4 pr-4 font-medium text-ink">{b.benchmark}</td>
                    <td className="py-4 pr-4 text-graphite">{b.area}</td>
                    <td className="tnum py-4 pr-4 text-right text-graphite-soft">
                      {b.scores["Ren-1"].toFixed(1)}
                    </td>
                    <td className="tnum py-4 pr-4 text-right text-graphite">
                      {b.scores["Ren-2"].toFixed(1)}
                    </td>
                    <td className="tnum py-4 text-right font-medium text-bronze-deep">
                      {b.scores["Ren-3"].toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
          <Reveal delay={0.15} className="mt-12">
            <Button href="/research/benchmark-methodology" variant="outline">
              How we report numbers
            </Button>
          </Reveal>
        </section>
      </Container>
    </>
  );
}
