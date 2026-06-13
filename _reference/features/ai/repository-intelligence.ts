import type { AIPatchPlan, ProjectFile } from "@/types";

type ProjectFileLike = Pick<ProjectFile, "path" | "content" | "language">;

export type RepositoryFileRole =
  | "project-memory"
  | "app-root"
  | "viewer-wrapper"
  | "error-boundary"
  | "entrypoint"
  | "stylesheet"
  | "layout"
  | "page"
  | "component"
  | "hook"
  | "service"
  | "store"
  | "data"
  | "types"
  | "utility"
  | "backend"
  | "package"
  | "config"
  | "document"
  | "other";

export interface ImportEdge {
  from: string;
  to: string;
  specifier: string;
}

export interface ExportSummary {
  named: string[];
  hasDefault: boolean;
}

export interface RepositoryFileInsight {
  path: string;
  role: RepositoryFileRole;
  language: string;
  lineCount: number;
  imports: string[];
  importers: string[];
  exports: ExportSummary;
  symbols: string[];
  domainTokens: string[];
  nutrientCapabilities: string[];
  customCssClasses: string[];
  jsxClassNames: string[];
  summary: string;
}

export interface ArchitectureSummary {
  scope: "empty" | "focused-sdk" | "focused-workflow" | "full-product" | "backend-pipeline" | "unknown";
  directories: string[];
  entrypoints: string[];
  routingModel: string;
  stateModel: string;
  stylingModel: string;
  validationModel: string;
  nutrientModel: string;
}

export interface NutrientMcpContext {
  documentEnginePackage: string;
  dwsPackage: string;
  credentialRequirement: string;
  generatedAppRule: string;
}

export interface NutrientRepositoryContext {
  wrapperPresent: boolean;
  viewerMounts: string[];
  capabilities: string[];
  productSignals: string[];
  mcp: NutrientMcpContext;
}

export interface RepositoryIntelligence {
  files: RepositoryFileInsight[];
  fileTree: string[];
  edges: ImportEdge[];
  architecture: ArchitectureSummary;
  nutrient: NutrientRepositoryContext;
  risks: string[];
  countsByRole: Record<string, number>;
}

export interface ContextRelevantFile extends RepositoryFileInsight {
  relevance: number;
  reasons: string[];
}

export interface ContextPack {
  request: string;
  summary: string;
  fileTree: string[];
  architecture: ArchitectureSummary;
  nutrient: NutrientRepositoryContext;
  relevantFiles: ContextRelevantFile[];
  risks: string[];
  intelligence: RepositoryIntelligence;
}

const CODE_FILE_RE = /\.(tsx?|jsx?|css|json|md)$/;
const SOURCE_FILE_RE = /\.(tsx?|jsx?)$/;

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "into",
  "make",
  "build",
  "create",
  "update",
  "change",
  "please",
  "app",
  "web",
  "page",
  "file",
  "files",
  "code",
  "using",
  "want",
  "need",
]);

const NUTRIENT_REQUEST_TOKENS = new Set([
  "nutrient",
  "pdf",
  "document",
  "viewer",
  "annotation",
  "annotations",
  "redaction",
  "redact",
  "signature",
  "signatures",
  "forms",
  "ocr",
  "extract",
  "extraction",
  "comparison",
  "mcp",
  "dws",
  "engine",
]);

function languageFromPath(path: string, fallback?: string): string {
  if (fallback) return fallback;
  if (path.endsWith(".tsx")) return "tsx";
  if (path.endsWith(".ts")) return "ts";
  if (path.endsWith(".jsx")) return "jsx";
  if (path.endsWith(".js")) return "js";
  if (path.endsWith(".css")) return "css";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".md")) return "markdown";
  if (path.endsWith(".py")) return "python";
  return "text";
}

