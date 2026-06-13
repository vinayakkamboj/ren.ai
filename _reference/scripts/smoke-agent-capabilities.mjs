import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

const require = createRequire(import.meta.url);
const root = process.cwd();
const moduleCache = new Map();

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function projectFile(filePath, content, language = filePath.split(".").pop() || "text") {
  return {
    id: filePath,
    workspaceId: "agent-capability-smoke",
    path: filePath,
    content,
    isSystem: false,
    language,
    updatedAt: new Date(0).toISOString(),
  };
}

async function loadTsModule(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (moduleCache.has(absolutePath)) return moduleCache.get(absolutePath).exports;

  const ts = await import("typescript");
  const source = fs.readFileSync(absolutePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
      skipLibCheck: true,
    },
    fileName: absolutePath,
  }).outputText;

  const module = { exports: {} };
  moduleCache.set(absolutePath, module);
  const dirname = path.dirname(absolutePath);

  function localRequire(specifier) {
    if (specifier.endsWith(".css")) return {};
    if (specifier.startsWith("@/")) {
      return loadTsModuleSync(specifier.slice(2));
    }
    if (specifier.startsWith(".")) {
      const base = path.resolve(dirname, specifier);
      for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`]) {
        if (fs.existsSync(candidate)) return loadTsModuleSync(path.relative(root, candidate));
      }
    }
    return require(specifier);
  }

  function loadTsModuleSync(relPath) {
    const absPath = path.join(root, relPath);
    if (moduleCache.has(absPath)) return moduleCache.get(absPath).exports;
    const src = fs.readFileSync(absPath, "utf8");
    const js = ts.transpileModule(src, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.React,
        esModuleInterop: true,
        skipLibCheck: true,
      },
      fileName: absPath,
    }).outputText;
    const mod = { exports: {} };
    moduleCache.set(absPath, mod);
    const dir = path.dirname(absPath);
    const req = (spec) => {
      if (spec.endsWith(".css")) return {};
      if (spec.startsWith("@/")) return loadTsModuleSync(spec.slice(2));
      if (spec.startsWith(".")) {
        const base = path.resolve(dir, spec);
        for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`]) {
          if (fs.existsSync(candidate)) return loadTsModuleSync(path.relative(root, candidate));
        }
      }
      return require(spec);
    };
    new Function("require", "module", "exports", "__dirname", "__filename", js)(
      req,
      mod,
      mod.exports,
      dir,
      absPath
    );
    return mod.exports;
  }

  new Function("require", "module", "exports", "__dirname", "__filename", output)(
    localRequire,
    module,
    module.exports,
    dirname,
    absolutePath
  );
  return module.exports;
}

function parseFileEditsFallback(raw) {
  const match = raw.match(/<file_edits>\s*([\s\S]*?)\s*<\/file_edits>/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1].trim());
    if (!Array.isArray(parsed.edits)) return null;
    return {
      plan: parsed.plan || "Applied edits",
      edits: parsed.edits.filter((edit) =>
        edit &&
        typeof edit.path === "string" &&
        typeof edit.find === "string" &&
        typeof edit.replace === "string"
      ),
    };
  } catch {
    return null;
  }
}

async function generateFileEditsWithRetry({ anthropic, model, prompt, maxTokens, label, parseFileEdits }) {
  let currentPrompt = prompt;
  let lastText = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    const result = await generateText({
      model: anthropic(model),
      messages: [{ role: "user", content: currentPrompt }],
      maxTokens,
    });
    lastText = result.text;
    assert(!/<file_patches>|<project_plan>/i.test(lastText), `${label} drifted into full-build protocol.`);
    const parsed = parseFileEdits(lastText) || parseFileEditsFallback(lastText);
    if (parsed?.edits?.length) {
      if (attempt > 1) console.log(`PASS ${label} recovered after protocol retry`);
      return { text: lastText, parsed };
    }
    currentPrompt = `${prompt}

PREVIOUS RESPONSE WAS INVALID:
${lastText.slice(0, 1200)}

You MUST respond with exactly this machine-readable shape and nothing else:
<file_edits>
{"plan":"one sentence","edits":[{"path":"src/App.tsx","find":"exact text from file","replace":"replacement text"}]}
</file_edits>

Do not use markdown fences. Do not use keys named file/search. Do not output JSON without the <file_edits> wrapper.`;
  }
  throw new Error(`${label} returned no usable edits after retry: ${lastText}`);
}

