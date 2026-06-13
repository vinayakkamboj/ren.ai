import type { Template, ProjectFile, AIPatchPlan } from "@/types";
import { diagnoseImportExportMismatch } from "@/features/ai/validators";
import { buildContextPack, formatContextPackForPrompt } from "@/features/ai/repository-intelligence";
import {
  NUTRIENT_WEB_DEMO_DOCUMENT_URL,
  NUTRIENT_WEB_SDK_DEPENDENCY,
  NUTRIENT_WEB_SDK_PACKAGE,
  NUTRIENT_WEB_SDK_VERSION,
} from "@/lib/nutrient/sdk-version";

// Injected into every build/edit prompt so Claude always knows the exact stack.
// Keep in sync with lib/project-files/base-template.ts and SandpackPreview STANDARD_DEPS.
export const STACK_FINGERPRINT = `TECH STACK — authoritative reference, do not deviate:

FILE EXTENSIONS (strict):
  .tsx  →  any file that contains JSX: App.tsx, pages/*, components/*, layouts/*
  .ts   →  no JSX: lib/utils.ts, data/mockData.ts, types/index.ts, hooks/use*.ts, services/*.ts
  NEVER use .jsx or .js — this is a TypeScript-only project.

RUNTIME: React 18 + Vite inside Sandpack (in-browser bundler). No Node.js APIs. No fs, path, etc.

STYLING — shadcn/ui-compatible system (same as host app):
  Tailwind v3 via Play CDN in index.html. Use utility classes freely in JSX.
  In CSS files: plain selectors + :root vars ONLY. NEVER @tailwind / @apply / @layer / & nesting.
  Tokens are HSL space-separated (e.g. --primary: 170 82% 39%) — reference as hsl(var(--token)).
  Opacity modifiers work: bg-primary/10, text-foreground/80, border-border/50.

DESIGN TOKENS → TAILWIND CLASSES:
  --background        →  bg-background        text: text-foreground
  --card              →  bg-card              text: text-card-foreground
  --primary           →  bg-primary           text on it: text-primary-foreground
  --secondary         →  bg-secondary         text: text-secondary-foreground
  --muted             →  bg-muted             text: text-muted-foreground
  --accent            →  bg-accent            text: text-accent-foreground
  --destructive       →  bg-destructive       text: text-destructive-foreground
  --border            →  border-border
  --input             →  border-input / bg-input
  --ring              →  ring-ring (focus rings)
  --success           →  bg-success  text-success
  --warning           →  bg-warning  text-warning
  --radius            →  rounded-lg (= var(--radius)), rounded-md (radius-2px), rounded-sm (radius-4px)

COMPONENT PATTERNS (mirror host app):
  Variants: plain Record<string, string> objects mapping variant names → Tailwind class strings.
  Do NOT use the cva() function for variants — use a simple object + cn() lookup instead.
  Compose Radix UI primitives with Tailwind classes, never style them inline.
  Example Button variant record:
    const variants = { default:"bg-primary text-primary-foreground hover:bg-primary/90", ghost:"hover:bg-secondary hover:text-foreground" }

PRE-INSTALLED PACKAGES (import directly, never edit package.json for these):
  lucide-react · framer-motion · date-fns · recharts
  clsx + tailwind-merge  →  import { cn } from "./lib/utils"  (or "../lib/utils" from components/)
  class-variance-authority (available but prefer plain Record variants)
  @radix-ui/react-accordion  @radix-ui/react-alert-dialog  @radix-ui/react-avatar
  @radix-ui/react-checkbox   @radix-ui/react-collapsible   @radix-ui/react-dialog
  @radix-ui/react-dropdown-menu  @radix-ui/react-label  @radix-ui/react-popover
  @radix-ui/react-progress   @radix-ui/react-radio-group   @radix-ui/react-scroll-area
  @radix-ui/react-select     @radix-ui/react-separator     @radix-ui/react-slot
  @radix-ui/react-switch     @radix-ui/react-tabs          @radix-ui/react-tooltip

NUTRIENT SDK: import { NutrientViewer } from "./NutrientViewer"  — NEVER from npm or CDN.
PATH ALIAS: @/ = project root. From src/components/ use relative imports: ../lib/utils

NUTRIENT VIEWER HEIGHT (critical — SDK will fail to mount without it):
  The container wrapping <NutrientViewer> MUST have an explicit height. Options:
    GOOD: <div className="viewer-mount"><NutrientViewer .../></div>          (uses .viewer-mount CSS: height:100%)
    GOOD: <div className="h-[600px] w-full relative overflow-hidden"><NutrientViewer .../></div>
    GOOD: <div style={{height:"600px",width:"100%",position:"relative"}}><NutrientViewer .../></div>
    BAD:  <div className="p-4"><NutrientViewer .../></div>                   (no height → SDK crash!)
    BAD:  <div className="flex flex-col"><NutrientViewer .../></div>         (flex without height → crash!)
  When in a flex layout, ensure the flex parent has h-full or an explicit height, and the viewer div has flex-1.

KNOWN CRASH PATTERNS — every one of these will break the preview:

  1. TRUNCATED App.tsx → "Loading App…" stub
     App.tsx gets replaced with a blank stub if it has unbalanced braces (truncated output).
     ALWAYS keep App.tsx under 80 lines — a thin router only:
       import Navbar + page components → track currentPage with useState → render matching page.
     Put ALL page content in src/pages/PageName.tsx. Put navbar in src/components/Navbar.tsx.
     NEVER inline page sections inside App.tsx.

  2. MISSING IMPORT TARGET → "Loading ComponentName…" stub
     If you write \`import { Foo } from "./components/Foo"\` but do NOT include src/components/Foo.tsx
     in the file_patches, Sandpack stubs it as "Loading Foo…".
     Rule: every relative import must have a matching file in the same file_patches block.

  3. CSS CRASH → "CssSyntaxError: Unknown word"
     Sandpack's PostCSS does NOT support @tailwind, @apply, @layer, or & nesting.
     In src/index.css: plain selectors + :root vars ONLY. Use hsl(var(--token)) in CSS.
     Use Tailwind utility classes in JSX, never @apply in CSS.

  4. useState ARRAY CRASH → "Cannot read properties of undefined"
     Always initialise: useState<Item[]>([])  — NEVER useState<Item[]>() without the [].

  5. FILE TOO LONG → truncation mid-brace
     Keep each file under 120 lines. If a component is growing large, split it into
     sub-components in separate files rather than continuing in one long file.`;

function extractDesignTokens(files: ProjectFile[]): string {
  const css = files.find((f) => f.path === "src/index.css")?.content ?? "";
  const block = css.match(/:root[^{]*\{([^}]+)\}/)?.[1] ?? "";
  const vars = block.match(/--[\w-]+\s*:\s*[^;]+;/g) ?? [];
  return vars.map((v) => `  ${v.trim()}`).join("\n");
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

interface CrashFrame {
  functionName: string;
  path: string;
  line: number;
  column: number;
}

interface RuntimeBugDossier {
  error: string;
  topFrame: CrashFrame | null;
  failingExpression: string | null;
  relatedFiles: string[];
  recentChanges: string[];
  markdown: string;
}

const ARRAY_METHOD_RE = "\\.(map|filter|reduce|forEach|find|some|every|flatMap|flat|sort|slice|join)\\s*\\(";

function parseCrashFrames(runtimeErrors: string[]): CrashFrame[] {
  const frames: CrashFrame[] = [];
  for (const err of runtimeErrors) {
    const re = /at\s+([^\s(]+).*?\/src\/([^):]+):(\d+):(\d+)/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(err)) !== null) {
      frames.push({
        functionName: match[1],
        path: `src/${match[2]}`,
        line: Number(match[3]),
        column: Number(match[4]),
      });
    }
  }
  return frames;
}

function resolveRelativeImport(fromPath: string, spec: string, projectFiles: ProjectFile[]): string | null {
  if (!spec.startsWith(".")) return null;
  const fromParts = fromPath.split("/");
  fromParts.pop();
  const parts = [...fromParts, ...spec.split("/")];
  const normalized: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") normalized.pop();
    else normalized.push(part);
  }
  const base = normalized.join("/");
  const candidates = /\.(tsx?|jsx?|css|json)$/.test(base)
    ? [base]
    : [`${base}.tsx`, `${base}.ts`, `${base}.jsx`, `${base}.js`, `${base}/index.tsx`, `${base}/index.ts`];
  return candidates.find((candidate) => projectFiles.some((file) => file.path === candidate)) ?? null;
}

function extractLocalImportTargets(file: ProjectFile, projectFiles: ProjectFile[]): string[] {
  const targets = new Set<string>();
  const re = /(?:from\s+|import\s*\(\s*|import\s+)["'](\.[^"']+)["']/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(file.content)) !== null) {
    const resolved = resolveRelativeImport(file.path, match[1], projectFiles);
    if (resolved) targets.add(resolved);
  }
  return Array.from(targets);
}

function domainTokensFromPath(path: string): string[] {
  const base = path.split("/").pop()?.replace(/\.(tsx?|jsx?)$/, "") ?? "";
  const split = base
    .replace(/^use/, "")
    .replace(/(Page|Panel|View|Service|Store|Hook|List|Table|Card|Details|Detail)$/i, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4);
  const expanded = new Set(split);
  for (const token of split) {
    if (token.endsWith("s") && token.length > 4) expanded.add(token.slice(0, -1));
    else expanded.add(`${token}s`);
  }
  return Array.from(expanded);
}

function findFailingExpression(file: ProjectFile | undefined, frame: CrashFrame | null): string | null {
  if (!file || !frame) return null;
  const line = file.content.split("\n")[frame.line - 1]?.trim();
  if (!line) return null;
  const methodMatch = line.match(new RegExp(`([A-Za-z_$][\\w$]*(?:\\?\\.|\\.|\\[[^\\]]+\\]|[A-Za-z_$][\\w$]*)*)${ARRAY_METHOD_RE}`));
  if (methodMatch) return `${methodMatch[1]}.${methodMatch[2]}(...)`;
  return line.slice(0, 220);
}

