"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import {
  benchmarksByArea,
  capabilityAreas,
  type CapabilityArea,
} from "@/lib/data/benchmarks";
import { cn } from "@/lib/utils";

const models = ["Ren-1", "Ren-2", "Ren-3"] as const;
const barTones: Record<(typeof models)[number], string> = {
  "Ren-1": "bg-stone",
  "Ren-2": "bg-graphite-soft",
  "Ren-3": "bg-bronze",
};

export function BenchmarkSection() {
  const [area, setArea] = useState<CapabilityArea>("Reasoning");
  const rows = benchmarksByArea(area);

  return (
    <section className="border-t border-line bg-paper py-28 md:py-36" id="benchmarks">
      <Container>
        <SectionHeading
          eyebrow="Measurement"
          title={
            <>
              We publish progression, <em className="text-bronze-deep">not press releases</em>.
            </>
          }
          lede="Every number below is an internal evaluation of the Ren family under identical, published harnesses — with confidence intervals, contamination screening, and full transcripts. We compare against ourselves and let the trajectory speak."
        />

        <Reveal className="mt-16" delay={0.1}>
          {/* Capability selector */}
          <div className="flex flex-wrap gap-x-1 gap-y-2 border-b border-line pb-px" role="tablist" aria-label="Capability areas">
            {capabilityAreas.map((a) => (
              <button
                key={a}
                role="tab"
                aria-selected={area === a}
                onClick={() => setArea(a)}
                className={cn(
                  "relative rounded-t-md px-4 py-2.5 text-[13px] font-medium tracking-tight transition-colors duration-300",
                  area === a ? "text-ink" : "text-graphite-soft hover:text-graphite",
                )}
              >
                {a}
                {area === a && (
                  <motion.span
                    layoutId="benchmark-tab"
                    className="absolute inset-x-3 -bottom-px h-px bg-ink"
                    transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Results */}
          <div className="mt-12 space-y-12">
            {rows.map((row) => (
              <div key={row.benchmark} className="grid gap-6 md:grid-cols-[20rem_1fr]">
                <div>
                  <h3 className="font-serif text-title text-ink">{row.benchmark}</h3>
                  <p className="mt-2 max-w-[34ch] text-sm leading-relaxed text-graphite">
                    {row.description}
                  </p>
                  <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.12em] text-graphite-soft">
                    {row.metric}
                  </p>
                </div>
                <div className="space-y-3 self-center">
                  {models.map((m) => (
                    <div key={m} className="grid grid-cols-[3.6rem_1fr_3.4rem] items-center gap-4">
                      <span
                        className={cn(
                          "font-mono text-[11px] tracking-[0.08em]",
                          m === "Ren-3" ? "text-bronze-deep" : "text-graphite-soft",
                        )}
                      >
                        {m}
                      </span>
                      <div className="h-[7px] overflow-hidden rounded-full bg-paper-deep">
                        <motion.div
                          key={`${area}-${row.benchmark}-${m}`}
                          className={cn("h-full rounded-full", barTones[m])}
                          initial={{ width: 0 }}
                          whileInView={{ width: `${row.scores[m]}%` }}
                          viewport={{ once: true, margin: "-40px" }}
                          transition={{ duration: 1.1, ease: [0.25, 1, 0.5, 1], delay: 0.1 }}
                        />
                      </div>
                      <span
                        className={cn(
                          "tnum text-right text-sm",
                          m === "Ren-3" ? "font-medium text-ink" : "text-graphite-soft",
                        )}
                      >
                        {row.scores[m].toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="rule mt-14" />
          <p className="mt-5 text-[12px] text-graphite-soft">
            Pass@1 unless noted · 95% confidence intervals ≤ ±1.5 points on all
            reported results · Benchmarks found in training data are retired
            publicly.
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
