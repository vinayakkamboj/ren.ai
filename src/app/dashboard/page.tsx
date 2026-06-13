import Link from "next/link";
import { FolderGit2, Github, Sparkles, Users, Zap } from "lucide-react";
import { StatusBadge } from "@/components/platform/widgets";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const MONTHLY_ALLOWANCE = 50;

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

interface Project {
  id: string;
  name: string;
  kind: string;
  status: string;
  updated_at: string;
  shared?: boolean;
}

export default async function DashboardPage() {
  let projectCount = 0;
  let repositoryCount = 0;
  let buildsThisMonth = 0;
  let projects: Project[] = [];
  let sharedProjects: Project[] = [];

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    ).toISOString();

    const [pResult, rResult, bResult, listResult] = await Promise.all([
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
        .gte("updated_at", startOfMonth),
      supabase
        .from("projects")
        .select("id, name, kind, status, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false }),
    ]);

    projectCount = pResult.count ?? 0;
    repositoryCount = rResult.count ?? 0;
    buildsThisMonth = bResult.count ?? 0;
    projects = listResult.data ?? [];

    // Shared projects (best-effort — table may not exist yet)
    try {
      const { data: collabs } = await supabase
        .from("project_collaborators")
        .select("project_id, projects(id, name, kind, status, updated_at)")
        .eq("invited_email", user.email)
        .eq("status", "accepted");

      if (collabs) {
        sharedProjects = collabs
          .map((c) => {
            const p = c.projects as unknown as Project | null;
            return p ? { ...p, shared: true } : null;
          })
          .filter(Boolean) as Project[];
      }
    } catch {
      // table doesn't exist yet
    }
  }

  const usedPct = Math.min(
    100,
    Math.round((buildsThisMonth / MONTHLY_ALLOWANCE) * 100),
  );

  return (
    <div className="space-y-8">
      {/* Usage strip */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-carbon-line bg-carbon-raised px-5 py-3">
        <div className="flex items-center gap-2">
          <Zap className="size-4 text-brass" strokeWidth={1.7} />
          <span className="text-[13px] font-medium text-dusk">Free plan</span>
          <span className="text-[12px] text-dusk-faint">·</span>
          <span className="text-[12px] text-dusk-muted">
            {buildsThisMonth} of {MONTHLY_ALLOWANCE} builds this month
          </span>
        </div>
        <div className="h-1.5 min-w-[120px] flex-1 overflow-hidden rounded-full bg-carbon-high sm:max-w-[160px]">
          <div
            className="h-full rounded-full bg-brass transition-all"
            style={{ width: `${usedPct}%` }}
          />
        </div>
        <div className="ml-auto flex items-center gap-4 text-[12px] text-dusk-faint">
          <span>{projectCount} project{projectCount !== 1 ? "s" : ""}</span>
          <span>{repositoryCount} repo{repositoryCount !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Your Projects */}
      <section>
        <div className="mb-5 flex items-center justify-between">
          <h1 className="font-serif text-[1.5rem] text-dusk">Your Projects</h1>
          <Link
            href="/dashboard/projects/new"
            className="flex h-8 items-center gap-1.5 rounded-lg bg-brass px-3 text-[12.5px] font-medium text-carbon transition-colors hover:bg-brass-deep"
          >
            + New project
          </Link>
        </div>

        {projects.length === 0 ? (
          <EmptyProjects />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </section>

      {/* Shared with you */}
      {sharedProjects.length > 0 && (
        <section>
          <div className="mb-5 flex items-center gap-2">
            <Users className="size-4 text-dusk-faint" />
            <h2 className="font-serif text-[1.2rem] text-dusk">Shared with you</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sharedProjects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/workspace/${project.id}`}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-carbon-line bg-carbon-raised p-4 transition-all duration-150 hover:border-carbon-line-strong hover:bg-carbon-high/50"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {project.kind === "new" ? (
            <Sparkles className="size-4 shrink-0 text-brass" />
          ) : (
            <Github className="size-4 shrink-0 text-dusk-faint" />
          )}
          <span className="truncate text-[14px] font-medium text-dusk">
            {project.name}
          </span>
        </div>
        <StatusBadge status={project.status} />
      </div>

      <p className="mt-3 text-[12px] text-dusk-faint">
        {project.kind === "new" ? "New build" : "Repository"}
      </p>
      <p className="mt-0.5 text-[11.5px] text-dusk-faint/60">
        Updated {relativeTime(project.updated_at)}
      </p>

      {project.shared && (
        <span className="mt-3 inline-flex w-fit items-center gap-1 rounded-full bg-carbon-high px-2 py-0.5 text-[11px] text-dusk-muted">
          <Users className="size-3" /> Shared
        </span>
      )}

      {/* hover open CTA */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-carbon/70 opacity-0 backdrop-blur-[1px] transition-opacity duration-150 group-hover:opacity-100">
        <span className="rounded-lg bg-brass px-4 py-2 text-[13px] font-medium text-carbon shadow-lg">
          Open
        </span>
      </div>
    </Link>
  );
}

function EmptyProjects() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-carbon-line border-dashed bg-carbon-raised py-16 text-center">
      <FolderGit2 className="size-8 text-dusk-faint/40" />
      <p className="mt-4 text-[14px] font-medium text-dusk">No projects yet</p>
      <p className="mt-1.5 max-w-[36ch] text-[13px] text-dusk-muted">
        Start from a prompt or connect an existing GitHub repository.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/dashboard/projects/new?mode=new"
          className="flex h-9 items-center gap-2 rounded-lg bg-brass px-4 text-[13px] font-medium text-carbon transition-colors hover:bg-brass-deep"
        >
          <Sparkles className="size-3.5" />
          Start a new app
        </Link>
        <Link
          href="/dashboard/projects/new?mode=repository"
          className="flex h-9 items-center gap-2 rounded-lg border border-carbon-line bg-carbon px-4 text-[13px] text-dusk-muted transition-colors hover:border-carbon-line-strong hover:text-dusk"
        >
          <Github className="size-3.5" />
          Use a repository
        </Link>
      </div>
    </div>
  );
}
