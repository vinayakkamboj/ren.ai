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

async function loadTsModule(relativePath) {
  const ts = await import("typescript");
  return loadTsModuleSync(relativePath, ts);
}

function loadTsModuleSync(relativePath, ts) {
  let absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    const candidates = [
      `${absolutePath}.ts`,
      `${absolutePath}.tsx`,
      `${absolutePath}.js`,
      `${absolutePath}.jsx`,
      path.join(absolutePath, "index.ts"),
      path.join(absolutePath, "index.tsx"),
    ];
    absolutePath = candidates.find((candidate) => fs.existsSync(candidate)) ?? absolutePath;
  }
  if (moduleCache.has(absolutePath)) return moduleCache.get(absolutePath).exports;
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
  const mod = { exports: {} };
  moduleCache.set(absolutePath, mod);
  const dir = path.dirname(absolutePath);
  const localRequire = (specifier) => {
    if (specifier.endsWith(".css")) return {};
    if (specifier.startsWith("@/")) return loadTsModuleSync(specifier.slice(2), ts);
    if (specifier.startsWith(".")) {
      const base = path.resolve(dir, specifier);
      for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`, `${base}.json`]) {
        if (fs.existsSync(candidate)) return loadTsModuleSync(path.relative(root, candidate), ts);
      }
    }
    return require(specifier);
  };
  new Function("require", "module", "exports", "__dirname", "__filename", output)(
    localRequire,
    mod,
    mod.exports,
    dir,
    absolutePath
  );
  return mod.exports;
}

function projectFile(filePath, content, language = filePath.split(".").pop() || "text") {
  return {
    id: filePath,
    workspaceId: "full-build-smoke",
    path: filePath,
    content,
    isSystem: false,
    language,
    updatedAt: new Date(0).toISOString(),
  };
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
  for (const deleted of patchPlan?.deletes ?? []) next.delete(deleted);
  return Array.from(next.values());
}

function extractTagged(text, tag) {
  return text.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1]?.trim() ?? "";
}

function formatFiles(files) {
  return files.map((file) => `### ${file.path}\n\`\`\`${file.language}\n${file.content}\n\`\`\``).join("\n\n");
}

function renderGeneratedApp(files) {
  const ts = require("typescript");
  const React = require("react");
  const ReactDOMServer = require("react-dom/server");
  const compiled = new Map();
  const moduleCacheForFixture = new Map();
  const fileMap = new Map(files.map((file) => [file.path, file.content]));

  for (const file of files) {
    if (!/\.(tsx?|jsx?)$/.test(file.path)) continue;
    compiled.set(
      file.path,
      ts.transpileModule(file.content, {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2020,
          jsx: ts.JsxEmit.ReactJSX,
          esModuleInterop: true,
        },
        fileName: file.path,
      }).outputText
    );
  }

  function resolve(fromPath, specifier) {
    if (specifier.startsWith("@/")) specifier = `./${specifier.slice(2)}`;
    if (!specifier.startsWith(".")) return specifier;
    const dir = path.posix.dirname(fromPath);
    const base = path.posix.normalize(path.posix.join(dir, specifier));
    for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
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
      if (specifier === "react/jsx-runtime") return require("react/jsx-runtime");
      if (specifier.endsWith(".css")) return {};
      if (specifier.startsWith(".") || specifier.startsWith("@/")) return loadModule(resolve(filePath, specifier));
      return require(specifier);
    };
    new Function("require", "module", "exports", code)(localRequire, module, module.exports);
    return module.exports;
  }

  const appModule = loadModule("src/App.tsx");
  const App = appModule.default || appModule.App;
  assert(App, "App component was not exported.");
  return {
    html: ReactDOMServer.renderToString(React.createElement(App)),
    css: fileMap.get("src/index.css") ?? "",
    indexHtml: fileMap.get("index.html") ?? "",
  };
}

