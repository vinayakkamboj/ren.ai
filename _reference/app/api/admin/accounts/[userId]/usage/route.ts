import { verifyAdmin } from "@/lib/admin/verify";

import { createAdminClient, isAdminServiceAvailable } from "@/lib/supabase/admin";

export type Period = "hour" | "day" | "week" | "month" | "all";

interface UsageRow {
  period: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  requests: number;
}

type RawRow = { created_at: string; input_tokens: number; output_tokens: number; total_tokens: number };

function groupByPeriod(rows: RawRow[], period: Period): UsageRow[] {
  const buckets: Record<string, UsageRow> = {};

  for (const row of rows) {
    const d = new Date(row.created_at);
    let key: string;

    if (period === "hour") {
      // Single bucket - last hour total
      key = "Last hour";
    } else if (period === "day") {
      // Group by hour: "HH:00"
      const h = d.getUTCHours().toString().padStart(2, "0");
      const dateStr = d.toISOString().slice(0, 10);
      key = `${dateStr} ${h}:00`;
    } else if (period === "week") {
      // Group by day: "YYYY-MM-DD"
      key = d.toISOString().slice(0, 10);
    } else if (period === "month") {
      // Group by day: "YYYY-MM-DD"
      key = d.toISOString().slice(0, 10);
    } else {
      // all - group by month: "YYYY-MM"
      key = d.toISOString().slice(0, 7);
    }

    if (!buckets[key]) {
      buckets[key] = { period: key, input_tokens: 0, output_tokens: 0, total_tokens: 0, requests: 0 };
    }
    buckets[key].input_tokens += row.input_tokens;
    buckets[key].output_tokens += row.output_tokens;
    buckets[key].total_tokens += row.total_tokens;
    buckets[key].requests += 1;
  }

  return Object.values(buckets).sort((a, b) => b.period.localeCompare(a.period));
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const admin = await verifyAdmin();
  if (!admin) return new Response("Forbidden", { status: 403 });

  if (!isAdminServiceAvailable()) {
    return Response.json({ error: "SUPABASE_SECRET_KEY is not configured." }, { status: 503 });
  }

  const { userId } = await params;
  const { searchParams } = new URL(req.url);
  const period = (searchParams.get("period") ?? "all") as Period;

  const now = new Date();
  let since: Date | null = null;

  if (period === "hour") {
    since = new Date(now.getTime() - 60 * 60 * 1000);
  } else if (period === "day") {
    since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  } else if (period === "week") {
    since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (period === "month") {
    since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  try {
    const adminClient = createAdminClient();
    let query = adminClient
      .from("token_usage")
      .select("created_at, input_tokens, output_tokens, total_tokens")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (since) {
      query = query.gte("created_at", since.toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;

    const rows = data ?? [];
    const usage = groupByPeriod(rows, period);

    const summary = {
      total_tokens: rows.reduce((s, r) => s + r.total_tokens, 0),
      input_tokens: rows.reduce((s, r) => s + r.input_tokens, 0),
      output_tokens: rows.reduce((s, r) => s + r.output_tokens, 0),
      requests: rows.length,
    };

    return Response.json({ usage, summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
