import Link from "next/link";
import { Container } from "@/components/ui/container";
import { RenMark } from "@/components/ui/wordmark";

const columns: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Research",
    links: [
      { label: "Publications", href: "/research" },
      { label: "Safety research", href: "/research?category=Safety+Research" },
      { label: "Model cards", href: "/research?category=Model+Card" },
      { label: "Methodology", href: "/research/benchmark-methodology" },
      { label: "Model evolution", href: "/models" },
    ],
  },
  {
    heading: "Products",
    links: [
      { label: "Ren Chat", href: "/products/chat" },
      { label: "Ren Code", href: "/products/code" },
      { label: "Ren Agents", href: "/products/agents" },
      { label: "Ren API", href: "/products/api" },
      { label: "Playground", href: "/playground" },
    ],
  },
  {
    heading: "Platform",
    links: [
      { label: "API platform", href: "/platform" },
      { label: "Documentation", href: "/platform#documentation" },
      { label: "Enterprise", href: "/platform#enterprise" },
      { label: "Security", href: "/platform#security" },
      { label: "Status", href: "/platform#reliability" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "Philosophy", href: "/philosophy" },
      { label: "Internal platform", href: "/dashboard" },
      { label: "Careers", href: "/philosophy#join" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-paper-deep/60">
      <Container className="pb-12 pt-20">
        <div className="grid gap-14 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <RenMark className="size-8 text-ink" />
            <p className="mt-6 max-w-[26ch] font-serif text-title text-ink-soft">
              Building intelligence through{" "}
              <em className="text-bronze-deep">reasoning</em>.
            </p>
          </div>
          {columns.map((col) => (
            <nav key={col.heading} aria-label={col.heading}>
              <h3 className="font-mono text-[11px] uppercase tracking-eyebrow text-graphite-soft">
                {col.heading}
              </h3>
              <ul className="mt-5 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-graphite transition-colors duration-300 hover:text-ink"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="rule mt-20" />

        <div className="flex flex-col gap-4 pt-8 text-[13px] text-graphite-soft sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Ren AI. Evidence over hype.</p>
          <p className="font-mono text-[11px] uppercase tracking-[0.12em]">
            San Francisco · Kyoto · Zürich
          </p>
        </div>
      </Container>
    </footer>
  );
}
