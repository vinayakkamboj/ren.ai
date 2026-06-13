import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = process.cwd();
const moduleCache = new Map();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function projectFile(filePath, content) {
  return {
    id: filePath,
    workspaceId: "preview-gate-smoke",
    path: filePath,
    content,
    isSystem: false,
    language: filePath.endsWith(".css") ? "css" : "typescript",
    updatedAt: new Date(0).toISOString(),
  };
}

async function loadTsModule(relativePath) {
  const ts = await import("typescript");
  const absolutePath = path.join(root, relativePath);
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
    if (specifier.startsWith("@/")) return loadTsModuleSync(specifier.slice(2), ts);
    if (specifier.startsWith(".")) {
      const base = path.resolve(dir, specifier);
      for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`]) {
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

function loadTsModuleSync(relativePath, ts) {
  const absolutePath = path.join(root, relativePath);
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
    if (specifier.startsWith("@/")) return loadTsModuleSync(specifier.slice(2), ts);
    if (specifier.startsWith(".")) {
      const base = path.resolve(dir, specifier);
      for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`]) {
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

const {
  getPlannedFilesNeedingGeneration,
  isStarterPreviewScaffold,
} = await loadTsModule("features/ai/build-continuation.ts");

const {
  DEFAULT_SKILL_MODE,
  buildSkillModeContext,
  buildSkillModePromptPrefix,
} = await loadTsModule("features/ai/skill-modes.ts");

const starterApp = `import { NutrientViewer } from "./NutrientViewer";

// Full-screen Nutrient SDK viewer — the AI replaces this with a real app.
export default function App() {
  return <div className="viewer-app"><NutrientViewer /></div>;
}

/* nutrient-preview
{
  "appName": "Nutrient Workspace",
  "tagline": "Ask AI to build anything with Nutrient"
}
*/`;

const starterCss = `/* Default starter — full-screen Nutrient viewer. AI replaces with a real app. */
.viewer-app { height: 100vh; }
.viewer-mount { height: 100%; }`;

const generatedApp = `export default function App() {
  return <main className="min-h-screen bg-bg text-text">Generated logistics command center</main>;
}`;

const generatedCss = `:root { --bg: #fafafa; --text: #171717; --accent: #0f766e; }
body { background: var(--bg); color: var(--text); }`;

const plannedFiles = [
  "src/App.tsx",
  "src/index.css",
  "src/layouts/AppLayout.tsx",
  "src/data/mockData.ts",
  "src/NutrientViewer.tsx",
  "src/lib/utils.ts",
  "NUTRIENTWEBBUILDER.md",
];

assert(isStarterPreviewScaffold("src/App.tsx", starterApp), "starter App.tsx was not recognized");
assert(isStarterPreviewScaffold("src/index.css", starterCss), "starter index.css was not recognized");
assert(!isStarterPreviewScaffold("src/App.tsx", generatedApp), "generated App.tsx was misclassified as starter");

const initialFiles = [
  projectFile("src/App.tsx", starterApp),
  projectFile("src/index.css", starterCss),
  projectFile("src/NutrientViewer.tsx", "export function NutrientViewer() { return null; }"),
  projectFile("src/lib/utils.ts", "export function cn() { return ''; }"),
  projectFile("NUTRIENTWEBBUILDER.md", "# Memory"),
];

const firstRemaining = getPlannedFilesNeedingGeneration(
  plannedFiles,
  initialFiles,
  new Set(["NUTRIENTWEBBUILDER.md"])
);
assert(firstRemaining.includes("src/App.tsx"), "starter App.tsx must be regenerated");
assert(firstRemaining.includes("src/index.css"), "starter index.css must be regenerated");
assert(firstRemaining.includes("src/layouts/AppLayout.tsx"), "missing layout must be generated");
assert(firstRemaining.includes("src/data/mockData.ts"), "missing data file must be generated");
assert(!firstRemaining.includes("src/NutrientViewer.tsx"), "runtime Nutrient viewer should be reusable");
assert(!firstRemaining.includes("src/lib/utils.ts"), "shadcn utility should be reusable");

const generatedFiles = [
  projectFile("src/App.tsx", generatedApp),
  projectFile("src/index.css", generatedCss),
  projectFile("src/layouts/AppLayout.tsx", "export function AppLayout() { return null; }"),
  projectFile("src/data/mockData.ts", "export const records = [];"),
  ...initialFiles.filter((file) => !["src/App.tsx", "src/index.css"].includes(file.path)),
];

const finalRemaining = getPlannedFilesNeedingGeneration(
  plannedFiles,
  generatedFiles,
  new Set(["NUTRIENTWEBBUILDER.md", "src/App.tsx", "src/index.css", "src/layouts/AppLayout.tsx", "src/data/mockData.ts"])
);
assert(finalRemaining.length === 0, `expected no remaining files, got ${finalRemaining.join(", ")}`);

const storeSource = fs.readFileSync(path.join(root, "features/workspaces/store.ts"), "utf8");
assert(
  storeSource.includes("viewerKey: get().viewerKey + 1"),
  "workspace store must remount Sandpack after AI patches"
);
assert(
  storeSource.includes("await persistPatchPlan(workspaceId, patchPlan)") &&
  storeSource.includes("changes: patchPlan.changes"),
  "AI patch autosave must persist generated files as one awaited batch"
);

const previewSource = fs.readFileSync(path.join(root, "components/workspace/SandpackPreview.tsx"), "utf8");
assert(
  previewSource.includes("sandpack.deleteFile(previousPath)"),
  "Sandpack preview must delete removed files from live sandbox"
);
assert(
  previewSource.includes("JSON.parse(pkgFile.content)") &&
  previewSource.includes("customSetup={{ dependencies: deps }}"),
  "Sandpack preview must install dependencies from generated package.json"
);
assert(
  previewSource.includes('highlight: "highlighter"') &&
  previewSource.includes('distance: "measure"') &&
  previewSource.includes("VALID_TOOLBAR_ITEM_TYPES") &&
  previewSource.includes("normalizeToolbarItems(toolbarItems)"),
  "Sandpack runtime must normalize common invalid Nutrient toolbar aliases"
);
assert(
  previewSource.includes("onInstanceUnload") &&
  previewSource.includes("notifyInstanceUnload"),
  "Sandpack runtime must clear external SDK refs when the viewer unloads"
);

const baseTemplateSource = fs.readFileSync(path.join(root, "lib/project-files/base-template.ts"), "utf8");
assert(
  baseTemplateSource.includes("https://cdn.tailwindcss.com"),
  "sandbox base index.html must load Tailwind Play CDN"
);
assert(
  baseTemplateSource.includes('highlight: "highlighter"') &&
  baseTemplateSource.includes('distance: "measure"') &&
  baseTemplateSource.includes("VALID_TOOLBAR_ITEM_TYPES") &&
  baseTemplateSource.includes("normalizeToolbarItems(toolbarItems)"),
  "generated NutrientViewer wrapper must normalize common invalid toolbar aliases"
);
assert(
  baseTemplateSource.includes("onInstanceUnload") &&
  baseTemplateSource.includes("notifyInstanceUnload") &&
  baseTemplateSource.includes("document: documentUrl ||"),
  "generated NutrientViewer wrapper must fallback document URLs and clear stale SDK refs"
);

const chatPanelSource = fs.readFileSync(path.join(root, "components/workspace/ChatPanel.tsx"), "utf8");
assert(
  chatPanelSource.includes("requestsDesignChange") &&
  chatPanelSource.includes("buildDesignCssRepairPrompt") &&
  chatPanelSource.includes("designCssStillUnchanged") &&
  chatPanelSource.includes("deepDesignCssStillUnchanged") &&
  chatPanelSource.includes("Deep design CSS repair"),
  "Light/full builds must repair or block design requests that leave src/index.css unchanged"
);
assert(
  chatPanelSource.includes("SKILL_MODE_OPTIONS") &&
  chatPanelSource.includes("DEFAULT_SKILL_MODE") &&
  chatPanelSource.includes("buildSkillModePromptPrefix") &&
  chatPanelSource.includes("buildLocalDarkThemePatch") &&
  chatPanelSource.includes("selectedSkillMode"),
  "Chat panel must expose Nutrient skill modes and local global-theme customization"
);

const chatRouteSource = fs.readFileSync(path.join(root, "app/api/ai/chat/route.ts"), "utf8");
assert(
  chatRouteSource.includes("DEFAULT_SKILL_MODE") &&
  chatRouteSource.includes("buildSkillModeContext") &&
  chatRouteSource.includes("agentMessage") &&
  chatRouteSource.includes("skillContext"),
  "AI route must apply selected Nutrient skill mode context to model prompts"
);

const skillModesSource = fs.readFileSync(path.join(root, "features/ai/skill-modes.ts"), "utf8");
assert(
  skillModesSource.includes("/dws") &&
  skillModesSource.includes("/pdf-md") &&
  skillModesSource.includes('DEFAULT_SKILL_MODE: SkillModeId = "nutrient-web-sdk"') &&
  skillModesSource.includes("nutrient-web-sdk") &&
  skillModesSource.includes("document-processor-api") &&
  skillModesSource.includes("pdf-to-markdown"),
  "Skill registry must include DWS, PDF-to-Markdown, and Web SDK command modes"
);
assert(DEFAULT_SKILL_MODE === "nutrient-web-sdk", "Web SDK must be the default Nutrient skill mode");
assert(
  buildSkillModePromptPrefix("create a portal", DEFAULT_SKILL_MODE).startsWith("/web-sdk "),
  "Default skill mode must prefix chat prompts with /web-sdk"
);
assert(
  buildSkillModeContext("create a university portal").mode === "nutrient-web-sdk",
  "Server skill context must default generic app requests to Web SDK"
);
assert(
  buildSkillModeContext("/dws convert this PDF").mode === "document-processor-api",
  "Explicit /dws command must override the Web SDK default"
);
assert(
  buildSkillModeContext("Use DWS to OCR and convert a PDF").mode === "document-processor-api",
  "DWS inference must override the Web SDK default"
);

const themeCustomizerSource = fs.readFileSync(path.join(root, "features/ai/theme-customizer.ts"), "utf8");
assert(
  themeCustomizerSource.includes("shouldApplyLocalDarkThemePatch") &&
  themeCustomizerSource.includes("nucode-theme-override") &&
  themeCustomizerSource.includes("Manrope"),
  "Local theme customizer must provide deterministic global dark theme patches"
);

for (const dependency of [
  "@radix-ui/react-dialog",
  "@radix-ui/react-tabs",
  "@radix-ui/react-tooltip",
  "class-variance-authority",
  "tailwind-merge",
  "framer-motion",
]) {
  assert(baseTemplateSource.includes(`"${dependency}"`), `sandbox package.json must include ${dependency}`);
}

console.log("PASS starter preview scaffold is detected");
console.log("PASS continuation gate requires starter App/CSS replacement");
console.log("PASS reusable runtime infrastructure is not regenerated unnecessarily");
console.log("PASS generated app leaves no remaining planned files");
console.log("PASS AI patch autosave is awaited and batched");
console.log("PASS Sandpack remount/delete protections are present");
console.log("PASS Sandpack dependency/Tailwind/Radix infrastructure is present");
console.log("PASS Nutrient toolbar aliases are normalized before SDK load");
console.log("PASS Nutrient skill modes and local theme customization are wired");
console.log("");
console.log("Smoke mode: preview/generation gate only, no model calls, no full build.");
