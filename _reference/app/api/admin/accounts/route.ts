import { verifyAdmin } from "@/lib/admin/verify";

import { createAdminClient, isAdminServiceAvailable } from "@/lib/supabase/admin";
import { isAllowedEmail } from "@/lib/auth/email";

export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) return new Response("Forbidden", { status: 403 });

  if (!isAdminServiceAvailable()) {
    return Response.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not configured." }, { status: 503 });
  }

  try {
    const adminClient = createAdminClient();

    // Fetch all auth users
    const { data: usersData, error: usersError } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    if (usersError) throw usersError;

    const users = usersData.users.filter((u) => isAllowedEmail(u.email));

    // Fetch workspace counts per user
    const { data: workspaceCounts } = await adminClient
      .from("workspaces")
      .select("user_id")
      .in("user_id", users.map((u) => u.id));

    const wsCounts: Record<string, number> = {};
    for (const row of workspaceCounts ?? []) {
      wsCounts[row.user_id] = (wsCounts[row.user_id] ?? 0) + 1;
    }

    // Fetch total tokens per user
    const { data: tokenTotals } = await adminClient
      .from("token_usage")
      .select("user_id, total_tokens")
      .in("user_id", users.map((u) => u.id));

    const tokensByUser: Record<string, number> = {};
    for (const row of tokenTotals ?? []) {
      tokensByUser[row.user_id] = (tokensByUser[row.user_id] ?? 0) + row.total_tokens;
    }

    const result = users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      workspace_count: wsCounts[u.id] ?? 0,
      total_tokens: tokensByUser[u.id] ?? 0,
    }));

    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return Response.json({ users: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
