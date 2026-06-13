/**
 * Smoke tests for features/ai/build-transaction logic.
 * Runs in Node.js — no network, no Sandpack, no React.
 * Validates the fatal-detection invariants that protect Sandpack previews.
 *
 * Usage: node scripts/smoke-build-transaction.mjs
 */

// ── Inline port of the build-transaction logic (avoid TS transpilation) ──────

function isFileTruncated(content, path) {
  if (!/\.(tsx?|jsx?)$/.test(path)) return false;
  const trimmed = content.trim();
  if (!trimmed || !/[};>"']$/.test(trimmed)) return true;
  let depth = 0, i = 0;
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

function resolveRelativeImport(sourceDir, importPath) {
  const raw = (sourceDir ? sourceDir + "/" : "") + importPath;
  const parts = raw.split("/");
  const stack = [];
  for (const p of parts) {
    if (p === "..") stack.pop();
    else if (p !== "." && p !== "") stack.push(p);
  }
  const base = stack.join("/");
  return [base, base+".tsx", base+".ts", base+".jsx", base+".js", base+"/index.tsx", base+"/index.ts"];
}

function scanMissingImports(path, content, candidate) {
  if (!/\.(tsx?|jsx?)$/.test(path)) return [];
  const sourceDir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
  const issues = [];
  const re = /^import\s[^;]+from\s+['"](\.[^'"]+)['"]/gm;
  let m;
  while ((m = re.exec(content)) !== null) {
    const importPath = m[1];
    const candidates = resolveRelativeImport(sourceDir, importPath);
    if (!candidates.some(p => candidate.has(p))) {
      const preferred = candidates.find(p => p.endsWith(".tsx")) ?? candidates.find(p => p.endsWith(".ts")) ?? candidates[1];
      issues.push({ type: "missing-file", file: path, detail: `\`${path}\` imports "${importPath}" — Create: ${preferred}`, missingPaths: candidates, importPath });
    }
  }
  return issues;
}

const SDK_NPM_RE = /^import\s+[^'"]*from\s+['"](@nutrient-sdk\/viewer|pspdfkit)['"]/m;

function detectFatalIssues(candidate) {
  const issues = [];
  if (!candidate.has("src/App.tsx")) {
    issues.push({ type: "missing-app-tsx", file: "src/App.tsx", detail: "src/App.tsx is missing." });
    return issues;
  }
  for (const [path, content] of candidate.entries()) {
    if (!/\.(tsx?|jsx?)$/.test(path)) continue;
    if (SDK_NPM_RE.test(content)) issues.push({ type: "sdk-npm-import", file: path, detail: `${path} has SDK npm import.` });
    if (isFileTruncated(content, path)) issues.push({ type: "truncated", file: path, detail: `${path} is truncated.` });
    issues.push(...scanMissingImports(path, content, candidate));
  }
  return issues;
}

// ── Test harness ─────────────────────────────────────────────────────────────

let passed = 0, failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗  ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message ?? "assertion failed");
}

function assertFatals(issues, ...types) {
  const found = issues.map(i => i.type);
  for (const t of types) {
    assert(found.includes(t), `Expected fatal type "${t}" but got: [${found.join(", ")}]`);
  }
}

function assertNoFatals(issues) {
  assert(issues.length === 0, `Expected no fatals but got: [${issues.map(i => i.detail).join("; ")}]`);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log("\nSmoke: build-transaction fatal detection\n");

test("clean candidate with App.tsx and all imports present — no fatals", () => {
  const c = new Map([
    ["src/App.tsx", `import Dashboard from "./components/Dashboard";\nexport default function App() { return <Dashboard />; }`],
    ["src/components/Dashboard.tsx", `export default function Dashboard() { return <div />; }`],
  ]);
  assertNoFatals(detectFatalIssues(c));
});

test("missing App.tsx — reports missing-app-tsx fatal", () => {
  const c = new Map([
    ["src/components/Foo.tsx", `export default function Foo() { return <div />; }`],
  ]);
  const issues = detectFatalIssues(c);
  assertFatals(issues, "missing-app-tsx");
});

test("App.tsx imports component that doesn't exist — reports missing-file fatal", () => {
  const c = new Map([
    ["src/App.tsx", `import MissingPanel from "./components/MissingPanel";\nexport default function App() { return <MissingPanel />; }`],
  ]);
  const issues = detectFatalIssues(c);
  assertFatals(issues, "missing-file");
  assert(issues[0].importPath === "./components/MissingPanel", "Should capture import path");
});

test("missing component is added to candidate — fatal clears", () => {
  const c = new Map([
    ["src/App.tsx", `import MissingPanel from "./components/MissingPanel";\nexport default function App() { return <MissingPanel />; }`],
    ["src/components/MissingPanel.tsx", `export default function MissingPanel() { return <div />; }`],
  ]);
  assertNoFatals(detectFatalIssues(c));
});

test("SDK npm import from @nutrient-sdk/viewer — reports sdk-npm-import fatal", () => {
  const c = new Map([
    ["src/App.tsx", `import PSPDFKit from "@nutrient-sdk/viewer";\nexport default function App() { return <div />; }`],
  ]);
  const issues = detectFatalIssues(c);
  assertFatals(issues, "sdk-npm-import");
});

test("SDK npm import from pspdfkit — reports sdk-npm-import fatal", () => {
  const c = new Map([
    ["src/App.tsx", `import PSPDFKit from "pspdfkit";\nexport default function App() { return <div />; }`],
  ]);
  assertFatals(detectFatalIssues(c), "sdk-npm-import");
});

test("truncated TSX file — reports truncated fatal", () => {
  const truncated = `export default function Broken() {\n  return (\n    <div>\n      <p>Hello</p>`; // no closing
  const c = new Map([
    ["src/App.tsx", `export default function App() { return <div />; }`],
    ["src/components/Broken.tsx", truncated],
  ]);
  assertFatals(detectFatalIssues(c), "truncated");
});

test("well-formed TSX — not flagged as truncated", () => {
  const good = `export default function Good() {\n  return (\n    <div>\n      <p>Hello</p>\n    </div>\n  );\n}`;
  const c = new Map([
    ["src/App.tsx", `export default function App() { return <div />; }`],
    ["src/components/Good.tsx", good],
  ]);
  assertNoFatals(detectFatalIssues(c));
});

test("default import resolved by named import path variant — no fatal", () => {
  const c = new Map([
    ["src/App.tsx", `import Sidebar from "./layouts/Sidebar";\nexport default function App() { return <Sidebar />; }`],
    // File exists as .tsx extension
    ["src/layouts/Sidebar.tsx", `export default function Sidebar() { return <nav />; }`],
  ]);
  assertNoFatals(detectFatalIssues(c));
});

test("nested page imports from component — missing component fatal", () => {
  const c = new Map([
    ["src/App.tsx", `import Home from "./pages/Home";\nexport default function App() { return <Home />; }`],
    ["src/pages/Home.tsx", `import Table from "../components/Table";\nexport default function Home() { return <Table />; }`],
    // Table is missing
  ]);
  assertFatals(detectFatalIssues(c), "missing-file");
});

test("isFileTruncated — balanced braces not truncated", () => {
  assert(!isFileTruncated(`function Foo() { return <div />; }`, "foo.tsx"), "balanced should not be truncated");
});

test("isFileTruncated — file ending mid-expression is truncated", () => {
  assert(isFileTruncated(`function Foo() {\n  return (`, "foo.tsx"), "unbalanced should be truncated");
});

test("isFileTruncated — .css file not checked", () => {
  assert(!isFileTruncated(`body { color: red`, "foo.css"), "CSS not checked");
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
