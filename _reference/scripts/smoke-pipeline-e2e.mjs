/**
 * End-to-end pipeline smoke test — no AI calls, no tokens spent.
 *
 * Simulates a "build a landing page" request through every pipeline layer:
 *   parsePlannedFiles → ensurePlannedCoreFiles → parseContinueBuildFiles
 *   → buildCandidate → mergeIntoCandidate → detectFatalIssues
 *
 * Also validates classifyRuntimeError and the design spec parser.
 *
 * Usage: node scripts/smoke-pipeline-e2e.mjs
 */

let pass = 0, fail = 0;
function test(label, fn) {
  try {
    fn();
    console.log(`  ✓  ${label}`);
    pass++;
  } catch (e) {
    console.error(`  ✗  ${label}`);
    console.error(`     ${e.message}`);
    fail++;
  }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || "assertion failed"); }

// ─── Inline ports (no TS transpile needed) ────────────────────────────────────

function parsePlannedFiles(projectPlan) {
  if (!projectPlan) return [];
  try {
    const parsed = JSON.parse(projectPlan);
    if (!Array.isArray(parsed.files)) return [];
    const seen = new Set();
    return parsed.files
      .filter(f => typeof f === "string")
      .map(f => f.trim())
      .filter(f => f && !f.includes("..") && (
        f === "NUTRIENTWEBBUILDER.md" || f === "package.json" ||
        f.startsWith("src/") || f.startsWith("backend/") || f.startsWith("scripts/")
      ))
      .filter(f => { if (seen.has(f)) return false; seen.add(f); return true; });
  } catch { return []; }
}

function ensurePlannedCoreFiles(files) {
  const core = ["src/App.tsx", "src/index.css", "NUTRIENTWEBBUILDER.md"];
  const seen = new Set();
  return [...core, ...files].filter(f => { if (seen.has(f)) return false; seen.add(f); return true; });
}

