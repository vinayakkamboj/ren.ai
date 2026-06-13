import { NextResponse, type NextRequest } from "next/server";
import { createOptionalClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Server-side connectivity test for a custom (BYO) backend URL — avoids
 *  browser CORS issues when testing from workspace settings. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workspaceId } = await params;
  const supabase = await createOptionalClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured." }, { status: 503 });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { data: ws } = await supabase
    .from("workspaces")
    .select("user_id")
    .eq("id", workspaceId)
    .maybeSingle();
  if (!ws || ws.user_id !== user.id) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }

  const url = req.nextUrl.searchParams.get("url");
  if (!url || !/^https?:\/\//.test(url)) {
    return NextResponse.json({ ok: false, error: "Provide a valid http(s) backend URL." }, { status: 400 });
  }

  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    return NextResponse.json({ ok: res.ok, status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message });
  }
}
