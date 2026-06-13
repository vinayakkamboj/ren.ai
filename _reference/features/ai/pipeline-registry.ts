import type { PipelineType } from "./pipeline-router";

export interface MCPHook {
  id: string;
  name: string;
  description: string;
  status: "planned" | "available" | "connected";
  // When connected, this will hold the MCP tool name
  toolName?: string;
}

export interface PipelinePhase {
  id: string;
  name: string;
  model: "fable-5" | "haiku-4-5";
  modelLabel: string;
  description: string;
  maxTokens: number;
  apiMode: string;
  inputTags?: string[];
  outputTags?: string[];
  nutrientDocsEnabled: boolean;
  mcpHooks: MCPHook[];
  // Slot for injecting extra context into this phase's prompt
  contextInjectionKey: string;
}

export interface PipelineDefinition {
  id: PipelineType;
  name: string;
  label: string;
  tagline: string;
  description: string;
  color: string;
  phases: PipelinePhase[];
  nutrientDocsEnabled: boolean;
  mcpHooks: MCPHook[];
}

export const PIPELINE_REGISTRY: PipelineDefinition[] = [
  {
    id: "light",
    name: "Light",
    label: "Light",
    tagline: "Fast 3-phase build",
    description:
      "The default pipeline. Runs plan → design → build in three sequential phases. Each phase uses a smaller fast model for planning/design and a larger model for the final code generation. Best for all new builds, edits, and fixes.",
    color: "#22c55e",
    nutrientDocsEnabled: true,
    mcpHooks: [
      {
        id: "light.mcp.nutrient-docs",
        name: "Nutrient Docs MCP",
        description: "Live documentation retrieval from docs.nutrient.io — replaces static embedded context with real-time doc fetch",
        status: "planned",
        toolName: "nutrient-docs-fetch",
      },
      {
        id: "light.mcp.codebase-search",
        name: "Codebase Search MCP",
        description: "Allow the plan phase to search existing project files before generating the roadmap",
        status: "planned",
      },
    ],
    phases: [
      {
        id: "light.plan",
        name: "Plan",
        model: "haiku-4-5",
        modelLabel: "Nucode Spark",
        description: "Generates a compact JSON build plan: brand, accent color, pages, Nutrient features, and component list.",
        maxTokens: 3000,
        apiMode: "plan",
        outputTags: ["<light_plan>"],
        nutrientDocsEnabled: false,
        contextInjectionKey: "light.plan.extra",
        mcpHooks: [
          {
            id: "light.plan.mcp.docs",
            name: "Nutrient Docs",
            description: "Fetch Nutrient feature reference before planning",
            status: "planned",
          },
        ],
      },
      {
        id: "light.design",
        name: "Design",
        model: "haiku-4-5",
        modelLabel: "Nucode Spark",
        description: "Generates a design spec: palette tokens (CSS vars, HSL), typography, component style, and layout signature.",
        maxTokens: 1200,
        apiMode: "design",
        inputTags: ["<light_plan>"],
        outputTags: ["<design_spec>"],
        nutrientDocsEnabled: false,
        contextInjectionKey: "light.design.extra",
        mcpHooks: [],
      },
      {
        id: "light.build",
        name: "Build",
        model: "fable-5",
        modelLabel: "Nucode model (user-selectable, default Flow)",
        description: "Generates all file patches from plan + design spec. Output is a <file_patches> block applied atomically to the sandbox.",
        maxTokens: 24000,
        apiMode: "default",
        inputTags: ["<light_plan>", "<design_spec>"],
        outputTags: ["<file_patches>"],
        nutrientDocsEnabled: true,
        contextInjectionKey: "light.build.extra",
        mcpHooks: [
          {
            id: "light.build.mcp.nutrient-docs",
            name: "Nutrient Docs",
            description: "Inject live SDK reference into the build system prompt",
            status: "planned",
          },
        ],
      },
    ],
  },

  {
    id: "full-build",
    name: "Full",
    label: "Full",
    tagline: "Parent version of Light",
    description:
      "Full is the parent/advanced version of the reliable Light pipeline. It preserves Light's plan → design → build core and adds extra validation/repair capacity for larger or more complex builds without changing Light's behavior.",
    color: "#f59e0b",
    nutrientDocsEnabled: true,
    mcpHooks: [
      {
        id: "full.mcp.nutrient-docs",
        name: "Nutrient Docs MCP",
        description: "Real-time doc retrieval injected into Full's build and repair passes",
        status: "planned",
      },
      {
        id: "full.mcp.validator",
        name: "Build Validator MCP",
        description: "Post-build TypeScript type check + sandbox smoke test before applying patches",
        status: "planned",
      },
    ],
    phases: [
      {
        id: "full.plan",
        name: "Plan",
        model: "haiku-4-5",
        modelLabel: "Nucode Spark",
        description: "Same as Light plan — compact JSON roadmap with pages and Nutrient features.",
        maxTokens: 3000,
        apiMode: "plan",
        outputTags: ["<light_plan>"],
        nutrientDocsEnabled: false,
        contextInjectionKey: "full.plan.extra",
        mcpHooks: [],
      },
      {
        id: "full.design",
        name: "Design",
        model: "haiku-4-5",
        modelLabel: "Nucode Spark",
        description: "Same as Light design — palette + typography tokens.",
        maxTokens: 1200,
        apiMode: "design",
        inputTags: ["<light_plan>"],
        outputTags: ["<design_spec>"],
        nutrientDocsEnabled: false,
        contextInjectionKey: "full.design.extra",
        mcpHooks: [],
      },
      {
        id: "full.build.pass1",
        name: "Build — Pass 1",
        model: "fable-5",
        modelLabel: "Nucode model (user-selectable, default Flow)",
        description: "Full's primary build pass — inherits Light's compact plan/design inputs and generates file patches.",
        maxTokens: 24000,
        apiMode: "default",
        inputTags: ["<light_plan>", "<design_spec>"],
        outputTags: ["<file_patches>"],
        nutrientDocsEnabled: true,
        contextInjectionKey: "full.build.pass1.extra",
        mcpHooks: [],
      },
      {
        id: "full.build.pass2",
        name: "Build — Pass 2 (conditional)",
        model: "fable-5",
        modelLabel: "Nucode model (user-selectable, default Flow)",
        description: "Fires ONLY if the inherited Light build path still produced missing, truncated, or mismatched files.",
        maxTokens: 24000,
        apiMode: "default",
        inputTags: ["pass1 candidate", "hint: missing/truncated files"],
        outputTags: ["<file_patches>"],
        nutrientDocsEnabled: true,
        contextInjectionKey: "full.build.pass2.extra",
        mcpHooks: [
          {
            id: "full.pass2.mcp.validator",
            name: "Build Validator",
            description: "Run TypeScript type check between pass 1 and pass 2 to produce better hints",
            status: "planned",
          },
        ],
      },
    ],
  },

  {
    id: "deep",
    name: "Deep",
    label: "Deep",
    tagline: "Light-style coding with heavy Nutrient docs",
    description:
      "Deep is the docs-heavy version of Light: same focused, compact editing discipline, but with complete Nutrient product context. It can answer deep technical questions and generate precise code for Web SDK toolbar customization, custom buttons, annotations, forms, redaction, comparison, Document Engine, DWS Processor API, AI Assistant, and mobile SDKs.",
    color: "#818cf8",
    nutrientDocsEnabled: true,
    mcpHooks: [
      {
        id: "deep.mcp.nutrient-docs",
        name: "Live Nutrient Docs",
        description: "Live documentation retrieval — fetches nutrient.io llms.txt indexes at query time, prepended to static context so Deep always has current SDK reference",
        status: "available",
        toolName: "fetchNutrientLiveDocs",
      },
      {
        id: "deep.mcp.nutrient-api",
        name: "Nutrient API MCP",
        description: "Direct integration with DWS Processor API and Document Engine REST API for live API call testing within the demo",
        status: "planned",
      },
      {
        id: "deep.mcp.changelog",
        name: "Nutrient Changelog MCP",
        description: "Real-time access to SDK changelogs and release notes to give version-accurate answers",
        status: "planned",
      },
    ],
    phases: [
      {
        id: "deep.build",
        name: "Deep Build",
        model: "fable-5",
        modelLabel: "Nucode model (user-selectable, default Flow)",
        description: "Single-phase Light-style focused edit with full Nutrient docs as system context. Outputs a direct answer, <file_patches>, or both. If file patches are present they are applied atomically; otherwise the text answer is shown in chat.",
        maxTokens: 16000,
        apiMode: "deep",
        outputTags: ["<file_patches> (optional)", "text answer"],
        nutrientDocsEnabled: true,
        contextInjectionKey: "deep.build.extra",
        mcpHooks: [
          {
            id: "deep.build.mcp.docs",
            name: "Live Nutrient Docs",
            description: "Fetches nutrient.io llms.txt at query time and prepends to static context",
            status: "available",
            toolName: "fetchNutrientLiveDocs",
          },
        ],
      },
    ],
  },
];

export function getPipelineById(id: PipelineType): PipelineDefinition | undefined {
  return PIPELINE_REGISTRY.find((p) => p.id === id);
}
