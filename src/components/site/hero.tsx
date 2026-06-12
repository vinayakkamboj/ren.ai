"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";

const ease = [0.25, 1, 0.5, 1] as const;

const stats = [
  { label: "AIME 2025", value: "86.7%" },
  { label: "SWE-bench Verified", value: "72.3%" },
  { label: "Context", value: "1M tokens" },
  { label: "Calibration ECE", value: "0.059" },
];

export function Hero() {
  const reduce = useReducedMotion();
  const enter = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 28 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.9, delay, ease },
        };

  return (
    <section className="relative overflow-hidden">
      {/* Faint open-circle watermark — the Ren mark at architectural scale */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[24rem] -top-[20rem] hidden lg:block"
      >
        <svg width="900" height="900" viewBox="0 0 32 32" fill="none">
          <path
            d="M27.5 12.4A12 12 0 1 0 28 16"
            stroke="var(--color-line)"
            strokeWidth="0.22"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <Container className="relative pb-24 pt-40 md:pb-32 md:pt-52">
        <motion.p
          {...enter(0)}
          className="font-mono text-[11px] uppercase tracking-eyebrow text-bronze"
        >
          Ren-3 — released February 2026
        </motion.p>

        <motion.h1
          {...enter(0.08)}
          className="mt-8 max-w-[14ch] font-serif text-display-xl font-normal text-ink"
        >
          Building intelligence through{" "}
          <em className="text-bronze-deep">reasoning</em>.
        </motion.h1>

        <motion.p
          {...enter(0.18)}
          className="mt-8 max-w-[52ch] text-lede text-graphite text-pretty"
        >
          Ren AI develops advanced reasoning systems, coding models, and
          autonomous agents designed to expand human capability.
        </motion.p>

        <motion.div {...enter(0.28)} className="mt-12 flex flex-wrap items-center gap-4">
          <Button href="/playground" size="lg">
            Try Ren
          </Button>
          <Button href="/research" variant="outline" size="lg">
            Research
            <ArrowUpRight className="size-4 text-graphite transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Button>
        </motion.div>

        <motion.div {...enter(0.42)} className="mt-24 md:mt-32">
          <div className="rule" />
          <dl className="grid grid-cols-2 gap-x-8 gap-y-8 pt-8 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-graphite-soft">
                  {s.label}
                </dt>
                <dd className="tnum mt-2 font-serif text-headline text-ink">
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 text-[12px] text-graphite-soft">
            Internal evaluations under the published Ledger harness. Methodology
            and full transcripts in{" "}
            <Link
              href="/research/benchmark-methodology"
              className="underline decoration-line-strong underline-offset-4 hover:text-graphite"
            >
              How We Report Numbers
            </Link>
            .
          </p>
        </motion.div>
      </Container>
    </section>
  );
}
