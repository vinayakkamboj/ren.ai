import type { AIPatchPlan, FilePatch } from "@/types";

export interface ValidationIssue {
  path: string;
  rule: string;
  detail: string;
}

export interface ValidationResult {
  patchPlan: AIPatchPlan;
  issues: ValidationIssue[];
}

export type QualityIssueSeverity = "fatal" | "warning";

export interface RepositoryQualityIssue extends ValidationIssue {
  severity: QualityIssueSeverity;
  evidence?: string;
}

export interface RepositoryQualityReport {
  confidence: number;
  issues: RepositoryQualityIssue[];
  fileCount: number;
  fatalCount: number;
  warningCount: number;
  summary: string;
}

// Auto-injects ?? [] null guards on unguarded array method calls in JSX/TS files.
// Claude's build prompt asks for null guards but consistently misses them, causing
// "Cannot read properties of undefined (reading 'find')" crashes. This converts
//   `shipments.find(...)`  →  `(shipments ?? []).find(...)`
// which turns a crash into a benign empty-result return.
//
// Array-only methods (safe to wrap because strings/objects don't have them):
// find, filter, map, forEach, some, every, reduce, reduceRight, sort, flat,
// flatMap, findIndex, findLast, findLastIndex
//
// Skipped: `.length`, `.slice`, `.includes` — these are also valid on strings,
// so wrapping a string with `?? []` would change behavior unexpectedly.
const ARRAY_ONLY_METHODS = "find|filter|map|forEach|some|every|reduce|reduceRight|sort|flat|flatMap|findIndex|findLast|findLastIndex";
const SKIP_IDENTIFIERS = new Set([
  "React", "console", "window", "document", "Object", "Array", "JSON", "Math",
  "Promise", "Number", "String", "Boolean", "this", "Reflect", "Symbol",
  "globalThis", "performance", "navigator", "localStorage", "sessionStorage",
]);

