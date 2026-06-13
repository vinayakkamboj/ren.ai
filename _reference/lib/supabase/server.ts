import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  getSupabaseConfig,
  requireSupabaseConfig,
  type SupabaseConfig,
} from "./env";

async function createSupabaseServerClient(config: SupabaseConfig) {
  const cookieStore = await cookies();

  return createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Component — cookie mutation is a no-op outside of middleware
        }
      },
    },
  });
}

export async function createClient() {
  return createSupabaseServerClient(requireSupabaseConfig());
}

export async function createOptionalClient() {
  const config = getSupabaseConfig();

  if (!config) {
    return null;
  }

  return createSupabaseServerClient(config);
}
