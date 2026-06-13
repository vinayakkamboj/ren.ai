import { NextResponse } from "next/server";
import { createOptionalClient } from "@/lib/supabase/server";
import { SUPABASE_SETUP_MESSAGE } from "@/lib/supabase/env";
import { isAllowedEmail, normalizeEmail, ALLOWED_EMAIL_MESSAGE } from "@/lib/auth/email";

export async function POST(req: Request) {
  const supabase = await createOptionalClient();
  if (!supabase) return NextResponse.json({ error: SUPABASE_SETUP_MESSAGE }, { status: 503 });

  let body: { email?: string; password?: string };
  try {
    body = (await req.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = normalizeEmail(body.email ?? "");
  const password = body.password ?? "";

  if (!isAllowedEmail(email)) {
    return NextResponse.json({ error: ALLOWED_EMAIL_MESSAGE }, { status: 400 });
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return NextResponse.json(
        { error: "Please verify your email before signing in.", unverified: true },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
