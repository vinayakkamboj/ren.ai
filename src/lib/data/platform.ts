/**
 * Mock data for the internal research platform.
 * In production these are served from PostgreSQL (see db/schema.sql);
 * the UI consumes the same shapes through the data-access layer.
 */

export type RunStatus = "running" | "completed" | "failed" | "queued" | "paused";

export interface TrainingRun {
  id: string;
  name: string;
  model: string;
  status: RunStatus;
  progress: number;
  loss: number;
  lossDelta: number;
  tokensSeen: string;
  gpus: number;
  cluster: string;
  startedAt: string;
  owner: string;
  lossCurve: number[];
}

export const trainingRuns: TrainingRun[] = [
  {
    id: "run-4129",
    name: "ren4-base-2.4T-curriculum-v3",
    model: "Ren-4 (pretraining)",
    status: "running",
    progress: 67,
    loss: 1.842,
    lossDelta: -0.013,
    tokensSeen: "1.61T / 2.40T",
    gpus: 4096,
    cluster: "kiln-west",
    startedAt: "2026-05-02",
    owner: "pretraining",
    lossCurve: [2.91, 2.54, 2.31, 2.17, 2.06, 1.98, 1.93, 1.89, 1.86, 1.84],
  },
  {
    id: "run-4127",
    name: "ren3.2-agentic-rl-envset-9",
    model: "Ren-3.2 (post-training)",
    status: "running",
    progress: 41,
    loss: 0.412,
    lossDelta: -0.027,
    tokensSeen: "8.9B / 21.7B",
    gpus: 1024,
    cluster: "kiln-east",
    startedAt: "2026-06-01",
    owner: "agents",
    lossCurve: [0.71, 0.64, 0.58, 0.53, 0.49, 0.47, 0.45, 0.43, 0.42, 0.41],
  },
  {
    id: "run-4121",
    name: "ren3.2-calibration-asym-loss-b",
    model: "Ren-3.2 (post-training)",
    status: "completed",
    progress: 100,
    loss: 0.196,
    lossDelta: -0.004,
    tokensSeen: "14.2B / 14.2B",
    gpus: 512,
    cluster: "kiln-east",
    startedAt: "2026-05-21",
    owner: "safety",
    lossCurve: [0.44, 0.37, 0.32, 0.28, 0.25, 0.23, 0.21, 0.2, 0.2, 0.2],
  },
  {
    id: "run-4118",
    name: "ren4-moe-router-ablation-04",
    model: "Ren-4 (research)",
    status: "failed",
    progress: 23,
    loss: 3.871,
    lossDelta: 1.204,
    tokensSeen: "0.18T / 0.80T",
    gpus: 768,
    cluster: "kiln-west",
    startedAt: "2026-05-29",
    owner: "architecture",
    lossCurve: [2.95, 2.61, 2.4, 2.31, 2.28, 2.34, 2.61, 3.02, 3.5, 3.87],
  },
  {
    id: "run-4131",
    name: "ren3.2-longctx-aggregation-ft",
    model: "Ren-3.2 (post-training)",
    status: "queued",
    progress: 0,
    loss: 0,
    lossDelta: 0,
    tokensSeen: "0 / 6.4B",
    gpus: 256,
    cluster: "kiln-east",
    startedAt: "—",
    owner: "pretraining",
    lossCurve: [],
  },
  {
    id: "run-4115",
    name: "ren4-data-mixture-grid-12of16",
    model: "Ren-4 (research)",
    status: "completed",
    progress: 100,
    loss: 2.034,
    lossDelta: -0.002,
    tokensSeen: "0.40T / 0.40T",
    gpus: 1024,
    cluster: "kiln-west",
    startedAt: "2026-05-11",
    owner: "data",
    lossCurve: [2.88, 2.6, 2.42, 2.3, 2.21, 2.15, 2.1, 2.07, 2.05, 2.03],
  },
];

export interface RegistryModel {
  id: string;
  name: string;
  family: string;
  stage: "production" | "staging" | "research" | "deprecated";
  context: string;
  composite: number;
  released: string;
  checkpoints: number;
  servingRegions: number;
}

