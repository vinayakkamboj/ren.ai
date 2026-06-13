import type { Metadata } from "next";
import { GitPullRequest } from "lucide-react";
import { PageHeader, EmptyState, DataTable, StatusBadge } from "@/components/platform/widgets";
import { emptyWorkspace } from "@/lib/data/workspace";

export const metadata: Metadata = { title: "Pull Requests" };

export default function PullRequestsPage() {
  const { pullRequests } = emptyWorkspace;

  return (
    <>
      <PageHeader
        title="Pull requests"
        description="Changes Ren Code has prepared for review. Nothing merges without you — autonomy with an audit trail."
      />

      {pullRequests.length === 0 ? (
        <EmptyState
          icon={GitPullRequest}
          title="No pull requests yet"
          description="When Ren Code generates a feature, refactor, or fix on a connected repository, the resulting pull request appears here for review."
          action={{ label: "Connect a repository", href: "/dashboard/integrations" }}
        />
      ) : (
        <DataTable
          headers={["Title", "Repository", "#", "Branch", "State", "Created"]}
          rows={pullRequests.map((pr) => [
            <span key="t" className="font-medium text-dusk">{pr.title}</span>,
            <span key="r" className="font-mono text-[12.5px] text-dusk-muted">{pr.repoFullName}</span>,
            `#${pr.number}`,
            <span key="b" className="font-mono text-[12px] text-dusk-muted">{pr.branch}</span>,
            <StatusBadge key="s" status={pr.state} />,
            pr.createdAt,
          ])}
        />
      )}
    </>
  );
}
