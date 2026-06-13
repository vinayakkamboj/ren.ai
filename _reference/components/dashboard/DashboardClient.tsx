"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2, ArrowRight } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { ProjectCard, ProjectsEmptyState } from "./ProjectCard";
import { CreateProjectDialog } from "./CreateProjectDialog";
import { CreationProgress } from "./CreationProgress";
import { createWorkspace, createWorkspaceFromCustomTemplate } from "@/features/workspaces/actions";
import { useTypewriterLoop } from "@/hooks/useTypewriter";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Workspace } from "@/types";

interface DashboardClientProps {
  workspaces: Workspace[];
}

type CustomTemplateWorkspace = Workspace & { config: Workspace["config"] & { isCustomTemplate?: boolean; customTemplateName?: string } };

export function DashboardClient({ workspaces }: DashboardClientProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [useTemplateDialogOpen, setUseTemplateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CustomTemplateWorkspace | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [isCreatingFromTemplate, startCreatingFromTemplate] = useTransition();

  const customTemplates = workspaces.filter(
    (w) => (w.config as CustomTemplateWorkspace["config"]).isCustomTemplate
  ) as CustomTemplateWorkspace[];
  const projects = workspaces.filter(
    (w) => !(w.config as CustomTemplateWorkspace["config"]).isCustomTemplate
  );


  function handleUseTemplate(tmpl: CustomTemplateWorkspace) {
    setSelectedTemplate(tmpl);
    setNewProjectName(`${(tmpl.config.customTemplateName ?? tmpl.name)} copy`);
    setUseTemplateDialogOpen(true);
  }

  function handleCreateFromTemplate() {
    if (!selectedTemplate || !newProjectName.trim()) return;
    startCreatingFromTemplate(async () => {
      try {
        const result = await createWorkspaceFromCustomTemplate(selectedTemplate.id, newProjectName.trim());
        if ("workspaceId" in result) {
          setUseTemplateDialogOpen(false);
          router.push(`/workspace/${result.workspaceId}`);
        } else {
          toast.error(result.error);
        }
      } catch {
        toast.error("Could not create project from template.");
      }
    });
  }

  const count = projects.length;
  const { displayed, cursorVisible } = useTypewriterLoop("Nucode");

  return (
    <>
      {/* Hero wordmark */}
      <div className="mb-10">
        <p
          className="text-[11px] uppercase tracking-[0.2em] font-semibold mb-3"
          style={{ color: "#52403f" }}
        >
          Your workspace
        </p>
        <div
          style={{
            fontFamily: "'Satoshi', var(--font-geist-sans), sans-serif",
            fontSize: "clamp(56px, 10vw, 96px)",
            fontWeight: 700,
            color: "#f4f4f5",
            letterSpacing: "-0.05em",
            lineHeight: 0.9,
            minHeight: "1em",
          }}
        >
          {displayed}
          <span
            style={{
              display: "inline-block",
              width: 4,
              height: "0.8em",
              background: "#c4a882",
              marginLeft: 5,
              verticalAlign: "middle",
              borderRadius: 2,
              opacity: cursorVisible ? 1 : 0,
              transition: "opacity 0.1s",
            }}
          />
        </div>
        <p className="text-sm mt-4" style={{ color: "#52403f" }}>
          Build, demo, and ship - all your Nutrient projects in one place.
        </p>
      </div>

      {/* Projects section heading */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-sm font-semibold text-foreground tracking-tight">
            Saved projects
            {count > 0 && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {count}
              </span>
            )}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {count === 0
              ? "No projects yet"
              : `${count} project${count !== 1 ? "s" : ""} - click to open`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-1.5 hover:opacity-85 text-xs font-semibold px-4 py-2 rounded-lg transition-opacity"
            style={{ background: "#c4a882", color: "#1a1414" }}
          >
            <Plus className="h-3.5 w-3.5" />
            New project
          </button>
        </div>
      </div>

      {/* Projects */}
      {count === 0 ? (
        <ProjectsEmptyState onCreateClick={() => setDialogOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((w, i) => (
            <ProjectCard key={w.id} workspace={w} index={i} />
          ))}
        </div>
      )}

      {/* My Templates section */}
      {customTemplates.length > 0 && (
        <div className="mt-10">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-foreground tracking-tight">
              My templates
              <span className="ml-2 text-xs font-normal text-muted-foreground">{customTemplates.length}</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Saved from your custom projects - open or use to start a new project</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {customTemplates.map((tmpl) => (
              <div
                key={tmpl.id}
                className="rounded-xl border border-[#2a2222] bg-[#1a1414] p-4 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-200 truncate">
                      {tmpl.config.customTemplateName ?? tmpl.name}
                    </p>
                    <p className="text-[11px] text-zinc-600 mt-0.5">
                      Saved {new Date(tmpl.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <span className="shrink-0 inline-flex items-center rounded bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 text-[10px] font-medium text-indigo-400">
                    Template
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`/workspace/${tmpl.id}`}
                    className="flex-1 text-center text-[11px] text-zinc-500 hover:text-zinc-200 border border-[#2a2222] hover:border-[#3a3333] rounded-md py-1.5 transition-colors"
                  >
                    Open
                  </a>
                  <button
                    onClick={() => handleUseTemplate(tmpl)}
                    className="flex-1 flex items-center justify-center gap-1 text-[11px] rounded-md py-1.5 transition-colors hover:opacity-85"
                    style={{ background: "#c4a882", color: "#1a1414" }}
                  >
                    Use
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New project dialog */}
      <AnimatePresence>
        {dialogOpen && (
          <CreateProjectDialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            customTemplates={customTemplates}
          />
        )}
      </AnimatePresence>


      {/* Use template → create copy dialog */}
      {useTemplateDialogOpen && selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setUseTemplateDialogOpen(false)} />
          <div className="relative z-10 w-full max-w-sm mx-4 bg-[#1a1414] border border-[#2a2222] rounded-xl p-5 shadow-2xl">
            <p className="text-sm font-semibold text-zinc-100 mb-1">
              New project from &quot;{selectedTemplate.config.customTemplateName ?? selectedTemplate.name}&quot;
            </p>
            <p className="text-xs text-zinc-500 mb-4">Name the new project.</p>
            <CreationProgress
              className="mb-4"
              steps={["Name", "Template", "Create"]}
              activeIndex={isCreatingFromTemplate ? 2 : 1}
              isLoading={isCreatingFromTemplate}
              loadingLabel="Creating project from saved template..."
            />
            <input
              type="text"
              autoFocus
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateFromTemplate()}
              placeholder="Project name"
              className="w-full bg-[#211a1a] border border-[#332b2b] rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setUseTemplateDialogOpen(false)}
                className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFromTemplate}
                disabled={!newProjectName.trim() || isCreatingFromTemplate}
                className={cn("flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg transition-all")}
                style={newProjectName.trim() && !isCreatingFromTemplate
                  ? { background: "#c4a882", color: "#1a1414" }
                  : { background: "#2a2222", color: "#52403f", cursor: "not-allowed" }
                }
              >
                {isCreatingFromTemplate && <Loader2 className="h-3 w-3 animate-spin" />}
                {isCreatingFromTemplate ? "Creating..." : "Create project"}
                {!isCreatingFromTemplate && <ArrowRight className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
