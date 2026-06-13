/**
 * Build Transaction — pre-apply candidate validation gate.
 *
 * The invariant: applyFilePatches is NEVER called with a candidate that has
 * fatal structural issues. All generated files assemble in a CandidateFiles
 * map, validators run against the in-memory candidate, one targeted repair
 * attempt happens if needed, then the commit applies the candidate once.
 *
 * Fatal types that block apply:
 *   missing-app-tsx  — src/App.tsx wasn't generated
 *   missing-file     — a relative import resolves to a non-existent file
 *   truncated        — a TSX/TS file has unbalanced braces (was cut off)
 *   sdk-npm-import   — @nutrient-sdk/viewer or pspdfkit npm import leaked through
 *
 * Non-fatal issues (handled upstream by sanitizePatch):
 *   CSS syntax, null-guard absence, hex colours outside :root
 */

import type { AIPatchPlan, ProjectFile } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CandidateFiles = Map<string, string>;

export type FatalType =
  | "missing-app-tsx"
  | "missing-file"
  | "truncated"
  | "sdk-npm-import"
  | "export-mismatch";

export interface FatalIssue {
  type: FatalType;
  /** The file that has or triggers the problem (importer or broken file). */
  file: string;
  detail: string;
  /** For missing-file: all candidate paths that were checked for existence. */
  missingPaths?: string[];
  /** For missing-file: the raw import specifier string (e.g. "./components/Foo"). */
  importPath?: string;
}

// ─── Candidate helpers ────────────────────────────────────────────────────────

/**
 * Build a fresh candidate from the current workspace files, then apply a
 * patch plan on top. The base files represent the "before" snapshot so we
 * know which files actually changed when converting back to a patch plan.
 */
export function buildCandidate(
  baseFiles: ProjectFile[],
  patchPlan?: AIPatchPlan | null
): CandidateFiles {
  const c: CandidateFiles = new Map(baseFiles.map((f) => [f.path, f.content]));
  if (patchPlan?.changes) {
    for (const ch of patchPlan.changes) c.set(ch.path, ch.content);
  }
  for (const d of patchPlan?.deletes ?? []) c.delete(d);
  return c;
}

/**
 * Merge a patch plan into an existing candidate in-place.
 * Later patches override earlier ones for the same path.
 */
export function mergeIntoCandidate(
  candidate: CandidateFiles,
  patchPlan: AIPatchPlan | null
): void {
  if (!patchPlan?.changes) return;
  for (const ch of patchPlan.changes) candidate.set(ch.path, ch.content);
  for (const d of patchPlan.deletes ?? []) candidate.delete(d);
}

/**
 * Convert a candidate back to a ProjectFile array so it can be passed as
 * `filesOverride` to the AI request function (which expects ProjectFile[]).
 */
export function candidateToProjectFiles(
  candidate: CandidateFiles,
  baseFiles: ProjectFile[]
): ProjectFile[] {
  const baseMap = new Map(baseFiles.map((f) => [f.path, f]));
  const result: ProjectFile[] = [];
  for (const [path, content] of candidate.entries()) {
    const base = baseMap.get(path);
    if (base) {
      result.push({ ...base, content });
    } else {
      result.push({
        id: path,
        workspaceId: baseFiles[0]?.workspaceId ?? "",
        path,
        content,
        isSystem: false,
        language: /\.(tsx?|jsx?)$/.test(path)
          ? "typescript"
          : path.endsWith(".css")
          ? "css"
          : path.endsWith(".json")
          ? "json"
          : "plaintext",
        updatedAt: new Date().toISOString(),
      });
    }
  }
  return result;
}

/**
 * Convert a candidate into a patch plan containing only files that differ
 * from the original base. Safe to pass directly to applyFilePatches.
 */
export function candidateToPatchPlan(
  candidate: CandidateFiles,
  baseFiles: ProjectFile[],
  plan: string
): AIPatchPlan | null {
  const baseMap = new Map(baseFiles.map((f) => [f.path, f.content]));
  const changes: { path: string; content: string }[] = [];
  for (const [path, content] of candidate.entries()) {
    if (baseMap.get(path) !== content) changes.push({ path, content });
  }
  if (!changes.length) return null;
  return { plan, changes };
}

// ─── Fatal detection ──────────────────────────────────────────────────────────

const SDK_NPM_RE = /^import\s+[^'"]*from\s+['"](@nutrient-sdk\/viewer|pspdfkit)['"]/m;