export function injectNullGuards(content: string, path: string): { content: string; injected: number } {
  if (!/\.(tsx?|jsx?)$/.test(path)) return { content, injected: 0 };

  let injected = 0;
  const guarded = content
    .split("\n")
    .map((line) => {
      // Skip module headers; already-guarded receivers like `(items ?? []).map(`
      // are naturally ignored because the receiver is not a bare identifier.
      if (/^\s*(import|export)\s/.test(line)) return line;
      if (/^\s*\/\//.test(line)) return line;

      let out = line;

      // Pattern A — bare identifier: `shipments.find(`
      out = out.replace(
        new RegExp(
          `(^|[\\s=({\\[,;?:&|!+\\-*/<>])([a-z_$][\\w$]*)\\.(${ARRAY_ONLY_METHODS})\\(`,
          "g"
        ),
        (match, prefix, ident, method) => {
          if (SKIP_IDENTIFIERS.has(ident)) return match;
          injected++;
          return `${prefix}(${ident} ?? []).${method}(`;
        }
      );

      // Pattern B — short dot chain: `data.shipments.find(` / `state.users.map(`
      // Wraps the whole 2-segment access. Skips chains that already have ?. (optional)
      // or that are method calls (parens before .find).
      out = out.replace(
        new RegExp(
          `(^|[\\s=({\\[,;?:&|!+\\-*/<>])([a-z_$][\\w$]*)\\.([a-z_$][\\w$]*)\\.(${ARRAY_ONLY_METHODS})\\(`,
          "g"
        ),
        (match, prefix, root, leaf, method) => {
          if (SKIP_IDENTIFIERS.has(root)) return match;
          // Don't wrap an already-wrapped pattern (defense-in-depth)
          if (match.includes("?? [])")) return match;
          injected++;
          return `${prefix}(${root}?.${leaf} ?? []).${method}(`;
        }
      );

      // Pattern C — optional chain access: `data?.shipments.find(` (one ?. then plain)
      out = out.replace(
        new RegExp(
          `(^|[\\s=({\\[,;?:&|!+\\-*/<>])([a-z_$][\\w$]*)\\?\\.([a-z_$][\\w$]*)\\.(${ARRAY_ONLY_METHODS})\\(`,
          "g"
        ),
        (match, prefix, root, leaf, method) => {
          if (SKIP_IDENTIFIERS.has(root)) return match;
          if (match.includes("?? [])")) return match;
          injected++;
          return `${prefix}(${root}?.${leaf} ?? []).${method}(`;
        }
      );

      // Pattern D — deeper dot chain: `state.pipeline.deals.map(`
      out = out.replace(
        new RegExp(
          `(^|[\\s=({\\[,;?:&|!+\\-*/<>])([a-z_$][\\w$]*)\\.([a-z_$][\\w$]*)\\.([a-z_$][\\w$]*)\\.(${ARRAY_ONLY_METHODS})\\(`,
          "g"
        ),
        (match, prefix, root, mid, leaf, method) => {
          if (SKIP_IDENTIFIERS.has(root)) return match;
          if (match.includes("?? [])")) return match;
          injected++;
          return `${prefix}(${root}?.${mid}?.${leaf} ?? []).${method}(`;
        }
      );

      // Pattern E — keyed bucket access: `dealsByStage[stage].map(`
      out = out.replace(
        new RegExp(
          `(^|[\\s=({\\[,;?:&|!+\\-*/<>])([a-z_$][\\w$]*)\\s*\\[([^\\]\\n]+)\\]\\.(${ARRAY_ONLY_METHODS})\\(`,
          "g"
        ),
        (match, prefix, root, keyExpr, method) => {
          if (SKIP_IDENTIFIERS.has(root)) return match;
          if (match.includes("?? [])")) return match;
          injected++;
          return `${prefix}(${root}?.[${keyExpr}] ?? []).${method}(`;
        }
      );

      // Pattern F — keyed nested bucket access: `state.dealsByStage[stage].map(`
      out = out.replace(
        new RegExp(
          `(^|[\\s=({\\[,;?:&|!+\\-*/<>])([a-z_$][\\w$]*)\\.([a-z_$][\\w$]*)\\s*\\[([^\\]\\n]+)\\]\\.(${ARRAY_ONLY_METHODS})\\(`,
          "g"
        ),
        (match, prefix, root, leaf, keyExpr, method) => {
          if (SKIP_IDENTIFIERS.has(root)) return match;
          if (match.includes("?? [])")) return match;
          injected++;
          return `${prefix}(${root}?.${leaf}?.[${keyExpr}] ?? []).${method}(`;
        }
      );

      return out;
    })
    .join("\n");

  return { content: guarded, injected };
}

// Hard-blocked patterns the SDK CDN constraint forbids. Auto-rewritten in-place.
const NPM_SDK_IMPORT = /^import\s+[^'"]*from\s+['"]@nutrient-sdk\/viewer['"]\s*;?\s*$/gm;
const NPM_PSPDFKIT_IMPORT = /^import\s+[^'"]*from\s+['"]pspdfkit['"]\s*;?\s*$/gm;

// Repairs a CSS file by:
// 1. Trimming any stray non-CSS text after the last `}` (Claude sometimes leaks prose).
// 2. Counting unbalanced braces and appending `}` to close them.
// 3. Returns { content, repaired: boolean } so the caller can log.
export function repairCSS(content: string): { content: string; repaired: boolean } {
  let result = content;
  let repaired = false;

  // Step 0: strip JS-style `// comment` lines that aren't inside strings or
  // block comments. PostCSS treats `//` as invalid syntax → "Unknown word".
  // Claude leaks these constantly when generating CSS.
  result = result.replace(/^\s*\/\/[^\n]*\n?/gm, () => {
    repaired = true;
    return "";
  });

  // Step 0b: strip @tailwind directives — Sandpack has no Tailwind PostCSS plugin
  // (Tailwind loads via CDN). Claude often emits these when it "knows" Tailwind.
  result = result.replace(/^\s*@tailwind\b[^\n]*\n?/gm, () => {
    repaired = true;
    return "";
  });

  // Step 0c: strip @apply directives — same reason: no Tailwind PostCSS plugin.
  // Also strip @layer blocks that only exist because of Tailwind conventions.
  result = result.replace(/^\s*@apply\b[^\n]*;?[ \t]*\n?/gm, () => {
    repaired = true;
    return "";
  });

  // Step 1a: detect and strip stray prose lines OUTSIDE any { ... } block.
  // Walks line-by-line, tracking brace depth. At depth 0, a line that isn't a
  // valid CSS selector start, @-rule, comment, or whitespace is treated as
  // prose leak (e.g. "Continue with workflow classes..." or a bare word).
  // Bracketed lines inside rules are left alone — we only sanitize at depth 0.
  // JS/TS keywords that can appear at depth 0 WITH a `{` (e.g. `const x = {`,
  // `export default function App() {`) must be rejected — they'd fool the
  // selector heuristic and cause "Unknown word" deeper in the file.
  const JS_KW_RE = /^(?:const|let|var|function|export|import|class|return|if|else|for|while|switch|case|try|catch|throw|new|typeof|default|async|await|interface|type|className|style|on[A-Z][A-Za-z0-9_]*)\b/;
  {
    const lines = result.split("\n");
    let depth = 0;
    let inBlockComment = false;
    const kept: string[] = [];
    for (const line of lines) {
      // Track block comments and depth using the line content.
      let scan = 0;
      let lineDepth: number = depth;
      let lineInBlockComment: boolean = inBlockComment;
      while (scan < line.length) {
        const ch = line[scan];
        if (lineInBlockComment) {
          if (ch === "*" && line[scan + 1] === "/") {
            lineInBlockComment = false;
            scan += 2;
            continue;
          }
          scan++;
          continue;
        }
        if (ch === "/" && line[scan + 1] === "*") {
          lineInBlockComment = true;
          scan += 2;
          continue;
        }
        if (ch === '"' || ch === "'") {
          const q = ch;
          scan++;
          while (scan < line.length && line[scan] !== q) {
            if (line[scan] === "\\") scan += 2;
            else scan++;
          }
          scan++;
          continue;
        }
        if (ch === "{") lineDepth++;
        else if (ch === "}") lineDepth--;
        scan++;
      }

      const trimmed = line.trim();
      const startedAtDepthZero = depth === 0 && !inBlockComment;
      const looksLikeCss =
        trimmed === "" ||
        trimmed.startsWith("/*") ||
        trimmed.startsWith("*") ||
        trimmed.startsWith("*/") ||
        trimmed.startsWith("@") ||
        trimmed.startsWith(":") ||
        trimmed.startsWith("[") ||
        trimmed.startsWith(".") ||
        trimmed.startsWith("#") ||
        trimmed.startsWith("&") ||
        trimmed.startsWith("}") ||
        // Selectors like `body {`, `h1 {`, `button:hover {`, `*, *::before {`
        // but NOT JS keywords like `const styles = {` or `export default function() {`
        /^[a-zA-Z*&]/.test(trimmed) && !JS_KW_RE.test(trimmed) && (trimmed.includes("{") || trimmed.includes(",") || trimmed.endsWith(",")) ||
        // Continuation of a multi-line selector ending with ,
        /,$/.test(trimmed);

      // Only filter at depth 0 (between rules). Inside rules we trust the content.
      if (startedAtDepthZero && !looksLikeCss) {
        repaired = true;
        // Drop this line — it's prose leak between rules
      } else {
        kept.push(line);
        depth = lineDepth;
        inBlockComment = lineInBlockComment;
      }
    }
    result = kept.join("\n");
  }

  // Step 1b: trim trailing non-CSS prose. Look for the LAST `}` and trim
  // anything after it that doesn't look like a CSS construct.
  const lastBrace = result.lastIndexOf("}");
  if (lastBrace !== -1 && lastBrace < result.length - 1) {
    const after = result.slice(lastBrace + 1);
    const cleanAfter = after.replace(/\/\*[\s\S]*?\*\//g, "").trim();
    if (cleanAfter.length > 0 && !/^[\s\}@.#\[:*\/]/.test(cleanAfter)) {
      result = result.slice(0, lastBrace + 1) + "\n";
      repaired = true;
    }
  }

  // Step 1c: remove CSS nesting blocks (& selectors inside rules).
  // Sandpack's PostCSS version throws "Unknown word" on `&` selector nesting.
  // We drop the entire nested block rather than try to hoist/flatten it.
  {
    const lines = result.split("\n");
    let ruleDepth = 0;
    let nestDepth = 0; // > 0 while inside a `& { }` block we're dropping
    const kept: string[] = [];
    for (const line of lines) {
      const t = line.trim();
      // Count raw braces on this line (good enough — we already stripped // and prose)
      const opens = (line.match(/\{/g) || []).length;
      const closes = (line.match(/\}/g) || []).length;

      if (nestDepth > 0) {
        // Inside a nested block we're dropping
        nestDepth += opens - closes;
        if (nestDepth < 0) nestDepth = 0;
        repaired = true;
        continue;
      }

      // A line like `  &:hover {` or `  & .child {` at ruleDepth > 0 = nesting start
      if (ruleDepth > 0 && /^&/.test(t) && t.includes("{")) {
        nestDepth = opens - closes; // usually 1 after the `{`
        if (nestDepth <= 0) nestDepth = 1; // guard
        repaired = true;
        continue;
      }

      kept.push(line);
      ruleDepth += opens - closes;
      if (ruleDepth < 0) ruleDepth = 0;
    }
    result = kept.join("\n");
  }

  // Step 1d: strip Tailwind utility/prose lines accidentally written inside a
  // CSS rule body, e.g. `.card { bg-primary/10; border border-border; }`.
  // Sandpack's PostCSS reports these as "Unknown word".
  {
    const lines = result.split("\n");
    let depth = 0;
    const kept: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      const startedInsideRule = depth > 0;
      const opens = (line.match(/\{/g) || []).length;
      const closes = (line.match(/\}/g) || []).length;
      const looksLikeCssRuleBody =
        trimmed === "" ||
        trimmed.startsWith("/*") ||
        trimmed.startsWith("*") ||
        trimmed.startsWith("*/") ||
        trimmed.startsWith("@") ||
        trimmed.startsWith("}") ||
        trimmed.endsWith("{") ||
        trimmed.endsWith(",") ||
        /^[-_a-zA-Z][-_a-zA-Z0-9]*\s*:/.test(trimmed) ||
        /^--[-_a-zA-Z0-9]+\s*:/.test(trimmed) ||
        /^from\s*\{/.test(trimmed) ||
        /^to\s*\{/.test(trimmed) ||
        /^[\d.]+%(\s*,\s*[\d.]+%)*\s*\{/.test(trimmed) ||
        /^["'][^"']+["']\s*;?$/.test(trimmed);

      if (startedInsideRule && !looksLikeCssRuleBody) {
        repaired = true;
      } else {
        kept.push(line);
        depth += opens - closes;
        if (depth < 0) depth = 0;
      }
    }

    result = kept.join("\n");
  }

  // Same repair for compact one-line rules. Claude sometimes emits
  // `.card { bg-primary/10; color: ...; }`, which never enters the line-based
  // rule body pass above because the opening and closing brace are on one line.
  result = result.replace(/([^{}]+)\{([^{}]*)\}/g, (match, selector, body) => {
    const parts = body.split(";");
    const kept: string[] = [];
    let removed = false;
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      if (
        /^[-_a-zA-Z][-_a-zA-Z0-9]*\s*:/.test(trimmed) ||
        /^--[-_a-zA-Z0-9]+\s*:/.test(trimmed) ||
        trimmed.startsWith("/*")
      ) {
        kept.push(trimmed);
      } else {
        removed = true;
      }
    }
    if (!removed) return match;
    repaired = true;
    return `${selector.trim()} {${kept.length ? ` ${kept.join("; ")}; ` : " "}}`;
  });

  // Step 2: count braces, ignoring those inside strings and comments.
  let depth = 0;
  let i = 0;
  while (i < result.length) {
    const ch = result[i];
    // Skip block comments
    if (ch === "/" && result[i + 1] === "*") {
      const end = result.indexOf("*/", i + 2);
      if (end === -1) break;
      i = end + 2;
      continue;
    }
    // Skip strings
    if (ch === '"' || ch === "'") {
      const q = ch;
      i++;
      while (i < result.length && result[i] !== q) {
        if (result[i] === "\\") i += 2;
        else i++;
      }
      i++;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    i++;
  }
  if (depth > 0) {
    // Missing closing braces — append them.
    result = result.trimEnd() + "\n" + "}".repeat(depth) + "\n";
    repaired = true;
  } else if (depth < 0) {
    // Too many closing braces — strip the trailing extras.
    let extras = -depth;
    while (extras > 0 && result.length > 0) {
      const lastClose = result.lastIndexOf("}");
      if (lastClose === -1) break;
      result = result.slice(0, lastClose) + result.slice(lastClose + 1);
      extras--;
    }
    repaired = true;
  }

  return { content: result, repaired };
}

// ─── Import/Export Mismatch Detector ────────────────────────────────────────
// Detects "Element type is invalid...got: undefined" crashes which are caused by
// a component import resolving to undefined. This happens when:
//   import { Foo } from "./Bar"  — but Bar.tsx doesn't export Foo
//   import Foo from "./Bar"      — but Bar.tsx has no default export
// The validator runs BEFORE sending to Claude so the diagnosis is injected into
// the error-fix prompt as hard facts, not guesswork.

interface ImportSpec {
  defaultImport?: string;
  namedImports: string[];
  from: string;
  rawLine: string;
}

function parseImportStatements(content: string): ImportSpec[] {
  const results: ImportSpec[] = [];
  // Handle multi-line imports by collapsing first
  const collapsed = content.replace(/import\s+([\s\S]*?)\s+from\s+(['"][^'"]+['"])/gm, (m) =>
    m.replace(/\n\s*/g, " ")
  );
  const regex = /^import\s+([\s\S]+?)\s+from\s+(['"])([^'"]+)\2/gm;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(collapsed)) !== null) {
    const clause = match[1];
    const from = match[3];
    const rawLine = match[0];
    const namedImports: string[] = [];
    let defaultImport: string | undefined;

    const namedMatch = clause.match(/\{([^}]+)\}/);
    if (namedMatch) {
      namedMatch[1].split(",").forEach((part) => {
        const orig = part.trim().split(/\s+as\s+/)[0].trim().replace(/^type\s+/, "");
        if (orig && orig !== "type" && orig !== "") namedImports.push(orig);
      });
    }
    const beforeBraces = clause.replace(/\{[^}]*\}/, "").replace(/\*\s+as\s+\w+/, "").replace(/,/g, "").trim();
    if (beforeBraces && beforeBraces !== "type" && beforeBraces !== "") {
      defaultImport = beforeBraces;
    }
    if (defaultImport || namedImports.length > 0) {
      results.push({ defaultImport, namedImports, from, rawLine });
    }
  }
  return results;
}

function parseExportNames(content: string): { named: Set<string>; hasDefault: boolean } {
  const named = new Set<string>();
  let hasDefault = false;
  // export default ...
  if (/export\s+default\s/.test(content)) hasDefault = true;
  // export const/function/class/interface/type/enum X
  const declRegex = /export\s+(?:const|function|class|interface|type|enum|let|var)\s+([A-Z_$a-z][^\s<(=,;]+)/g;
  let m: RegExpExecArray | null;
  while ((m = declRegex.exec(content)) !== null) named.add(m[1].trim());
  // export { X, Y as Z }
  const reExportRegex = /export\s*\{([^}]+)\}/g;
  while ((m = reExportRegex.exec(content)) !== null) {
    m[1].split(",").forEach((part) => {
      const seg = part.trim().split(/\s+as\s+/);
      const exported = (seg[1] ?? seg[0]).trim();
      if (exported) named.add(exported);
    });
  }
  return { named, hasDefault };
}

function resolveImportPath(fromPath: string, spec: string, fileMap: Map<string, string>): string | null {
  if (!spec.startsWith(".")) return null;
  const dir = fromPath.split("/").slice(0, -1);
  const parts = [...dir, ...spec.split("/")];
  const normalized: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") normalized.pop();
    else normalized.push(part);
  }
  const base = normalized.join("/");
  const candidates = /\.(tsx?|jsx?|css|json|svg|png|jpg|jpeg|webp)$/.test(base)
    ? [base]
    : [`${base}.tsx`, `${base}.ts`, `${base}.jsx`, `${base}.js`, `${base}/index.tsx`, `${base}/index.ts`];
  return candidates.find((candidate) => fileMap.has(candidate)) ?? null;
}

function parseSideEffectImports(content: string): string[] {
  const specs: string[] = [];
  const regex = /^import\s+["'](\.[^"']+)["'];?/gm;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) specs.push(match[1]);
  return specs;
}

function applyPatchPlanForValidation(
  projectFiles: Array<{ path: string; content: string }>,
  patchPlan?: AIPatchPlan | null
): Array<{ path: string; content: string }> {
  let files = projectFiles.map((file) => ({ path: file.path, content: file.content }));
  if (!patchPlan) return files;

  for (const rename of patchPlan.renames ?? []) {
    files = files.map((file) => file.path === rename.from ? { ...file, path: rename.to } : file);
  }

  const deletes = new Set(patchPlan.deletes ?? []);
  if (deletes.size) files = files.filter((file) => !deletes.has(file.path));

  const patchMap = new Map((patchPlan.changes ?? []).map((change) => [change.path, change.content]));
  files = files.map((file) => patchMap.has(file.path) ? { ...file, content: patchMap.get(file.path)! } : file);
  for (const [path, content] of patchMap) {
    if (!files.some((file) => file.path === path)) files.push({ path, content });
  }
  return files;
}

function lineNumberFor(content: string, index: number): number {
  return content.slice(0, Math.max(0, index)).split("\n").length;
}

function addQualityIssue(
  issues: RepositoryQualityIssue[],
  severity: QualityIssueSeverity,
  path: string,
  rule: string,
  detail: string,
  evidence?: string
) {
  issues.push({ severity, path, rule, detail, evidence });
}

function isGeneratedCodeFile(path: string): boolean {
  return /\.(tsx?|jsx?)$/.test(path) && path.startsWith("src/");
}

function isProbablyGuardedArrayLine(line: string): boolean {
  return /\?\?\s*\[\s*\]/.test(line) ||
    /Array\.isArray\s*\(/.test(line) ||
    /Array\.from\s*\(/.test(line) ||
    /\bObject\.(values|keys|entries)\s*\(/.test(line) ||
    /\.split\s*\([^)]*\)\s*\.(map|filter|forEach|reduce|find)\s*\(/.test(line) ||
    /\[[^\]]*\]\s*\.(map|filter|forEach|reduce|find)\s*\(/.test(line);
}

function findUnsafeArrayReceivers(content: string, path: string): RepositoryQualityIssue[] {
  const issues: RepositoryQualityIssue[] = [];
  if (!isGeneratedCodeFile(path)) return issues;

  const methodPattern = /\b([A-Za-z_$][\w$]*(?:\??\.[A-Za-z_$][\w$]*|\[[^\]\n]+\])*)\s*\.(map|filter|reduce|forEach|find|some|every|flatMap|flat|sort)\s*\(/g;
  const safeRoots = new Set(["Array", "Object", "String", "Number", "Math", "JSON", "console", "React"]);
  const lines = content.split("\n");
  lines.forEach((line, index) => {
    if (isProbablyGuardedArrayLine(line)) return;
    if (/^\s*(import|export|\/\/)/.test(line)) return;
    let match: RegExpExecArray | null;
    while ((match = methodPattern.exec(line)) !== null) {
      const receiver = match[1];
      const root = receiver.split(/[.[]/)[0];
      if (!receiver || safeRoots.has(root)) continue;
      if (receiver.startsWith("this.")) continue;
      addQualityIssue(
        issues,
        "warning",
        path,
        "unguarded-array-method",
        `Potential first-render crash: \`${receiver}.${match[2]}(...)\` is not visibly guarded as an array.`,
        `line ${index + 1}: ${line.trim()}`
      );
    }
  });
  return issues;
}

function findUnsafeStateInitializers(content: string, path: string): RepositoryQualityIssue[] {
  const issues: RepositoryQualityIssue[] = [];
  if (!isGeneratedCodeFile(path)) return issues;

  let match: RegExpExecArray | null;
  const typedArrayState = /const\s*\[\s*([A-Za-z_$][\w$]*)\s*,[^\]]+\]\s*=\s*useState\s*<[^>]*\[\]\s*>\s*\(\s*\)/g;
  while ((match = typedArrayState.exec(content)) !== null) {
    addQualityIssue(
      issues,
      "fatal",
      path,
      "array-state-undefined",
      `Array state \`${match[1]}\` is initialized as undefined. Use \`useState<T[]>([])\`.`,
      `line ${lineNumberFor(content, match.index)}`
    );
  }

  const untypedState = /const\s*\[\s*([A-Za-z_$][\w$]*(?:s|List|Items|Rows|Records|Tasks|Deals|Docs))\s*,[^\]]+\]\s*=\s*useState\s*\(\s*\)/g;
  while ((match = untypedState.exec(content)) !== null) {
    addQualityIssue(
      issues,
      "warning",
      path,
      "state-undefined",
      `Collection-like state \`${match[1]}\` starts undefined. Prefer a concrete empty default.`,
      `line ${lineNumberFor(content, match.index)}`
    );
  }
  return issues;
}

function extractDefinedCssClasses(css: string): Set<string> {
  const classes = new Set<string>();
  const regex = /\.(-?[_a-zA-Z]+[_a-zA-Z0-9-]*)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(css)) !== null) classes.add(match[1]);
  return classes;
}

function isProbablyTailwindClass(token: string): boolean {
  if (!token || token.includes("{") || token.includes("$")) return true;
  if (/^-?\d/.test(token)) return true;
  if (token.includes(":") || token.includes("[") || token.includes("/") || token.includes("(")) return true;
  if (/^(sm|md|lg|xl|2xl|hover|focus|active|disabled|group-hover|dark):/.test(token)) return true;
  return /^(flex|grid|block|inline|hidden|relative|absolute|fixed|sticky|inset|top|right|bottom|left|z-|w-|h-|min-|max-|p[trblxy]?|m[trblxy]?|gap|space-|text|font|leading|tracking|bg|border|rounded|shadow|opacity|overflow|truncate|whitespace|break|items|justify|content|self|place|object|transition|duration|ease|transform|scale|rotate|translate|cursor|select|pointer|resize|outline|ring|divide|aspect|columns|col-|row-|basis|grow|shrink|order|from-|via-|to-|backdrop|blur|drop-shadow|animate|container)/.test(token);
}

function findMissingCssClasses(files: Array<{ path: string; content: string }>): RepositoryQualityIssue[] {
  const css = files.find((file) => file.path === "src/index.css")?.content ?? "";
  if (!css) return [];
  const defined = extractDefinedCssClasses(css);
  const issues: RepositoryQualityIssue[] = [];

  for (const file of files) {
    if (!isGeneratedCodeFile(file.path)) continue;
    const regex = /className\s*=\s*["']([^"']+)["']/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(file.content)) !== null) {
      for (const token of match[1].split(/\s+/).filter(Boolean)) {
        if (isProbablyTailwindClass(token)) continue;
        if (defined.has(token)) continue;
        addQualityIssue(
          issues,
          "warning",
          file.path,
          "missing-css-class",
          `Custom class \`${token}\` is used but not defined in src/index.css.`,
          `line ${lineNumberFor(file.content, match.index)}`
        );
      }
    }
  }
  return issues;
}