function classifyRole(path: string, content: string): RepositoryFileRole {
  if (path === "NUTRIENTWEBBUILDER.md") return "project-memory";
  if (path === "src/App.tsx") return "app-root";
  if (path === "src/NutrientViewer.tsx") return "viewer-wrapper";
  if (path === "src/ErrorBoundary.tsx") return "error-boundary";
  if (path === "src/main.tsx") return "entrypoint";
  if (path === "src/index.css" || path.endsWith(".css")) return "stylesheet";
  if (path.startsWith("src/layouts/")) return "layout";
  if (path.startsWith("src/pages/")) return "page";
  if (path.startsWith("src/components/")) return "component";
  if (path.startsWith("src/hooks/") || /export\s+function\s+use[A-Z]/.test(content)) return "hook";
  if (path.startsWith("src/services/")) return "service";
  if (path.startsWith("src/store/")) return "store";
  if (path.startsWith("src/data/")) return "data";
  if (path.startsWith("src/types/")) return "types";
  if (path.startsWith("src/utils/") || path.startsWith("src/lib/")) return "utility";
  if (path.startsWith("backend/") || path.startsWith("scripts/") || path.startsWith("api/")) return "backend";
  if (path === "package.json") return "package";
  if (path.endsWith(".config.ts") || path.endsWith(".config.js") || path.startsWith("config/")) return "config";
  if (/\.(md|txt|sql|ya?ml)$/.test(path)) return "document";
  return "other";
}

function applyPatchPlan(
  projectFiles: ProjectFileLike[],
  patchPlan?: AIPatchPlan | null
): ProjectFileLike[] {
  let files = projectFiles.map((file) => ({ ...file }));
  if (!patchPlan) return files;

  for (const rename of patchPlan.renames ?? []) {
    files = files.map((file) => file.path === rename.from ? { ...file, path: rename.to } : file);
  }

  const deletes = new Set(patchPlan.deletes ?? []);
  if (deletes.size) files = files.filter((file) => !deletes.has(file.path));

  const changes = new Map((patchPlan.changes ?? []).map((change) => [change.path, change.content]));
  files = files.map((file) =>
    changes.has(file.path)
      ? { ...file, content: changes.get(file.path)!, language: languageFromPath(file.path, file.language) }
      : file
  );

  for (const [path, content] of changes) {
    if (!files.some((file) => file.path === path)) {
      files.push({ path, content, language: languageFromPath(path) });
    }
  }

  return files;
}

function normalizeRelativePath(fromPath: string, specifier: string): string {
  const base = fromPath.split("/").slice(0, -1);
  const normalized: string[] = [];
  for (const part of [...base, ...specifier.split("/")]) {
    if (!part || part === ".") continue;
    if (part === "..") normalized.pop();
    else normalized.push(part);
  }
  return normalized.join("/");
}

function resolveRelativeImport(
  fromPath: string,
  specifier: string,
  filePaths: Set<string>
): string | null {
  if (!specifier.startsWith(".")) return null;
  const base = normalizeRelativePath(fromPath, specifier);
  const candidates = /\.(tsx?|jsx?|css|json|svg|png|jpg|jpeg|webp)$/.test(base)
    ? [base]
    : [
        `${base}.tsx`,
        `${base}.ts`,
        `${base}.jsx`,
        `${base}.js`,
        `${base}.css`,
        `${base}.json`,
        `${base}/index.tsx`,
        `${base}/index.ts`,
      ];
  return candidates.find((candidate) => filePaths.has(candidate)) ?? null;
}

function parseImportSpecifiers(content: string): string[] {
  const specifiers = new Set<string>();
  const importRe = /(?:^|\n)\s*import\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g;
  const exportRe = /(?:^|\n)\s*export\s+[\s\S]*?\s+from\s+["']([^"']+)["']/g;
  const dynamicRe = /import\s*\(\s*["']([^"']+)["']\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = importRe.exec(content)) !== null) specifiers.add(match[1]);
  while ((match = exportRe.exec(content)) !== null) specifiers.add(match[1]);
  while ((match = dynamicRe.exec(content)) !== null) specifiers.add(match[1]);
  return Array.from(specifiers);
}

