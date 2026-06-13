import Link from "next/link";
import { ArrowRight, FolderGit2, Github, Sparkles, Zap } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/platform/widgets";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Soft monthly build allowance shown in the usage strip (free plan). */
const MONTHLY_BUILD_ALLOWANCE = 50;

function startOfMonthISO(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

export default async function OverviewPage() {
  const configured = isSupabaseConfigured();

  let projectCount = 0;
  let repositoryCount = 0;
  let buildsThisMonth = 0;
  let recentProjects: Array<{
    id: string;
    name: string;
    kind: string;
    status: string;
    updated_at: string;
  }> = [];

  if (configured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const [projectsResult, repositoriesResult, monthResult, recentResult] =
      await Promise.all([
        supabase
          .from("projects")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("repositories")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("projects")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("updated_at", startOfMonthISO()),
        supabase
          .from("projects")
          .select("id, name, kind, status, updated_at")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(6),
      ]);

    projectCount = projectsResult.count ?? 0;
    repositoryCount = repositoriesResult.count ?? 0;
    buildsThisMonth = monthResult.count ?? 0;
    recentProjects = recentResult.data ?? [];
  }

  const usedPct = Math.min(
    100,
    Math.round((buildsThisMonth / MONTHLY_BUILD_ALLOWANCE) * 100),
  );

  return (
    <>
      <PageHeader
        title="Overview"
        description="Build a new app from a prompt, or open one on a repository you've connected."
      />

      {/* Usage strip — on top */}
      <div className="rounded-xl border border-carbon-line bg-carbon-raised">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg border border-carbon-line bg-carbon">
              <Zap className="size-4 text-brass" strokeWidth={1.7} />
            </div>
            <div>
              <p className="text-[13px] font-medium text-dusk">Free plan</p>
              <p className="text-[12px] text-dusk-muted">
                {buildsThisMonth} of {MONTHLY_BUILD_ALLOWANCE} builds this month
              </p>
            </div>
          </div>

          <div className="flex flex-1 items-center gap-6 sm:justify-end">
            <div className="hidden min-w-[180px] flex-1 sm:block">
              <div className="h-1.5 overflow-hidden rounded-full bg-carbon-high">
                <div
                  className="h-full rounded-full bg-brass transition-all"
                  style={{ width: `${usedPct}%` }}
                />
              </div>
            </div>
            <StripStat label="Projects" value={projectCount} />
            <StripStat label="Repositories" value={repositoryCount} />
          </div>
        </div>
      </div>

      {/* Start options */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <StartCard
          icon={Sparkles}
          title="Start a new app"
          detail="Describe what you want — Ren Code scaffolds the pages, components, and state, and renders it live."
          href="/dashboard/projects/new?mode=new"
          cta="New app"
        />
        <StartCard
          icon={Github}
          title="Build on a GitHub repo"
          detail="Open a connected repository in the workspace. Ren Code reads the code and edits it with you."
          href="/dashboard/projects/new?mode=repository"
          cta="Use a repository"
        />
      </div>

      {/* Recent projects */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-[1.2rem] text-dusk">Recent projects</h2>
          <Link
            href="/dashboard/projects"
            className="text-[12.5px] text-dusk-muted transition-colors hover:text-brass"
          >
            View all
          </Link>
        </div>

        {recentProjects.length === 0 ? (
          <div className="mt-3 flex flex-col items-center justify-center rounded-xl border border-carbon-line bg-carbon-raised py-12 text-center">
            <FolderGit2 className="size-5 text-dusk-faint" />
            <p className="mt-3 max-w-[40ch] text-[13px] text-dusk-muted">
              Your projects will appear here once you start building.
            </p>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-carbon-line/60 overflow-hidden rounded-xl border border-carbon-line bg-carbon-raised">
            {recentProjects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/workspace/${p.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors duration-150 hover:bg-carbon-high/40"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <FolderGit2 className="size-4 shrink-0 text-dusk-faint" />
                    <span className="truncate text-[13.5px] font-medium text-dusk">
                      {p.name}
                    </span>
                    <span className="hidden shrink-0 text-[12px] text-dusk-faint sm:block">
                      {p.kind === "new" ? "New build" : "Repository"}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusBadge status={p.status} />
                    <span className="hidden text-[12px] text-dusk-faint md:block">
                      {relativeTime(p.updated_at)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function StripStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-right">
      <p className="font-serif text-[1.3rem] leading-none text-dusk tnum">{value}</p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-dusk-faint">
        {label}
      </p>
    </div>
  );
}

function StartCard({
  icon: Icon,
  title,
  detail,
  href,
  cta,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  detail: string;
  href: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-xl border border-carbon-line bg-carbon-raised p-6 transition-colors duration-200 hover:border-carbon-line-strong hover:bg-carbon-high/50"
    >
      <div className="flex size-11 items-center justify-center rounded-xl border border-carbon-line bg-carbon">
        <Icon className="size-5 text-brass" strokeWidth={1.6} />
      </div>
      <h3 className="mt-5 font-serif text-[1.2rem] text-dusk">{title}</h3>
      <p className="mt-2 max-w-[42ch] text-[13.5px] leading-relaxed text-dusk-muted">
        {detail}
      </p>
      <span className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-brass">
        {cta}
        <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-1" />
      </span>
    </Link>
  );
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}
