import { notFound } from "next/navigation";
import { createOptionalClient } from "@/lib/supabase/server";
import { ShareViewer } from "./share-viewer";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const supabase = await createOptionalClient();

  if (!supabase) {
    return {
      title: "Shared Demo",
      robots: "noindex",
    };
  }

  const { data } = await supabase
    .from("deployments")
    .select("name")
    .eq("share_token", token)
    .single();

  return {
    title: data?.name ?? "Shared Demo",
    robots: "noindex",
  };
}

export default async function SharePage({ params }: Props) {
  const { token } = await params;
  const supabase = await createOptionalClient();

  if (!supabase) notFound();

  const { data: deployment } = await supabase
    .from("deployments")
    .select("*")
    .eq("share_token", token)
    .single();

  if (!deployment) notFound();

  const { data: latestFiles } = await supabase
    .from("project_files")
    .select("id, workspace_id, path, content, is_system, language, updated_at")
    .eq("workspace_id", deployment.workspace_id);

  const effectiveSnapshot = latestFiles?.length
    ? {
        ...deployment.snapshot,
        projectFiles: latestFiles.map((f) => ({
          id: f.id,
          workspaceId: f.workspace_id,
          path: f.path,
          content: f.content,
          isSystem: f.is_system,
          language: f.language,
          updatedAt: f.updated_at,
        })),
      }
    : deployment.snapshot;

  return (
    <ShareViewer
      name={deployment.name}
      snapshot={effectiveSnapshot}
      createdAt={deployment.created_at}
    />
  );
}
