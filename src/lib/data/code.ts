/**
 * Ren Code — the flagship product. Two workflows: start something new, or
 * continue work on an existing repository.
 */

export const newProjectExamples = [
  {
    prompt: "Build a SaaS",
    detail: "Auth, billing, dashboard, and a multi-tenant data model — scaffolded and wired.",
  },
  {
    prompt: "Build a CRM",
    detail: "Contacts, pipeline stages, activity timelines, and reporting from one description.",
  },
  {
    prompt: "Build an inventory platform",
    detail: "Stock tracking, suppliers, purchase orders, and low-stock alerts.",
  },
  {
    prompt: "Build a dashboard",
    detail: "Data sources, charts, filters, and a clean analytics layout, ready to extend.",
  },
];

/** What Ren Code does once a repository is connected — the differentiator. */
export const repositoryCapabilities = [
  {
    title: "Understand architecture",
    detail:
      "Maps how a system fits together — services, boundaries, and the decisions behind them — before changing anything.",
  },
  {
    title: "Analyze dependencies",
    detail:
      "Traces internal and external dependencies to understand blast radius and what a change will touch.",
  },
  {
    title: "Understand code structure",
    detail:
      "Learns the conventions, patterns, and idioms of your codebase so new code reads like it belongs.",
  },
  {
    title: "Generate features",
    detail:
      "Implements new functionality across the files it actually affects, consistent with the existing design.",
  },
  {
    title: "Refactor code",
    detail:
      "Restructures safely — extracting, renaming, and untangling — while preserving behavior.",
  },
  {
    title: "Create pull requests",
    detail:
      "Opens reviewable PRs with a clear description of what changed and why, ready for your team.",
  },
  {
    title: "Generate documentation",
    detail:
      "Writes and maintains documentation grounded in the real code, not a hopeful approximation.",
  },
  {
    title: "Write tests",
    detail:
      "Adds tests that capture intended behavior and guard against the regressions a change could introduce.",
  },
  {
    title: "Explain codebases",
    detail:
      "Answers how and why — onboarding a new engineer, or yourself, into unfamiliar code.",
  },
];

/** The GitHub integration flow, presented as sequential, premium steps. */
export const githubFlow = [
  {
    step: "01",
    title: "Connect with GitHub",
    detail: "Authorize Ren Code through GitHub OAuth. Scopes are explicit and revocable at any time.",
  },
  {
    step: "02",
    title: "Select repositories",
    detail: "Choose exactly which repositories Ren Code can see. Grant access per repo, never blanket.",
  },
  {
    step: "03",
    title: "Index & analyze",
    detail: "Ren Code builds an understanding of structure, dependencies, and conventions.",
  },
  {
    step: "04",
    title: "Navigate & understand",
    detail: "Browse files with the model's context alongside — ask how anything works.",
  },
  {
    step: "05",
    title: "Generate pull requests",
    detail: "Describe the change; review a real PR. You stay in control of what merges.",
  },
];
