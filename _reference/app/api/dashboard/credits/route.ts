import { createOptionalClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createOptionalClient();
  if (!supabase) return Response.json({ error: "Supabase not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const [creditsRes, usageRes] = await Promise.all([
    supabase.from("user_credits").select("credit_limit").eq("user_id", user.id).maybeSingle(),
    supabase.from("token_usage").select("total_tokens").eq("user_id", user.id),
  ]);

  const creditLimit = creditsRes.data?.credit_limit ?? 0;
  const tokensUsed = (usageRes.data ?? []).reduce((s, r) => s + r.total_tokens, 0);

  return Response.json({ tokensUsed, creditLimit });
}
