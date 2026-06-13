import { createClient } from "@supabase/supabase-js";
import { requireSupabaseConfig } from "./env";

export function createAdminClient() {
  const config = requireSupabaseConfig();
  // Modern Supabase uses SUPABASE_SECRET_KEY; legacy projects use SUPABASE_SERVICE_ROLE_KEY
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SECRET_KEY is not configured.");
  }

  return createClient(config.url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function isAdminServiceAvailable(): boolean {
  return !!(process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY);
}
