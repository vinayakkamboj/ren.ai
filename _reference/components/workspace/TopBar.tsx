"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Share2,
  Loader2,
  Check,
  Download,
  Trash2,
  MoreHorizontal,
  GitBranch,
  Save,
  Bookmark,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspaceStore } from "@/features/workspaces/store";
import { createDeployment, deleteWorkspace, saveAsCustomTemplate } from "@/features/workspaces/actions";
import { GitHubPushDialog } from "@/components/workspace/GitHubPushDialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function TopBar() {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const template = useWorkspaceStore((s) => s.template);
  const config = useWorkspaceStore((s) => s.config);
  const projectFiles = useWorkspaceStore((s) => s.projectFiles);
  const changedFilePaths = useWorkspaceStore((s) => s.changedFilePaths);
  const markFilesSaved = useWorkspaceStore((s) => s.markFilesSaved);

  const [isSharing, setIsSharing] = useState(false);
  const [sharedUrl, setSharedUrl] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [githubDialogOpen, setGithubDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();

  const hasPendingChanges = changedFilePaths.length > 0;

  useEffect(() => {
    if (searchParams.get("githubDialog") !== "1") return;
    setGithubDialogOpen(true);
    router.replace(window.location.pathname, { scroll: false });
  }, [router, searchParams]);

  async function handleSave() {
    if (!workspace || !config) return;
    setIsSaving(true);
    try {
      const pathsToSave = [...changedFilePaths];

      await Promise.all([
        // Save workspace config
        fetch(`/api/workspaces/${workspace.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config }),
        }).then((r) => { if (!r.ok) throw new Error("Failed to save config"); }),

        // Save any unsaved files
        ...projectFiles
          .filter((f) => pathsToSave.includes(f.path))
          .map((f) =>
            fetch("/api/project-files", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ workspaceId: workspace.id, path: f.path, content: f.content }),
            }).then((r) => { if (!r.ok) throw new Error(`Failed to save ${f.path}`); })
          ),
      ]);

      markFilesSaved(pathsToSave);
      setSavedAt(Date.now());
      toast.success("Project saved");
    } catch {
      toast.error("Save failed");
    }
    setIsSaving(false);
  }

  async function handleShare() {
    if (!workspace || !config) return;
    setIsSharing(true);
    const result = await createDeployment(workspace.id, config, projectFiles);
    if ("error" in result) {
      toast.error(result.error);
      setIsSharing(false);
      return;
    }
    const url = `${window.location.origin}/share/${result.shareToken}`;
    setSharedUrl(url);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied to clipboard");
    } catch {
      toast.success("Demo shared", { description: url });
    }
    setIsSharing(false);
  }

  async function handleExportZip() {
    if (!projectFiles.length) return;
    setIsExporting(true);
    try {
      const { zipFiles } = await import("@/lib/project-files/zip-export");
      // Pre-wire the backend connection so the downloaded repo works out of the box.
      const backend = config?.backend;
      const backendInfo =
        backend?.mode === "custom" && backend.customBackendUrl?.trim()
          ? { url: backend.customBackendUrl.trim() }
          : workspace
            ? { url: `${window.location.origin}/api/backend-proxy/${workspace.id}`, token: backend?.demoToken }
            : null;
      await zipFiles(projectFiles, workspace?.name ?? "nutrient-demo", backendInfo);
      toast.success("Project exported as ZIP");
    } catch {
      toast.error("Export failed");
    }
    setIsExporting(false);
  }

  async function handleSaveAsTemplate() {
    if (!workspace || !templateName.trim()) return;
    setIsSavingTemplate(true);
    const result = await saveAsCustomTemplate(workspace.id, templateName.trim());
    setIsSavingTemplate(false);
    if ("error" in result && result.error) {
      toast.error(result.error);
    } else {
      toast.success("Saved as template");
      setTemplateDialogOpen(false);
      setTemplateName("");
    }
  }

  function handleDelete() {
    if (!workspace) return;
    if (!confirm(`Delete "${workspace.name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      await deleteWorkspace(workspace.id);
    });
  }

  const showSavedCheck = savedAt !== null && Date.now() - savedAt < 3000;

  return (
    <header className="h-11 border-b border-[#2a2222] bg-[#1a1414] flex items-center justify-between px-4 shrink-0 gap-4">
      {/* Left */}
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href="/"
          className="text-zinc-600 hover:text-zinc-300 transition-colors shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div className="w-px h-3.5 bg-[#222]" />

        <div className="hidden md:flex items-center shrink-0">
          <span
            style={{
              fontFamily: "'Satoshi', var(--font-geist-sans), sans-serif",
              fontSize: 17,
              fontWeight: 700,
              color: "#f4f4f5",
              letterSpacing: "-0.03em",
              lineHeight: 1,
            }}
          >
            Nucode
          </span>
        </div>

        <div className="hidden md:block w-px h-3.5 bg-[#222]" />

        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-zinc-200 truncate leading-none">
            {workspace?.name ?? "Loading…"}
          </span>
          {template && (
            <span className="hidden lg:block text-[11px] text-zinc-600 border border-[#222] rounded px-1.5 py-0.5 shrink-0 font-mono">
              {template.category}
            </span>
          )}
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Save button - manual flush; auto-save runs in background */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
          className={cn(
            "h-7 gap-1.5 text-xs border transition-all",
            hasPendingChanges && !isSaving
              ? "text-zinc-100 border-zinc-600 hover:bg-white/8 hover:border-zinc-500"
              : "text-zinc-500 border-transparent hover:text-zinc-200 hover:bg-white/5 hover:border-[#222]"
          )}
        >
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : showSavedCheck ? (
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:block">
            {isSaving ? "Saving…" : showSavedCheck ? "Saved" : "Save"}
          </span>
          {hasPendingChanges && !isSaving && !showSavedCheck && (
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleExportZip}
          disabled={isExporting || !projectFiles.length}
          className="h-7 gap-1.5 text-xs text-zinc-500 hover:text-zinc-200 hover:bg-white/5 border border-transparent hover:border-[#222]"
        >
          {isExporting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:block">Export</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleShare}
          disabled={isSharing}
          className={cn(
            "h-7 gap-1.5 text-xs",
            sharedUrl
              ? "text-emerald-400 hover:text-emerald-300"
              : "text-zinc-300 hover:text-zinc-100",
            "hover:bg-white/5 border border-transparent hover:border-[#222]"
          )}
        >
          {isSharing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : sharedUrl ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Share2 className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:block">{sharedUrl ? "Shared" : "Share"}</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-600 hover:text-zinc-300 hover:bg-white/5"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 bg-[#211a1a] border-[#332b2b]">
            {sharedUrl && (
              <>
                <DropdownMenuItem
                  onClick={() => {
                    navigator.clipboard.writeText(sharedUrl);
                    toast.success("Copied");
                  }}
                  className="text-xs text-zinc-400 hover:text-zinc-100 focus:text-zinc-100"
                >
                  Copy share URL
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#222]" />
              </>
            )}
            <DropdownMenuItem
              onClick={() => {
                setTemplateName(workspace?.name ?? "");
                setTemplateDialogOpen(true);
              }}
              className="text-xs text-zinc-400 hover:text-zinc-100 focus:text-zinc-100 gap-2"
            >
              <Bookmark className="h-3.5 w-3.5" />
              Save as template
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#222]" />
            <DropdownMenuItem
              onClick={() => setGithubDialogOpen(true)}
              className="text-xs text-zinc-400 hover:text-zinc-100 focus:text-zinc-100 gap-2"
            >
              <GitBranch className="h-3.5 w-3.5" />
              Push to GitHub
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#222]" />
            <DropdownMenuItem
              onClick={handleDelete}
              disabled={isPending}
              className="text-xs text-red-400 hover:text-red-300 focus:text-red-300 gap-2"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <GitHubPushDialog
        open={githubDialogOpen}
        onClose={() => setGithubDialogOpen(false)}
        workspace={workspace}
        projectFiles={projectFiles}
      />

      {templateDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setTemplateDialogOpen(false)} />
          <div className="relative z-10 w-full max-w-sm mx-4 bg-[#1a1414] border border-[#2a2222] rounded-xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-zinc-100">Save as template</p>
              <button onClick={() => setTemplateDialogOpen(false)} className="text-zinc-600 hover:text-zinc-300">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-500 mb-3">Give this template a name. It will appear in your dashboard under &quot;My Templates&quot;.</p>
            <input
              type="text"
              autoFocus
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveAsTemplate()}
              placeholder="e.g. Construction Field Ops"
              className="w-full bg-[#211a1a] border border-[#332b2b] rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setTemplateDialogOpen(false)}
                className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAsTemplate}
                disabled={!templateName.trim() || isSavingTemplate}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "#c4a882", color: "#1a1414" }}
              >
                {isSavingTemplate && <Loader2 className="h-3 w-3 animate-spin" />}
                Save template
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
