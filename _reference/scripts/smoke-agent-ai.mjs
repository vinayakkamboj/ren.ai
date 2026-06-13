import fs from "node:fs";
import path from "node:path";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

const root = process.cwd();
const envPath = path.join(root, ".env.local");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split("\n")) {
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

function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`No JSON object found in response: ${text.slice(0, 300)}`);
  return JSON.parse(match[0]);
}

loadEnvFile(envPath);

assert(process.env.ANTHROPIC_API_KEY, "ANTHROPIC_API_KEY missing. Cannot run AI smoke.");

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const fastModel = process.env.ANTHROPIC_FAST_MODEL || "claude-haiku-4-5-20251001";

console.log("AI smoke mode: tiny classifier/chat probes only. No full-build, no file patches, no workspace mutation.");

const classifierPrompt = `You are the pipeline classifier for Nutrient Demo Studio.
Return ONLY JSON with keys pipeline and reason.
Allowed pipelines: chat, full-build, iterative, sdk-focused, error-fix, generic.

Rules:
- Questions with no requested code change must be chat.
- Do not choose full-build unless the user asks to build/create/rebuild an app.

User message: "what does this agent do?"
Existing project: true
Active runtime errors: false
File tree: NUTRIENTWEBBUILDER.md, src/App.tsx, src/index.css`;

const classifierResult = await generateText({
  model: anthropic(fastModel),
  messages: [{ role: "user", content: classifierPrompt }],
  maxTokens: 80,
});

const classifierJson = extractJson(classifierResult.text);
assert(classifierJson.pipeline === "chat", `Expected chat pipeline, got ${classifierResult.text}`);
assert(classifierJson.pipeline !== "full-build", "Classifier selected full-build for a question.");
console.log(`PASS classifier tiny probe -> ${classifierJson.pipeline}`);

const chatResult = await generateText({
  model: anthropic(fastModel),
  messages: [
    {
      role: "system",
      content:
        "You are the Nutrient Coding Agent in CHAT mode. Do not write code. Do not emit <file_edits> or <file_patches>. Answer in one sentence.",
    },
    {
      role: "user",
      content:
        "In one sentence, explain why repository intelligence helps runtime bug fixes. Do not suggest code.",
    },
  ],
  maxTokens: 100,
});

assert(!/<file_patches>|<file_edits>|<project_plan>/i.test(chatResult.text), "Chat-mode probe emitted a code protocol block.");
assert(!/build a full app|full-build/i.test(chatResult.text), "Chat-mode probe drifted into full-build language.");
console.log(`PASS chat tiny probe -> ${chatResult.text.trim().replace(/\s+/g, " ")}`);

console.log("PASS AI agent smoke completed without full-build pipeline.");
