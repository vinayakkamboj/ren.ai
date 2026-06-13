import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { PageIntro } from "@/components/site/page-intro";

export const metadata: Metadata = {
  title: "Status — Ren AI",
  description: "Current operational status of Ren AI services.",
};

const services = [
  { name: "Ren Code", status: "operational" as const },
  { name: "Authentication", status: "operational" as const },
  { name: "Astra inference", status: "development" as const },
  { name: "API platform", status: "development" as const },
  { name: "Documentation", status: "operational" as const },
];

const statusConfig = {
  operational: { label: "Operational", dot: "bg-signal-green", text: "text-signal-green" },
  development: { label: "In development", dot: "bg-bronze", text: "text-bronze-deep" },
  degraded: { label: "Degraded", dot: "bg-signal-amber", text: "text-signal-amber" },
  outage: { label: "Outage", dot: "bg-signal-red", text: "text-signal-red" },
};

export default function StatusPage() {
  return (
    <>
      <PageIntro
        eyebrow="Status"
        title="System status."
        lede="Current operational status of all Ren AI services."
      />

      <Container className="py-20 md:py-28">
        <Reveal className="max-w-xl">
          <div className="overflow-hidden rounded-2xl border border-line">
            {services.map((service, i) => {
              const cfg = statusConfig[service.status];
              return (
                <div
                  key={service.name}
                  className={`flex items-center justify-between px-6 py-4 ${
                    i < services.length - 1 ? "border-b border-line" : ""
                  }`}
                >
                  <span className="text-[14.5px] font-medium text-ink">
                    {service.name}
                  </span>
                  <span className={`flex items-center gap-2 text-[13px] font-medium ${cfg.text}`}>
                    <span className={`size-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.12em] text-graphite-soft">
            Last updated · {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </Reveal>
      </Container>
    </>
  );
}
