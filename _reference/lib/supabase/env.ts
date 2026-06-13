export const SUPABASE_URL_ENV = "NEXT_PUBLIC_SUPABASE_URL";
export const SUPABASE_PUBLISHABLE_KEY_ENV =
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY";
export const SUPABASE_LEGACY_ANON_KEY_ENV = "NEXT_PUBLIC_SUPABASE_ANON_KEY";

export const SUPABASE_SETUP_MESSAGE =
  "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local. NEXT_PUBLIC_SUPABASE_ANON_KEY is also supported for older projects.";

export interface SupabaseConfig {
  url: string;
  publishableKey: string;
}

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super(SUPABASE_SETUP_MESSAGE);
    this.name = "SupabaseNotConfiguredError";
  }
}

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !publishableKey) {
    return null;
  }

  return { url, publishableKey };
}

export function requireSupabaseConfig(): SupabaseConfig {
  const config = getSupabaseConfig();

  if (!config) {
    throw new SupabaseNotConfiguredError();
  }

  return config;
}

export function isSupabaseConfigured() {
  return getSupabaseConfig() !== null;
}