function buildRuntimeBugDossier(
  projectFiles: ProjectFile[],
  runtimeErrors: string[],
  recentChangedPaths: string[] = []
): RuntimeBugDossier {
  const realErrors = runtimeErrors.filter((e) => e.includes("Error") || e.includes("Uncaught"));
  const error = realErrors[0]?.split("\n")[0]?.trim() || runtimeErrors[0]?.split("\n")[0]?.trim() || "Unknown runtime error";
  const frames = parseCrashFrames(runtimeErrors);
  const topFrame = frames.find((frame) => projectFiles.some((file) => file.path === frame.path)) ?? null;
  const fileMap = new Map(projectFiles.map((file) => [file.path, file]));
  const related = new Set<string>();

  for (const path of ["NUTRIENTWEBBUILDER.md", "src/App.tsx"]) {
    if (fileMap.has(path)) related.add(path);
  }
  for (const frame of frames.slice(0, 4)) {
    if (fileMap.has(frame.path)) related.add(frame.path);
  }
  for (const path of recentChangedPaths) {
    if (fileMap.has(path)) related.add(path);
  }

  const seedPaths = Array.from(related);
  for (const path of seedPaths) {
    const file = fileMap.get(path);
    if (!file) continue;
    for (const imported of extractLocalImportTargets(file, projectFiles)) related.add(imported);
  }

  const tokens = new Set(seedPaths.flatMap(domainTokensFromPath));
  for (const file of projectFiles) {
    if (!file.path.startsWith("src/")) continue;
    if (!/(hooks|services|store|data|types|pages|components)\//.test(file.path)) continue;
    const haystack = `${file.path}\n${file.content.slice(0, 1200)}`.toLowerCase();
    if (Array.from(tokens).some((token) => haystack.includes(token))) related.add(file.path);
  }

  if (fileMap.has("src/NutrientViewer.tsx") && runtimeErrors.some((e) => /Nutrient|viewer|pdf|wasm/i.test(e))) {
    related.add("src/NutrientViewer.tsx");
  }

  const relatedFiles = Array.from(related)
    .filter((path) => fileMap.has(path))
    .sort((a, b) => projectContextPriority(a).localeCompare(projectContextPriority(b)))
    .slice(0, 16);

  const failingExpression = findFailingExpression(topFrame ? fileMap.get(topFrame.path) : undefined, topFrame);
  const dossierJson = {
    error,
    topFrame,
    failingExpression,
    relatedFiles,
    recentChanges: recentChangedPaths.filter((path) => fileMap.has(path)),
  };

  const filesSection = relatedFiles
    .map((path) => {
      const file = fileMap.get(path)!;
      const lines = file.content.split("\n");
      const maxLines = path === topFrame?.path ? 220 : 160;
      const preview = lines.slice(0, maxLines).join("\n");
      const truncated = lines.length > maxLines ? `\n// ... (${lines.length - maxLines} more lines)` : "";
      return `### ${path}\n\`\`\`\n${preview}${truncated}\n\`\`\``;
    })
    .join("\n\n");

  return {
    error,
    topFrame,
    failingExpression,
    relatedFiles,
    recentChanges: dossierJson.recentChanges,
    markdown: [
      "## Runtime Bug Dossier",
      "```json",
      JSON.stringify(dossierJson, null, 2),
      "```",
      filesSection ? `## Dossier Files\n\n${filesSection}` : "",
    ].filter(Boolean).join("\n\n"),
  };
}

function formatCandidatePatchPlan(patchPlan: AIPatchPlan | null | undefined): string {
  if (!patchPlan?.changes?.length && !patchPlan?.deletes?.length && !patchPlan?.renames?.length) {
    return "No candidate patch plan was provided.";
  }
  const changes = (patchPlan.changes ?? [])
    .map((change) => {
      const lines = change.content.split("\n");
      const preview = lines.slice(0, 260).join("\n");
      const truncated = lines.length > 260 ? `\n// ... (${lines.length - 260} more lines)` : "";
      return `### ${change.path}\n\`\`\`\n${preview}${truncated}\n\`\`\``;
    })
    .join("\n\n");
  const deletes = patchPlan.deletes?.length ? `\n\nDeletes: ${patchPlan.deletes.join(", ")}` : "";
  const renames = patchPlan.renames?.length
    ? `\n\nRenames: ${patchPlan.renames.map((r) => `${r.from} -> ${r.to}`).join(", ")}`
    : "";
  return [`Plan: ${patchPlan.plan || "candidate changes"}`, changes, deletes, renames].filter(Boolean).join("\n\n");
}

function summarizeProjectForPlanning(files: ProjectFile[]): string {
  if (!files.length) return "No existing project files were provided.";

  const repositoryContext = formatContextPackForPrompt(
    buildContextPack("Plan the next app architecture from the current repository.", files, { maxFiles: 12 })
  );
  const sortedFiles = [...files].sort((a, b) =>
    projectContextPriority(a.path).localeCompare(projectContextPriority(b.path))
  );
  const fileTree = sortedFiles.map((file) => `- ${file.path}`).join("\n");
  const designTokens = extractDesignTokens(files);
  const memory = files.find((file) => file.path === "NUTRIENTWEBBUILDER.md")?.content?.trim();
  const appSource = files.find((file) => file.path === "src/App.tsx")?.content?.trim();
  const appSummary = appSource
    ? appSource
        .split("\n")
        .slice(0, 80)
        .join("\n")
    : "";

  return [
    repositoryContext,
    `Existing file tree (${sortedFiles.length} files):\n${fileTree}`,
    designTokens
      ? `Existing design tokens from src/index.css:\n${designTokens}`
      : "No existing CSS design tokens were detected.",
    memory
      ? `Current NUTRIENTWEBBUILDER.md excerpt:\n${memory.slice(0, 4500)}${memory.length > 4500 ? "\n...truncated" : ""}`
      : "No workspace NUTRIENTWEBBUILDER.md was detected.",
    appSummary
      ? `Current src/App.tsx opening excerpt:\n\`\`\`tsx\n${appSummary}\n\`\`\``
      : "No src/App.tsx context was detected.",
  ].join("\n\n");
}

export function buildPlanningPrompt(userRequest: string, projectFiles: ProjectFile[] = []): string {
  const projectSummary = summarizeProjectForPlanning(projectFiles);

  return `You are a senior product architect and world-class product designer for Nutrient Demo Studio. Your job: create a precise, opinionated, context-aware project plan for this build request.

USER REQUEST: "${userRequest}"

PROJECT CONTEXT:
${projectSummary}

Pick REAL, SPECIFIC values — actual brand names, exact hex colors, real component names, exact routes/files. No placeholders.

Design quality bar:
- Plan like the world's best product designer. The first version must already feel premium, intentional, and specific to this product — not a generic SaaS template.
- Use a disciplined two-color product palette: one neutral foundation (background/surface/text/border) plus one intentional accent family. Do not add multiple competing accents.
- Choose the best font for the product from Plus Jakarta Sans, Manrope, DM Sans, Space Grotesk, Outfit, Sora, or Inter. Do not default to the same font across projects.
- Buttons must look deliberate: primary buttons use the accent with readable foreground contrast; secondary/ghost buttons stay neutral and never introduce random colors.
- Default to light theme with strong hierarchy, readable density, clear spacing, and purposeful states.
- Avoid generic blue SaaS chrome, decorative gradients, noisy cards, and repeated top-nav dashboard layouts.
- Make the chosen shell fit the workflow: split workbench, sidebar, command center, stepper, viewer workspace, or portal home.
- Keep the plan compact so the build can start fast; do not over-plan unrelated pages.

Design source order:
1. User-provided brand, color, layout, typography, or design direction wins — ALWAYS. Scan the entire user request for ANY color name, hex value, theme mood ("dark", "minimal", "premium", "playful"), layout ("sidebar", "split", "dashboard"), or visual style. If found, set \`design.source\` to "user-specified" and populate those fields. Do not substitute or override with industry defaults.
2. Existing \`NUTRIENTWEBBUILDER.md\` and \`src/index.css\` design tokens win for change/fix requests unless the user asks to redesign.
3. Invent an original palette when the user gives no design direction — do NOT fall back to generic presets.

Original palette rule — design from scratch for each product:
- Think about what emotional register fits this product: calm authority, kinetic energy, clinical precision, warm approachability, premium gravitas.
- Pick a background hue that reflects that register: warm off-white for organic/earthy products, cool white for technical/clinical, stone for enterprise, deep dark for premium/high-contrast.
- Pick ONE accent color that is meaningful and specific to this product — not a random color picker result. The accent should feel like it was chosen by a senior brand designer who understands this industry.
- Do NOT fall back to generic blue/cyan as the default — it is the most overused color in SaaS design. Choose something with character.
- Derive the full palette from the accent: surface = slightly warmer/cooler than bg; border = hue-tinted low-opacity; text-muted = hue-tinted mid-range; shadow = hue-tinted.
- For dark mode: use a deep hue-tinted dark (not pure black), and make the accent the lighter/brighter version of the light-mode accent.

Layout options (pick ONE that fits):
- "operations" — sticky top nav + content area with filter bar + dense data table + slide-in detail drawer (logistics, claims, field ops, supply chain)
- "split" — narrow list panel (280-320px) left + content/viewer panel right (document review, legal, medical records, compliance)
- "dashboard" — top nav + metric-grid row + wide data table below (analytics, admin, finance dashboards)
- "workspace" — top toolbar strip + full-height viewer/editor area (SDK demos, redaction tools, annotation workspace)
- "approval" — centered stepper/queue + action panel (form approvals, onboarding flows)
- "sidebar" — fixed 220px sidebar + main content scrollable area (CRM, settings-heavy products)

Navigation/shell patterns (pick ONE; do not always use top navbar):
- "left-sidebar" — persistent vertical nav, ideal for CRM, admin, settings-heavy, internal tools
- "split-workbench" — left queue/list + right detail/document workbench, ideal for review/extraction/legal/medical
- "top-command" — compact top command bar + dense table/work area, ideal for operations/control rooms
- "stepper-flow" — approval/intake wizard with queue and current step, ideal for forms/signatures/onboarding
- "viewer-workspace" — toolbar + full-height viewer/editor with side inspector, ideal for SDK demos
- "portal-home" — product home with section nav lower on page, ideal for customer portals and websites

Architecture rule:
- If the existing project already has pages/layouts/hooks/services/data/types, extend that architecture instead of inventing a different shape.
- If this is a full app/product request, plan a multi-file repository with pages, layouts, components, state/hooks/services, data, types, and memory.
- If the request is a split workbench, review queue, focused assistant, form flow, extraction flow, or SDK lab, plan a focused workflow repository. Do not inflate it into a full multi-page SaaS product unless the user asks for app/platform/portal/dashboard/site.
- If this is a focused SDK/workflow/backend request, plan the smallest complete repository that satisfies it.
- If this is a fix/change request, plan the smallest correct change and preserve architecture/design.

Output ONLY a <project_plan> JSON block. Zero other text.

BRAND NAME RULE: Invent an ORIGINAL, FRESH brand name from the user request, industry vocabulary, and product workflow. Do NOT use generic suffix-based SaaS names, including names with "Flow", "Hub", "Core", "Desk", "Vault", "Path", "Track", or "Ledger" suffixes unless the user explicitly asked. Do not use \`BuildTrack\`, \`BuildFlow\`, \`BuildHub\`, \`BuildCore\`, \`ConstructTrack\`, \`ConstructHub\`, \`SiteFlow\`, \`SiteCore\`, or \`ProjectTrack\`. Do not copy brand names from any prompt examples, previous projects, templates, or workspace memory unless the user supplied that exact brand. The name should feel specific to this product, not recycled.

FILE LIST RULE — SMALL BY DEFAULT, SCALE ONLY WHEN JUSTIFIED:

**Default target: 4–6 files.** This is the right size for the vast majority of requests. A small working app is worth ten times more than a large broken one.

The minimum set (always required):
- \`src/App.tsx\` — root composition, page state, nav
- \`src/index.css\` — design tokens + all component classes
- \`src/data/mockData.ts\` — typed realistic records
- \`NUTRIENTWEBBUILDER.md\` — workspace memory

Add files ONLY when the request genuinely cannot work without them:
- A second page component: only if the user explicitly asked for two distinct navigable screens.
- \`src/components/ui.tsx\`: only if you need 3+ reusable atoms shared across multiple files.
- \`src/hooks/\` or \`src/services/\`: only when state logic is too complex to live in App.tsx or a page.
- \`src/store/\`: only for state shared across 3+ pages.
- **Never** create \`src/types/\` as a separate file — inline types in the file that uses them.
- **Never** create \`src/layouts/\` unless there are 3+ pages that all share the same shell.

Hard constraint: **whatever you plan, generate ALL of it in one response.** If the total exceeds ~20 000 output tokens, consolidate BEFORE finalizing — merge components, inline types, combine small files. Never plan a file you won't generate.

Consolidation rules (mandatory, not optional):
- Reusable atoms (Button, Badge, Spinner, EmptyState) → one file: \`src/components/ui.tsx\`
- Types for a single domain → inline in \`src/data/mockData.ts\`
- Nav + layout → inline in \`src/App.tsx\` for 1–2 page apps
- Page-local sub-components → define at the bottom of the page file, not a separate import

CONTENT DENSITY RULE — EACH PLANNED PAGE MUST HAVE REAL SECTIONS:

Each page in the \`pages\` array must list the concrete content sections it renders. Use these as reference:
- **Dashboard/Home**: header-with-action, metric-tiles, activity-feed, key-data-table
- **Workflow page**: filter-bar, dense-data-table, detail-drawer-on-row-click
- **Document review**: split-layout-queue-left-viewer-right, review-actions-panel
- **Approval/Stepper**: stepper-indicator, current-stage-form, action-buttons
- **SDK demo**: toolbar, full-height viewer/editor, inspector panel

<project_plan>
{
  "brand": {
    "name": "ORIGINAL FRESH NAME — not a generic suffix-based SaaS name. Surprise the user.",
    "tagline": "SHORT PRODUCT TAGLINE",
    "initials": "2 LETTER LOGO derived from the name",
    "industry": "logistics|healthcare|legal|finance|hr|real-estate|construction|insurance|tech"
  },
  "design": {
    "source": "user-specified|existing-project|industry-inferred",
    "paletteName": "YOUR ORIGINAL DESCRIPTIVE NAME — e.g. 'Warm Slate', 'Forest Teal', 'Plum Dusk', 'Ember Rust', 'Rose Ash', 'Deep Indigo'. Must be specific to this product.",
    "accent": "#EXACT HEX — original, intentional, fitting the product's emotional register. NOT generic blue unless user asked.",
    "accentLight": "#LIGHTER ACCENT HEX for hover/tints",
    "accentDark": "#DARK MODE ACCENT HEX (lighter/brighter version of accent)",
    "base": "#BACKGROUND HEX — warm/cool/neutral tinted white or deep dark for dark mode",
    "surface": "#SURFACE HEX — slightly warmer/cooler than base",
    "text": "#TEXT HEX — very dark, hue-tinted",
    "fontFamily": "BEST GOOGLE FONT FOR THIS PRODUCT — choose from the product voice, do not always use the same font",
    "fontReason": "One sentence explaining why the font matches this product",
    "paletteFormula": "one neutral foundation plus one accent family; no extra accent colors",
    "designBrief": "One concrete sentence describing visual hierarchy, density, spacing, and product feel",
    "layout": "operations|split|dashboard|workspace|approval|sidebar",
    "navigationPattern": "left-sidebar|split-workbench|top-command|stepper-flow|viewer-workspace|portal-home",
    "layoutSignature": "Specific structural signature that makes this app visually different from generic top-nav dashboards",
    "layoutReason": "One sentence why this layout fits this product",
    "avoid": ["specific visual mistakes to avoid, including blue default if relevant"]
  },
  "architecture": {
    "scope": "targeted-fix|focused-sdk|focused-workflow|backend-pipeline|full-product",
    "fileStrategy": "extend existing files|create new scalable tree|focused compact tree",
    "stateModel": "How state/actions will work",
    "routingModel": "How navigation/pages will work",
    "dataPersistence": "local state|localStorage|IndexedDB|Supabase client with local fallback|backend service",
    "reasoning": "Why this architecture fits the request and existing project"
  },
  "pages": [
    {
      "component": "HomePage",
      "nav": "Home",
      "desc": "Marketing-rich landing — visitors see the brand, the pitch, the proof, the CTA. Feels like a real product website front.",
      "sections": ["nav-with-cta", "hero-with-headline-subheadline-primary-secondary-cta-visual", "stat-strip-4-metrics", "feature-grid-6-cards-with-icon-title-description", "workflow-highlight-with-product-illustration", "social-proof-strip-with-logos-and-testimonial", "cta-section", "footer-with-brand-and-links"]
    },
    {
      "component": "DOMAIN Page e.g. ShipmentsPage",
      "nav": "DOMAIN LABEL",
      "desc": "Core workflow surface with dense data and detail drawer",
      "sections": ["page-header-with-breadcrumb-and-action-buttons", "filter-bar-with-3-to-5-filters", "dense-data-table-rendering-all-mockData-records", "bulk-actions-bar-when-rows-selected", "detail-drawer-on-row-click"]
    },
    {
      "component": "DOCUMENT PAGE e.g. DocumentsPage",
      "nav": "DOCS LABEL",
      "desc": "Nutrient PDF review workspace",
      "sections": ["split-layout-queue-on-left-viewer-on-right", "document-list-with-12-plus-items", "nutrient-viewer-mount-with-toolbar", "review-actions-panel", "annotation-summary"]
    },
    {
      "component": "SecondaryPage e.g. AnalyticsPage / SettingsPage",
      "nav": "LABEL",
      "desc": "Supporting page with its own rich content",
      "sections": ["LIST 4+ CONCRETE SECTIONS"]
    }
  ],
  "nutrient": {
    "page": "WHICH PAGE component has the viewer",
    "capability": "annotations|redaction|forms|signatures|comparison|viewer",
    "toolbar": ["SPECIFIC TOOLBAR ITEMS e.g. highlighter,ink,note,export-pdf"],
    "description": "Exactly what Nutrient does in this product",
    "connection": "How a real business record/action opens or updates the Nutrient document workflow"
  },
  "data": {
    "entity": "MAIN BUSINESS OBJECT e.g. Shipment/Patient/Contract/Claim",
    "fields": ["id", "status", "date", "DOMAIN-SPECIFIC FIELDS"],
    "statuses": ["REALISTIC STATUS VALUES e.g. In Transit/At Customs/Exception/Delivered"],
    "count": 18
  },
  "components": [
    "AppLayout",
    "ENTITY Table component name",
    "StatusBadge",
    "ENTITY Detail panel name",
    "OTHER KEY COMPONENTS"
  ],
  "files": [
    "src/App.tsx",
    "src/index.css",
    "ONLY list files you will actually create — no placeholders. Default 4-6 total."
  ]
}
</project_plan>`;
}

// ── Light-build three-phase prompts ──────────────────────────────────────────

// Phase 1 of light-build: compact plan — much smaller than the full planning prompt.
// Haiku outputs a tiny JSON in ~5s with just the essentials for a single-page build.
export function buildLightPlanPrompt(userRequest: string, projectFiles: ProjectFile[] = []): string {
  const memory = projectFiles.find((f) => f.path === "NUTRIENTWEBBUILDER.md")?.content ?? "";
  const creativeSeed = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `You are a product planner. Create a COMPACT plan for a focused build.

USER REQUEST: "${userRequest}"
${memory ? `EXISTING PROJECT MEMORY:\n${memory.slice(0, 400)}` : ""}

BRAND DIVERSITY RULE:
- Creative seed for this request: ${creativeSeed}. Use it only to force a different naming direction from previous similar prompts; do not print the seed.
- Invent a fresh product/company name every time. Never reuse names from examples, previous projects, or common construction SaaS clichés.
- Do NOT use \`BuildTrack\`, \`BuildFlow\`, \`BuildHub\`, \`BuildCore\`, \`ConstructTrack\`, \`ConstructHub\`, \`SiteFlow\`, \`SiteCore\`, or \`ProjectTrack\`.
- Avoid obvious industry-word + software-noun formulas like \`Build\` + \`Track\`, \`Site\` + \`Flow\`, \`Construct\` + \`Hub\`, \`Project\` + \`Core\`, and similar variants.
- For construction/field prompts, avoid the exact visible label "CONSTRUCTION MANAGEMENT"; write a more specific product category tied to the request, such as "Field Operations", "Permit Review", "Blueprint Coordination", or "Site Progress".

NUTRIENT PRODUCTS (use this to set the "nutrient" field correctly):
- "viewer" → basic PDF viewing, annotations, search, signatures — for most demos
- "redaction" → marking + permanently removing sensitive text/areas (legal, healthcare, compliance)
- "comparison" → side-by-side diff of two document versions (contracts, policies, audits)
- "forms" → interactive fillable PDF forms (intake, applications)
- "signatures" → e-signature collection workflows
- "annotations" → collaborative markup, comments, highlights (review workflows)
- "none" → app uses no Nutrient viewer at all

CRITICAL: Always set "nutrient" to something other than "none" unless the user explicitly says no PDF viewer.
Always include "src/pages/NutrientPage.tsx" (or an appropriately named viewer page) in the "files" list when nutrient is not "none".

Output ONLY this JSON block — no prose:

<light_plan>
{
  "brand": "ORIGINAL FRESH BRAND NAME - not BuildTrack or any generic Build/Site/Construct suffix name",
  "industry": "construction|legal|healthcare|finance|logistics|hr|insurance|tech",
  "accent": "#EXACT HEX - original for this project, NOT generic blue and NOT always orange for construction",
  "font": "BEST GOOGLE FONT for this specific product",
  "pages": ["HOME_PAGE_LABEL", "SECOND_PAGE_LABEL"],
  "nutrient": "viewer|annotations|redaction|signatures|forms|none",
  "entity": "MAIN DATA ENTITY e.g. Contract",
  "files": [
    "src/App.tsx",
    "src/index.css",
    "src/components/Navbar.tsx",
    "src/pages/HomePage.tsx",
    "src/pages/SECOND_PAGE.tsx",
    "NUTRIENTWEBBUILDER.md"
  ]
}
</light_plan>

FILE RULES (critical):
- Always include src/components/Navbar.tsx if the request mentions a navbar or navigation.
- Always put each page in its own src/pages/PageName.tsx file — NEVER inline pages inside App.tsx.
- App.tsx must be a thin router only (≤ 60 lines): import pages + navbar, track currentPage in state, render the right page.
- 5–7 files total. Only add extra files if genuinely needed.`;
}

// Phase 3 of light-build: focused build using the plan + design spec.
export function buildLightBuildPrompt(userRequest: string, lightPlan?: string, designSpec?: string): string {
  return `${STACK_FINGERPRINT}

NUTRIENT VIEWER USAGE: Import NutrientViewer from "./NutrientViewer". It handles CDN load, cleanup, and height checks automatically. Container must have explicit height. Use: <div style={{height:"600px",width:"100%",position:"relative"}}><NutrientViewer document="..." theme="DARK" /></div>
Available toolbar features via toolbarItems prop: viewer (pager, zoom-in, zoom-out), annotations (highlighter, note, ink), redaction (redact-text-highlighter, redact-rectangle), comparison (document-comparison), forms (form-creator, signature), export-pdf.
Toolbar item names must be exact: use { type: "highlighter" }, never { type: "highlight" }.

${userRequest}

LIGHT BUILD — FAST FOCUSED SINGLE-PAGE APP
${lightPlan ? `\nPROJECT PLAN:\n${lightPlan}` : ""}
${designSpec ? `\nDESIGN SPEC (implement exactly):\n${designSpec}` : ""}

Rules (strict):
- 5–7 files — follow the plan file list exactly, nothing extra
- Brand name is mandatory and must be visible in Navbar/Home JSX. Use the exact plan brand only if it is original. If the plan brand is \`BuildTrack\`, \`BuildFlow\`, \`BuildHub\`, \`BuildCore\`, \`ConstructTrack\`, \`ConstructHub\`, \`SiteFlow\`, \`SiteCore\`, \`ProjectTrack\`, or any obvious Build/Site/Construct/Project + Track/Flow/Hub/Core formula, replace it before coding with a fresh AI-generated name and use that replacement consistently in every file.
- For construction/field projects, do not render the category label "CONSTRUCTION MANAGEMENT"; use a specific label like "Field Operations", "Permit Review", "Blueprint Coordination", or "Site Progress".
- src/App.tsx MUST be a thin router ≤ 60 lines: import Navbar + page components, track currentPage with useState, render the right page. NO inline JSX sections. NO logic. This file must stay short or it will be truncated and the app will break.
- Each page goes in its own src/pages/PageName.tsx — never inline pages inside App.tsx
- src/components/Navbar.tsx: if a navbar was planned, build it here (links update currentPage via a prop callback)
- src/index.css (.css): write the :root and [data-theme="dark"] blocks from the design spec (HSL values) + reset + any component classes. NEVER @tailwind / @apply / @layer / & nesting — crash in Sandpack PostCSS. Use hsl(var(--token)) in CSS rules.
- If the current request asks for design/redesign/restyle/modern UI/color/theme/font/warm/dark/black, src/index.css MUST be included and changed. A JSX-only design response is invalid.
- NutrientViewer usage: import from "./NutrientViewer". Container MUST have an explicit height. Use: <div className="viewer-mount"><NutrientViewer .../></div> or <div style={{height:"600px",width:"100%",position:"relative"}}><NutrientViewer .../></div>. A container with only padding/flex and no height will crash the SDK.
- mockData.ts: 8–12 realistic records for the domain entity
- Every button/tab/link must update React state — no dead UI
- NUTRIENTWEBBUILDER.md: describe what was built, list files

CRASH PREVENTION:
1. Every relative import MUST have a matching file in file_patches — if you import ./pages/Foo, the file src/pages/Foo.tsx must be in the patches
2. useState arrays: useState<T[]>([]) — NEVER useState<T[]>()
3. Named imports must match named exports exactly
4. Keep every file under 120 lines — split into more files if needed to avoid truncation
5. Add watermark as last child in App.tsx root div:
   <div style={{position:'fixed',bottom:8,right:12,fontSize:'10px',color:'hsl(var(--muted-foreground))',opacity:0.45,pointerEvents:'none',zIndex:9999}}>Built using Nucode · Developed by Vinayak Kamboj</div>

Output exactly one <file_patches> block. No prose, no <thinking>.`;
}

export function buildDesignSpecPrompt(userRequest: string, roadmap: string, projectFiles: ProjectFile[] = []): string {
  const existingCss = projectFiles.find((f) => f.path === "src/index.css")?.content ?? "";
  const memory = projectFiles.find((f) => f.path === "NUTRIENTWEBBUILDER.md")?.content ?? "";

  return `You are a senior product designer. Decide the visual design for this app — color palette, font, component style. Output ONLY a JSON spec. The build phase will write all CSS and TSX code based on your decisions.

USER REQUEST: "${userRequest}"

APP PLAN:
\`\`\`json
${roadmap.slice(0, 1200)}
\`\`\`

${memory ? `EXISTING PROJECT MEMORY:\n${memory.slice(0, 300)}` : ""}
${existingCss ? `EXISTING TOKENS (preserve for change requests):\n${existingCss.slice(0, 400)}` : ""}

RULES:
- Light theme only (dark theme is also required — derive it from the light).
- Two colors: one neutral background family + one intentional accent/primary.
- Primary/accent must match the product's domain — NOT generic blue unless user asked.
- Background: hue-tinted (warm cream, cool stone, soft slate — NOT pure 0 0% 100%).
- Derive card, secondary, muted, border values from the background hue.
- Pick ONE Google Font from: Plus Jakarta Sans, Manrope, DM Sans, Space Grotesk, Outfit, Sora, Inter. Choose from the product voice; do not keep choosing the same font for every project.
- Do not copy the sample HSL values below. They show JSON shape only; the output palette must be newly chosen for this request.
- Honor any user design direction (colors, mood, industry) from the request.
- All token values MUST be space-separated HSL: H S% L%  (e.g. "170 82% 39%")
  This enables Tailwind opacity modifiers (bg-primary/10, text-foreground/80).

Output ONLY this JSON block — no CSS, no prose, nothing else:

<design_spec>
{
  "paletteName": "ORIGINAL DESCRIPTIVE NAME e.g. Warm Slate",
  "fontFamily": "Manrope",
  "fontImport": "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap",
  "light": {
    "--background":           "40 30% 97%",
    "--foreground":            "0  0% 10%",
    "--card":                  "0  0% 100%",
    "--card-foreground":       "0  0% 10%",
    "--popover":               "0  0% 100%",
    "--popover-foreground":    "0  0% 10%",
    "--primary":             "170 82% 39%",
    "--primary-foreground":    "0  0% 100%",
    "--secondary":            "40 20% 94%",
    "--secondary-foreground":  "0  0% 30%",
    "--muted":                "40 15% 92%",
    "--muted-foreground":      "0  0% 45%",
    "--accent":              "170 82% 39%",
    "--accent-foreground":     "0  0% 100%",
    "--destructive":           "0 72% 51%",
    "--destructive-foreground":"0  0% 100%",
    "--success":             "142 71% 45%",
    "--warning":              "38 92% 50%",
    "--border":               "40 15% 88%",
    "--input":                "40 15% 92%",
    "--ring":                "170 82% 39%",
    "--radius":              "0.5rem"
  },
  "dark": {
    "--background":            "0 13%  9%",
    "--foreground":            "0  0% 96%",
    "--card":                  "0 10% 11%",
    "--card-foreground":       "0  0% 96%",
    "--popover":               "0 10% 11%",
    "--popover-foreground":    "0  0% 96%",
    "--primary":             "170 82% 55%",
    "--primary-foreground":    "0  0% 10%",
    "--secondary":             "0  9% 13%",
    "--secondary-foreground":  "0  0% 80%",
    "--muted":                 "0  8% 15%",
    "--muted-foreground":    "240  4% 55%",
    "--accent":              "170 82% 55%",
    "--accent-foreground":     "0  0% 10%",
    "--destructive":           "0 72% 51%",
    "--destructive-foreground":"0  0% 100%",
    "--success":             "142 71% 45%",
    "--warning":              "38 92% 50%",
    "--border":                "0  8% 18%",
    "--input":                 "0  8% 15%",
    "--ring":                "170 82% 55%"
  },
  "componentStyle": "One sentence: card style, border radius, button shape, badge style.",
  "layoutSignature": "One sentence: sidebar/topnav/split, density, grid.",
  "avoid": ["mistake 1", "mistake 2"]
}
</design_spec>

Replace ALL HSL values with your original palette. Token NAMES must stay exactly as shown.`;
}

// How many lines to include per file type (0 = skip entirely, Infinity = full)
function getFileTruncationLimit(path: string): number {
  if (
    path === "src/NutrientViewer.tsx" ||
    path === "src/ErrorBoundary.tsx" ||
    path === "src/main.tsx" ||
    path === "vite.config.ts" ||
    path === "index.html"
  ) return 0;
  if (
    path === "NUTRIENTWEBBUILDER.md" ||
    path === "src/App.tsx" ||
    path === "src/index.css" ||
    path === "package.json" ||
    path.startsWith("src/types/")
  ) return Infinity;
  if (path.startsWith("src/layouts/") || path.startsWith("src/pages/")) return 200;
  if (path.startsWith("src/components/")) return 150;
  if (path.startsWith("src/hooks/") || path.startsWith("src/services/") || path.startsWith("src/store/")) return 100;
  if (path.startsWith("src/data/")) return 60;
  if (path.startsWith("src/utils/") || path.startsWith("src/lib/")) return 80;
  if (path.startsWith("src/")) return 120;
  return 0;
}

function buildSmartFileContext(projectFiles: ProjectFile[]): string {
  const sortedFiles = [...projectFiles].sort((a, b) =>
    projectContextPriority(a.path).localeCompare(projectContextPriority(b.path))
  );
  const parts: string[] = [];
  for (const f of sortedFiles) {
    const limit = getFileTruncationLimit(f.path);
    if (limit === 0) continue;
    let content = f.content;
    if (limit !== Infinity) {
      const lines = content.split("\n");
      if (lines.length > limit) {
        content = lines.slice(0, limit).join("\n") + `\n// ... (${lines.length - limit} more lines)`;
      }
    }
    parts.push(`### ${f.path}\n\`\`\`${f.language ?? "text"}\n${content}\n\`\`\``);
  }
  return parts.join("\n\n");
}

// Dynamic project context injected into each build request (NOT cached).
// Contains plan, design note, current design tokens, and smart-truncated project files.
export function buildProjectContext(
  projectFiles: ProjectFile[],
  plan?: string,
  designNote?: string,
  request: string = "Build or update the current Nutrient project.",
): string {
  const designTokens = extractDesignTokens(projectFiles);
  const repositoryContext = formatContextPackForPrompt(
    buildContextPack(request, projectFiles, { maxFiles: 18 })
  );

  const planSection = plan ? `
## ══════════════════════════════════════════════
## PROJECT ROADMAP — IMPLEMENT THIS EXACTLY, NO DEVIATIONS
## ══════════════════════════════════════════════

A project roadmap was pre-generated. Follow it exactly: use the exact brand name (visible in Navbar JSX), exact accent color, exact layout pattern, all listed pages, and the specified Nutrient capability.

\`\`\`json
${plan}
\`\`\`

Key rules from roadmap:
- Brand \`name\` → use in Navbar/header JSX text
- \`design.source\` → user-specified and existing-project design choices are source-of-truth. Do not override them.
- \`design.paletteName\`, \`design.base\`, \`design.surface\`, \`design.text\`, \`design.accent\`, \`design.accentLight\`, \`design.accentDark\`, and \`design.fontFamily\` → if the DESIGN SPEC below is missing, copy these into \`src/index.css\` tokens. Otherwise the DESIGN SPEC wins.
- \`design.layout\` → implement that exact layout pattern.
- \`design.navigationPattern\` and \`design.layoutSignature\` → implement the planned shell. Do not default to a top-navbar dashboard.
- \`architecture.scope\`, \`architecture.fileStrategy\`, \`architecture.stateModel\`, \`architecture.routingModel\`, and \`architecture.dataPersistence\` → implement the planned repository shape.
- All \`pages\` entries → build every one as a real component
- \`nutrient.page\` + \`nutrient.capability\` + \`nutrient.toolbar\` → Nutrient integration spec
- \`nutrient.connection\` → wire real domain records/actions to the document workflow.
- \`data.entity\` + \`data.fields\` + \`data.count\` → mock data spec

## ══════════════════════════════════════════════

` : "";

  const designSection = designNote ? `
## ══════════════════════════════════════════════
## DESIGN INSTRUCTIONS — IMPLEMENT THESE IN CODE
## ══════════════════════════════════════════════

${designNote}

## ══════════════════════════════════════════════

` : "";

  const tokensNote = designTokens ? `
## Current design tokens from src/index.css
\`\`\`css
:root {
${designTokens}
}
\`\`\`

` : "";

  const fileContext = buildSmartFileContext(projectFiles);
  const filesSection = fileContext ? `## Project files (your full working codebase)\n${fileContext}` : "";

  return [planSection.trim(), designSection.trim(), repositoryContext, tokensNote.trim(), filesSection]
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

// Static instruction text — safe to cache across requests.
// Does NOT include project files, plan, design note, or current design tokens.
export function buildStaticInstructions(template: Template): string {
  const base = buildSystemPrompt(template, []);
  return base.replace(
    /^(## Project files \(your full working codebase\))$/m,
    "$1\nSee current project context in the user message."
  );
}

export function buildSystemPrompt(
  template: Template,
  projectFiles: ProjectFile[],
  plan?: string,
  designNote?: string,
): string {
  const sortedFiles = [...projectFiles].sort((a, b) =>
    projectContextPriority(a.path).localeCompare(projectContextPriority(b.path))
  );

  const fileContext = sortedFiles
    .map((f) => `### ${f.path}\n\`\`\`${f.language ?? "text"}\n${f.content}\n\`\`\``)
    .join("\n\n");

  const designTokens = extractDesignTokens(projectFiles);

  const planSection = plan ? `
## ══════════════════════════════════════════════
## PROJECT ROADMAP — IMPLEMENT THIS EXACTLY, NO DEVIATIONS
## ══════════════════════════════════════════════

A project roadmap was pre-generated. Follow it exactly: use the exact brand name (visible in Navbar JSX), exact accent color, exact layout pattern, all listed pages, and the specified Nutrient capability.

\`\`\`json
${plan}
\`\`\`

Key rules from roadmap:
- Brand \`name\` → use in Navbar/header JSX text
- \`design.source\` → user-specified and existing-project design choices are source-of-truth. Do not override them.
- \`design.paletteName\`, \`design.base\`, \`design.surface\`, \`design.text\`, \`design.accent\`, \`design.accentLight\`, \`design.accentDark\`, and \`design.fontFamily\` → if the DESIGN SPEC below is missing, copy these into \`src/index.css\` tokens. Otherwise the DESIGN SPEC wins.
- \`design.layout\` → implement that exact layout pattern.
- \`design.navigationPattern\` and \`design.layoutSignature\` → implement the planned shell. Do not default to a top-navbar dashboard.
- \`architecture.scope\`, \`architecture.fileStrategy\`, \`architecture.stateModel\`, \`architecture.routingModel\`, and \`architecture.dataPersistence\` → implement the planned repository shape.
- All \`pages\` entries → build every one as a real component
- \`nutrient.page\` + \`nutrient.capability\` + \`nutrient.toolbar\` → Nutrient integration spec
- \`nutrient.connection\` → wire real domain records/actions to the document workflow.
- \`data.entity\` + \`data.fields\` + \`data.count\` → mock data spec

## ══════════════════════════════════════════════

` : "";

  const designSection = designNote ? `
## ══════════════════════════════════════════════
## DESIGN INSTRUCTIONS — IMPLEMENT THESE IN CODE
## ══════════════════════════════════════════════

${designNote}

## ══════════════════════════════════════════════

` : "";

  return `${STACK_FINGERPRINT}

You are the primary autonomous software engineer for Nutrient Demo Studio — an AI-powered all-rounder repository builder for Nutrient projects.

## ══ CRASH PREVENTION — READ BEFORE WRITING ANY CODE ══

These three patterns cause 90% of all runtime crashes. Fix them before outputting:

**1. EVERY relative import must have a matching file in your output.**
If you write \`import { Foo } from "./components/Foo"\`, you MUST include \`src/components/Foo.tsx\` in file_patches.
If you write \`import { useBar } from "./hooks/useBar"\`, you MUST include \`src/hooks/useBar.ts\`.
Missing file = instant blank white screen.

**2. useState for arrays MUST default to \`[]\`, NEVER \`()\`.**
- WRONG: \`const [items, setItems] = useState<Item[]>()\`
- RIGHT: \`const [items, setItems] = useState<Item[]>([])\`
A component that calls \`items.map()\` when items is \`undefined\` crashes on the very first render.

**3. Named imports must match named exports exactly.**
- If you import \`{ Sidebar }\`, the file must have \`export function Sidebar\` or \`export const Sidebar\` — not just \`export default function Sidebar\`.
- If you import \`Sidebar\` (default), the file must have \`export default function Sidebar\`.
- Wrong name = "Element type is invalid: expected a string or a class/function" crash.

${planSection}${designSection}
## IMPORTANT PRODUCT PHILOSOPHY

Build exactly what the user asked for. Do not force every request into the same "full SaaS dashboard" shape, and do not force Nutrient functionality onto every screen.

## ══════════════════════════════════════════════
## BUILD SMALL FIRST — THIS OVERRIDES EVERYTHING BELOW
## ══════════════════════════════════════════════

**Default: 4–6 files. A working small app beats a broken large one every time.**

Before writing a single file, ask: what is the absolute minimum file count that satisfies this request?
- Most requests: \`src/App.tsx\` + 1–2 components + \`src/data/mockData.ts\` + \`src/index.css\` + \`NUTRIENTWEBBUILDER.md\`
- Only add pages/layouts/hooks/services/store/types when the request explicitly requires them
- **Do NOT invent extra pages, dashboards, or navigation the user did not ask for**
- The user asking for "a PDF viewer" does not mean "build a 3-page SaaS product with a home page, dashboard, and settings"

Scope ladder — pick the LOWEST rung that satisfies the request:
1. Standalone SDK/example request → focused runnable project, Nutrient front and center, 4–6 files max.
2. Focused workflow request → build only the workflow screens asked for, 5–8 files.
3. Full app/product/platform request → multi-page product, but ONLY the pages the user named, 8–12 files.
4. Python/server/data extraction request → backend/scripts + runnable frontend simulator, 5–8 files.
5. Fix/change request → smallest correct change, update related files only.

This platform is not a generic website builder. Every generated project must meaningfully use Nutrient products, document processing, PDF workflows, viewer functionality, extraction, forms, signatures, redaction, OCR, comparison, AI document processing, or audit/export workflows in the way the user's request calls for.

You are no longer a template patcher, config editor, static dashboard builder, or single-file UI generator. You own the generated repository architecture, file tree, routing, components, business logic, state management, and iterative corrections.

You have full authority to create files, delete files, rename files, refactor structure, split components, create pages, create layouts, create hooks, create services, create stores, create utilities, and repair broken imports when the requested product needs it.

You are context-aware. Before changing a project, read the existing file tree provided in "Project files", preserve working architecture, reuse existing components/hooks/services when they fit, update related imports/routes/state, and avoid creating parallel inconsistent structures. If the current app already has pages, layouts, services, or domain types, extend them instead of generating a disconnected replacement.

You are documentation-aware. The system prompt includes a "NUTRIENT DOCUMENTATION CONTEXT" section with current SDK packages, official docs links, and integration rules. Follow that context exactly. For Web SDK, always use ${NUTRIENT_WEB_SDK_PACKAGE}@${NUTRIENT_WEB_SDK_VERSION}. Do not fall back to stale PSPDFKit-era package names, asset-copy scripts, or fake document viewers.

## DESIGN + ARCHITECTURE SOURCE OF TRUTH

The user's design recommendation is not optional. If the user says a style, color, brand, layout, visual mood, industry, or "make it not blue", that instruction overrides generic defaults and examples.

The project plan is the implementation contract. Implement the planned \`architecture.scope\`, \`architecture.fileStrategy\`, \`design.paletteName\`, \`design.paletteFormula\`, \`design.fontFamily\`, \`design.designBrief\`, \`design.layout\`, and \`design.avoid\` exactly. If no plan is available, create the same reasoning internally before writing files.

Act like a world-class product designer before writing code. The first generated version must look intentionally designed, not patched together. Use a disciplined two-color palette: one neutral foundation for background/surface/text/border plus one accent family for primary actions, active states, focus rings, and document-workflow emphasis. Do not introduce random extra accent colors, decorative gradients, blue/cyan defaults, or one-note tinted interfaces.

Design as if this must stand beside the best product interfaces in the world: premium font choice, precise button color contrast, quiet neutral surfaces, one accent family only, and a Nutrient viewer area that feels like a polished document workspace rather than an embedded afterthought.

Design quickly and concretely: choose the palette, shell, typography scale, spacing rhythm, data density, and active/empty/loading states during the plan. Then code that decision directly in \`src/index.css\` and components. Do not spend tokens explaining design theory; ship the files.

Never default to a blue/cyan product theme. Blue palettes are allowed only when:
- The user explicitly asks for blue/cyan.
- The existing brand already uses blue and the request is a small change, not a redesign.
- The project plan explicitly names a blue palette with a reason tied to the user request.

Forbidden as generic defaults: \`#4f8cff\`, \`#38bdf8\`, \`#0ea5e9\`, \`#2563eb\`, \`#3b82f6\`, and blue-gray shells. For unknown/default products, design an original palette from the product's emotional register — a distinctive teal, green, purple, orange, or rose that is specific to this product, not a recycled preset.

Architecture must not be random. Read the current file tree and \`NUTRIENTWEBBUILDER.md\`; extend the existing routes, components, hooks, services, data, and types unless the user asks for a rebuild or the current structure blocks the requested product.

Do not keep generating the same structural design. The planned \`navigationPattern\` and \`layoutSignature\` are mandatory. A top navbar is only one option. Prefer the shell that matches the workflow: sidebars for CRMs/admins, split workbenches for document review, steppers for approvals/forms, command bars for operations, full workspaces for SDK tools, and portal homes for customer-facing apps.

Nutrient must be connected to the product, not bolted on. A business record must have document metadata, selecting that record must update the Nutrient workspace context, document actions must update product state/audit events, and product actions must be able to open the relevant PDF/form/signature/redaction/extraction flow.

If the user asks for auth, database, persistence, Supabase, teams, CRUD, or real backend behavior, implement the appropriate layer for the generated project. Use localStorage/IndexedDB/local services by default for sandbox reliability. If Supabase is requested or clearly needed, add \`@supabase/supabase-js\` to \`package.json\`, create \`src/lib/supabaseClient.ts\`, use \`VITE_SUPABASE_URL\` and \`VITE_SUPABASE_ANON_KEY\`, and provide a local fallback so the preview still works without credentials.


## ══════════════════════════════════════════════
## WHAT YOU ARE: A PRODUCT-FIRST REPOSITORY ENGINEER
## ══════════════════════════════════════════════

You generate complete, production-quality Nutrient projects by changing the repository, not by emitting static layouts. The project can be a focused SDK example, a workflow tool, a backend/document-processing pipeline, or a full product. Match the user request instead of defaulting to one shape.

**For every build request:**
1. Understand the requested product and business workflow first.
2. Choose the right scope: standalone SDK demo, focused workflow, full app, backend/pipeline, or targeted fix.
3. Build real files, state, actions, and services for that scope.
4. Add Nutrient where the user's document workflow naturally needs it: viewer, annotations, forms, signatures, redaction, comparison, extraction, OCR, AI document processing, audit export, or report generation.
5. For branded UI requests, write the company name, logo, tagline, nav links, records, and actions IN THE ACTUAL COMPONENT CODE — not just in metadata.
6. The \`/* nutrient-preview */\` JSON comment is ONLY Studio preview metadata. It is not a UI layout system and must never replace real components, state, navigation, or business logic.
7. Maintain \`NUTRIENTWEBBUILDER.md\` inside generated projects on every file-changing response so future AI edits understand the app architecture, routes, state, workflows, and Nutrient integration points. This file is mandatory, not optional.
8. Choose the right Nutrient capability for the business workflow, not just a dashboard plus viewer.

## CRITICAL FIRST-RENDER REQUIREMENT

The generated application must survive its first render. Before finalizing files, mentally simulate \`src/main.tsx -> <App /> -> every hook/page/component rendered on the default route\`.

Trace all state, props, services, mock data, and derived collections. Assume async services, localStorage, backend-like responses, and imported data can be \`undefined\`, \`null\`, empty arrays, or empty objects. Every \`.map/.filter/.reduce/.forEach/.find\` receiver must be proven to be an array or explicitly defaulted. Array state must initialize as \`useState<T[]>([])\`, never \`useState<T[]>()\`. Hook return values must be stable objects with array fields defaulted to arrays. Do not rely on the error boundary to catch normal first-render bugs.

## ══════════════════════════════════════════════
## THE CARDINAL RULE: BRANDING LIVES IN THE CODE
## ══════════════════════════════════════════════

**WRONG** (what NOT to do):
\`\`\`tsx
/* nutrient-preview { "appName": "BrandNameFromPlan", "navigation": ["Dashboard", "Documents"] } */
// ... generic App.tsx with no visible company name in JSX
export default function App() {
  return <div><NutrientViewer /></div>;  // no navbar, no brand, no pages
}
\`\`\`

**RIGHT** (what to do — every app should look like this):
\`\`\`tsx
// src/components/Navbar.tsx — company name IS IN THE CODE
export function Navbar({ page, onNavigate }) {
  const brandName = "BrandNameFromPlan";
  return (
    <nav className="nav">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 12 }}>
        <div style={{ width: 32, height: 32, background: "var(--accent)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "var(--accent-fg)", fontSize: 14 }}>{brandName.slice(0, 2).toUpperCase()}</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)" }}>{brandName}</div>
          <div style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: "0.08em" }}>FIELD OPERATIONS</div>
        </div>
      </div>
      {["Dashboard", "Documents", "Inspections", "Safety"].map(p => (
        <button key={p} onClick={() => onNavigate(p)} className={\`nav-link\${page === p ? " active" : ""}\`}>{p}</button>
      ))}
    </nav>
  );
}
\`\`\`

The chosen company name must appear in the JSX. Replace every schema/example value with the brand, pages, labels, and records from the actual plan. The nav items must be rendered in JSX. The logo must be a styled div or SVG in JSX. None of this should be only in the JSON comment.

## ══════════════════════════════════════════════
## HOW TO BUILD A REAL WORKING APP
## ══════════════════════════════════════════════

For any user request:

**Step 1 — Understand the product**
Decide what real company/product the user is asking for, who uses it, what job they are doing, and what core objects the app manages (patients, contracts, claims, shipments, invoices, employees, assets, campaigns, tickets, etc.).

**Step 2 — Invent or apply the brand**
Pick a specific company name fitting the industry unless the user gave one. Write it in code, not just in comments.
Derive it from the domain, audience, and workflow. Do not reuse industry-example names, template names, or generic suffix patterns.

**Step 3 — Generate the repository architecture**
Think in files and ownership boundaries before writing code. Decide the page tree, layout shell, business data model, shared state, local services, document workflow, and validation helpers. Do not stay trapped inside \`App.tsx\`.

First inspect the current app context from the provided project files:
- Existing routes/pages and navigation
- Existing layouts and design system
- Existing state/hooks/services/store
- Existing data models and types
- Existing Nutrient viewer/config usage
- Existing \`NUTRIENTWEBBUILDER.md\` project memory

Then decide whether to extend, refactor, rename, delete, or create files. Keep the repository coherent.

Use the right structure for the requested scope:

Focused SDK/workflow projects can use a compact tree:
- \`src/App.tsx\` — root flow and page state
- \`src/components/\` — viewer/workflow panels/forms/tables
- \`src/services/\` — local async document-processing or approval logic
- \`src/data/\` — realistic sample records/documents/results
- \`src/types/\` — workflow and document result types
- \`NUTRIENTWEBBUILDER.md\` — project memory

Full products should use a scalable tree:
- \`src/App.tsx\` — thin root composition and page state/routing only
- \`src/layouts/\` — app shell, sidebar/topbar, workspace frame
- \`src/pages/\` — Home, Dashboard, domain workflow, document workflow, settings/audit/report pages
- \`src/components/\` — reusable buttons, tables, record panels, modals, forms, viewer shells
- \`src/hooks/\` — workflow state, localStorage persistence, derived UI state
- \`src/services/\` — local async business logic, CRUD/status transitions, document processing simulations
- \`src/store/\` — shared state when multiple pages need the same workflow state
- \`src/data/\` — realistic seed records, users, documents, events, metrics
- \`src/types/\` — business objects, actions, document metadata, workflow states
- \`src/utils/\` or \`src/lib/\` — formatting, validation, filtering, calculations

**Step 4 — Build ONLY the screens the request names**
Build exactly the screens the user asked for. Do not add a HomePage, DashboardPage, or SettingsPage unless the user explicitly requested them. Focused SDK demos and workflow tools need only the screens that belong to the workflow.

When multiple pages are genuinely needed, keep their structure:
- Navigation shell: inline in \`src/App.tsx\` for 1–2 pages; \`src/layouts/AppLayout.tsx\` only when 3+ pages share the same shell
- \`src/pages/[MainWorkflow]Page.tsx\` — the core workflow screen: list/queue + detail panel + actions + Nutrient integration
- \`src/pages/[SecondScreen]Page.tsx\` — only if the user asked for a second screen
- \`src/components/\` — only shared pieces used by 2+ pages
- \`src/data/mockData.ts\` — realistic typed records with IDs, statuses, document metadata

The nav shell can be a sidebar, split workbench, command bar, stepper, viewer workspace, or portal home — match the planned \`navigationPattern\`. Not every app needs a top navbar.

All rendered content must come from \`mockData.ts\` via \`.map()\`. No placeholder text, no "TODO: add content here".

**Step 5 — Make everything functional**
Every visible navigation item, button, form, tab, modal, filter, row selection, workflow action, and CTA must do something real in the generated app.

Because this generated project is a standalone React/Vite app with no backend server, implement functionality with React state, local modules, and localStorage where persistence is needed. If a server API would exist in production, create a local \`src/services/\` module with async functions that actually update local state. Do not fake actions with inert buttons.

**Pages must feel alive, not static.** Every page that shows data must pull it from \`src/data/mockData.ts\` and render with \`.map()\` — never hard-coded \`<tr>\` or \`<li>\` tags. Pages with lists must allow row selection. Pages with forms must handle submission. Pages with actions must update visible state. A page that is pure static JSX with no interaction is not acceptable — but you do NOT need to create separate hooks/services files just to satisfy this. Inline the state and handlers directly in the page component when they are simple enough.

Required examples:
- Navbar links switch real pages.
- CTA buttons navigate or open the correct modal/workflow.
- Queue rows select records and update detail panels.
- Forms validate, submit, show success/error state, and update records.
- Upload controls should store file metadata in state, even if the PDF viewer uses the sample document URL.
- Approve/reject/sign/export actions update status, activity, and audit trail state.
- If persistence/database is requested, create a service/client layer and wire CRUD actions through it. The preview must still work with a local fallback when credentials are absent.

**Step 6 — Embed Nutrient naturally**
Use Nutrient where document workflows logically belong: record details, document tabs, review drawers, approval modals, contract redaction workspaces, invoice OCR queues, onboarding forms, compliance evidence, or report exports.

Do not put Nutrient on every page. Do not turn the home page into a PDF viewer unless the user explicitly asks for a standalone viewer.

Choose from the full Nutrient capability surface based on workflow:
- Viewing/review: embedded \`NutrientViewer\`, thumbnails, search, bookmarks, annotations.
- Collaboration/review: notes, highlights, ink, comments, review status, audit trail state.
- Redaction/legal/compliance: redaction toolbar, redaction workflow steps, clean-copy export action.
- Forms/onboarding/intake: form creator/fill workflow, validation state, signature capture action.
- Signing/approvals: signature toolbar, approval queue, signer state, signed packet export.
- OCR/extraction/invoices: upload metadata, processing queue, extraction confidence, field validation, local async processing service.
- Report/export: generated report records, export action, audit PDF status, download-ready state.
- AI document assistant: question panel, cited document snippets, selected-page context, source PDF side-by-side.
- Comparison/versioning: version selector, comparison workflow state, changed clause/field list.

If a capability would require a production backend or external Nutrient service, still create the frontend workflow honestly: define service interfaces, local async simulation, processing states, validation, and audit events. Do not present inert fake buttons.

Connection contract:
- Domain records include document IDs/names/statuses that map to the document workflow.
- Selecting a domain record updates the active document label/context beside \`<NutrientViewer>\`.
- Document actions update the domain record, activity log, audit trail, or validation state.
- Product pages deep-link or navigate into the relevant document workflow. Nutrient is never an isolated unrelated page.

**Step 7 — Write the CSS and component library**
If the user message contains \`## DESIGN INSTRUCTIONS — IMPLEMENT THESE IN CODE\`, the design phase produced a palette spec. You MUST:
(a) Write \`src/index.css\` with the EXACT \`:root { … }\` token block shown in the spec — do NOT change token names or swap in different hex values.
(b) After \`:root\`, add the standard reset and ALL layout infrastructure classes (app shell, sidebar/topnav, page, cards, metric grid, split layout, record rows, badges, filter bar, table wrap, empty state, modal, drawer, detail fields, viewer wrapper), then all product-specific component classes.
(c) Create \`src/components/ui.tsx\` (.tsx) — export Button, Badge, Card, Input using plain Record variant objects + cn() + Radix Slot for Button asChild. Mirror the host app pattern: variants are plain objects, NOT cva(). Keep each component under 25 lines. Example:
    \`\`\`tsx
    const btnVariants = { default:"bg-primary text-primary-foreground hover:bg-primary/90 shadow", ghost:"hover:bg-secondary hover:text-foreground", outline:"border border-border bg-transparent hover:bg-secondary", destructive:"bg-destructive text-destructive-foreground hover:bg-destructive/90" };
    export function Button({ variant="default", className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof btnVariants }) {
      return <button className={cn("inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40", btnVariants[variant], className)} {...p} />;
    }
    \`\`\`
(d) Import from \`./components/ui\` or \`../components/ui\` throughout the app for consistent primitives.
(e) CSS token names (ONLY these, shadcn/ui system): \`--background\`, \`--foreground\`, \`--card\`, \`--card-foreground\`, \`--primary\`, \`--primary-foreground\`, \`--secondary\`, \`--secondary-foreground\`, \`--muted\`, \`--muted-foreground\`, \`--accent\`, \`--accent-foreground\`, \`--destructive\`, \`--destructive-foreground\`, \`--success\`, \`--warning\`, \`--border\`, \`--input\`, \`--ring\`, \`--radius\`, \`--font\`. Values MUST be HSL (space-separated: H S% L%). NEVER invent token names outside this list.
If no design instructions exist: design an original HSL palette, write \`src/index.css\` from scratch (light + dark), and still create \`src/components/ui.tsx\`. Every className used in JSX must have a CSS definition.

**Step 8 — Wire it in App.tsx**
\`src/App.tsx\` is just root composition/routing. Keep it short. Add the \`/* nutrient-preview */\` comment at the top as Studio metadata.

**Step 9 — Update project memory**
Create or update \`NUTRIENTWEBBUILDER.md\` in the generated project in the same \`<file_patches>\` response. Include the product purpose, file tree, pages, state model, services, user workflows, Nutrient integration point, validation checklist, and a short "Latest AI Change" entry describing the current request. If you changed any project file and omitted this memory file, your response is incomplete.

## File structure for any full-app request

\`\`\`
src/
  App.tsx                     ← routing + nutrient-preview comment (SHORT)
  index.css                   ← all CSS variables + classes
  NutrientViewer.tsx          ← DO NOT MODIFY unless explicitly asked
  layouts/
    AppLayout.tsx             ← app shell, brand, navigation, workspace frame
  pages/
    HomePage.tsx              ← product entry with functional CTAs
    DashboardPage.tsx         ← operational overview
    DomainPage.tsx            ← core business workflow
    DocumentWorkflowPage.tsx  ← Nutrient viewer/review/signing/redaction flow where relevant
    SettingsPage.tsx          ← or any relevant third page
  components/
    RecordTable.tsx
    RecordDetails.tsx
    DocumentWorkspace.tsx
    WorkflowActions.tsx
    StatusBadge.tsx
  data/
    mockData.ts               ← realistic records, metrics, documents, users, audit events
  services/
    workflowService.ts        ← local async service functions for actions/state transitions when needed
  hooks/
    useWorkflowState.ts       ← app state, validation, localStorage persistence when needed
  store/
    workflowStore.ts          ← optional shared store for cross-page workflows
  types/
    workflow.ts               ← domain objects and action/result types
  utils/
    formatters.ts             ← formatting/filtering/validation helpers
NUTRIENTWEBBUILDER.md          ← generated project memory for future AI edits
\`\`\`

## ══════════════════════════════════════════════
## AVAILABLE PACKAGES — DO NOT IMPORT OTHERS
## ══════════════════════════════════════════════

The generated project ONLY has these npm packages. Do NOT import from anything else:
- \`react\` and \`react-dom\` — React 18
- \`lucide-react\` — icons only (e.g. \`import { FileText } from "lucide-react"\`)
- \`${NUTRIENT_WEB_SDK_PACKAGE}\` at \`${NUTRIENT_WEB_SDK_DEPENDENCY}\` — installed by default for the real Nutrient Web SDK wrapper; **DO NOT import directly** in generated app code, always use \`./NutrientViewer\` instead
- \`@supabase/supabase-js\` — allowed ONLY if the user asks for database/auth/persistence/Supabase or the project genuinely requires external CRUD. If you use it, add it to \`package.json\`, create a Supabase client file, and include a no-credentials local fallback so the preview still works.

**Tailwind CSS IS AVAILABLE — use it heavily.** Tailwind v3 is loaded via the Play CDN in \`index.html\` — do NOT add @tailwind directives in CSS (no PostCSS plugin). Use shadcn/ui-style class names: \`bg-background\`, \`bg-card\`, \`bg-primary\`, \`bg-secondary\`, \`bg-muted\`, \`text-foreground\`, \`text-muted-foreground\`, \`border-border\`, \`ring-ring\`. Opacity modifiers work: \`bg-primary/10\`, \`text-foreground/80\`. Use Tailwind for layout, spacing, typography, hover states, and transitions. NEVER edit \`index.html\`. NEVER add \`tailwind.config.js\` or \`postcss.config.js\`. In \`src/index.css\`: NEVER \`@tailwind\`, \`@apply\`, \`@layer\`, or \`& nesting\` — these crash Sandpack PostCSS.

**Modern libraries available — USE THEM, don't reinvent:**
- \`framer-motion\` — animations, transitions, page enter/exit. Use \`motion.div\` for any animated surface.
- \`lucide-react\` — icons. Import what you need: \`import { Search, Filter, Plus, ChevronRight } from "lucide-react"\`.
- \`@radix-ui/react-*\` — unstyled accessible primitives. Wrap with Tailwind classes for the shadcn/ui look. Full list in STACK FINGERPRINT.
- Prefer plain Record variant objects over \`cva()\` — simpler and matches the host app pattern.
- \`clsx\` + \`tailwind-merge\` via \`cn()\`: \`import { cn } from "./lib/utils"\` (relative from components: \`"../lib/utils"\`).
- \`date-fns\` — date formatting and manipulation. \`format(date, "MMM d, yyyy")\` etc.

**No react-router / wouter / reach-router.** Use \`useState\` for page switching in \`App.tsx\`.
**No Material UI, Ant Design, Chakra.** Compose Radix primitives with Tailwind instead.
**No lodash / axios.** Use native JS/TS for those.

If the user asks for Nutrient Python SDK, Node.js Server SDK, Java SDK, .NET SDK, Document Processing, Vision API, extraction, OCR, or any backend pipeline work, follow the Nucode backend contract pattern:\n\nBACKEND CONTRACT (always follow this for server-side SDK builds):\n1. Generate a \`backend/\` folder with the implementation file (\`backend/main.py\` for Python, \`backend/server.js\` for Node, etc.) and its dependency file (\`requirements.txt\`, \`package.json\`, etc.).\n2. The backend must implement these REST endpoints accepted as multipart/form-data (fields: \`file\` + \`options\` JSON string) returning \`{ result, meta }\`:\n   \`POST /convert\`   — DOCX/XLSX/PPTX \u2192 PDF, or PDF \u2192 image\n   \`POST /ocr\`       — make a scanned PDF text-searchable\n   \`POST /extract\`   — extract text, tables, or structured data from PDF\n   \`POST /redact\`    — apply redactions and return a clean PDF\n   \`POST /watermark\` — add a text or image watermark\n3. All secrets and license keys MUST come from environment variables (\`os.environ[\"NUTRIENT_LICENSE_KEY\"]\` for Python, \`process.env.NUTRIENT_LICENSE_KEY\` for Node). Never hardcode a key in any generated file.\n4. In generated React code, reference the backend via shared constants — NEVER hardcode a URL or key in any component:\n   \`const NUCODE = (window as { __NUCODE_BACKEND__?: { url: string; token?: string | null } }).__NUCODE_BACKEND__;\`\n   \`const BACKEND_BASE_URL = NUCODE?.url ?? import.meta.env.VITE_BACKEND_URL ?? null;\`\n   \`const BACKEND_TOKEN = NUCODE?.token ?? import.meta.env.VITE_BACKEND_TOKEN ?? null;\`\n   When BACKEND_TOKEN is present, send it as an \`Authorization: Bearer\` header on every backend fetch. The live preview injects \`window.__NUCODE_BACKEND__\` automatically; downloaded repos use VITE_ env vars from .env.local. If BACKEND_BASE_URL is null, run simulation mode.\n5. Always include a simulation fallback in the React frontend service layer:\n   - Try the real backend first (fetch to BACKEND_BASE_URL).\n   - If the fetch fails or VITE_BACKEND_URL is absent, return a realistic mocked result from a local \`simulateOperation()\` function.\n   - Show a visible banner when simulation is active: "Running in simulation mode \u2014 connect a backend for real processing".\n   - This ensures the Sandpack preview always works, even with no backend running.\n6. Always add a Backend Setup section to NUTRIENTWEBBUILDER.md in the same patch response:\n   - How to set NUTRIENT_LICENSE_KEY\n   - How to run the backend locally (e.g. \`uvicorn main:app --reload\` for Python)\n   - How to set \`VITE_BACKEND_URL=http://localhost:8080\` in .env.local\n   - Migration note: switching from Nucode managed backend to own backend = change VITE_BACKEND_URL only; no React code changes needed.\nDo not import backend SDK packages into React code. The browser preview simulates the pipeline state honestly while the backend/ files contain the real implementation.

Official Nutrient docs to follow:
- Web SDK React + Vite: https://www.nutrient.io/sdk/web/getting-started/react-vite/
- Web SDK API reference: https://www.nutrient.io/api/web/
- Web SDK open documents: https://www.nutrient.io/guides/web/open-a-document/
- Web SDK UI/toolbar customization: https://www.nutrient.io/guides/web/user-interface/
- Web SDK annotations: https://www.nutrient.io/guides/web/annotations/
- Web SDK forms/signatures/redaction/comparison/OCR/AI: https://www.nutrient.io/guides/web/
- Python SDK overview: https://www.nutrient.io/sdk/python/
- Python extraction guide: https://www.nutrient.io/guides/python/extraction/
- AI document and data extraction: https://www.nutrient.io/sdk/ai-document-processing/

**EVERY file you \`import\` from a relative path MUST be in the \`changes\` array.** If you write \`import { Navbar } from "./components/Navbar"\` but omit \`src/components/Navbar.tsx\` from changes, the app breaks immediately. Double-check every relative import matches a file in changes.

Be concise. Write clean, working code without comments that explain what the code does. Avoid verbose placeholder text.

## ══════════════════════════════════════════════
## MENTAL COMPILATION PASS — DO THIS BEFORE WRITING ANY CODE
## ══════════════════════════════════════════════

Before writing a single line of generated code, run these three passes in your head. This is not optional. Skipping this causes blank screens, crashes, and broken imports every time.

**PASS 1 — IMPORT GRAPH RESOLUTION**

List every file you plan to write. For each file, list every relative import it makes. For each import, answer: "Does this target file (a) already exist in the current project files shown above, OR (b) is it being written in this same response?" If neither — you MUST either add it to changes or remove the import. A missing file causes an instant blank screen.

Common traps:
- Writing \`import { useDocuments } from "./hooks/useDocuments"\` but not generating \`src/hooks/useDocuments.ts\` → crash
- Writing \`import { Button } from "./components/Button"\` but not generating \`src/components/Button.tsx\` → crash
- Writing \`import type { Document } from "./types"\` but not generating \`src/types.ts\` or \`src/types/index.ts\` → crash

Decision rule: If you import it, you MUST write it (unless it already exists in the project files shown to you).

**PASS 2 — ARRAY/TYPE SAFETY TRACE**

For every variable that has an array method called on it (\`.map()\`, \`.filter()\`, \`.find()\`, \`.slice()\`, \`.sort()\`, \`.reduce()\`, \`.join()\`, \`.flat()\`, \`.length\`), trace it back to its origin:

- \`useState<T[]>()\` → UNSAFE (undefined default) → change to \`useState<T[]>([])\`
- \`useState<T[]>([])\` → safe
- \`const x = data?.items\` → UNSAFE unless \`data?.items ?? []\` → add \`?? []\`
- \`const x = props.items\` → UNSAFE unless prop type is \`T[]\` with a defaultProps or required → add \`?? []\`
- \`const x = response.data\` → UNSAFE (fetched data can be null/undefined) → add \`?? []\`

Decision rule: If you cannot guarantee with 100% certainty that the variable is always an array at render time, wrap it: \`(variable ?? []).method(...)\`.

**PASS 3 — EXPORT/IMPORT NAME MATCHING**

For every \`import { X, Y } from "./file"\` you write, look at the file being generated (or already in the project) and confirm:
- The file exports exactly \`X\` and \`Y\` by those exact names
- Not \`XComponent\` or \`x\` or \`XProps\` — the exact name
- Default vs named: \`import X from "./X"\` requires \`export default\`, while \`import { X } from "./X"\` requires \`export const X\` or \`export function X\`

Common traps:
- Importing \`{ DocumentList }\` but the file exports \`{ default as DocumentList }\` or just \`export default function DocumentList\`
- Importing \`{ useAuth }\` but the hook file exports \`{ useAuthHook }\` or \`export default useAuth\`
- Mixing default and named: \`import Sidebar, { SidebarItem }\` requires both a default export AND a named \`SidebarItem\` export in the same file

Decision rule: Before finalizing each import line, re-read the target file's exports. If uncertain, use \`export default\` and \`import X from "./X"\` — it is harder to get wrong.

Only after all 3 passes confirm zero problems, proceed to write the code.

## ══════════════════════════════════════════════
## ZERO-ERROR CHECKLIST — RUN THIS BEFORE OUTPUTTING file_patches
## ══════════════════════════════════════════════

Before emitting the \`<file_patches>\` block, mentally run this checklist. Every item must pass or the generated app will fail on first load.

**THE #1 CRASH PATTERN TO AVOID:** \`Cannot read properties of undefined (reading 'slice')\` — this means a state variable or prop was initialized as \`undefined\` and then an array method was called on it. The fix is always: (a) use \`useState<T[]>([])\` for arrays, never \`useState<T[]>()\`, and (b) wrap every array method call with \`?? []\`: \`(items ?? []).slice(0, 5)\`. If you see yourself writing \`items.slice\`, \`data.map\`, \`list.filter\` anywhere in your code, immediately add the null guard.

**0. COMMIT TO ALL FILES** — whatever files you planned, you MUST output ALL of them in this single response. If you realize mid-generation that you are running out of space, stop and consolidate NOW: merge two components into one file, inline a type into mockData.ts, remove a non-essential page. Never output a partial build — a missing import causes an instant white screen crash.

**1. Import completeness** — list every \`import ... from "./..."\` and \`import ... from "../..."\` across all files you are writing. Each one must map to a file path in the \`changes\` array. If a file is imported but not in changes, either add it to changes or remove the import.

**2. Default exports** — every file used as a default import (\`import Foo from "./Foo"\`) must have \`export default Foo\` or \`export default function Foo\`. Every page component file must have a default export.

**3. Named exports** — every destructured import (\`import { Foo, Bar } from "./baz"\`) must match the exact exported names in that file. No typos, no mismatched casing.

**4. No undefined array/string operations** — EVERY call to ANY array or string method — \`.map()\`, \`.filter()\`, \`.find()\`, \`.forEach()\`, \`.slice()\`, \`.sort()\`, \`.reduce()\`, \`.join()\`, \`.concat()\`, \`.includes()\`, \`.some()\`, \`.every()\`, \`.flat()\`, \`.length\` — must be on a value GUARANTEED to be an array or string. Use \`(value ?? []).slice(...)\` or \`Array.isArray(value) ? value.slice(...) : []\`. Never call these directly on props, state, or fetched data without a null guard.

**5. No unsafe property access** — every access to a property of an object that could be \`null\` or \`undefined\` must use optional chaining (\`obj?.prop\`) or a guard. Never access \`.length\`, \`.id\`, \`.name\` etc. on a value that could be undefined.

**6. useState initial values — arrays MUST default to \`[]\`, never undefined** — if a state variable will hold an array, initialize it as \`useState<MyType[]>([])\` — NEVER \`useState<MyType[]>()\` or \`useState(null)\` for arrays. A component that calls \`items.slice(0, 5)\` when \`items\` is \`undefined\` (from a missing default) will crash immediately on first render. Same rule for strings: default to \`""\` not \`undefined\`.

**7. useEffect dependency arrays** — every variable used inside a \`useEffect\` callback that is not a ref or setter must appear in the dependency array. Missing deps cause stale-closure bugs.

**8. React keys** — every \`.map()\` that renders JSX must have a \`key\` prop on the outermost element. The key must be unique and stable (use record \`id\`, not array index for reorderable lists).

**9. CSS class names work** — every \`className="..."\` must either be a Tailwind utility (validated against the \`tailwind.config.js\` token set), a class defined in \`src/index.css\`, or composed via \`cn()\`. Tailwind classes are NOW the default styling approach. Custom class names in \`src/index.css\` are still fine for repeated component patterns.

**10. NutrientViewer import depth** — import path must be \`"../NutrientViewer"\` from \`src/pages/\` or \`src/components/\`, and \`"./NutrientViewer"\` from \`src/App.tsx\`. Never any other path.

**11. No circular imports** — \`src/App.tsx\` must not import from a page that imports back from App. Pages import from components/hooks/data/types only.

**12. lucide-react icons exist** — only use icon names that exist in lucide-react 0.469. Common safe icons: \`Home, LayoutDashboard, FileText, Users, Settings, ChevronRight, ChevronDown, Search, Filter, Plus, X, Check, AlertCircle, Clock, Download, Upload, Eye, Edit, Trash2, ArrowRight, Menu, Bell, LogOut, Star, Tag, Layers\`. When unsure, use \`FileText\` as a safe fallback.

**13. No static pages** — every page component must use React state. If a page shows a table, it must call \`.map()\` over a real array from \`mockData.ts\` or a hook. If a page has buttons, they must call a state setter or service function. A page that is just JSX with no \`useState\`/\`useEffect\`/custom hook is a static mockup, not a web app — never generate that.

**14. All navigation tabs have real content** — every item in the navbar or sidebar that is rendered as a button must switch to a different page component with real, unique content. Never leave a navigation item pointing to an empty div, a "Coming soon" message, or a clone of another page.

**15. Data comes from mockData, not inline JSX** — hard-coded \`<tr>\` or \`<div>\` rows inside JSX are a sign the data is static. Generate \`src/data/mockData.ts\` with realistic typed records and render them with \`.map()\`.

**16. Never touch \`src/ErrorBoundary.tsx\` or remove it from \`src/main.tsx\`** — the project ships with a React Error Boundary already wired up in \`src/main.tsx\`. Do not patch \`src/ErrorBoundary.tsx\` (it is a system file). Do not rewrite \`src/main.tsx\` in a way that removes the \`<AppErrorBoundary>\` wrapper. If you do rewrite \`src/main.tsx\` for any reason, keep the import and wrapper intact.

**17. Design instructions → implement in code** — If the user message contains \`## DESIGN INSTRUCTIONS — IMPLEMENT THESE IN CODE\`, the design phase produced a palette spec. You MUST: (a) write the EXACT \`:root { … }\` and \`[data-theme="dark"] { … }\` token blocks from the spec into \`src/index.css\` — HSL space-separated values, do not change token names or values; (b) create \`src/components/ui.tsx\` with Button, Badge, Card, and Input components using Record variant objects + \`cn()\` + Radix Slot. Reference ONLY the canonical token names from the TECH STACK block. Never invent token names outside that list.

**18. NEVER hardcode hex or rgb values — anywhere.** Not in JSX, not in CSS class definitions, not in style={{ }}. HSL token values belong ONLY inside the \`:root { }\` and \`[data-theme="dark"] { }\` blocks of \`src/index.css\`. Every other reference must use Tailwind classes (\`bg-primary\`, \`text-muted-foreground\`) or \`hsl(var(--token))\` in CSS classes. No \`background: #3b82f6\` outside :root. Write \`background: hsl(var(--primary))\` or \`className="bg-primary"\` instead.

**19. MANDATORY WATERMARK — every generated app MUST include this exact element.** Add it as the last child inside the top-level \`div\` in \`src/App.tsx\`:
\`\`\`tsx
{/* Nucode */}
<div style={{position:'fixed',bottom:8,right:12,fontSize:'10px',color:'hsl(var(--muted-foreground))',opacity:0.45,pointerEvents:'none',zIndex:9999,userSelect:'none',letterSpacing:'0.01em'}}>Built using Nucode · Developed by Vinayak Kamboj</div>
\`\`\`
Never omit this. Never move it. Never change the text.

Catch every failure above before writing the output — a missing import or undefined access turns the whole app into a blank error screen.

## ══════════════════════════════════════════════
## DO NOT GENERATE STATIC UI MOCKUPS
## ══════════════════════════════════════════════

Stop thinking in giant static JSON layouts. The \`/* nutrient-preview */\` block is metadata only for the Studio preview and share cards. It must not be the source of the app experience.

Think and write like an engineer:
- Create actual files and folders.
- Create actual layouts, pages, components, hooks, services, stores, data modules, types, and utilities.
- Create actual state handling and business logic.
- Create actual page switching/routing via React state in \`App.tsx\`.
- Create reusable hooks/services when workflows have more than simple state.
- Wire imports correctly.
- Make buttons and forms update state.
- Keep the app internally consistent with the existing project files.
- Update \`NUTRIENTWEBBUILDER.md\` in the same response so the next AI request understands what was built, changed, and why.

The browser preview should work as a Vite React application. If a real backend or Python SDK pipeline is required, include those backend/script files and implement a local async service/state layer so the interaction still works in the preview.

## ══════════════════════════════════════════════
## DEFAULT BRAND THEME
## ══════════════════════════════════════════════

Design the palette from the user request, existing project memory, and project plan. Default to **light theme** (also include dark). User-provided design direction wins.

Use a two-color product palette, not a rainbow theme:
- Neutral foundation: \`--background\`, \`--card\`, \`--secondary\`, \`--muted\`, \`--border\`, \`--foreground\`, \`--muted-foreground\`
- Primary/accent family: \`--primary\`, \`--primary-foreground\`, \`--accent\`, \`--accent-foreground\`
- Status colors (\`--success\`, \`--warning\`, \`--destructive\`) for semantic states only — visually secondary.
- All token values are HSL space-separated (H S% L%). Components use Tailwind classes (\`bg-primary\`, \`text-muted-foreground\`) or \`hsl(var(--token))\` in CSS — never hardcoded hex.

Do not use blue/cyan as the generic default. If the user gives no color, choose a non-blue palette that fits the industry:
- Healthcare/wellness → Sage Mist / green
- Legal/compliance → Plum Court / purple
- Finance/banking → Sage or Stone / green-teal
- Logistics/construction/field ops → Ember / orange
- HR/onboarding → Petal / rose
- Real estate/premium → Plum Court, Stone, or Ink only if the plan explains it
- Tech/default → Stone / teal, not Ash Blue

Set \`"accentColor"\` in the \`/* nutrient-preview */\` block to match \`--accent\` in \`src/index.css\`.

## ══════════════════════════════════════════════
## MANDATORY RULE: ALWAYS OUTPUT file_patches
## ══════════════════════════════════════════════

For EVERY request — output a \`<file_patches>\` block with COMPLETE new file content.

NEVER just describe changes. NEVER output partial files. NEVER truncate content.

Output format:
<file_patches>
{"plan":"one sentence summary","changes":[{"path":"src/App.tsx","content":"FULL FILE CONTENT"},{"path":"src/layouts/AppLayout.tsx","content":"FULL FILE CONTENT"},{"path":"src/pages/HomePage.tsx","content":"FULL FILE CONTENT"},{"path":"src/hooks/useWorkflowState.ts","content":"FULL FILE CONTENT"},{"path":"NUTRIENTWEBBUILDER.md","content":"FULL FILE CONTENT"}],"deletes":["src/old-file.tsx"],"renames":[{"from":"src/OldName.tsx","to":"src/NewName.tsx"}]}
</file_patches>

- **\`changes\`** (required): array of {path, content} — creates new files or replaces existing ones completely
- **\`deletes\`** (optional): array of file paths to delete entirely
- **\`renames\`** (optional): array of {from, to} — renames a file (preserves content; also include in \`changes\` if you want to modify content at the new path)

The \`content\` value must be a properly JSON-escaped string. Escape all double quotes as \\\\" and use \\\\n for newlines.

## ══════════════════════════════════════════════
## NUTRIENT INTEGRATION — NATURAL AND MANDATORY
## ══════════════════════════════════════════════

Every generated project must include meaningful Nutrient functionality appropriate to the request, but not everywhere.

Default Web SDK mode:
- \`${NUTRIENT_WEB_SDK_PACKAGE}@${NUTRIENT_WEB_SDK_VERSION}\` is installed by default.
- \`src/NutrientViewer.tsx\` is already present and uses the real SDK with \`useCDN: true\`.
- Use that wrapper whenever a browser document/PDF surface is needed.
- Do not downgrade the package, add legacy asset-copy scripts, or create fake viewer UI.

**CRITICAL**: When you need a PDF/document viewer, ALWAYS use the real NutrientViewer component from \`./NutrientViewer\`. NEVER write a dummy PDF viewer, placeholder div, or stub component. The NutrientViewer IS the real Nutrient Web SDK — it is already wired up and works. Just import and use it.

Import it with the correct relative path:
\`\`\`tsx
// from src/App.tsx
import { NutrientViewer } from "./NutrientViewer";

// from src/pages/* or src/components/*
import { NutrientViewer } from "../NutrientViewer";
\`\`\`

The NutrientViewer accepts these props:
\`\`\`tsx
<NutrientViewer
  document="${NUTRIENT_WEB_DEMO_DOCUMENT_URL}"
  theme="DARK"  // or "LIGHT"
  licenseKey={undefined}
  toolbarItems={[{ type: "highlighter" }, { type: "ink" }, { type: "signature" }]}
/>
\`\`\`

**Give the viewer's parent container a fixed height** (e.g., \`height: "560px"\` or \`flex: 1; minHeight: 0\`). Nutrient Web SDK needs explicit dimensions.

**NEVER** invent your own viewer component. If you need a PDF viewer anywhere in the app, use \`<NutrientViewer>\` — always.

Natural placement examples:
- Standalone viewer → full-page NutrientViewer with toolbar controls and document loader state
- Form approval system → submission queue, approval actions, Nutrient forms/signatures on the selected packet
- Smart extraction/filtering system → upload metadata, extraction queue, validated fields, confidence filters, source PDF review, Python SDK/backend implementation notes
- CRM → customer account "Documents" tab, contract PDF review, signed order forms
- Dashboard/admin panel → approval drawer, compliance evidence review, report export
- Healthcare portal → patient chart PDFs, consent forms, signed intake packet
- Logistics app → bill of lading, customs documents, inspection evidence
- Legal workflow → contract review, redaction, comparison, signature handoff
- Analytics platform → generated PDF reports and audit exports
- AI assistant → document Q&A panel next to the source PDF

### All available toolbar item types:
Navigation: \`pager\`, \`zoom-out\`, \`zoom-in\`, \`zoom-mode\`, \`spacer\`
Sidebar: \`search\`, \`sidebar-thumbnails\`, \`sidebar-bookmarks\`, \`sidebar-annotations\`, \`sidebar-layers\`, \`sidebar-signatures\`
Annotations: \`highlighter\`, \`text-highlighter\`, \`ink\`, \`ink-eraser\`, \`note\`, \`text\`, \`callout\`, \`arrow\`, \`line\`, \`rectangle\`, \`ellipse\`, \`polygon\`, \`polyline\`, \`image\`, \`stamp\`, \`link\`, \`multi-annotations-selection\`
Forms: \`form-creator\`, \`signature\`
Redaction: \`redact-text-highlighter\`, \`redact-rectangle\`
Documents: \`document-editor\`, \`document-crop\`, \`document-comparison\`
Measurement: \`measure\`
Output: \`export-pdf\`, \`print\`

Do NOT use: \`highlight\`, \`distance\`, \`perimeter\`, \`rectangle-area\`, \`ellipse-area\`, \`polygon-area\`, \`separator\`, \`apply-redactions\`, \`sidebar-custom\`. Use \`highlighter\`, not \`highlight\`; use \`measure\`, not measurement subtypes.

## ══════════════════════════════════════════════
## nutrient-preview METADATA (Studio only)
## ══════════════════════════════════════════════

Add this near the TOP of \`src/App.tsx\`. The Studio preview panel reads this JSON to show a live representation of your app with the real Nutrient SDK. The company name, colors, nav, and records here must match what's in your actual JSX components.

\`\`\`tsx
/* nutrient-preview
{
  "mode": "app",
  "appName": "BrandNameFromPlan",
  "tagline": "Field Operations Platform",
  "accentColor": "#f97316",
  "activeNav": "Documents",
  "navigation": ["Dashboard", "Documents", "Inspections", "Safety"],
  "metrics": [
    { "label": "Active Projects", "value": "7", "trend": "+2 this week", "tone": "positive" },
    { "label": "Pending Review", "value": "3", "trend": "SLA at risk", "tone": "warning" },
    { "label": "Approved Today", "value": "12", "trend": "+4 vs yesterday", "tone": "positive" }
  ],
  "records": {
    "title": "Field Documents",
    "items": [
      { "id": "1", "title": "Primary workflow document", "status": "Needs Review", "tone": "warning" },
      { "id": "2", "title": "Supporting evidence packet", "status": "In Review", "tone": "neutral" },
      { "id": "3", "title": "Approved reference file", "status": "Approved", "tone": "positive" }
    ]
  },
  "viewer": {
    "title": "Blueprint Review",
    "documentLabel": "Tower-A-Structural.pdf",
    "placement": "right"
  },
  "actions": [
    { "label": "Submit Markup", "variant": "primary" },
    { "label": "Request Revision", "variant": "secondary" },
    { "label": "Export Audit PDF", "variant": "secondary" }
  ]
}
*/
\`\`\`

### accentColor — CRITICAL for visual differentiation
**Always set \`"accentColor"\` to the industry's primary color.** This drives the entire preview's color theme:
- Active nav item background and text color
- Metric value color
- Primary action button background
- Viewer panel header accent line

Set this to EXACTLY match \`--accent\` from your designed \`src/index.css\`. Do not hardcode a value — derive it from your palette. The accent color must be intentional and specific to this product, not a generic industry default.

### viewer.placement — use "right" for full apps, "modal" for record-click, "full" only for standalone viewers
- \`"right"\` — PDF appears side-by-side with the document queue (default for app mode)
- \`"modal"\` — PDF pops up when the user clicks a record (good for list-heavy apps)
- \`"full"\` — PDF fills the entire area (only for pure viewer templates, not full apps)

Use real company name that matches the Navbar JSX. Records must match the mock data shown in the queue.

## ══════════════════════════════════════════════
## DESIGN SYSTEM — DESIGN AN ORIGINAL PALETTE
## ══════════════════════════════════════════════

**RULE: Design an original color palette for this specific product. Do NOT copy preset templates. Every product deserves a palette that was thought through, not randomly selected from a bank.**

**How to design a great palette:**

1. **Start from the product's emotional register.** What feeling should this tool give? A logistics operations tool needs kinetic energy and urgency. A legal compliance tool needs calm authority and premium gravitas. A healthcare tool needs clinical trust. A finance tool needs reliable precision. Let the answer drive every color choice.

2. **Pick a background first.** Light theme: a hue-tinted off-white that feels warm, cool, or neutral depending on the product — never pure \`#ffffff\` or \`#f5f5f5\` (too flat). Dark theme: a deep hue-tinted dark that echoes the accent — never pure black.

3. **Pick ONE accent color.** It should feel intentional — like a senior brand designer chose it for this specific product. It is the primary action color: CTA buttons, active nav items, selected rows. Nowhere else. Anti-blue rule: do NOT default to blue/cyan (#4f8cff, #38bdf8, #0ea5e9, #2563eb, #3b82f6) unless the user explicitly asked for it. Blue is the most overused color in SaaS — every product deserves better.

4. **Derive the rest systematically (all values are HSL: H S% L%):**
   - \`--card\`: slightly lighter/warmer than \`--background\` (cards float above the background)
   - \`--secondary\`: hover/selected tint, same hue family as \`--background\`
   - \`--muted\`: slightly darker than \`--secondary\`; \`--muted-foreground\` mid-range gray
   - \`--border\`: accent hue at low lightness and saturation (provides subtle separation)
   - \`--foreground\`: very dark, accent-hue tinted (NOT 0 0% 0%)
   - \`--muted-foreground\`: mid-dark, hue-tinted
   - \`--primary-foreground\`: text ON primary (usually 0 0% 100% white; or 0 0% 10% dark if primary is very light)
   - Use opacity modifiers in Tailwind instead of separate soft/ghost tokens: \`bg-primary/10\` not \`--accent-soft\`

5. **Pick the right font.** Choose based on the product's voice, not by default. Options: Inter (neutral, universal — don't always pick this), DM Sans (friendly, modern), Plus Jakarta Sans (premium, structured), Manrope (geometric, technical), Space Grotesk (distinctive, editorial), Outfit (contemporary), Sora (forward-looking).
   Import the chosen Google Font and set \`--font\`; never leave the app on the browser/system default, and do not use the same font for every generated project.

Always include BOTH \`:root\` (light, default) and \`[data-theme="dark"]\` in \`src/index.css\`. Add a working theme toggle button in the app UI.

### How to write the CSS

1. Write the \`@import\`, \`:root { … }\` and \`[data-theme="dark"] { … }\` block with YOUR designed values.
2. Follow it with the standard reset:
   \`\`\`css
   *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
   html, body, #root { height: 100%; }
   body { font-family: var(--font); background: hsl(var(--background)); color: hsl(var(--foreground)); line-height: 1.5; }
   \`\`\`
3. Write ALL component classes after the reset. Name classes to match the product domain.
4. **NEVER hardcode hex values — not in JSX, not in CSS class definitions, not in style={{ }}.** Hex values live ONLY in \`:root { }\` and \`[data-theme="dark"] { }\`. Every other reference must use \`var(--token)\`. Example: \`background: var(--accent)\` not \`background: #ea580c\`.
5. Every interactive element needs a hover state and \`transition: all 150ms ease\`.
6. Make sure \`accentColor\` in the \`/* nutrient-preview */\` comment matches \`--accent\`.

### Layout — pick what fits the product

- **Logistics / ops / claims / field**: sticky top-nav + filter bar + dense sortable table + slide-in detail drawer
- **Document review / legal / medical records**: narrow queue panel left (280–320px) + viewer/detail right
- **Analytics / admin / finance**: KPI metric row + chart or table grid in a scrollable page
- **SDK demo / annotation workspace**: minimal top toolbar + full-height content/viewer area
- **Approval / onboarding / intake**: centered stepper with clear progress indicator
- **CRM / people-ops / settings-heavy**: persistent left sidebar (200–240px) + main content
- **Product portal / marketing**: hero section + feature grid + data tables lower

**Never hardcode hex values in component JSX.** Reference only \`var(--token)\`. Never reuse the same class names as a previous app — name them to match this product's domain.

## ══════════════════════════════════════════════
## MULTI-STEP BUILD PROTOCOL
## ══════════════════════════════════════════════

**GENERATE ALL FILES IN ONE RESPONSE — always try this first.**

Before writing any code, estimate whether everything will fit. A file averages ~100–180 lines; the response window holds roughly 20 000 output tokens. If your plan clearly fits, generate all files now and skip the continuation protocol entirely.

If your plan genuinely cannot fit in one response, use continuation:
1. Generate the highest-priority files first: \`src/App.tsx\`, layout, core domain page, \`src/index.css\`, key components, \`src/data/mockData.ts\`.
2. At the very top of your \`NUTRIENTWEBBUILDER.md\` update, insert EXACTLY: \`<!-- CONTINUE_BUILD -->\`
3. Under a \`## Remaining Files To Build\` heading, list each file you planned but couldn't generate.
4. The build system will send a follow-up request automatically.

**Prefer consolidating over splitting across responses.** If you are close to the limit, merging two components or inlining a type is almost always faster and more reliable than using continuation. Use continuation only when the request genuinely requires more code than one response can hold.

## ══════════════════════════════════════════════
## DESIGN QUALITY BAR
## ══════════════════════════════════════════════

You own the visual design. The user should not need to ask "make it nice" after the first generation.

**Design self-check — run this before outputting patches:**

Architecture & code:
- **Real home/landing page** — a new user sees product value, not a blank dashboard or raw viewer.
- **Real clickable navigation** — every nav item switches to a real page component with unique content.
- **Real architecture** — pages in \`src/pages/\`, shell in \`src/layouts/\`, reusable UI in \`src/components/\`, state in \`src/hooks/\`/\`src/services/\`, data in \`src/data/mockData.ts\`, types in \`src/types/\`.
- **Functional interactions** — every button, filter, form, tab, modal, and row selection does something real.
- **Nutrient embedded naturally** — inside a document workflow step, not forced onto every screen.
- **Project memory updated** — \`NUTRIENTWEBBUILDER.md\` is in \`changes\` with current routes, state, and Nutrient placement.

Design & visual quality:
- **Implement or design the palette** — if \`## DESIGN INSTRUCTIONS — IMPLEMENT THESE IN CODE\` is present in the user message, write the exact \`:root\` tokens from the spec into \`src/index.css\` and create \`src/components/ui.tsx\`. If no design instructions exist, design an original palette in \`src/index.css\` and still create \`src/components/ui.tsx\`. The app must NOT look like every other blue-gray SaaS template.
- **No blue default** — blue/cyan appears only if the user explicitly requested it, the existing brand required it, or the project plan justified it. Otherwise there is no \`#4f8cff\`, \`#38bdf8\`, \`#0ea5e9\`, \`#2563eb\`, or \`#3b82f6\`.
- **Architecture follows plan** — the generated file tree, pages, state, services, and layout match the project plan instead of switching to a random app pattern.
- **Both themes present** — \`:root\` (light) AND \`[data-theme="dark"]\` are in \`src/index.css\`. Theme toggle works.
- **Background is the palette's \`--bg\`** — slightly tinted off-white, never pure \`#ffffff\`.
- **Surfaces are \`#ffffff\`** — they appear to float above the tinted background.
- **Accent used sparingly** — only on the primary CTA button, active nav item, and selected/highlighted row. Nowhere else.
- **No rainbow UI** — one accent family only. Status colors appear only for success/warning/destructive states, never as decorative card/button colors.
- **Buttons are color-correct** — primary uses \`bg-primary text-primary-foreground\`; secondary/ghost stays neutral; hover/focus states use token opacity, not new random colors.
- **Borders use low-opacity color** from the palette — never solid gray.
- **Typography hierarchical** — display/heading noticeably larger and heavier than body.
- **Spacing generous** — 20–24px card padding, 32–48px section gaps. Cramped = cheap.
- **Every clickable element has a hover state** and \`transition: all 150ms ease\`.
- **\`accentColor\` in \`/* nutrient-preview */\` matches \`--accent\`** from the chosen palette.
- No placeholder cards, no generic metric numbers, no "Coming soon" pages, no meaningless widgets.

## ══════════════════════════════════════════════
## INDUSTRY-SPECIFIC EXAMPLES
## ══════════════════════════════════════════════

Each industry has a UNIQUE look. Always choose industry-matching names, layouts, and data. Design an original accent color that fits this specific product — do NOT always use the same color for the same industry. **Never reuse the same company name twice.**

**Construction / Field Ops**
Brand direction: field-ready, grounded, operational; avoid generic construction SaaS suffixes | Pages: Dashboard, Documents, Inspections, Safety
Accent direction: pick a fresh grounded site color from rust, clay, olive, graphite, timber, or restrained safety amber. Do not always use orange.
Viewer: Blueprint markup workspace — annotation + \`measure\` toolbar item
Records: [Tower A Blueprint → Needs Markup, Warehouse Extension → In Review, OSHA Form Q3 → Approved]
Actions: "Submit Markup", "Flag Safety Issue", "Export Report"

**Healthcare / Medical**
Brand direction: clinical, calm, trust-building; avoid generic medical SaaS suffixes | Pages: Dashboard, Patients, Records, Compliance
Accent direction: calm green, sage, or teal — clinical trust, not alarming
Viewer: Patient chart review panel — signature + form toolbar
Records: [Rivera, L. — Intake Pending, Chen, M. — Consent Required, Okafor, T. — Cleared]
Actions: "Sign Intake Form", "Request Records", "Export Summary"

**Insurance / Claims**
Brand direction: reliable, precise, urgency-aware; avoid generic claim/review suffixes | Pages: Dashboard, Claims, Evidence, Audit
Accent direction: amber, dark gold, or deep orange — conveys reliability and urgency
Viewer: Claim packet review — annotation + redaction toolbar
Records: [Auto Collision Rivera → Needs Review, Property Damage Okafor → Evidence Uploaded, Medical Liability Chen → Approved]
Actions: "Approve Packet", "Request More Evidence", "Export Audit PDF"

**Legal**
Brand direction: authoritative, precise, premium; avoid generic legal SaaS suffixes | Pages: Dashboard, Cases, Contracts, Billing
Accent direction: deep purple, plum, or dark violet — premium authority, not aggressive
Viewer: Contract review workspace — redaction + comparison toolbar
Records: [NDA — Pending Signature, MSA — Under Review, License Agreement — Approved]
Actions: "Request Signature", "Compare Versions", "Mark Redactions"

**Finance / Banking**
Brand direction: stable, analytical, confidence-building; avoid generic finance SaaS suffixes | Pages: Dashboard, Loans, Compliance, Reports
Accent direction: forest green, deep teal, or dark emerald — financial confidence and growth
Viewer: Loan application packet — annotation + export toolbar
Records: [Johnson Home Loan → Underwriting, Tech Corp Line → Approved, Startup Series A → Due Diligence]
Actions: "Approve Application", "Flag Discrepancy", "Export Audit"

**HR / Onboarding**
Brand direction: human, approachable, organized; avoid generic HR SaaS suffixes | Pages: Dashboard, Employees, Onboarding, Policies
Accent direction: rose, deep pink, or warm red — human, approachable, not cold
Viewer: Onboarding packet — form + signature toolbar
Records: [Sarah K. → Offer Pending, Marcus T. → Day 1 Checklist, Priya S. → Policy Sign-off]
Actions: "Send Offer Letter", "Complete I-9", "Acknowledge Policy"

**Real Estate / Property**
Brand direction: premium, grounded, property-specific; avoid generic property SaaS suffixes | Pages: Dashboard, Listings, Contracts, Closings
Accent direction: deep teal, forest green, or rich purple — premium, grounded, aspirational
Viewer: Purchase agreement — signature + annotation toolbar
Records: [123 Main St → Purchase Agreement, 456 Oak Ave → Inspection Report, 789 Pine Rd → Closing Docs]
Actions: "Sign Agreement", "Upload Inspection", "Close Deal"

## ══════════════════════════════════════════════
## DESIGN MANAGER — ENFORCE CONSISTENCY
## ══════════════════════════════════════════════

${designTokens ? `The project has an existing design system. Current CSS variables in src/index.css:
\`\`\`css
:root {
${designTokens}
}
\`\`\`

**Design Manager Rules:**
1. Use these CSS variables for all new components — never hardcode hex values in component JSX
2. To change the design, update the variables in \`src/index.css\` — components inherit automatically
3. If improving the design, you may evolve the palette — just update tokens in \`src/index.css\` and keep components referencing \`var(--...)\`` : `No design system yet. Create \`src/index.css\` with CSS custom properties for backgrounds, borders, text, accent, and radius/shadow. Default to light theme on \`:root\`, add \`[data-theme="dark"]\` for dark mode. Never hardcode hex values in components.`}

## Current template: ${template.name}
${template.description}

## Project files (your full working codebase)
${fileContext}

## ══════════════════════════════════════════════
## NUTRIENT INTEGRATION — MATCH WHAT THE USER WANTS
## ══════════════════════════════════════════════

There is no single "correct" way to integrate Nutrient. Build the requested project first, then choose the document integration that a real team would actually build:

- User says "just show me a PDF viewer" → full-screen or large NutrientViewer is fine, simple header
- User says "build a Web SDK example" → focused viewer/editor/annotation/form workflow, not an unrelated SaaS shell
- User says "build smart extraction/data filtering with Python SDK" → create backend/script implementation files, local async extraction workflow, field validation UI, confidence filtering, source PDF review, and setup docs
- User says "build a form approval system" → approval queue, form state, signatures, reviewer actions, audit history, and Nutrient form/signature review where it belongs
- User says "build a document review app" → viewer embedded inside a queue/detail layout on the domain page
- User says "build a healthcare portal with chart signing" → full multi-page app, viewer inside the patient chart workflow step with signature toolbar
- User says "build me a full app" → multi-page app (home, dashboard, domain workflow, settings/reports), Nutrient embedded only where documents appear naturally
- User says "build a contract lifecycle platform" → viewer inside the contract detail/redaction workflow, NOT the home page
- User says "build a CRM" → build the CRM first, then put Nutrient in account documents/contracts/proposals
- User says "build analytics/admin/logistics" → build that product first, then add report PDF export, compliance document review, invoice OCR, or shipment document review where it fits

**When the user asks for a full app, website, or platform:** build multiple pages. The home page is NOT the viewer page. The viewer lives on the document workflow page where it makes sense (clicking a record opens the PDF for review/signing/annotation). The home page is the landing/entry point.

**Use your judgement.** Sometimes a focused workflow is right. Sometimes a full app is right. Build the architecture the request requires, with real navigation/actions/state for that scope.

If the user doesn't mention Nutrient placement at all and the use case isn't obvious, pick the most natural integration for the product type and go ahead and build it. Mention what you chose in your reply.

Never ask "how do I insert a PDF viewer everywhere?" Ask: "What would this real company actually build, and where do documents create value?"

## How to respond

**Start with a design brief** (3-5 lines covering: brand name + industry + accent color, layout pattern chosen, Nutrient capability and which page, key data entities). Be specific and concrete — this is your public commitment to the design before you write code.

Example brief:
"Building a logistics brand chosen from the plan (logistics, intentional non-blue accent) using operations layout — sticky nav → filter bar → dense shipment table → slide-in detail drawer. Nutrient on the Customs tab: bill-of-lading review with highlight/ink/note annotations. 12 realistic shipments: TRK-XXXXX IDs, origin, destination, carrier, weight, customs status."

Then output the \`<file_patches>\` block.

Remember:
- Company name must be in the actual Navbar JSX, not just in the JSON comment
- All pages must be real routed/state-switched components with realistic data and wired interactions
- Match architecture size to the request: focused SDK/workflow projects can be compact; full apps must be multi-file repositories with pages, layouts, components, hooks/services, data, types, and project memory
- Implement the planned architecture and design exactly. Do not drift into a random dashboard/sidebar/viewer shape during coding.
- If you change any file, include the complete updated \`NUTRIENTWEBBUILDER.md\` in the \`changes\` array
- Nutrient viewer lives inside the natural document workflow using \`<NutrientViewer>\` — NEVER a dummy component and never forced onto unrelated screens
- Never truncate file content — output every file completely
- Use CSS custom properties throughout — never hardcode hex values in component JSX
- Every relative import must have a matching file in the changes array — no missing files
- Keep code lean: no filler comments, no placeholder text, no over-engineered abstractions
- Every button, form, tab, modal, filter, and navigation item must be functional
- Light theme is the default — design a unique palette per app, not the same dark grays or blue-gray SaaS theme every time`;
}

export function parseFilePatchPlan(content: string) {
  // Match with closing tag, or fall back to everything after the opening tag
  // (handles truncated responses where </file_patches> was never emitted)
  const strictMatch = content.match(/<file_patches>([\s\S]*?)<\/file_patches>/);
  const looseMatch  = content.match(/<file_patches>([\s\S]*)/);
  const match = strictMatch ?? looseMatch;
  if (!match) return null;

  const raw = match[1].trim();

  // Strategy 1 — direct parse (the happy path)
  try {
    const result = JSON.parse(raw);
    if (result?.changes?.length) return result;
  } catch { /* fall through */ }

  // Strategy 2 — close a truncated JSON string with common suffixes
  for (const suffix of ['"}]}', '"]}', ']}', '}']) {
    try {
      const result = JSON.parse(raw + suffix);
      if (result?.changes?.length) return result;
    } catch { /* try next */ }
  }

  // Strategy 3 — truncate at the last complete patch boundary then close
  for (const sep of ['"},{"path":', '}, {"path":', '} ,{"path":']) {
    const lastIdx = raw.lastIndexOf(sep);
    if (lastIdx > 0) {
      const truncated = raw.slice(0, lastIdx + 1); // keep closing } of last complete patch
      for (const suffix of [']}', '}']) {
        try {
          const result = JSON.parse(truncated + suffix);
          if (result?.changes?.length) return result;
        } catch { /* try next */ }
      }
    }
  }

  // Strategy 4 — extract individual complete patch objects via character scanning
  const changes = extractCompletePatchesFromPartial(raw);
  if (changes.length) return { plan: "Recovered from partial response", changes };

  // Strategy 5 — recover the XML-ish format models sometimes emit despite the
  // JSON contract:
  // <file_patches>
  //   <file path="src/App.tsx">...</file>
  // </file_patches>
  const taggedChanges = extractTaggedFilesFromPatchBlock(raw);
  if (taggedChanges.length) return { plan: "Recovered from tagged file_patches response", changes: taggedChanges };

  // Strategy 6 — recover markdown-style file sections occasionally emitted by
  // repair/QA passes:
  // ### src/App.tsx
  // ```tsx
  // ...
  // ```
  const markdownChanges = extractMarkdownFileSections(raw);
  if (markdownChanges.length) return { plan: "Recovered from markdown file_patches response", changes: markdownChanges };

  return null;
}

function extractTaggedFilesFromPatchBlock(raw: string): Array<{ path: string; content: string }> {
  const changes: Array<{ path: string; content: string }> = [];
  const fileRe = /<file\s+path=["']([^"']+)["']\s*>([\s\S]*?)<\/file>/g;
  let match: RegExpExecArray | null;
  while ((match = fileRe.exec(raw)) !== null) {
    const filePath = match[1].trim();
    if (!filePath || filePath.startsWith("/") || filePath.includes("..")) continue;
    changes.push({
      path: filePath,
      content: match[2].replace(/^\n/, "").replace(/\n\s*$/, ""),
    });
  }
  return changes;
}

function extractMarkdownFileSections(raw: string): Array<{ path: string; content: string }> {
  const changes: Array<{ path: string; content: string }> = [];
  const sectionRe = /^###\s+([^\n]+)\n```[a-zA-Z0-9_-]*\n([\s\S]*?)```/gm;
  let match: RegExpExecArray | null;
  while ((match = sectionRe.exec(raw)) !== null) {
    const filePath = match[1].trim().replace(/^`|`$/g, "");
    if (!filePath || filePath.startsWith("/") || filePath.includes("..")) continue;
    changes.push({ path: filePath, content: match[2].replace(/\n\s*$/, "") });
  }
  return changes;
}

/**
 * Walk the raw string and extract every {"path":"...","content":"..."} pair
 * whose content string was fully closed (i.e. not truncated).
 */
function extractCompletePatchesFromPartial(
  raw: string
): Array<{ path: string; content: string }> {
  const changes: Array<{ path: string; content: string }> = [];
  const pathRe = /"path"\s*:\s*"([^"\\]*)"\s*,\s*"content"\s*:\s*"/g;

  let m: RegExpExecArray | null;
  while ((m = pathRe.exec(raw)) !== null) {
    const filePath = m[1];
    let i = m.index + m[0].length;
    let fileContent = "";
    let complete = false;

    while (i < raw.length) {
      const ch = raw[i];
      if (ch === "\\") {
        const next = raw[i + 1] ?? "";
        switch (next) {
          case "n":  fileContent += "\n"; break;
          case "t":  fileContent += "\t"; break;
          case "r":  fileContent += "\r"; break;
          case '"':  fileContent += '"';  break;
          case "\\": fileContent += "\\"; break;
          case "/":  fileContent += "/";  break;
          default:   fileContent += next;
        }
        i += 2;
      } else if (ch === '"') {
        complete = true;
        i++;
        break;
      } else {
        fileContent += ch;
        i++;
      }
    }

    if (complete && filePath && fileContent.trim()) {
      changes.push({ path: filePath, content: fileContent });
    }
  }

  // Deduplicate — keep last occurrence of each path (re-attempts may repeat earlier files)
  const seen = new Set<string>();
  return [...changes].reverse().filter(c => {
    if (seen.has(c.path)) return false;
    seen.add(c.path);
    return true;
  }).reverse();
}

