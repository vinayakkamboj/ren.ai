/**
 * GET /api/credits/balance
 *
 * Returns the authenticated user's current credit balance.
 * Called by the dashboard and workspace to show live balance.
 * All reads are server-side; the user id comes from the session cookie.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getCreditsBalance, ensureCreditsAccount } from "@/lib/credits/server";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return Response.json({ balance: null, configured: false });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: "auth_required" }, { status: 401 });
    }

    // Create the row with signup bonus if this is the first time we see them.
    await ensureCreditsAccount(user.id);

    const balance = await getCreditsBalance(user.id);
    return Response.json({ balance, configured: true });
  } catch {
    return Response.json({ balance: null, configured: false });
  }
}
