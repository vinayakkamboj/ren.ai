import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getSupabaseConfig } from "@/lib/supabase/env";

function getSiteOrigin(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) {
    // Local dev has no TLS — forcing https here would produce an invalid
    // callback URL and Supabase would fall back to the deployed Site URL.
    const isLocalhost = host.startsWith("localhost") || host.startsWith("127.0.0.1");
    const proto = isLocalhost ? "http" : req.headers.get("x-forwarded-proto") ?? "https";
    return `${proto}://${host}`;
  }
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  return new URL(req.url).origin;
}

export async function GET(request: NextRequest) {
  const config = getSupabaseConfig();
  if (!config) {
    return NextResponse.redirect(new URL("/login?error=oauth-failed", request.url));
  }

  // Build a temporary response so Supabase can write the PKCE verifier cookie onto it.
  // We'll transfer those cookies to the final redirect response.
  const cookieJar: Array<{ name: string; value: string; options?: CookieOptions }> = [];

  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieJar.push({ name, value, options })
        );
      },
    },
  });

  const redirectTo = new URL("/auth/callback", getSiteOrigin(request)).toString();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: { prompt: "select_account" },
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(new URL("/login?error=oauth-failed", request.url));
  }

  const response = NextResponse.redirect(data.url);

  // Transfer PKCE verifier and any other cookies Supabase set
  cookieJar.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
  });

  return response;
}
