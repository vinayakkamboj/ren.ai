import { Hero } from "@/components/site/hero";
import { WorkflowsSection } from "@/components/site/workflows-section";
import { GithubSection } from "@/components/site/github-section";
import { ResearchModelSection } from "@/components/site/research-model-section";
import { PhilosophySection } from "@/components/site/philosophy-section";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";

function ClosingSection() {
  return (
    <section className="border-t border-line bg-paper-deep/50 py-32 md:py-44">
      <Container>
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="font-mono text-[11px] uppercase tracking-eyebrow text-bronze">
            Ren Code
          </p>
          <h2 className="mt-6 font-serif text-display font-normal text-ink text-balance">
            Start something new, or pick up where your codebase left off.
          </h2>
          <p className="mx-auto mt-6 max-w-[46ch] text-lede text-graphite">
            Create a workspace, connect a repository, and let Ren Code do the
            engineering you can review.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button href="/dashboard" size="lg">
              Start building
            </Button>
            <Button href="/code" variant="outline" size="lg">
              How it works
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
      <WorkflowsSection />
      <GithubSection />
      <ResearchModelSection />
      <PhilosophySection />
      <ClosingSection />
    </>
  );
}