function validateImportGraph(files: Array<{ path: string; content: string }>): RepositoryQualityIssue[] {
  const issues: RepositoryQualityIssue[] = [];
  const fileMap = new Map(files.map((file) => [file.path, file.content]));

  for (const file of files) {
    if (!isGeneratedCodeFile(file.path)) continue;

    for (const spec of parseSideEffectImports(file.content)) {
      const resolved = resolveImportPath(file.path, spec, fileMap);
      if (!resolved) {
        addQualityIssue(issues, "fatal", file.path, "missing-import", `Side-effect import \`${spec}\` does not resolve.`, spec);
      }
    }

    for (const imp of parseImportStatements(file.content)) {
      if (!imp.from.startsWith(".")) continue;
      const resolved = resolveImportPath(file.path, imp.from, fileMap);
      if (!resolved) {
        const importedNames = [imp.defaultImport, ...imp.namedImports].filter(Boolean).join(", ") || "side effect";
        addQualityIssue(
          issues,
          "fatal",
          file.path,
          "missing-import",
          `Import \`${imp.from}\` (${importedNames}) does not resolve to a project file.`,
          imp.rawLine
        );
        continue;
      }

      if (/\.(css|json|svg|png|jpg|jpeg|webp)$/.test(resolved)) continue;
      const exports = parseExportNames(fileMap.get(resolved) ?? "");
      if (imp.defaultImport && !exports.hasDefault) {
        addQualityIssue(
          issues,
          "fatal",
          file.path,
          "default-export-missing",
          `Default import \`${imp.defaultImport}\` from \`${imp.from}\` resolves to \`${resolved}\`, but that file has no default export.`,
          imp.rawLine
        );
      }
      for (const name of imp.namedImports) {
        if (!exports.named.has(name)) {
          addQualityIssue(
            issues,
            "fatal",
            file.path,
            "named-export-missing",
            `Named import \`${name}\` from \`${imp.from}\` resolves to \`${resolved}\`, but that export does not exist.`,
            imp.rawLine
          );
        }
      }
    }
  }

  return issues;
}

