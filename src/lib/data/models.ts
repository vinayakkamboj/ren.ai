export interface ModelGeneration {
  id: string;
  name: string;
  released: string;
  epoch: string;
  thesis: string;
  contextWindow: string;
  composite: number;
  milestones: string[];
  training: string[];
  gains: { label: string; value: string }[];
}

export const modelGenerations: ModelGeneration[] = [
  {
    id: "ren-1",
    name: "Ren-1",
    released: "March 2024",
    epoch: "Foundation",
    thesis:
      "Establish a measurement-first training stack. Ren-1 was built to be evaluated, not demonstrated — every capability claim traceable to a held-out benchmark.",
    contextWindow: "32k tokens",
    composite: 32.2,
    milestones: [
      "First end-to-end training run on the Kiln research cluster",
      "Internal evaluation harness (Ledger) shipped alongside the model",
      "Deterministic data pipeline with full provenance tracking",
    ],
    training: [
      "2.1T curated tokens, deduplicated at the paragraph level",
      "Curriculum ordering by reasoning density",
      "Baseline RLHF with adversarial preference data",
    ],
    gains: [
      { label: "Composite evaluation", value: "32.2" },
      { label: "Context window", value: "32k" },
      { label: "Calibration (ECE⁻¹)", value: "61.0" },
    ],
  },
  {
    id: "ren-2",
    name: "Ren-2",
    released: "April 2025",
    epoch: "Deliberation",
    thesis:
      "Move compute from memorization to inference. Ren-2 introduced trained deliberation — the model learns when a problem deserves extended reasoning, and spends accordingly.",
    contextWindow: "200k tokens",
    composite: 56.3,
    milestones: [
      "Adaptive deliberation: variable test-time compute, learned not scheduled",
      "Process-level reward models for verifiable domains",
      "First production deployments of Ren Code inside partner engineering teams",
    ],
    training: [
      "Reinforcement learning from execution feedback on 40M code tasks",
      "Synthetic reasoning traces verified by formal checkers",
      "Long-context curriculum extended to 200k with positional interpolation",
    ],
    gains: [
      { label: "Composite evaluation", value: "+24.1 → 56.3" },
      { label: "SWE-bench Verified", value: "18.4 → 44.9" },
      { label: "Context window", value: "32k → 200k" },
    ],
  },
  {
    id: "ren-3",
    name: "Ren-3",
    released: "February 2026",
    epoch: "Agency",
    thesis:
      "Reliability is the capability. Ren-3 holds multi-hour task horizons with calibrated confidence — it acts, verifies its own work, and reports uncertainty honestly.",
    contextWindow: "1M tokens",
    composite: 78.5,
    milestones: [
      "Self-verification loops: the model audits its own outputs before returning them",
      "86.7% on AIME 2025; 72.3% on SWE-bench Verified",
      "Sustained 8-hour autonomous engineering sessions under evaluation",
    ],
    training: [
      "Large-scale agentic RL in 12,000 sandboxed environments",
      "Calibration-aware objectives — penalizing confident error over admitted uncertainty",
      "1M-token context trained natively, not extrapolated",
    ],
    gains: [
      { label: "Composite evaluation", value: "+22.2 → 78.5" },
      { label: "Agentic task success", value: "31.5 → 58.9" },
      { label: "Factual precision", value: "84.6 → 96.3" },
    ],
  },
];
