"use client";

import { useState } from "react";
import { Github } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function GithubConnect() {
  const configured = isSupabaseConfigured();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    if (pending) return;
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${location.origin}/auth/callback?next=/dashboard/repositories`,
        scopes: "read:user user:email repo",
      },
    });
    if (error) {
      setPending(false);
      setError(error.message);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-carbon-line bg-carbon-raised">
      <div className="border-b border-carbon-line px-5 py-3.5">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-dusk-muted">
          GitHub
        </h2>
      </div>
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-carbon-line bg-carbon">
            <Github className="size-5 text-dusk" />
          </div>
          <div>
            <p className="text-[14px] font-medium text-dusk">Connect your GitHub</p>
            <p className="mt-1.5 max-w-[42ch] text-[13px] leading-relaxed text-dusk-muted">
              Authorize Ren Code to read selected repositories — indexing,
              analysis, file navigation, and pull request generation.
            </p>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-signal-red/10 px-3 py-2 text-[12.5px] text-signal-red">
            {error}
          </p>
        )}

        {configured ? (
          <button
            onClick={connect}
            disabled={pending}
            className="mt-5 flex h-10 items-center gap-2 rounded-lg bg-dusk px-5 text-[13px] font-medium text-carbon transition-opacity duration-200 hover:opacity-90 disabled:opacity-50"
          >
            <Github className="size-4" />
            {pending ? "Redirecting…" : "Connect GitHub"}
          </button>
        ) : (
          <p className="mt-5 rounded-lg border border-carbon-line bg-carbon px-4 py-3 text-[12.5px] leading-relaxed text-dusk-muted">
            GitHub sign-in activates once Supabase auth is configured and the
            GitHub provider is enabled in the Supabase dashboard.
          </p>
        )}
      </div>
    </div>
  );
}
