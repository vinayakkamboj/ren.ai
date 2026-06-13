import { NextResponse } from "next/server";
import { createOptionalClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/auth/email";
import { detectLanguage } from "@/lib/project-files/config-parser";
import {
  ensureCurrentNutrientSdkFiles,
  upgradeNutrientSdkProjectFileContent,
} from "@/lib/project-files/nutrient-sdk-upgrade";
import type { FilePatch, FileRename } from "@/types";

type ProjectFilesPatchBody = {
  workspaceId?: string;
  path?: string;
  content?: string;
  changes?: FilePatch[];
  deletes?: string[];
  renames?: FileRename[];
};

function isValidProjectPath(path: unknown): path is string {
  return typeof path === "string" && path.length > 0 && !path.startsWith("/") && !path.includes("..");
}

async function persistCurrentNutrientSdkFiles(supabase: NonNullable<Awaited<ReturnType<typeof createOptionalClient>>>, workspaceId: string) {
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
    (template) => ({
      workspace_id: workspaceId,
      path: template.path,
      content: template.content,
      is_system: template.isSystem,
      language: template.language,
    })
  );

  if (upgradedRows.length > 0) {
    await supabase.from("project_files").upsert(upgradedRows, { onConflict: "workspace_id,path" });
  }
}

export async function PATCH(req: Request) {
  const supabase = await createOptionalClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAllowedEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as ProjectFilesPatchBody;
  const { workspaceId, path, content } = body;

  if (!workspaceId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Verify user owns the workspace
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("user_id")
    .eq("id", workspaceId)
    .single();

  if (!workspace || workspace.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isBatchPatch = Array.isArray(body.changes) || Array.isArray(body.deletes) || Array.isArray(body.renames);
  if (isBatchPatch) {
    const changes = Array.isArray(body.changes) ? body.changes : [];
    const deletes = Array.isArray(body.deletes) ? body.deletes : [];
    const renames = Array.isArray(body.renames) ? body.renames : [];

    const invalidChange = changes.find((change) => !isValidProjectPath(change?.path) || typeof change.content !== "string");
    const invalidDelete = deletes.find((deletePath) => !isValidProjectPath(deletePath));
    const invalidRename = renames.find((rename) => !isValidProjectPath(rename?.from) || !isValidProjectPath(rename?.to));
    if (invalidChange || invalidDelete || invalidRename) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
    }

    if (changes.length === 0 && deletes.length === 0 && renames.length === 0) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const changePaths = [...new Set(changes.map((change) => change.path))];
    const existingByPath = new Map<string, { is_system: boolean; language: string | null }>();
    if (changePaths.length > 0) {
      const { data: existingRows } = await supabase
        .from("project_files")
        .select("path,is_system,language")
        .eq("workspace_id", workspaceId)
        .in("path", changePaths);

      for (const row of existingRows ?? []) {
        existingByPath.set(row.path, { is_system: row.is_system, language: row.language });
      }
    }

    const changedPathSet = new Set(changePaths);
    const deletePaths = [
      ...new Set([...deletes, ...renames.map((rename) => rename.from)].filter((deletePath) => !changedPathSet.has(deletePath))),
    ];

    if (deletePaths.length > 0) {
      const { error: deleteError } = await supabase
        .from("project_files")
        .delete()
        .eq("workspace_id", workspaceId)
        .in("path", deletePaths);

      if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    if (changes.length > 0) {
      const rows = changes.map((change) => {
        const existing = existingByPath.get(change.path);
        return {
          workspace_id: workspaceId,
          path: change.path,
          content: upgradeNutrientSdkProjectFileContent(change.path, change.content),
          is_system: existing?.is_system ?? false,
          language: existing?.language ?? detectLanguage(change.path),
          updated_at: new Date().toISOString(),
        };
      });

      const { error: upsertError } = await supabase
        .from("project_files")
        .upsert(rows, { onConflict: "workspace_id,path" });

      if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    await persistCurrentNutrientSdkFiles(supabase, workspaceId);
    return NextResponse.json({ ok: true, saved: changePaths, deleted: deletePaths });
  }

  if (!path || content === undefined) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (!isValidProjectPath(path)) {
    return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
  }

  const { data: existingFile } = await supabase
    .from("project_files")
    .select("is_system, language")
    .eq("workspace_id", workspaceId)
    .eq("path", path)
    .maybeSingle();

  const { error } = await supabase
    .from("project_files")
    .upsert(
      {
        workspace_id: workspaceId,
        path,
        content: upgradeNutrientSdkProjectFileContent(path, content),
        is_system: existingFile?.is_system ?? false,
        language: existingFile?.language ?? detectLanguage(path),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,path" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await persistCurrentNutrientSdkFiles(supabase, workspaceId);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const supabase = await createOptionalClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAllowedEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId, path } = (await req.json()) as { workspaceId: string; path: string };

  if (!workspaceId || !path) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  if (path.startsWith("/") || path.includes("..")) {
    return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
  }

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("user_id")
    .eq("id", workspaceId)
    .single();

  if (!workspace || workspace.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("project_files")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("path", path);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await persistCurrentNutrientSdkFiles(supabase, workspaceId);

  return NextResponse.json({ ok: true });
}
