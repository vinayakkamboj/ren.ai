import { NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  // Redirect to home after sign out, not the login page.
  return NextResponse.redirect(new URL("/", request.url), { status: 302 });
}