function parseExports(content: string): ExportSummary {
  const named = new Set<string>();
  const hasDefault = /\bexport\s+default\b/.test(content);
  const declRe = /\bexport\s+(?:async\s+)?(?:function|const|class|interface|type|enum|let|var)\s+([A-Za-z_$][\w$]*)/g;
  const listRe = /\bexport\s*\{([^}]+)\}/g;
  let match: RegExpExecArray | null;
  while ((match = declRe.exec(content)) !== null) named.add(match[1]);
  while ((match = listRe.exec(content)) !== null) {
    for (const rawPart of match[1].split(",")) {
      const parts = rawPart.trim().split(/\s+as\s+/);
      const exported = (parts[1] ?? parts[0]).trim();
      if (exported) named.add(exported);
    }
  }
  return { named: Array.from(named).sort(), hasDefault };
}

function extractSymbols(content: string): string[] {
  const symbols = new Set<string>();
  const re = /\b(?:export\s+)?(?:async\s+)?(?:function|const|class|interface|type|enum|let|var)\s+([A-Za-z_$][\w$]*)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    const name = match[1];
    if (/^[A-Z]/.test(name) || /^use[A-Z]/.test(name) || /Service$|Store$|State$|Data$|Config$/.test(name)) {
      symbols.add(name);
    }
  }
  return Array.from(symbols).sort().slice(0, 30);
}

function tokenize(value: string): string[] {
  const expanded = value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_/-]/g, " ")
    .toLowerCase();
  const tokens = expanded
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
  const withSingulars = new Set(tokens);
  for (const token of tokens) {
    if (token.endsWith("s") && token.length > 4) withSingulars.add(token.slice(0, -1));
  }
  return Array.from(withSingulars);
}

function extractDomainTokens(path: string, content: string, symbols: string[]): string[] {
  const source = [
    path.replace(/\.(tsx?|jsx?|css|json|md)$/, ""),
    symbols.join(" "),
    content.slice(0, 1600),
  ].join(" ");
  return Array.from(new Set(tokenize(source))).slice(0, 40);
}

function extractCssClasses(content: string): string[] {
  const classes = new Set<string>();
  const re = /\.(-?[_a-zA-Z]+[_a-zA-Z0-9-]*)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) classes.add(match[1]);
  return Array.from(classes).sort().slice(0, 80);
}

