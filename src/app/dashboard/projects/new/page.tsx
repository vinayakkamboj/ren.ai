import type { Metadata } from "next";
import { PageHeader } from "@/components/platform/widgets";
import { NewProjectFlow } from "@/components/platform/new-project-flow";

export const metadata: Metadata = { title: "New project" };

export default function NewProjectPage() {
  return (
    <>
      <PageHeader
        title="New project"
        description="Choose how you want to start. Describe a new application, or build on a repository you connect."
      />
      <NewProjectFlow />
    </>
  );
}