export function validateRepositoryQuality(
  projectFiles: Array<{ path: string; content: string }>,
  patchPlan?: AIPatchPlan | null
): RepositoryQualityReport {
  const files = applyPatchPlanForValidation(projectFiles, patchPlan);
  const fileMap = new Map(files.map((file) => [file.path, file.content]));
  const issues: RepositoryQualityIssue[] = [];

  if (!fileMap.has("src/App.tsx")) {
    addQualityIssue(issues, "fatal", "src/App.tsx", "missing-root-app", "Generated project is missing src/App.tsx.");
  }
  if (!fileMap.has("src/index.css")) {
    addQualityIssue(issues, "warning", "src/index.css", "missing-css", "Generated project is missing src/index.css.");
  }

  issues.push(...validateImportGraph(files));
  issues.push(...findMissingCssClasses(files));

  for (const file of files) {
    if (!isGeneratedCodeFile(file.path)) continue;
    if (/@nutrient-sdk\/viewer|from\s+["']pspdfkit["']/.test(file.content) && file.path !== "src/NutrientViewer.tsx") {
      addQualityIssue(
        issues,
        "fatal",
        file.path,
        "blocked-sdk-import",
        "Generated app code must not import the Nutrient SDK package directly; use src/NutrientViewer.tsx.",
      );
    }
    if (isTruncatedJSX(file.content, file.path)) {
      addQualityIssue(issues, "fatal", file.path, "truncated", "JS/TS file appears truncated or syntactically incomplete.");
    }
    issues.push(...findUnsafeStateInitializers(file.content, file.path));
    issues.push(...findUnsafeArrayReceivers(file.content, file.path));
  }

  const fatalCount = issues.filter((issue) => issue.severity === "fatal").length;
  const warningCount = issues.length - fatalCount;
  const confidence = Math.max(0, Math.min(100, 100 - fatalCount * 22 - warningCount * 4));
  const summary = fatalCount
    ? `Quality gate blocked: ${fatalCount} fatal issue${fatalCount === 1 ? "" : "s"}, ${warningCount} warning${warningCount === 1 ? "" : "s"}.`
    : warningCount
      ? `Quality gate passed with warnings: ${warningCount} warning${warningCount === 1 ? "" : "s"}.`
      : "Quality gate passed: no deterministic issues found.";

  return {
    confidence,
    issues,
    fileCount: files.length,
    fatalCount,
    warningCount,
    summary,
  };
}

export function formatRepositoryQualityReport(report: RepositoryQualityReport, maxIssues = 18): string {
  const listed = report.issues.slice(0, maxIssues);
  const issueText = listed.length
    ? listed
      .map((issue, index) => {
        const evidence = issue.evidence ? `\n   Evidence: ${issue.evidence}` : "";
        return `${index + 1}. [${issue.severity.toUpperCase()}] [${issue.rule}] ${issue.path}: ${issue.detail}${evidence}`;
      })
      .join("\n")
    : "No issues.";
  const omitted = report.issues.length > listed.length
    ? `\n... ${report.issues.length - listed.length} more issue${report.issues.length - listed.length === 1 ? "" : "s"} omitted.`
    : "";
  return [
    `Confidence: ${report.confidence}/100`,
    `Files analyzed: ${report.fileCount}`,
    `Fatal issues: ${report.fatalCount}`,
    `Warnings: ${report.warningCount}`,
    `Summary: ${report.summary}`,
    "",
    issueText + omitted,
  ].join("\n");
}

/**
 * Pre-flight check: given the full project file map, scan App.tsx imports and
 * verify each relative import resolves to a real file that exports the imported name.
 *
 * Returns a human-readable diagnosis string (empty if no mismatches found).
 * Used by buildErrorFixUserMessage() to inject concrete facts into the prompt.
 */
export function diagnoseImportExportMismatch(
  appContent: string,
  projectFiles: Array<{ path: string; content: string }>
): string {
  const fileMap = new Map<string, string>();
  for (const f of projectFiles) fileMap.set(f.path, f.content);

  const imports = parseImportStatements(appContent);
  const issues: string[] = [];

  for (const imp of imports) {
    if (!imp.from.startsWith(".")) continue; // skip node_modules

    // Resolve relative path (all project files live under src/)
    const normalized = imp.from
      .replace(/^\.\//, "src/")
      .replace(/^\.\.\//, "");
    const candidates = [
      normalized,
      `${normalized}.tsx`,
      `${normalized}.ts`,
      `${normalized}/index.tsx`,
      `${normalized}/index.ts`,
    ];

    let fileContent: string | undefined;
    let foundPath: string | undefined;
    for (const c of candidates) {
      if (fileMap.has(c)) { fileContent = fileMap.get(c); foundPath = c; break; }
    }

    if (!fileContent || !foundPath) {
      const importedNames = [
        imp.defaultImport,
        ...imp.namedImports,
      ].filter(Boolean).join(", ");
      issues.push(
        `MISSING FILE: \`${imp.from}\` is imported (${importedNames}) in App.tsx but the file does not exist in the project. Create it or remove the import.`
      );
      continue;
    }

    const { named, hasDefault } = parseExportNames(fileContent);

    if (imp.defaultImport && !hasDefault) {
      issues.push(
        `DEFAULT IMPORT BROKEN: App.tsx has \`import ${imp.defaultImport} from "${imp.from}"\` but \`${foundPath}\` has no \`export default\`. ` +
        `Named exports in that file: ${Array.from(named).join(", ") || "none"}.`
      );
    }

    for (const name of imp.namedImports) {
      if (!named.has(name)) {
        issues.push(
          `NAMED IMPORT BROKEN: App.tsx has \`import { ${name} } from "${imp.from}"\` but \`${foundPath}\` does not export \`${name}\`. ` +
          `Actual exports: ${Array.from(named).join(", ") || "none"}.`
        );
      }
    }
  }

  return issues.join("\n");
}

// ─── Hex-outside-tokens heuristic ────────────────────────────────────────────
// Heuristic: a hex color appearing OUTSIDE the :root or [data-theme="dark"] block
// in a CSS file, OR anywhere in JSX/TSX, is a hardcoded design value.
function findHexOutsideTokens(content: string, path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (path.endsWith(".css")) {
    // Strip :root { ... } and [data-theme="dark"] { ... } blocks then scan for hex.
    const stripped = content
      .replace(/:root\s*\{[^}]*\}/g, "")
      .replace(/\[data-theme=["']dark["']\]\s*\{[^}]*\}/g, "");
    const hexMatches = stripped.match(/#[0-9a-fA-F]{3,8}\b/g);
    if (hexMatches && hexMatches.length > 0) {
      const sample = Array.from(new Set(hexMatches)).slice(0, 5).join(", ");
      issues.push({
        path,
        rule: "hex-outside-root",
        detail: `Hardcoded hex colors found outside :root { } in CSS: ${sample}. Move them into :root tokens.`,
      });
    }
    return issues;
  }
  if (/\.(tsx?|jsx?)$/.test(path)) {
    // Look for hex literals in JSX. Exclude common false positives like color in
    // imported SVG paths or comments.
    const hexMatches = content.match(/['"`]#[0-9a-fA-F]{3,8}['"`]/g);
    if (hexMatches && hexMatches.length > 0) {
      const sample = Array.from(new Set(hexMatches)).slice(0, 5).join(", ");
      issues.push({
        path,
        rule: "hex-in-jsx",
        detail: `Hardcoded hex colors found in JSX: ${sample}. Use var(--token) instead.`,
      });
    }
  }
  return issues;
}

function isTruncatedJSX(code: string, path: string): boolean {
  if (!/\.(tsx?|jsx?)$/.test(path)) return false;
  const trimmed = code.trim();
  if (!trimmed || !/[};>"')]$/.test(trimmed)) return true;
  let depth = 0;
  let i = 0;
  while (i < trimmed.length) {
    const ch = trimmed[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      const q = ch;
      i++;
      while (i < trimmed.length) {
        if (trimmed[i] === "\\" && q !== "`") {
          i += 2;
          continue;
        }
        if (trimmed[i] === q) {
          i++;
          break;
        }
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

// Rewrites blocked SDK imports in-place + auto-repairs CSS syntax errors +
// Fix useState<T[]>() → useState<T[]>([]) and useState() for known array vars.
// These cause immediate crashes when any array method is called on first render.
function fixUseStateDefaults(content: string): { content: string; fixed: number } {
  let fixed = 0;

  // typed array state: useState<SomeType[]>() or useState<Array<SomeType>>()
  const typedArray = content.replace(
    /\buseState\s*<([^>]+\[\])>\s*\(\s*\)/g,
    (_, typeArg) => { fixed++; return `useState<${typeArg}>([])`; }
  );

  // typed Array<T> form
  const typedArrayAlt = typedArray.replace(
    /\buseState\s*<(Array\s*<[^>]+>)>\s*\(\s*\)/g,
    (_, typeArg) => { fixed++; return `useState<${typeArg}>([])`; }
  );

  // untyped useState() where variable name strongly implies an array
  const ARRAY_NAME_RE = /(?:s|List|Items|Rows|Records|Results|Tasks|Docs|Files|Events|Logs|Data|Set|Queue|Entries|Tickets|Orders|Claims|Invoices|Contracts|Patients|Cases|Users|Members|Deals|Leads|Contacts|Notes|Comments|Alerts|Errors)$/;
  const untyped = typedArrayAlt.replace(
    /\bconst\s*\[\s*([A-Za-z_$][\w$]*)\s*,[^\]]+\]\s*=\s*useState\s*\(\s*\)/g,
    (match, varName) => {
      if (ARRAY_NAME_RE.test(varName)) { fixed++; return match.replace(/useState\s*\(\s*\)/, "useState([])"); }
      return match;
    }
  );

  return { content: untyped, fixed };
}

const TOOLBAR_TYPE_ALIASES: Record<string, string> = {
  highlight: "highlighter",
  draw: "ink",
  drawing: "ink",
  download: "export-pdf",
  export: "export-pdf",
  measurement: "measure",
  measurements: "measure",
  distance: "measure",
  perimeter: "measure",
  "rectangle-area": "measure",
  "ellipse-area": "measure",
  "polygon-area": "measure",
  thumbnails: "sidebar-thumbnails",
  bookmarks: "sidebar-bookmarks",
  annotations: "sidebar-annotations",
  signatures: "sidebar-signatures",
  layers: "sidebar-layers",
  outline: "sidebar-document-outline",
  forms: "form-creator",
  form: "form-creator",
  "redact-text": "redact-text-highlighter",
  "redaction-text": "redact-text-highlighter",
};

function repairNutrientToolbarAliases(content: string): { content: string; fixed: number } {
  if (!/\b(toolbar|toolbarItems|NutrientViewer|viewerTools|pdfTools|documentTools)\b/i.test(content)) return { content, fixed: 0 };
  let fixed = 0;
  const aliases = Object.keys(TOOLBAR_TYPE_ALIASES)
    .sort((a, b) => b.length - a.length)
    .map((type) => type.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  let result = content.replace(
    new RegExp(`(\\btype\\s*:\\s*)(["'])(${aliases})\\2`, "g"),
    (_match, prefix: string, quote: string, type: string) => {
      fixed++;
      return `${prefix}${quote}${TOOLBAR_TYPE_ALIASES[type] ?? type}${quote}`;
    }
  );

  // Also repair compact string toolbar arrays, e.g. toolbarItems={["highlight", "ink"]}.
  result = result.replace(
    new RegExp(`([,[{]\\s*)(["'])(${aliases})\\2(?=\\s*[,}\\]])`, "g"),
    (_match, prefix: string, quote: string, type: string) => {
      fixed++;
      return `${prefix}${quote}${TOOLBAR_TYPE_ALIASES[type] ?? type}${quote}`;
    }
  );

  return { content: result, fixed };
}

// auto-injects ?? [] null guards. Always called before patches reach the workspace.
export function sanitizePatch(patch: FilePatch): FilePatch {
  let content = patch.content
    .replace(NPM_SDK_IMPORT, "// Nutrient SDK loaded via CDN as window.NutrientViewer")
    .replace(NPM_PSPDFKIT_IMPORT, "// Nutrient SDK loaded via CDN as window.NutrientViewer");

  if (patch.path.endsWith(".css")) {
    const { content: repaired, repaired: wasRepaired } = repairCSS(content);
    if (wasRepaired) {
      // eslint-disable-next-line no-console
      if (typeof console !== "undefined") console.log(`[validators] auto-repaired CSS: ${patch.path}`);
      content = repaired;
    }
  }

  if (/\.(tsx?|jsx?)$/.test(patch.path)) {
    const { content: toolbarFixed, fixed: toolbarFixes } = repairNutrientToolbarAliases(content);
    if (toolbarFixes > 0) {
      // eslint-disable-next-line no-console
      if (typeof console !== "undefined") console.log(`[validators] fixed ${toolbarFixes} Nutrient toolbar item alias${toolbarFixes === 1 ? "" : "es"} in ${patch.path}`);
      content = toolbarFixed;
    }

    // Fix useState array defaults before injecting null guards — order matters
    // because fixUseStateDefaults may expose new .map() calls that need guarding.
    const { content: stateFixed, fixed } = fixUseStateDefaults(content);
    if (fixed > 0) {
      // eslint-disable-next-line no-console
      if (typeof console !== "undefined") console.log(`[validators] fixed ${fixed} useState default${fixed === 1 ? "" : "s"} in ${patch.path}`);
      content = stateFixed;
    }

    // Auto-inject null guards on unguarded array methods.
    const { content: guarded, injected } = injectNullGuards(content, patch.path);
    if (injected > 0) {
      // eslint-disable-next-line no-console
      if (typeof console !== "undefined") console.log(`[validators] injected ${injected} null guard${injected === 1 ? "" : "s"} in ${patch.path}`);
      content = guarded;
    }
  }

  return { ...patch, content };
}

export function validatePatchPlan(patchPlan: AIPatchPlan | null): ValidationResult | null {
  if (!patchPlan?.changes?.length) return null;
  const sanitized = patchPlan.changes.map(sanitizePatch);
  const issues: ValidationIssue[] = [];
  for (const change of sanitized) {
    if (isTruncatedJSX(change.content, change.path)) {
      issues.push({
        path: change.path,
        rule: "truncated",
        detail: "File content appears truncated (unbalanced braces or missing end).",
      });
    }
    issues.push(...findHexOutsideTokens(change.content, change.path));
  }
  return {
    patchPlan: { ...patchPlan, changes: sanitized },
    issues,
  };
}

export function describeIssues(issues: ValidationIssue[]): string {
  return issues
    .map((i, idx) => `${idx + 1}. [${i.rule}] ${i.path}: ${i.detail}`)
    .join("\n");
}

// Applies sanitizePatch (CSS auto-repair, SDK import block) to every patch in
// a plan. Used by the full-build flow which doesn't go through validatePatchPlan.
export function sanitizePatchPlan(patchPlan: AIPatchPlan | null): AIPatchPlan | null {
  if (!patchPlan?.changes?.length) return patchPlan;
  return {
    ...patchPlan,
    changes: patchPlan.changes.map(sanitizePatch),
  };
}
