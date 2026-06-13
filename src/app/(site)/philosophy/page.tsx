import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/section-heading";
import { PageIntro } from "@/components/site/page-intro";
import { principles } from "@/components/site/philosophy-section";

export const metadata: Metadata = {
  title: "Philosophy",
  description:
    "Evidence over hype. Understanding over autocomplete. Reliability over marketing. How Ren AI works while building in the open.",
};

const commitments = [
  {
    title: "We publish the method, not just the result",
    body: "When Astra produces a capability number, it will ship with the evaluation harness that produced it. Until then, we describe progress qualitatively and honestly.",
  },
  {
    title: "You decide what Ren Code can see",
    body: "Repository access is granted per repo and revocable. Ren Code reads what you allow, and nothing else.",
  },
  {
    title: "Changes are made to be reviewed",
    body: "Ren Code produces pull requests, not silent commits. You read the diff, you decide what merges. Autonomy with an audit trail.",
  },
  {
    title: "Honest about the stage",
    body: "Ren AI is early. We would rather show a real roadmap than stage a finished story. What you see here is what actually exists.",
  },
];

export default function PhilosophyPage() {
  return (
    <>
      <PageIntro
        eyebrow="How we work"
        title={
          <>
            Building in the open, <em className="text-bronze-deep">without the hype</em>.
          </>
        }
        lede="Ren AI is in active development. Our principles are the ones we can actually keep at this stage — and the ones we intend to keep as we grow."
      />

      <Container className="py-20 md:py-28">
        <div>
          {principles.map((p, i) => (
            <Reveal
              key={p.n}
              delay={Math.min(i * 0.05, 0.2)}
              className="grid gap-4 border-t border-line py-12 md:grid-cols-[6rem_minmax(0,20rem)_1fr] md:gap-10"
            >
              <span className="font-serif text-headline italic text-bronze">{p.n}</span>
              <h2 className="font-serif text-headline text-ink">{p.title}</h2>
              <p className="max-w-[58ch] text-[16px] leading-[1.8] text-graphite text-pretty">
                {p.body}
              </p>
            </Reveal>
          ))}
          <div className="rule" />
        </div>

        <section className="mt-28">
          <Reveal>
            <Eyebrow>Commitments</Eyebrow>
            <h2 className="mt-5 max-w-[20ch] font-serif text-display font-normal text-ink text-balance">
              What you can hold us to today.
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-2">
            {commitments.map((c, i) => (
              <Reveal key={c.title} delay={(i % 2) * 0.08} className="bg-paper p-9 md:p-11">
                <h3 className="max-w-[26ch] font-serif text-title text-ink text-balance">
                  {c.title}
                </h3>
                <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-graphite text-pretty">
                  {c.body}
                </p>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="mt-28">
          <Reveal className="rounded-2xl bg-paper-deep/70 p-10 md:p-16">
            <Eyebrow>Get started</Eyebrow>
            <h2 className="mt-5 max-w-[22ch] font-serif text-display font-normal text-ink text-balance">
              Try Ren Code while it is still early.
            </h2>
            <p className="mt-6 max-w-[56ch] text-lede text-graphite text-pretty">
              Create a workspace, connect a repository, and build alongside a
              product we are improving in the open.
            </p>
            <div className="mt-10">
              <Button href="/dashboard" size="lg">
                Start building
              </Button>
            </div>
          </Reveal>
        </section>
      </Container>
    </>
  );
}
