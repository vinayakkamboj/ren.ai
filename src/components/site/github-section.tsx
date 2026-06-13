import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { githubFlow } from "@/lib/data/code";

/** A premium mock of repository-aware code understanding. */
function RepoMock() {
  return (
    <div className="overflow-hidden rounded-2xl border border-carbon-line bg-carbon shadow-float">
      <div className="flex items-center justify-between border-b border-carbon-line px-5 py-3">
        <div className="flex items-center gap-2 font-mono text-[11px] text-dusk-muted">
          <span className="size-2.5 rounded-full bg-carbon-line-strong" />
          acme/platform
        </div>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-signal-green">
          ● indexed
        </span>
      </div>
      <div className="grid grid-cols-[8.5rem_1fr] text-[12.5px]">
        <div className="border-r border-carbon-line p-3 font-mono text-dusk-muted">
          <p className="text-dusk-faint">src/</p>
          <p className="pl-2">auth/</p>
          <p className="pl-2 text-brass">billing/</p>
          <p className="pl-4 text-dusk">cursor.ts</p>
          <p className="pl-2">api/</p>
          <p className="text-dusk-faint">tests/</p>
        </div>
        <div className="space-y-3 p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-brass">
            Understanding
          </p>
          <p className="leading-relaxed text-dusk/90">
            <span className="text-dusk-muted">billing/cursor.ts</span> derives
            pagination from <span className="text-brass">updated_at</span>. Three
            call sites depend on it; one does not coalesce nulls.
          </p>
          <div className="rounded-lg border border-carbon-line bg-carbon-raised px-3 py-2 font-mono text-[11.5px] text-dusk-muted">
            <span className="text-signal-green">+ </span>proposed PR · fix null
            ordering in archived list
          </div>
        </div>
      </div>
    </div>
  );
}

export function GithubSection() {
  return (
    <section className="border-t border-line bg-paper-deep/50 py-28 md:py-36" id="github">
      <Container>
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="GitHub integration"
              title={
                <>
                  Connect a repo. <em className="text-bronze-deep">Ren Code learns it.</em>
                </>
              }
              lede="A seamless flow from authorization to a reviewable pull request — with you deciding exactly what it can see and what gets merged."
            />
            <Reveal delay={0.1} className="mt-10">
              <ol className="space-y-1">
                {githubFlow.map((s) => (
                  <li
                    key={s.step}
                    className="grid grid-cols-[2.5rem_1fr] items-baseline gap-4 border-t border-line py-4"
                  >
                    <span className="font-mono text-[12px] text-bronze">{s.step}</span>
                    <div>
                      <p className="text-[15px] font-medium tracking-tight text-ink">{s.title}</p>
                      <p className="mt-1 max-w-[46ch] text-[13.5px] leading-relaxed text-graphite">
                        {s.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </Reveal>
          </div>

          <Reveal delay={0.15}>
            <RepoMock />
            <p className="mt-4 text-center font-mono text-[10.5px] uppercase tracking-[0.1em] text-graphite-soft">
              Repository understanding · illustrative
            </p>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
