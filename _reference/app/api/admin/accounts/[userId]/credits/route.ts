import { verifyAdmin } from "@/lib/admin/verify";

import { createAdminClient, isAdminServiceAvailable } from "@/lib/supabase/admin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const admin = await verifyAdmin();
  if (!admin) return new Response("Forbidden", { status: 403 });
  if (!isAdminServiceAvailable()) return Response.json({ error: "Service key not configured" }, { status: 503 });

  const { userId } = await params;
  const adminClient = createAdminClient();

  const [creditsRes, usageRes] = await Promise.all([
    adminClient.from("user_credits").select("credit_limit").eq("user_id", userId).maybeSingle(),
    adminClient.from("token_usage").select("total_tokens").eq("user_id", userId),
  ]);

  const creditLimit = creditsRes.data?.credit_limit ?? 0;
  const tokensUsed = (usageRes.data ?? []).reduce((s: number, r: { total_tokens: number }) => s + r.total_tokens, 0);

  return Response.json({ creditLimit, tokensUsed });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const admin = await verifyAdmin();
  if (!admin) return new Response("Forbidden", { status: 403 });
  if (!isAdminServiceAvailable()) return Response.json({ error: "Service key not configured" }, { status: 503 });

  const { userId } = await params;
  const { creditLimit } = await req.json() as { creditLimit: number };

  if (typeof creditLimit !== "number" || creditLimit < 0) {
    return Response.json({ error: "Invalid credit limit value" }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient.from("user_credits").upsert(
    { user_id: userId, credit_limit: Math.floor(creditLimit) },
    { onConflict: "user_id" }
  );

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true, creditLimit: Math.floor(creditLimit) });
}