function extractJsxClassNames(content: string): string[] {
  const names = new Set<string>();
  const literalRe = /className\s*=\s*["']([^"']+)["']/g;
  const templateRe = /className\s*=\s*\{`([^`]+)`\}/g;
  let match: RegExpExecArray | null;
  while ((match = literalRe.exec(content)) !== null) {
    for (const token of match[1].split(/\s+/)) {
      if (token && !token.includes("$")) names.add(token);
    }
  }
  while ((match = templateRe.exec(content)) !== null) {
    for (const token of match[1].split(/\s+/)) {
      if (token && !token.includes("$") && !token.includes("{")) names.add(token);
    }
  }
  return Array.from(names).sort().slice(0, 80);
}

function detectNutrientCapabilities(path: string, content: string): string[] {
  const capabilities = new Set<string>();
  const tests: Array<[string, RegExp]> = [
    ["web-sdk-wrapper", /window\.NutrientViewer|NutrientViewer\.load|@nutrient-sdk\/viewer/],
    ["viewer-mount", /<NutrientViewer\b|NutrientViewer\(/],
    ["toolbar-config", /toolbarItems|ToolbarItem/],
    ["annotations", /annotations?\.|HighlightAnnotation|NoteAnnotation|highlighter|ink|note/i],
    ["redaction", /redact|applyRedactions/i],
    ["forms", /form-creator|forms?|FormField/i],
    ["signatures", /signature|signer|signed/i],
    ["search", /\.search\(|searchText|search term/i],
    ["export-pdf", /exportPDF|export-pdf|audit pdf/i],
    ["comparison", /document-comparison|comparison/i],
    ["ocr-extraction", /ocr|extract|extraction|confidence|field validation/i],
    ["ai-document-processing", /AI Assistant|document assistant|cited|answer/i],
    ["mcp", /mcp|Model Context Protocol|document-engine-mcp|dws-mcp/i],
  ];
  for (const [name, re] of tests) {
    if (re.test(content) || (name === "viewer-mount" && path === "src/NutrientViewer.tsx")) {
      capabilities.add(name);
    }
  }
  return Array.from(capabilities).sort();
}

function summarizeFile(
  path: string,
  role: RepositoryFileRole,
  imports: string[],
  exports: ExportSummary,
  symbols: string[],
  nutrientCapabilities: string[]
): string {
  const bits = [`${role}`];
  if (symbols.length) bits.push(`symbols: ${symbols.slice(0, 6).join(", ")}`);
  if (exports.hasDefault || exports.named.length) {
    bits.push(`exports: ${exports.hasDefault ? "default" : ""}${exports.hasDefault && exports.named.length ? ", " : ""}${exports.named.slice(0, 6).join(", ")}`);
  }
  if (imports.length) bits.push(`imports ${imports.length} local file${imports.length === 1 ? "" : "s"}`);
  if (nutrientCapabilities.length) bits.push(`Nutrient: ${nutrientCapabilities.join(", ")}`);
  if (path === "NUTRIENTWEBBUILDER.md") bits.push("long-term project memory");
  return bits.join(" | ");
}

function inferArchitecture(files: RepositoryFileInsight[], edges: ImportEdge[]): ArchitectureSummary {
  const dirs = new Set<string>();
  for (const file of files) {
    const parts = file.path.split("/");
    if (parts.length > 1) dirs.add(parts.slice(0, -1).join("/"));
  }

  const hasPages = files.some((file) => file.role === "page");
  const hasLayouts = files.some((file) => file.role === "layout");
  const hasViewer = files.some((file) => file.path === "src/NutrientViewer.tsx");
  const hasBackend = files.some((file) => file.role === "backend");
  const hasServices = files.some((file) => file.role === "service");
  const hasHooks = files.some((file) => file.role === "hook");
  const hasStore = files.some((file) => file.role === "store");
  const hasData = files.some((file) => file.role === "data");
  const hasTypes = files.some((file) => file.role === "types");
  const app = files.find((file) => file.path === "src/App.tsx");
  const appContentSignals = app?.domainTokens.join(" ") ?? "";
  const pageCount = files.filter((file) => file.role === "page").length;

  let scope: ArchitectureSummary["scope"] = "unknown";
  if (files.length === 0) scope = "empty";
  else if (hasBackend) scope = "backend-pipeline";
  else if (hasViewer && !hasPages && pageCount === 0) scope = "focused-sdk";
  else if (hasPages && pageCount >= 3 && hasLayouts) scope = "full-product";
  else if (hasPages || hasServices || hasHooks) scope = "focused-workflow";

  const routingModel = /react-router|createBrowserRouter|Routes\b/.test(appContentSignals)
    ? "external router detected"
    : app && /useState|activePage|setPage|currentPage|view/.test(app.summary + " " + app.domainTokens.join(" "))
      ? "React state page switching"
      : hasPages
        ? "page components present; route wiring should be verified in src/App.tsx"
        : "single surface";

  const statePieces = [
    hasHooks ? "custom hooks" : "",
    hasServices ? "service layer" : "",
    hasStore ? "shared store" : "",
    hasData ? "mock data" : "",
    hasTypes ? "domain types" : "",
  ].filter(Boolean);

  return {
    scope,
    directories: Array.from(dirs).sort(),
    entrypoints: files
      .filter((file) => ["app-root", "entrypoint", "viewer-wrapper", "project-memory"].includes(file.role))
      .map((file) => file.path),
    routingModel,
    stateModel: statePieces.length ? statePieces.join(" + ") : "local component state or not yet modeled",
    stylingModel: files.some((file) => file.path === "src/index.css")
      ? "src/index.css CSS variables and component classes"
      : "styling model missing",
    validationModel: "local import/export, CSS class, SDK, truncation, and first-render array guards run before preview",
    nutrientModel: hasViewer
      ? "local src/NutrientViewer.tsx wrapper owns Web SDK loading; generated app code should only mount the wrapper"
      : "Nutrient viewer wrapper missing or not yet generated",
  };
}

function inferNutrientContext(files: RepositoryFileInsight[]): NutrientRepositoryContext {
  const capabilities = new Set<string>();
  const viewerMounts: string[] = [];
  const productSignals = new Set<string>();

  for (const file of files) {
    for (const capability of file.nutrientCapabilities) capabilities.add(capability);
    if (file.nutrientCapabilities.includes("viewer-mount")) viewerMounts.push(file.path);
    for (const token of file.domainTokens) {
      if (NUTRIENT_REQUEST_TOKENS.has(token) || /contract|claim|invoice|packet|record|evidence|audit|signature|redaction/.test(token)) {
        productSignals.add(token);
      }
    }
  }

  return {
    wrapperPresent: files.some((file) => file.path === "src/NutrientViewer.tsx"),
    viewerMounts: Array.from(new Set(viewerMounts)).sort(),
    capabilities: Array.from(capabilities).sort(),
    productSignals: Array.from(productSignals).sort().slice(0, 24),
    mcp: {
      documentEnginePackage: "@nutrient-sdk/document-engine-mcp-server",
      dwsPackage: "@nutrient-sdk/dws-mcp-server",
      credentialRequirement: "Requires Document Engine or DWS credentials/environment. Do not assume MCP is available inside the browser preview.",
      generatedAppRule: "Generated React apps should expose service adapters/local simulations; live MCP belongs in the agent/backend environment, not direct browser code.",
    },
  };
}

function inferRisks(files: RepositoryFileInsight[], architecture: ArchitectureSummary, nutrient: NutrientRepositoryContext): string[] {
  const risks: string[] = [];
  const paths = new Set(files.map((file) => file.path));

  if (!paths.has("NUTRIENTWEBBUILDER.md")) risks.push("Project memory is missing; future edits will lose architectural context.");
  if (!paths.has("src/App.tsx")) risks.push("src/App.tsx is missing; the preview has no root app.");
  if (!paths.has("src/index.css")) risks.push("src/index.css is missing; generated UI may be unstyled or inconsistent.");

  const app = files.find((file) => file.path === "src/App.tsx");
  if (app && app.lineCount > 320 && architecture.scope !== "focused-sdk") {
    risks.push("src/App.tsx is large; further feature work should split logic into pages/components/hooks.");
  }
  if (architecture.scope === "full-product" && !files.some((file) => file.role === "types")) {
    risks.push("Full-product structure lacks domain types; data contracts are likely implicit.");
  }
  if (architecture.scope === "full-product" && !files.some((file) => file.role === "service")) {
    risks.push("Full-product structure lacks services; workflow actions may be trapped in components.");
  }
  if (nutrient.capabilities.length > 0 && !nutrient.wrapperPresent) {
    risks.push("Nutrient capability references exist but src/NutrientViewer.tsx is missing.");
  }
  if (nutrient.wrapperPresent && nutrient.viewerMounts.length === 0) {
    risks.push("Nutrient viewer wrapper exists but no product surface mounts it yet.");
  }

  return risks;
}

export function buildRepositoryIntelligence(
  projectFiles: ProjectFileLike[],
  patchPlan?: AIPatchPlan | null
): RepositoryIntelligence {
  const mergedFiles = applyPatchPlan(projectFiles, patchPlan).filter((file) => CODE_FILE_RE.test(file.path) || file.path.startsWith("backend/") || file.path.startsWith("scripts/"));
  const filePaths = new Set(mergedFiles.map((file) => file.path));
  const edges: ImportEdge[] = [];

  for (const file of mergedFiles) {
    if (!SOURCE_FILE_RE.test(file.path)) continue;
    for (const specifier of parseImportSpecifiers(file.content)) {
      const resolved = resolveRelativeImport(file.path, specifier, filePaths);
      if (resolved) edges.push({ from: file.path, to: resolved, specifier });
    }
  }

  const importsByFile = new Map<string, string[]>();
  const importersByFile = new Map<string, string[]>();
  for (const edge of edges) {
    importsByFile.set(edge.from, [...(importsByFile.get(edge.from) ?? []), edge.to]);
    importersByFile.set(edge.to, [...(importersByFile.get(edge.to) ?? []), edge.from]);
  }

  const files = mergedFiles
    .map((file): RepositoryFileInsight => {
      const role = classifyRole(file.path, file.content);
      const exports = parseExports(file.content);
      const symbols = extractSymbols(file.content);
      const nutrientCapabilities = detectNutrientCapabilities(file.path, file.content);
      const imports = Array.from(new Set(importsByFile.get(file.path) ?? [])).sort();
      const importers = Array.from(new Set(importersByFile.get(file.path) ?? [])).sort();
      const customCssClasses = file.path.endsWith(".css") ? extractCssClasses(file.content) : [];
      const jsxClassNames = SOURCE_FILE_RE.test(file.path) ? extractJsxClassNames(file.content) : [];
      const domainTokens = extractDomainTokens(file.path, file.content, symbols);
      return {
        path: file.path,
        role,
        language: languageFromPath(file.path, file.language),
        lineCount: file.content.split("\n").length,
        imports,
        importers,
        exports,
        symbols,
        domainTokens,
        nutrientCapabilities,
        customCssClasses,
        jsxClassNames,
        summary: summarizeFile(file.path, role, imports, exports, symbols, nutrientCapabilities),
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path));

  const architecture = inferArchitecture(files, edges);
  const nutrient = inferNutrientContext(files);
  const risks = inferRisks(files, architecture, nutrient);
  const countsByRole = files.reduce<Record<string, number>>((acc, file) => {
    acc[file.role] = (acc[file.role] ?? 0) + 1;
    return acc;
  }, {});

  return {
    files,
    fileTree: files.map((file) => file.path),
    edges,
    architecture,
    nutrient,
    risks,
    countsByRole,
  };
}

function parseRuntimeStackPaths(runtimeErrors: string[]): string[] {
  const paths = new Set<string>();
  for (const error of runtimeErrors) {
    const re = /\/src\/([^):\s]+):\d+:\d+/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(error)) !== null) paths.add(`src/${match[1]}`);
  }
  return Array.from(paths);
}

function addScore(
  scores: Map<string, { score: number; reasons: Set<string> }>,
  path: string,
  amount: number,
  reason: string
) {
  const current = scores.get(path) ?? { score: 0, reasons: new Set<string>() };
  current.score += amount;
  current.reasons.add(reason);
  scores.set(path, current);
}

function rankRelevantFiles(
  request: string,
  intelligence: RepositoryIntelligence,
  runtimeErrors: string[],
  recentChangedPaths: string[],
  maxFiles: number
): ContextRelevantFile[] {
  const scores = new Map<string, { score: number; reasons: Set<string> }>();
  const filesByPath = new Map(intelligence.files.map((file) => [file.path, file]));
  const requestTokens = new Set(tokenize(request));
  const nutrientRequest = Array.from(requestTokens).some((token) => NUTRIENT_REQUEST_TOKENS.has(token));
  const runtimePaths = parseRuntimeStackPaths(runtimeErrors);

  for (const file of intelligence.files) {
    if (file.path === "NUTRIENTWEBBUILDER.md") addScore(scores, file.path, 25, "project memory");
    if (file.path === "src/App.tsx") addScore(scores, file.path, 24, "root composition");
    if (file.path === "src/index.css") addScore(scores, file.path, 14, "design system");
    if (file.path === "src/NutrientViewer.tsx") addScore(scores, file.path, nutrientRequest ? 24 : 10, "Nutrient wrapper");
    if (["hook", "service", "store", "data", "types"].includes(file.role)) addScore(scores, file.path, 4, `${file.role} context`);
    if (["page", "layout", "component"].includes(file.role)) addScore(scores, file.path, 3, `${file.role} context`);

    let tokenMatches = 0;
    for (const token of requestTokens) {
      if (file.domainTokens.includes(token)) tokenMatches++;
      else if (file.path.toLowerCase().includes(token)) tokenMatches++;
      else if (file.symbols.some((symbol) => symbol.toLowerCase().includes(token))) tokenMatches++;
    }
    if (tokenMatches) addScore(scores, file.path, tokenMatches * 8, `request token match x${tokenMatches}`);

    if (nutrientRequest && file.nutrientCapabilities.length) {
      addScore(scores, file.path, 14, "Nutrient capability match");
    }
  }

  for (const path of runtimePaths) {
    if (filesByPath.has(path)) addScore(scores, path, 40, "runtime stack frame");
  }

  for (const path of recentChangedPaths) {
    if (filesByPath.has(path)) addScore(scores, path, 18, "recently changed");
  }

  const seedPaths = Array.from(scores.entries())
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 8)
    .map(([path]) => path);

  for (const edge of intelligence.edges) {
    if (seedPaths.includes(edge.from)) addScore(scores, edge.to, 7, `imported by ${edge.from}`);
    if (seedPaths.includes(edge.to)) addScore(scores, edge.from, 5, `imports ${edge.to}`);
  }

  return Array.from(scores.entries())
    .map(([path, score]) => {
      const insight = filesByPath.get(path);
      if (!insight) return null;
      return {
        ...insight,
        relevance: score.score,
        reasons: Array.from(score.reasons),
      };
    })
    .filter((file): file is ContextRelevantFile => file !== null)
    .sort((a, b) => b.relevance - a.relevance || a.path.localeCompare(b.path))
    .slice(0, maxFiles);
}

export function buildContextPack(
  request: string,
  projectFiles: ProjectFileLike[],
  options: {
    runtimeErrors?: string[];
    recentChangedPaths?: string[];
    candidatePatchPlan?: AIPatchPlan | null;
    maxFiles?: number;
  } = {}
): ContextPack {
  const intelligence = buildRepositoryIntelligence(projectFiles, options.candidatePatchPlan);
  const relevantFiles = rankRelevantFiles(
    request,
    intelligence,
    options.runtimeErrors ?? [],
    options.recentChangedPaths ?? [],
    options.maxFiles ?? 18
  );
  const roleCounts = Object.entries(intelligence.countsByRole)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([role, count]) => `${role}:${count}`)
    .join(", ");
  const summary = [
    `Scope: ${intelligence.architecture.scope}`,
    `Files: ${intelligence.files.length}`,
    roleCounts ? `Roles: ${roleCounts}` : "",
    `Routing: ${intelligence.architecture.routingModel}`,
    `State: ${intelligence.architecture.stateModel}`,
    `Nutrient: ${intelligence.nutrient.capabilities.length ? intelligence.nutrient.capabilities.join(", ") : "none detected"}`,
  ].filter(Boolean).join(" | ");

  return {
    request,
    summary,
    fileTree: intelligence.fileTree,
    architecture: intelligence.architecture,
    nutrient: intelligence.nutrient,
    relevantFiles,
    risks: intelligence.risks,
    intelligence,
  };
}

function formatList(items: string[], fallback = "none"): string {
  return items.length ? items.join(", ") : fallback;
}

export function formatRepositoryIntelligenceForPrompt(intelligence: RepositoryIntelligence): string {
  return [
    `## Repository Intelligence`,
    `Scope: ${intelligence.architecture.scope}`,
    `File count: ${intelligence.files.length}`,
    `Roles: ${Object.entries(intelligence.countsByRole).map(([role, count]) => `${role}:${count}`).join(", ") || "none"}`,
    `Entrypoints: ${formatList(intelligence.architecture.entrypoints)}`,
    `Routing model: ${intelligence.architecture.routingModel}`,
    `State model: ${intelligence.architecture.stateModel}`,
    `Styling model: ${intelligence.architecture.stylingModel}`,
    `Nutrient model: ${intelligence.architecture.nutrientModel}`,
    `Nutrient capabilities: ${formatList(intelligence.nutrient.capabilities)}`,
    `Nutrient MCP packages: ${intelligence.nutrient.mcp.documentEnginePackage}, ${intelligence.nutrient.mcp.dwsPackage}`,
    intelligence.risks.length ? `Risks:\n${intelligence.risks.map((risk) => `- ${risk}`).join("\n")}` : "Risks: none detected",
  ].join("\n");
}

