import { createOptionalClient } from "@/lib/supabase/server";
import { SUPABASE_SETUP_MESSAGE } from "@/lib/supabase/env";
import { isAdmin } from "@/lib/auth/email";
import type { User } from "@supabase/supabase-js";

export type AdminVerificationResult =
  | { ok: true; user: User }
  | { ok: false; status: 403 | 503; message: string };

function isMissingSessionError(message: string) {
  return /auth session missing|session.*missing|jwt.*missing|invalid jwt|not authenticated/i.test(message);
}

export async function verifyAdminRequest(): Promise<AdminVerificationResult> {
  const supabase = await createOptionalClient();
  if (!supabase) return { ok: false, status: 503, message: SUPABASE_SETUP_MESSAGE };

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    const message = error.message || "Supabase auth check failed.";
    if (isMissingSessionError(message)) return { ok: false, status: 403, message: "Forbidden" };
    return { ok: false, status: 503, message };
  }

  if (!user || !isAdmin(user.email)) return { ok: false, status: 403, message: "Forbidden" };
  return { ok: true, user };
}

export async function verifyAdmin() {
  const result = await verifyAdminRequest();
  return result.ok ? result.user : null;
}
