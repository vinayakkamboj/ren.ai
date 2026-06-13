"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, RotateCcw, FileDiff, Eye, Pencil, FilePlus } from "lucide-react";
import { useWorkspaceStore } from "@/features/workspaces/store";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { parseFilePatchPlan, stripFilePatchPlan, buildLightBuildPrompt, buildDesignSpecPrompt } from "@/features/ai/prompts";
import { parseFileEdits, applyEditsToFiles, describeEditFailures, stripFileEdits } from "@/features/ai/edit-protocol";
import {
  validatePatchPlan,
  describeIssues,
  sanitizePatchPlan,
  validateRepositoryQuality,
  formatRepositoryQualityReport,
} from "@/features/ai/validators";
import {
  isRebuildRequest,
  requiresRepositoryBuild,
  requestsDesignChange,
} from "@/features/ai/request-intent";
import { getPlannedFilesNeedingGeneration } from "@/features/ai/build-continuation";
import {
  buildCandidate,
  mergeIntoCandidate,
  detectFatalIssues,
  candidateToProjectFiles,
  candidateToPatchPlan,
  buildTargetedRepairPrompt,
  getMissingFilePaths,
} from "@/features/ai/build-transaction";
import { normalizePipelineType, type PipelineType } from "@/features/ai/pipeline-router";
import { DEFAULT_SKILL_MODE, SKILL_MODE_OPTIONS, buildSkillModePromptPrefix, type SkillModeId } from "@/features/ai/skill-modes";
import { DEFAULT_MODEL_TIER, MODEL_TIERS, type ModelTierId } from "@/features/ai/model-registry";
import { buildLocalDarkThemePatch } from "@/features/ai/theme-customizer";
import { toast } from "sonner";
import type { AIPatchPlan, AIMessage, ProjectFile, Template } from "@/types";


const TEMPLATE_QUICK_PROMPTS: Record<string, string[]> = {
  "web-sdk-viewer": [
    "Create a demo for a construction firm with a fresh non-generic brand - permit coordination homepage, navbar with Nutrient PDF viewer for drawings, and an active site dashboard",
    "Build a hospital patient portal homepage - appointment overview, medical records section, and Nutrient PDF viewer for charts and lab reports in the navbar",
    "Create a banking homepage for a retail bank - account summary, recent transactions, and Nutrient PDF viewer for statements and loan documents",
    "Build a real estate agency homepage - property listings, agent profiles, and Nutrient PDF viewer for contracts and disclosure documents in the navbar",
    "Create a university student portal - course schedule, grades dashboard, and Nutrient PDF viewer for course materials and assignments",
  ],
  "python-sdk": [
    "Build a document conversion service - extend backend/main.py with OCR and extraction endpoints, and add an upload-and-review frontend with the Nutrient viewer",
    "Create an invoice processing pipeline - Python backend endpoints for data extraction, plus a dashboard showing extracted fields next to the source PDF",
    "Build a contract intake tool - convert Word contracts to PDF with the Python SDK and review them in the Nutrient viewer with annotations",
    "Create a scanned-archive digitization portal - OCR endpoints in the Python backend and a searchable document library frontend",
    "Build a report generation service - Python endpoints that assemble PDFs from data, with a preview gallery using the Nutrient viewer",
  ],
  "nodejs-sdk": [
    "Build an Office-to-PDF conversion portal - extend server/index.mjs with batch conversion, and add a drag-and-drop upload frontend with the Nutrient viewer",
    "Create a proposal generation tool - Node backend that converts Word templates to PDF, with a review-and-send frontend",
    "Build a document ingestion service - Node endpoints converting Excel and PowerPoint to PDF, with a processing queue dashboard",
    "Create an email-attachment normalizer - Node backend converting mixed attachments to PDF, with a unified viewer frontend",
    "Build an HR onboarding packet builder - Node backend merging Office docs into PDFs, with a checklist frontend and Nutrient viewer",
  ],
  blank: [
    "Create a SaaS startup homepage for a document intelligence company - hero, features, pricing, and Nutrient PDF viewer demo section",
    "Build a logistics company homepage - shipment tracker, route map, and Nutrient PDF viewer for bills of lading and customs documents",
    "Create a consulting firm portal - project dashboard, deliverables tracker, and Nutrient PDF viewer for reports and proposals",
    "Build a pharmaceutical company portal - clinical trial tracker, regulatory submissions dashboard, and Nutrient PDF viewer for study documents",
    "Create an HR platform homepage - employee onboarding flow, document checklist, and Nutrient PDF viewer for contracts and policy sign-off",
    "Build an e-commerce returns portal - return request intake, inspection workflow, and Nutrient PDF viewer for shipping labels and invoices",
  ],
};

const DEFAULT_QUICK_PROMPTS = [
  "Create a demo for a construction firm with a fresh non-generic brand - permit coordination homepage, navbar with Nutrient PDF viewer for drawings, and an active site dashboard",
  "Build a hospital patient portal - appointment overview, medical records, and Nutrient PDF viewer for charts and lab reports",
  "Create a banking homepage - account summary, transactions dashboard, and Nutrient PDF viewer for statements and loan documents",
  "Build a legal firm homepage - case management dashboard, matter list, and Nutrient redaction viewer for discovery documents",
  "Create a government records portal - citizen request intake, document triage, and Nutrient redaction tools for exemption review",
  "Build a real estate agency homepage - property listings, agent profiles, and Nutrient PDF viewer for contracts",
];

const DEEP_QUICK_PROMPTS = [
  "Customize the viewer toolbar to show only highlighter, ink, note, and signature tools",
  "Add programmatic annotations - highlight the first page automatically when the document loads",
  "Enable redaction mode with redact-text-highlighter and redact-rectangle in the toolbar",
  "Add document comparison - load two PDFs side-by-side using the document-comparison toolbar item",
  "Wire an export button that calls instance.exportPDF() and downloads the result",
  "Add event listeners for annotation creation and show the annotation count in a sidebar",
];

async function readErrorMessage(response: Response): Promise<string> {
  const fallback = `AI request failed (${response.status})`;
  try {
    const text = await response.text();
    if (!text) return fallback;
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed.error === "string") return parsed.error;
      if (typeof parsed.message === "string") return parsed.message;
    } catch { /* use raw text */ }
    return text;
  } catch {
    return fallback;
  }
}

function decodeAIStreamPayload(payload: string): string {
  if (!payload || payload === "[DONE]") return "";
  const sep = payload.indexOf(":");
  const prefix = sep > 0 ? payload.slice(0, sep) : "";
  if (/^[0-9a-z]$/.test(prefix)) {
    const value = payload.slice(sep + 1);
    if (prefix === "0") {
      try { const p = JSON.parse(value); return typeof p === "string" ? p : ""; } catch { return ""; }
    }
    if (prefix === "3") {
      try { const p = JSON.parse(value); throw new Error(typeof p === "string" ? p : "AI stream failed."); }
      catch (err) { if (err instanceof Error) throw err; throw new Error("AI stream failed."); }
    }
    return "";
  }
  try {
    const p = JSON.parse(payload) as Record<string, unknown>;
    if (typeof p === "string") return p;
    if (p.type === "text-delta" && p.textDelta) return p.textDelta as string;
    if (p.text) return p.text as string;
    if (p.delta) return p.delta as string;
    if (p.content) return p.content as string;
  } catch { /* not JSON */ }
  return "";
}

function decodeAIResponse(raw: string): string {
  const chunks = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => (l.startsWith("data:") ? l.slice(5).trim() : l))
    .map(decodeAIStreamPayload)
    .join("");
  return chunks || raw.trim();
}

