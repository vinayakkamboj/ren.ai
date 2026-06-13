"use client";

import { isSupabaseConfigured, SUPABASE_SETUP_MESSAGE } from "@/lib/supabase/env";
import { AuthShell, Notice, GoogleButton } from "./LoginForm";

export function SignupForm() {
  const supabaseConfigured = isSupabaseConfigured();

  return (
    <AuthShell welcomePrefix="Welcome to">
      {!supabaseConfigured && (
        <div className="mb-4">
          <Notice tone="warning">{SUPABASE_SETUP_MESSAGE}</Notice>
        </div>
      )}

      <GoogleButton label="Sign up with Google" />

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Already have an account?{" "}
        <a href="/login" className="text-foreground hover:text-primary transition-colors">
          Sign in
        </a>
      </p>

      <p className="mt-8 text-center" style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", opacity: 0.45 }}>
        Developed by{" "}
        <a
          href="https://www.vinayakkamboj.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "hsl(var(--muted-foreground))", textDecoration: "underline", textUnderlineOffset: 3 }}
          className="hover:opacity-100 transition-opacity"
        >
          Vinayak Kamboj
        </a>
      </p>
    </AuthShell>
  );
}
