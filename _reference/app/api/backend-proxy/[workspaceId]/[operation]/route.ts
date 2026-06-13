import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createOptionalClient } from "@/lib/supabase/server";
import { createAdminClient, isAdminServiceAvailable } from "@/lib/supabase/admin";
import type { BackendConfig } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 120;

// Backend operations are credit-gated against the same user_credits pool as AI
// usage. One backend credit counts as 1000 tokens toward the limit.
const OPERATION_CREDITS: Record<string, number> = {
  convert: 2,
  ocr: 5,
  extract: 3,
  redact: 4,
  watermark: 1,
};

const CREDIT_TOKEN_WEIGHT = 1000;

// The preview iframe (Sandpack) and downloaded repos call this route
// cross-origin with the workspace demo token — CORS must allow that.
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
};

function corsJson(body: unknown, status: number): NextResponse {
  return NextResponse.json(body, { status, headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

interface AuthResult {
  userId: string;
  workspaceConfig: Record<string, unknown>;
}

/** Authenticate via workspace demo token (Bearer ndk_...) or session cookie. */
async function authenticate(req: NextRequest, workspaceId: string): Promise<AuthResult | NextResponse> {
  const admin = createAdminClient();
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();

  if (bearer?.startsWith("ndk_")) {
    const { data: tokenRow } = await admin
      .from("backend_tokens")
      .select("user_id, workspace_id, expires_at")
      .eq("token_hash", hashToken(bearer))
      .maybeSingle();
    if (!tokenRow || tokenRow.workspace_id !== workspaceId) {
      return corsJson({ error: "Invalid backend token." }, 401);
    }
    if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
      return corsJson({ error: "Backend token expired. Regenerate it in workspace settings." }, 401);
    }
    const { data: ws } = await admin
      .from("workspaces")
      .select("config")
      .eq("id", workspaceId)
      .maybeSingle();
    if (!ws) return corsJson({ error: "Workspace not found." }, 404);
    return { userId: tokenRow.user_id, workspaceConfig: ws.config ?? {} };
  }

  // Same-origin session cookie path
  const supabase = await createOptionalClient();
  if (!supabase) return corsJson({ error: "Supabase not configured." }, 503);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return corsJson({ error: "Unauthorized." }, 401);

  const { data: ws } = await admin
    .from("workspaces")
    .select("user_id, config")
    .eq("id", workspaceId)
    .maybeSingle();
  if (!ws) return corsJson({ error: "Workspace not found." }, 404);
  if (ws.user_id !== user.id) return corsJson({ error: "Workspace not owned by you." }, 403);
  return { userId: user.id, workspaceConfig: ws.config ?? {} };
}

async function checkCredits(userId: string): Promise<NextResponse | null> {
  const admin = createAdminClient();
  const [creditsRes, tokenUsageRes, backendUsageRes] = await Promise.all([
    admin.from("user_credits").select("credit_limit").eq("user_id", userId).maybeSingle(),
    admin.from("token_usage").select("total_tokens").eq("user_id", userId),
    admin.from("backend_requests").select("credits_used").eq("user_id", userId),
  ]);
  const limit = creditsRes.data?.credit_limit ?? 0;
  if (limit <= 0) return null; // no limit configured
  const tokensUsed = (tokenUsageRes.data ?? []).reduce((s, r) => s + (r.total_tokens ?? 0), 0);
  const backendTokensEquivalent = (backendUsageRes.data ?? []).reduce(
    (s, r) => s + (r.credits_used ?? 0) * CREDIT_TOKEN_WEIGHT,
    0
  );
  if (tokensUsed + backendTokensEquivalent >= limit) {
    return corsJson(
      { error: `You've reached your usage limit (${(limit / 1000).toFixed(0)}K). Contact your admin to increase it.` },
      402
    );
  }
  return null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; operation: string }> }
) {
  const { workspaceId, operation } = await params;

  if (!(operation in OPERATION_CREDITS)) {
    return corsJson({ error: `Unknown operation '${operation}'.` }, 400);
  }
  if (!isAdminServiceAvailable()) {
    return corsJson({ error: "Backend service is not configured (missing Supabase secret key)." }, 503);
  }

  const auth = await authenticate(req, workspaceId);
  if (auth instanceof NextResponse) return auth;

  const creditError = await checkCredits(auth.userId);
  if (creditError) return creditError;

  // Resolve target: the user's own backend (custom mode) or the managed sidecar.
  const backendConfig = (auth.workspaceConfig as { backend?: BackendConfig | null }).backend;
  let targetBase: string;
  const forwardHeaders: Record<string, string> = {};
  const isManaged = backendConfig?.mode !== "custom" || !backendConfig.customBackendUrl;

  if (isManaged) {
    const sidecarUrl = process.env.BACKEND_SIDECAR_URL;
    const sharedSecret = process.env.BACKEND_SHARED_SECRET;
    if (!sidecarUrl || !sharedSecret) {
      return corsJson(
        { error: "Managed backend is not configured yet (BACKEND_SIDECAR_URL / BACKEND_SHARED_SECRET missing)." },
        503
      );
    }
    targetBase = sidecarUrl;
    forwardHeaders["X-Backend-Secret"] = sharedSecret;
  } else {
    targetBase = backendConfig!.customBackendUrl!;
  }

  const startedAt = Date.now();
  const formData = await req.formData();
  const inputFile = formData.get("file");
  const inputBytes = inputFile instanceof File ? inputFile.size : 0;
  const credits = isManaged ? OPERATION_CREDITS[operation] : 0;
  const admin = createAdminClient();

  async function logRequest(status: "success" | "error", outputBytes: number, errorMsg?: string) {
    try {
      await admin.from("backend_requests").insert({
        workspace_id: workspaceId,
        user_id: auth instanceof NextResponse ? null : auth.userId,
        operation,
        input_bytes: inputBytes,
        output_bytes: outputBytes,
        credits_used: status === "success" ? credits : 0,
        duration_ms: Date.now() - startedAt,
        status,
        error_msg: errorMsg ?? null,
      });
    } catch {
      // logging must never fail the request
    }
  }

  try {
    const upstream = await fetch(`${targetBase.replace(/\/$/, "")}/${operation}`, {
      method: "POST",
      headers: forwardHeaders,
      body: formData,
      signal: AbortSignal.timeout(110_000),
    });

    const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
    const body = await upstream.arrayBuffer();
    await logRequest(upstream.ok ? "success" : "error", body.byteLength, upstream.ok ? undefined : `upstream ${upstream.status}`);

    return new NextResponse(body, {
      status: upstream.status,
      headers: { ...CORS_HEADERS, "Content-Type": contentType },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logRequest("error", 0, message.slice(0, 500));
    return corsJson({ error: `Backend request failed: ${message}` }, 502);
  }
}