export function formatContextPackForPrompt(pack: ContextPack): string {
  const relevant = pack.relevantFiles
    .map((file) => {
      const exports = [
        file.exports.hasDefault ? "default" : "",
        ...file.exports.named.slice(0, 8),
      ].filter(Boolean).join(", ");
      const parts = [
        `- ${file.path} [${file.role}, score ${file.relevance}]`,
        `reasons: ${file.reasons.join(", ")}`,
        file.symbols.length ? `symbols: ${file.symbols.slice(0, 8).join(", ")}` : "",
        exports ? `exports: ${exports}` : "",
        file.imports.length ? `imports: ${file.imports.slice(0, 6).join(", ")}` : "",
        file.importers.length ? `imported by: ${file.importers.slice(0, 6).join(", ")}` : "",
        file.nutrientCapabilities.length ? `Nutrient: ${file.nutrientCapabilities.join(", ")}` : "",
      ].filter(Boolean);
      return parts.join(" | ");
    })
    .join("\n");

  const architecture = pack.architecture;
  return [
    `## Repository Intelligence Context Pack`,
    `Request: ${pack.request.slice(0, 500)}`,
    `Summary: ${pack.summary}`,
    "",
    `Architecture:`,
    `- Scope: ${architecture.scope}`,
    `- Entrypoints: ${formatList(architecture.entrypoints)}`,
    `- Directories: ${formatList(architecture.directories.slice(0, 18))}`,
    `- Routing: ${architecture.routingModel}`,
    `- State: ${architecture.stateModel}`,
    `- Styling: ${architecture.stylingModel}`,
    `- Validation: ${architecture.validationModel}`,
    `- Nutrient: ${architecture.nutrientModel}`,
    "",
    `Nutrient Product Context:`,
    `- Wrapper present: ${pack.nutrient.wrapperPresent ? "yes" : "no"}`,
    `- Viewer mounts: ${formatList(pack.nutrient.viewerMounts)}`,
    `- Capabilities detected: ${formatList(pack.nutrient.capabilities)}`,
    `- Product signals: ${formatList(pack.nutrient.productSignals)}`,
    `- MCP packages: ${pack.nutrient.mcp.documentEnginePackage} and ${pack.nutrient.mcp.dwsPackage}`,
    `- MCP rule: ${pack.nutrient.mcp.generatedAppRule}`,
    "",
    `Most Relevant Files:`,
    relevant || "- none",
    "",
    pack.risks.length ? `Risks:\n${pack.risks.map((risk) => `- ${risk}`).join("\n")}` : "Risks: none detected",
  ].join("\n");
}
