import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { astra } from "@/lib/data/astra";
import { cn } from "@/lib/utils";

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

export function ResearchModelSection() {
  return (
    <section className="border-t border-line bg-paper py-28 md:py-36" id="research-model">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[1fr_minmax(0,28rem)]">
          <SectionHeading
            eyebrow="Current research model"
            title={
              <>
                Astra. <em className="text-bronze-deep">In active fine-tuning.</em>
              </>
            }
            lede={astra.summary}
          />

          <Reveal delay={0.1} className="rounded-2xl border border-line bg-paper-raised p-7 shadow-lift">
            <dl className="space-y-4">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-graphite-soft">
                  Codename
                </dt>
                <dd className="font-serif text-title text-ink">{astra.codename}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-line pt-4">
                <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-graphite-soft">
                  Status
                </dt>
                <dd className="flex items-center gap-2 text-[14px] font-medium text-bronze-deep">
                  <span className="size-1.5 animate-pulse rounded-full bg-bronze" />
                  {astra.status}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-line pt-4">
                <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-graphite-soft">
                  Approach
                </dt>
                <dd className="max-w-[18ch] text-right text-[13.5px] text-ink-soft">
                  {astra.approach}
                </dd>
              </div>
            </dl>
          </Reveal>
        </div>

        {/* Focus areas */}
        <Reveal delay={0.1} className="mt-16">
          <h3 className="font-mono text-[11px] uppercase tracking-eyebrow text-bronze">
            Focus areas
          </h3>
          <div className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-2 lg:grid-cols-5">
            {astra.focusAreas.map((f) => (
              <div key={f.title} className="bg-paper p-6">
                <h4 className="font-serif text-[1.05rem] text-ink">{f.title}</h4>
                <p className="mt-2.5 text-[13px] leading-relaxed text-graphite">{f.detail}</p>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Development phases — honest, qualitative */}
        <Reveal delay={0.15} className="mt-16">
          <h3 className="font-mono text-[11px] uppercase tracking-eyebrow text-bronze">
            Where we are
          </h3>
          <ol className="mt-6 space-y-1">
            {astra.phases.map((p) => (
              <li
                key={p.label}
                className="grid grid-cols-[1fr_auto] items-baseline gap-4 border-t border-line py-4 md:grid-cols-[16rem_1fr_7rem]"
              >
                <span className="flex items-center gap-3 text-[15px] font-medium text-ink">
                  <span className={cn("size-1.5 rounded-full", stateDot[p.state])} />
                  {p.label}
                </span>
                <span className="col-span-2 max-w-[60ch] text-[13.5px] leading-relaxed text-graphite md:col-span-1">
                  {p.detail}
                </span>
                <span className="hidden text-right font-mono text-[10.5px] uppercase tracking-[0.1em] text-graphite-soft md:block">
                  {stateLabel[p.state]}
                </span>
              </li>
            ))}
            <li className="border-t border-line" />
          </ol>
          <p className="mt-6 max-w-[64ch] text-[12.5px] leading-relaxed text-graphite-soft">
            We publish progress as it is, not as we wish it were. Capability
            claims will arrive with the evaluation harness that measures them —
            no benchmark numbers before then.
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