/** Detect if a JSX/TSX file appears truncated (unbalanced braces). */
function isTruncatedJSX(code: string, path: string): boolean {
  if (!/\.(tsx?|jsx?)$/.test(path)) return false;
  const trimmed = code.trim();
  if (!trimmed || !/[};>"\']$/.test(trimmed)) return true;
  let depth = 0;
  let i = 0;
  while (i < trimmed.length) {
    const ch = trimmed[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      const q = ch; i++;
      while (i < trimmed.length) {
        if (trimmed[i] === "\\" && q !== "`") { i += 2; continue; }
        if (trimmed[i] === q) { i++; break; }
        i++;
      }
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    i++;
  }
  return depth !== 0;
}

// Parse "path":"..." entries from a partial stream buffer to show live write activity
function extractStreamingPaths(buffer: string): string[] {
  const paths: string[] = [];
  const seen = new Set<string>();
  for (const m of buffer.matchAll(/"path"\s*:\s*"([^"]+)"/g)) {
    if (!seen.has(m[1])) { seen.add(m[1]); paths.push(m[1]); }
  }
  return paths;
}

type StatusError = Error & { status?: number };

function isTransientAIError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const status = (error as StatusError).status;
  if (status && [408, 409, 425, 429, 500, 502, 503, 504].includes(status)) return true;
  return /network|failed to fetch|load failed|connection.*lost|timeout|timed out|terminated|aborted|econnreset|etimedout/i.test(error.message);
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getAffectedPaths(patchPlan: AIPatchPlan | null): string[] {
  return [
    ...(patchPlan?.changes?.map((change) => change.path) ?? []),
    ...(patchPlan?.deletes ?? []),
    ...(patchPlan?.renames?.flatMap((rename) => [rename.from, rename.to]) ?? []),
  ];
}

function hasAnyPatchChanges(patchPlan: AIPatchPlan | null): boolean {
  return (
    (patchPlan?.changes?.length ?? 0) > 0 ||
    (patchPlan?.deletes?.length ?? 0) > 0 ||
    (patchPlan?.renames?.length ?? 0) > 0
  );
}

// Errors matching these patterns have a predictable fix - route to fast single-pass auto-fix.
// Everything else goes to the full 3-phase investigate -> plan -> fix pipeline.
const KNOWN_CRASH_PATTERNS = [
  /Cannot read propert(?:y|ies) of (?:undefined|null) \(reading '(?:map|filter|slice|reduce|forEach|find|sort|join|some|every|flat|flatMap|length|includes|split|trim|toLowerCase|toUpperCase|replace)'\)/,
  /Element type is invalid: expected a string.*or a class\/function/,
  /\w+ is not a function/,
  /Cannot read properties of (?:undefined|null)/,
  /\w+ is not defined/,
  /objects are not valid as a react child/i,
];

function classifyRuntimeError(errors: string[]): "known" | "novel" {
  return errors.some((e) => KNOWN_CRASH_PATTERNS.some((p) => p.test(e))) ? "known" : "novel";
}



function parsePlannedFiles(projectPlan: string | null): string[] {
  if (!projectPlan) return [];
  try {
    const parsed = JSON.parse(projectPlan) as { files?: unknown };
    if (!Array.isArray(parsed.files)) return [];
    const seen = new Set<string>();
    return parsed.files
      .filter((file): file is string => typeof file === "string")
      .map((file) => file.trim())
      .filter((file) =>
        file &&
        !file.includes("..") &&
        (
          file === "NUTRIENTWEBBUILDER.md" ||
          file === "package.json" ||
          file === "index.html" ||
          file === "vite.config.ts" ||
          file.startsWith("src/") ||
          file.startsWith("backend/") ||
          file.startsWith("scripts/")
        )
      )
      .filter((file) => {
        if (seen.has(file)) return false;
        seen.add(file);
        return true;
      });
  } catch {
    return [];
  }
}

function ensurePlannedCoreFiles(files: string[], _userText: string): string[] {
  // Only guarantee the three files that MUST exist regardless of plan.
  // The planning prompt already decided the right file list (4-6 files default).
  // Injecting a large forced default list here used to push every build to 12-14
  // files minimum, causing first-pass truncation and dropped pages.
  const core = ["src/App.tsx", "src/index.css", "NUTRIENTWEBBUILDER.md"];
  const seen = new Set<string>();
  return [...core, ...files].filter((file) => {
    if (seen.has(file)) return false;
    seen.add(file);
    return true;
  });
}


function mergePatchPlans(base: AIPatchPlan | null, next: AIPatchPlan | null): AIPatchPlan | null {
  if (!base) return next;
  if (!next) return base;
  const changeMap = new Map(base.changes.map((change) => [change.path, change]));
  for (const change of next.changes) changeMap.set(change.path, change);
  return {
    plan: next.plan || base.plan,
    changes: Array.from(changeMap.values()),
    deletes: Array.from(new Set([...(base.deletes ?? []), ...(next.deletes ?? [])])),
    renames: [...(base.renames ?? []), ...(next.renames ?? [])],
  };
}


function buildPlannedRepositoryBuildPrompt(userText: string, plannedFiles: string[]): string {
  return `${userText}

BUILD FROM THE SAVED PROJECT PLAN

You MUST generate EVERY file listed below. Not "most of them." Not "the important ones." EVERY ONE. Missing files = build rejected.

Planned files (generate ALL of them in this response):
${plannedFiles.map((file) => `- ${file}`).join("\n")}

## CONTENT DENSITY - NO HOLLOW PAGES

Generated apps must feel like real software, not wireframes. For EVERY page in the project plan, render EVERY section listed in that page's \`sections\` field. Do NOT ship a page with 2-3 placeholder boxes.

**Minimum content per surface type:**

- **HomePage / landing page**: hero with real headline + subheadline + 2 CTAs + visual (illustration, screenshot stand-in, or product imagery), 4-metric stat strip with real numbers ("847 packages tracked", "12.4 min avg resolution", "99.2% on-time", "$2.4M throughput"), 6-card feature grid (each card: icon + 2-3 word title + 1-sentence description), workflow-highlight section with realistic copy, social-proof strip with 4-6 fake-but-believable company logos (use Tailwind text-muted-foreground divs with text labels like "ACME LOGISTICS" if you can't render images), 1 testimonial with author + role + company, CTA section, footer with brand mark + nav columns. **Aim for 250-400 lines of JSX in this file.**
- **Workflow / table pages**: header with breadcrumb + page title + 2-3 action buttons, filter bar with 3-5 working filters, data table rendering ALL mockData records (not the first 3), bulk-action bar that appears when rows are checked, detail drawer with 4+ field groups on row click. Tables need real columns (8-12), not 3 columns.
- **Dashboard / analytics pages**: 4-6 metric tiles with sparklines or trend indicators, a primary chart visualization (use CSS bar charts if no library - draw real bars from real data), recent-activity feed with 8-12 items, quick-actions panel.
- **Settings / profile pages**: section nav (tabs or sidebar), 3+ form sections (Account, Preferences, Security, Notifications, Billing, etc.), each with multiple labeled inputs.

**MockData must be RICH**: 15-20 records minimum, with realistic field values (real-sounding names, addresses, IDs in proper formats like "TRK-48291", varied statuses, realistic timestamps spanning recent days/weeks). Don't ship 3 placeholder records.

**Realistic copy**: No "Lorem ipsum". No "Title goes here". No "Description". Write actual sentences that fit the product domain - if it's logistics, write logistics-specific copy.

## Hard build rules:
- Output exactly one complete <file_patches> block containing ALL ${plannedFiles.length} files above.
- Use Tailwind utility classes for styling (\`bg-primary\`, \`bg-background\`, \`bg-card\`, \`text-foreground\`, \`text-muted-foreground\`, \`border-border\`, etc.) - Tailwind is loaded via CDN in index.html. Opacity modifiers work: \`bg-primary/10\`.
- src/App.tsx is thin root wiring (state, page switching).
- src/index.css contains \`:root\` token block + any product-specific classes (rare - Tailwind handles most styling).
- Every visible control must update React state.
- Use the real <NutrientViewer /> wrapper for any document surface (height: 100% on parent).
- Update NUTRIENTWEBBUILDER.md with what was built.
- Do not output <thinking> blocks. No prose. Just the <file_patches> block.`;
}

function buildDesignCssRepairPrompt(userText: string, changedPaths: string[]): string {
  return `${userText}

TARGETED DESIGN CSS REPAIR - generate ONLY src/index.css and NUTRIENTWEBBUILDER.md

The candidate build changed UI/source files but left src/index.css unchanged even though the user asked for visual design, color, theme, font, or modern UI changes. Fix the design layer now.

Files already changed in the candidate:
${changedPaths.map((file) => `- ${file}`).join("\n") || "- none detected"}

Rules:
- Output exactly one complete <file_patches> block.
- Include complete updated content for src/index.css.
- Include complete updated content for NUTRIENTWEBBUILDER.md with the latest visual change recorded.
- Preserve existing class names that are still used; add or update styles for any new page/component classes visible in the candidate.
- Implement the user's color/mood/font request in :root and [data-theme="dark"] HSL tokens, plus the /* nutrient-preview */ accentColor if present.
- If the user asks for warm/dark/black, use a warm charcoal neutral foundation plus one restrained accent family. Avoid rainbow palettes and random per-button colors.
- Do not use @tailwind, @apply, @layer, CSS nesting, or hardcoded hex values outside token blocks.
- Do not rewrite TSX unless CSS alone cannot make the requested design visible.`;
}

function buildPlannedFileBatchPrompt(
  userText: string,
  batch: string[],
  batchIndex: number,
  batchCount: number,
  allFiles: string[]
): string {
  return `${userText}

PLANNED FILE BATCH ${batchIndex}/${batchCount}

Nucode is building the repository from the saved project plan in smaller batches to avoid truncation and network timeouts.

Generate ONLY these files in this batch:
${batch.map((file) => `- ${file}`).join("\n")}

Full planned file contract:
${allFiles.map((file) => `- ${file}`).join("\n")}

Rules:
- Output exactly one complete <file_patches> block.
- Include full file contents for this batch.
- Match imports to the full planned file contract, even if a dependency is generated in another batch.
- Preserve the planned brand, layout, two-color palette, state model, and Nutrient integration.
- Do not add generic dashboards or unrelated pages.`;
}

function ensureBuilderMemoryPatch(
  userText: string,
  projectFiles: ProjectFile[],
  patchPlan: AIPatchPlan | null
): AIPatchPlan | null {
  if (!patchPlan || !hasAnyPatchChanges(patchPlan)) return patchPlan;
  if (patchPlan.changes.some((change) => change.path === "NUTRIENTWEBBUILDER.md")) return patchPlan;

  const affectedPaths = getAffectedPaths(patchPlan);
  const rawExistingMemory =
    projectFiles.find((file) => file.path === "NUTRIENTWEBBUILDER.md")?.content.trim() ||
    "# Nutrient Web Builder Memory\n\n## Project\n\nThis generated app uses Nutrient Web SDK inside product workflows.";
  // Strip any previous "## Latest AI Change" section so memory doesn't grow unbounded.
  const existingMemory = rawExistingMemory.replace(/\n*## Latest AI Change[\s\S]*$/m, "").trim();
  // Cap total memory at 3 KB to keep prompt context manageable.
  const cappedMemory = existingMemory.length > 3000 ? existingMemory.slice(-3000) : existingMemory;
  const memoryUpdate = [
    cappedMemory,
    "",
    "## Latest AI Change",
    "",
    `- Request: ${userText}`,
    `- Plan: ${patchPlan.plan || "Updated the project based on the user request."}`,
    `- Files touched: ${affectedPaths.length ? affectedPaths.join(", ") : "No file list available"}`,
  ].join("\n");

  return {
    ...patchPlan,
    changes: [
      ...patchPlan.changes,
      {
        path: "NUTRIENTWEBBUILDER.md",
        content: memoryUpdate,
      },
    ],
  };
}

function projectContextPriority(path: string): string {
  if (path === "NUTRIENTWEBBUILDER.md") return "00";
  if (path === "src/App.tsx") return "01";
  if (path === "src/index.css") return "02";
  if (path.startsWith("src/layouts/")) return `03-${path}`;
  if (path.startsWith("src/pages/")) return `04-${path}`;
  if (path.startsWith("src/components/")) return `05-${path}`;
  if (path.startsWith("src/hooks/")) return `06-${path}`;
  if (path.startsWith("src/services/")) return `07-${path}`;
  if (path.startsWith("src/store/")) return `08-${path}`;
  if (path.startsWith("src/data/")) return `09-${path}`;
  if (path.startsWith("src/types/")) return `10-${path}`;
  if (path.startsWith("src/utils/") || path.startsWith("src/lib/")) return `11-${path}`;
  if (path.startsWith("src/")) return `12-${path}`;
  if (path === "package.json" || path === "vite.config.ts" || path === "index.html") return `13-${path}`;
  if (path.startsWith("config/")) return `90-${path}`;
  return `99-${path}`;
}

function getVisibleReadingFiles(projectFiles: ProjectFile[], userText: string): string[] {
  const includeConfig = !requiresRepositoryBuild(userText);
  const projectContext = projectFiles
    .filter((file) =>
      file.path === "NUTRIENTWEBBUILDER.md" ||
      file.path.startsWith("src/") ||
      file.path === "package.json" ||
      file.path === "vite.config.ts" ||
      file.path === "index.html" ||
      (includeConfig && file.path.startsWith("config/"))
    )
    .sort((a, b) => projectContextPriority(a.path).localeCompare(projectContextPriority(b.path)))
    .map((file) => file.path)
    .slice(0, 12);

  return requiresRepositoryBuild(userText)
    ? ["Nutrient Web SDK docs context", ...projectContext]
    : projectContext;
}

// Injects active runtime error context into the user's message so Claude sees
// exactly what crashed, in which file, and gets the null-guard fix rules.
function buildErrorEnhancedPrompt(userText: string, runtimeErrors: string[], projectFiles: ProjectFile[]): string {
  // Only real errors, not the "[AppErrorBoundary]" marker strings
  const realErrors = runtimeErrors.filter((e) =>
    !e.startsWith("[") && (e.includes("TypeError") || e.includes("Error:") || e.includes("Uncaught"))
  );
  if (!realErrors.length) return userText;

  // Extract the first crashed file from each error's stack trace
  const crashedFiles = new Set<string>();
  for (const err of realErrors) {
    const m = err.match(/at \S+ \([^)]*\/src\/([^):]+):\d+/);
    if (m) crashedFiles.add(`src/${m[1]}`);
  }

  const errorSummary = realErrors
    .slice(0, 2)
    .map((e) => e.split("\n").slice(0, 4).join("\n"))
    .join("\n\n");

  const crashedFileContext = Array.from(crashedFiles)
    .slice(0, 2)
    .map((path) => {
      const file = projectFiles.find((f) => f.path === path);
      if (!file) return "";
      // Show first 60 lines - enough to see the crash site
      const lines = file.content.split("\n");
      const excerpt = lines.slice(0, 60).join("\n");
      const truncated = lines.length > 60 ? `\n// ... (${lines.length - 60} more lines)` : "";
      return `### ${path}\n\`\`\`tsx\n${excerpt}${truncated}\n\`\`\``;
    })
    .filter(Boolean)
    .join("\n\n");

  return [
    userText,
    "",
    "## ACTIVE RUNTIME CRASH - FIX THIS FIRST",
    errorSummary,
    crashedFileContext ? `\n## Crashed file (for context)\n${crashedFileContext}` : "",
    "",
    "**NULL GUARD FIX RULES (the #1 crash cause):**",
    "- Add `?? []` before EVERY `.filter()`, `.map()`, `.find()`, `.slice()`, `.sort()`, `.reduce()`, `.join()` call: `(value ?? []).filter(...)`",
    "- Initialize array state with a default: `useState<T[]>([])` NOT `useState<T[]>()`",
    "- Use optional chaining for nested object access: `obj?.prop?.nested`",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

type StreamPhase = "thinking" | "writing" | "done";
type BuildPhase = "idle" | "classifying" | "roadmap" | "design" | "build" | "deep";

// Strips <thinking>...</thinking> blocks (Claude sometimes leaks these even when
// the system prompt forbids them).
function stripThinking(text: string): string {
  return text.replace(/<thinking>[\s\S]*?<\/thinking>/g, "").trim();
}

// Tries <file_edits> first (search-replace diff), falls back to <file_patches>
// (full-file rewrite). Returns a unified AIPatchPlan + any validation/edit issues.
function extractPatchFromResponse(
  decoded: string,
  projectFiles: ProjectFile[]
): { patchPlan: AIPatchPlan | null; issues: string[] } {
  const edits = parseFileEdits(decoded);
  if (edits?.edits.length) {
    const result = applyEditsToFiles(edits, projectFiles);
    const issues: string[] = [];
    if (result.failures.length) issues.push(`Edit failures:\n${describeEditFailures(result.failures)}`);
    const validated = validatePatchPlan(result.patchPlan);
    if (validated?.issues.length) issues.push(`Validation issues:\n${describeIssues(validated.issues)}`);
    return { patchPlan: validated?.patchPlan ?? result.patchPlan, issues };
  }
  // Fallback: full-file <file_patches> (used by full-build and back-compat)
  const patchPlan = parseFilePatchPlan(decoded) as AIPatchPlan | null;
  const validated = validatePatchPlan(patchPlan);
  const issues = validated?.issues.length ? [`Validation issues:\n${describeIssues(validated.issues)}`] : [];
  return { patchPlan: validated?.patchPlan ?? patchPlan, issues };
}

const ALL_PIPELINE_OPTIONS: { value: PipelineType; label: string; title: string }[] = [
  { value: "light", label: "Light", title: "3-phase compact build (plan->design->build) - default" },
  { value: "full-build", label: "Full", title: "Parent version of Light for larger builds" },
  { value: "deep", label: "Deep", title: "Light-style focused coding with heavy Nutrient docs integration" },
];

function getStoredContextOverrides(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const overrides: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("nucode.ctx.")) {
      const value = localStorage.getItem(key);
      const rawContextKey = key.slice("nucode.ctx.".length);
      const contextKey = rawContextKey === "nucode.build.extra" ? "deep.build.extra" : rawContextKey;
      if (value?.trim()) overrides[contextKey] = value;
    }
  }
  return overrides;
}

function getDisabledPipelines(): Set<string> {
  if (typeof window === "undefined") return new Set();
  return new Set(
    (["light", "full-build", "deep"] as PipelineType[]).filter(
      (id) => localStorage.getItem(`nucode.pipeline.${id}.disabled`) === "true"
    )
  );
}

export function ChatPanel() {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [readingFiles, setReadingFiles] = useState<string[]>([]);
  const [writingFiles, setWritingFiles] = useState<string[]>([]);
  const [streamPhase, setStreamPhase] = useState<StreamPhase>("thinking");
  const [streamPlan, setStreamPlan] = useState<string>("");
  const [buildPhase, setBuildPhase] = useState<BuildPhase>("idle");
  const [forcedPipeline, setForcedPipeline] = useState<PipelineType>("light");
  const [selectedSkillMode, setSelectedSkillMode] = useState<SkillModeId>(DEFAULT_SKILL_MODE);
  const [selectedModelTier, setSelectedModelTier] = useState<ModelTierId>(DEFAULT_MODEL_TIER);
  const [disabledPipelines, setDisabledPipelines] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedPipeline = normalizePipelineType(forcedPipeline);

  const messages = useWorkspaceStore((s) => s.messages);
  const workspace = useWorkspaceStore((s) => s.workspace);

  // Restore the per-workspace Nucode model tier choice
  useEffect(() => {
    if (!workspace?.id) return;
    const saved = localStorage.getItem(`nucode-model-tier-${workspace.id}`);
    if (saved && MODEL_TIERS.some((t) => t.id === saved)) {
      setSelectedModelTier(saved as ModelTierId);
    }
  }, [workspace?.id]);

  function changeModelTier(tier: ModelTierId) {
    setSelectedModelTier(tier);
    if (workspace?.id) localStorage.setItem(`nucode-model-tier-${workspace.id}`, tier);
  }
  const template = useWorkspaceStore((s) => s.template);
  const projectFiles = useWorkspaceStore((s) => s.projectFiles);
  const runtimeErrors = useWorkspaceStore((s) => s.runtimeErrors);
  const addMessage = useWorkspaceStore((s) => s.addMessage);
  const applyFilePatches = useWorkspaceStore((s) => s.applyFilePatches);
  const resetToTemplate = useWorkspaceStore((s) => s.resetToTemplate);
  const setIsAIStreaming = useWorkspaceStore((s) => s.setIsAIStreaming);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Load disabled pipelines from admin settings
  useEffect(() => {
    const disabled = getDisabledPipelines();
    setDisabledPipelines(disabled);
    // If current pipeline got disabled, switch to first enabled
    if (disabled.has(selectedPipeline)) {
      const first = ALL_PIPELINE_OPTIONS.find((o) => !disabled.has(o.value));
      if (first) setForcedPipeline(first.value);
    }
    function onStorage() {
      const updated = getDisabledPipelines();
      setDisabledPipelines(updated);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if ((forcedPipeline as string) === "nucode") {
      setForcedPipeline("deep");
    }
  }, [forcedPipeline]);

  const PIPELINE_OPTIONS = ALL_PIPELINE_OPTIONS.filter((o) => !disabledPipelines.has(o.value));

  const sendMessage = useCallback(
    async (text: string, pipelineOverride?: PipelineType) => {
      if (!text.trim() || isLoading || !workspace || !template) return;

      const rawUserText = text.trim();
      const userText = buildSkillModePromptPrefix(rawUserText, selectedSkillMode);
      const workspaceId = workspace.id;
      const templateId = template.id;
      setInput("");
      setIsLoading(true);
      setIsAIStreaming(true);
      setStreamPhase("thinking");
      setStreamPlan("");

      // Show which project files the AI will read
      setReadingFiles(getVisibleReadingFiles(projectFiles, userText));
      setWritingFiles([]);

      addMessage({ role: "user", content: userText });

      // Placeholder assistant message - replaced with final content when done
      const streamId = Date.now().toString();
      useWorkspaceStore.setState((state) => ({
        messages: [
          ...state.messages,
          { id: streamId, role: "assistant" as const, content: "working", timestamp: new Date().toISOString() },
        ],
      }));

      const updateAssistantMessage = (
        content: string,
        extra?: Partial<AIMessage & { patchedFiles?: string[] }>
      ) => {
        useWorkspaceStore.setState((state) => ({
          messages: state.messages.map((m) =>
            m.id === streamId ? { ...m, content, ...extra } : m
          ),
        }));
      };

      async function runAIRequestOnce(
        messageOverride: string,
        filesOverride?: ProjectFile[],
        planOverride?: string,
        designSpecOverride?: string,
        ctxOverrides?: Record<string, string>,
        pipelineTypeOverride?: string,
      ): Promise<string> {
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: messageOverride,
            workspaceId,
            templateId,
            projectFiles: filesOverride ?? projectFiles,
            messageHistory: messages.slice(-8).map((m) => ({ role: m.role, content: m.content })),
            plan: planOverride,
            designNote: designSpecOverride,
            contextOverrides: ctxOverrides,
            pipelineType: pipelineTypeOverride,
            modelTier: selectedModelTier,
          }),
        });
        if (!response.ok) {
          const error = new Error(await readErrorMessage(response)) as StatusError;
          error.status = response.status;
          throw error;
        }
        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let rawBuffer = "";
        const detectedPaths = new Set<string>();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          rawBuffer += decoder.decode(value, { stream: true });

          // Extract file paths from partial buffer to show live write activity
          for (const path of extractStreamingPaths(rawBuffer)) {
            if (!detectedPaths.has(path)) {
              detectedPaths.add(path);
              setWritingFiles((prev) => [...prev, path]);
              setStreamPhase("writing");
            }
          }
          // Extract plan text once available
          const planMatch = rawBuffer.match(/"plan"\s*:\s*"([^"\\]+)"/);
          if (planMatch) setStreamPlan(planMatch[1]);
        }

        return decodeAIResponse(rawBuffer);
      }

      async function runAIRequest(
        messageOverride: string,
        filesOverride?: ProjectFile[],
        planOverride?: string,
        designSpecOverride?: string,
        ctxOverrides?: Record<string, string>,
        pipelineTypeOverride?: string,
      ): Promise<string> {
        let lastError: unknown;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            if (attempt > 0) {
              setWritingFiles([]);
              setStreamPhase("thinking");
              setStreamPlan(`Network hiccup. Retrying AI request (${attempt + 1}/3)...`);
              await wait(700 * attempt);
            }
            return await runAIRequestOnce(messageOverride, filesOverride, planOverride, designSpecOverride, ctxOverrides, pipelineTypeOverride);
          } catch (error) {
            lastError = error;
            if (attempt === 2 || !isTransientAIError(error)) throw error;
          }
        }
        throw lastError instanceof Error ? lastError : new Error("AI request failed.");
      }

      try {
        const activeErrors = useWorkspaceStore.getState().runtimeErrors;
        const workspaceMemory = projectFiles.find((f) => f.path === "NUTRIENTWEBBUILDER.md")?.content?.trim() ?? "";
        const hasExistingBuild = workspaceMemory.length > 300;

        // Pipeline is always the user-selected one (default: light). Quick-starter prompts
        // intentionally do not override this; they should start on Light unless the user chose otherwise.
        const pipeline = normalizePipelineType(pipelineOverride ?? forcedPipeline);
        if ((forcedPipeline as string) !== pipeline) setForcedPipeline(pipeline);

        // eslint-disable-next-line no-console
        console.log(`[Nutrient Agent] Pipeline: ${pipeline}`, { request: userText.slice(0, 80), hasExistingBuild });

        const contextOverrides = getStoredContextOverrides();

        const localThemePatch = buildLocalDarkThemePatch(userText, projectFiles);
        if (localThemePatch) {
          setBuildPhase("design");
          setStreamPhase("writing");
          setStreamPlan("Applying universal theme tokens…");
          setWritingFiles(localThemePatch.changes.map((change) => change.path));
          const withMem = ensureBuilderMemoryPatch(userText, projectFiles, localThemePatch);
          if (withMem) await applyFilePatches(withMem);
          updateAssistantMessage("Done.", { patchedFiles: withMem?.changes?.map((change) => change.path) ?? [] });
          return;
        }

        // -- Deep pipeline: Light-style coding with heavy Nutrient docs -----------
        if (pipeline === "deep") {
          setBuildPhase("deep");
          setStreamPlan("Consulting Nutrient knowledge base…");
          const deepRes = await fetch("/api/ai/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: userText,
              workspaceId, templateId,
              projectFiles,
              messageHistory: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
              mode: "deep",
              pipelineType: pipeline,
              contextOverrides,
              modelTier: selectedModelTier,
            }),
          });
          if (!deepRes.ok) {
            const deepErr = new Error(await readErrorMessage(deepRes)) as StatusError;
            deepErr.status = deepRes.status;
            throw deepErr;
          }
          if (!deepRes.body) throw new Error("No response body");
          const deepReader = deepRes.body.getReader();
          const deepDec = new TextDecoder();
          let deepRaw = "";
          while (true) {
            const { done, value } = await deepReader.read();
            if (done) break;
            deepRaw += deepDec.decode(value, { stream: true });
          }
          const deepDecoded = stripThinking(decodeAIResponse(deepRaw));

          // If the response contains file patches, apply them like a build
          const lp = sanitizePatchPlan(parseFilePatchPlan(deepDecoded) as AIPatchPlan | null);
          if (lp?.changes?.length) {
            const deepCandidate = buildCandidate(projectFiles);
            mergeIntoCandidate(deepCandidate, lp);
            if (requestsDesignChange(userText)) {
              const originalCss = projectFiles.find((file) => file.path === "src/index.css")?.content ?? "";
              const candidateCss = deepCandidate.get("src/index.css") ?? "";
              if (candidateCss === originalCss) {
                setStreamPlan("Repairing requested design tokens…");
                setWritingFiles([]);
                setStreamPhase("thinking");
                const changedPaths = candidateToPatchPlan(deepCandidate, projectFiles, "candidate")?.changes.map((change) => change.path) ?? [];
                const designRepairMessage = buildDesignCssRepairPrompt(userText, changedPaths);
                try {
                  const repairDecoded = await runAIRequest(
                    designRepairMessage,
                    candidateToProjectFiles(deepCandidate, projectFiles),
                    undefined,
                    undefined,
                    contextOverrides,
                    pipeline
                  );
                  const repairPlan = sanitizePatchPlan(parseFilePatchPlan(repairDecoded) as AIPatchPlan | null);
                  if (repairPlan?.changes?.length) {
                    mergeIntoCandidate(deepCandidate, repairPlan);
                    // eslint-disable-next-line no-console
                    console.log("[Nutrient Agent] Deep design CSS repair", { files: repairPlan.changes.length });
                  }
                } catch (err) {
                  // eslint-disable-next-line no-console
                  console.warn("[Agent Deep design CSS repair failed]", err);
                }
              }
            }

            const deepFatal = detectFatalIssues(deepCandidate);
            const deepDesignCssStillUnchanged =
              requestsDesignChange(userText) &&
              (deepCandidate.get("src/index.css") ?? "") === (projectFiles.find((file) => file.path === "src/index.css")?.content ?? "");
            const deepBlocked =
              deepFatal.some((i) => i.type === "missing-app-tsx") ||
              deepFatal.some((i) => i.type === "sdk-npm-import") ||
              deepFatal.some((i) => i.type === "missing-file") ||
              deepFatal.some((i) => i.type === "truncated") ||
              deepFatal.some((i) => i.type === "export-mismatch") ||
              deepDesignCssStillUnchanged;
            if (!deepBlocked && deepCandidate.size > 0) {
              const deepPatchPlan = candidateToPatchPlan(deepCandidate, projectFiles, "Deep build");
              if (deepPatchPlan && hasAnyPatchChanges(deepPatchPlan)) {
                const withMem = ensureBuilderMemoryPatch(userText, projectFiles, deepPatchPlan);
                if (withMem) await applyFilePatches(withMem);
                updateAssistantMessage("Done.", { patchedFiles: withMem?.changes?.map((c) => c.path) ?? [] });
                return;
              }
            }
            if (deepBlocked) {
              const missingFiles = deepFatal.filter((i) => i.type === "missing-file").map((i) => i.importPath ?? i.file);
              updateAssistantMessage(
                missingFiles.length > 0
                  ? `Deep blocked - these imports were never written: ${missingFiles.slice(0, 3).join(", ")}.`
                  : deepFatal.some((i) => i.type === "truncated")
                  ? "Deep blocked - some files were cut off mid-generation."
                  : deepFatal.some((i) => i.type === "export-mismatch")
                  ? "Deep blocked - generated imports/exports did not match."
                  : deepDesignCssStillUnchanged
                  ? "Deep design blocked - the requested visual change did not update src/index.css, so no patches were applied."
                  : "Deep blocked - generated code would break the preview."
              );
              return;
            }
          }

          // Otherwise show the text answer
          updateAssistantMessage(deepDecoded || "No response returned - please rephrase your question.");
          return;
        }

        // -- Light pipeline: plan -> design -> build (single pass) ----------------
        // Phase 1: compact plan (Haiku, ~5s)
        // eslint-disable-next-line no-console
        console.log("[Nutrient Agent] Phase: plan");
        setBuildPhase("roadmap");
        setStreamPlan("Planning…");
        setStreamPhase("thinking");
        let lightPlanJson = "";
        try {
          const lightPlanRes = await fetch("/api/ai/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: userText,
              workspaceId, templateId,
              projectFiles,
              messageHistory: [],
              mode: "plan",
              pipelineType: pipeline,
              contextOverrides,
            }),
          });
          if (lightPlanRes.ok && lightPlanRes.body) {
            const rdr = lightPlanRes.body.getReader();
            const decPlan = new TextDecoder();
            let raw = "";
            while (true) { const { done, value } = await rdr.read(); if (done) break; raw += decPlan.decode(value, { stream: true }); }
            const decoded = decodeAIResponse(raw);
            const m = decoded.match(/<light_plan>([\s\S]*?)<\/light_plan>/);
            if (m) {
              lightPlanJson = m[1].trim();
              try {
                const p = JSON.parse(lightPlanJson);
                setStreamPlan(`Plan ready: ${p.brand ?? "app"} · ${p.accent ?? ""}`);
              } catch { setStreamPlan("Plan ready - designing…"); }
            }
          }
        } catch { setStreamPlan("Plan skipped - designing…"); }

        // Phase 2: palette design spec (Haiku, ~5s)
        // eslint-disable-next-line no-console
        console.log("[Nutrient Agent] Phase: design");
        setBuildPhase("design");
        setStreamPlan("Designing palette…");
        let lightDesignSpec = "";
        try {
          const designRes = await fetch("/api/ai/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: userText, workspaceId, templateId,
              projectFiles, messageHistory: [],
              mode: "design",
              plan: lightPlanJson || undefined,
              pipelineType: pipeline,
              contextOverrides,
            }),
          });
          if (designRes.ok && designRes.body) {
            const rdr = designRes.body.getReader();
            const decDes = new TextDecoder();
            let raw = "";
            while (true) { const { done, value } = await rdr.read(); if (done) break; raw += decDes.decode(value, { stream: true }); }
            const decoded = decodeAIResponse(raw);
            const m = decoded.match(/<design_spec>([\s\S]*?)<\/design_spec>/);
            if (m) {
              let spec: { paletteName?: string; fontFamily?: string; fontImport?: string; light?: Record<string, string>; dark?: Record<string, string>; tokens?: Record<string, string>; componentStyle?: string; layoutSignature?: string; avoid?: string[] } = {};
              try { spec = JSON.parse(m[1].trim()) as typeof spec; } catch { /* ok */ }
              const lightTokens = spec.light ?? spec.tokens ?? {};
              const darkTokens = spec.dark ?? {};
              const rootBlock = Object.keys(lightTokens).length
                ? `:root {\n${Object.entries(lightTokens).map(([k, v]) => `  ${k}: ${v};`).join("\n")}\n}${Object.keys(darkTokens).length ? `\n[data-theme="dark"] {\n${Object.entries(darkTokens).map(([k, v]) => `  ${k}: ${v};`).join("\n")}\n}` : ""}`
                : "";
              lightDesignSpec = [
                spec.paletteName ? `Palette: ${spec.paletteName}` : "",
                spec.fontFamily ? `Font: ${spec.fontFamily}` : "",
                spec.fontImport ? `Font import: ${spec.fontImport}` : "",
                spec.componentStyle ? `Component style: ${spec.componentStyle}` : "",
                spec.layoutSignature ? `Layout: ${spec.layoutSignature}` : "",
                spec.avoid?.length ? `Avoid: ${spec.avoid.join(", ")}` : "",
                rootBlock ? `\nWrite these exact :root and dark blocks in src/index.css (HSL values, shadcn/ui token names):\n\`\`\`css\n${rootBlock}\n\`\`\`` : "",
                `\nCSS tokens use HSL (H S% L%) - reference as hsl(var(--token)) in CSS, bg-primary/text-foreground/etc. in Tailwind.`,
              ].filter(Boolean).join("\n");
              if (spec.paletteName) setStreamPlan(`Design ready: ${spec.paletteName} · building…`);
            }
          }
        } catch { setStreamPlan("Design skipped - building…"); }

        // Phase 3: build
        // eslint-disable-next-line no-console
        console.log("[Nutrient Agent] Phase: build");
        setBuildPhase("build");
        setStreamPlan("Building…");
        setWritingFiles([]);
        setStreamPhase("thinking");
        const candidate = buildCandidate(projectFiles);

        async function runBuildPass(passLabel: string, hint?: string): Promise<void> {
          const message = hint
            ? `${buildLightBuildPrompt(userText, lightPlanJson || undefined, lightDesignSpec || undefined)}\n\n${hint}`
            : buildLightBuildPrompt(userText, lightPlanJson || undefined, lightDesignSpec || undefined);
          try {
            const decoded = await runAIRequest(message, projectFiles, lightPlanJson || undefined, lightDesignSpec || undefined, contextOverrides, pipeline);
            const lp = sanitizePatchPlan(parseFilePatchPlan(decoded) as AIPatchPlan | null);
            if (lp?.changes?.length) {
              mergeIntoCandidate(candidate, lp);
              // eslint-disable-next-line no-console
              console.log(`[Nutrient Agent] ${passLabel}`, { files: lp.changes.length });
            }
          } catch (err) {
            // eslint-disable-next-line no-console
            console.warn(`[Agent ${passLabel} failed]`, err);
          }
        }

        await runBuildPass("Pass 1");

        // Repair pass: targeted fix for missing files, truncated outputs, or export mismatches.
        // Runs for both light and full-build pipelines.
        {
          const afterPass1 = detectFatalIssues(candidate);
          const hasMissing = afterPass1.some((i) => i.type === "missing-file");
          const hasTruncated = afterPass1.some((i) => i.type === "truncated");
          const hasExportMismatch = afterPass1.some((i) => i.type === "export-mismatch");
          if (hasMissing || hasTruncated || hasExportMismatch) {
            const missingPaths = getMissingFilePaths(afterPass1);
            const truncatedPaths = [...new Set(afterPass1.filter((i) => i.type === "truncated").map((i) => i.file))];
            const label = [...missingPaths, ...truncatedPaths].slice(0, 2).join(", ") || "incomplete files";
            setStreamPlan(`Repairing ${label}…`);
            setWritingFiles([]);
            setStreamPhase("thinking");
            const repairMessage = buildTargetedRepairPrompt(userText, afterPass1, candidate);
            try {
              const repairDecoded = await runAIRequest(repairMessage, undefined, undefined, undefined, contextOverrides, pipeline);
              const repairPlan = sanitizePatchPlan(parseFilePatchPlan(repairDecoded) as AIPatchPlan | null);
              if (repairPlan?.changes?.length) {
                mergeIntoCandidate(candidate, repairPlan);
                // eslint-disable-next-line no-console
                console.log("[Nutrient Agent] Repair pass 1", { files: repairPlan.changes.length });
              }
            } catch (err) {
              // eslint-disable-next-line no-console
              console.warn("[Agent Repair pass 1 failed]", err);
            }

            // Full-build only: one extra repair attempt if issues still remain after first repair
            if (pipeline === "full-build") {
              const afterRepair1 = detectFatalIssues(candidate);
              const stillMissing = afterRepair1.some((i) => i.type === "missing-file");
              const stillTruncated = afterRepair1.some((i) => i.type === "truncated");
              const stillMismatch = afterRepair1.some((i) => i.type === "export-mismatch");
              if (stillMissing || stillTruncated || stillMismatch) {
                const missingPaths2 = getMissingFilePaths(afterRepair1);
                const truncatedPaths2 = [...new Set(afterRepair1.filter((i) => i.type === "truncated").map((i) => i.file))];
                const label2 = [...missingPaths2, ...truncatedPaths2].slice(0, 2).join(", ") || "incomplete files";
                setStreamPlan(`Repairing ${label2}…`);
                setWritingFiles([]);
                setStreamPhase("thinking");
                const repairMessage2 = buildTargetedRepairPrompt(userText, afterRepair1, candidate);
                try {
                  const repairDecoded2 = await runAIRequest(repairMessage2, undefined, undefined, undefined, contextOverrides, pipeline);
                  const repairPlan2 = sanitizePatchPlan(parseFilePatchPlan(repairDecoded2) as AIPatchPlan | null);
                  if (repairPlan2?.changes?.length) {
                    mergeIntoCandidate(candidate, repairPlan2);
                    // eslint-disable-next-line no-console
                    console.log("[Nutrient Agent] Repair pass 2", { files: repairPlan2.changes.length });
                  }
                } catch (err) {
                  // eslint-disable-next-line no-console
                  console.warn("[Agent Repair pass 2 failed]", err);
                }
              }
            }
          }
        }

        if (requestsDesignChange(userText)) {
          const originalCss = projectFiles.find((file) => file.path === "src/index.css")?.content ?? "";
          const candidateCss = candidate.get("src/index.css") ?? "";
          if (candidateCss === originalCss) {
            setStreamPlan("Repairing requested design tokens…");
            setWritingFiles([]);
            setStreamPhase("thinking");
            const changedPaths = candidateToPatchPlan(candidate, projectFiles, "candidate")?.changes.map((change) => change.path) ?? [];
            const designRepairMessage = buildDesignCssRepairPrompt(userText, changedPaths);
            try {
              const repairDecoded = await runAIRequest(
                designRepairMessage,
                candidateToProjectFiles(candidate, projectFiles),
                lightPlanJson || undefined,
                lightDesignSpec || undefined,
                contextOverrides,
                pipeline
              );
              const repairPlan = sanitizePatchPlan(parseFilePatchPlan(repairDecoded) as AIPatchPlan | null);
              if (repairPlan?.changes?.length) {
                mergeIntoCandidate(candidate, repairPlan);
                // eslint-disable-next-line no-console
                console.log("[Nutrient Agent] Design CSS repair", { files: repairPlan.changes.length });
              }
            } catch (err) {
              // eslint-disable-next-line no-console
              console.warn("[Agent Design CSS repair failed]", err);
            }
          }
        }

        // Apply — never apply a candidate that would crash the preview
        const finalFatal = detectFatalIssues(candidate);
        const designCssStillUnchanged =
          requestsDesignChange(userText) &&
          (candidate.get("src/index.css") ?? "") === (projectFiles.find((file) => file.path === "src/index.css")?.content ?? "");
        const finalBlocked =
          finalFatal.some((i) => i.type === "missing-app-tsx") ||
          finalFatal.some((i) => i.type === "sdk-npm-import") ||
          finalFatal.some((i) => i.type === "missing-file") ||
          finalFatal.some((i) => i.type === "truncated") ||
          designCssStillUnchanged;

        if (!finalBlocked && candidate.size > 0) {
          const patchPlan = candidateToPatchPlan(candidate, projectFiles, pipeline === "full-build" ? "Full build" : "Light build");
          if (patchPlan && hasAnyPatchChanges(patchPlan)) {
            const withMem = ensureBuilderMemoryPatch(userText, projectFiles, patchPlan);
            if (withMem) await applyFilePatches(withMem);
            updateAssistantMessage("Done.", { patchedFiles: withMem?.changes?.map((c) => c.path) ?? [] });
            return;
          }
        }

        const missingFiles = finalFatal.filter((i) => i.type === "missing-file").map((i) => i.importPath ?? i.file);
        updateAssistantMessage(
          finalFatal.some((i) => i.type === "missing-app-tsx")
            ? "Build incomplete - App.tsx could not be generated. Try rephrasing your prompt."
            : missingFiles.length > 0
            ? `Build blocked - these imports were never written: ${missingFiles.slice(0, 3).join(", ")}. Try rephrasing or use Deep for a more targeted docs-backed edit.`
            : finalFatal.some((i) => i.type === "truncated")
            ? "Build blocked - some files were cut off mid-generation. Try rephrasing or use Deep for a more targeted docs-backed edit."
            : designCssStillUnchanged
            ? "Design blocked - the requested visual change did not update src/index.css, so no patches were applied."
            : finalBlocked
            ? "Build incomplete. Try rephrasing your prompt."
            : "The agent did not return any patches. Try rephrasing your prompt."
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "AI request failed.";
        console.error("[ChatPanel] AI request failed:", message);
        toast.error(message);
        updateAssistantMessage(`Request failed: ${message}`);
      } finally {
        setBuildPhase("idle");
        setIsLoading(false);
        setIsAIStreaming(false);
        setStreamPhase("thinking");
        setStreamPlan("");
        setReadingFiles([]);
        setWritingFiles([]);
      }
    },
    [isLoading, workspace, template, projectFiles, messages, addMessage, applyFilePatches, setIsAIStreaming, forcedPipeline, selectedSkillMode, selectedModelTier]
  );

  useEffect(() => {
    function handleExternalPrompt(e: Event) {
      const prompt = (e as CustomEvent<{ prompt: string }>).detail.prompt;
      if (prompt) sendMessage(prompt);
    }
    window.addEventListener("nutrient:send-prompt", handleExternalPrompt);
    return () => window.removeEventListener("nutrient:send-prompt", handleExternalPrompt);
  }, [sendMessage]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#1a1414]">
      {/* Compact Nucode header — only when a conversation is active */}
      {(messages.length > 0 || isLoading) && (
        <div className="shrink-0 px-4 pt-2.5 pb-2 border-b border-[#2a2222] flex items-center gap-2">
          <span
            style={{
              fontFamily: "'Satoshi', var(--font-geist-sans), sans-serif",
              fontSize: 15,
              fontWeight: 700,
              color: "#f4f4f5",
              letterSpacing: "-0.025em",
              lineHeight: 1,
            }}
          >
            Nucode
          </span>
          {selectedPipeline === "deep" && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                background: "#130f0f",
                border: "1px solid #2a2020",
                borderRadius: 4,
                padding: "1px 5px",
                fontSize: 8,
                fontWeight: 600,
                color: "#6b5050",
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
              }}
            >
              deep
            </span>
          )}
        </div>
      )}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-4">
          {messages.length === 0 && !isLoading ? (
            <EmptyState onPromptSelect={sendMessage} template={template} pipeline={selectedPipeline} />
          ) : (
            <>
              {messages.map((msg, i) => {
                const isLastAssistant =
                  i === messages.length - 1 && msg.role === "assistant" && isLoading;
                return (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isLast={i === messages.length - 1}
                    liveActivity={
                      isLastAssistant
                        ? { reading: readingFiles, writing: writingFiles, phase: streamPhase, plan: streamPlan, buildPhase }
                        : undefined
                    }
                  />
                );
              })}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-[#2a2222] p-3 space-y-2 bg-[#1a1414]">
        {/* Pipeline and skill selectors */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-zinc-700 shrink-0">Pipeline:</span>
            <div className="flex items-center gap-1 flex-wrap">
              {PIPELINE_OPTIONS.map((opt) => {
                const isActive = selectedPipeline === opt.value;
                const isDeep = opt.value === "deep";
                return (
                  <button
                    key={opt.value}
                    title={opt.title}
                    onClick={() => setForcedPipeline(opt.value)}
                    disabled={isLoading}
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-medium transition-colors",
                      isActive && isDeep
                        ? ""
                        : isActive
                        ? "bg-zinc-600 text-zinc-100"
                        : "bg-[#2a2222] text-zinc-600 hover:text-zinc-400 hover:bg-[#332b2b]"
                    )}
                    style={
                      isActive && isDeep
                        ? { background: "#2a1a12", color: "#c49878", border: "1px solid #4a3020" }
                        : undefined
                    }
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-zinc-700 shrink-0">Model:</span>
            <select
              value={selectedModelTier}
              onChange={(event) => changeModelTier(event.target.value as ModelTierId)}
              disabled={isLoading}
              className="h-5 max-w-[150px] rounded border border-[#332b2b] bg-[#211a1a] px-1.5 text-[10px] font-medium text-zinc-500 outline-none transition-colors hover:text-zinc-300 focus:border-zinc-600 disabled:opacity-60"
              title={MODEL_TIERS.find((t) => t.id === selectedModelTier)?.tagline}
            >
              {MODEL_TIERS.map((tier) => (
                <option key={tier.id} value={tier.id}>
                  {tier.brandName} · {tier.usageLevel}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-zinc-700 shrink-0">Skill:</span>
            <select
              value={selectedSkillMode}
              onChange={(event) => setSelectedSkillMode(event.target.value as SkillModeId)}
              disabled={isLoading}
              className="h-5 max-w-[150px] rounded border border-[#332b2b] bg-[#211a1a] px-1.5 text-[10px] font-medium text-zinc-500 outline-none transition-colors hover:text-zinc-300 focus:border-zinc-600 disabled:opacity-60"
              title="Choose a Nutrient slash skill, or type the slash command manually."
            >
              {SKILL_MODE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.command} {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-zinc-700">
            {isLoading
              ? selectedPipeline === "deep" ? "Deep is thinking…" : "AI is building…"
              : selectedPipeline === "deep"
              ? "Web SDK-first · No hallucinated APIs"
              : "Describe any Nutrient product, workflow, SDK demo, or fix"}
          </span>
          {messages.length > 0 && (
            <button
              onClick={resetToTemplate}
              className="flex items-center gap-1 text-[11px] text-zinc-700 hover:text-zinc-400 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>

        <div className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Build smart extraction, make a form approval system, fix zoom, create a Web SDK viewer…"
            className={cn(
              "pr-10 min-h-[72px] max-h-[160px] text-xs resize-none",
              "bg-[#211a1a] border-[#332b2b] text-zinc-200 placeholder:text-zinc-700",
              "focus:border-zinc-600 focus:ring-0 rounded-lg"
            )}
            disabled={isLoading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className={cn(
              "absolute right-2 bottom-2 flex h-6 w-6 items-center justify-center rounded-md transition-all",
              input.trim() && !isLoading
                ? "bg-[#c4a882] text-[#1a1414]"
                : "bg-[#2a2222] text-zinc-700 cursor-not-allowed"
            )}
          >
            <Send className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onPromptSelect, template, pipeline }: {
  onPromptSelect: (p: string, pipelineOverride?: PipelineType) => void;
  template?: Template | null;
  pipeline?: PipelineType;
}) {
  const isDeep = pipeline === "deep";
  const prompts = isDeep
    ? DEEP_QUICK_PROMPTS
    : (template?.id ? TEMPLATE_QUICK_PROMPTS[template.id] : null) ?? DEFAULT_QUICK_PROMPTS;
  return (
    <div className="py-4 space-y-5">
      <div className="space-y-2 px-0.5">
        <div className="flex items-center gap-2">
          <span
            style={{
              fontFamily: "'Satoshi', var(--font-geist-sans), sans-serif",
              fontSize: 28,
              fontWeight: 700,
              color: "#f4f4f5",
              letterSpacing: "-0.03em",
              lineHeight: 1,
            }}
          >
            Nucode
          </span>
          {isDeep && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                background: "#130f0f",
                border: "1px solid #2a2020",
                borderRadius: 4,
                padding: "2px 7px",
                fontSize: 9,
                fontWeight: 600,
                color: "#6b5050",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                lineHeight: "14px",
              }}
            >
              deep
            </span>
          )}
        </div>
        <p className="text-[11px] leading-relaxed" style={{ color: "#5a4040", maxWidth: 240 }}>
          {isDeep
            ? "Live Nutrient SDK expert — customize toolbars, wire annotations, draw tools, redaction, export, and event listeners against the real Web SDK API."
            : "Describe a workflow, SDK integration, or fix - Nucode builds it with Nutrient."}
        </p>
      </div>

      <div className="space-y-1">
        <p className="text-[10px] font-semibold text-zinc-700 uppercase tracking-widest px-0.5 mb-2">
          {isDeep ? "SDK manipulation starters" : "Quick starters"}
        </p>
        {prompts.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onPromptSelect(prompt)}
            className={cn(
              "w-full text-left text-[11px] text-zinc-600 hover:text-zinc-300",
              "rounded-md border border-[#2a2222] hover:border-[#3a3030]",
              "bg-transparent hover:bg-white/3 px-3 py-2 transition-all duration-100"
            )}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

interface LiveActivity { reading: string[]; writing: string[]; phase: StreamPhase; plan: string; buildPhase: BuildPhase }

function MessageBubble({
  message,
  isLast,
  liveActivity,
}: {
  message: AIMessage & { patchedFiles?: string[] };
  isLast: boolean;
  liveActivity?: LiveActivity;
}) {
  const isUser = message.role === "user";
  const isWorking = !isUser && (message.content === "working" || message.content === "working:retry");

  return (
    <motion.div
      initial={isLast ? { opacity: 0, y: 6 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={cn("flex flex-col gap-1.5", isUser ? "items-end" : "items-start")}
    >
      <div
        className={cn(
          "max-w-[90%] rounded-xl text-[12px] leading-relaxed",
          isUser
            ? "bg-[#211a1a] border border-[#332b2b] text-zinc-300 rounded-br-sm px-3.5 py-2.5"
            : "bg-[#211a1a] border border-[#332b2b] text-zinc-300 rounded-bl-sm",
          isWorking && "p-3 w-full max-w-full"
        )}
      >
        {isWorking ? (
          <WorkingState
            activity={liveActivity}
            isRetry={message.content === "working:retry"}
          />
        ) : (
          <span className="whitespace-pre-wrap px-3.5 py-2.5 block">{message.content}</span>
        )}
      </div>

      {!isUser && message.patchedFiles && message.patchedFiles.length > 0 && (
        <div className="flex flex-wrap gap-1 max-w-[90%]">
          {message.patchedFiles.map((path: string) => (
            <span
              key={path}
              className="inline-flex items-center gap-1 text-[10px] text-emerald-500 bg-emerald-500/8 border border-emerald-500/20 rounded px-1.5 py-0.5 font-mono"
            >
              <FileDiff className="h-2.5 w-2.5" />
              {path}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

const PHASE_LABELS: Record<StreamPhase, string> = {
  thinking: "Planning architecture…",
  writing: "Building repository files…",
  done: "Done",
};

type TaskStatus = "done" | "active" | "pending";

interface GenerationTask {
  label: string;
  detail: string;
  status: TaskStatus;
}

function taskStatus(done: boolean, active: boolean): TaskStatus {
  if (done) return "done";
  return active ? "active" : "pending";
}

function buildSpecializedTasks(buildPhase: BuildPhase, writing: string[], plan: string): GenerationTask[] | null {
  if (buildPhase === "classifying") {
    return [
      { label: "Analyzing your request", detail: plan || "Choosing the best pipeline for this task", status: "active" },
      { label: "Routing to pipeline", detail: "light / full-build / deep", status: "pending" },
    ];
  }
  if (buildPhase === "deep") {
    return [
      { label: "Deep", detail: plan || "Consulting full Nutrient knowledge base - SDK APIs, products, and documentation", status: "active" },
    ];
  }
  return null;
}

function buildGenerationTasks({
  phase,
  reading,
  writing,
  plan,
  buildPhase,
}: {
  phase: StreamPhase;
  reading: string[];
  writing: string[];
  plan: string;
  buildPhase: BuildPhase;
}): GenerationTask[] {
  // Specialized pipelines get their own simplified task list
  const specialized = buildSpecializedTasks(buildPhase, writing, plan);
  if (specialized) return specialized;

  // Full-build progress is driven directly by the pipeline phase, not by which
  // specific file paths happen to appear in the stream. Each phase finishes when
  // the agent moves to the next.
  const fileCount = writing.length;
  const filePreview = fileCount > 0 ? writing.slice(-3).join(", ") : "";
  const steps: { label: string; detail: string; done: boolean }[] = [
    {
      label: "Planning project roadmap",
      detail: plan || "Picking brand, palette, navigation pattern, and Nutrient integration",
      done: buildPhase !== "idle" && buildPhase !== "classifying" && buildPhase !== "roadmap",
    },
    {
      label: "Designing visual system",
      detail: "Generating the CSS design system (palette + typography + layout)",
      done: buildPhase === "build",
    },
    {
      label: "Generating source files",
      detail: fileCount > 0
        ? `${fileCount} file${fileCount === 1 ? "" : "s"} written - latest: ${filePreview}`
        : "Writing components, pages, hooks, data, and types",
      done: buildPhase === "build" && phase === "done",
    },
    {
      label: "Finalizing & applying patches",
      detail: "Validating, applying file_patches to the workspace, updating NUTRIENTWEBBUILDER.md",
      done: phase === "done",
    },
  ];

  // Sequential: first undone step = active, before it = done, after = pending
  let activeFound = false;
  return steps.map((step) => {
    if (step.done) return { label: step.label, detail: step.detail, status: "done" as TaskStatus };
    if (!activeFound) {
      activeFound = true;
      return { label: step.label, detail: step.detail, status: "active" as TaskStatus };
    }
    return { label: step.label, detail: step.detail, status: "pending" as TaskStatus };
  });
}

function WorkingState({ activity, isRetry }: { activity?: LiveActivity; isRetry?: boolean }) {
  const phase = activity?.phase ?? "thinking";
  const writing = activity?.writing ?? [];
  const reading = activity?.reading ?? [];
  const plan = activity?.plan ?? "";
  const buildPhase = activity?.buildPhase ?? "idle";
  const tasks = buildGenerationTasks({ phase, reading, writing, plan, buildPhase });
  const activeTask = tasks.find((task) => task.status === "active");

  const visibleReading = reading.slice(0, 6);
  const currentFile = writing[writing.length - 1];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-zinc-500 block"
              initial={{ opacity: 0.25, y: 0 }}
              animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
              transition={{ duration: 0.85, repeat: Infinity, delay: i * 0.16, ease: "easeInOut" }}
            />
          ))}
        </span>
        <span className="text-[11px] text-zinc-400 font-medium">
          {isRetry ? "Retrying with full repository build…" : PHASE_LABELS[phase]}
        </span>
      </div>

      {activeTask && (
        <p className="text-[11px] text-zinc-500">{activeTask.label}</p>
      )}

      {plan && (
        <p className="rounded-md border border-[#2a2222] bg-[#1a1414] px-2.5 py-1.5 text-[10px] text-zinc-500">
          {plan}
        </p>
      )}

      <div className="rounded-lg border border-[#2a2222] bg-[#1a1414] p-2.5">
        <p className="mb-2 text-[9px] font-semibold uppercase tracking-widest text-zinc-600">
          Generation tasks
        </p>
        <div className="space-y-1.5">
          {tasks.map((task) => (
            <div key={task.label} className="grid grid-cols-[14px_1fr] gap-2">
              {task.status === "active" ? (
                <motion.span
                  className="mt-0.5 h-2.5 w-2.5 rounded-full border border-sky-400 bg-sky-400/40 block"
                  initial={{ opacity: 0.5, scale: 0.8 }}
                  animate={{ opacity: [0.5, 1, 0.5], scale: [0.8, 1.15, 0.8] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                />
              ) : (
                <span
                  className={cn(
                    "mt-0.5 h-2.5 w-2.5 rounded-full border block",
                    task.status === "done" && "border-emerald-500/60 bg-emerald-500/50",
                    task.status === "pending" && "border-zinc-700 bg-transparent"
                  )}
                />
              )}
              <div className="min-w-0">
                <p className={cn(
                  "text-[10px] leading-none",
                  task.status === "active" && "text-sky-400 font-medium",
                  task.status === "done" && "text-zinc-400",
                  task.status === "pending" && "text-zinc-700"
                )}>
                  {task.label}
                </p>
                <p className="mt-1 truncate text-[9px] text-zinc-600">{task.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {reading.length > 0 && (
        <div className="rounded-lg border border-[#2a2222] bg-[#1a1414] p-2.5">
          <p className="mb-1.5 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-widest text-zinc-600">
            <Eye className="h-3 w-3" />
            Reading context
          </p>
          <div className="space-y-1">
            {visibleReading.map((f) => (
              <div key={f} className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                <span className="h-1 w-1 rounded-full bg-sky-500/70" />
                <span className="truncate">{f}</span>
              </div>
            ))}
            {reading.length > visibleReading.length && (
              <p className="text-[10px] text-zinc-700 pl-2">+{reading.length - visibleReading.length} more</p>
            )}
          </div>
        </div>
      )}

      {writing.length > 0 && (
        <div className="rounded-lg border border-[#2a2222] bg-[#1a1414] p-2.5">
          <p className="mb-1.5 text-[9px] text-zinc-600 uppercase tracking-widest font-semibold">
            Creating and updating files
          </p>
          {currentFile && (
            <p className="mb-1.5 truncate text-[10px] text-zinc-500 font-mono">
              Current: {currentFile}
            </p>
          )}
          <div className="space-y-1">
            <AnimatePresence initial={false}>
              {writing.map((f) => {
                const isNewSurfaceFile =
                  f.startsWith("src/pages/") ||
                  f.startsWith("src/layouts/") ||
                  f.startsWith("src/components/") ||
                  f.startsWith("src/data/") ||
                  f.startsWith("src/hooks/") ||
                  f.startsWith("src/services/") ||
                  f.startsWith("src/store/") ||
                  f.startsWith("src/types/") ||
                  f.startsWith("src/utils/") ||
                  f === "NUTRIENTWEBBUILDER.md";
                return (
                  <motion.div
                    key={f}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-1.5 text-[10px] font-mono"
                  >
                    {isNewSurfaceFile ? (
                      <FilePlus className="h-2.5 w-2.5 shrink-0 text-sky-400" />
                    ) : (
                      <Pencil className="h-2.5 w-2.5 shrink-0 text-amber-400" />
                    )}
                    <span className={cn("w-12 shrink-0 text-[9px] uppercase tracking-wider", isNewSurfaceFile ? "text-sky-500" : "text-amber-500")}>
                      {isNewSurfaceFile ? "Create" : "Update"}
                    </span>
                    <span className={cn("truncate", isNewSurfaceFile ? "text-sky-400" : "text-amber-400")}>{f}</span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {phase === "thinking" && reading.length === 0 && (
        <p className="text-[11px] text-zinc-700">Sending request to AI…</p>
      )}
    </div>
  );
}
