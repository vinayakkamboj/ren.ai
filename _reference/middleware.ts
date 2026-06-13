import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getSupabaseConfig } from "@/lib/supabase/env";
import { isAllowedEmail, isAdmin } from "@/lib/auth/email";

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"));
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // login / signup / verify-email: pages a logged-out user needs
  const isLoginSignupRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/verify-email") ||
    pathname.startsWith("/pending-approval");

  const isAuthRoute = isLoginSignupRoute;
  const isOnboardingRoute = pathname === "/onboarding";
  const isPublicRoute =
    pathname.startsWith("/share") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/auth/callback");

  // Skip auth roundtrip for public routes and auth pages with no session cookie
  if (isPublicRoute || (isAuthRoute && !hasSupabaseAuthCookie(request))) {
    return NextResponse.next({ request });
  }

  const supabaseConfig = getSupabaseConfig();
  if (!supabaseConfig) return NextResponse.next({ request });

  let supabaseResponse = NextResponse.next({ request });

  try {
    const supabase = createServerClient(
      supabaseConfig.url,
      supabaseConfig.publishableKey,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    // Google OAuth users bypass domain restriction and approval entirely
    const isGoogleUser = user?.app_metadata?.provider === "google";

    // Wrong domain - sign out immediately (not applied to Google OAuth users)
    if (user && !isGoogleUser && !isAllowedEmail(user.email as string)) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "nutrient-email-required");
      const redirectResponse = NextResponse.redirect(url);
      supabaseResponse.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
      return redirectResponse;
    }

    // Block unverified accounts (Google users always have verified emails)
    if (user && !isGoogleUser && !user.email_confirmed_at && !isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/verify-email";
      return NextResponse.redirect(url);
    }

    // ── login / signup / verify-email / pending-approval ──────────────────────────────────────────────
    if (isLoginSignupRoute) {
      if (user) {
        // Already authenticated — send to app
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
      }
      return supabaseResponse;
    }

    // ── Protected app routes ───────────────────────────────────────────────────────────────────────
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    // New users without a role - onboarding
    if (!user.user_metadata?.role && !isOnboardingRoute && pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  } catch {
    return NextResponse.next({ request });
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|samples|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|mjs|map|txt|xml|pdf|wasm|woff|woff2|ttf|otf)$).*)",
  ],
};
