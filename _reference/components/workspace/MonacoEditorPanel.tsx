"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Check, FileCode, FileJson, FileText, Loader2, Lock, Save } from "lucide-react";
import { useWorkspaceStore } from "@/features/workspaces/store";
import { saveWorkspaceConfig } from "@/features/workspaces/actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((m) => m.default),
  { ssr: false, loading: () => <EditorSkeleton /> }
);

function EditorSkeleton() {
  return (
    <div className="h-full w-full bg-[#1a1414] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-5 w-5 rounded border border-[#332b2b] animate-pulse bg-[#2a2222]" />
        <div className="text-xs text-zinc-700">Loading editor…</div>
      </div>
    </div>
  );
}

function fileIcon(path: string) {
  const ext = path.split(".").pop()?.toLowerCase();
  const cls = "h-3.5 w-3.5 shrink-0";
  if (ext === "json") return <FileJson className={cn(cls, "text-amber-400/80")} />;
  if (["ts", "tsx", "js", "jsx"].includes(ext ?? ""))
    return <FileCode className={cn(cls, "text-sky-400/70")} />;
  return <FileText className={cn(cls, "text-zinc-400")} />;
}

export function MonacoEditorPanel() {
  const projectFiles = useWorkspaceStore((s) => s.projectFiles);
  const activeFilePath = useWorkspaceStore((s) => s.activeFilePath);
  const changedFilePaths = useWorkspaceStore((s) => s.changedFilePaths);
  const updateFileContent = useWorkspaceStore((s) => s.updateFileContent);
  const markFilesSaved = useWorkspaceStore((s) => s.markFilesSaved);
  const workspace = useWorkspaceStore((s) => s.workspace);
  const config = useWorkspaceStore((s) => s.config);

  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const activeFile = projectFiles.find((f) => f.path === activeFilePath);
  const isChanged = activeFilePath ? changedFilePaths.includes(activeFilePath) : false;
  const showSavedCheck = savedAt !== null && Date.now() - savedAt < 2500;

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (!activeFilePath || value === undefined || activeFile?.isSystem) return;
      updateFileContent(activeFilePath, value);
      setSavedAt(null);
    },
    [activeFilePath, activeFile?.isSystem, updateFileContent]
  );

  const handleSave = useCallback(async () => {
    if (!workspace?.id || !config || !activeFile || activeFile.isSystem || isSaving) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/project-files", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspace.id,
          path: activeFile.path,
          content: activeFile.content,
        }),
      });
      if (!response.ok) throw new Error("Project file save failed.");
      await saveWorkspaceConfig(workspace.id, config);
      markFilesSaved([activeFile.path]);
      setSavedAt(Date.now());
      toast.success("File saved", { description: "Preview refreshed." });
    } catch {
      toast.error("File save failed");
    } finally {
      setIsSaving(false);
    }
  }, [activeFile, config, isSaving, markFilesSaved, workspace?.id]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void handleSave();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave]);

  if (!activeFile) {
    return (
      <div className="h-full w-full bg-[#1a1414] flex flex-col items-center justify-center gap-3">
        <FileJson className="h-8 w-8 text-zinc-800" />
        <p className="text-xs text-zinc-700">Select a file from the tree</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#1a1414]">
      {/* Editor tab bar */}
      <div className="flex items-center h-9 border-b border-[#2a2222] bg-[#1a1414] px-2 gap-1 shrink-0">
        <div
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-t text-xs border-b-2 transition-colors",
            "bg-[#211a1a] border-zinc-500 text-zinc-200"
          )}
        >
          {fileIcon(activeFile.path)}
          <span className="max-w-[160px] truncate">{activeFile.path.split("/").pop()}</span>
          {isChanged && <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />}
          {activeFile.isSystem && <Lock className="h-2.5 w-2.5 text-zinc-600 shrink-0" />}
        </div>
        <button
          onClick={handleSave}
          disabled={activeFile.isSystem || isSaving || !isChanged}
          className={cn(
            "ml-auto inline-flex h-6 items-center gap-1.5 rounded-md border px-2 text-[11px] transition-colors",
            activeFile.isSystem || !isChanged
              ? "border-[#2a2222] text-zinc-700"
              : "border-[#3a3030] text-zinc-300 hover:border-zinc-500 hover:text-zinc-100"
          )}
        >
          {isSaving ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : showSavedCheck ? (
            <Check className="h-3 w-3 text-emerald-400" />
          ) : (
            <Save className="h-3 w-3" />
          )}
          {isSaving ? "Saving" : showSavedCheck ? "Saved" : "Save"}
        </button>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 px-4 h-7 border-b border-[#2a2222] shrink-0">
        {activeFile.path.split("/").map((part, i, arr) => (
          <span key={i} className="flex items-center gap-1.5">
            <span
              className={cn(
                "text-[11px]",
                i === arr.length - 1 ? "text-zinc-400" : "text-zinc-600"
              )}
            >
              {part}
            </span>
            {i < arr.length - 1 && (
              <span className="text-zinc-700 text-[11px]">/</span>
            )}
          </span>
        ))}
        {activeFile.isSystem && (
          <span className="ml-auto text-[10px] text-zinc-700 flex items-center gap-1">
            <Lock className="h-2.5 w-2.5" /> read-only
          </span>
        )}
      </div>

      {/* Monaco */}
      <div className="flex-1 min-h-0">
        <MonacoEditor
          key={activeFile.path}
          value={activeFile.content}
          language={activeFile.language}
          theme="vs-dark"
          onChange={handleChange}
          options={{
            readOnly: activeFile.isSystem,
            fontSize: 12.5,
            lineHeight: 20,
            fontFamily: "'Geist Mono', 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
            fontLigatures: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            padding: { top: 16, bottom: 16 },
            lineNumbers: "on",
            renderLineHighlight: "line",
            cursorBlinking: "smooth",
            smoothScrolling: true,
            tabSize: 2,
            wordWrap: "on",
            bracketPairColorization: { enabled: true },
            guides: { bracketPairs: true },
            scrollbar: {
              verticalScrollbarSize: 4,
              horizontalScrollbarSize: 4,
            },
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
          }}
        />
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between h-5 px-4 bg-[#1a1414] border-t border-[#2a2222] shrink-0">
        <span className="text-[10px] text-zinc-700 uppercase tracking-widest">
          {activeFile.language}
        </span>
        {isChanged && (
          <span className="text-[10px] text-blue-500">● unsaved changes</span>
        )}
      </div>
    </div>
  );
}
