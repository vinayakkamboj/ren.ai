import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { Badge } from "@/components/ui/badge";
import { modelGenerations } from "@/lib/data/models";

/** Static SVG progression chart — composite evaluation across generations. */
function ProgressionChart() {
  const points = modelGenerations.map((m) => m.composite);
  const w = 640;
  const h = 220;
  const pad = 24;
  const x = (i: number) => pad + (i * (w - pad * 2)) / (points.length - 1);
  const y = (v: number) => h - pad - ((v - 20) / 70) * (h - pad * 2);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Composite evaluation by generation">
      {[20, 40, 60, 80].map((v) => (
        <g key={v}>
          <line x1={pad} x2={w - pad} y1={y(v)} y2={y(v)} stroke="var(--color-line)" strokeWidth="1" />
          <text x={pad - 6} y={y(v) + 3} textAnchor="end" fontSize="9" fill="var(--color-graphite-soft)" fontFamily="var(--font-mono)">
            {v}
          </text>
        </g>
      ))}
      <path d={path} fill="none" stroke="var(--color-bronze)" strokeWidth="2" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p)} r="4.5" fill="var(--color-paper)" stroke="var(--color-bronze)" strokeWidth="2" />
          <text x={x(i)} y={y(p) - 14} textAnchor="middle" fontSize="12" fill="var(--color-ink)" fontFamily="var(--font-mono)">
            {p.toFixed(1)}
          </text>
          <text x={x(i)} y={h - 4} textAnchor="middle" fontSize="10" fill="var(--color-graphite)" fontFamily="var(--font-mono)">
            {modelGenerations[i].name}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function ModelEvolution() {
  return (
    <section className="border-t border-line bg-paper-deep/50 py-28 md:py-36" id="models">
      <Container>
        <div className="grid items-end gap-12 lg:grid-cols-[1fr_minmax(0,34rem)]">
          <SectionHeading
            eyebrow="Model evolution"
            title={
              <>
                Three generations.
                <br />
                One direction.
              </>
            }
            lede="Each generation of Ren is a thesis about intelligence, tested in public. Composite evaluation is the mean across our full benchmark suite — fifteen evaluations, identical harnesses, no selective reporting."
          />
          <Reveal delay={0.15} className="rounded-2xl border border-line bg-paper-raised p-6 shadow-lift">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-graphite-soft">
              Composite evaluation · mean of 15 benchmarks
            </p>
            <div className="mt-4">
              <ProgressionChart />
            </div>
          </Reveal>
        </div>

        <div className="mt-20 grid gap-px overflow-hidden rounded-2xl border border-line bg-line lg:grid-cols-3">
          {modelGenerations.map((gen, i) => (
            <Reveal key={gen.id} delay={i * 0.08} className="flex flex-col bg-paper p-8 md:p-10">
              <div className="flex items-baseline justify-between">
                <h3 className="font-serif text-headline text-ink">{gen.name}</h3>
                <Badge tone={i === modelGenerations.length - 1 ? "bronze" : "neutral"}>
                  {gen.epoch}
                </Badge>
              </div>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-graphite-soft">
                {gen.released} · {gen.contextWindow}
              </p>
              <p className="mt-6 text-[15px] leading-relaxed text-graphite text-pretty">
                {gen.thesis}
              </p>

              <div className="rule my-7" />

              <h4 className="font-mono text-[11px] uppercase tracking-eyebrow text-bronze">
                Research milestones
              </h4>
              <ul className="mt-4 space-y-3">
                {gen.milestones.map((m) => (
                  <li key={m} className="flex gap-3 text-sm leading-relaxed text-ink-soft">
                    <span aria-hidden className="mt-[0.62em] block size-1 shrink-0 rounded-full bg-bronze-soft" />
                    {m}
                  </li>
                ))}
              </ul>

              <h4 className="mt-7 font-mono text-[11px] uppercase tracking-eyebrow text-bronze">
                Training
              </h4>
              <ul className="mt-4 space-y-3">
                {gen.training.map((t) => (
                  <li key={t} className="flex gap-3 text-sm leading-relaxed text-ink-soft">
                    <span aria-hidden className="mt-[0.62em] block size-1 shrink-0 rounded-full bg-bronze-soft" />
                    {t}
                  </li>
                ))}
              </ul>

              <dl className="mt-auto space-y-2.5 pt-8">
                {gen.gains.map((g) => (
                  <div key={g.label} className="flex items-baseline justify-between gap-4 border-t border-line pt-2.5">
                    <dt className="text-[12.5px] text-graphite">{g.label}</dt>
                    <dd className="tnum font-mono text-[12.5px] text-ink">{g.value}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-10">
          <Link
            href="/models"
            className="group inline-flex items-center gap-2 text-sm font-medium text-ink transition-colors hover:text-bronze-deep"
          >
            The full lineage, generation by generation
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </Reveal>
      </Container>
    </section>
  );
}
