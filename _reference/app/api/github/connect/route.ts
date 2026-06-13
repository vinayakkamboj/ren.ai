import { NextResponse } from "next/server";
import { createOptionalClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/auth/email";
import {
  createOAuthState,
  isGitHubOAuthConfigured,
  normalizeReturnTo,
  setOAuthStateCookie,
} from "@/lib/github/session";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const requestUrl = new URL(req.url);
  const origin = requestUrl.origin;
  const returnTo = normalizeReturnTo(requestUrl.searchParams.get("returnTo"));

  const supabase = await createOptionalClient();
  if (!supabase) {
    return NextResponse.redirect(new URL("/login?error=supabase_not_configured", origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAllowedEmail(user.email)) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  if (!isGitHubOAuthConfigured()) {
    const errorUrl = new URL(returnTo, origin);
    errorUrl.searchParams.set("github_error", "not_configured");
    return NextResponse.redirect(errorUrl);
  }

  const oauthState = createOAuthState(returnTo);
  const redirectUri = new URL("/api/github/callback", origin).toString();
  const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", process.env.GITHUB_CLIENT_ID!);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("scope", process.env.GITHUB_OAUTH_SCOPES || "repo read:user");
  authorizeUrl.searchParams.set("state", oauthState.state);
  authorizeUrl.searchParams.set("allow_signup", "true");

  const response = NextResponse.redirect(authorizeUrl);
  setOAuthStateCookie(response, oauthState);
  return response;
}
