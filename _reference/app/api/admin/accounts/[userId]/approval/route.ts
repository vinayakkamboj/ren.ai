import { verifyAdmin } from "@/lib/admin/verify";
import { createAdminClient, isAdminServiceAvailable } from "@/lib/supabase/admin";

// DELETE - removes both the user_approvals record AND the auth account so the
// person can sign up fresh with the same email (and a new password if they want).
export async function DELETE(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const admin = await verifyAdmin();
  if (!admin) return new Response("Forbidden", { status: 403 });

  if (!isAdminServiceAvailable()) {
    return Response.json({ error: "Service role key not configured." }, { status: 503 });
  }

  const { userId } = await params;

  if (userId === admin.id) {
    return Response.json({ error: "Cannot delete your own account." }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // Delete approval record first (non-fatal if it doesn't exist)
  await adminClient.from("user_approvals").delete().eq("user_id", userId);

  // Delete the auth user so they can re-register with the same email
  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true });
}
