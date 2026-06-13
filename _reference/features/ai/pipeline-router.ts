export type PipelineType = "light" | "full-build" | "deep";

export function normalizePipelineType(value: unknown): PipelineType {
  if (value === "deep" || value === "nucode") return "deep";
  if (value === "full-build") return "full-build";
  return "light";
}

export interface PipelineDecision {
  pipeline: PipelineType;
  reason: string;
}

export function buildClassifyPrompt(
  message: string,
  hasExistingProject: boolean,
  hasActiveErrors: boolean,
  fileTree: string
): string {
  return `You are a routing classifier for Nutrient Demo Studio, an AI app builder. Return ONLY a JSON object.

User request: "${message}"
Project has existing code: ${hasExistingProject}
Active runtime errors: ${hasActiveErrors}
Files: ${fileTree || "none"}

Pick exactly ONE pipeline:
- "light" — BUILD or EDIT the app. Default for almost everything: new apps, edits, fixes, "add X", "change Y", "build a ...", error fixes, iterative changes. Use this 90% of the time.
- "full-build" — Full, the parent/advanced version of Light. Use rarely, only when the user explicitly asks to rebuild the entire app from scratch or describes a very complex empty-project build.
- "deep" — Deep: Light-style focused coding with heavy Nutrient docs. Use when the user asks deep Nutrient product questions OR requests precise SDK/tooling changes. Examples: "how does redaction work?", "customize the toolbar dropdowns", "add a custom toolbar button", "build an annotation tool with custom stamps", "which SDK for mobile?".

Return: {"pipeline":"...","reason":"one sentence"}`;
}
