import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";

export const principles = [
  {
    n: "I",
    title: "Evidence over hype",
    body: "Every capability claim we make is traceable to a published evaluation with confidence intervals and full transcripts. If we cannot measure it, we do not say it.",
  },
  {
    n: "II",
    title: "Reasoning over memorization",
    body: "We optimize for models that derive answers, not retrieve them. Contamination is screened on every dataset, and benchmarks that leak into training are retired publicly.",
  },
  {
    n: "III",
    title: "Reliability over marketing",
    body: "A model that is confidently wrong is worse than one that says it doesn't know. We train against confident error as our primary failure mode — and publish the calibration curves.",
  },
  {
    n: "IV",
    title: "Scientific rigor",
    body: "Negative results are results. Failed approaches, ambiguous safety findings, and post-release limitations enter the public record with the same care as the wins.",
  },
  {
    n: "V",
    title: "The long horizon",
    body: "We are building an institution measured in decades. Decisions are made for longevity — in research direction, in infrastructure, and in the trust we ask the world to place in us.",
  },
];

export function PhilosophySection() {
  return (
    <section className="border-t border-line bg-ink py-28 text-paper md:py-40" id="philosophy">
      <Container>
        <Reveal className="max-w-3xl">
          <Eyebrow className="text-bronze-soft">Research philosophy</Eyebrow>
          <h2 className="mt-5 font-serif text-display font-normal text-paper text-balance">
            Obsessed with truth, measurement, and{" "}
            <em className="text-bronze-soft">progress</em>.
          </h2>
        </Reveal>

        <div className="mt-20">
          {principles.map((p, i) => (
            <Reveal
              key={p.n}
              delay={i * 0.05}
              className="grid gap-4 border-t border-paper/12 py-10 md:grid-cols-[6rem_minmax(0,18rem)_1fr] md:gap-10"
            >
              <span className="font-serif text-headline italic text-bronze-soft">{p.n}</span>
              <h3 className="font-serif text-title text-paper">{p.title}</h3>
              <p className="max-w-[58ch] text-[15px] leading-relaxed text-paper/65 text-pretty">
                {p.body}
              </p>
            </Reveal>
          ))}
          <div className="border-t border-paper/12" />
        </div>
      </Container>
    </section>
  );
}
