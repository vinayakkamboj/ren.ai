import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT =
  "You are Ren, a reasoning-focused assistant built by Ren AI. " +
  "Be precise and concise. State uncertainty honestly: when you do not know, " +
  "say so rather than guessing. Prefer verifiable claims over impressive ones.";

/**
 * Streams chat completions from any OpenAI-compatible inference server.
 *
 * Configure via environment:
 *   INFERENCE_BASE_URL   e.g. http://localhost:8080/v1  (mlx_lm.server, vLLM, …)
 *   INFERENCE_MODEL_ID   served model id (default "astra")
 *   INFERENCE_API_KEY    optional bearer token for hosted endpoints
 *
 * Returns 503 when no backend is configured — the playground falls back to
 * its pre-composed demo responses.
 */
export async function POST(req: NextRequest) {
  const base = process.env.INFERENCE_BASE_URL;
  const model = process.env.INFERENCE_MODEL_ID ?? "astra";

  if (!base) {
    return Response.json({ error: "inference_not_configured" }, { status: 503 });
  }

  let messages: ChatMessage[];
  try {
    const body = (await req.json()) as { messages?: ChatMessage[] };
    if (
      !Array.isArray(body.messages) ||
      body.messages.length === 0 ||
      body.messages.some(
        (m) =>
          typeof m?.content !== "string" ||
          (m.role !== "user" && m.role !== "assistant"),
      )
    ) {
      throw new Error("invalid");
    }
    messages = body.messages;
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const upstream = await fetch(`${base.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.INFERENCE_API_KEY
        ? { Authorization: `Bearer ${process.env.INFERENCE_API_KEY}` }
        : {}),
    },
    body: JSON.stringify({
      model,
      stream: true,
      temperature: 0.7,
      max_tokens: 2048,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        // Bound history so a long session can't blow the context budget.
        ...messages.slice(-24),
      ],
    }),
  }).catch(() => null);

  if (!upstream || !upstream.ok || !upstream.body) {
    return Response.json({ error: "inference_unreachable" }, { status: 502 });
  }

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  // Re-emit upstream SSE deltas as a plain text stream.
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
          if (payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload) as {
              choices?: { delta?: { content?: string } }[];
            };
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) controller.enqueue(encoder.encode(delta));
          } catch {
            // Partial JSON across chunk boundary — wait for the rest.
          }
        }
      },
    }),
  );

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "x-ren-model": model,
    },
  });
}