export const modelRegistry: RegistryModel[] = [
  { id: "ren-3-large-20260210", name: "ren-3-large", family: "Ren-3", stage: "production", context: "1M", composite: 78.5, released: "2026-02-10", checkpoints: 14, servingRegions: 9 },
  { id: "ren-3-fast-20260210", name: "ren-3-fast", family: "Ren-3", stage: "production", context: "1M", composite: 71.2, released: "2026-02-10", checkpoints: 11, servingRegions: 9 },
  { id: "ren-3.2-large-rc2", name: "ren-3.2-large-rc2", family: "Ren-3", stage: "staging", context: "1M", composite: 81.9, released: "—", checkpoints: 6, servingRegions: 2 },
  { id: "ren-4-base-ckpt-1610", name: "ren-4-base @ 1.61T", family: "Ren-4", stage: "research", context: "1M", composite: 64.4, released: "—", checkpoints: 161, servingRegions: 0 },
  { id: "ren-2-large-20250428", name: "ren-2-large", family: "Ren-2", stage: "production", context: "200k", composite: 56.3, released: "2025-04-28", checkpoints: 9, servingRegions: 6 },
  { id: "ren-1-20240315", name: "ren-1", family: "Ren-1", stage: "deprecated", context: "32k", composite: 32.2, released: "2024-03-15", checkpoints: 4, servingRegions: 0 },
];

export interface Dataset {
  id: string;
  name: string;
  domain: string;
  size: string;
  tokens: string;
  provenance: "licensed" | "synthetic" | "curated" | "partner";
  contamination: "screened" | "pending" | "flagged";
  updated: string;
}

export const datasets: Dataset[] = [
  { id: "ds-201", name: "corpus-reasoning-dense-v7", domain: "Reasoning", size: "8.2 TB", tokens: "612B", provenance: "curated", contamination: "screened", updated: "2026-06-04" },
  { id: "ds-187", name: "code-execution-feedback-v12", domain: "Code", size: "14.7 TB", tokens: "1.1T", provenance: "synthetic", contamination: "screened", updated: "2026-05-30" },
  { id: "ds-214", name: "agentic-trajectories-envset-9", domain: "Agents", size: "3.4 TB", tokens: "98B", provenance: "synthetic", contamination: "screened", updated: "2026-06-09" },
  { id: "ds-156", name: "longform-archives-licensed-v4", domain: "Long context", size: "22.1 TB", tokens: "1.8T", provenance: "licensed", contamination: "screened", updated: "2026-04-17" },
  { id: "ds-219", name: "verified-math-traces-v3", domain: "Reasoning", size: "1.9 TB", tokens: "44B", provenance: "synthetic", contamination: "pending", updated: "2026-06-11" },
  { id: "ds-203", name: "partner-engineering-repos-v2", domain: "Code", size: "5.6 TB", tokens: "310B", provenance: "partner", contamination: "flagged", updated: "2026-06-02" },
];

export interface Experiment {
  id: string;
  hypothesis: string;
  owner: string;
  baseline: string;
  variant: string;
  metric: string;
  baselineScore: number;
  variantScore: number;
  significance: string;
  status: "concluded" | "running" | "analyzing";
}

export const experiments: Experiment[] = [
  {
    id: "exp-0892",
    hypothesis: "Blinded verifier improves patch precision over shared-trace verifier",
    owner: "agents",
    baseline: "shared-trace-verify",
    variant: "blinded-verify",
    metric: "SWE-bench Verified",
    baselineScore: 61.0,
    variantScore: 72.3,
    significance: "p < 0.001",
    status: "concluded",
  },
  {
    id: "exp-0907",
    hypothesis: "Asymmetric confidence loss reduces confident error without accuracy cost",
    owner: "safety",
    baseline: "standard-rlhf",
    variant: "asym-conf-loss",
    metric: "Confident-error rate",
    baselineScore: 8.4,
    variantScore: 2.4,
    significance: "p < 0.001",
    status: "concluded",
  },
  {
    id: "exp-0911",
    hypothesis: "Curriculum by reasoning density beats uniform sampling at equal compute",
    owner: "pretraining",
    baseline: "uniform-mix-v3",
    variant: "density-curriculum-v3",
    metric: "Composite @ 0.4T",
    baselineScore: 41.8,
    variantScore: 44.1,
    significance: "p = 0.012",
    status: "concluded",
  },
  {
    id: "exp-0934",
    hypothesis: "Mutation-tested reward functions reduce exploit discovery in agentic RL",
    owner: "agents",
    baseline: "envset-8",
    variant: "envset-9-mutated",
    metric: "Exploits / 1k episodes",
    baselineScore: 3.1,
    variantScore: 0.4,
    significance: "p < 0.001",
    status: "analyzing",
  },
  {
    id: "exp-0941",
    hypothesis: "Native 1M context outperforms extrapolated 1M on aggregation tasks",
    owner: "pretraining",
    baseline: "ren3-extrap-1m",
    variant: "ren3-native-1m",
    metric: "RULER aggregation",
    baselineScore: 71.2,
    variantScore: 89.6,
    significance: "p < 0.001",
    status: "concluded",
  },
  {
    id: "exp-0948",
    hypothesis: "Deliberation-budget distillation preserves 95% of quality at 40% cost",
    owner: "inference",
    baseline: "ren-3-large",
    variant: "ren-3-fast-distill-c",
    metric: "Composite",
    baselineScore: 78.5,
    variantScore: 74.7,
    significance: "running",
    status: "running",
  },
];

