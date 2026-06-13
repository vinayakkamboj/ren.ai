/**
 * The current Ren AI research model. Ren AI is in active development; this is
 * the single model under fine-tuning, not a lineage of shipped releases.
 */

export const astra = {
  codename: "Astra",
  status: "Active Fine-Tuning",
  base: "Open-weight foundation (Qwen3.5 family)",
  approach: "QLoRA fine-tuning on curated software-engineering data",
  summary:
    "Astra is the model we are building Ren Code on. It is being fine-tuned for software engineering — reading repositories, reasoning over architecture, and producing changes that hold up under review.",
  focusAreas: [
    {
      title: "Coding",
      detail:
        "Synthesis and repair across languages, evaluated on held-out problems the model never trains on.",
    },
    {
      title: "Software Engineering",
      detail:
        "Resolving real tasks end-to-end inside a working repository, not isolated function puzzles.",
    },
    {
      title: "Repository Understanding",
      detail:
        "Architecture, dependencies, and conventions of a codebase — the context that makes a change correct.",
    },
    {
      title: "Agentic Development",
      detail:
        "Planning multi-step changes, running tests, and verifying its own work before returning it.",
    },
    {
      title: "Long Context Reasoning",
      detail:
        "Holding whole codebases in context so changes are reasoned about globally, not file by file.",
    },
  ],
  /** Honest, qualitative phases — not invented benchmark numbers. */
  phases: [
    {
      label: "Data curation",
      state: "in-progress" as const,
      detail:
        "Assembling and screening the fine-tuning corpus — code, reviewed diffs, and verified engineering traces.",
    },
    {
      label: "Identity & instruction tuning",
      state: "in-progress" as const,
      detail:
        "Teaching the model who it is and how it should reason, communicate, and admit uncertainty.",
    },
    {
      label: "Capability fine-tuning",
      state: "next" as const,
      detail:
        "Targeted training on repository understanding and end-to-end task resolution.",
    },
    {
      label: "Evaluation harness",
      state: "next" as const,
      detail:
        "A fixed, contamination-screened suite run before and after every training run. No claim without a measurement.",
    },
    {
      label: "Private preview",
      state: "planned" as const,
      detail:
        "Serving Astra inside Ren Code for a small group, against real repositories.",
    },
  ],
};

export type AstraPhaseState = (typeof astra.phases)[number]["state"];
