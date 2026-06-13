import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { PageIntro } from "@/components/site/page-intro";

export const metadata: Metadata = {
  title: "Blog — Ren AI",
  description: "Writing from Ren AI on software engineering intelligence, Astra, and the research behind Ren Code.",
};

export default function BlogPage() {
  return (
    <>
      <PageIntro
        eyebrow="Blog"
        title={
          <>
            Writing from <em className="text-bronze-deep">Ren AI</em>.
          </>
        }
        lede="Technical writing, research notes, and updates from the team behind Astra and Ren Code."
      />

      <Container className="py-20 md:py-28">
        <Reveal className="flex flex-col items-center justify-center py-16 text-center">
          <span className="flex size-1.5 animate-pulse rounded-full bg-bronze" />
          <p className="mt-6 font-mono text-[11px] uppercase tracking-eyebrow text-bronze">
            Coming soon
          </p>
          <p className="mt-4 max-w-[44ch] text-[15px] leading-relaxed text-graphite text-pretty">
            The first posts are in progress. We will write about what we are
            building, what we are learning, and what surprises us.
          </p>
        </Reveal>
      </Container>
    </>
  );
}