function applyPatchPlan(files, patchPlan) {
  const next = new Map(files.map((file) => [file.path, { ...file }]));
  for (const change of patchPlan?.changes ?? []) {
    const existing = next.get(change.path);
    next.set(change.path, {
      ...(existing ?? projectFile(change.path, change.content)),
      content: change.content,
    });
  }
  return Array.from(next.values());
}

function fileContent(files, filePath) {
  const file = files.find((candidate) => candidate.path === filePath);
  assert(file, `Missing ${filePath}`);
  return file.content;
}

function formatFiles(files) {
  return files
    .map((file) => `### ${file.path}\n\`\`\`${file.language}\n${file.content}\n\`\`\``)
    .join("\n\n");
}

function createCrashFixture() {
  return [
    projectFile("NUTRIENTWEBBUILDER.md", "# Acorn Claims\n\nFocused claims review app. Latest change: baseline smoke fixture.", "markdown"),
    projectFile(
      "src/App.tsx",
      `import React from "react";
import { useDeals } from "./hooks/useDeals";

export default function App() {
  const { deals } = useDeals();
  return (
    <main className="app-shell">
      <h1>Acorn Claims</h1>
      <p>{deals.length} active deal reviews</p>
      <ul>
        {deals.map((deal) => (
          <li key={deal.id}>{deal.label}</li>
        ))}
      </ul>
    </main>
  );
}
`,
      "tsx"
    ),
    projectFile(
      "src/hooks/useDeals.ts",
      `import dealResponse from "../data/mockData";

export function useDeals() {
  const deals = dealResponse.deals;
  const enrichedDeals = deals.map((deal) => ({
    ...deal,
    label: deal.name.toUpperCase(),
  }));
  return { deals: enrichedDeals };
}
`,
      "ts"
    ),
    projectFile(
      "src/data/mockData.ts",
      `import type { Deal } from "../types/deal";

const dealResponse: { deals?: Deal[] } = {};
export default dealResponse;
`,
      "ts"
    ),
    projectFile(
      "src/types/deal.ts",
      `export interface Deal {
  id: string;
  name: string;
}
`,
      "ts"
    ),
    projectFile(
      "src/index.css",
      `.app-shell {
  padding: 24px;
  font-family: system-ui, sans-serif;
}
`,
      "css"
    ),
  ];
}

