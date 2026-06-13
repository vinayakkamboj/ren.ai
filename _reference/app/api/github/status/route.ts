import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createOptionalClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/auth/email";
import { isGitHubOAuthConfigured, readGitHubSession } from "@/lib/github/session";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createOptionalClient();
  if (!supabase) {
    return NextResponse.json({ configured: false, connected: false }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAllowedEmail(user.email)) {
    return NextResponse.json({ configured: isGitHubOAuthConfigured(), connected: false }, { status: 401 });
  }

  const session = readGitHubSession(await cookies());

  return NextResponse.json({
    configured: isGitHubOAuthConfigured(),
    connected: Boolean(session),
    login: session?.login ?? null,
    scopes: session?.scope ? session.scope.split(",").map((scope) => scope.trim()).filter(Boolean) : [],
    connectedAt: session?.connectedAt ?? null,
  });
}