function isFileTruncated(content: string, path: string): boolean {
  if (!/\.(tsx?|jsx?)$/.test(path)) return false;
  const trimmed = content.trim();
  if (!trimmed || !/[};>"')]$/.test(trimmed)) return true;
  let depth = 0;
  let i = 0;
  while (i < trimmed.length) {
    const ch = trimmed[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      const q = ch;
      i++;
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

function resolveRelativeImport(sourceDir: string, importPath: string): string[] {
  const raw = (sourceDir ? sourceDir + "/" : "") + importPath;
  const parts = raw.split("/");
  const stack: string[] = [];
  for (const p of parts) {
    if (p === "..") stack.pop();
    else if (p !== "." && p !== "") stack.push(p);
  }
  const base = stack.join("/");
  return [
    base,
    base + ".tsx",
    base + ".ts",
    base + ".jsx",
    base + ".js",
    base + "/index.tsx",
    base + "/index.ts",
  ];
}

function scanMissingImports(
  path: string,
  content: string,
  candidate: CandidateFiles
): FatalIssue[] {
  if (!/\.(tsx?|jsx?)$/.test(path)) return [];
  const sourceDir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
  const issues: FatalIssue[] = [];
  const re = /^import\s[^;]+from\s+['"](\.[^'"]+)['"]/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const importPath = m[1];
    const candidates = resolveRelativeImport(sourceDir, importPath);
    if (!candidates.some((p) => candidate.has(p))) {
      const preferred =
        candidates.find((p) => p.endsWith(".tsx")) ??
        candidates.find((p) => p.endsWith(".ts")) ??
        candidates[1];
      issues.push({
        type: "missing-file",
        file: path,
        detail: `\`${path}\` imports "${importPath}" but the file is not in the candidate. Create: ${preferred}`,
        missingPaths: candidates,
        importPath,
      });
    }
  }
  return issues;
}

/** Extract the set of named exports from a file's content. */
function getNamedExports(content: string): Set<string> {
  const names = new Set<string>();
  // export function Foo / export const Foo / export class Foo / export type Foo
  const re1 = /^export\s+(?:async\s+)?(?:function|const|let|var|class|type|enum|interface)\s+([A-Za-z_$][\w$]*)/gm;
  let m: RegExpExecArray | null;
  while ((m = re1.exec(content)) !== null) names.add(m[1]);
  // export { Foo, Bar as Baz }
  const re2 = /^export\s*\{([^}]+)\}/gm;
  while ((m = re2.exec(content)) !== null) {
    for (const part of m[1].split(",")) {
      const alias = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (alias) names.add(alias);
    }
  }
  return names;
}

function scanExportMismatches(
  path: string,
  content: string,
  candidate: CandidateFiles
): FatalIssue[] {
  if (!/\.(tsx?|jsx?)$/.test(path)) return [];
  const sourceDir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
  const issues: FatalIssue[] = [];

  // Match: import { Foo, Bar } from "./something"
  const re = /^import\s+\{([^}]+)\}\s+from\s+['"](\.[^'"]+)['"]/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const namedImports = m[1]
      .split(",")
      .map((s) => s.trim().split(/\s+as\s+/)[0].trim())
      .filter(Boolean);
    const importPath = m[2];
    const candidates = resolveRelativeImport(sourceDir, importPath);
    const targetPath = candidates.find((p) => candidate.has(p));
    if (!targetPath) continue; // missing-file is already caught above
    const targetContent = candidate.get(targetPath)!;
    const exports = getNamedExports(targetContent);
    for (const name of namedImports) {
      if (name === "type" || name === "default") continue; // type-only or re-exported default
      if (!exports.has(name)) {
        issues.push({
          type: "export-mismatch",
          file: path,
          detail: `\`${path}\` imports { ${name} } from "${importPath}" but ${targetPath} does not export "${name}". Add \`export function ${name}\` or \`export const ${name}\` to ${targetPath}.`,
        });
      }
    }
  }
  return issues;
}

/**
 * Detect all fatal structural issues in the candidate. Returns an empty array
 * when the candidate is structurally sound and safe to apply.
 */
