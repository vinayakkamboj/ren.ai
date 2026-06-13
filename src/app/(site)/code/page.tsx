import type { Metadata } from "next";
import { ArrowRight, GitBranch, Sparkles } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { PageIntro } from "@/components/site/page-intro";
import { GithubSection } from "@/components/site/github-section";
import { newProjectExamples, repositoryCapabilities } from "@/lib/data/code";

export const metadata: Metadata = {
  title: "Ren Code",
  description:
    "Build new applications or continue development on existing repositories using AI-powered software engineering.",
};

export default function RenCodePage() {
  return (
    <>
      <PageIntro
        eyebrow="Ren Code · flagship product"
        title={
          <>
            Build new apps, or continue an <em className="text-bronze-deep">existing repository</em>.
          </>
        }
        lede="Ren Code is AI-powered software engineering. Start from a prompt, or connect a GitHub repository and let the model understand it before it writes a line."
      >
        <div className="mt-10 flex flex-wrap gap-4">
          <Button href="/dashboard" size="lg">
            Start building
          </Button>
          <Button href="#repository" variant="outline" size="lg">
            The repository workflow
          </Button>
        </div>
      </PageIntro>

      {/* New project */}
      <section id="new-project" className="border-b border-line scroll-mt-24">
        <Container className="py-20 md:py-28">
          <Reveal className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl border border-line bg-paper-raised">
              <Sparkles className="size-5 text-bronze" strokeWidth={1.6} />
            </div>
            <span className="font-mono text-[11px] uppercase tracking-eyebrow text-bronze">
              Workflow 01 · New project
            </span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-7 max-w-[20ch] font-serif text-display font-normal text-ink text-balance">
              Start a new application from a prompt.
            </h2>
            <p className="mt-6 max-w-[54ch] text-lede text-graphite text-pretty">
              Describe the product you want. Ren Code scaffolds a real,
              coherent codebase — structure, data model, and core flows — that
              you keep developing inside the same workspace.
            </p>
          </Reveal>
          <Reveal delay={0.1} className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {newProjectExamples.map((ex) => (
              <div key={ex.prompt} className="bg-paper p-6">
                <p className="font-mono text-[12px] text-bronze">›</p>
                <p className="mt-2 font-serif text-title text-ink">{ex.prompt}</p>
                <p className="mt-2 text-[13px] leading-relaxed text-graphite">{ex.detail}</p>
              </div>
            ))}
          </Reveal>
        </Container>
      </section>

      {/* Existing repository */}
      <section id="repository" className="border-b border-line bg-paper-deep/40 scroll-mt-24">
        <Container className="py-20 md:py-28">
          <Reveal className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl border border-line bg-paper-raised">
              <GitBranch className="size-5 text-bronze" strokeWidth={1.6} />
            </div>
            <span className="font-mono text-[11px] uppercase tracking-eyebrow text-bronze">
              Workflow 02 · Existing repository
            </span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-7 max-w-[24ch] font-serif text-display font-normal text-ink text-balance">
              The part that sets Ren Code apart.
            </h2>
            <p className="mt-6 max-w-[58ch] text-lede text-graphite text-pretty">
              Most AI builders start from a blank page. Ren Code is built to
              work inside the codebases you already have — understanding them
              first, then making changes that fit.
            </p>
          </Reveal>
          <div className="mt-14 grid gap-x-12 gap-y-10 md:grid-cols-3">
            {repositoryCapabilities.map((c, i) => (
              <Reveal key={c.title} delay={(i % 3) * 0.06}>
                <span className="font-mono text-[12px] text-graphite-soft">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 font-serif text-title text-ink">{c.title}</h3>
                <p className="mt-2.5 max-w-[40ch] text-[14px] leading-relaxed text-graphite text-pretty">
                  {c.detail}
                </p>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <GithubSection />

      <section className="border-t border-line bg-paper py-24 md:py-32">
        <Container>
          <Reveal className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
            <div>
              <h2 className="max-w-[24ch] font-serif text-headline text-ink text-balance">
                Ready when you are.
              </h2>
              <p className="mt-3 max-w-[48ch] text-[15px] text-graphite">
                Create a workspace and connect your first repository.
              </p>
            </div>
            <Button href="/dashboard" size="lg">
              Open the dashboard
              <ArrowRight className="size-4" />
            </Button>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