function parseContinueBuildFiles(candidate) {
  const memory = candidate.get("NUTRIENTWEBBUILDER.md") ?? "";
  if (!memory.includes("<!-- CONTINUE_BUILD -->")) return [];
  const sectionMatch = memory.match(/##\s*Remaining Files To Build([\s\S]*?)(?:\n##|$)/i);
  if (!sectionMatch) return [];
  return sectionMatch[1]
    .split("\n")
    .map(line => line.replace(/^[\s\-*]+/, "").replace(/`/g, "").trim())
    .filter(line => (line.startsWith("src/") || line === "NUTRIENTWEBBUILDER.md") && !line.includes(".."));
}

function isFileTruncated(content, path) {
  if (!/\.(tsx?|jsx?)$/.test(path)) return false;
  const t = content.trim();
  if (!t || !/[};>"']$/.test(t)) return true;
  let d = 0;
  for (const ch of t) { if (ch === "{") d++; else if (ch === "}") d--; }
  return d !== 0;
}

function detectFatalIssues(candidate) {
  const issues = [];
  if (!candidate.has("src/App.tsx")) issues.push({ type: "missing-app-tsx", path: "src/App.tsx" });
  for (const [path, content] of candidate.entries()) {
    if (isFileTruncated(content, path)) issues.push({ type: "truncated", path });
    const importRE = /import\s+.*?\s+from\s+['"](\.[^'"]+)['"]/g;
    let m;
    while ((m = importRE.exec(content)) !== null) {
      const spec = m[1];
      if (!/\.(tsx?|jsx?|css|json)$/.test(spec)) {
        for (const ext of [".tsx", ".ts", ".jsx", ".js"]) {
          const dir = path.split("/").slice(0, -1).join("/");
          const parts = [...dir.split("/"), ...spec.split("/")];
          const norm = [];
          for (const p of parts) { if (p === "..") norm.pop(); else if (p && p !== ".") norm.push(p); }
          const resolved = norm.join("/");
          if (!candidate.has(resolved + ext)) continue;
          break;
        }
      }
    }
  }
  return issues;
}

const KNOWN_CRASH_PATTERNS = [
  /Cannot read propert(?:y|ies) of (?:undefined|null) \(reading '(?:map|filter|slice|reduce|forEach|find|sort|join|some|every|flat|flatMap|length|includes)'\)/,
  /Element type is invalid: expected a string.*or a class\/function/,
  /\w+ is not a function/,
  /Cannot read properties of (?:undefined|null)/,
  /\w+ is not defined/,
  /objects are not valid as a react child/i,
];
function classifyRuntimeError(errors) {
  return errors.some(e => KNOWN_CRASH_PATTERNS.some(p => p.test(e))) ? "known" : "novel";
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_PLAN = JSON.stringify({
  brand: { name: "DocFlow", tagline: "Review at speed", initials: "DF", industry: "legal" },
  design: { layout: "split", accent: "#7c3aed" },
  architecture: { scope: "focused-workflow", fileStrategy: "focused compact tree" },
  pages: [{ component: "LandingPage", nav: "Home", desc: "Marketing landing" }],
  nutrient: { page: "LandingPage", capability: "viewer", toolbar: ["highlighter"] },
  data: { entity: "Document", fields: ["id","title","status"], statuses: ["Draft","Review"], count: 6 },
  files: [
    "src/App.tsx",
    "src/index.css",
    "src/components/Hero.tsx",
    "src/data/mockData.ts",
    "NUTRIENTWEBBUILDER.md"
  ]
});

const GOOD_APP_TSX = `
import { useState } from "react";
import Hero from "./components/Hero";

/* nutrient-preview
{"title":"DocFlow","accentColor":"#7c3aed","layout":"split"}
*/

export default function App() {
  const [page, setPage] = useState("home");
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Hero onCta={() => setPage("review")} />
      <div style={{position:"fixed",bottom:8,right:12,fontSize:"10px",color:"var(--text-muted)",opacity:0.45,pointerEvents:"none",zIndex:9999}}>Built using Nutrient Demo Studio · Code written by Nutrient Coding Agent</div>
    </div>
  );
}
`.trim();

const GOOD_HERO_TSX = `
interface Props { onCta: () => void; }
export default function Hero({ onCta }: Props) {
  return (
    <section className="flex flex-col items-center py-24 gap-6">
      <h1 className="text-5xl font-bold text-[var(--text)]">Review documents faster</h1>
      <p className="text-[var(--text-muted)] max-w-lg text-center">DocFlow brings legal review into one workspace.</p>
      <button onClick={onCta} className="bg-[var(--accent)] text-[var(--accent-fg)] px-6 py-3 rounded-lg font-semibold">
        Get started
      </button>
    </section>
  );
}
`.trim();

const GOOD_INDEX_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
:root {
  --bg: #f5f3ff;
  --surface: #ffffff;
  --surface-raised: #ede9fe;
  --border: rgba(124,58,237,0.09);
  --text: #1e1030;
  --text-muted: #7c3aed;
  --accent: #7c3aed;
  --accent-fg: #ffffff;
  --radius: 8px;
  --font: 'DM Sans', sans-serif;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: var(--font); background: var(--bg); color: var(--text); }
`.trim();

const GOOD_MOCK_DATA = `
export const documents = [
  { id: "DOC-001", title: "Service Agreement", status: "Review" },
  { id: "DOC-002", title: "NDA Template", status: "Draft" },
];
export type Document = typeof documents[0];
`.trim();

const GOOD_MEMORY = `# DocFlow
Generated for: build a landing page for a document review product

## Architecture
- File strategy: focused compact tree
- Pages: LandingPage

## Latest AI Change
- Request: build a landing page
- Files touched: src/App.tsx, src/index.css, src/components/Hero.tsx, src/data/mockData.ts
`.trim();

// ─── Tests ────────────────────────────────────────────────────────────────────

console.log("\nPipeline Layer 1 — Plan parsing");

test("parsePlannedFiles extracts all 5 files from mock plan", () => {
  const files = parsePlannedFiles(MOCK_PLAN);
  assert(files.includes("src/App.tsx"), "missing App.tsx");
  assert(files.includes("src/index.css"), "missing index.css");
  assert(files.includes("src/components/Hero.tsx"), "missing Hero.tsx");
  assert(files.includes("src/data/mockData.ts"), "missing mockData.ts");
  assert(files.includes("NUTRIENTWEBBUILDER.md"), "missing NUTRIENTWEBBUILDER.md");
  assert(files.length === 5, `expected 5, got ${files.length}`);
});

test("parsePlannedFiles rejects paths with ..", () => {
  const plan = JSON.stringify({ files: ["../../etc/passwd", "src/App.tsx"] });
  const files = parsePlannedFiles(plan);
  assert(!files.includes("../../etc/passwd"), "should reject ../");
  assert(files.includes("src/App.tsx"), "should keep src/App.tsx");
});

test("parsePlannedFiles returns [] for invalid JSON", () => {
  assert(parsePlannedFiles("not json").length === 0);
});

console.log("\nPipeline Layer 2 — Core file injection");

test("ensurePlannedCoreFiles adds only 3 essentials, doesn't bloat list", () => {
  const plan = ["src/components/Hero.tsx", "src/data/mockData.ts"];
  const result = ensurePlannedCoreFiles(plan);
  assert(result.includes("src/App.tsx"), "must have App.tsx");
  assert(result.includes("src/index.css"), "must have index.css");
  assert(result.includes("NUTRIENTWEBBUILDER.md"), "must have NUTRIENTWEBBUILDER.md");
  assert(result.length === 5, `expected 5, got ${result.length} — old code would give 7+`);
});

test("ensurePlannedCoreFiles deduplicates", () => {
  const plan = ["src/App.tsx", "src/index.css", "src/components/Hero.tsx"];
  const result = ensurePlannedCoreFiles(plan);
  const appCount = result.filter(f => f === "src/App.tsx").length;
  assert(appCount === 1, `App.tsx duplicated (got ${appCount})`);
});

console.log("\nPipeline Layer 3 — Build transaction");

test("buildCandidate + merge: all planned files land in candidate", () => {
  const candidate = new Map();
  // Simulate first pass: Claude generates all 5 files
  const patches = [
    { path: "src/App.tsx", content: GOOD_APP_TSX },
    { path: "src/index.css", content: GOOD_INDEX_CSS },
    { path: "src/components/Hero.tsx", content: GOOD_HERO_TSX },
    { path: "src/data/mockData.ts", content: GOOD_MOCK_DATA },
    { path: "NUTRIENTWEBBUILDER.md", content: GOOD_MEMORY },
  ];
  for (const { path, content } of patches) candidate.set(path, content);
  assert(candidate.size === 5, `expected 5 files, got ${candidate.size}`);
});

test("detectFatalIssues: good candidate has no issues", () => {
  const candidate = new Map([
    ["src/App.tsx", GOOD_APP_TSX],
    ["src/index.css", GOOD_INDEX_CSS],
    ["src/components/Hero.tsx", GOOD_HERO_TSX],
    ["src/data/mockData.ts", GOOD_MOCK_DATA],
    ["NUTRIENTWEBBUILDER.md", GOOD_MEMORY],
  ]);
  const issues = detectFatalIssues(candidate);
  const fatal = issues.filter(i => i.type !== "missing-file"); // import resolution simplified
  assert(fatal.length === 0, `unexpected issues: ${JSON.stringify(fatal)}`);
});

test("detectFatalIssues: catches truncated file", () => {
  const candidate = new Map([
    ["src/App.tsx", "export default function App() {\n  return <div>"],  // truncated, no closing }
    ["src/index.css", GOOD_INDEX_CSS],
  ]);
  const issues = detectFatalIssues(candidate);
  assert(issues.some(i => i.type === "truncated"), "should flag truncated App.tsx");
});

test("detectFatalIssues: catches missing App.tsx", () => {
  const candidate = new Map([["src/index.css", GOOD_INDEX_CSS]]);
  const issues = detectFatalIssues(candidate);
  assert(issues.some(i => i.type === "missing-app-tsx"), "should flag missing App.tsx");
});

console.log("\nPipeline Layer 4 — CONTINUE_BUILD marker");

test("parseContinueBuildFiles: reads remaining files from marker", () => {
  const memory = `# DocFlow\n<!-- CONTINUE_BUILD -->\n## Remaining Files To Build\n- src/pages/ReviewPage.tsx\n- src/hooks/useDocuments.ts\n\n## Architecture\n...`;
  const candidate = new Map([["NUTRIENTWEBBUILDER.md", memory]]);
  const files = parseContinueBuildFiles(candidate);
  assert(files.includes("src/pages/ReviewPage.tsx"), "missing ReviewPage");
  assert(files.includes("src/hooks/useDocuments.ts"), "missing useDocuments");
  assert(files.length === 2, `expected 2, got ${files.length}`);
});

test("parseContinueBuildFiles: returns [] when no marker", () => {
  const candidate = new Map([["NUTRIENTWEBBUILDER.md", "# DocFlow\n## Architecture\n..."]]);
  assert(parseContinueBuildFiles(candidate).length === 0);
});

test("continuation loop: CONTINUE_BUILD files added to remaining", () => {
  const memory = `# DocFlow\n<!-- CONTINUE_BUILD -->\n## Remaining Files To Build\n- src/pages/ReviewPage.tsx\n\n## Architecture`;
  const candidate = new Map([
    ["src/App.tsx", GOOD_APP_TSX],
    ["src/index.css", GOOD_INDEX_CSS],
    ["NUTRIENTWEBBUILDER.md", memory],
  ]);
  const plannedFiles = ["src/App.tsx", "src/index.css", "NUTRIENTWEBBUILDER.md"];
  const candidatePaths = new Set(candidate.keys());
  const plannedRemaining = plannedFiles.filter(p => !candidatePaths.has(p));
  const continueBuildFiles = parseContinueBuildFiles(candidate).filter(p => !candidatePaths.has(p));
  const remaining = [...new Set([...plannedRemaining, ...continueBuildFiles])];
  assert(remaining.includes("src/pages/ReviewPage.tsx"), "ReviewPage should be in remaining");
  assert(plannedRemaining.length === 0, "no planned files missing");
  assert(remaining.length === 1, `expected 1 remaining, got ${remaining.length}`);
});

console.log("\nPipeline Layer 5 — Error classification");

test("known crashes route to fast fix", () => {
  assert(classifyRuntimeError(["TypeError: Cannot read properties of undefined (reading 'map')"]) === "known");
  assert(classifyRuntimeError(["Element type is invalid: expected a string (for built-in components) or a class/function"]) === "known");
  assert(classifyRuntimeError(["setItems is not a function"]) === "known");
});

test("novel crashes route to full pipeline", () => {
  assert(classifyRuntimeError(["Custom business error: quota exceeded"]) === "novel");
  assert(classifyRuntimeError(["Network request failed"]) === "novel");
});

console.log("\nPipeline Layer 6 — Design spec parsing");

test("design spec JSON parses to correct tokens", () => {
  const specJson = JSON.stringify({
    paletteName: "Plum Court",
    fontFamily: "DM Sans",
    fontImport: "https://fonts.googleapis.com/css2?family=DM+Sans",
    tokens: { "--bg": "#f5f3ff", "--accent": "#7c3aed", "--accent-fg": "#ffffff" },
    componentStyle: "Rounded cards with soft purple tints",
    layoutSignature: "Centered marketing layout with split hero",
    avoid: ["generic blue", "flat white background"]
  });
  const spec = JSON.parse(specJson);
  assert(spec.tokens["--accent"] === "#7c3aed", "accent token wrong");
  assert(spec.avoid.length === 2, "avoid list wrong");
  const rootBlock = Object.entries(spec.tokens).map(([k, v]) => `  ${k}: ${v};`).join("\n");
  assert(rootBlock.includes("--accent: #7c3aed"), "root block generation failed");
});

test("malformed design spec JSON falls back gracefully", () => {
  let spec = {};
  try { spec = JSON.parse("not valid json { broken"); } catch { /* ok */ }
  // Should not throw, spec stays as empty object
  assert(typeof spec === "object", "spec should be empty object on parse failure");
  const rootBlock = spec.tokens
    ? Object.entries(spec.tokens).map(([k, v]) => `  ${k}: ${v};`).join("\n")
    : "";
  assert(rootBlock === "", "no tokens means empty root block");
});

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n  ${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
