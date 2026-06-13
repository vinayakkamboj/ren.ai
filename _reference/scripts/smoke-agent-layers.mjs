import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function pass(name, detail = "") {
  checks.push({ name, status: "pass", detail });
}

function fail(name, detail) {
  checks.push({ name, status: "fail", detail });
}

function assertIncludes(filePath, content, needle, name) {
  if (content.includes(needle)) pass(name, filePath);
  else fail(name, `${filePath} is missing ${needle}`);
}

async function checkHttp(baseUrl) {
  const loginResponse = await fetch(`${baseUrl}/login`, { redirect: "manual" });
  if (loginResponse.status === 200) pass("local login page responds", `${loginResponse.status}`);
  else fail("local login page responds", `expected 200, got ${loginResponse.status}`);

  const apiResponse = await fetch(`${baseUrl}/api/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "status?",
      workspaceId: "smoke",
      templateId: "blank",
      projectFiles: [],
      messageHistory: [],
      mode: "chat",
    }),
  });
  if (apiResponse.status === 401) {
    pass("AI route auth gate blocks unauthenticated smoke call", "401 before model/full-build");
  } else {
    fail("AI route auth gate blocks unauthenticated smoke call", `expected 401, got ${apiResponse.status}`);
  }
}

const repositoryIntelligence = read("features/ai/repository-intelligence.ts");
const prompts = read("features/ai/prompts.ts");
const validators = read("features/ai/validators.ts");
const chatPanel = read("components/workspace/ChatPanel.tsx");
const route = read("app/api/ai/chat/route.ts");
const docsContext = read("features/ai/nutrient-docs-context.ts");
const memory = read("NUTRIENTWEBBUILDER.md");
const agentDoc = read("NutrientCodingAgent.md");

assertIncludes(
  "features/ai/repository-intelligence.ts",
  repositoryIntelligence,
  "export function buildContextPack",
  "repository intelligence exports context pack builder"
);
assertIncludes(
  "features/ai/repository-intelligence.ts",
  repositoryIntelligence,
  "export function buildRepositoryIntelligence",
  "repository intelligence exports analyzer"
);
assertIncludes(
  "features/ai/prompts.ts",
  prompts,
  "formatContextPackForPrompt",
  "prompts inject repository context"
);

assertIncludes(
  "features/ai/validators.ts",
  validators,
  "export function validateRepositoryQuality",
  "validators expose repository quality gate"
);
assertIncludes("features/ai/validators.ts", validators, "missing-import", "quality gate checks missing imports");
assertIncludes("features/ai/validators.ts", validators, "named-export-missing", "quality gate checks named exports");
assertIncludes("features/ai/validators.ts", validators, "unguarded-array-method", "quality gate checks array receivers");
assertIncludes("features/ai/validators.ts", validators, "missing-css-class", "quality gate checks CSS classes");

assertIncludes("components/workspace/ChatPanel.tsx", chatPanel, "runPatchGate", "ChatPanel runs pre-apply gate");
assertIncludes("components/workspace/ChatPanel.tsx", chatPanel, "hasFirstRenderRisk", "QA fast path blocks first-render risks");
assertIncludes("components/workspace/ChatPanel.tsx", chatPanel, "runRuntimeErrorFixPipeline", "runtime errors use staged fix pipeline");

assertIncludes("app/api/ai/chat/route.ts", route, '"error-investigate"', "API exposes error investigation mode");
assertIncludes("app/api/ai/chat/route.ts", route, '"error-plan"', "API exposes error planning mode");
assertIncludes("app/api/ai/chat/route.ts", route, '"error-review"', "API exposes error review mode");
assertIncludes("app/api/ai/chat/route.ts", route, '"qa"', "API exposes QA mode");

assertIncludes(
  "features/ai/nutrient-docs-context.ts",
  docsContext,
  "@nutrient-sdk/document-engine-mcp-server",
  "Nutrient docs include Document Engine MCP"
);
assertIncludes(
  "features/ai/nutrient-docs-context.ts",
  docsContext,
  "@nutrient-sdk/dws-mcp-server",
  "Nutrient docs include DWS MCP"
);
assertIncludes(
  "features/ai/nutrient-docs-context.ts",
  docsContext,
  "Generated React/Vite browser apps must NOT import or start MCP servers",
  "MCP boundary protects browser preview"
);

assertIncludes("NUTRIENTWEBBUILDER.md", memory, "Repository Intelligence Layer", "builder memory documents repository intelligence");
assertIncludes("NutrientCodingAgent.md", agentDoc, "Repository intelligence context", "agent doc documents repository intelligence");

const baseUrlArg = process.argv.find((arg) => arg.startsWith("--base-url="));
const baseUrl = baseUrlArg?.slice("--base-url=".length) || process.env.SMOKE_BASE_URL;
if (baseUrl) {
  await checkHttp(baseUrl.replace(/\/$/, ""));
} else {
  pass("local HTTP smoke skipped", "set SMOKE_BASE_URL or pass --base-url=http://localhost:3000");
}

const failed = checks.filter((check) => check.status === "fail");
for (const check of checks) {
  const mark = check.status === "pass" ? "PASS" : "FAIL";
  console.log(`${mark} ${check.name}${check.detail ? ` — ${check.detail}` : ""}`);
}

console.log("");
console.log("Smoke mode: no Anthropic calls, no project generation, no full-build pipeline.");

if (failed.length) {
  console.error(`\n${failed.length} smoke check(s) failed.`);
  process.exit(1);
}

console.log(`\n${checks.length} smoke checks passed.`);