function renderFixture(files) {
  const ts = require("typescript");
  const React = require("react");
  const ReactDOMServer = require("react-dom/server");
  const compiled = new Map();
  const moduleCacheForFixture = new Map();

  for (const file of files) {
    if (!/\.(tsx?|jsx?)$/.test(file.path)) continue;
    compiled.set(
      file.path,
      ts.transpileModule(file.content, {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2020,
          jsx: ts.JsxEmit.React,
          esModuleInterop: true,
        },
        fileName: file.path,
      }).outputText
    );
  }

  function resolve(fromPath, specifier) {
    if (!specifier.startsWith(".")) return specifier;
    const dir = path.posix.dirname(fromPath);
    const base = path.posix.normalize(path.posix.join(dir, specifier));
    for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`]) {
      if (compiled.has(candidate)) return candidate;
    }
    throw new Error(`Cannot resolve ${specifier} from ${fromPath}`);
  }

  function loadModule(filePath) {
    if (moduleCacheForFixture.has(filePath)) return moduleCacheForFixture.get(filePath).exports;
    const code = compiled.get(filePath);
    assert(code, `No compiled module for ${filePath}`);
    const module = { exports: {} };
    moduleCacheForFixture.set(filePath, module);
    const localRequire = (specifier) => {
      if (specifier === "react") return React;
      if (specifier.endsWith(".css")) return {};
      if (specifier.startsWith(".")) return loadModule(resolve(filePath, specifier));
      return require(specifier);
    };
    new Function("require", "module", "exports", code)(localRequire, module, module.exports);
    return module.exports;
  }

  const appModule = loadModule("src/App.tsx");
  const App = appModule.default || appModule.App;
  assert(App, "App component was not exported.");
  return ReactDOMServer.renderToString(React.createElement(App));
}

function writeRenderedHtml(html) {
  const outputPath = "/private/tmp/nutrient-agent-capability-render.html";
  fs.writeFileSync(
    outputPath,
    `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Agent Capability Smoke</title></head>
  <body>
    <div id="root">${html}</div>
    <script>
      window.__AGENT_CAPABILITY_SMOKE__ = true;
      console.log("agent capability smoke rendered");
    </script>
  </body>
</html>
`,
    "utf8"
  );
  return outputPath;
}

async function repairQualityGateFatals({ files, quality, anthropic, model, parseFileEdits, applyEditsToFiles, formatRepositoryQualityReport, validateRepositoryQuality }) {
  let currentFiles = files;
  let currentQuality = quality;
  let repaired = false;

  for (let attempt = 1; attempt <= 3 && currentQuality.fatalCount > 0; attempt++) {
    const qualityRepairPrompt = `You are the QA/Reviewer for a generated React app patch.
Output ONLY a <file_edits> JSON block. Do not output prose. Do not output <file_patches>. Do not build or rebuild the app.
Fix the fatal quality-gate issues below while preserving the current app. Keep scope tight.

Import/export repair rules:
- If the report says named-export-missing, either add that exact missing export to the target file or change the import to a symbol that is visibly exported by the target file.
- Do not invent a new imported symbol name.
- Never replace one missing export with another missing export.
- For this fixture, a correct stable contract can be: import dealResponse from mockData, then derive const deals = dealResponse.deals ?? [] before mapping.

QUALITY GATE REPORT:
${formatRepositoryQualityReport(currentQuality)}

Current project files:
${formatFiles(currentFiles)}`;

    let parsed;
    try {
      ({ parsed } = await generateFileEditsWithRetry({
        anthropic,
        model,
        prompt: qualityRepairPrompt,
        maxTokens: 2000,
        label: "AI quality-gate repair protocol",
        parseFileEdits,
      }));
    } catch (err) {
      console.log(`WARN quality-gate repair attempt ${attempt} parse/retry failed: ${err.message?.slice(0, 120)}`);
      break;
    }
    const applied = applyEditsToFiles(parsed, currentFiles);
    if (!applied.patchPlan?.changes?.length) {
      console.log(`WARN quality-gate repair attempt ${attempt} edits did not apply (stale find strings): ${JSON.stringify(applied.failures?.slice(0, 2))}`);
      break;
    }
    currentFiles = applyPatchPlan(currentFiles, applied.patchPlan);
    currentQuality = validateRepositoryQuality(currentFiles);
    repaired = true;
    if (currentQuality.fatalCount > 0) {
      console.log(`WARN quality-gate repair attempt ${attempt} still has ${currentQuality.fatalCount} fatal issue(s)`);
    }
  }

  return { files: currentFiles, quality: currentQuality, repaired };
}

loadEnvFile(path.join(root, ".env.local"));
assert(process.env.ANTHROPIC_API_KEY, "ANTHROPIC_API_KEY missing. Cannot run AI capability smoke.");

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const fastModel = process.env.ANTHROPIC_FAST_MODEL || "claude-haiku-4-5-20251001";
const { parseFileEdits, applyEditsToFiles } = await loadTsModule("features/ai/edit-protocol.ts");
const { validateRepositoryQuality, formatRepositoryQualityReport } = await loadTsModule("features/ai/validators.ts");
const { buildContextPack } = await loadTsModule("features/ai/repository-intelligence.ts");

console.log("Capability smoke: constrained edit/repair calls only. No full-build pipeline, no workspace mutation.");

let files = createCrashFixture();
let originalRenderFailed = false;
try {
  renderFixture(files);
} catch (error) {
  originalRenderFailed = /map|undefined|Cannot read/i.test(String(error?.message || error));
}
assert(originalRenderFailed, "Crash fixture unexpectedly rendered before repair.");
console.log("PASS baseline fixture reproduces first-render map crash");

const contextPack = buildContextPack(
  "Fix Cannot read properties of undefined reading map in useDeals",
  files,
  {
    runtimeErrors: [
      "Uncaught TypeError: Cannot read properties of undefined (reading 'map')\n    at useDeals (https://sandbox/src/hooks/useDeals.ts:5:31)\n    at App (https://sandbox/src/App.tsx:5:21)",
    ],
    maxFiles: 8,
  }
);
const relevantPaths = contextPack.relevantFiles.map((file) => file.path);
assert(relevantPaths.includes("src/hooks/useDeals.ts"), "Repository context did not rank crashed hook.");
assert(
  relevantPaths.includes("src/data/mockData.ts") || relevantPaths.includes("src/App.tsx"),
  "Repository context did not include nearby data/app files."
);
console.log(`PASS repository understanding ranks relevant files -> ${relevantPaths.slice(0, 4).join(", ")}`);

const editPrompt = `You are the Nutrient Coding Agent in ITERATIVE mode.
Output ONLY a <file_edits> JSON block. Do not output prose. Do not output <file_patches>. Do not build or rebuild the app.

Task: Change the visible title in src/App.tsx from "Acorn Claims" to "Acorn Claims QA". Make the smallest search-replace edit.

Project files:
${formatFiles(files.filter((file) => file.path === "src/App.tsx" || file.path === "NUTRIENTWEBBUILDER.md"))}`;

const { parsed: parsedEdit } = await generateFileEditsWithRetry({
  anthropic,
  model: fastModel,
  prompt: editPrompt,
  maxTokens: 700,
  label: "AI edit-mode protocol",
  parseFileEdits,
});
const editApply = applyEditsToFiles(parsedEdit, files);
assert(editApply.patchPlan?.changes?.length, `Edit smoke failed to apply edits: ${JSON.stringify(editApply.failures)}`);
files = applyPatchPlan(files, editApply.patchPlan);
assert(fileContent(files, "src/App.tsx").includes("Acorn Claims QA"), "Edit smoke did not update the title.");
console.log("PASS AI edit-mode output parsed and applied");

const runtimeError = `Uncaught TypeError: Cannot read properties of undefined (reading 'map')
    at useDeals (https://sandbox/src/hooks/useDeals.ts:5:31)
    at App (https://sandbox/src/App.tsx:5:21)`;

const investigationPrompt = `You are the Investigator in a staged runtime-debugging workflow.
Do NOT edit code. Return ROOT CAUSE, EVIDENCE, AFFECTED FILES, DATA CONTRACT, FIX DIRECTION.

Runtime error:
${runtimeError}

Repository context relevant files:
${relevantPaths.join(", ")}

Project files:
${formatFiles(files)}`;

const investigation = await generateText({
  model: anthropic(fastModel),
  messages: [{ role: "user", content: investigationPrompt }],
  maxTokens: 800,
});
assert(/useDeals/i.test(investigation.text), "Investigation did not identify useDeals.");
assert(/dealResponse|mockData|deals/i.test(investigation.text), "Investigation did not discuss data source/contract.");
console.log("PASS AI investigation identifies crash chain");

const planPrompt = `You are the Planner in a staged runtime-debugging workflow.
Do NOT edit code. Create a tight fix plan. Do not suggest full rebuild.

Investigation:
${investigation.text}

Runtime error:
${runtimeError}`;

const plan = await generateText({
  model: anthropic(fastModel),
  messages: [{ role: "user", content: planPrompt }],
  maxTokens: 700,
});
assert(/useDeals|mockData|array|default/i.test(plan.text), "Planner did not produce a relevant root-cause plan.");
console.log("PASS AI planner creates repair plan");

const repairPrompt = `You are the Coder in ERROR-FIX mode.
Output ONLY a <file_edits> JSON block. Do not output prose. Do not output <file_patches>. Do not build or rebuild the app.
Fix the root cause so first render cannot crash. The safest fix is adding "?? []" guards where .map() is called on potentially undefined values. Keep scope tight — do not change import/export contracts.

Runtime error:
${runtimeError}

Investigation:
${investigation.text}

Fix plan:
${plan.text}

Project files:
${formatFiles(files)}`;

const { parsed: parsedRepair } = await generateFileEditsWithRetry({
  anthropic,
  model: fastModel,
  prompt: repairPrompt,
  maxTokens: 1200,
  label: "AI repair protocol",
  parseFileEdits,
});
const repairApply = applyEditsToFiles(parsedRepair, files);
assert(repairApply.patchPlan?.changes?.length, `Repair smoke failed to apply edits: ${JSON.stringify(repairApply.failures)}`);
files = applyPatchPlan(files, repairApply.patchPlan);

let quality = validateRepositoryQuality(files);
if (quality.fatalCount > 0) {
  const repaired = await repairQualityGateFatals({
    files,
    quality,
    anthropic,
    model: fastModel,
    parseFileEdits,
    applyEditsToFiles,
    formatRepositoryQualityReport,
    validateRepositoryQuality,
  });
  files = repaired.files;
  quality = repaired.quality ?? validateRepositoryQuality(files);
  if (repaired.repaired) console.log("PASS AI quality-gate repair applied after reviewer failure");
}
assert(quality.fatalCount === 0, `Quality gate still has fatal issues:\n${formatRepositoryQualityReport(quality)}`);
const rendered = renderFixture(files);
assert(rendered.includes("Acorn Claims QA"), "Repaired app did not render expected title.");
assert(rendered.includes("active deal reviews"), "Repaired app did not render expected content.");
const htmlPath = writeRenderedHtml(rendered);
console.log(`PASS AI repair edits applied, quality gate has no fatal issues, SSR render succeeded`);
console.log(`HTML_RENDER_FILE ${htmlPath}`);
console.log("PASS capability smoke completed without full-build pipeline.");
