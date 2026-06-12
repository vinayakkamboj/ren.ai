export interface Product {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  status: "Available" | "Limited preview" | "Research preview";
  capabilities: { title: string; detail: string }[];
  forWhom: string;
  number: string;
}

export const products: Product[] = [
  {
    slug: "chat",
    name: "Ren Chat",
    number: "01",
    tagline: "A thinking partner, not a search box.",
    status: "Available",
    description:
      "Ren Chat is built around deliberation. It reasons before it responds, shows its uncertainty honestly, and holds context across conversations measured in books, not messages.",
    forWhom: "For researchers, analysts, writers, and anyone whose work is thinking.",
    capabilities: [
      {
        title: "Calibrated answers",
        detail:
          "Ren states confidence explicitly and says \"I don't know\" when that is the true answer. Confidently wrong responses are the failure mode we optimize against hardest.",
      },
      {
        title: "Visible reasoning",
        detail:
          "Expand any response to read the deliberation behind it — the considerations weighed, the paths abandoned, the evidence cited.",
      },
      {
        title: "Million-token memory",
        detail:
          "Entire codebases, full manuscripts, years of records — in context natively, with comprehension that holds at full range.",
      },
    ],
  },
  {
    slug: "code",
    name: "Ren Code",
    number: "02",
    tagline: "An engineer that verifies its own work.",
    status: "Available",
    description:
      "Ren Code resolves real engineering tasks end-to-end: it reads the codebase, plans the change, writes the patch, runs the tests, and audits its own output through a blinded verification pass before you ever see it.",
    forWhom: "For engineering teams that measure twice.",
    capabilities: [
      {
        title: "Repository-scale context",
        detail:
          "Whole-codebase comprehension, not file-window guessing. Ren Code reasons about architecture, conventions, and blast radius.",
      },
      {
        title: "Self-verification",
        detail:
          "Every patch is independently re-derived and checked by a verification pass that cannot see the original reasoning — catching 83% of would-be regressions before review.",
      },
      {
        title: "72.3% SWE-bench Verified",
        detail:
          "Measured under our published harness with full transcripts available. Every number reproducible, every failure documented.",
      },
    ],
  },
  {
    slug: "agents",
    name: "Ren Agents",
    number: "03",
    tagline: "Autonomy with an audit trail.",
    status: "Limited preview",
    description:
      "Ren Agents sustain multi-hour task horizons — research, operations, engineering — while logging every action, citing every source, and escalating to humans at calibrated uncertainty thresholds.",
    forWhom: "For organizations that need delegation, not abdication.",
    capabilities: [
      {
        title: "Eight-hour horizons",
        detail:
          "Sustained autonomous operation under evaluation, with instruction adherence measured continuously across the session.",
      },
      {
        title: "Calibrated escalation",
        detail:
          "Agents know what they don't know. Below a confidence threshold you set, they stop and ask rather than guess.",
      },
      {
        title: "Complete provenance",
        detail:
          "Every action, every tool call, every intermediate conclusion is logged and replayable. Trust is built on inspection, not faith.",
      },
    ],
  },
  {
    slug: "api",
    name: "Ren API",
    number: "04",
    tagline: "Frontier reasoning as infrastructure.",
    status: "Available",
    description:
      "The full Ren-3 family behind a stable, versioned API — with the reliability engineering of critical infrastructure: 99.95% uptime SLA, regional deployment, and latency budgets we publish and meet.",
    forWhom: "For teams building products that cannot afford to be wrong.",
    capabilities: [
      {
        title: "Deliberation control",
        detail:
          "Tune the reasoning budget per request — from instant responses to extended deliberation — with cost and latency that scale transparently.",
      },
      {
        title: "Structured reliability",
        detail:
          "Native structured outputs, strict schemas, and confidence scores on every generation.",
      },
      {
        title: "Enterprise deployment",
        detail:
          "VPC and on-premise options, SOC 2 Type II, zero data retention by default. Your data trains nothing.",
      },
    ],
  },
  {
    slug: "research",
    name: "Ren Research",
    number: "05",
    tagline: "The work behind the work.",
    status: "Research preview",
    description:
      "Open publication of our methods, evaluations, and safety findings — including the negative results. Ren Research is the institutional commitment that everything we claim can be checked.",
    forWhom: "For the scientific community, and for anyone holding us accountable.",
    capabilities: [
      {
        title: "Full harness publication",
        detail:
          "Every benchmark we report ships with the exact harness that produced it. Reproduce our numbers, or tell us where they break.",
      },
      {
        title: "Negative results, published",
        detail:
          "Failed approaches, ambiguous safety findings, retired benchmarks — documented with the same care as the wins.",
      },
      {
        title: "Living model cards",
        detail:
          "Limitations discovered after release are added to the record, dated, with reproduction steps. The documentation never stops being true.",
      },
    ],
  },
];

export function productBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}
