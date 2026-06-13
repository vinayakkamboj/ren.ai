import { createAnthropic } from "@ai-sdk/anthropic";
import { streamText, generateText } from "ai";
import { createOptionalClient } from "@/lib/supabase/server";
import { SUPABASE_SETUP_MESSAGE } from "@/lib/supabase/env";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ALLOWED_EMAIL_MESSAGE, isAllowedEmail } from "@/lib/auth/email";
import { getTemplateById } from "@/features/templates/registry";
import {
  buildStaticInstructions,
  buildProjectContext,
  buildPlanningPrompt,
  buildLightPlanPrompt,
  buildDesignSpecPrompt,
  buildNutrientDocsSystemPrompt,
  buildExpertSystemPrompt,
  buildExpertUserMessage,
} from "@/features/ai/prompts";
import { buildRequestSpecificInstruction } from "@/features/ai/request-intent";
import { buildNutrientDocsContext } from "@/features/ai/nutrient-docs-context";
import { fetchNutrientLiveDocs } from "@/features/ai/live-docs-fetcher";
import { buildClassifyPrompt, normalizePipelineType } from "@/features/ai/pipeline-router";
import { DEFAULT_SKILL_MODE, buildSkillModeContext } from "@/features/ai/skill-modes";
import { resolveModelTier } from "@/features/ai/model-registry";
import type { AIPatchPlan, ProjectFile } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 120;

interface ChatRequest {
  message: string;
  workspaceId: string;
  templateId: string;
  projectFiles: ProjectFile[];
  messageHistory: Array<{ role: string; content: string }>;
  mode?: "plan" | "design" | "classify" | "ask" | "deep" | "nucode";
  plan?: string;
  designNote?: string;
  runtimeErrors?: string[];
  hasExistingProject?: boolean;
  investigation?: string;
  fixPlan?: string;
  candidatePatchPlan?: AIPatchPlan | null;
  recentChangedPaths?: string[];
  contextOverrides?: Record<string, string>;
  pipelineType?: string;
  // Nucode model tier (spark/flow/forge/apex) — applies to build/deep phases only
  modelTier?: string;
}

async function logTokenUsage(
  supabase: SupabaseClient,
  params: {
    userId: string;
    workspaceId: string;
    model: string;
    mode: string;
    pipelineType: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  }
) {
  try {
    await supabase.from("token_usage").insert({
      user_id: params.userId,
      workspace_id: params.workspaceId || null,
      model: params.model,
      mode: params.mode,
      pipeline_type: params.pipelineType,
      input_tokens: params.inputTokens,
      output_tokens: params.outputTokens,
      total_tokens: params.totalTokens,
    });
  } catch {
    // Non-critical - don't fail the request if logging fails
  }
}

function withContextOverride(base: string, override: string | undefined): string {
  if (!override?.trim()) return base;
  return `${base}\n\n## Admin Context Notes\n\n${override.trim()}`;
}

function withSkillModeContext(base: string, skillContext: string): string {
  if (!skillContext.trim()) return base;
  return `${base}\n\n${skillContext.trim()}`;
}

// Heavy code-generation model for build/deep. The user-selected Nucode tier
// wins; ANTHROPIC_MODEL env var acts as an ops override only when no tier is
// sent; otherwise falls back to the registry default (Nucode Flow).
function getAgentModel(tierId?: string): string {
  if (tierId) return resolveModelTier(tierId).anthropicModelId;
  return process.env.ANTHROPIC_MODEL || resolveModelTier(undefined).anthropicModelId;
}

function getFastAgentModel(): string {
  return process.env.ANTHROPIC_FAST_MODEL || ["cl", "aude-haiku-4-5-20251001"].join("");
}