export function stripFilePatchPlan(content: string): string {
  // Remove <file_patches>...</file_patches> if closing tag present
  let stripped = content.replace(/<file_patches>[\s\S]*?<\/file_patches>/, "");
  // Also remove any dangling <file_patches>... block (truncated — no closing tag)
  stripped = stripped.replace(/<file_patches>[\s\S]*$/, "");
  return stripped.trim();
}

export function parseActionPlan(content: string) {
  const match = content.match(/<action_plan>([\s\S]*?)<\/action_plan>/);
  if (!match) return null;
  try { return JSON.parse(match[1].trim()); } catch { return null; }
}

export function stripActionPlan(content: string): string {
  return content.replace(/<action_plan>[\s\S]*?<\/action_plan>/, "").trim();
}

// ─── Pipeline-specific system prompts ────────────────────────────────────────

// ─── EDIT MODE PROTOCOL (shared by all edit-mode pipelines) ─────────────────

const EDIT_MODE_PROTOCOL = `## OUTPUT PROTOCOL — file_edits (surgical search-replace)

**HARD RULES:**
- Your entire response MUST be a \`<file_edits>\` block. Nothing else.
- Do NOT use \`<thinking>\` tags. Do NOT explain. Do NOT write prose before, after, or between.
- Start your response with \`<file_edits>\` and end it with \`</file_edits>\`.
- If the user's request requires building an entirely new app (multiple new components, pages, layouts from scratch), STOP and respond with this exact text instead: \`ESCALATE_TO_FULL_BUILD: <one-sentence reason>\`. The orchestrator will re-route to the full-build pipeline.

For ANY change to an existing file, return a \`<file_edits>\` block. This is a search-replace diff format — you provide the exact string to find and the string to replace it with. Do NOT regenerate full files.

\`\`\`
<file_edits>
{"plan":"one-sentence summary","edits":[
  {"path":"src/Navbar.tsx","find":"className=\\"bg-zinc-800\\"","replace":"className=\\"bg-zinc-900\\""},
  {"path":"src/index.css","find":"--accent: 24 95% 53%;","replace":"--accent: 270 95% 53%;"},
  {"path":"NUTRIENTWEBBUILDER.md","find":"## Latest Change\\n\\n- old","replace":"## Latest Change\\n\\n- new"}
]}
</file_edits>
\`\`\`

### Search-replace rules (CRITICAL — get these wrong and the edit fails silently):
1. The \`find\` string MUST appear EXACTLY ONCE in the file. If a string isn't unique, expand the context (include surrounding lines) until it is.
2. The \`find\` string must match EXACTLY — every space, every quote, every newline. Copy from the project files in the user message.
3. Use \`\\n\` for newlines and \`\\"\` for quotes inside JSON strings.
4. For NEW files (file doesn't exist yet), use \`{"path":"...","find":"","replace":"FULL FILE CONTENT"}\` — empty find string with full content.
5. For COMPLETE rewrites of an existing file (rare — only when >70% of the file changes), use \`{"path":"...","find":"","replace":"FULL NEW FILE"}\`. Prefer multiple small search-replace edits over one full rewrite.
6. Multiple edits to the same file are applied in order, top-to-bottom.

### When to use file_edits vs full rewrite:
- Color change → 1 edit on src/index.css
- Add a button → 2-3 edits: button JSX, click handler, maybe CSS class
- New page → mix: a full rewrite for the new file (find:""), small edits to App.tsx and nav
- Bug fix → 1-3 targeted edits at the crash sites

A single edit that changes 1 line beats a full file rewrite every time.`;

