"use client";

import { useEffect, useRef, useState } from "react";
import { Clock, LogOut, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { GridBackground } from "@/components/auth/GridBackground";

export default function PendingApprovalPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function checkStatus(silent = false) {
    if (!silent) setChecking(true);
    setMessage(null);
    try {
      const supabase = createClient();
      await supabase.auth.refreshSession();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: approval } = await supabase
        .from("user_approvals")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (approval?.status === "approved") {
        router.push("/");
        return;
      }
      if (approval?.status === "rejected") {
        await supabase.auth.signOut();
        router.push("/login?error=account-rejected");
        return;
      }
      if (!silent) {
        setMessage("Still pending - Vinayak will review your request shortly.");
      }
    } catch {
      if (!silent) setMessage("Could not check status. Try again.");
    } finally {
      if (!silent) setChecking(false);
    }
  }

  // Auto-poll every 30 s so the user gets redirected automatically once approved.
  useEffect(() => {
    pollRef.current = setInterval(() => void checkStatus(true), 30_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

        {/* Icon */}
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full mb-6"
          style={{ background: "rgba(196,168,130,0.1)", border: "1px solid rgba(196,168,130,0.2)" }}
        >
          <Clock style={{ color: "#c4a882" }} className="h-7 w-7" />
        </div>

        <p
          className="text-[11px] uppercase tracking-[0.2em] font-semibold mb-3"
          style={{ color: "#52403f" }}
        >
          Access request sent
        </p>

        <h1
          style={{
            fontFamily: "'Satoshi', var(--font-geist-sans), sans-serif",
            fontSize: "clamp(48px, 12vw, 80px)",
            fontWeight: 700,
            color: "#f4f4f5",
            letterSpacing: "-0.05em",
            lineHeight: 0.9,
            marginBottom: "1.5rem",
          }}
        >
          Waiting for<br />approval
        </h1>

        <div className="w-8 h-px mb-6" style={{ background: "#2a2222" }} />

        {/* Why approval */}
        <div
          className="w-full rounded-xl px-5 py-4 mb-4 text-left"
          style={{ background: "rgba(196,168,130,0.04)", border: "1px solid rgba(196,168,130,0.15)" }}
        >
          <p className="text-xs font-semibold mb-1" style={{ color: "#c4a882" }}>
            Why is approval required?
          </p>
          <p className="text-xs leading-relaxed" style={{ color: "#71717a" }}>
            Access is controlled to make sure only known people can use the platform - so unknown accounts can&apos;t get in and usage stays in check.
          </p>
        </div>

        {/* Main message */}
        <p className="text-sm leading-relaxed mb-2" style={{ color: "#71717a" }}>
          Happy you&apos;re testing it! :)
        </p>
        <p className="text-sm leading-relaxed mb-6" style={{ color: "#71717a" }}>
          Your request is with <strong style={{ color: "#a1a1aa" }}>Vinayak</strong> - once approved you can sign in instantly, no new account needed.
        </p>

        {/* Contact card */}
        <div
          className="w-full rounded-xl px-5 py-4 mb-4 text-left"
          style={{ background: "#171212", border: "1px solid #2a2222" }}
        >
          <p
            className="text-[10px] uppercase tracking-widest font-semibold mb-3"
            style={{ color: "#52403f" }}
          >
            Speed things up
          </p>
          <div className="space-y-2.5">
            <div className="flex items-start gap-2.5">
              <div>
                <p className="text-xs font-medium" style={{ color: "#a1a1aa" }}>Email</p>
                <a
                  href="mailto:vinayak.kamboj@nutrient.io"
                  className="text-xs transition-colors"
                  style={{ color: "#52403f" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#c4a882"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#52403f"; }}
                >
                  vinayak.kamboj@nutrient.io
                </a>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div>
                <p className="text-xs font-medium" style={{ color: "#a1a1aa" }}>Slack</p>
                <p className="text-xs" style={{ color: "#52403f" }}>
                  Ping me on Slack to confirm it&apos;s you - I&apos;ll approve straight away
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Status - auto-polls, manual check also available */}
        <div
          className="w-full rounded-xl px-5 py-4 mb-4"
          style={{ background: "#171212", border: "1px solid #2a2222" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="h-2 w-2 rounded-full animate-pulse" style={{ background: "#c4a882" }} />
            <span className="text-xs font-medium" style={{ color: "#c4a882" }}>
              Checking automatically every 30 s
            </span>
          </div>

          {message && (
            <p className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ background: "#1f1818", color: "#71717a", border: "1px solid #2a2222" }}>
              {message}
            </p>
          )}

          <button
            onClick={() => void checkStatus(false)}
            disabled={checking}
            className="flex items-center justify-center gap-1.5 w-full text-xs font-medium px-4 py-2.5 rounded-lg transition-all"
            style={{ background: "#c4a882", color: "#1a1414" }}
          >
            {checking
              ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Checking…</>
              : <><RefreshCw className="h-3.5 w-3.5" />Check now</>
            }
          </button>
        </div>

        <button
          onClick={() => void handleSignOut()}
          className="flex items-center gap-1.5 text-xs transition-colors"
          style={{ color: "#52403f" }}
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>

        <p className="mt-12 text-[11px]" style={{ color: "#52403f" }}>
          The complete Nutrient demo platform - engineered by Vinayak Kamboj
        </p>
      </div>
    </div>
  );
}
