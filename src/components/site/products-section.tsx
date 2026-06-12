import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { Badge } from "@/components/ui/badge";
import { products } from "@/lib/data/products";

export function ProductsSection() {
  return (
    <section className="border-t border-line bg-paper py-28 md:py-36" id="products">
      <Container>
        <SectionHeading
          eyebrow="Products"
          title={
            <>
              One model family.
              <br />
              Five instruments.
            </>
          }
          lede="Everything we ship is the same research surfaced differently — the same calibrated reasoning, whether you meet it in a conversation, a codebase, or an API call."
        />

        <div className="mt-16">
          {products.map((p, i) => (
            <Reveal key={p.slug} delay={i * 0.04}>
              <Link
                href={`/products/${p.slug}`}
                className="group grid items-baseline gap-3 border-t border-line py-9 transition-colors duration-300 hover:bg-paper-deep/40 md:grid-cols-[5rem_16rem_1fr_auto] md:gap-8 md:px-4 md:-mx-4"
              >
                <span className="font-mono text-[12px] text-graphite-soft">{p.number}</span>
                <span className="flex items-center gap-3">
                  <span className="font-serif text-headline text-ink transition-colors duration-300 group-hover:text-bronze-deep">
                    {p.name}
                  </span>
                </span>
                <span className="max-w-[52ch] text-[15px] leading-relaxed text-graphite">
                  {p.tagline} {p.forWhom}
                </span>
                <span className="flex items-center gap-4 justify-self-start md:justify-self-end">
                  <Badge tone={p.status === "Available" ? "bronze" : "outline"}>
                    {p.status}
                  </Badge>
                  <ArrowUpRight className="size-4 text-graphite-soft transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
                </span>
              </Link>
            </Reveal>
          ))}
          <div className="rule" />
        </div>
      </Container>
    </section>
  );
}
