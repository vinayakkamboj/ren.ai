export type CapabilityArea =
  | "Reasoning"
  | "Coding"
  | "Software Engineering"
  | "Agentic Tasks"
  | "Tool Usage"
  | "Long Context"
  | "Reliability";

export interface BenchmarkResult {
  area: CapabilityArea;
  benchmark: string;
  metric: string;
  description: string;
  scores: { "Ren-1": number; "Ren-2": number; "Ren-3": number };
}

export const capabilityAreas: CapabilityArea[] = [
  "Reasoning",
  "Coding",
  "Software Engineering",
  "Agentic Tasks",
  "Tool Usage",
  "Long Context",
  "Reliability",
];

/**
 * All scores are internal evaluations of the Ren model family under
 * identical harnesses, reported as pass@1 unless noted. We publish
 * progression against ourselves, not adversarial comparisons.
 */
export const benchmarks: BenchmarkResult[] = [
  {
    area: "Reasoning",
    benchmark: "GPQA Diamond",
    metric: "accuracy",
    description: "Graduate-level science questions written to defeat retrieval.",
    scores: { "Ren-1": 41.2, "Ren-2": 62.8, "Ren-3": 81.4 },
  },
  {
    area: "Reasoning",
    benchmark: "AIME 2025",
    metric: "solve rate",
    description: "Competition mathematics, full solutions required.",
    scores: { "Ren-1": 12.0, "Ren-2": 48.7, "Ren-3": 86.7 },
  },
  {
    area: "Reasoning",
    benchmark: "ARC-AGI (semi-private)",
    metric: "accuracy",
    description: "Abstract pattern induction from minimal examples.",
    scores: { "Ren-1": 9.3, "Ren-2": 27.1, "Ren-3": 54.6 },
  },
  {
    area: "Coding",
    benchmark: "LiveCodeBench",
    metric: "pass@1",
    description: "Contamination-controlled competitive programming.",
    scores: { "Ren-1": 31.5, "Ren-2": 58.2, "Ren-3": 79.8 },
  },
  {
    area: "Coding",
    benchmark: "HumanEval+",
    metric: "pass@1",
    description: "Function synthesis with extended hidden tests.",
    scores: { "Ren-1": 68.9, "Ren-2": 88.4, "Ren-3": 97.6 },
  },
  {
    area: "Software Engineering",
    benchmark: "SWE-bench Verified",
    metric: "resolved",
    description: "Real GitHub issues resolved end-to-end in repository context.",
    scores: { "Ren-1": 18.4, "Ren-2": 44.9, "Ren-3": 72.3 },
  },
  {
    area: "Software Engineering",
    benchmark: "RepoBench-XL (internal)",
    metric: "resolved",
    description: "Multi-service refactors across 100k-line codebases.",
    scores: { "Ren-1": 7.1, "Ren-2": 29.5, "Ren-3": 58.0 },
  },
  {
    area: "Agentic Tasks",
    benchmark: "WebArena",
    metric: "success rate",
    description: "Long-horizon tasks in realistic web environments.",
    scores: { "Ren-1": 14.2, "Ren-2": 38.6, "Ren-3": 66.1 },
  },
  {
    area: "Agentic Tasks",
    benchmark: "OSWorld",
    metric: "success rate",
    description: "Open-ended tasks across full operating systems.",
    scores: { "Ren-1": 8.8, "Ren-2": 24.3, "Ren-3": 51.7 },
  },
  {
    area: "Tool Usage",
    benchmark: "BFCL v3",
    metric: "overall",
    description: "Function calling: parallel, dependent, and multi-turn.",
    scores: { "Ren-1": 52.4, "Ren-2": 74.9, "Ren-3": 91.2 },
  },
  {
    area: "Tool Usage",
    benchmark: "ToolComp (internal)",
    metric: "exact match",
    description: "Compositional tool chains with latent dependencies.",
    scores: { "Ren-1": 33.0, "Ren-2": 61.5, "Ren-3": 84.8 },
  },
  {
    area: "Long Context",
    benchmark: "RULER @ 512k",
    metric: "accuracy",
    description: "Retrieval, aggregation, and tracing at half-million tokens.",
    scores: { "Ren-1": 22.6, "Ren-2": 67.3, "Ren-3": 93.4 },
  },
  {
    area: "Long Context",
    benchmark: "LongBench v2",
    metric: "accuracy",
    description: "Deep comprehension over books, codebases, and archives.",
    scores: { "Ren-1": 31.8, "Ren-2": 55.0, "Ren-3": 78.9 },
  },
  {
    area: "Reliability",
    benchmark: "Calibration (ECE⁻¹)",
    metric: "calibration",
    description: "Inverse expected calibration error. Knowing what it knows.",
    scores: { "Ren-1": 61.0, "Ren-2": 78.4, "Ren-3": 94.1 },
  },
  {
    area: "Reliability",
    benchmark: "HallucinationQA (internal)",
    metric: "factual precision",
    description: "Precision under adversarial prompts designed to elicit confabulation.",
    scores: { "Ren-1": 70.2, "Ren-2": 84.6, "Ren-3": 96.3 },
  },
];

export function benchmarksByArea(area: CapabilityArea): BenchmarkResult[] {
  return benchmarks.filter((b) => b.area === area);
}

/** Mean score per model across every benchmark — used for the evolution chart. */
export function compositeScores() {
  const models = ["Ren-1", "Ren-2", "Ren-3"] as const;
  return models.map((m) => ({
    model: m,
    score:
      Math.round(
        (benchmarks.reduce((acc, b) => acc + b.scores[m], 0) / benchmarks.length) * 10,
      ) / 10,
  }));
}