export function detectFatalIssues(candidate: CandidateFiles): FatalIssue[] {
  const issues: FatalIssue[] = [];

  if (!candidate.has("src/App.tsx")) {
    issues.push({
      type: "missing-app-tsx",
      file: "src/App.tsx",
      detail: "src/App.tsx is missing — the app cannot render without it.",
    });
    return issues;
  }

  for (const [path, content] of candidate.entries()) {
    if (!/\.(tsx?|jsx?)$/.test(path)) continue;

    if (SDK_NPM_RE.test(content)) {
      issues.push({
        type: "sdk-npm-import",
        file: path,
        detail: `${path} imports from @nutrient-sdk/viewer or pspdfkit — use window.NutrientViewer via CDN instead.`,
      });
    }

    if (isFileTruncated(content, path)) {
      issues.push({
        type: "truncated",
        file: path,
        detail: `${path} appears truncated (unbalanced braces — file was cut off during generation).`,
      });
    }

    issues.push(...scanMissingImports(path, content, candidate));
    issues.push(...scanExportMismatches(path, content, candidate));
  }

  return issues;
}

/**
 * From a list of fatal issues, extract the set of file paths that need to
 * be created to fix missing-import fatals.
 */
export function getMissingFilePaths(issues: FatalIssue[]): string[] {
  const result = new Set<string>();
  for (const issue of issues) {
    if (issue.type !== "missing-file" || !issue.missingPaths?.length) continue;
    const preferred =
      issue.missingPaths.find((p) => p.endsWith(".tsx")) ??
      issue.missingPaths.find((p) => p.endsWith(".ts")) ??
      issue.missingPaths[0];
    if (preferred) result.add(preferred);
  }
  return Array.from(result);
}

/** Format fatal issues for user-facing display. */
export function describeFatalIssues(issues: FatalIssue[]): string {
  if (!issues.length) return "";
  return issues
    .map((i, idx) => `${idx + 1}. [${i.type}] ${i.detail}`)
    .join("\n");
}

/**
 * Build a tight, targeted repair prompt for Claude. Only asks for the specific
 * files that are missing or truncated — not a full rebuild.
 */
export function buildTargetedRepairPrompt(
  userText: string,
  issues: FatalIssue[],
  candidate: CandidateFiles
): string {
  const missingPaths = getMissingFilePaths(issues);
  const truncatedFiles = [
    ...new Set(
      issues.filter((i) => i.type === "truncated").map((i) => i.file)
    ),
  ];

  const lines: string[] = [
    userText,
    "",
    "TARGETED FATAL-ERROR REPAIR — generate ONLY the files listed below",
    "",
  ];

  if (missingPaths.length > 0) {
    lines.push("## Missing files (imported but not generated):");
    for (const path of missingPaths) {
      const importerIssue = issues.find(
        (i) => i.type === "missing-file" && i.missingPaths?.includes(path)
      );
      const importedAs = importerIssue?.importPath ?? path;
      const importer = importerIssue?.file ?? "App.tsx";
      lines.push(`- ${path}  (imported as "${importedAs}" in ${importer})`);
    }
    lines.push("");

    const importers = [
      ...new Set(
        issues
          .filter((i) => i.type === "missing-file")
          .map((i) => i.file)
          .slice(0, 2)
      ),
    ];
    for (const imp of importers) {
      const content = candidate.get(imp);
      if (content) {
        const importLines = content
          .split("\n")
          .filter((l) => l.startsWith("import"))
          .slice(0, 20)
          .join("\n");
        if (importLines) {
          lines.push(`${imp} imports:\n\`\`\`\n${importLines}\n\`\`\``);
        }
      }
    }
    lines.push("");
  }

  if (truncatedFiles.length > 0) {
    lines.push("## Truncated files (regenerate completely):");
    truncatedFiles.forEach((f) => lines.push(`- ${f}`));
    lines.push("");
  }

  const exportMismatchIssues = issues.filter((i) => i.type === "export-mismatch");
  if (exportMismatchIssues.length > 0) {
    const filesToFix = [...new Set(exportMismatchIssues.map((i) => i.file))];
    lines.push("## Export/import name mismatches (fix the exporting file):");
    for (const issue of exportMismatchIssues) {
      lines.push(`- ${issue.detail}`);
    }
    lines.push("");
    lines.push("Files that need export fixes:");
    filesToFix.forEach((f) => lines.push(`- ${f}`));
    lines.push("");
  }

  lines.push(
    "Rules:",
    "- Output exactly one <file_patches> block.",
    "- Include ONLY the files listed above — do NOT regenerate files that already exist.",
    "- Full, untruncated file content only.",
    "- Components in src/components/, src/pages/, src/layouts/ MUST use `export default function ComponentName()`.",
    "- Hooks in src/hooks/ use named exports: `export function useHookName()`.",
    "- Data and types use named exports.",
    "- Match exports EXACTLY to what the importing files expect — named imports require named exports.",
    "- No <thinking>, no prose."
  );

  return lines.join("\n");
}
