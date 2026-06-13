"use client";

import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { Panel } from "@/components/platform/widgets";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

interface Profile {
  email: string | null;
  displayName: string;
  provider: string;
  createdAt: string | null;
}

export function ProfileSettings() {
  const configured = isSupabaseConfigured();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(configured);

  useEffect(() => {
    if (!configured) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (u) {
        setProfile({
          email: u.email ?? null,
          displayName:
            (u.user_metadata?.full_name as string) ||
            (u.user_metadata?.name as string) ||
            (u.email?.split("@")[0] ?? "Member"),
          provider: u.app_metadata?.provider ?? "email",
          createdAt: u.created_at ?? null,
        });
      }
      setLoading(false);
    });
  }, [configured]);

  if (!configured) {
    return (
      <Panel title="Profile">
        <p className="max-w-[60ch] text-[13.5px] leading-relaxed text-dusk-muted">
          User profiles activate once Supabase authentication is configured.
          With keys in place, your name, email, sign-in provider, and account
          details appear here.
        </p>
      </Panel>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <Panel title="Profile">
        {loading ? (
          <p className="text-[13px] text-dusk-muted">Loading…</p>
        ) : profile ? (
          <dl className="space-y-4">
            {[
              { k: "Name", v: profile.displayName },
              { k: "Email", v: profile.email ?? "—" },
              { k: "Sign-in method", v: profile.provider },
              {
                k: "Member since",
                v: profile.createdAt
                  ? new Date(profile.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "—",
              },
            ].map((row) => (
              <div
                key={row.k}
                className="flex items-baseline justify-between gap-4 border-b border-carbon-line/60 pb-3.5 last:border-b-0 last:pb-0"
              >
                <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-dusk-faint">
                  {row.k}
                </dt>
                <dd className="text-[13.5px] text-dusk">{row.v}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-[13px] text-dusk-muted">Not signed in.</p>
        )}
      </Panel>

      <Panel title="Session">
        <p className="text-[13px] leading-relaxed text-dusk-muted">
          Sessions persist securely across visits. Sign out to end this session
          on this device.
        </p>
        <form action="/auth/signout" method="post" className="mt-5">
          <button
            type="submit"
            className="flex h-10 items-center gap-2 rounded-lg border border-carbon-line-strong px-4 text-[13px] font-medium text-dusk transition-colors duration-200 hover:bg-carbon-high"
          >
            <LogOut className="size-4 text-dusk-muted" />
            Sign out
          </button>
        </form>
      </Panel>
    </div>
  );
}