function writeRenderedHtml(rendered) {
  const tailwindConfig = rendered.indexHtml.match(/tailwind\.config\s*=\s*\{[\s\S]*?\n\s*};/)?.[0] ?? "";
  const outputPath = "/private/tmp/nutrient-agent-full-build-render.html";
  fs.writeFileSync(
    outputPath,
    `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Full Build Smoke</title>
    <script src="https://cdn.tailwindcss.com"></script>
    ${tailwindConfig ? `<script>${tailwindConfig}</script>` : ""}
    <style>${rendered.css}</style>
  </head>
  <body>
    <div id="root">${rendered.html}</div>
    <script>console.log("full build smoke rendered");</script>
  </body>
</html>`,
    "utf8"
  );
  return outputPath;
}

loadEnvFile(path.join(root, ".env.local"));
assert(process.env.ANTHROPIC_API_KEY, "ANTHROPIC_API_KEY missing.");

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const model = process.env.ANTHROPIC_MODEL || "claude-fable-5";
const prompt = "Build a compact claims triage app called Acorn Claims: dashboard, claim queue, selected claim detail, and a Nutrient document review panel tied to the selected claim. Keep it small but real, with working filters and state.";

const { getTemplateById } = await loadTsModule("features/templates/registry.ts");
const { buildProjectFiles } = await loadTsModule("lib/project-files/base-template.ts");
const {
  buildPlanningPrompt,
  buildDesignSpecPrompt,
  buildStaticInstructions,
  buildProjectContext,
  parseFilePatchPlan,
  buildGeneratedCodeQaSystemPrompt,
  buildGeneratedCodeQaUserMessage,
} = await loadTsModule("features/ai/prompts.ts");
const { buildRequestSpecificInstruction } = await loadTsModule("features/ai/request-intent.ts");
const { buildNutrientDocsContext } = await loadTsModule("features/ai/nutrient-docs-context.ts");
const { sanitizePatchPlan, validateRepositoryQuality, formatRepositoryQualityReport } = await loadTsModule("features/ai/validators.ts");

function mergePatchPlans(base, next) {
  const changeMap = new Map((base?.changes ?? []).map((change) => [change.path, change]));
  for (const change of next?.changes ?? []) changeMap.set(change.path, change);
  return {
    plan: next?.plan || base?.plan || "Merged QA repair",
    changes: Array.from(changeMap.values()),
    deletes: Array.from(new Set([...(base?.deletes ?? []), ...(next?.deletes ?? [])])),
    renames: [...(base?.renames ?? []), ...(next?.renames ?? [])],
  };
}

const template = getTemplateById("blank");
let files = buildProjectFiles(template).map((file) => projectFile(file.path, file.content, file.language));

console.log("FULL_BUILD_SMOKE prompt -> plan");
const planResult = await generateText({
  model: anthropic(model),
  messages: [{ role: "user", content: buildPlanningPrompt(prompt, files) }],
  maxTokens: 3000,
});
const projectPlan = extractTagged(planResult.text, "project_plan");
assert(projectPlan, `No project_plan returned: ${planResult.text.slice(0, 500)}`);
console.log("PASS plan generated");

console.log("FULL_BUILD_SMOKE plan -> design");
const designResult = await generateText({
  model: anthropic(model),
  messages: [{ role: "user", content: buildDesignSpecPrompt(prompt, projectPlan, files) }],
  maxTokens: 10000,
});
let cssOutput = extractTagged(designResult.text, "css_output");
const designMeta = extractTagged(designResult.text, "design_meta");
if (!cssOutput) {
  const retryDesign = await generateText({
    model: anthropic(model),
    messages: [{
      role: "user",
      content: `${buildDesignSpecPrompt(prompt, projectPlan, files)}

Your previous response omitted <css_output>. Return ONLY:
<css_output>
complete CSS here
</css_output>`,
    }],
    maxTokens: 8000,
  });
  cssOutput = extractTagged(retryDesign.text, "css_output");
}
let designNote = "";
if (cssOutput) {
  files = applyPatchPlan(files, { plan: "Design system", changes: [{ path: "src/index.css", content: cssOutput }] });
  designNote = [`Design meta: ${designMeta}`, "src/index.css was generated by design phase and must be preserved/extended."].join("\n");
  console.log("PASS design generated");
} else {
  console.log("WARN design phase omitted css_output; continuing like production fallback.");
}

