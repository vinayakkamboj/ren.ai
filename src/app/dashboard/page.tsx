import Link from "next/link";
import {
  ArrowRight,
  FolderGit2,
  Github,
  GitPullRequest,
  MessagesSquare,
  Sparkles,
} from "lucide-react";
import { PageHeader, Panel, CountTile } from "@/components/platform/widgets";
import { emptyWorkspace } from "@/lib/data/workspace";

export default function OverviewPage() {
  const ws = emptyWorkspace;

  const quickStart = [
    {
      icon: Sparkles,
      title: "Start a new project",
      detail: "Describe an app — a SaaS, CRM, or dashboard — and let Ren Code scaffold it.",
      href: "/dashboard/projects/new",
      cta: "New project",
    },
    {
      icon: Github,
      title: "Connect a repository",
      detail: "Authorize GitHub and let Ren Code understand an existing codebase.",
      href: "/dashboard/integrations",
      cta: "Connect GitHub",
    },
  ];

  return (
    <>
      <PageHeader
        title="Overview"
        description="Your Ren Code workspace. Start a project or connect a repository to begin."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CountTile label="Projects" value={ws.projects.length} hint="none yet" />
        <CountTile label="Repositories" value={ws.repositories.length} hint="connect GitHub" />
        <CountTile label="Pull requests" value={ws.pullRequests.length} hint="none yet" />
        <CountTile label="Conversations" value={ws.conversations.length} hint="none yet" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {quickStart.map((q) => (
          <Link
            key={q.title}
            href={q.href}
            className="group flex flex-col rounded-xl border border-carbon-line bg-carbon-raised p-6 transition-colors duration-200 hover:border-carbon-line-strong hover:bg-carbon-high/50"
          >
            <div className="flex size-11 items-center justify-center rounded-xl border border-carbon-line bg-carbon">
              <q.icon className="size-5 text-brass" strokeWidth={1.6} />
            </div>
            <h3 className="mt-5 font-serif text-[1.2rem] text-dusk">{q.title}</h3>
            <p className="mt-2 max-w-[42ch] text-[13.5px] leading-relaxed text-dusk-muted">
              {q.detail}
            </p>
            <span className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-brass">
              {q.cta}
              <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </div>

      <Panel className="mt-4" title="Recent activity">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex gap-3 text-dusk-faint">
            <FolderGit2 className="size-5" />
            <GitPullRequest className="size-5" />
            <MessagesSquare className="size-5" />
          </div>
          <p className="mt-4 max-w-[40ch] text-[13.5px] leading-relaxed text-dusk-muted">
            Activity from your projects, pull requests, and conversations will
            appear here once you start building.
          </p>
        </div>
      </Panel>
    </>
  );
}
