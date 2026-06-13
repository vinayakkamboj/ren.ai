"use client";

import { useEffect, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useWorkspaceStore } from "@/features/workspaces/store";
import { TopBar } from "@/components/workspace/TopBar";
import { AISidebar } from "@/components/workspace/AISidebar";
import { LiveViewer } from "@/components/workspace/LiveViewer";
import { FileTree } from "@/components/workspace/FileTree";
import { MonacoEditorPanel } from "@/components/workspace/MonacoEditorPanel";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LayoutPanelLeft, Eye, Code2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Workspace, Template, ProjectFile } from "@/types";

interface WorkspaceClientProps {
  workspace: Workspace;
  template: Template;
  projectFiles: ProjectFile[];
  seededFromTemplate?: boolean;
}

type CenterView = "editor" | "preview" | "split";

export function WorkspaceClient({ workspace, template, projectFiles, seededFromTemplate }: WorkspaceClientProps) {
  const initialize = useWorkspaceStore((s) => s.initialize);
  const loadMessages = useWorkspaceStore((s) => s.loadMessages);
  const [centerView, setCenterView] = useState<CenterView>("preview");
  const [showFileTree, setShowFileTree] = useState(true);

  useEffect(() => {
    initialize(workspace, template, projectFiles);
    loadMessages(workspace.id);

    // Seed template files to DB only for genuinely brand-new workspaces (< 3 min old).
    // Skip seeding for older workspaces - their DB files may be missing due to a
    // transient load error, and running PATCH (upsert) would overwrite AI-generated
    // content that does exist in the database.
    if (seededFromTemplate) {
      const ageMs = Date.now() - new Date(workspace.createdAt).getTime();
      const isNewWorkspace = ageMs < 3 * 60 * 1000;
      if (isNewWorkspace) {
        // eslint-disable-next-line no-console
        console.log("[Workspace] New workspace - seeding template files to DB…", projectFiles.map((f) => f.path));
        projectFiles.forEach((file) => {
          fetch("/api/project-files", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ workspaceId: workspace.id, path: file.path, content: file.content }),
          }).catch((err) => {
            // eslint-disable-next-line no-console
            console.error("[Workspace] Failed to seed template file:", file.path, err);
          });
        });
      } else {
        // eslint-disable-next-line no-console
        console.warn("[Workspace] DB returned 0 files for an existing workspace - showing template in memory only, NOT seeding to DB to avoid overwriting AI files.");
      }
    }
  }, [workspace.id, template.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <TooltipProvider delayDuration={400}>
      <div className="flex flex-col h-screen bg-[#1a1414] overflow-hidden">
        <TopBar />

        {/* Center view toggle */}
        <div className="flex items-center justify-center gap-0.5 h-8 border-b border-[#2a2222] bg-[#1a1414] shrink-0">
          <ViewToggle
            active={centerView === "editor"}
            onClick={() => setCenterView("editor")}
            icon={<Code2 className="h-3 w-3" />}
            label="Editor"
          />
          <ViewToggle
            active={centerView === "split"}
            onClick={() => setCenterView("split")}
            icon={<LayoutPanelLeft className="h-3 w-3" />}
            label="Split"
          />
          <ViewToggle
            active={centerView === "preview"}
            onClick={() => setCenterView("preview")}
            icon={<Eye className="h-3 w-3" />}
            label="Preview"
          />
        </div>

        <div className="flex-1 min-h-0">
          <PanelGroup direction="horizontal" className="h-full">
            {/* Left: AI sidebar */}
            <Panel defaultSize={24} minSize={18} maxSize={38} className="h-full">
              <AISidebar />
            </Panel>

            <PanelResizeHandle className="w-px bg-[#2a2222] hover:bg-zinc-600/40 transition-colors data-[resize-handle-active]:bg-zinc-500/60 cursor-col-resize" />

            {/* Center: Editor (hidden in preview-only mode) */}
            {centerView !== "preview" && (
              <>
                <Panel
                  defaultSize={centerView === "editor" ? 76 : 38}
                  minSize={24}
                  maxSize={centerView === "editor" ? 82 : 60}
                  className="h-full"
                >
                  <div className="flex h-full">
                    {/* File tree */}
                    {showFileTree && (
                      <div className="w-64 shrink-0">
                        <FileTree />
                      </div>
                    )}
                    {/* Monaco */}
                    <div className="flex-1 min-w-0">
                      <MonacoEditorPanel />
                    </div>
                  </div>
                </Panel>

                {centerView === "split" && (
                  <PanelResizeHandle className="w-px bg-[#2a2222] hover:bg-zinc-600/40 transition-colors data-[resize-handle-active]:bg-zinc-500/60 cursor-col-resize" />
                )}
              </>
            )}

            {/* Right: Nutrient preview */}
            {centerView !== "editor" && (
              <Panel
                defaultSize={centerView === "preview" ? 76 : 38}
                minSize={24}
                className="h-full"
              >
                <LiveViewer />
              </Panel>
            )}
          </PanelGroup>
        </div>
      </div>
    </TooltipProvider>
  );
}

function ViewToggle({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] transition-colors",
        active
          ? "bg-white/8 text-zinc-200"
          : "text-zinc-600 hover:text-zinc-400 hover:bg-white/4"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
