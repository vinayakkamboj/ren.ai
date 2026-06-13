import type { Metadata } from "next";
import Link from "next/link";
import { FolderGit2 } from "lucide-react";
import { PageHeader, EmptyState, DataTable, StatusBadge } from "@/components/platform/widgets";
import { emptyWorkspace } from "@/lib/data/workspace";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  const { projects } = emptyWorkspace;

  return (
    <>
      <PageHeader
        title="Projects"
        description="Applications you are building with Ren Code — new ones from a prompt, or work on connected repositories."
        action={
          <Link
            href="/dashboard/projects/new"
            className="flex h-9 items-center rounded-lg bg-brass px-4 text-[12.5px] font-medium text-carbon transition-colors duration-200 hover:bg-brass-deep"
          >
            New project
          </Link>
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderGit2}
          title="No projects yet"
          description="Start a new application from a prompt, or open a project on a repository you've connected."
          action={{ label: "Start a new project", href: "/dashboard/projects/new" }}
        />
      ) : (
        <DataTable
          headers={["Project", "Type", "Status", "Repository", "Updated"]}
          rows={projects.map((p) => [
            <span key="n" className="font-medium text-dusk">{p.name}</span>,
            p.kind === "new" ? "New build" : "Repository",
            <StatusBadge key="s" status={p.status} />,
            p.repoFullName ?? "—",
            p.updatedAt,
          ])}
        />
      )}
    </>
  );
}
