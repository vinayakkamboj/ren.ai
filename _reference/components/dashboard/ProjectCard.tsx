"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Clock, ArrowRight, Layers, Trash2, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { formatRelativeTime } from "@/lib/utils";
import { getTemplateById } from "@/features/templates/registry";
import { deleteProject } from "@/features/workspaces/actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Workspace } from "@/types";

const categoryLabels: Record<string, string> = {
  document: "Viewer",
  forms: "Forms",
  collaboration: "Collaboration",
  workflow: "Automation",
  industry: "Industry",
};

interface ProjectCardProps {
  workspace: Workspace;
  index: number;
}

export function ProjectCard({ workspace, index }: ProjectCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const template = getTemplateById(workspace.templateId);
  const category = template?.category ?? "document";

  const enabledFeatures = template
    ? Object.entries(template.defaultConfig.features)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .slice(0, 3)
    : [];

  function handleDeleteClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirmDelete) {
      setConfirmDelete(true);
      // Auto-cancel confirm after 3 seconds
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    startTransition(async () => {
      const result = await deleteProject(workspace.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Project deleted");
        router.refresh();
      }
      setConfirmDelete(false);
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, delay: index * 0.04 }}
      className="relative group/card"
    >
      <Link
        href={`/workspace/${workspace.id}`}
        className={cn(
          "flex flex-col justify-between rounded-xl border border-border bg-card",
          "p-5 h-full hover:border-border/80 hover:bg-card/80 transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        )}
      >
        {/* Top */}
        <div className="mb-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center rounded-md bg-secondary border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                Web SDK
              </span>
              <span className="inline-flex items-center rounded-md bg-secondary border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {categoryLabels[category] ?? category}
              </span>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover/card:opacity-100 transition-opacity" />
          </div>

          <h3 className="text-sm font-semibold text-foreground leading-snug mb-1.5 line-clamp-2">
            {workspace.name}
          </h3>

          {template && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {template.description}
            </p>
          )}
        </div>

        {/* Bottom */}
        <div className="space-y-2.5">
          {enabledFeatures.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {enabledFeatures.map((f) => (
                <span
                  key={f}
                  className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground border border-border/50"
                >
                  {f}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatRelativeTime(workspace.updatedAt)}</span>
          </div>
        </div>
      </Link>

      {/* Delete button - appears on hover */}
      <button
        onClick={handleDeleteClick}
        disabled={isPending}
        title={confirmDelete ? "Click again to confirm" : "Delete project"}
        className={cn(
          "absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium",
          "opacity-0 group-hover/card:opacity-100 transition-all duration-150",
          "focus-visible:opacity-100 focus-visible:outline-none",
          confirmDelete
            ? "bg-red-500/15 border border-red-500/40 text-red-400 opacity-100"
            : "bg-background/80 border border-border text-muted-foreground hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5"
        )}
      >
        {isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Trash2 className="h-3 w-3" />
        )}
        {confirmDelete && <span>Confirm?</span>}
      </button>
    </motion.div>
  );
}

export function ProjectsEmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card mb-5">
        <Layers className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-2">No projects yet</h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-6 leading-relaxed">
        Create your first project to start building live Nutrient Web SDK demos.
      </p>
      <button
        onClick={onCreateClick}
        className="flex items-center gap-2 hover:opacity-85 text-sm font-medium px-5 py-2.5 rounded-lg transition-opacity"
        style={{ background: "#c4a882", color: "#1a1414" }}
      >
        <ArrowRight className="h-4 w-4" />
        Create first project
      </button>
    </motion.div>
  );
}
