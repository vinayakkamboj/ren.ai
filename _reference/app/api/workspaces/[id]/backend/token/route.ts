import { createHash, randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createOptionalClient } from "@/lib/supabase/server";
import { createAdminClient, isAdminServiceAvailable } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const TOKEN_TTL_DAYS = 30;

async function requireOwnedWorkspace(workspaceId: string) {
  const supabase = await createOptionalClient();
  if (!supabase) return { error: NextResponse.json({ error: "Supabase not configured." }, { status: 503 }) };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };

  const { data: ws } = await supabase
    .from("workspaces")
    .select("id, user_id, config")
    .eq("id", workspaceId)
    .maybeSingle();
  if (!ws || ws.user_id !== user.id) {
    return { error: NextResponse.json({ error: "Workspace not found." }, { status: 404 }) };
  }
  return { user, workspace: ws, supabase };
}

/** Generate (or rotate) the workspace demo token. Returns the plaintext once;
 *  only the SHA-256 hash is stored for proxy validation. The plaintext is also
 *  written to config.backend.demoToken so the preview and ZIP export can use it. */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workspaceId } = await params;
  if (!isAdminServiceAvailable()) {
    return NextResponse.json({ error: "Backend tokens need the Supabase secret key configured." }, { status: 503 });
  }

  const ctx = await requireOwnedWorkspace(workspaceId);
  if ("error" in ctx) return ctx.error;

  const token = `ndk_${randomBytes(24).toString("hex")}`;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const admin = createAdminClient();
  const { error: upsertError } = await admin
    .from("backend_tokens")
    .upsert(
      {
        workspace_id: workspaceId,
        user_id: ctx.user.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id" }
    );
  if (upsertError) {
    return NextResponse.json({ error: `Could not store token: ${upsertError.message}` }, { status: 500 });
  }

  const config = (ctx.workspace.config ?? {}) as Record<string, unknown>;
  const backend = (config.backend ?? { mode: "managed" }) as Record<string, unknown>;
  const newConfig = {
    ...config,
    backend: { ...backend, demoToken: token, demoTokenExpiresAt: expiresAt },
  };
  await ctx.supabase.from("workspaces").update({ config: newConfig }).eq("id", workspaceId);

  return NextResponse.json({ token, expiresAt });
}