export async function POST(req: Request) {
  const supabase = await createOptionalClient();

  if (!supabase) {
    return Response.json({ error: SUPABASE_SETUP_MESSAGE }, { status: 503 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY is not configured." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!isAllowedEmail(user.email)) return Response.json({ error: ALLOWED_EMAIL_MESSAGE }, { status: 403 });

  const userId = user.id;

  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return Response.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const {
    message,
    workspaceId,
    templateId,
    projectFiles,
    messageHistory,
    mode,
    plan,
    designNote,
    runtimeErrors = [],
    hasExistingProject = false,
    investigation = "",
    fixPlan = "",
    candidatePatchPlan = null,
    recentChangedPaths = [],
    contextOverrides = {},
    pipelineType = "light",
    modelTier,
  } = body;

  const requestMode = mode === "nucode" ? "deep" : mode;
  const requestPipelineType = normalizePipelineType(pipelineType);

  if (!message || !templateId || !projectFiles || !messageHistory) {
    return Response.json({ error: "Missing required fields." }, { status: 400 });
  }

  const skillMode = buildSkillModeContext(message, DEFAULT_SKILL_MODE);
  const agentMessage = skillMode.cleanedMessage || message.trim();
  const skillContext = skillMode.context;

  // ── Credit limit check ────────────────────────────────────────────────────
  // Skip classify mode - it's cheap and needed to route the request
  if (requestMode !== "classify") {
    const [creditsRes, usageRes] = await Promise.all([
      supabase.from("user_credits").select("credit_limit").eq("user_id", userId).maybeSingle(),
      supabase.from("token_usage").select("total_tokens").eq("user_id", userId),
    ]);
    const limit = creditsRes.data?.credit_limit ?? 0;
    if (limit > 0) {
      const used = (usageRes.data ?? []).reduce((s, r) => s + r.total_tokens, 0);
      if (used >= limit) {
        return Response.json(
          { error: `You've reached your token limit (${(limit / 1000).toFixed(0)}K tokens). Contact your admin to increase it.` },
          { status: 402 }
        );
      }
    }
  }

  const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // ── Classify mode: Haiku picks the pipeline ────────────────────────────────
  if (requestMode === "classify") {
    const fileTree = projectFiles.map((f) => f.path).join(", ");
    const hasActiveErrors = runtimeErrors.some((e) => e.includes("Error") || e.includes("Uncaught"));
    const prompt = buildClassifyPrompt(agentMessage, hasExistingProject, hasActiveErrors, fileTree);
    try {
      const { text } = await generateText({
        model: anthropic(getFastAgentModel()),
        messages: [{ role: "user", content: prompt }],
        maxTokens: 150,
      });
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const decision = jsonMatch ? JSON.parse(jsonMatch[0]) : { pipeline: "light", reason: "fallback" };
      return Response.json({ ...decision, pipeline: normalizePipelineType(decision.pipeline) });
    } catch {
      return Response.json({ pipeline: "light", reason: "classification failed" });
    }
  }

  // ── Plan mode: roadmap via Haiku ───────────────────────────────────────────
  // Plan uses the fast model - it only produces a JSON spec, not code.
  // Heavy code generation (build/deep) runs on Fable 5 below.
  if (requestMode === "plan") {
    const planCtxKey = requestPipelineType === "full-build" ? "full.plan.extra" : "light.plan.extra";
    const basePlanPrompt = requestPipelineType === "light" || requestPipelineType === "full-build"
      ? buildLightPlanPrompt(agentMessage, projectFiles)
      : buildPlanningPrompt(agentMessage, projectFiles);
    const planContent = withContextOverride(withSkillModeContext(basePlanPrompt, skillContext), contextOverrides[planCtxKey]);
    const result = streamText({
      model: anthropic(getFastAgentModel()),
      messages: [{ role: "user" as const, content: planContent }],
      maxTokens: 3000,
      onFinish: ({ usage }) => {
        void logTokenUsage(supabase, {
          userId,
          workspaceId,
          model: getFastAgentModel(),
          mode: "plan",
          pipelineType: requestPipelineType,
          inputTokens: usage.promptTokens,
          outputTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
        });
      },
    });
    return result.toDataStreamResponse({
      getErrorMessage: (error) => error instanceof Error ? error.message : "Roadmap request failed.",
    });
  }

  // Design spec uses the fast model - outputs palette tokens + base styles only (~500 tokens).
  // `plan` is optional - if the plan phase failed or was skipped, fall back to an
  // empty string so the design spec can still run using just the user's message.
  if (requestMode === "design") {
    const designCtxKey = requestPipelineType === "full-build" ? "full.design.extra" : "light.design.extra";
    const designContent = withContextOverride(
      withSkillModeContext(buildDesignSpecPrompt(agentMessage, plan ?? "", projectFiles), skillContext),
      contextOverrides[designCtxKey]
    );
    const result = streamText({
      model: anthropic(getFastAgentModel()),
      messages: [{ role: "user" as const, content: designContent }],
      maxTokens: 1200,
      onFinish: ({ usage }) => {
        void logTokenUsage(supabase, {
          userId,
          workspaceId,
          model: getFastAgentModel(),
          mode: "design",
          pipelineType: requestPipelineType,
          inputTokens: usage.promptTokens,
          outputTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
        });
      },
    });
    return result.toDataStreamResponse({
      getErrorMessage: (error) => error instanceof Error ? error.message : "Design request failed.",
    });
  }

  // ── Ask mode: legacy Nutrient SDK Q&A (kept for backwards compat) ────────
  if (requestMode === "ask") {
    const result = streamText({
      model: anthropic(getFastAgentModel()),
      messages: [
        {
          role: "system" as const,
          content: buildNutrientDocsSystemPrompt(
            [buildNutrientDocsContext(), skillContext].filter(Boolean).join("\n\n")
          ),
          experimental_providerMetadata: { anthropic: { cacheControl: { type: "ephemeral" } } },
        },
        ...messageHistory
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user" as const, content: agentMessage },
      ],
      maxTokens: 2000,
      onFinish: ({ usage }) => {
        void logTokenUsage(supabase, {
          userId,
          workspaceId,
          model: getFastAgentModel(),
          mode: "ask",
          pipelineType: requestPipelineType,
          inputTokens: usage.promptTokens,
          outputTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
        });
      },
    });
    return result.toDataStreamResponse({
      getErrorMessage: (error) => error instanceof Error ? error.message : "Nutrient docs request failed.",
    });
  }

  // ── Deep mode: Light-style coding with heavy Nutrient docs (Fable 5) ───────
  if (requestMode === "deep") {
    const deepTemplate = getTemplateById(templateId);
    const deepStaticInstructions = deepTemplate ? buildStaticInstructions(deepTemplate) : "";

    // Fetch live llms.txt docs concurrently with prompt construction.
    // If all fetches fail we fall back to the static embedded context.
    const liveDocs = await fetchNutrientLiveDocs();
    const docsContext = [
      liveDocs ? `${liveDocs.context}\n\n---\n\n${buildNutrientDocsContext()}` : buildNutrientDocsContext(),
      skillContext,
    ].filter(Boolean).join("\n\n---\n\n");

    const deepSystemContent = buildExpertSystemPrompt(docsContext, deepStaticInstructions);
    const deepCtxOverride = contextOverrides["deep.build.extra"];
    const deepRequestInstruction = buildRequestSpecificInstruction(agentMessage);
    const deepMessageBase = [
      agentMessage,
      deepRequestInstruction ? `## Request-Specific Implementation Rules\n\n${deepRequestInstruction}` : "",
    ].filter(Boolean).join("\n\n");
    const deepMessage = deepCtxOverride?.trim() ? `${deepMessageBase}\n\n## Admin Context Notes\n\n${deepCtxOverride.trim()}` : deepMessageBase;
    const deepUserMessage = buildExpertUserMessage(deepMessage, projectFiles);
    const result = streamText({
      model: anthropic(getAgentModel(modelTier)),
      messages: [
        {
          role: "system" as const,
          content: deepSystemContent,
          experimental_providerMetadata: { anthropic: { cacheControl: { type: "ephemeral" } } },
        },
        ...messageHistory
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user" as const, content: deepUserMessage },
      ],
      maxTokens: 16000,
      onFinish: ({ usage }) => {
        void logTokenUsage(supabase, {
          userId,
          workspaceId,
          model: getAgentModel(modelTier),
          mode: "deep",
          pipelineType: requestPipelineType,
          inputTokens: usage.promptTokens,
          outputTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
        });
      },
    });
    return result.toDataStreamResponse({
      getErrorMessage: (error) => error instanceof Error ? error.message : "Deep request failed.",
    });
  }

  // ── Default build mode ────────────────────────────────────────────────────
  const template = getTemplateById(templateId);
  if (!template) return Response.json({ error: "Template not found." }, { status: 404 });
  const requestSpecificInstruction = buildRequestSpecificInstruction(agentMessage);
  const workspaceBuilderMemory = projectFiles.find((file) => file.path === "NUTRIENTWEBBUILDER.md")?.content?.trim();

  const staticSystemContent = [
    buildNutrientDocsContext(),
    skillContext,
    buildStaticInstructions(template),
  ].filter(Boolean).join("\n\n");

  const dynamicProjectContent = [
    workspaceBuilderMemory
      ? `## CURRENT WORKSPACE NUTRIENTWEBBUILDER.md - READ BEFORE EDITING AND UPDATE IN THIS RESPONSE\n\n${workspaceBuilderMemory}`
      : "## CURRENT WORKSPACE NUTRIENTWEBBUILDER.md\n\nNo workspace memory file is present yet. Create NUTRIENTWEBBUILDER.md in this response if you change any project files.",
    buildProjectContext(projectFiles, plan || undefined, designNote || undefined, agentMessage),
    requestSpecificInstruction,
  ].filter(Boolean).join("\n\n");

  const buildCtxKey = requestPipelineType === "full-build" ? "full.build.pass1.extra" : "light.build.extra";
  const buildCtxOverride = contextOverrides[buildCtxKey];
  const currentUserMessage = withContextOverride(`${dynamicProjectContent}\n\n## CURRENT REQUEST\n\n${agentMessage}`, buildCtxOverride);

  const result = streamText({
    model: anthropic(getAgentModel(modelTier)),
    messages: [
      {
        role: "system" as const,
        content: staticSystemContent,
        experimental_providerMetadata: { anthropic: { cacheControl: { type: "ephemeral" } } },
      },
      ...messageHistory
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: currentUserMessage },
    ],
    maxTokens: 24000,
    onFinish: ({ usage }) => {
      void logTokenUsage(supabase, {
        userId,
        workspaceId,
        model: getAgentModel(modelTier),
        mode: "build",
        pipelineType: requestPipelineType,
        inputTokens: usage.promptTokens,
        outputTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
      });
    },
  });

  return result.toDataStreamResponse({
    getErrorMessage: (error) => error instanceof Error ? error.message : "AI request failed.",
  });
}