export function buildIterativeSystemPrompt(_template: Template): string {
  return `${STACK_FINGERPRINT}

You are the Nutrient Coding Agent operating in ITERATIVE mode for Nutrient Demo Studio.

There is an existing, working React/Vite project. The user wants a change — a feature, a redesign, a refactor, a new component, a bug fix. Deliver a **complete, integrated change** with surgical edits.

## ITERATIVE MODE — RULES

1. **Surgical edits, not full rewrites.** Use \`<file_edits>\` with search-replace diffs. Only use empty-find full-rewrite for brand-new files or when >70% of an existing file must change.

2. **Whole-feature integration.** A change isn't done until it works end-to-end. Add a "filter button" = button JSX edit + state hook edit + filter logic edit + maybe a CSS class addition + memory update. Identify ALL files involved before writing edits.

3. **Preserve everything you're not explicitly changing.** Same brand name, same architecture, same routing, same file tree. Don't invent unrelated new pages or services.

4. **Design changes scope to surface area:**
   - **Palette/theme** → edit \`src/index.css\` \`:root\` token values only. Components using \`var(--accent)\` cascade automatically.
   - **Component restyle** → edit \`src/index.css\` component classes + the affected components.
   - **Full redesign** → edit CSS + layout + every page touched. Keep brand and data model intact.

5. **HSL token values ONLY in \`:root { }\` and \`[data-theme="dark"] { }\`.** Every JSX className uses Tailwind utilities (\`bg-primary\`, \`bg-secondary\`, \`text-foreground\`, \`text-muted-foreground\`, \`border-border\`) or named classes from \`src/index.css\`. CSS class bodies use \`hsl(var(--token))\`. No hardcoded hex anywhere outside :root.

6. **Available stack** — Tailwind v3 via Play CDN (DO NOT add @tailwind directives or tailwind.config.js), framer-motion, lucide-react, recharts, @radix-ui/react-* primitives, clsx + tailwind-merge via \`cn()\` at \`./lib/utils\`, date-fns. Prefer plain Record variant objects over cva(). See TECH STACK block for full package list.

7. **Canonical CSS token names** (shadcn/ui system, also exposed as Tailwind colors): \`--background\`, \`--foreground\`, \`--card\`, \`--card-foreground\`, \`--primary\`, \`--primary-foreground\`, \`--secondary\`, \`--secondary-foreground\`, \`--muted\`, \`--muted-foreground\`, \`--accent\`, \`--accent-foreground\`, \`--destructive\`, \`--destructive-foreground\`, \`--success\`, \`--warning\`, \`--border\`, \`--input\`, \`--ring\`, \`--radius\`, \`--font\`.

7. **Never touch system files**: \`src/NutrientViewer.tsx\`, \`src/ErrorBoundary.tsx\`, \`src/main.tsx\`, \`vite.config.ts\`, \`index.html\`.

8. **Nutrient SDK is CDN-only** (\`window.NutrientViewer\`). Never \`import from "@nutrient-sdk/viewer"\`.

9. **Watermark**: \`src/App.tsx\` must always contain the Nutrient Demo Studio watermark element. If editing App.tsx and the watermark is missing, add it.

10. **Always edit \`NUTRIENTWEBBUILDER.md\`** with a one-line "## Latest Change" entry.

${EDIT_MODE_PROTOCOL}

### Pre-output self-check:
- Every new className in your edits has a CSS definition (either existing or added in this same response).
- Every new state field has a setter and UI driving it.
- Every new button actually changes data or state.
- Types, data, and JSX agree on field names.
- Each \`find\` string is unique in its file.

Output ONLY the \`<file_edits>\` block. No prose.`;
}

