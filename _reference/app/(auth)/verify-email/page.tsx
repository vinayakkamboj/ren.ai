"use client";

import { useState } from "react";
import { MailCheck, Loader2, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { GridBackground } from "@/components/auth/GridBackground";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleResend() {
    setResending(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) { setError("Could not find your email address."); return; }
      const { error: err } = await supabase.auth.resend({ type: "signup", email: user.email });
      if (err) { setError(err.message); return; }
      setResent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setResending(false);
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden p-8"
      style={{ background: "#1a1414" }}
    >
      <GridBackground />

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full mb-6"
          style={{ background: "rgba(196,168,130,0.1)", border: "1px solid rgba(196,168,130,0.2)" }}
        >
          <MailCheck style={{ color: "#c4a882" }} className="h-7 w-7" />
        </div>

        <p
          className="text-[11px] uppercase tracking-[0.2em] font-semibold mb-3"
          style={{ color: "#52403f" }}
        >
          Verify your email
        </p>

        <h1
          style={{
            fontFamily: "'Satoshi', var(--font-geist-sans), sans-serif",
            fontSize: "clamp(42px, 10vw, 72px)",
            fontWeight: 700,
            color: "#f4f4f5",
            letterSpacing: "-0.04em",
            lineHeight: 0.92,
            marginBottom: "1.5rem",
          }}
        >
          Check your<br />inbox
        </h1>

        <div className="w-8 h-px mb-6" style={{ background: "#2a2222" }} />

        <p className="text-sm leading-relaxed mb-2" style={{ color: "#71717a" }}>
          We sent a confirmation link to your <strong style={{ color: "#a1a1aa" }}>@nutrient.io</strong> email.
          Click it to activate your account.
        </p>
        <p className="text-xs leading-relaxed mb-8" style={{ color: "#3f3535" }}>
          Check your spam folder if you don&apos;t see it within a few minutes.
        </p>

        <div
          className="w-full rounded-xl px-5 py-4 mb-4"
          style={{ background: "#171212", border: "1px solid #2a2222" }}
        >
          <p className="text-xs mb-3" style={{ color: "#52403f" }}>Didn&apos;t receive the email?</p>
          {resent ? (
            <p className="text-xs font-medium" style={{ color: "#c4a882" }}>
              ✓ Confirmation email resent - check your inbox.
            </p>
          ) : (
            <button
              onClick={handleResend}
              disabled={resending}
              className="flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-lg transition-all mx-auto"
              style={{ background: "#c4a882", color: "#1a1414" }}
            >
              {resending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {resending ? "Sending…" : "Resend confirmation email"}
            </button>
          )}
          {error && (
            <p className="text-xs mt-2" style={{ color: "#ef4444" }}>{error}</p>
          )}
        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 text-xs transition-colors"
          style={{ color: "#52403f" }}
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out and use a different account
        </button>

        <p className="mt-12 text-[11px]" style={{ color: "#52403f" }}>
          The complete Nutrient demo platform - engineered by Vinayak Kamboj
        </p>
      </div>
    </div>
  );
}
