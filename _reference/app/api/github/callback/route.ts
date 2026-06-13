import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createOptionalClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/auth/email";
import {
  clearOAuthStateCookie,
  decodeOAuthState,
  GITHUB_STATE_COOKIE,
  isGitHubOAuthConfigured,
  setGitHubSessionCookie,
  statesMatch,
} from "@/lib/github/session";

export const runtime = "nodejs";

interface GitHubTokenResponse {
  access_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
}

interface GitHubUserResponse {
  login: string;
}

function redirectWithError(origin: string, returnTo: string, error: string) {
  const url = new URL(returnTo, origin);
  url.searchParams.set("github_error", error);
  const response = NextResponse.redirect(url);
  clearOAuthStateCookie(response);
  return response;
}

export async function GET(req: Request) {
  const requestUrl = new URL(req.url);
  const origin = requestUrl.origin;

  const supabase = await createOptionalClient();
  if (!supabase) return redirectWithError(origin, "/", "supabase_not_configured");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAllowedEmail(user.email)) {
    return redirectWithError(origin, "/", "unauthorized");
  }

  if (!isGitHubOAuthConfigured()) {
    return redirectWithError(origin, "/", "not_configured");
  }

  const cookieStore = await cookies();
  const storedState = decodeOAuthState(cookieStore.get(GITHUB_STATE_COOKIE)?.value);
  const returnTo = storedState?.returnTo || "/";
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const githubError = requestUrl.searchParams.get("error");

  if (githubError) return redirectWithError(origin, returnTo, githubError);
  if (!code || !state || !storedState || !statesMatch(state, storedState.state)) {
    return redirectWithError(origin, returnTo, "invalid_state");
  }

  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: new URL("/api/github/callback", origin).toString(),
    }),
  });

  const tokenJson = await tokenResponse.json() as GitHubTokenResponse;
  if (!tokenResponse.ok || tokenJson.error || !tokenJson.access_token) {
    return redirectWithError(
      origin,
      returnTo,
      tokenJson.error_description || tokenJson.error || "token_exchange_failed"
    );
  }

  const userResponse = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${tokenJson.access_token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!userResponse.ok) {
    return redirectWithError(origin, returnTo, "github_user_failed");
  }

  const githubUser = await userResponse.json() as GitHubUserResponse;
  const redirectUrl = new URL(returnTo, origin);
  redirectUrl.searchParams.set("github", "connected");

  const response = NextResponse.redirect(redirectUrl);
  clearOAuthStateCookie(response);
  setGitHubSessionCookie(response, {
    accessToken: tokenJson.access_token,
    login: githubUser.login,
    scope: tokenJson.scope || "",
    connectedAt: new Date().toISOString(),
  });
  return response;
}