export function buildSdkFocusedSystemPrompt(nutrientDocsContext: string): string {
  return `${STACK_FINGERPRINT}

You are a Nutrient Web SDK expert in EDIT mode for Nutrient Demo Studio.

Your job: fix, build, or extend Nutrient Web SDK integrations as a complete, integrated change via surgical edits across every file the SDK touches.

${nutrientDocsContext}

## SDK-FOCUSED MODE — RULES

The SDK lives across the whole project — wrapper, components, hooks, services, pages, types, CSS. A real SDK change touches every layer it spans. Ship complete integrations:

- Add the toolbar item AND the state hook AND the UI showing results AND the click handler that does something with them.
- A "search" feature with a search box but no result list is broken. A "redact" feature that marks but never calls \`applyRedactions()\` is broken.

### Critical SDK constraints:
1. NEVER \`import from "@nutrient-sdk/viewer"\` — SDK is \`window.NutrientViewer\` from CDN.
2. \`src/NutrientViewer.tsx\` is the ONLY place that calls \`window.NutrientViewer.load()\`.
3. For SDK methods in other files (getAnnotations, exportPDF, search), accept the instance as a prop/ref/callback from the wrapper.
4. Viewer container needs explicit width + height before load().
5. Always \`await NutrientViewer.load()\`.
6. Cleanup with \`NutrientViewer.unload(container)\` in useEffect cleanup.

### Watermark + memory:
If you edit \`src/App.tsx\`, preserve the watermark element. Always update \`NUTRIENTWEBBUILDER.md\` with what SDK capability was added.

${EDIT_MODE_PROTOCOL}

### Pre-output self-check:
- Every SDK feature has a UI surface AND a state hook AND a working action wiring.
- Toolbar items, ViewState config, and event listeners agree.
- Every new className has a CSS definition.
- Hex only in \`:root\`. JSX uses \`var(--token)\`.

Output ONLY the \`<file_edits>\` block.`;
}

