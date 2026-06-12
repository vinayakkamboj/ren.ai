import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/ui/reveal";
import { PageIntro } from "@/components/site/page-intro";
import {
  formatDate,
  publicationCategories,
  publications,
  type PublicationCategory,
} from "@/lib/data/publications";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Research",
  description:
    "Papers, technical reports, safety research, evaluations, model cards, and benchmark methodology from Ren AI.",
};

export default async function ResearchPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const active = publicationCategories.includes(category as PublicationCategory)
    ? (category as PublicationCategory)
    : null;

  const list = [...publications]
    .filter((p) => (active ? p.category === active : true))
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <PageIntro
        eyebrow="Research portal"
        title={
          <>
            Everything we claim, <em className="text-bronze-deep">you can check</em>.
          </>
        }
        lede="Papers, technical reports, safety findings, evaluations, model cards, and the methodology that binds them. Negative results are published with the same care as the wins."
      />

      <Container className="py-16 md:py-20">
        {/* Category filter */}
        <Reveal className="flex flex-wrap gap-2">
          <Link
            href="/research"
            className={cn(
              "rounded-full border px-4 py-2 text-[13px] font-medium tracking-tight transition-all duration-300",
              !active
                ? "border-ink bg-ink text-paper"
                : "border-line text-graphite hover:border-stone hover:text-ink",
            )}
          >
            All
          </Link>
          {publicationCategories.map((c) => (
            <Link
              key={c}
              href={`/research?category=${encodeURIComponent(c)}`}
              className={cn(
                "rounded-full border px-4 py-2 text-[13px] font-medium tracking-tight transition-all duration-300",
                active === c
                  ? "border-ink bg-ink text-paper"
                  : "border-line text-graphite hover:border-stone hover:text-ink",
              )}
            >
              {c}
            </Link>
          ))}
        </Reveal>

        {/* Publication index */}
        <div className="mt-12">
          {list.map((pub, i) => (
            <Reveal key={pub.slug} delay={Math.min(i * 0.04, 0.2)}>
              <Link
                href={`/research/${pub.slug}`}
                className="group grid gap-4 border-t border-line py-10 transition-colors duration-300 hover:bg-paper-deep/40 md:grid-cols-[11rem_1fr_auto] md:gap-10 md:px-4 md:-mx-4"
              >
                <div className="space-y-3">
                  <Badge tone="outline">{pub.category}</Badge>
                  <p className="font-mono text-[11px] text-graphite-soft">
                    {formatDate(pub.date)}
                  </p>
                </div>
                <div className="max-w-2xl">
                  <h2 className="font-serif text-headline text-ink text-balance transition-colors duration-300 group-hover:text-bronze-deep">
                    {pub.title}
                  </h2>
                  <p className="mt-3 text-[15px] leading-relaxed text-graphite text-pretty">
                    {pub.abstract}
                  </p>
                  <p className="mt-4 text-[13px] text-graphite-soft">
                    {pub.authors.join(" · ")}
                  </p>
                </div>
                <ArrowUpRight className="hidden size-4 self-center text-graphite-soft transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink md:block" />
              </Link>
            </Reveal>
          ))}
          <div className="rule" />
        </div>
      </Container>
    </>
  );
}
