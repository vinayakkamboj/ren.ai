/**
 * POST /api/builder
 *
 * The core build endpoint. Takes the chat history, the current project files,
 * and the selected model tier; assembles a grounded system prompt + context
 * pack (repository intelligence); and streams the model's response back as a
 * plain-text stream. The client parses the trailing <file_patches> block and
 * applies it to the workspace.
 *
 * Requires ANTHROPIC_API_KEY. Returns 503 when unconfigured so the UI can show
 * a clear "connect a key" state instead of failing silently.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { resolveModelTier } from "@/lib/builder/model-tiers";
import { buildContextPack } from "@/lib/builder/context";
import {
  buildNewProjectPrompt,
  buildEditPrompt,
  buildRepairPrompt,
} from "@/lib/builder/prompts";
import type { ProjectFile } from "@/lib/builder/types";

interface BuildRequest {
  messages: { role: "user" | "assistant"; content: string }[];
  projectFiles: ProjectFile[];
  modelTier?: string;
  isFirstBuild?: boolean;
  recentlyChanged?: string[];
  errorPaths?: string[];
  repairIssues?: string;
}

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MAX_OUTPUT_TOKENS = 16_000;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "builder_not_configured" }, { status: 503 });
  }

  let body: BuildRequest;
  try {
    body = (await req.json()) as BuildRequest;
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      throw new Error("invalid");
    }
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const tier = resolveModelTier(body.modelTier);
  const files = Array.isArray(body.projectFiles) ? body.projectFiles : [];

  // The latest user message drives the relevance scoring for the context pack.
  const lastUser = [...body.messages].reverse().find((m) => m.role === "user");
  const contextPack = buildContextPack(files, lastUser?.content ?? "", {
    recentlyChanged: body.recentlyChanged,
    errorPaths: body.errorPaths,
  });

  const system = body.repairIssues
    ? buildRepairPrompt(body.repairIssues)
    : body.isFirstBuild
      ? buildNewProjectPrompt()
      : buildEditPrompt();

  // Inject the context pack as a leading assistant-visible block on the final
  // user turn so the model always sees current project state.
  const apiMessages = body.messages.map((m, idx) => {
    if (idx === body.messages.length - 1 && m.role === "user") {
      return {
        role: "user" as const,
        content: `${contextPack}\n\n---\n\n## Request\n${m.content}`,
      };
    }
    return { role: m.role, content: m.content };
  });

  const upstream = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: tier.modelId,
      max_tokens: MAX_OUTPUT_TOKENS,
      system,
      messages: apiMessages.slice(-16),
      stream: true,
    }),
  }).catch(() => null);

  if (!upstream || !upstream.ok || !upstream.body) {
    const detail = upstream ? await upstream.text().catch(() => "") : "";
    return Response.json(
      { error: "upstream_error", detail: detail.slice(0, 500) },
      { status: 502 },
    );
  }

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  const stream = upstream.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const data = line.trim();
          if (!data.startsWith("data:")) continue;
          const payload = data.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload) as {
              type?: string;
              delta?: { type?: string; text?: string };
            };
            if (
              json.type === "content_block_delta" &&
              json.delta?.type === "text_delta" &&
              json.delta.text
            ) {
              controller.enqueue(encoder.encode(json.delta.text));
            }
          } catch {
            // Partial JSON across a chunk boundary — wait for the rest.
          }
        }
      },
    }),
  );

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "x-ren-tier": tier.id,
    },
  });
}