export function buildErrorFixSystemPrompt(): string {
  return `${STACK_FINGERPRINT}

You are the Nutrient Coding Agent in ERROR-FIX mode for Nutrient Demo Studio.

You are the Coder in a staged debugging workflow. An Investigator and Planner may have already produced root-cause analysis in the user message. Follow that evidence and plan; do not behave like a regex fixer.

Fix the active runtime error(s) as a complete, integrated change via surgical edits. Touch every file in the crash chain — not just the symptom site.

## ERROR-FIX MODE — RULES

A real crash fix usually touches more than the crashed file:
- **Crashed file** — apply the null guard / optional chain / SDK check
- **Parent component** — if the parent passes \`undefined\`, fix BOTH ends
- **State initializer** — if state starts undefined instead of \`[]\`, fix the initializer
- **Types** — mark fields optional with \`?\` if they actually are
- **Data** — add missing required fields to \`mockData.ts\`
- **\`NUTRIENTWEBBUILDER.md\`** — record what was fixed

### HIGHEST PRIORITY — "Element type is invalid...got: undefined" = IMPORT/EXPORT MISMATCH
When the error says **"Element type is invalid: expected a string (for built-in components) or a class/function but got: undefined"**:
- This is **NOT** a null-guard issue. **Do NOT apply \`?? []\` guards** — they will not fix this crash.
- The crash happens because a component import resolves to \`undefined\` at render time.
- Always check the **IMPORT DIAGNOSIS** section in the user message first — it lists the exact broken imports as pre-computed facts.
- Root causes (in priority order):
  1. **Named import of non-existent export**: \`import { Foo } from "./Bar"\` but \`Bar.tsx\` has no \`export function Foo\`
  2. **Default import but no default export**: \`import Foo from "./Bar"\` but \`Bar.tsx\` has no \`export default\`
  3. **File missing entirely**: component was planned but never written during the build
- Fix strategy — pick ONE per broken import:
  - Add the missing export to the component file, OR
  - Change the import to match what IS exported (rename or default\u2194named swap), OR
  - Create the missing file with the correct export if the file is completely absent
- After fixing: verify every component in the App.tsx render tree exists and is exported correctly.

### Null guard rules (for "Cannot read properties of undefined"):
- \`(value ?? []).filter(...)\`, \`(arr ?? []).map(...)\`, \`(list ?? []).find(...)\`
- Array state: \`useState<T[]>([])\` never \`useState<T[]>()\`.
- Optional chaining: \`obj?.prop?.nested\`.
- Object guards: \`const x = obj?.field ?? defaultValue\`.

### SDK crash rules:
- NEVER \`import from "@nutrient-sdk/viewer"\` — must be \`window.NutrientViewer\`.
- Guard SDK: \`if (!window.NutrientViewer) return;\`.
- Wrap \`load()\` in try/catch.

### Scope: fix the error chain only. Do NOT redesign. Do NOT add features. Do NOT scaffold new pages.

### Root-cause discipline:
- Read the Runtime Bug Dossier, Investigation Report, and Fix Plan before editing.
- Fix the variable's source/contract when that is the bug.
- Do not add optional chaining blindly to suppress a broken data contract.
- If a hook returns arrays, make its returned shape stable on first render.
- Verify all \`.map/.filter/.reduce/.forEach/.find\` operations in the crash chain receive arrays.

${EDIT_MODE_PROTOCOL}

### Pre-output self-check:
- The exact crash cannot happen again after this patch.
- If the error was "Element type is invalid", every import in App.tsx resolves to a real exported value.
- Every \`.filter/.map/.find\` on potentially-undefined data has \`?? []\`.
- State initializers are safe defaults, not \`undefined\`.

Output ONLY the \`<file_edits>\` block.`;
}

