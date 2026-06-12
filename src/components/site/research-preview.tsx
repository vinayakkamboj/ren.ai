import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { Badge } from "@/components/ui/badge";
import { formatDate, publications } from "@/lib/data/publications";

export function ResearchPreview() {
  const latest = [...publications]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);

  return (
    <section className="border-t border-line bg-paper py-28 md:py-36">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-8">
          <SectionHeading
            eyebrow="From the lab"
            title="Recent research"
            lede="Methods, evaluations, and safety findings — including the negative results."
          />
          <Reveal delay={0.1}>
            <Link
              href="/research"
              className="group inline-flex items-center gap-2 pb-2 text-sm font-medium text-ink transition-colors hover:text-bronze-deep"
            >
              All publications
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
          {latest.map((pub, i) => (
            <Reveal key={pub.slug} delay={i * 0.07} className="bg-paper">
              <Link
                href={`/research/${pub.slug}`}
                className="group flex h-full flex-col p-8 transition-colors duration-300 hover:bg-paper-deep/40 md:p-9"
              >
                <div className="flex items-center justify-between">
                  <Badge tone="outline">{pub.category}</Badge>
                  <span className="font-mono text-[11px] text-graphite-soft">
                    {formatDate(pub.date)}
                  </span>
                </div>
                <h3 className="mt-7 font-serif text-title text-ink text-balance transition-colors duration-300 group-hover:text-bronze-deep">
                  {pub.title}
                </h3>
                <p className="mt-4 line-clamp-4 text-sm leading-relaxed text-graphite">
                  {pub.abstract}
                </p>
                <span className="mt-auto pt-8 font-mono text-[11px] uppercase tracking-[0.12em] text-graphite-soft">
                  {pub.readingTime} read
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
