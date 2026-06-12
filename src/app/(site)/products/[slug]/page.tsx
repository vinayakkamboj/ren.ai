import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/section-heading";
import { productBySlug, products } from "@/lib/data/products";
import { cn } from "@/lib/utils";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = productBySlug(slug);
  if (!product) return {};
  return { title: product.name, description: product.tagline };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = productBySlug(slug);
  if (!product) notFound();

  return (
    <>
      <header className="border-b border-line">
        <Container className="pb-16 pt-40 md:pb-24 md:pt-48">
          <Reveal>
            <div className="flex items-center gap-4">
              <Eyebrow>Product {product.number}</Eyebrow>
              <Badge tone={product.status === "Available" ? "bronze" : "outline"}>
                {product.status}
              </Badge>
            </div>
            <h1 className="mt-6 font-serif text-display-xl font-normal text-ink">
              {product.name}
            </h1>
            <p className="mt-6 max-w-[26ch] font-serif text-headline italic text-bronze-deep text-balance">
              {product.tagline}
            </p>
            <p className="mt-8 max-w-[56ch] text-lede text-graphite text-pretty">
              {product.description}
            </p>
            <p className="mt-4 max-w-[56ch] text-[15px] text-graphite-soft">{product.forWhom}</p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Button href="/playground" size="lg">
                Try Ren
              </Button>
              <Button href="/platform" variant="outline" size="lg">
                API access
              </Button>
            </div>
          </Reveal>
        </Container>
      </header>

      <Container className="py-20 md:py-28">
        <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
          {product.capabilities.map((c, i) => (
            <Reveal key={c.title} delay={i * 0.08} className="bg-paper p-8 md:p-10">
              <span className="font-mono text-[12px] text-graphite-soft">
                0{i + 1}
              </span>
              <h2 className="mt-6 font-serif text-title text-ink">{c.title}</h2>
              <p className="mt-4 text-[15px] leading-relaxed text-graphite text-pretty">
                {c.detail}
              </p>
            </Reveal>
          ))}
        </div>

        {/* Product switcher */}
        <Reveal className="mt-24">
          <div className="rule" />
          <nav className="flex flex-wrap gap-x-8 gap-y-3 pt-8" aria-label="All products">
            {products.map((p) => (
              <Link
                key={p.slug}
                href={`/products/${p.slug}`}
                className={cn(
                  "group inline-flex items-center gap-2 text-[15px] font-medium tracking-tight transition-colors duration-300",
                  p.slug === product.slug
                    ? "text-bronze-deep"
                    : "text-graphite hover:text-ink",
                )}
              >
                {p.name}
                {p.slug !== product.slug && (
                  <ArrowRight className="size-3.5 opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100" />
                )}
              </Link>
            ))}
          </nav>
        </Reveal>
      </Container>
    </>
  );
}