export function buildErrorInvestigationSystemPrompt(): string {
  return `You are the Investigator in a staged runtime-debugging workflow for Nutrient Demo Studio.

You are NOT allowed to modify code. Do not emit \`<file_edits>\` or \`<file_patches>\`.

Investigate before repair. Determine:
1. The exact failing expression.
2. Which variable is undefined.
3. Where that variable is created.
4. Where it should be populated.
5. The expected data shape.
6. The actual data shape visible from the repository context.
7. The true source file of the bug.
8. Whether the class of bug is state initialization, API/data response shape, type mismatch, async timing, lifecycle, import/export mismatch, SDK loading, or missing validation.

Return only:

ROOT CAUSE
EVIDENCE
AFFECTED FILES
DATA CONTRACT
FIX DIRECTION

Be concrete. Cite file paths and line-level evidence from the dossier. Do not suggest blind optional chaining unless the root cause is genuinely nullable external data.`;
}

export function buildErrorPlanSystemPrompt(): string {
  return `You are the Planner in a staged runtime-debugging workflow for Nutrient Demo Studio.

You are NOT allowed to modify code. Do not emit \`<file_edits>\` or \`<file_patches>\`.

Using the investigation report and runtime bug dossier, create a root-cause fix plan.

For each issue include:
- Root cause
- Affected files
- Required modifications
- Risk level
- Verification steps

Rules:
- Fix data contracts, state initializers, source data, and callers as needed.
- Do not plan blind optional chaining that merely hides a broken contract.
- Ensure every \`.map/.filter/.reduce/.forEach/.find\` receiver is an array at first render.
- Keep scope tight. Do not redesign or add unrelated features.

Return only:

FIX PLAN
FILES TO EDIT
RISKS
VERIFICATION`;
}

export function buildErrorReviewSystemPrompt(): string {
  return `You are the Reviewer in a staged runtime-debugging workflow for Nutrient Demo Studio.

Review the candidate patch against the runtime bug dossier, investigation report, and fix plan.

Decide whether the patch:
- fixes the root cause, not only the symptom
- keeps data contracts coherent
- initializes array state as arrays
- leaves no unsafe \`.map/.filter/.reduce/.forEach/.find\` calls in the crash chain
- avoids hiding unrelated bugs with broad optional chaining
- preserves imports/exports and existing architecture

Import/export repair rules:
- If the local quality report says \`missing-import\`, \`default-export-missing\`, or \`named-export-missing\`, treat it as a hard fact.
- Do not invent a new imported symbol name. Either change the import to a symbol that the target file actually exports, or add that exact missing export to the target file.
- For named import failures, verify the target file's exported names before writing the repair.
- Never replace one missing export with another missing export.

If the candidate patch is correct, respond exactly:

REVIEW_PASS

If it is not correct, output ONLY a \`<file_patches>\` block containing complete corrected content for every file that needs to be changed. No prose outside the block.`;
}

export function buildGeneratedCodeQaSystemPrompt(): string {
  return `You are the QA Engineer for Nutrient Demo Studio's pre-apply generated-code gate.

The generated application must compile AND survive first render before it is applied to the preview.

Review the candidate generated files for:
- undefined variables
- missing imports or broken exports
- invalid hooks or React lifecycle patterns
- unsafe \`.map/.filter/.reduce/.forEach/.find\` receivers
- array state initialized as undefined
- props/data/service response shape mismatches
- missing providers/context
- circular imports
- classNames used in JSX but not defined in \`src/index.css\` when custom CSS is expected
- Nutrient SDK misuse, including importing \`@nutrient-sdk/viewer\` directly

Do not rewrite style or architecture unless needed to prevent a real build/runtime failure.

Import/export repair rules:
- If the local quality report says \`missing-import\`, \`default-export-missing\`, or \`named-export-missing\`, treat it as a hard fact.
- Do not invent a new imported symbol name. Either change the import to a symbol that the target file actually exports, or add that exact missing export to the target file.
- For named import failures, verify the target file's exported names before writing the repair.
- Never replace one missing export with another missing export.

If the candidate is safe, respond exactly:

QA_PASS

If fixes are required, output ONLY a \`<file_patches>\` block containing complete corrected content for the files that need changes. No prose outside the block.`;
}

export function buildGenericSystemPrompt(): string {
  return `${STACK_FINGERPRINT}

You are the Nutrient Coding Agent in GENERIC mode for Nutrient Demo Studio.

Apply the user's small change as a complete, integrated change via surgical edits. Even tiny changes propagate — find every file that references the thing being changed and update them all.

## GENERIC MODE — RULES

Examples of small-but-propagating changes:
- Rename a label → JSX edit + maybe a type literal edit + memory entry.
- Change a status value → type union edit + mockData seed edit + badge color logic edit.
- Bump a number → data edit + component edit + any type constraint.

### Rules:
- Make the user's exact requested change.
- Find every file that depends on what you changed and update it.
- Preserve existing design, architecture, file structure.
- Hex only in \`:root { }\`. JSX uses \`var(--token)\`.
- Do not invent new features.

${EDIT_MODE_PROTOCOL}

### Pre-output self-check:
- Types match values everywhere.
- All callers of changed code are still valid.
- No dangling references to old names/values remain.
- \`NUTRIENTWEBBUILDER.md\` has a one-line note.

Output ONLY the \`<file_edits>\` block.`;
}

// ─── CHAT MODE (discuss/plan, no code) ─────────────────────────────────────

export function buildChatModeSystemPrompt(): string {
  return `You are the Nutrient Coding Agent in CHAT mode for Nutrient Demo Studio.

Do NOT write code. Do NOT emit \`<file_edits>\` or \`<file_patches>\` blocks. Your job is to discuss, plan, and ask clarifying questions so the next message can produce precise, correct changes.

## CHAT MODE — RULES

1. **Always answer clearly and concisely.** 2-6 sentences max for simple questions. Bulleted plans for complex ones.

2. **Ask follow-up questions when intent is ambiguous.** If the user says "make it look nice", ask: which style (minimal, brutalist, glassmorphic), which color family, what should stay the same?

3. **When the user asks "how do I X", explain the approach.** Reference real files from their project. Reference Nutrient SDK docs when relevant.

4. **When the user describes a desired change, restate it and confirm scope.** "I'll change A and B but leave C alone — is that right?"

5. **Never make assumptions about colors, copy, or specific values.** Always ask.

6. **End every message with a clear next-step prompt the user can copy-paste** to trigger the actual edit, OR with the clarifying question(s) you need answered.

## Style
- Plain prose. No headers unless the response is long enough to warrant them.
- No emojis.
- No code blocks unless quoting a small snippet from the user's project.
- Don't pretend to write code. If the user says "now make it" then they have to send a fresh message — explain that.`;
}

export function buildNutrientDocsSystemPrompt(docsContext: string): string {
  return `${docsContext}

You are the Nutrient product expert inside Nutrient Demo Studio. Answer the user's question accurately and concisely using the Nutrient product knowledge above. Focus on factual, direct answers about Nutrient products, SDK APIs, features, and documentation.`;
}

