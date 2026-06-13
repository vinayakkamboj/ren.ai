import { NextResponse } from "next/server";
import { createOptionalClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createOptionalClient();
  if (!supabase) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { department?: string; role?: string };
  try {
    body = (await req.json()) as { department?: string; role?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { department, role } = body;
  if (!department || !role) {
    return NextResponse.json({ error: "Department and role are required." }, { status: 400 });
  }

  const { error } = await supabase.auth.updateUser({ data: { department, role } });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
