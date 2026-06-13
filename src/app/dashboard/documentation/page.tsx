import type { Metadata } from "next";
import { BookText } from "lucide-react";
import { PageHeader, EmptyState, DataTable } from "@/components/platform/widgets";
import { emptyWorkspace } from "@/lib/data/workspace";

export const metadata: Metadata = { title: "Documentation" };

export default function DocumentationPage() {
  const { docs } = emptyWorkspace;

  return (
    <>
      <PageHeader
        title="Documentation"
        description="Documentation Ren Code generates from your connected repositories — grounded in the real code, kept current."
      />

      {docs.length === 0 ? (
        <EmptyState
          icon={BookText}
          title="No documentation generated yet"
          description="Once a repository is connected and indexed, Ren Code can generate architecture overviews, API references, and guides grounded in your code."
          action={{ label: "Connect a repository", href: "/dashboard/integrations" }}
        />
      ) : (
        <DataTable
          headers={["Title", "Repository", "Type", "Updated"]}
          rows={docs.map((d) => [
            <span key="t" className="font-medium text-dusk">{d.title}</span>,
            <span key="r" className="font-mono text-[12.5px] text-dusk-muted">{d.repoFullName}</span>,
            d.kind,
            d.updatedAt,
          ])}
        />
      )}
    </>
  );
}
