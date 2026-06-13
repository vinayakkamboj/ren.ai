import type { Metadata } from "next";
import { Github } from "lucide-react";
import { PageHeader, EmptyState, DataTable, StatusBadge } from "@/components/platform/widgets";
import { emptyWorkspace } from "@/lib/data/workspace";

export const metadata: Metadata = { title: "Repositories" };

export default function RepositoriesPage() {
  const { repositories } = emptyWorkspace;

  return (
    <>
      <PageHeader
        title="Connected repositories"
        description="Repositories Ren Code can read. Access is granted per repository and revocable at any time."
      />

      {repositories.length === 0 ? (
        <EmptyState
          icon={Github}
          title="No repositories connected"
          description="Connect your GitHub account and choose exactly which repositories Ren Code can index and understand."
          action={{ label: "Connect GitHub", href: "/dashboard/integrations" }}
        />
      ) : (
        <DataTable
          headers={["Repository", "Branch", "Language", "Visibility", "Index", "Synced"]}
          rows={repositories.map((r) => [
            <span key="n" className="font-mono text-[12.5px] text-dusk">{r.fullName}</span>,
            r.defaultBranch,
            r.language,
            r.private ? "Private" : "Public",
            <StatusBadge key="i" status={r.indexState} />,
            r.lastSynced,
          ])}
        />
      )}
    </>
  );
}