export interface EvalReport {
  id: string;
  model: string;
  suite: string;
  score: number;
  delta: number;
  interval: string;
  harness: string;
  date: string;
  verdict: "pass" | "regression" | "review";
}

export const evalReports: EvalReport[] = [
  { id: "ev-7741", model: "ren-3.2-large-rc2", suite: "Composite (full)", score: 81.9, delta: 3.4, interval: "± 0.8", harness: "ledger@9.4.1", date: "2026-06-10", verdict: "pass" },
  { id: "ev-7738", model: "ren-3.2-large-rc2", suite: "SWE-bench Verified", score: 75.1, delta: 2.8, interval: "± 1.2", harness: "ledger@9.4.1", date: "2026-06-09", verdict: "pass" },
  { id: "ev-7735", model: "ren-3.2-large-rc2", suite: "Safety: deception probes", score: 99.2, delta: 0.1, interval: "± 0.3", harness: "ledger@9.4.1", date: "2026-06-09", verdict: "pass" },
  { id: "ev-7729", model: "ren-3.2-large-rc1", suite: "Instruction adherence @ 8h", score: 91.4, delta: -1.9, interval: "± 1.1", harness: "ledger@9.4.0", date: "2026-06-05", verdict: "regression" },
  { id: "ev-7722", model: "ren-4-base @ 1.61T", suite: "Composite (pretrain subset)", score: 64.4, delta: 1.7, interval: "± 0.9", harness: "ledger@9.4.0", date: "2026-06-03", verdict: "pass" },
  { id: "ev-7718", model: "ren-3-fast", suite: "Calibration (ECE⁻¹)", score: 92.8, delta: -0.4, interval: "± 0.5", harness: "ledger@9.3.7", date: "2026-06-01", verdict: "review" },
];

export interface ApiSeriesPoint {
  label: string;
  requests: number;
  latencyP50: number;
  latencyP99: number;
  errorRate: number;
}

export const apiAnalytics: ApiSeriesPoint[] = [
  { label: "May 30", requests: 412, latencyP50: 640, latencyP99: 2810, errorRate: 0.07 },
  { label: "May 31", requests: 398, latencyP50: 655, latencyP99: 2790, errorRate: 0.06 },
  { label: "Jun 01", requests: 471, latencyP50: 631, latencyP99: 2750, errorRate: 0.05 },
  { label: "Jun 02", requests: 506, latencyP50: 628, latencyP99: 2920, errorRate: 0.09 },
  { label: "Jun 03", requests: 534, latencyP50: 644, latencyP99: 2880, errorRate: 0.06 },
  { label: "Jun 04", requests: 559, latencyP50: 612, latencyP99: 2660, errorRate: 0.04 },
  { label: "Jun 05", requests: 547, latencyP50: 619, latencyP99: 2700, errorRate: 0.05 },
  { label: "Jun 06", requests: 488, latencyP50: 633, latencyP99: 2740, errorRate: 0.05 },
  { label: "Jun 07", requests: 462, latencyP50: 641, latencyP99: 2810, errorRate: 0.06 },
  { label: "Jun 08", requests: 581, latencyP50: 607, latencyP99: 2590, errorRate: 0.04 },
  { label: "Jun 09", requests: 624, latencyP50: 598, latencyP99: 2540, errorRate: 0.03 },
  { label: "Jun 10", requests: 651, latencyP50: 601, latencyP99: 2570, errorRate: 0.04 },
  { label: "Jun 11", requests: 668, latencyP50: 594, latencyP99: 2510, errorRate: 0.03 },
  { label: "Jun 12", requests: 449, latencyP50: 602, latencyP99: 2530, errorRate: 0.03 },
];

