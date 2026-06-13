"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { isSupabaseConfigured, SUPABASE_SETUP_MESSAGE } from "@/lib/supabase/env";
import { GridBackground } from "./GridBackground";
import { useTypewriterLoop } from "@/hooks/useTypewriter";

const CALLBACK_ERROR_MESSAGES: Record<string, string> = {
  "session-expired": "Your session has expired. Please sign in again.",
  "nutrient-email-required": "Sign in with your Google account.",
  "magic-link-invalid": "That link is invalid. Please try signing in again.",
  "magic-link-expired": "That link has expired. Please sign in again.",
  "oauth-failed": "Google sign-in failed. Please try again.",
};

export function LoginForm() {
  const supabaseConfigured = isSupabaseConfigured();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const callbackError = params.get("error");
    if (callbackError) {
      setError(
        CALLBACK_ERROR_MESSAGES[callbackError] ?? "Something went wrong. Please try again."
      );
    }
  }, []);

  return (
    <AuthShell>
      {!supabaseConfigured && (
        <div className="mb-4">
          <Notice tone="warning">{SUPABASE_SETUP_MESSAGE}</Notice>
        </div>
      )}

      {error && (
        <div className="mb-4">
          <Notice tone="error">{error}</Notice>
        </div>
      )}

      <GoogleButton label="Sign in with Google" />

      <p className="mt-6 text-center text-xs text-muted-foreground">
        New to Nucode?{" "}
        <a href="/signup" className="text-foreground hover:text-primary transition-colors">
          Create account
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

export function GoogleButton({ label = "Continue with Google" }: { label?: string }) {
  return (
    <a
      href="/api/auth/google"
      className="flex items-center justify-center gap-3 w-full rounded-md border border-border bg-card hover:bg-accent transition-colors px-4 py-3 text-sm font-medium text-foreground"
    >
      <GoogleIcon />
      {label}
    </a>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9086c1.7018-1.5668 2.6836-3.874 2.6836-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.4673-.8059 5.9564-2.1805l-2.9086-2.2581c-.8059.54-1.8368.859-3.0477.859-2.3446 0-4.3282-1.5831-5.036-3.7104H.9574v2.3318C2.4382 15.9832 5.4818 18 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71c-.18-.54-.2823-1.1168-.2823-1.71s.1023-1.17.2823-1.71V4.9582H.9574C.3477 6.1732 0 7.5482 0 9s.3477 2.8268.9574 4.0418L3.964 10.71z" fill="#FBBC05"/>
      <path d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.4259 0 9 0 5.4818 0 2.4382 2.0168.9574 4.9582L3.964 7.29C4.6718 5.1627 6.6554 3.5795 9 3.5795z" fill="#EA4335"/>
    </svg>
  );
}

export function AuthShell({ children, welcomePrefix }: { children: React.ReactNode; welcomePrefix?: string }) {
  const { displayed, cursorVisible } = useTypewriterLoop("Nucode");

  return (
    <div className="relative min-h-screen bg-background flex items-center justify-center p-4 overflow-hidden">
      <GridBackground />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="mb-10">
          {welcomePrefix && (
            <span style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", display: "block", marginBottom: 8, letterSpacing: "0.02em" }}>
              {welcomePrefix}
            </span>
          )}
          <span style={{ fontFamily: "'Satoshi', var(--font-geist-sans), sans-serif", fontSize: 80, fontWeight: 700, color: "hsl(var(--foreground))", letterSpacing: "-0.05em", lineHeight: 0.9, display: "block", minHeight: "1em" }}>
            {displayed}
            <span style={{ display: "inline-block", width: 3, height: "0.85em", background: "hsl(var(--foreground))", marginLeft: 4, verticalAlign: "middle", borderRadius: 1, opacity: cursorVisible ? 0.9 : 0, transition: "opacity 0.1s" }} />
          </span>
          <span style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", letterSpacing: "0.01em", display: "block", marginTop: 14 }}>
            Build. Demo. Ship. The Nutrient platform.
          </span>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

export function Notice({ children, tone }: { children: React.ReactNode; tone: "error" | "warning" }) {
  const classes =
    tone === "warning"
      ? "border-amber-500/30 bg-amber-500/5 text-amber-200/80"
      : "border-destructive/30 bg-destructive/5 text-destructive";

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className={`flex items-start gap-2 rounded-md border px-3 py-2.5 text-sm ${classes}`}
    >
      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
      <span>{children}</span>
    </motion.div>
  );
}
