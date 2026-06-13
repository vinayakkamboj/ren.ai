import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { clearGitHubSessionCookie, readGitHubSession } from "@/lib/github/session";

export const runtime = "nodejs";

export async function POST() {
  const cookieStore = await cookies();
  const session = readGitHubSession(cookieStore);

  // Revoke the entire OAuth grant (not just the token) so GitHub requires the
  // user to fully re-authorize next time - they'll see the account picker and
  // the "Authorize" screen instead of silently reconnecting to the same account.
  if (session?.accessToken && process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    const credentials = Buffer.from(
      `${process.env.GITHUB_CLIENT_ID}:${process.env.GITHUB_CLIENT_SECRET}`
    ).toString("base64");
    try {
      await fetch(
        `https://api.github.com/applications/${process.env.GITHUB_CLIENT_ID}/grant`,
        {
          method: "DELETE",
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
          body: JSON.stringify({ access_token: session.accessToken }),
        }
      );
    } catch {
      // Non-fatal - still clear the local cookie even if GitHub revocation fails.
    }
  }

  const response = NextResponse.json({ ok: true });
  clearGitHubSessionCookie(response);
  return response;
}
