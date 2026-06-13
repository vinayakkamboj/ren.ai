import { NextResponse } from "next/server";
import { createOptionalClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/auth/email";
import type { AIMessage } from "@/types";

async function getAuthedUser(supabase: NonNullable<Awaited<ReturnType<typeof createOptionalClient>>>) {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

async function verifyWorkspaceOwner(
  supabase: NonNullable<Awaited<ReturnType<typeof createOptionalClient>>>,
  workspaceId: string,
  userId: string
) {
  const { data } = await supabase
    .from("workspaces")
    .select("id")
    .eq("id", workspaceId)
    .eq("user_id", userId)
    .single();
  return !!data;
}

export async function GET(req: Request) {
  const supabase = await createOptionalClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const user = await getAuthedUser(supabase);
  if (!user || !isAllowedEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");
  if (!workspaceId) return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 });

  const owned = await verifyWorkspaceOwner(supabase, workspaceId, user.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data } = await supabase
    .from("ai_sessions")
    .select("messages")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ messages: (data?.messages as AIMessage[]) ?? [] });
}

export async function PATCH(req: Request) {
  const supabase = await createOptionalClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const user = await getAuthedUser(supabase);
  if (!user || !isAllowedEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId, messages } = (await req.json()) as {
    workspaceId: string;
    messages: AIMessage[];
  };

  if (!workspaceId || !Array.isArray(messages)) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const owned = await verifyWorkspaceOwner(supabase, workspaceId, user.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Check if a session already exists for this workspace
  const { data: existing } = await supabase
    .from("ai_sessions")
    .select("id")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const { error } = existing
    ? await supabase
        .from("ai_sessions")
        .update({ messages, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
    : await supabase
        .from("ai_sessions")
        .insert({ workspace_id: workspaceId, messages });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
