import type { Metadata } from "next";
import { MessagesSquare } from "lucide-react";
import { PageHeader, EmptyState, DataTable } from "@/components/platform/widgets";
import { emptyWorkspace } from "@/lib/data/workspace";

export const metadata: Metadata = { title: "AI Conversations" };

export default function ConversationsPage() {
  const { conversations } = emptyWorkspace;

  return (
    <>
      <PageHeader
        title="AI Conversations"
        description="Your conversations with Ren Code — scoped to a project, a repository, or general questions."
      />

      {conversations.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title="No conversations yet"
          description="Ask Ren Code about a codebase, plan a feature, or explore an idea. Conversations you start are saved here."
          action={{ label: "Open the playground", href: "/playground" }}
        />
      ) : (
        <DataTable
          headers={["Conversation", "Scope", "Context", "Messages", "Updated"]}
          align={["l", "l", "l", "r", "r"]}
          rows={conversations.map((c) => [
            <span key="t" className="font-medium text-dusk">{c.title}</span>,
            c.scope,
            c.context ?? "—",
            String(c.messageCount),
            c.updatedAt,
          ])}
        />
      )}
    </>
  );
}
