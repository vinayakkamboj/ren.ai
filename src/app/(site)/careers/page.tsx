import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { PageIntro } from "@/components/site/page-intro";

export const metadata: Metadata = {
  title: "Careers — Ren AI",
  description: "Work on Astra and Ren Code. Ren AI careers — coming soon.",
};

export default function CareersPage() {
  return (
    <>
      <PageIntro
        eyebrow="Careers"
        title={
          <>
            Build AI that <em className="text-bronze-deep">understands software</em>.
          </>
        }
        lede="Ren AI is in active development. We are not yet hiring publicly, but we are building toward it."
      />

      <Container className="py-20 md:py-28">
        <Reveal className="max-w-[60ch]">
          <p className="text-lede text-graphite text-pretty">
            When we are ready to grow the team, we will post roles here. The
            work will be on Astra — training, evaluation, and the engineering
            infrastructure around it — and on Ren Code, the product.
          </p>
          <p className="mt-6 text-[15px] leading-relaxed text-graphite text-pretty">
            If you are interested in working on software engineering
            intelligence before the listings go up, reach out at{" "}
            <a
              href="mailto:hello@ren.ai"
              className="text-bronze-deep underline-offset-4 hover:underline"
            >
              hello@ren.ai
            </a>
            .
          </p>
        </Reveal>

        <Reveal delay={0.1} className="mt-16 max-w-[56ch] rounded-2xl border border-line bg-paper-deep/50 p-8">
          <p className="font-mono text-[11px] uppercase tracking-eyebrow text-bronze">
            What we value in candidates
          </p>
          <ul className="mt-6 space-y-4">
            {[
              "Intellectual honesty — say what you know and what you don't.",
              "Engineering depth — real software, not demos.",
              "Research orientation — care about measurement, not appearances.",
              "Comfort with ambiguity — early stage, evolving fast.",
            ].map((item) => (
              <li key={item} className="flex gap-3 text-[14.5px] leading-relaxed text-graphite">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-bronze" />
                {item}
              </li>
            ))}
          </ul>
        </Reveal>
      </Container>
    </>
  );
}
