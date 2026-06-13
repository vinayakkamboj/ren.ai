import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { PageIntro } from "@/components/site/page-intro";
import { astra } from "@/lib/data/astra";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Research",
  description:
    "Astra — the model Ren AI is currently fine-tuning for software engineering. Active development, published honestly.",
};

const stateLabel: Record<string, string> = {
  "in-progress": "In progress",
  next: "Next",
  planned: "Planned",
};
const stateDot: Record<string, string> = {
  "in-progress": "bg-bronze",
  next: "bg-bronze-soft",
  planned: "bg-stone",
};

export default function ResearchPage() {
  return (
    <>
      <PageIntro
        eyebrow="Current research model"
        title={
          <>
            Astra. <em className="text-bronze-deep">Active fine-tuning.</em>
          </>
        }
        lede={astra.summary}
      />

      <Container className="py-20 md:py-28">
        {/* Status card */}
        <Reveal className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
          {[
            { k: "Codename", v: astra.codename },
            { k: "Status", v: astra.status, live: true },
            { k: "Base", v: astra.base },
          ].map((s) => (
            <div key={s.k} className="bg-paper p-7">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-graphite-soft">
                {s.k}
              </p>
              <p className="mt-3 flex items-center gap-2 font-serif text-title text-ink">
                {s.live && <span className="size-1.5 animate-pulse rounded-full bg-bronze" />}
                {s.v}
              </p>
            </div>
          ))}
        </Reveal>

        {/* Focus areas */}
        <section className="mt-20">
          <Reveal>
            <h2 className="font-serif text-display font-normal text-ink">Focus areas</h2>
            <p className="mt-5 max-w-[54ch] text-lede text-graphite">
              Astra is specialized, not general. Everything points at making
              Ren Code a better engineer.
            </p>
          </Reveal>
          <div className="mt-12">
            {astra.focusAreas.map((f, i) => (
              <Reveal
                key={f.title}
                delay={Math.min(i * 0.05, 0.2)}
                className="grid gap-4 border-t border-line py-8 md:grid-cols-[20rem_1fr] md:gap-10"
              >
                <h3 className="font-serif text-title text-ink">{f.title}</h3>
                <p className="max-w-[60ch] text-[15px] leading-relaxed text-graphite text-pretty">
                  {f.detail}
                </p>
              </Reveal>
            ))}
            <div className="rule" />
          </div>
        </section>

        {/* Roadmap */}
        <section className="mt-20">
          <Reveal>
            <h2 className="font-serif text-display font-normal text-ink">Where we are</h2>
            <p className="mt-5 max-w-[54ch] text-lede text-graphite">
              A real development initiative, shown as it actually stands.
            </p>
          </Reveal>
          <ol className="mt-12">
            {astra.phases.map((p, i) => (
              <Reveal
                key={p.label}
                delay={Math.min(i * 0.05, 0.2)}
                className="grid grid-cols-[1fr_auto] items-baseline gap-4 border-t border-line py-6 md:grid-cols-[18rem_1fr_7rem]"
              >
                <span className="flex items-center gap-3 font-serif text-title text-ink">
                  <span className={cn("size-2 rounded-full", stateDot[p.state])} />
                  {p.label}
                </span>
                <span className="col-span-2 max-w-[60ch] text-[14.5px] leading-relaxed text-graphite md:col-span-1">
                  {p.detail}
                </span>
                <span className="hidden text-right font-mono text-[10.5px] uppercase tracking-[0.1em] text-graphite-soft md:block">
                  {stateLabel[p.state]}
                </span>
              </Reveal>
            ))}
            <li className="border-t border-line" />
          </ol>
          <Reveal className="mt-10 rounded-2xl border border-line bg-paper-deep/50 p-7">
            <p className="max-w-[70ch] text-[14px] leading-relaxed text-graphite">
              We will not publish benchmark numbers before we publish the
              evaluation harness that produces them. When capability results
              arrive, they will arrive with the method to reproduce them.
            </p>
          </Reveal>
        </section>

        <Reveal className="mt-20">
          <Button href="/code" size="lg">
            See Ren Code
          </Button>
        </Reveal>
      </Container>
    </>
  );
}
