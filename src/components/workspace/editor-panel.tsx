"use client";

/**
 * Editor panel — Monaco bound to the active project file. Edits update the
 * workspace store (and persist), and the user can re-run the preview to see
 * manual changes.
 */

import { useMemo } from "react";
import Editor from "@monaco-editor/react";
import { useWorkspaceStore } from "@/lib/builder/store";

function languageFor(path: string): string {
  if (path.endsWith(".tsx") || path.endsWith(".ts")) return "typescript";
  if (path.endsWith(".jsx") || path.endsWith(".js")) return "javascript";
  if (path.endsWith(".css")) return "css";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".md")) return "markdown";
  if (path.endsWith(".html")) return "html";
  return "plaintext";
}

export function EditorPanel() {
  const activeFile = useWorkspaceStore((s) => s.activeFile);
  const projectFiles = useWorkspaceStore((s) => s.projectFiles);
  const updateFileContent = useWorkspaceStore((s) => s.updateFileContent);
  const refreshViewer = useWorkspaceStore((s) => s.refreshViewer);

  const file = useMemo(
    () => projectFiles.find((f) => f.path === activeFile) ?? null,
    [projectFiles, activeFile],
  );

  if (!file) {
    return (
      <div className="flex h-full items-center justify-center bg-carbon text-[13px] text-dusk-faint">
        Select a file to view its source.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-carbon">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-carbon-line px-3">
        <span className="font-mono text-[12px] text-dusk-muted">{file.path}</span>
        <button
          onClick={refreshViewer}
          className="rounded-md px-2 py-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-dusk-faint transition-colors hover:text-brass"
        >
          Run
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <Editor
          key={file.path}
          height="100%"
          theme="vs-dark"
          language={languageFor(file.path)}
          value={file.content}
          onChange={(value) => updateFileContent(file.path, value ?? "")}
          options={{
            fontSize: 12.5,
            fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            padding: { top: 12 },
            lineNumbersMinChars: 3,
            renderLineHighlight: "none",
            smoothScrolling: true,
            tabSize: 2,
          }}
        />
      </div>
    </div>
  );
}
