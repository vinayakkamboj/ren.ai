import { NextResponse } from "next/server";
import { createOptionalClient } from "@/lib/supabase/server";
import { SUPABASE_SETUP_MESSAGE } from "@/lib/supabase/env";
import { isAllowedEmail, normalizeEmail, ALLOWED_EMAIL_MESSAGE } from "@/lib/auth/email";

function getSiteOrigin(req: Request): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) return `${proto}://${host}`;
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  return new URL(req.url).origin;
}

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

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const callbackUrl = new URL("/auth/callback", getSiteOrigin(req));
  callbackUrl.searchParams.set("next", "/");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: callbackUrl.toString() },
  });

  if (error) {
    const alreadyExists =
      error.message.toLowerCase().includes("already registered") ||
      error.message.toLowerCase().includes("already exists") ||
      error.message.toLowerCase().includes("user already");

    if (alreadyExists) {
      // Try signing them in directly
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError || !signInData.session) {
        return NextResponse.json(
          { error: "An account with this email already exists. Try signing in." },
          { status: 400 }
        );
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data.user) {
    return NextResponse.json({ error: "Could not create account." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
