import { SetupBanner } from "@/components/dashboard/SetupBanner";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Metadata } from "next";
import type { User } from "@supabase/supabase-js";
import type { Workspace } from "@/types";

export const metadata: Metadata = {
  title: "Demo Platform",
};

async function getAuthData(): Promise<{
  user: User | null;
  workspaces: Workspace[];
}> {
  if (!isSupabaseConfigured()) {
    return { user: null, workspaces: [] };
  }

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const { getUserWorkspaces } = await import("@/features/workspaces/actions");
    const { redirect } = await import("next/navigation");

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const workspaces = await getUserWorkspaces();
    return { user, workspaces };
  } catch {
    return { user: null, workspaces: [] };
  }
}

export default async function DashboardPage() {
  const isConfigured = isSupabaseConfigured();
  const { user, workspaces } = await getAuthData();

  return (
    <div className="relative min-h-screen bg-[#1a1414] flex flex-col overflow-hidden">
      {/* Subtle graph paper grid - same as auth pages but more faint */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          backgroundImage: [
            "linear-gradient(rgba(155, 90, 76, 0.035) 1px, transparent 1px)",
            "linear-gradient(90deg, rgba(155, 90, 76, 0.035) 1px, transparent 1px)",
          ].join(", "),
          backgroundSize: "28px 28px, 28px 28px",
        }}
      />

      <div className="relative z-10 flex flex-col flex-1">
        {!isConfigured && <SetupBanner />}

        {user && <DashboardHeaderServer user={user} />}

        <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10">
          <DashboardClient workspaces={workspaces} />
        </main>

        <footer className="border-t border-[#2a2222] py-4 px-6 bg-[#1a1414]">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <a
              href="https://www.vinayakkamboj.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-zinc-700 hover:text-zinc-400 transition-colors"
            >
              Developed by Vinayak Kamboj
            </a>
            <a
              href="https://www.nutrient.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              A product of nutrient.io
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}

async function DashboardHeaderServer({ user }: { user: User }) {
  const { DashboardHeader } = await import("@/components/dashboard/DashboardHeader");
  return <DashboardHeader user={user} />;
}
