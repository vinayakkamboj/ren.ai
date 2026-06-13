import { verifyAdmin } from "@/lib/admin/verify";

import { createAdminClient, isAdminServiceAvailable } from "@/lib/supabase/admin";

export async function POST(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const admin = await verifyAdmin();
  if (!admin) return new Response("Forbidden", { status: 403 });

  if (!isAdminServiceAvailable()) {
    return Response.json({ error: "Service role key not configured." }, { status: 503 });
  }

  const { userId } = await params;
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("user_approvals")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: admin.email,
    })
    .eq("user_id", userId);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true });
}