console.log("FULL_BUILD_SMOKE design -> build");
const memory = files.find((file) => file.path === "NUTRIENTWEBBUILDER.md")?.content?.trim();
const staticSystemContent = [buildNutrientDocsContext(), buildStaticInstructions(template)].filter(Boolean).join("\n\n");
const dynamicProjectContent = [
  memory
    ? `## CURRENT WORKSPACE NUTRIENTWEBBUILDER.md — READ BEFORE EDITING AND UPDATE IN THIS RESPONSE\n\n${memory}`
    : "## CURRENT WORKSPACE NUTRIENTWEBBUILDER.md\n\nNo workspace memory file is present yet. Create NUTRIENTWEBBUILDER.md in this response if you change any project files.",
  buildProjectContext(files, projectPlan, designNote, prompt),
  buildRequestSpecificInstruction(prompt),
].filter(Boolean).join("\n\n");

const buildResult = await generateText({
  model: anthropic(model),
  messages: [
    { role: "system", content: staticSystemContent },
    { role: "user", content: `${dynamicProjectContent}\n\n## CURRENT REQUEST\n\n${prompt}` },
  ],
  maxTokens: 12000,
});

let patchPlan = sanitizePatchPlan(parseFilePatchPlan(buildResult.text));
assert(patchPlan?.changes?.length, `No file_patches returned: ${buildResult.text.slice(0, 800)}`);
console.log(`PASS build patches parsed (${patchPlan.changes.length} files)`);

let quality = validateRepositoryQuality(files, patchPlan);
console.log(formatRepositoryQualityReport(quality, 8));
for (let qaAttempt = 1; qaAttempt <= 2 && quality.fatalCount > 0; qaAttempt++) {
  console.log(`FULL_BUILD_SMOKE build -> QA repair ${qaAttempt}`);
  const localReportText = formatRepositoryQualityReport(quality);
  const qaResult = await generateText({
    model: anthropic(model),
    messages: [
      { role: "system", content: buildGeneratedCodeQaSystemPrompt() },
      {
        role: "user",
        content: [
          buildGeneratedCodeQaUserMessage(prompt, files, patchPlan, projectPlan, designNote),
          "",
          "## LOCAL QUALITY GATE REPORT",
          "This deterministic report was generated before this AI call. Treat fatal issues as hard facts to fix.",
          "```",
          localReportText,
          "```",
        ].join("\n"),
      },
    ],
    maxTokens: 12000,
  });
  const repairPlan = sanitizePatchPlan(parseFilePatchPlan(qaResult.text));
  assert(repairPlan?.changes?.length, `QA did not return repair patches: ${qaResult.text.slice(0, 800)}`);
  patchPlan = mergePatchPlans(patchPlan, repairPlan);
  quality = validateRepositoryQuality(files, patchPlan);
  console.log(formatRepositoryQualityReport(quality, 8));
}
assert(quality.fatalCount === 0, "Quality gate has fatal issues after QA.");

files = applyPatchPlan(files, patchPlan);
const rendered = renderGeneratedApp(files);
assert(rendered.html.includes("Acorn") || rendered.html.includes("Claim"), "Rendered app does not include expected product text.");
const htmlPath = writeRenderedHtml(rendered);
console.log(`HTML_RENDER_FILE ${htmlPath}`);
console.log(`TEXT_SAMPLE ${rendered.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300)}`);
console.log("PASS full-build smoke rendered");
