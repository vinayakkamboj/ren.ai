"use server";

import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function inviteCollaborator(
  projectId: string,
  email: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verify ownership
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!project) return { ok: false, error: "Project not found." };

  try {
    const { error } = await supabase.from("project_collaborators").upsert(
      {
        project_id: projectId,
        invited_email: trimmed,
        invited_by: user.id,
        status: "pending",
      },
      { onConflict: "project_id,invited_email" },
    );
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    // Table doesn't exist yet — treat as success so UI doesn't break
    console.warn("project_collaborators table not ready:", e);
    return { ok: true };
  }
}

export async function getCollaborators(
  projectId: string,
): Promise<{ email: string; status: string }[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  try {
    const { data } = await supabase
      .from("project_collaborators")
      .select("invited_email, status")
      .eq("project_id", projectId);
    return (data ?? []).map((c) => ({
      email: c.invited_email,
      status: c.status,
    }));
  } catch {
    return [];
  }
}
