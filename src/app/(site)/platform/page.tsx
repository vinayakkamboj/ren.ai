import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/section-heading";
import { PageIntro } from "@/components/site/page-intro";
import { ShieldCheck, BookOpen, Boxes, Server, Activity, KeyRound } from "lucide-react";

export const metadata: Metadata = {
  title: "API Platform",
  description:
    "Enterprise access to the Ren-3 family: API, documentation, SDKs, deployment options, security, and reliability engineering.",
};

const pillars = [
  {
    id: "access",
    icon: KeyRound,
    title: "API access",
    body: "Versioned, stable endpoints for the full Ren-3 family. Deliberation budgets, structured outputs, and confidence scores are first-class request parameters — not afterthoughts.",
    points: ["Stable versioning with 12-month deprecation windows", "Adaptive or fixed deliberation per request", "Streaming, batch, and asynchronous modes"],
  },
  {
    id: "documentation",
    icon: BookOpen,
    title: "Documentation",
    body: "Documentation written by the researchers who built the models. Every parameter explained, every failure mode documented, every example runnable.",
    points: ["Conceptual guides for calibration and deliberation", "Complete API reference with typed examples", "Published latency and cost envelopes"],
  },
  {
    id: "sdks",
    icon: Boxes,
    title: "SDK support",
    body: "First-party SDKs that respect your codebase: typed, minimal, dependency-light, and versioned in lockstep with the API.",
    points: ["TypeScript, Python, and Go — first-party", "Strict schemas with native structured outputs", "Open-source, with public issue tracking"],
  },
  {
    id: "enterprise",
    icon: Server,
    title: "Enterprise deployment",
    body: "Deploy where your constraints live: our cloud, your VPC, or fully on-premise — including air-gapped environments for regulated industries.",
    points: ["VPC peering and private endpoints", "On-premise and air-gapped deployment", "Regional data residency in nine regions"],
  },
  {
    id: "security",
    icon: ShieldCheck,
    title: "Security",
    body: "Zero data retention by default. Your prompts and outputs train nothing, are stored nowhere, and are visible to no one — including us.",
    points: ["SOC 2 Type II, ISO 27001, HIPAA-ready", "Zero retention by default; configurable audit trails", "Annual third-party penetration tests, published summaries"],
  },
  {
    id: "reliability",
    icon: Activity,
    title: "Reliability",
    body: "We publish our latency budgets and our incident history, and we meet our SLAs the way we report benchmarks: with numbers you can hold us to.",
    points: ["99.95% uptime SLA on production tiers", "p50 latency budgets published per region", "Public status page with full incident postmortems"],
  },
];

export default function PlatformPage() {
  return (
    <>
      <PageIntro
        eyebrow="API platform"
        title={
          <>
            Built for teams that <em className="text-bronze-deep">cannot afford to be wrong</em>.
          </>
        }
        lede="Enterprise access to the Ren-3 family, engineered with the reliability discipline of critical infrastructure. Calibrated reasoning, deployed on your terms."
      >
        <div className="mt-10 flex flex-wrap gap-4">
          <Button href="/playground" size="lg">
            Try Ren
          </Button>
          <Button href="/products/api" variant="outline" size="lg">
            About Ren API
          </Button>
        </div>
      </PageIntro>

      <Container className="py-20 md:py-28">
        <div className="grid gap-x-16 gap-y-20 md:grid-cols-2">
          {pillars.map((p, i) => (
            <Reveal key={p.id} delay={(i % 2) * 0.08}>
              <section id={p.id} className="scroll-mt-28">
                <div className="flex size-11 items-center justify-center rounded-xl border border-line bg-paper-raised">
                  <p.icon className="size-5 text-bronze" strokeWidth={1.6} />
                </div>
                <h2 className="mt-6 font-serif text-headline text-ink">{p.title}</h2>
                <p className="mt-4 max-w-[52ch] text-[15.5px] leading-relaxed text-graphite text-pretty">
                  {p.body}
                </p>
                <ul className="mt-6 space-y-3">
                  {p.points.map((pt) => (
                    <li key={pt} className="flex gap-3 border-t border-line pt-3 text-sm leading-relaxed text-ink-soft">
                      <span aria-hidden className="mt-[0.55em] block size-1 shrink-0 rounded-full bg-bronze-soft" />
                      {pt}
                    </li>
                  ))}
                </ul>
              </section>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-28 rounded-2xl border border-line bg-ink p-10 md:p-14">
          <div className="grid items-center gap-10 md:grid-cols-[1fr_auto]">
            <div>
              <Eyebrow className="text-bronze-soft">Enterprise</Eyebrow>
              <h2 className="mt-4 max-w-[24ch] font-serif text-display font-normal text-paper text-balance">
                Talk to the team that builds the models.
              </h2>
              <p className="mt-5 max-w-[50ch] text-[15.5px] leading-relaxed text-paper/65">
                Enterprise onboarding is run by research engineers, not account
                executives. Bring your hardest workload and your security
                questionnaire.
              </p>
            </div>
            <Button href="/products/api" variant="inverse" size="lg">
              Contact engineering
            </Button>
          </div>
        </Reveal>
      </Container>
    </>
  );
}
