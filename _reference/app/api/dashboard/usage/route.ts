import { createOptionalClient } from "@/lib/supabase/server";

type Period = "monthly" | "weekly";

interface UsageRow {
  period: string;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  requests: number;
}

export async function GET(req: Request) {
  const supabase = await createOptionalClient();
  if (!supabase) return Response.json({ error: "Not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const period = (searchParams.get("period") ?? "monthly") as Period;

  // Fetch last 6 months or 12 weeks of data
  const since = new Date();
  if (period === "monthly") since.setMonth(since.getMonth() - 6);
  else since.setDate(since.getDate() - 12 * 7);

  const [creditsRes, usageRes] = await Promise.all([
    supabase.from("user_credits").select("credit_limit").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("token_usage")
      .select("created_at, total_tokens, input_tokens, output_tokens")
      .eq("user_id", user.id)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false }),
  ]);

  const creditLimit = creditsRes.data?.credit_limit ?? 0;
  const rows = usageRes.data ?? [];

  // Group by period
  const buckets: Record<string, UsageRow> = {};
  for (const row of rows) {
    const d = new Date(row.created_at);
    let key: string;
    if (period === "monthly") {
      key = d.toISOString().slice(0, 7); // YYYY-MM
    } else {
      // Week starting Monday
      const day = d.getUTCDay();
      const diff = (day === 0 ? -6 : 1) - day;
      const mon = new Date(d);
      mon.setUTCDate(d.getUTCDate() + diff);
      key = mon.toISOString().slice(0, 10);
    }
    if (!buckets[key]) buckets[key] = { period: key, total_tokens: 0, input_tokens: 0, output_tokens: 0, requests: 0 };
    buckets[key].total_tokens += row.total_tokens;
    buckets[key].input_tokens += row.input_tokens;
    buckets[key].output_tokens += row.output_tokens;
    buckets[key].requests += 1;
  }

  const breakdown = Object.values(buckets).sort((a, b) => b.period.localeCompare(a.period));

  // All-time total
  const { data: allRows } = await supabase
    .from("token_usage")
    .select("total_tokens")
    .eq("user_id", user.id);
  const tokensUsed = (allRows ?? []).reduce((s, r) => s + r.total_tokens, 0);

  return Response.json({ tokensUsed, creditLimit, breakdown, period });
}