export interface Deployment {
  id: string;
  model: string;
  region: string;
  traffic: number;
  uptime: number;
  latencyP50: number;
  status: "healthy" | "degraded" | "draining";
  version: string;
}

export const deployments: Deployment[] = [
  { id: "dep-us-e1", model: "ren-3-large", region: "us-east-1", traffic: 31, uptime: 99.99, latencyP50: 588, status: "healthy", version: "3.1.4" },
  { id: "dep-us-w2", model: "ren-3-large", region: "us-west-2", traffic: 24, uptime: 99.97, latencyP50: 601, status: "healthy", version: "3.1.4" },
  { id: "dep-eu-c1", model: "ren-3-large", region: "eu-central-1", traffic: 18, uptime: 99.98, latencyP50: 612, status: "healthy", version: "3.1.4" },
  { id: "dep-ap-n1", model: "ren-3-fast", region: "ap-northeast-1", traffic: 14, uptime: 99.95, latencyP50: 433, status: "healthy", version: "3.1.4" },
  { id: "dep-eu-w1", model: "ren-3-fast", region: "eu-west-1", traffic: 9, uptime: 99.81, latencyP50: 471, status: "degraded", version: "3.1.3" },
  { id: "dep-st-w2", model: "ren-3.2-large-rc2", region: "us-west-2 (staging)", traffic: 4, uptime: 99.92, latencyP50: 644, status: "draining", version: "3.2.0-rc2" },
];

export interface GpuCluster {
  id: string;
  name: string;
  gpus: number;
  utilization: number;
  allocations: { team: string; share: number }[];
  power: string;
  health: "nominal" | "attention";
  utilizationSeries: number[];
}

export const gpuClusters: GpuCluster[] = [
  {
    id: "kiln-west",
    name: "Kiln West",
    gpus: 8192,
    utilization: 94,
    power: "11.2 MW",
    health: "nominal",
    allocations: [
      { team: "Pretraining", share: 62 },
      { team: "Architecture research", share: 21 },
      { team: "Data", share: 11 },
      { team: "Headroom", share: 6 },
    ],
    utilizationSeries: [88, 91, 93, 90, 94, 96, 95, 93, 94, 94, 92, 94],
  },
  {
    id: "kiln-east",
    name: "Kiln East",
    gpus: 4096,
    utilization: 81,
    power: "5.4 MW",
    health: "nominal",
    allocations: [
      { team: "Post-training / RL", share: 48 },
      { team: "Safety", share: 22 },
      { team: "Evaluations", share: 18 },
      { team: "Headroom", share: 12 },
    ],
    utilizationSeries: [72, 75, 79, 84, 81, 78, 80, 83, 85, 82, 80, 81],
  },
  {
    id: "kiln-serve",
    name: "Kiln Serve",
    gpus: 2048,
    utilization: 67,
    power: "2.1 MW",
    health: "attention",
    allocations: [
      { team: "Production inference", share: 71 },
      { team: "Staging", share: 12 },
      { team: "Playground", share: 9 },
      { team: "Headroom", share: 8 },
    ],
    utilizationSeries: [58, 61, 60, 64, 69, 73, 71, 66, 63, 65, 68, 67],
  },
];

export const platformStats = {
  activeRuns: trainingRuns.filter((r) => r.status === "running").length,
  queuedRuns: trainingRuns.filter((r) => r.status === "queued").length,
  totalGpus: gpuClusters.reduce((a, c) => a + c.gpus, 0),
  meanUtilization: Math.round(
    gpuClusters.reduce((a, c) => a + c.utilization * c.gpus, 0) /
      gpuClusters.reduce((a, c) => a + c.gpus, 0),
  ),
  productionModels: modelRegistry.filter((m) => m.stage === "production").length,
  evalsThisWeek: 312,
};
