import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/ui/reveal";
import {
  formatDate,
  publicationBySlug,
  publications,
} from "@/lib/data/publications";

export function generateStaticParams() {
  return publications.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const pub = publicationBySlug(slug);
  if (!pub) return {};
  return { title: pub.title, description: pub.abstract };
}

export default async function PublicationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const pub = publicationBySlug(slug);
  if (!pub) notFound();

  const sorted = [...publications].sort((a, b) => b.date.localeCompare(a.date));
  const index = sorted.findIndex((p) => p.slug === pub.slug);
  const next = sorted[(index + 1) % sorted.length];

  return (
    <article>
      <header className="border-b border-line">
        <Container className="pb-16 pt-40 md:pt-48">
          <Reveal>
            <Link
              href="/research"
              className="group inline-flex items-center gap-2 text-[13px] font-medium text-graphite transition-colors hover:text-ink"
            >
              <ArrowLeft className="size-3.5 transition-transform duration-300 group-hover:-translate-x-0.5" />
              Research
            </Link>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Badge tone="bronze">{pub.category}</Badge>
              <span className="font-mono text-[11px] text-graphite-soft">
                {formatDate(pub.date)} · {pub.readingTime} read
              </span>
            </div>
            <h1 className="mt-7 max-w-[22ch] font-serif text-display font-normal text-ink text-balance">
              {pub.title}
            </h1>
            <p className="mt-6 text-[14px] text-graphite">
              {pub.authors.join(" · ")}
            </p>
          </Reveal>
        </Container>
      </header>

      <Container className="py-16 md:py-24">
        <div className="mx-auto grid max-w-4xl gap-16 lg:grid-cols-[1fr_14rem]">
          <Reveal className="order-2 lg:order-1">
            <h2 className="font-mono text-[11px] uppercase tracking-eyebrow text-bronze">
              Abstract
            </h2>
            <p className="mt-5 font-serif text-title leading-[1.55] text-ink-soft text-pretty">
              {pub.abstract}
            </p>
            <div className="rule my-12" />
            <div className="space-y-7">
              {pub.body.map((para, i) => (
                <p
                  key={i}
                  className="max-w-[68ch] text-[16.5px] leading-[1.8] text-ink-soft text-pretty"
                >
                  {para}
                </p>
              ))}
            </div>
            <div className="mt-14 rounded-2xl border border-line bg-paper-deep/50 p-7">
              <p className="font-mono text-[11px] uppercase tracking-eyebrow text-bronze">
                Reproducibility
              </p>
              <p className="mt-3 text-sm leading-relaxed text-graphite">
                Full text, evaluation harness, and transcripts are available to
                reviewers and replication efforts. Discrepancy reports:{" "}
                <span className="font-mono text-[13px] text-ink-soft">evaluations@ren.ai</span>
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1} className="order-1 lg:order-2">
            <div className="space-y-6 lg:sticky lg:top-28">
              <div>
                <h3 className="font-mono text-[11px] uppercase tracking-[0.12em] text-graphite-soft">
                  Tags
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {pub.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-paper-deep px-3 py-1 text-[12px] text-graphite"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rule" />
              <div>
                <h3 className="font-mono text-[11px] uppercase tracking-[0.12em] text-graphite-soft">
                  Citation
                </h3>
                <p className="mt-3 font-mono text-[11.5px] leading-relaxed text-graphite">
                  Ren AI ({pub.date.slice(0, 4)}). {pub.title}.
                </p>
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal className="mx-auto mt-20 max-w-4xl">
          <Link
            href={`/research/${next.slug}`}
            className="group flex items-center justify-between gap-6 rounded-2xl border border-line bg-paper-raised p-8 transition-all duration-300 hover:border-stone hover:shadow-lift"
          >
            <div>
              <p className="font-mono text-[11px] uppercase tracking-eyebrow text-bronze">
                Read next
              </p>
              <p className="mt-3 font-serif text-title text-ink text-balance">{next.title}</p>
            </div>
            <ArrowRight className="size-5 shrink-0 text-graphite-soft transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </Reveal>
      </Container>
    </article>
  );
}
