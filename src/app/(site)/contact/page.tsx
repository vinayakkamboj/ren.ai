import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { PageIntro } from "@/components/site/page-intro";

export const metadata: Metadata = {
  title: "Contact — Ren AI",
  description: "Get in touch with Ren AI.",
};

const channels = [
  {
    label: "General",
    href: "mailto:hello@ren.ai",
    display: "hello@ren.ai",
    detail: "Questions about Ren AI, Ren Code, or Astra.",
  },
  {
    label: "Research",
    href: "mailto:research@ren.ai",
    display: "research@ren.ai",
    detail: "Research collaboration, evaluation methodology, and technical questions.",
  },
  {
    label: "Press",
    href: "mailto:press@ren.ai",
    display: "press@ren.ai",
    detail: "Media inquiries and press coverage.",
  },
];

export default function ContactPage() {
  return (
    <>
      <PageIntro
        eyebrow="Contact"
        title="Get in touch."
        lede="We are a small team. We read every message, even if we cannot always reply quickly."
      />

      <Container className="py-20 md:py-28">
        <div className="max-w-xl">
          {channels.map((c, i) => (
            <Reveal
              key={c.label}
              delay={i * 0.06}
              className="border-t border-line py-7"
            >
              <p className="font-mono text-[11px] uppercase tracking-eyebrow text-graphite-soft">
                {c.label}
              </p>
              <Link
                href={c.href}
                className="mt-2 block font-serif text-headline text-ink-soft transition-colors hover:text-bronze-deep"
              >
                {c.display}
              </Link>
              <p className="mt-2 text-[14px] leading-relaxed text-graphite">
                {c.detail}
              </p>
            </Reveal>
          ))}
          <div className="rule" />
        </div>
      </Container>
    </>
  );
}
