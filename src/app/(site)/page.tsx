import { Hero } from "@/components/site/hero";
import { BenchmarkSection } from "@/components/site/benchmark-section";
import { ModelEvolution } from "@/components/site/model-evolution";
import { PlaygroundPreview } from "@/components/site/playground-preview";
import { PhilosophySection } from "@/components/site/philosophy-section";
import { ProductsSection } from "@/components/site/products-section";
import { PlatformSection } from "@/components/site/platform-section";
import { ResearchPreview } from "@/components/site/research-preview";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";

function ClosingSection() {
  return (
    <section className="border-t border-line bg-paper-deep/50 py-32 md:py-44">
      <Container>
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="font-mono text-[11px] uppercase tracking-eyebrow text-bronze">
            Ren AI
          </p>
          <h2 className="mt-6 font-serif text-display font-normal text-ink text-balance">
            The work is long. <em className="text-bronze-deep">We intend to be here for it.</em>
          </h2>
          <p className="mx-auto mt-6 max-w-[48ch] text-lede text-graphite">
            Try the model, read the research, or hold us to our numbers.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button href="/playground" size="lg">
              Try Ren
            </Button>
            <Button href="/research" variant="outline" size="lg">
              Research
            </Button>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <BenchmarkSection />
      <ModelEvolution />
      <PlaygroundPreview />
      <PhilosophySection />
      <ProductsSection />
      <PlatformSection />
      <ResearchPreview />
      <ClosingSection />
    </>
  );
}
