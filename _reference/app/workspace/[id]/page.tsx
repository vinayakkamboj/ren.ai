import { redirect, notFound } from "next/navigation";
import { createOptionalClient } from "@/lib/supabase/server";
import { getWorkspace, getProjectFiles } from "@/features/workspaces/actions";
import { getTemplateById } from "@/features/templates/registry";
import { buildProjectFiles } from "@/lib/project-files/base-template";
import { WorkspaceClient } from "./workspace-client";
import type { Metadata } from "next";
import type { ProjectFile } from "@/types";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const workspace = await getWorkspace(id);
  return { title: workspace?.name ?? "Workspace" };
}

export default async function WorkspacePage({ params }: Props) {
  const { id } = await params;

  const supabase = await createOptionalClient();
  if (!supabase) redirect("/");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [workspace, dbFiles] = await Promise.all([
    getWorkspace(id),
    getProjectFiles(id),
  ]);

  if (!workspace) notFound();
  if (workspace.userId !== user.id) notFound();

  const template = getTemplateById(workspace.templateId);
  if (!template) notFound();

  // Fall back to in-memory generation for workspaces created before project_files existed
  let projectFiles: ProjectFile[];
  let seededFromTemplate = false;
  if (dbFiles.length === 0) {
    seededFromTemplate = true;
    const fileTemplates = buildProjectFiles(template);
    projectFiles = fileTemplates.map((f, i) => ({
      id: `seed-${i}`,
      workspaceId: id,
      path: f.path,
      content: f.content,
      isSystem: f.isSystem,
      language: f.language,
      updatedAt: new Date().toISOString(),
    }));
  } else {
    projectFiles = dbFiles;
  }

  return (
    <WorkspaceClient
      workspace={workspace}
      template={template}
      projectFiles={projectFiles}
      seededFromTemplate={seededFromTemplate}
    />
  );
}