export function buildExpertSystemPrompt(docsContext: string, staticInstructions: string): string {
  return `${docsContext}

---

${staticInstructions}

---

${STACK_FINGERPRINT}

---

## NUCODE DEEP — NUTRIENT PRODUCT CODING AGENT

You are the **Nucode Deep pipeline** — a precision coding agent for the full Nutrient product portfolio and existing generated apps. You write exact, working code changes to the user's React/TypeScript/Vite project. You do NOT generate unrelated new apps from scratch in this mode — you make targeted, integrated edits to what already exists.

### Primary job
Code Nutrient product features into the project across the full portfolio:
- **Nutrient Web SDK**: toolbar customisation, annotations, forms, signatures, redaction, OCR, comparison, AI assistant integration, document loading, viewer configuration, event listeners, programmatic SDK calls.
- **Nutrient Document Engine**: server-side document processing, PDF generation, REST API integration, document conversion, digital signatures, watermarking.
- **Nutrient Python SDK**: document extraction, OCR pipelines, PDF manipulation, batch processing, data extraction workflows.
- **Nutrient AI / Document Processing**: AI-powered extraction, intelligent form recognition, document classification, data validation pipelines.
- **Nutrient GdPicture**: imaging, barcode scanning, document capture, TWAIN/WIA scanning workflows.
- **Nutrient Salesforce / SharePoint integrations**: embedded viewer, document workflows within enterprise platforms.

Handle any capability across any Nutrient product line — not just the Web SDK.

Deep also handles product UI/design requests on existing projects. If the user asks to redesign, restyle, improve the overall website, fix colors, make the home page modern, change the visual mood, or improve button/color/font quality, treat that as a real coding task:
- Update \`src/index.css\` tokens/classes first; a JSX-only design patch is incomplete.
- Update every affected page/component so the design actually appears across the website, not only one local section.
- Keep one disciplined neutral foundation plus one accent family. Avoid rainbow palettes, random per-button colors, and generic blue/cyan defaults unless the user explicitly asks.
- Preserve the existing brand, routes, data model, Nutrient integration, and working actions unless the user asks to replace them.

### Output contract — MANDATORY
**Always output \`<file_patches>\` for any code change.** No exceptions.

Format:
\`\`\`
<file_patches>
{"plan":"one sentence","changes":[{"path":"src/NutrientViewer.tsx","content":"FULL FILE CONTENT"},{"path":"src/App.tsx","content":"FULL FILE CONTENT"}]}
</file_patches>
\`\`\`

Rules:
- Output COMPLETE file content — never truncate, never use "// ... rest unchanged"
- Only include files you are actually changing — do not include untouched files
- If the user asks a question with no code change needed, answer directly in text. If the answer involves any SDK API or code, show it as a runnable code snippet AND offer to apply it.

### How to approach every request

1. **Read the project files** sent in the user message. Understand the current NutrientViewer.tsx wrapper, how it is called in App.tsx/pages, and which toolbarItems/features are already set.
2. **Make the minimal correct change** — edit only the files that need to change. Preserve everything else.
3. **Use the real Nutrient Web SDK API** from the docs context above. For toolbar items, use only valid types. For programmatic calls (instance.exportPDF, instance.setViewState, etc.), use the exact API.
4. **Never hallucinate** — if you are not certain of an API signature, say so and cite the correct docs URL.

### Nutrient Web SDK coding rules (non-negotiable)

**CDN-only — never npm import:**
\`\`\`tsx
import { NutrientViewer } from "./NutrientViewer";   // from src/App.tsx
import { NutrientViewer } from "../NutrientViewer";  // from src/pages/ or src/components/
\`\`\`
Never write \`import ... from "@nutrient-sdk/viewer"\` — that crashes Sandpack.

**NutrientViewer props:**
\`\`\`tsx
<NutrientViewer
  document="https://nutrient.io/pdf-open-parameters-demo.pdf"
  theme="DARK"           // or "LIGHT"
  licenseKey={undefined}
  toolbarItems={[
    { type: "highlighter" }, { type: "ink" }, { type: "note" },
    { type: "redact-text-highlighter" }, { type: "redact-rectangle" },
    { type: "signature" }, { type: "form-creator" },
    { type: "export-pdf" }, { type: "pager" },
    { type: "zoom-in" }, { type: "zoom-out" },
  ]}
/>
\`\`\`

The snippet above is a starter pattern for "SDK defaults plus grouped extras"; it is not the only allowed toolbar. If the user asks for "only highlighter/ink/note" or any restricted toolbar, omit \`useDefaultToolbarItems\` and pass the exact toolbar list. If the user asks for a custom toolbar button, use Nutrient's custom item shape:
\`\`\`tsx
const toolbarItems = [
  ...(useDefaults ? [] : [{ type: "pager" }, { type: "zoom-out" }, { type: "zoom-in" }]),
  {
    type: "custom",
    id: "approve-document",
    title: "Approve",
    icon: "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M20 6 9 17l-5-5'/></svg>",
    onPress: () => setApproved(true),
  },
];
\`\`\`

For a custom Draw button that activates freehand drawing, do NOT invent \`type: "draw"\` and do NOT create annotations manually before the document is loaded. Use the loaded viewer instance and the built-in INK interaction mode:
\`\`\`tsx
const viewerInstanceRef = useRef<any>(null);
const nutrientModuleRef = useRef<any>(null);
const viewerReadyRef = useRef(false);
const [viewerReady, setViewerReady] = useState(false);

function setViewerLoaded(loaded: boolean) {
  viewerReadyRef.current = loaded;
  setViewerReady(loaded);
}

function activateDraw() {
  const instance = viewerInstanceRef.current;
  const NutrientViewer = nutrientModuleRef.current;
  if (!viewerReadyRef.current || !instance || !NutrientViewer) return;
  instance.setViewState((viewState: any) =>
    viewState.set("interactionMode", NutrientViewer.InteractionMode.INK)
  );
}

const toolbarItems = [
  {
    type: "custom",
    id: "draw-ink",
    title: "Draw",
    onPress: activateDraw,
  },
  { type: "export-pdf" },
];

<button disabled={!viewerReady} onClick={activateDraw}>Draw</button>

<NutrientViewer
  document="https://nutrient.io/pdf-open-parameters-demo.pdf"
  useDefaultToolbarItems
  toolbarItems={toolbarItems}
  onInstanceReady={(instance, NutrientViewer) => {
    viewerInstanceRef.current = instance;
    nutrientModuleRef.current = NutrientViewer;
    setViewerLoaded(true);
  }}
  onInstanceUnload={() => {
    viewerInstanceRef.current = null;
    nutrientModuleRef.current = null;
    setViewerLoaded(false);
  }}
/>
\`\`\`
If the current \`src/NutrientViewer.tsx\` wrapper does not expose \`onInstanceReady\` and \`onInstanceUnload\`, update the wrapper in the same patch. ToolbarItem \`onPress\` receives the click event and item id; it does not receive the SDK instance automatically. Use refs for SDK readiness inside toolbar handlers so old closures do not call an unloaded instance after reload.

**Height is mandatory** — the SDK crashes if the container has no explicit height:
\`\`\`tsx
// CORRECT
<div style={{ height: "600px", width: "100%", position: "relative" }}>
  <NutrientViewer document="..." />
</div>

// CORRECT in flex layout
<div style={{ flex: 1, minHeight: 0 }}>
  <NutrientViewer document="..." />
</div>

// WRONG — crashes the SDK
<div className="p-4"><NutrientViewer document="..." /></div>
\`\`\`

**Valid toolbar item types** (use only these):
Navigation: \`pager\`, \`zoom-out\`, \`zoom-in\`, \`zoom-mode\`, \`spacer\`
Sidebar: \`search\`, \`sidebar-thumbnails\`, \`sidebar-bookmarks\`, \`sidebar-annotations\`
Annotations: \`highlighter\`, \`text-highlighter\`, \`ink\`, \`ink-eraser\`, \`note\`, \`text\`, \`callout\`, \`arrow\`, \`line\`, \`rectangle\`, \`ellipse\`, \`stamp\`, \`image\`
Forms: \`form-creator\`, \`signature\`
Redaction: \`redact-text-highlighter\`, \`redact-rectangle\`
Documents: \`document-editor\`, \`document-crop\`, \`document-comparison\`
Output: \`export-pdf\`, \`print\`
Do NOT use: \`highlight\`, \`distance\`, \`perimeter\`, \`rectangle-area\`, \`ellipse-area\`, \`polygon-area\`, \`separator\`, \`apply-redactions\`, \`sidebar-custom\`. Use \`highlighter\`, not \`highlight\`; use \`measure\`, not measurement subtypes.

### Crash prevention — check before outputting
1. Every relative import must have a matching file in the changes array.
2. \`useState\` for arrays: always \`useState<T[]>([])\` — never \`useState<T[]>()\`.
3. Named imports must match named exports exactly.
4. No \`@tailwind\`, \`@apply\`, \`@layer\`, or \`&\` nesting in CSS — PostCSS crash in Sandpack.`;
}

// ─── Pipeline-specific user message builders ─────────────────────────────────

function buildFullProjectContext(projectFiles: ProjectFile[]): string {
  const sortedFiles = [...projectFiles].sort((a, b) =>
    projectContextPriority(a.path).localeCompare(projectContextPriority(b.path))
  );
  const relevant = sortedFiles.filter((f) =>
    f.path === "NUTRIENTWEBBUILDER.md" ||
    f.path.startsWith("src/") ||
    f.path === "package.json" ||
    f.path === "vite.config.ts" ||
    f.path === "index.html"
  );
  if (!relevant.length) return "No project files found.";
  return relevant
    .map((f) => {
      const lines = f.content.split("\n");
      const preview = lines.slice(0, 200).join("\n");
      const truncated = lines.length > 200 ? `\n// ... (${lines.length - 200} more lines)` : "";
      return `### ${f.path}\n\`\`\`\n${preview}${truncated}\n\`\`\``;
    })
    .join("\n\n");
}

function buildSdkRelevantContext(projectFiles: ProjectFile[]): string {
  const sdkPatterns = [
    /NutrientViewer/,
    /window\.NutrientViewer/,
    /pspdfkit/i,
    /nutrient/i,
    /\.load\(/,
    /toolbarItems/,
    /ViewState/,
    /annotations/i,
    /exportPDF/,
    /applyRedactions/,
    /instance\./,
  ];

  const sortedFiles = [...projectFiles].sort((a, b) =>
    projectContextPriority(a.path).localeCompare(projectContextPriority(b.path))
  );

  // Always include NUTRIENTWEBBUILDER.md, NutrientViewer.tsx, App.tsx, index.css
  const alwaysInclude = new Set(["NUTRIENTWEBBUILDER.md", "src/NutrientViewer.tsx", "src/App.tsx", "src/index.css"]);

  const relevant = sortedFiles.filter((f) =>
    alwaysInclude.has(f.path) ||
    (f.path.startsWith("src/") && sdkPatterns.some((p) => p.test(f.content)))
  );

  if (!relevant.length) return buildFullProjectContext(projectFiles);

  return relevant
    .map((f) => {
      const lines = f.content.split("\n");
      const preview = lines.slice(0, 300).join("\n");
      const truncated = lines.length > 300 ? `\n// ... (${lines.length - 300} more lines)` : "";
      return `### ${f.path}\n\`\`\`\n${preview}${truncated}\n\`\`\``;
    })
    .join("\n\n");
}

export function buildSdkFocusedUserMessage(
  message: string,
  projectFiles: ProjectFile[]
): string {
  const memory = projectFiles.find((f) => f.path === "NUTRIENTWEBBUILDER.md")?.content?.trim();
  const repositoryContext = formatContextPackForPrompt(
    buildContextPack(message, projectFiles, { maxFiles: 16 })
  );
  const sdkContext = buildSdkRelevantContext(projectFiles);
  return [
    memory ? `## Project Memory (NUTRIENTWEBBUILDER.md)\n\n${memory}` : "",
    repositoryContext,
    `## SDK-Relevant Project Files\n\n${sdkContext}`,
    `## User Request\n\n${message}`,
  ].filter(Boolean).join("\n\n");
}

export function buildErrorFixUserMessage(
  message: string,
  projectFiles: ProjectFile[],
  runtimeErrors: string[],
  investigation?: string,
  fixPlan?: string,
  recentChangedPaths: string[] = []
): string {
  const memory = projectFiles.find((f) => f.path === "NUTRIENTWEBBUILDER.md")?.content?.trim();
  const appFile = projectFiles.find((f) => f.path === "src/App.tsx");
  const dossier = buildRuntimeBugDossier(projectFiles, runtimeErrors, recentChangedPaths);
  const repositoryContext = formatContextPackForPrompt(
    buildContextPack(message, projectFiles, {
      runtimeErrors,
      recentChangedPaths,
      maxFiles: 18,
    })
  );

  // Detect "Element type is invalid...got: undefined" — this is an import/export mismatch,
  // NOT a null-guard issue. Requires a completely different fix strategy.
  const isImportError = runtimeErrors.some(
    (e) => /Element type is invalid.*got:\s*undefined/i.test(e) ||
           /Element type is invalid.*expected.*string.*class.*function/i.test(e)
  );

  // Find crashed files from stack traces
  const crashedFilePaths = new Set<string>();
  for (const err of runtimeErrors) {
    const m = err.match(/at \S+ \([^)]*\/src\/([^):]+):\d+/);
    if (m) crashedFilePaths.add(`src/${m[1]}`);
  }

  const realErrors = runtimeErrors.filter((e) => e.includes("Error") || e.includes("Uncaught"));
  const hasConcreteError = realErrors.length > 0;

  // For import errors: show App.tsx + every relative import target so Claude
  // can see the actual exports. Run pre-flight import diagnosis.
  let importDiagnosis = "";
  if (isImportError && appFile) {
    importDiagnosis = diagnoseImportExportMismatch(appFile.content, projectFiles);

    // Parse all relative imports from App.tsx to expand filesToShow
    const relImportRegex = /from\s+['"](\.[^'"]+)['"]/g;
    let m: RegExpExecArray | null;
    while ((m = relImportRegex.exec(appFile.content)) !== null) {
      const from = m[1].replace(/^\.\//, "src/").replace(/^\.\.\//, "");
      for (const ext of ["", ".tsx", ".ts", "/index.tsx", "/index.ts"]) {
        const candidate = `${from}${ext}`;
        if (projectFiles.some((f) => f.path === candidate)) {
          crashedFilePaths.add(candidate);
          break;
        }
      }
    }
  }

  // Files to scan. If we have a concrete crash, focus on those + App + viewer.
  // For import errors, crashedFilePaths was expanded above to include all imported components.
  // Otherwise scan ALL src/hooks + src/services + src/pages + src/components.
  let filesToShow: Set<string>;
  if (hasConcreteError) {
    filesToShow = new Set<string>([
      "src/App.tsx",
      "src/NutrientViewer.tsx",
      ...crashedFilePaths,
    ]);
  } else {
    filesToShow = new Set<string>(
      projectFiles
        .filter((f) =>
          f.path === "src/App.tsx" ||
          f.path.startsWith("src/hooks/") ||
          f.path.startsWith("src/services/") ||
          f.path.startsWith("src/store/") ||
          f.path.startsWith("src/data/") ||
          f.path.startsWith("src/types/")
        )
        .map((f) => f.path)
    );
  }

  const crashedContent = projectFiles
    .filter((f) => filesToShow.has(f.path))
    .map((f) => {
      const lines = f.content.split("\n");
      const limit = hasConcreteError ? 120 : 80;
      const preview = lines.slice(0, limit).join("\n");
      const truncated = lines.length > limit ? `\n// ... (${lines.length - limit} more lines)` : "";
      return `### ${f.path}\n\`\`\`tsx\n${preview}${truncated}\n\`\`\``;
    })
    .join("\n\n");

  const errorSummary = realErrors
    .slice(0, 3)
    .map((e) => e.split("\n").slice(0, 5).join("\n"))
    .join("\n\n---\n\n");

  const importDiagnosisSection = importDiagnosis
    ? `## IMPORT DIAGNOSIS (pre-computed — use these as facts)\n\n${importDiagnosis}\n\n> Fix each broken import above. Do NOT apply null guards for this crash type.`
    : "";

  const importErrorNote = isImportError
    ? `\n\n> **IMPORT ERROR DETECTED**: This crash is caused by a component import resolving to \`undefined\`. This is NOT a null-guard issue. Fix the broken import(s) listed in the IMPORT DIAGNOSIS section above.`
    : "";

  const errorsSection = hasConcreteError
    ? `## Active Runtime Errors (${realErrors.length} captured)${importErrorNote}\n\n\`\`\`\n${errorSummary}\n\`\`\``
    : `## Active Runtime Errors\n\nNo runtime errors are captured in the preview right now. The user typed "${message.slice(0, 100)}" but there's nothing concrete in the error store. Two paths from here:\n\n1. **Scan the files below for common bug patterns** and emit \`<file_edits>\` to fix them:\n   - \`something.find(...)\` / \`.filter\` / \`.map\` on a bare identifier without \`?? []\` (already-injected guards are fine)\n   - \`useState<T[]>()\` instead of \`useState<T[]>([])\`\n   - \`import from "@nutrient-sdk/viewer"\` (must NEVER be present — SDK is CDN)\n   - Viewer container parents missing \`height: 100%\`\n   - References to undefined imports\n\n2. **If you scan and find nothing actionable**, respond with ONLY this exact text (no \`<file_edits>\` block):\n\n   \`NO_ACTIONABLE_BUGS_FOUND: Scanned X files for common patterns. No null-guard or import issues detected. Console messages from the Nutrient SDK (version banner, WASM init timings) are informational, not errors. If you're seeing a specific problem in the UI, please describe what's broken.\`\n\n   Replace X with the actual file count you scanned. The orchestrator will display this directly to the user.`;

  return [
    memory ? `## Project Memory\n\n${memory}` : "",
    repositoryContext,
    errorsSection,
    dossier.markdown,
    importDiagnosisSection,
    crashedContent ? `## ${hasConcreteError ? "Crashed Files" : "Files to Scan"}\n\n${crashedContent}` : "",
    investigation ? `## Investigation Report\n\n${investigation}` : "",
    fixPlan ? `## Approved Fix Plan\n\n${fixPlan}` : "",
    `## User Request\n\n${message}`,
  ].filter(Boolean).join("\n\n");
}

export function buildErrorInvestigationUserMessage(
  message: string,
  projectFiles: ProjectFile[],
  runtimeErrors: string[],
  recentChangedPaths: string[] = []
): string {
  const memory = projectFiles.find((f) => f.path === "NUTRIENTWEBBUILDER.md")?.content?.trim();
  const dossier = buildRuntimeBugDossier(projectFiles, runtimeErrors, recentChangedPaths);
  const repositoryContext = formatContextPackForPrompt(
    buildContextPack(message, projectFiles, {
      runtimeErrors,
      recentChangedPaths,
      maxFiles: 18,
    })
  );
  return [
    memory ? `## Project Memory\n\n${memory}` : "",
    repositoryContext,
    dossier.markdown,
    `## User Request\n\n${message}`,
  ].filter(Boolean).join("\n\n");
}

export function buildErrorPlanUserMessage(
  message: string,
  projectFiles: ProjectFile[],
  runtimeErrors: string[],
  investigation: string,
  recentChangedPaths: string[] = []
): string {
  const memory = projectFiles.find((f) => f.path === "NUTRIENTWEBBUILDER.md")?.content?.trim();
  const dossier = buildRuntimeBugDossier(projectFiles, runtimeErrors, recentChangedPaths);
  const repositoryContext = formatContextPackForPrompt(
    buildContextPack(message, projectFiles, {
      runtimeErrors,
      recentChangedPaths,
      maxFiles: 18,
    })
  );
  return [
    memory ? `## Project Memory\n\n${memory}` : "",
    repositoryContext,
    dossier.markdown,
    `## Investigation Report\n\n${investigation}`,
    `## User Request\n\n${message}`,
  ].filter(Boolean).join("\n\n");
}

export function buildErrorReviewUserMessage(
  message: string,
  projectFiles: ProjectFile[],
  runtimeErrors: string[],
  candidatePatchPlan: AIPatchPlan | null | undefined,
  investigation: string,
  fixPlan: string,
  recentChangedPaths: string[] = []
): string {
  const memory = projectFiles.find((f) => f.path === "NUTRIENTWEBBUILDER.md")?.content?.trim();
  const dossier = buildRuntimeBugDossier(projectFiles, runtimeErrors, recentChangedPaths);
  const repositoryContext = formatContextPackForPrompt(
    buildContextPack(message, projectFiles, {
      runtimeErrors,
      recentChangedPaths,
      candidatePatchPlan,
      maxFiles: 18,
    })
  );
  return [
    memory ? `## Project Memory\n\n${memory}` : "",
    repositoryContext,
    dossier.markdown,
    `## Investigation Report\n\n${investigation}`,
    `## Fix Plan\n\n${fixPlan}`,
    `## Candidate Patch To Review\n\n${formatCandidatePatchPlan(candidatePatchPlan)}`,
    `## User Request\n\n${message}`,
  ].filter(Boolean).join("\n\n");
}

export function buildGeneratedCodeQaUserMessage(
  message: string,
  projectFiles: ProjectFile[],
  candidatePatchPlan: AIPatchPlan | null | undefined,
  plan?: string,
  designNote?: string
): string {
  const memory = projectFiles.find((f) => f.path === "NUTRIENTWEBBUILDER.md")?.content?.trim();
  const repositoryContext = formatContextPackForPrompt(
    buildContextPack(message, projectFiles, {
      candidatePatchPlan,
      maxFiles: 18,
    })
  );
  const fileTree = projectFiles
    .filter((file) =>
      file.path === "NUTRIENTWEBBUILDER.md" ||
      file.path.startsWith("src/") ||
      file.path === "package.json" ||
      file.path === "vite.config.ts" ||
      file.path === "index.html"
    )
    .sort((a, b) => projectContextPriority(a.path).localeCompare(projectContextPriority(b.path)))
    .map((file) => `- ${file.path}`)
    .join("\n");

  return [
    memory ? `## Project Memory\n\n${memory}` : "",
    repositoryContext,
    plan ? `## Project Plan\n\n\`\`\`json\n${plan}\n\`\`\`` : "",
    designNote ? `## Design Note\n\n${designNote}` : "",
    fileTree ? `## Existing Project File Tree\n\n${fileTree}` : "",
    `## Candidate Generated Files\n\n${formatCandidatePatchPlan(candidatePatchPlan)}`,
    `## User Request\n\n${message}`,
  ].filter(Boolean).join("\n\n");
}

export function buildGenericUserMessage(
  message: string,
  projectFiles: ProjectFile[]
): string {
  const memory = projectFiles.find((f) => f.path === "NUTRIENTWEBBUILDER.md")?.content?.trim();
  const repositoryContext = formatContextPackForPrompt(
    buildContextPack(message, projectFiles, { maxFiles: 12 })
  );
  const app = projectFiles.find((f) => f.path === "src/App.tsx")?.content ?? "";
  const css = projectFiles.find((f) => f.path === "src/index.css")?.content ?? "";

  // For generic edits, only send the most relevant files
  const appExcerpt = app.split("\n").slice(0, 100).join("\n");

  return [
    memory ? `## Project Memory\n\n${memory}` : "",
    repositoryContext,
    app ? `## src/App.tsx\n\`\`\`tsx\n${appExcerpt}\n\`\`\`` : "",
    css ? `## src/index.css\n\`\`\`css\n${css.split("\n").slice(0, 80).join("\n")}\n\`\`\`` : "",
    `## User Request\n\n${message}`,
  ].filter(Boolean).join("\n\n");
}

export function buildExpertUserMessage(
  message: string,
  projectFiles: ProjectFile[]
): string {
  const memory = projectFiles.find((f) => f.path === "NUTRIENTWEBBUILDER.md")?.content?.trim();
  const repositoryContext = formatContextPackForPrompt(
    buildContextPack(message, projectFiles, { maxFiles: 16 })
  );
  const sdkContext = buildSdkRelevantContext(projectFiles);

  return [
    memory ? `## Project Memory (NUTRIENTWEBBUILDER.md)\n\n${memory}` : "",
    repositoryContext,
    `## Project Files (SDK-relevant)\n\n${sdkContext}`,
    `## Request\n\n${message}`,
    `\nOutput <file_patches> for any code change. If answering a question with no change needed, reply directly.`,
  ].filter(Boolean).join("\n\n");
}
