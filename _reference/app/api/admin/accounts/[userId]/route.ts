import { verifyAdmin } from "@/lib/admin/verify";

import { createAdminClient, isAdminServiceAvailable } from "@/lib/supabase/admin";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const admin = await verifyAdmin();
  if (!admin) return new Response("Forbidden", { status: 403 });

  if (!isAdminServiceAvailable()) {
    return Response.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not configured." }, { status: 503 });
  }

  const { userId } = await params;

  if (userId === admin.id) {
    return Response.json({ error: "Cannot delete your own account." }, { status: 400 });
  }

  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) throw error;
    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
