/**
 * NuCode knowledge sources — structured list of authoritative Nutrient docs URLs.
 *
 * These are reference targets that NuCode should cite when uncertain about exact
 * API syntax. They are NOT fetched at runtime today. When MCP integration lands,
 * these become the fetch targets for the Nutrient Docs MCP server.
 *
 * Priority:
 *   "primary"   — Web SDK llms.txt agent indexes + core getting-started guides.
 *                 These are the first place to check for any Web SDK question.
 *   "secondary" — Specific feature guides, examples, release notes.
 */

export interface NucodeKnowledgeSource {
  url: string;
  title: string;
  category: NucodeKnowledgeCategory;
  priority: "primary" | "secondary";
}

export type NucodeKnowledgeCategory =
  | "agent-index"
  | "getting-started"
  | "viewer"
  | "annotations"
  | "forms"
  | "signatures"
  | "editor"
  | "redaction"
  | "ocr"
  | "ai-assistant"
  | "ui-customization"
  | "best-practices"
  | "deployment-comparison"
  | "changelog";

export const NUCODE_KNOWLEDGE_SOURCES: NucodeKnowledgeSource[] = [
  // ── Agent indexes (highest priority — designed for LLM consumption) ──────────
  { url: "https://www.nutrient.io/guides/web/llms.txt",       title: "Web SDK llms.txt — full guide index",   category: "agent-index",    priority: "primary" },
  { url: "https://www.nutrient.io/api/web/llms.txt",          title: "Web SDK API llms.txt — API reference index", category: "agent-index", priority: "primary" },
  { url: "https://www.nutrient.io/llms.txt",                  title: "Nutrient root llms.txt — all products", category: "agent-index",    priority: "primary" },

  // ── Getting started ──────────────────────────────────────────────────────────
  { url: "https://www.nutrient.io/sdk/web/",                  title: "Web SDK home",                          category: "getting-started", priority: "primary" },
  { url: "https://www.nutrient.io/sdk/web/getting-started/",  title: "Getting started overview",              category: "getting-started", priority: "primary" },
  { url: "https://www.nutrient.io/guides/web/",               title: "Web SDK guides root",                   category: "getting-started", priority: "primary" },
  { url: "https://www.nutrient.io/api/web/",                  title: "Web SDK API reference",                 category: "getting-started", priority: "primary" },
  { url: "https://www.nutrient.io/sdk/web/getting-started/react-vite/",    title: "React + Vite setup",        category: "getting-started", priority: "primary" },
  { url: "https://www.nutrient.io/sdk/web/getting-started/nextjs/",        title: "Next.js setup",             category: "getting-started", priority: "primary" },
  { url: "https://www.nutrient.io/sdk/web/getting-started/typescript/",    title: "TypeScript setup",          category: "getting-started", priority: "primary" },
  { url: "https://www.nutrient.io/sdk/web/getting-started/other-frameworks/javascript/", title: "Vanilla JS setup", category: "getting-started", priority: "secondary" },
  { url: "https://www.nutrient.io/guides/web/downloads/",     title: "SDK downloads and assets",              category: "getting-started", priority: "secondary" },

  // ── Viewer / document loading ────────────────────────────────────────────────
  { url: "https://www.nutrient.io/guides/web/viewer/",                     title: "Viewer overview",           category: "viewer", priority: "primary" },
  { url: "https://www.nutrient.io/guides/web/viewer/pdf/",                 title: "PDF viewer",                category: "viewer", priority: "primary" },
  { url: "https://www.nutrient.io/guides/web/documents/",                  title: "Document handling",         category: "viewer", priority: "secondary" },
  { url: "https://www.nutrient.io/guides/web/open-a-document/from-document-engine/", title: "Open from Document Engine", category: "viewer", priority: "secondary" },
  { url: "https://www.nutrient.io/guides/web/save-a-document/to-document-engine/",   title: "Save to Document Engine",   category: "viewer", priority: "secondary" },

  // ── UI customization ─────────────────────────────────────────────────────────
  { url: "https://www.nutrient.io/guides/web/user-interface/ui-customization/introduction/", title: "UI customization intro",    category: "ui-customization", priority: "primary" },
  { url: "https://www.nutrient.io/guides/web/user-interface/ui-customization/examples/",     title: "UI customization examples", category: "ui-customization", priority: "secondary" },
  { url: "https://www.nutrient.io/guides/web/user-interface/ui-customization/comment-thread-example/", title: "Comment thread UI example", category: "ui-customization", priority: "secondary" },
  { url: "https://www.nutrient.io/guides/web/features/document-editor-ui/", title: "Document editor UI",       category: "ui-customization", priority: "secondary" },

  // ── Annotations ──────────────────────────────────────────────────────────────
  { url: "https://www.nutrient.io/guides/web/annotations/",                title: "Annotations overview",      category: "annotations", priority: "primary" },
  { url: "https://www.nutrient.io/guides/web/annotations/introduction-to-annotations/working-with-annotations/", title: "Working with annotations", category: "annotations", priority: "primary" },
  { url: "https://www.nutrient.io/guides/web/annotations/create-edit-and-remove/create/", title: "Create annotations",        category: "annotations", priority: "secondary" },
  { url: "https://www.nutrient.io/guides/web/annotations/save/overview/",  title: "Save annotations overview", category: "annotations", priority: "secondary" },
  { url: "https://www.nutrient.io/guides/web/annotations/import-and-export/database/",    title: "Annotations — DB export",  category: "annotations", priority: "secondary" },
  { url: "https://www.nutrient.io/guides/web/annotations/import-and-export/server-backed/", title: "Annotations — server-backed", category: "annotations", priority: "secondary" },
  { url: "https://www.nutrient.io/guides/web/annotations/synchronization/", title: "Annotations sync",         category: "annotations", priority: "secondary" },
  { url: "https://www.nutrient.io/guides/web/annotations/custom-rendered-annotations/", title: "Custom rendered annotations", category: "annotations", priority: "secondary" },

  // ── Forms ────────────────────────────────────────────────────────────────────
  { url: "https://www.nutrient.io/guides/web/forms/",                       title: "Forms overview",            category: "forms", priority: "primary" },
  { url: "https://www.nutrient.io/guides/web/forms/form-creation/",         title: "Form creation",             category: "forms", priority: "primary" },
  { url: "https://www.nutrient.io/guides/web/forms/form-filling/",          title: "Form filling",              category: "forms", priority: "secondary" },
  { url: "https://www.nutrient.io/guides/web/forms/create-edit-and-remove/built-in-ui/", title: "Forms built-in UI",       category: "forms", priority: "secondary" },
  { url: "https://www.nutrient.io/guides/web/forms/browser-form-template-builder/", title: "Browser form template builder", category: "forms", priority: "secondary" },
  { url: "https://www.nutrient.io/guides/web/forms/submit-or-save/to-server-backed/", title: "Forms — save to server",  category: "forms", priority: "secondary" },

  // ── Signatures ───────────────────────────────────────────────────────────────
  { url: "https://www.nutrient.io/guides/web/signatures/",                  title: "Signatures overview",       category: "signatures", priority: "primary" },
  { url: "https://www.nutrient.io/guides/web/signatures/overview/",         title: "Signatures guide overview", category: "signatures", priority: "primary" },
  { url: "https://www.nutrient.io/guides/web/signatures/adding-an-electronic-signature/", title: "Add e-signature", category: "signatures", priority: "primary" },
  { url: "https://www.nutrient.io/guides/web/signatures/digital-signatures/signature-lifecycle/sign-a-pdf-document-document-engine/", title: "Sign PDF — Document Engine", category: "signatures", priority: "secondary" },
  { url: "https://www.nutrient.io/guides/web/signatures/digital-signatures/signature-lifecycle/sign-a-pdf-document-dws/", title: "Sign PDF — DWS", category: "signatures", priority: "secondary" },

  // ── Editor / document editing ────────────────────────────────────────────────
  { url: "https://www.nutrient.io/guides/web/editor/",                      title: "Editor overview",           category: "editor", priority: "primary" },
  { url: "https://www.nutrient.io/guides/web/editor/edit-text/",            title: "Edit text",                 category: "editor", priority: "primary" },
  { url: "https://www.nutrient.io/guides/web/editor/content-editor-api/",   title: "Content editor API",        category: "editor", priority: "secondary" },
  { url: "https://www.nutrient.io/guides/web/editor/backend-processing/",   title: "Editor backend processing", category: "editor", priority: "secondary" },

  // ── Redaction ────────────────────────────────────────────────────────────────
  { url: "https://www.nutrient.io/guides/web/redaction/",                   title: "Redaction overview",        category: "redaction", priority: "primary" },
  { url: "https://www.nutrient.io/guides/web/redaction/production-safe-workflow/", title: "Redaction production workflow", category: "redaction", priority: "primary" },
  { url: "https://www.nutrient.io/guides/web/user-interface/redaction/",    title: "Redaction UI",              category: "redaction", priority: "secondary" },
  { url: "https://www.nutrient.io/guides/web/headless/redactions-from-selection/", title: "Headless redaction from selection", category: "redaction", priority: "secondary" },

  // ── OCR / conversion ─────────────────────────────────────────────────────────
  { url: "https://www.nutrient.io/guides/web/ocr/",                         title: "OCR overview",              category: "ocr", priority: "primary" },
  { url: "https://www.nutrient.io/guides/web/conversion/scan-to-searchable-pdf/", title: "Scan to searchable PDF", category: "ocr", priority: "secondary" },

  // ── AI Assistant ─────────────────────────────────────────────────────────────
  { url: "https://www.nutrient.io/guides/web/ai-assistant/integrate-with-ai-assistant/", title: "Integrate AI Assistant", category: "ai-assistant", priority: "primary" },
  { url: "https://www.nutrient.io/guides/web/ai-assistant/ai-agent-tools/", title: "AI agent tools",            category: "ai-assistant", priority: "primary" },
  { url: "https://www.nutrient.io/guides/web/ai-assistant/ai-agent-tools/langchain/", title: "AI agent tools — LangChain", category: "ai-assistant", priority: "secondary" },

  // ── Best practices / debugging / examples ────────────────────────────────────
  { url: "https://www.nutrient.io/guides/web/best-practice/",               title: "Best practices",            category: "best-practices", priority: "primary" },
  { url: "https://www.nutrient.io/guides/web/kb/",                          title: "Knowledge base",            category: "best-practices", priority: "secondary" },
  { url: "https://www.nutrient.io/guides/web/knowledge-base/overview/",     title: "KB overview",               category: "best-practices", priority: "secondary" },
  { url: "https://www.nutrient.io/guides/web/demo/",                        title: "Demo gallery",              category: "best-practices", priority: "secondary" },
  { url: "https://www.nutrient.io/guides/web/samples/",                     title: "Code samples",              category: "best-practices", priority: "secondary" },

  // ── Changelog / release notes ────────────────────────────────────────────────
  { url: "https://www.nutrient.io/guides/web/changelog/",                   title: "Web SDK changelog",         category: "changelog", priority: "secondary" },
  { url: "https://www.nutrient.io/guides/web/release-notes/upgrading/",     title: "Upgrade guide",             category: "changelog", priority: "secondary" },

  // ── Deployment comparison ────────────────────────────────────────────────────
  { url: "https://www.nutrient.io/guides/web/about/capability-and-component-comparison-web-sdk/",                  title: "Capability comparison — Web SDK",              category: "deployment-comparison", priority: "secondary" },
  { url: "https://www.nutrient.io/guides/web/about/capability-and-component-comparison-web-sdk-document-engine/",  title: "Capability comparison — Web SDK + Doc Engine",  category: "deployment-comparison", priority: "secondary" },
  { url: "https://www.nutrient.io/guides/web/about/capability-and-component-comparison-document-engine/",          title: "Capability comparison — Document Engine",      category: "deployment-comparison", priority: "secondary" },
];

