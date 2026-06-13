"use server";

import { createOptionalClient } from "@/lib/supabase/server";
import { SUPABASE_SETUP_MESSAGE } from "@/lib/supabase/env";
import { ALLOWED_EMAIL_MESSAGE, isAllowedEmail } from "@/lib/auth/email";
import { getTemplateById } from "@/features/templates/registry";
import { buildProjectFiles, type ProjectFileTemplate } from "@/lib/project-files/base-template";
import { ensureCurrentNutrientSdkFiles } from "@/lib/project-files/nutrient-sdk-upgrade";
import type { Workspace, WorkspaceConfig, ProjectFile } from "@/types";
import { redirect } from "next/navigation";

const EDITABLE_SOURCE_FILE_PATHS = new Set([
  "package.json",
  "vite.config.ts",
  "index.html",
  "src/App.tsx",
  "src/NutrientViewer.tsx",
  "src/main.tsx",
  "src/index.css",
]);

function getProjectFileIsSystem(path: string, isSystem: boolean): boolean {
  return isSystem && !EDITABLE_SOURCE_FILE_PATHS.has(path);
}

export async function getWorkspace(id: string): Promise<Workspace | null> {
  const supabase = await createOptionalClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    templateId: data.template_id,
    name: data.name,
    config: data.config as WorkspaceConfig,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function getProjectFiles(workspaceId: string): Promise<ProjectFile[]> {
  const supabase = await createOptionalClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("project_files")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("path");

  if (error || !data || data.length === 0) return [];

  const files = data.map((row) => ({
    id: row.id,
    workspaceId: row.workspace_id,
    path: row.path,
    content: row.content,
    isSystem: getProjectFileIsSystem(row.path, row.is_system),
    language: row.language,
    updatedAt: row.updated_at,
  }));

  return ensureCurrentNutrientSdkFiles(files, (template) => ({
    id: `sdk-${template.path}`,
    workspaceId,
    path: template.path,
    content: template.content,
    isSystem: getProjectFileIsSystem(template.path, template.isSystem),
    language: template.language,
    updatedAt: new Date().toISOString(),
  }));
}

function buildProjectFileInsertRow(workspaceId: string, file: ProjectFileTemplate) {
  return {
    workspace_id: workspaceId,
    path: file.path,
    content: file.content,
    is_system: file.isSystem,
    language: file.language,
  };
}

async function persistCurrentNutrientSdkFiles(workspaceId: string) {
  const supabase = await createOptionalClient();
  if (!supabase) return;

  const { data: rows } = await supabase
    .from("project_files")
    .select("*")
    .eq("workspace_id", workspaceId);

  if (!rows?.length) return;

  const upgradedRows = ensureCurrentNutrientSdkFiles(
    (rows ?? []).map((row) => ({
      workspace_id: row.workspace_id,
      path: row.path,
      content: row.content,
      is_system: row.is_system,
      language: row.language,
    })),
    (template) => buildProjectFileInsertRow(workspaceId, template)
  );

  if (upgradedRows.length > 0) {
    await supabase.from("project_files").upsert(upgradedRows, { onConflict: "workspace_id,path" });
  }
}

export async function getUserWorkspaces(): Promise<Workspace[]> {
  const supabase = await createOptionalClient();
  if (!supabase) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAllowedEmail(user.email)) return [];

  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    userId: row.user_id,
    templateId: row.template_id,
    name: row.name,
    config: row.config as WorkspaceConfig,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function createWorkspace(
  templateId: string,
  name?: string
): Promise<{ workspaceId: string } | { error: string }> {
  const supabase = await createOptionalClient();
  if (!supabase) return { error: SUPABASE_SETUP_MESSAGE };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };
  if (!isAllowedEmail(user.email)) return { error: ALLOWED_EMAIL_MESSAGE };

  const template = getTemplateById(templateId);
  if (!template) return { error: "Template not found" };
  if (template.comingSoon) {
    return { error: `${template.name} is coming soon — backend support is still being set up.` };
  }

  const workspaceName =
    name ||
    `${template.name} — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  // Check for duplicate name (case-insensitive) before inserting
  const { data: existing } = await supabase
    .from("workspaces")
    .select("id")
    .eq("user_id", user.id)
    .ilike("name", workspaceName.trim())
    .maybeSingle();

  if (existing) {
    return { error: `A project named "${workspaceName}" already exists in your workspace.` };
  }

  const { data, error } = await supabase
    .from("workspaces")
    .insert({
      user_id: user.id,
      template_id: templateId,
      name: workspaceName,
      config: template.defaultConfig,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message || "Failed to create workspace" };

  const workspaceId = data.id;

  // Seed project files for the new workspace
  const fileTemplates = buildProjectFiles(template);
  const filesToInsert = fileTemplates.map((f) => buildProjectFileInsertRow(workspaceId, f));

  await supabase.from("project_files").insert(filesToInsert);

  return { workspaceId };
}

export async function saveProjectFile(
  workspaceId: string,
  path: string,
  content: string
): Promise<{ error?: string }> {
  const supabase = await createOptionalClient();
  if (!supabase) return { error: SUPABASE_SETUP_MESSAGE };

  const { error } = await supabase
    .from("project_files")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("workspace_id", workspaceId)
    .eq("path", path);

  if (error) return { error: error.message };
  await persistCurrentNutrientSdkFiles(workspaceId);
  return {};
}

export async function saveWorkspaceConfig(
  workspaceId: string,
  config: WorkspaceConfig
): Promise<{ error?: string }> {
  const supabase = await createOptionalClient();
  if (!supabase) return { error: SUPABASE_SETUP_MESSAGE };

  const { error } = await supabase
    .from("workspaces")
    .update({ config, updated_at: new Date().toISOString() })
    .eq("id", workspaceId);

  if (error) return { error: error.message };
  await persistCurrentNutrientSdkFiles(workspaceId);
  return {};
}

export async function deleteWorkspace(workspaceId: string): Promise<void> {
  const supabase = await createOptionalClient();
  if (supabase) {
    await supabase.from("workspaces").delete().eq("id", workspaceId);
  }
  redirect("/");
}

// Same as deleteWorkspace but without redirect — used from the dashboard
// so the client can handle navigation/refresh itself.
export async function deleteProject(workspaceId: string): Promise<{ error?: string }> {
  const supabase = await createOptionalClient();
  if (!supabase) return { error: SUPABASE_SETUP_MESSAGE };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("workspaces")
    .delete()
    .eq("id", workspaceId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return {};
}

export async function saveAsCustomTemplate(
  workspaceId: string,
  templateName: string
): Promise<{ error?: string }> {
  const supabase = await createOptionalClient();
  if (!supabase) return { error: SUPABASE_SETUP_MESSAGE };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };
  if (!isAllowedEmail(user.email)) return { error: ALLOWED_EMAIL_MESSAGE };

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("config, user_id")
    .eq("id", workspaceId)
    .single();

  if (!workspace || workspace.user_id !== user.id) return { error: "Not found" };

  const updatedConfig = {
    ...(workspace.config as WorkspaceConfig),
    isCustomTemplate: true,
    customTemplateName: templateName.trim(),
  };

  const { error } = await supabase
    .from("workspaces")
    .update({ config: updatedConfig, name: templateName.trim(), updated_at: new Date().toISOString() })
    .eq("id", workspaceId);

  if (error) return { error: error.message };
  await persistCurrentNutrientSdkFiles(workspaceId);
  return {};
}

export async function createWorkspaceFromCustomTemplate(
  sourceWorkspaceId: string,
  name: string
): Promise<{ workspaceId: string } | { error: string }> {
  const supabase = await createOptionalClient();
  if (!supabase) return { error: SUPABASE_SETUP_MESSAGE };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };
  if (!isAllowedEmail(user.email)) return { error: ALLOWED_EMAIL_MESSAGE };

  const { data: sourceWorkspace } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", sourceWorkspaceId)
    .eq("user_id", user.id)
    .single();

  if (!sourceWorkspace) return { error: "Template not found" };

  const sourceConfig = sourceWorkspace.config as WorkspaceConfig & { isCustomTemplate?: boolean; customTemplateName?: string };
  const { isCustomTemplate: _a, customTemplateName: _b, ...newConfig } = sourceConfig;

  const { data: newWorkspace, error: wsError } = await supabase
    .from("workspaces")
    .insert({
      user_id: user.id,
      template_id: sourceWorkspace.template_id,
      name: name.trim(),
      config: newConfig,
    })
    .select("id")
    .single();

  if (wsError || !newWorkspace) return { error: wsError?.message || "Failed to create workspace" };

  const { data: sourceFiles } = await supabase
    .from("project_files")
    .select("*")
    .eq("workspace_id", sourceWorkspaceId);

  if (sourceFiles?.length) {
    const upgradedSourceFiles = ensureCurrentNutrientSdkFiles(
      sourceFiles.map((f) => ({
        workspace_id: newWorkspace.id,
        path: f.path,
        content: f.content,
        is_system: f.is_system,
        language: f.language,
      })),
      (template) => buildProjectFileInsertRow(newWorkspace.id, template)
    );

    await supabase.from("project_files").insert(
      upgradedSourceFiles
    );
  } else {
    const blankTemplate = getTemplateById("blank");
    if (blankTemplate) {
      await supabase.from("project_files").insert(
        buildProjectFiles(blankTemplate).map((file) => buildProjectFileInsertRow(newWorkspace.id, file))
      );
    }
  }

  return { workspaceId: newWorkspace.id };
}

export async function createDeployment(
  workspaceId: string,
  config: WorkspaceConfig,
  projectFiles: ProjectFile[] = []
): Promise<{ shareToken?: string; error?: string }> {
  const supabase = await createOptionalClient();
  if (!supabase) return { error: SUPABASE_SETUP_MESSAGE };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };
  if (!isAllowedEmail(user.email)) return { error: ALLOWED_EMAIL_MESSAGE };

  const workspace = await getWorkspace(workspaceId);
  if (!workspace) return { error: "Workspace not found" };

  const snapshot = {
    version: 2,
    config,
    projectFiles: projectFiles.map((file) => ({
      id: file.id,
      workspaceId: file.workspaceId,
      path: file.path,
      content: file.content,
      isSystem: file.isSystem,
      language: file.language,
      updatedAt: file.updatedAt,
    })),
    createdAt: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("deployments")
    .insert({
      workspace_id: workspaceId,
      user_id: user.id,
      name: workspace.name,
      snapshot,
    })
    .select("share_token")
    .single();

  if (error || !data) return { error: error?.message || "Failed to create deployment" };

  return { shareToken: data.share_token };
}
