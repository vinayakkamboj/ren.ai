import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { RenMark } from "@/components/ui/wordmark";
import { ChevronDown } from "lucide-react";

export function PlaygroundPreview() {
  return (
    <section className="border-t border-line bg-paper py-28 md:py-36">
      <Container>
        <div className="grid items-center gap-16 lg:grid-cols-[minmax(0,26rem)_1fr]">
          <div>
            <SectionHeading
              eyebrow="Playground"
              title={
                <>
                  Reasoning you can <em className="text-bronze-deep">read</em>.
                </>
              }
              lede="The Ren playground is built for inspection, not spectacle. Every response carries its deliberation, its sources, and an honest statement of confidence."
            />
            <Reveal delay={0.1} className="mt-10">
              <Button href="/playground" size="lg">
                Open the playground
              </Button>
            </Reveal>
          </div>

          <Reveal delay={0.15}>
            <div className="overflow-hidden rounded-2xl border border-line bg-paper-raised shadow-float">
              {/* Toolbar */}
              <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <RenMark className="size-4 text-ink" />
                  <span className="font-mono text-[11.5px] text-graphite">ren-3-large</span>
                </div>
                <div className="flex items-center gap-4 font-mono text-[10.5px] uppercase tracking-[0.1em] text-graphite-soft">
                  <span>Deliberation · adaptive</span>
                  <span className="hidden sm:inline">Context · 1M</span>
                </div>
              </div>

              <div className="space-y-6 px-5 py-6 sm:px-7 sm:py-8">
                {/* User turn */}
                <div className="flex justify-end">
                  <p className="max-w-[34ch] rounded-2xl rounded-br-md bg-paper-deep px-4 py-3 text-[14px] leading-relaxed text-ink">
                    Will this migration break our pagination? The cursor is
                    derived from `updated_at`, which the new schema makes
                    nullable.
                  </p>
                </div>

                {/* Deliberation */}
                <div className="rounded-xl border border-line bg-paper px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-bronze">
                      Deliberation · 6.2s
                    </span>
                    <ChevronDown className="size-3.5 text-graphite-soft" />
                  </div>
                  <p className="mt-2.5 text-[12.5px] leading-relaxed text-graphite">
                    Checking how the cursor encoder handles NULL ordering…
                    Postgres sorts NULLs last under ASC, so rows updated before
                    the backfill would shift across pages. Verifying against the
                    three call sites that construct cursors…
                  </p>
                </div>

                {/* Assistant turn */}
                <div className="flex gap-3.5">
                  <RenMark className="mt-1 size-4 shrink-0 text-bronze" />
                  <div className="space-y-3 text-[14px] leading-relaxed text-ink-soft">
                    <p>
                      Yes — in one specific case. Two of your three cursor call
                      sites coalesce <code className="rounded bg-paper-deep px-1.5 py-0.5 font-mono text-[12px]">updated_at</code> to{" "}
                      <code className="rounded bg-paper-deep px-1.5 py-0.5 font-mono text-[12px]">created_at</code>, but{" "}
                      <code className="rounded bg-paper-deep px-1.5 py-0.5 font-mono text-[12px]">listArchived</code> does not.
                      Rows with NULL <code className="rounded bg-paper-deep px-1.5 py-0.5 font-mono text-[12px]">updated_at</code> will
                      sort after the cursor and be silently skipped.
                    </p>
                    <p className="text-graphite">
                      I verified this against your test fixtures; a one-line
                      patch and a regression test are below.
                    </p>
                  </div>
                </div>

                {/* Confidence footer */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-4 font-mono text-[10.5px] uppercase tracking-[0.1em] text-graphite-soft">
                  <span className="flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-bronze" />
                    Confidence · high (0.94)
                  </span>
                  <span>Verified · 3 call sites</span>
                  <span>Sources · schema.sql, cursors.ts</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
