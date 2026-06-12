import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";

const features = [
  { title: "99.95% uptime SLA", detail: "Latency budgets published and met, region by region." },
  { title: "Zero retention", detail: "Your data trains nothing. SOC 2 Type II, VPC, on-premise." },
  { title: "Deliberation control", detail: "Tune reasoning budget per request, from instant to extended." },
  { title: "SDKs that respect you", detail: "TypeScript, Python, Go — typed, versioned, documented." },
];

const codeSample = [
  { t: "import", c: "kw" },
  { t: " { Ren } ", c: "p" },
  { t: "from", c: "kw" },
  { t: " ", c: "p" },
  { t: '"@ren-ai/sdk"', c: "str" },
  { t: ";\n\n", c: "p" },
  { t: "const", c: "kw" },
  { t: " ren = ", c: "p" },
  { t: "new", c: "kw" },
  { t: " Ren();\n\n", c: "p" },
  { t: "const", c: "kw" },
  { t: " answer = ", c: "p" },
  { t: "await", c: "kw" },
  { t: " ren.reason({\n  model: ", c: "p" },
  { t: '"ren-3-large"', c: "str" },
  { t: ",\n  deliberation: ", c: "p" },
  { t: '"adaptive"', c: "str" },
  { t: ",\n  input: question,\n});\n\n", c: "p" },
  { t: "if", c: "kw" },
  { t: " (answer.confidence < ", c: "p" },
  { t: "0.85", c: "num" },
  { t: ") {\n  ", c: "p" },
  { t: "// Calibrated — low confidence means verify", c: "cm" },
  { t: "\n  escalateToHuman(answer);\n}", c: "p" },
];

const tone: Record<string, string> = {
  kw: "text-bronze-soft",
  str: "text-[#a8b89a]",
  num: "text-[#c9ad79]",
  cm: "text-dusk-faint italic",
  p: "text-dusk/90",
};

export function PlatformSection() {
  return (
    <section className="border-t border-line bg-paper-deep/50 py-28 md:py-36">
      <Container>
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="API platform"
              title={
                <>
                  Frontier reasoning as{" "}
                  <em className="text-bronze-deep">infrastructure</em>.
                </>
              }
              lede="The full Ren-3 family behind a stable, versioned API — engineered with the reliability discipline of critical infrastructure, because that is what it becomes."
            />
            <Reveal delay={0.1}>
              <dl className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2">
                {features.map((f) => (
                  <div key={f.title} className="border-t border-line-strong pt-4">
                    <dt className="text-[15px] font-medium tracking-tight text-ink">{f.title}</dt>
                    <dd className="mt-1.5 text-sm leading-relaxed text-graphite">{f.detail}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-12 flex flex-wrap gap-4">
                <Button href="/platform">Explore the platform</Button>
                <Button href="/platform#documentation" variant="outline">
                  Documentation
                </Button>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.15}>
            <div className="overflow-hidden rounded-2xl border border-carbon-line bg-carbon shadow-float">
              <div className="flex items-center justify-between border-b border-carbon-line px-5 py-3">
                <span className="font-mono text-[11px] text-dusk-muted">reason.ts</span>
                <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-dusk-faint">
                  @ren-ai/sdk · v3.1
                </span>
              </div>
              <pre className="overflow-x-auto p-6 font-mono text-[13px] leading-[1.75]">
                <code>
                  {codeSample.map((seg, i) => (
                    <span key={i} className={tone[seg.c]}>
                      {seg.t}
                    </span>
                  ))}
                </code>
              </pre>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
