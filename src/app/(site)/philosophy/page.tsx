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
    "Evidence over hype. Reasoning over memorization. Reliability over marketing. The research philosophy of Ren AI.",
};

const commitments = [
  {
    title: "We publish the harness, not just the number",
    body: "Every benchmark result ships with the exact evaluation code that produced it. If you can't reproduce our numbers, that's our bug — report it and we'll publish the resolution.",
  },
  {
    title: "We retire contaminated benchmarks publicly",
    body: "When an evaluation enters our training data, it stops being an evaluation. We announce retirements with the same prominence as results.",
  },
  {
    title: "Model cards are living documents",
    body: "Limitations discovered after release are added to the record, dated, with reproduction steps where safe. The documentation never stops being true.",
  },
  {
    title: "Negative results enter the record",
    body: "Failed architectures, ambiguous safety findings, reward hacks our agents discovered — published with the same care as the wins, because a field that hides its failures repeats them.",
  },
];

export default function PhilosophyPage() {
  return (
    <>
      <PageIntro
        eyebrow="Research philosophy"
        title={
          <>
            Truth is a <em className="text-bronze-deep">discipline</em>, not a slogan.
          </>
        }
        lede="Ren AI was founded on a premise: the binding constraint on intelligence research is no longer ideas or compute, but the fidelity of our measurements. Everything else follows from taking that seriously."
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
            <Eyebrow>Standing commitments</Eyebrow>
            <h2 className="mt-5 max-w-[20ch] font-serif text-display font-normal text-ink text-balance">
              Rules we wrote down so you can hold us to them.
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

        <section id="join" className="mt-28 scroll-mt-28">
          <Reveal className="rounded-2xl bg-paper-deep/70 p-10 md:p-16">
            <Eyebrow>Join</Eyebrow>
            <h2 className="mt-5 max-w-[22ch] font-serif text-display font-normal text-ink text-balance">
              We hire people who would rather be correct than impressive.
            </h2>
            <p className="mt-6 max-w-[56ch] text-lede text-graphite text-pretty">
              Research scientists, systems engineers, and evaluators who treat
              measurement as a craft. The interview process includes
              reproducing one of our published results — we mean it about the
              harness.
            </p>
            <div className="mt-10">
              <Button href="/research" size="lg">
                Read the research first
              </Button>
            </div>
          </Reveal>
        </section>
      </Container>
    </>
  );
}
