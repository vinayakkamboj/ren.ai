import { NextResponse } from "next/server";
import { createOptionalClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/auth/email";

function getRedirectUrl(req: Request, path: string) {
  return new URL(path, req.url);
}

function getSafeNextPath(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }

  return next;
}

export async function GET(req: Request) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeNextPath(requestUrl.searchParams.get("next"));
  const supabase = await createOptionalClient();

  if (!supabase || !code) {
    return NextResponse.redirect(
      getRedirectUrl(req, "/login?error=magic-link-invalid")
    );
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      getRedirectUrl(req, "/login?error=magic-link-expired")
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Google OAuth users are allowed regardless of email domain
  const isGoogleUser = user?.app_metadata?.provider === "google";

  if (!isGoogleUser && !isAllowedEmail(user?.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      getRedirectUrl(req, "/login?error=nutrient-email-required")
    );
  }

  return NextResponse.redirect(getRedirectUrl(req, next));
}
