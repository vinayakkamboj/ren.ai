import { verifyAdminRequest } from "@/lib/admin/verify";

import { createAdminClient, isAdminServiceAvailable } from "@/lib/supabase/admin";

export async function GET() {
  const admin = await verifyAdminRequest();
  if (!admin.ok) return Response.json({ error: admin.message }, { status: admin.status });

  if (!isAdminServiceAvailable()) {
    return Response.json({ error: "Service role key not configured." }, { status: 503 });
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("user_approvals")
    .select("user_id, email, status, requested_at")
    .eq("status", "pending")
    .order("requested_at", { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ pending: data ?? [], count: (data ?? []).length });
}
