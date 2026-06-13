"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, ArrowLeft, Loader2, FolderPlus, Check, BookMarked } from "lucide-react";
import { createWorkspace, createWorkspaceFromCustomTemplate } from "@/features/workspaces/actions";
import { getAllTemplates } from "@/features/templates/registry";
import { CreationProgress } from "./CreationProgress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Template, Workspace } from "@/types";

type CustomTemplateWorkspace = Workspace & {
  config: Workspace["config"] & { isCustomTemplate?: boolean; customTemplateName?: string };
};

type SelectedTemplate =
  | { type: "registry"; template: Template }
  | { type: "custom"; workspace: CustomTemplateWorkspace }
  | null;

interface CreateProjectDialogProps {
  open: boolean;
  onClose: () => void;
  customTemplates?: CustomTemplateWorkspace[];
}

const categoryLabels: Record<string, string> = {
  document: "Viewer",
  forms: "Forms",
  collaboration: "Collab",
  workflow: "Workflow",
  industry: "Industry",
  sdk: "Server SDK",
};

export function CreateProjectDialog({ open, onClose, customTemplates = [] }: CreateProjectDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<"name" | "template">("name");
  const [projectName, setProjectName] = useState("");
  const [selected, setSelected] = useState<SelectedTemplate>(null);

  const registryTemplates = getAllTemplates();

  function handleClose() {
    if (isPending) return;
    onClose();
    setTimeout(() => {
      setStep("name");
      setProjectName("");
      setSelected(null);
    }, 200);
  }

  function handleNameNext() {
    if (!projectName.trim()) return;
    setStep("template");
  }

  function handleCreate() {
    if (!selected || !projectName.trim()) return;
    startTransition(async () => {
      try {
        let result: { workspaceId: string } | { error: string };
        if (selected.type === "registry") {
          result = await createWorkspace(selected.template.id, projectName.trim());
        } else {
          result = await createWorkspaceFromCustomTemplate(selected.workspace.id, projectName.trim());
        }
        if ("workspaceId" in result) {
          handleClose();
          router.push(`/workspace/${result.workspaceId}`);
        } else {
          toast.error(result.error);
        }
      } catch {
        toast.error("Could not create project. Check your setup.");
      }
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="relative z-10 w-full max-w-lg mx-4"
      >
        <div className="bg-[#1a1414] border border-[#2a2222] rounded-2xl overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#2a2222]">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 border border-[#2a2a2a]">
                <FolderPlus className="h-3.5 w-3.5 text-zinc-400" />
              </div>
              <span className="text-sm font-semibold text-zinc-100">New project</span>
            </div>
            <button
              onClick={handleClose}
              disabled={isPending}
              className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-6 pt-4">
            <CreationProgress
              steps={["Name", "Template", "Create"]}
              activeIndex={isPending ? 2 : step === "name" ? 0 : 1}
              isLoading={isPending}
              loadingLabel={
                selected?.type === "custom"
                  ? "Creating project from saved template..."
                  : "Creating project from selected template..."
              }
            />
          </div>

          {/* Step content */}
          <div className="px-6 py-5">
            <AnimatePresence mode="wait">
              {step === "name" && (
                <motion.div
                  key="name"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-4"
                >
                  <div>
                    <p className="text-xs text-zinc-500 mb-3">
                      Give your project a name - you can always rename it later.
                    </p>
                    <input
                      type="text"
                      autoFocus
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleNameNext()}
                      placeholder="e.g. HealthCo Enterprise Demo"
                      className="w-full bg-[#211a1a] border border-[#332b2b] rounded-lg px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 transition-colors"
                    />
                  </div>
                </motion.div>
              )}

              {step === "template" && (
                <motion.div
                  key="template"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-3"
                >
                  <p className="text-xs text-zinc-500">
                    Choose a starting point for your project.
                  </p>

                  <div className="max-h-[340px] overflow-y-auto pr-1 space-y-4">
                    {/* Saved templates */}
                    {customTemplates.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <BookMarked className="h-3 w-3 text-indigo-400" />
                          <span className="text-[11px] font-medium text-indigo-400 uppercase tracking-wider">Saved templates</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {customTemplates.map((tmpl) => {
                            const isSelected = selected?.type === "custom" && selected.workspace.id === tmpl.id;
                            return (
                              <button
                                key={tmpl.id}
                                onClick={() => setSelected({ type: "custom", workspace: tmpl })}
                                className={cn(
                                  "relative text-left rounded-xl border p-3.5 transition-all duration-150",
                                  isSelected
                                    ? "border-indigo-500/60 bg-indigo-500/10"
                                    : "border-[#332b2b] bg-[#211a1a] hover:border-[#463735] hover:bg-[#241d1d]"
                                )}
                              >
                                {isSelected && (
                                  <div className="absolute top-2.5 right-2.5 h-4 w-4 rounded-full bg-indigo-400 flex items-center justify-center">
                                    <Check className="h-2.5 w-2.5 text-white" />
                                  </div>
                                )}
                                <div className="mb-1.5">
                                  <span className="inline-flex items-center rounded bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 text-[10px] font-medium text-indigo-400">
                                    Saved
                                  </span>
                                </div>
                                <p className="text-xs font-semibold text-zinc-200 leading-snug mb-1">
                                  {tmpl.config.customTemplateName ?? tmpl.name}
                                </p>
                                <p className="text-[11px] text-zinc-600 leading-relaxed">
                                  Saved {new Date(tmpl.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Registry templates */}
                    <div>
                      {customTemplates.length > 0 && (
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Web SDK templates</span>
                          <div className="flex-1 h-px bg-[#2a2222]" />
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        {registryTemplates.map((t) => {
                          const isSelected = selected?.type === "registry" && selected.template.id === t.id;
                          const isComingSoon = Boolean(t.comingSoon);
                          return (
                            <button
                              key={t.id}
                              disabled={isComingSoon}
                              onClick={() => {
                                if (!isComingSoon) setSelected({ type: "registry", template: t });
                              }}
                              className={cn(
                                "relative text-left rounded-xl border p-3.5 transition-all duration-150",
                                isComingSoon
                                  ? "border-[#2a2222] bg-[#1d1717] opacity-60 cursor-not-allowed"
                                  : isSelected
                                    ? "border-zinc-500 bg-zinc-800/50"
                                    : "border-[#332b2b] bg-[#211a1a] hover:border-[#463735] hover:bg-[#241d1d]"
                              )}
                            >
                              {isSelected && !isComingSoon && (
                                <div className="absolute top-2.5 right-2.5 h-4 w-4 rounded-full bg-zinc-200 flex items-center justify-center">
                                  <Check className="h-2.5 w-2.5 text-zinc-900" />
                                </div>
                              )}
                              <div className="mb-2 flex items-center gap-1.5">
                                <span className="inline-flex items-center rounded bg-[#222] border border-[#2f2f2f] px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                                  {categoryLabels[t.category] ?? t.category}
                                </span>
                                {isComingSoon && (
                                  <span className="inline-flex items-center rounded bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 text-[10px] font-medium text-amber-500">
                                    Coming soon
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-semibold text-zinc-200 leading-snug mb-1">
                                {t.name}
                              </p>
                              <p className="text-[11px] text-zinc-600 leading-relaxed line-clamp-2">
                                {t.description}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 pb-5">
            {step === "template" ? (
              <button
                onClick={() => setStep("name")}
                disabled={isPending}
                className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
            ) : (
              <div />
            )}

            {step === "name" ? (
              <button
                onClick={handleNameNext}
                disabled={!projectName.trim()}
                className={cn("flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-lg transition-all")}
                style={projectName.trim()
                  ? { background: "#c4a882", color: "#1a1414" }
                  : { background: "#2a2222", color: "#52403f", cursor: "not-allowed" }
                }
              >
                Next
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                onClick={handleCreate}
                disabled={!selected || isPending}
                className={cn("flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-lg transition-all")}
                style={selected && !isPending
                  ? { background: "#c4a882", color: "#1a1414" }
                  : { background: "#2a2222", color: "#52403f", cursor: "not-allowed" }
                }
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    Create project
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