// ── Future MCP registry ───────────────────────────────────────────────────────
// These are PLANNED connection points. Nothing is live-fetched today.
// When MCP integration lands, NuCode will load enabled tools from this registry
// and use them to fetch live docs, run code examples, and validate API calls.

export type MCPToolStatus = "planned";

export interface NucodeMCPTool {
  id: string;
  name: string;
  description: string;
  targetSources: string[];
  status: MCPToolStatus;
}

export const NUCODE_MCP_REGISTRY: NucodeMCPTool[] = [
  {
    id: "nutrient-docs-search",
    name: "Nutrient Docs Search",
    description: "Semantic search over docs.nutrient.io — replaces static embedded context with live, version-accurate answers",
    targetSources: ["https://www.nutrient.io/guides/web/llms.txt", "https://www.nutrient.io/api/web/llms.txt"],
    status: "planned",
  },
  {
    id: "nutrient-code-examples",
    name: "Nutrient Code Examples",
    description: "Fetch runnable Web SDK code examples by feature (annotations, redaction, forms, etc.)",
    targetSources: ["https://www.nutrient.io/guides/web/samples/", "https://www.nutrient.io/guides/web/demo/"],
    status: "planned",
  },
  {
    id: "nutrient-changelog",
    name: "Nutrient Changelog",
    description: "Query SDK changelogs and release notes — gives version-accurate answers and upgrade paths",
    targetSources: ["https://www.nutrient.io/guides/web/changelog/"],
    status: "planned",
  },
  {
    id: "dws-api-tools",
    name: "DWS Processor API Tools",
    description: "Make live DWS API calls for document processing operations — OCR, conversion, redaction, watermarking",
    targetSources: [],
    status: "planned",
  },
  {
    id: "document-engine-api",
    name: "Document Engine REST API",
    description: "Query a connected Document Engine instance for live document operations",
    targetSources: [],
    status: "planned",
  },
  {
    id: "internal-docs",
    name: "Nutrient Internal Docs",
    description: "Access internal confluence/notion pages, engineering RFCs, integration guides",
    targetSources: [],
    status: "planned",
  },
];

/** Return only primary-priority sources, e.g. to inject into a prompt preamble. */
export function getPrimaryKnowledgeSources(): NucodeKnowledgeSource[] {
  return NUCODE_KNOWLEDGE_SOURCES.filter((s) => s.priority === "primary");
}

/** Return all sources for a given category. */
export function getSourcesByCategory(category: NucodeKnowledgeCategory): NucodeKnowledgeSource[] {
  return NUCODE_KNOWLEDGE_SOURCES.filter((s) => s.category === category);
}
