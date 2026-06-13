"use client";

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type {
  Workspace,
  WorkspaceConfig,
  AIMessage,
  AIActionPlan,
  AIPatchPlan,
  FilePatch,
  PanelView,
  ProjectFile,
  Template,
} from "@/types";
import { applyActionPlan } from "@/features/ai/applier";
import { detectLanguage, parseProjectFilesToConfig } from "@/lib/project-files/config-parser";
import { generateId } from "@/lib/utils";

interface WorkspaceStore {
  // Data
  workspace: Workspace | null;
  template: Template | null;
  config: WorkspaceConfig | null;

  // Project files
  projectFiles: ProjectFile[];
  activeFilePath: string | null;
  changedFilePaths: string[];

  // Chat
  messages: AIMessage[];
  isAIStreaming: boolean;
  pendingActionPlan: AIActionPlan | null;

  // UI
  activePanelView: PanelView;
  isViewerLoading: boolean;
  viewerKey: number;

  // Runtime errors from Sandpack (for auto-fix)
  runtimeErrors: string[];
  isAutoFixing: boolean;

  // Actions
  initialize: (workspace: Workspace, template: Template, projectFiles: ProjectFile[]) => void;
  loadMessages: (workspaceId: string) => Promise<void>;
  updateConfig: (config: WorkspaceConfig) => void;
  applyPlan: (plan: AIActionPlan) => void;
  applyFilePatches: (patchPlan: AIPatchPlan) => Promise<void>;
  resetToTemplate: () => void;
  markFilesSaved: (paths?: string[]) => void;

  setActiveFile: (path: string) => void;
  updateFileContent: (path: string, content: string) => void;

  addMessage: (message: Omit<AIMessage, "id" | "timestamp">) => void;
  setIsAIStreaming: (streaming: boolean) => void;
  setPendingActionPlan: (plan: AIActionPlan | null) => void;

  setActivePanelView: (view: PanelView) => void;
  setViewerLoading: (loading: boolean) => void;
  refreshViewer: () => void;

  setRuntimeErrors: (errors: string[]) => void;
  setIsAutoFixing: (v: boolean) => void;
  dismissRuntimeErrors: () => void;
}

async function persistPatchPlan(workspaceId: string, patchPlan: AIPatchPlan): Promise<void> {
  const res = await fetch("/api/project-files", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      workspaceId,
      changes: patchPlan.changes,
      deletes: patchPlan.deletes ?? [],
      renames: patchPlan.renames ?? [],
    }),
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) detail = body.error;
    } catch {
      // Keep the HTTP status fallback.
    }
    throw new Error(`Project file autosave failed: ${detail}`);
  }
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  subscribeWithSelector((set, get) => ({
    workspace: null,
    template: null,
    config: null,
    projectFiles: [],
    activeFilePath: "src/App.tsx",
    changedFilePaths: [],
    messages: [],
    isAIStreaming: false,
    pendingActionPlan: null,
    activePanelView: "chat",
    isViewerLoading: false,
    viewerKey: 0,
    runtimeErrors: [],
    isAutoFixing: false,

    initialize: (workspace, template, projectFiles) => {
      const config = projectFiles.length > 0
        ? parseProjectFilesToConfig(projectFiles, workspace.config)
        : workspace.config;

      set({
        workspace,
        template,
        config,
        projectFiles,
        activeFilePath: projectFiles.some((file) => file.path === "src/App.tsx")
          ? "src/App.tsx"
          : projectFiles[0]?.path ?? null,
        changedFilePaths: [],
        messages: [],
        viewerKey: 0,
      });
    },

    loadMessages: async (workspaceId: string) => {
      try {
        const res = await fetch(`/api/ai/sessions?workspaceId=${workspaceId}`);
        if (!res.ok) return;
        const { messages } = (await res.json()) as { messages: AIMessage[] };
        if (Array.isArray(messages) && messages.length > 0) {
          set({ messages });
        }
      } catch { /* network unavailable — leave messages empty */ }
    },

    updateConfig: (config) => {
      set({ config, viewerKey: get().viewerKey + 1 });
    },

    applyPlan: (plan) => {
      const { config, template } = get();
      if (!config) return;

      let newConfig = config;
      if (plan.actions.some((a) => a.type === "reset_to_template") && template) {
        newConfig = template.defaultConfig;
      } else {
        newConfig = applyActionPlan(config, plan);
      }

      set({ config: newConfig, viewerKey: get().viewerKey + 1, pendingActionPlan: null });
    },

    applyFilePatches: async (patchPlan) => {
      const { projectFiles, config, workspace } = get();
      if (!config) return;

      const deleteSet = new Set(patchPlan.deletes ?? []);
      const renameMap = new Map((patchPlan.renames ?? []).map((r) => [r.from, r.to]));
      const patchMap = new Map(patchPlan.changes.map((p: FilePatch) => [p.path, p.content]));
      const existingPaths = new Set(projectFiles.map((f) => f.path));

      // Apply renames + patches to existing files, drop deleted files
      const updatedFiles = projectFiles
        .filter((f) => !deleteSet.has(f.path))
        .map((f) => {
          if (renameMap.has(f.path)) {
            const newPath = renameMap.get(f.path)!;
            const newContent = patchMap.get(newPath) ?? patchMap.get(f.path) ?? f.content;
            return { ...f, path: newPath, content: newContent, language: detectLanguage(newPath), updatedAt: new Date().toISOString() };
          }
          if (patchMap.has(f.path)) {
            return { ...f, content: patchMap.get(f.path)!, updatedAt: new Date().toISOString() };
          }
          return f;
        });

      // Add new files (in changes but not in existing and not a rename target)
      const renamedToPaths = new Set(renameMap.values());
      for (const patch of patchPlan.changes) {
        if (existingPaths.has(patch.path) || renamedToPaths.has(patch.path)) continue;
        updatedFiles.push({
          id: generateId(),
          workspaceId: workspace?.id ?? "",
          path: patch.path,
          content: patch.content,
          isSystem: false,
          language: detectLanguage(patch.path),
          updatedAt: new Date().toISOString(),
        });
      }

      const newConfig = parseProjectFilesToConfig(updatedFiles, config);
      const firstChanged = patchPlan.changes[0]?.path ?? get().activeFilePath;
      const allChangedPaths = [
        ...patchPlan.changes.map((p: FilePatch) => p.path),
        ...(patchPlan.renames ?? []).map((r) => r.to),
      ];

      set({
        projectFiles: updatedFiles,
        changedFilePaths: allChangedPaths,
        config: newConfig,
        activeFilePath: firstChanged,
        // AI patches can change package.json, index.html, Tailwind setup, app
        // entrypoints, and import graphs. Remount the sandbox after every AI
        // patch so preview cannot keep an old/basic runtime mounted.
        viewerKey: get().viewerKey + 1,
      });

      // Auto-persist AI changes to DB so they survive page refresh.
      // Save as one awaited batch: Full Build can update App + CSS + routes at
      // once, and fire-and-forget per-file saves allowed reloads to see only a
      // partial/old project.
      if (workspace?.id) {
        const workspaceId = workspace.id;
        // eslint-disable-next-line no-console
        console.log(`[Autosave] Saving ${patchPlan.changes.length} file(s) to DB as one batch…`, patchPlan.changes.map((p: FilePatch) => p.path));
        await persistPatchPlan(workspaceId, patchPlan);
        set((state) => ({
          changedFilePaths: state.changedFilePaths.filter((path) => !allChangedPaths.includes(path)),
        }));
        // eslint-disable-next-line no-console
        console.log(`[Autosave] Saved ${patchPlan.changes.length} file(s) to DB.`);
      } else {
        // eslint-disable-next-line no-console
        console.warn("[Autosave] workspace?.id is missing — changes were NOT saved to DB.");
      }
    },

    resetToTemplate: () => {
      const { template } = get();
      if (!template) return;
      set({ config: template.defaultConfig, viewerKey: get().viewerKey + 1 });
    },

    markFilesSaved: (paths) => {
      set((state) => {
        const savedPaths = paths ? new Set(paths) : null;
        return {
          changedFilePaths: savedPaths
            ? state.changedFilePaths.filter((path) => !savedPaths.has(path))
            : [],
        };
      });
    },

    setActiveFile: (path) => set({ activeFilePath: path }),

    updateFileContent: (path, content) => {
      const { projectFiles, config, workspace } = get();
      if (!config) return;

      const updatedFiles = projectFiles.map((f) =>
        f.path === path ? { ...f, content, updatedAt: new Date().toISOString() } : f
      );

      const newConfig = parseProjectFilesToConfig(updatedFiles, config);

      const changedSet = new Set(get().changedFilePaths);
      changedSet.add(path);

      set({
        projectFiles: updatedFiles,
        config: newConfig,
        changedFilePaths: Array.from(changedSet),
      });

      // Debounced save — persist editor changes to DB 1.5s after the last keystroke
      if (workspace?.id) {
        const workspaceId = workspace.id;
        if (_fileEditTimers.has(path)) clearTimeout(_fileEditTimers.get(path));
        _fileEditTimers.set(path, setTimeout(() => {
          _fileEditTimers.delete(path);
          const latest = useWorkspaceStore.getState().projectFiles.find((f) => f.path === path);
          if (!latest) return;
          fetch("/api/project-files", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ workspaceId, path, content: latest.content }),
            keepalive: true,
          })
            .then((res) => { if (!res.ok) console.error(`[Autosave] Editor save failed ${path}: HTTP ${res.status}`); })
            .catch((err) => console.error(`[Autosave] Editor save error ${path}:`, err));
        }, 1500));
      }
    },

    addMessage: (message) => {
      const newMessage: AIMessage = {
        ...message,
        id: generateId(),
        timestamp: new Date().toISOString(),
      };
      set((state) => {
        const newMessages = [...state.messages, newMessage];
        saveMessagesToServer(state.workspace?.id, newMessages);
        return { messages: newMessages };
      });
    },

    setIsAIStreaming: (streaming) => set({ isAIStreaming: streaming }),
    setPendingActionPlan: (plan) => set({ pendingActionPlan: plan }),
    setActivePanelView: (view) => set({ activePanelView: view }),
    setViewerLoading: (loading) => set({ isViewerLoading: loading }),
    refreshViewer: () => set((state) => ({ viewerKey: state.viewerKey + 1 })),
    setRuntimeErrors: (errors) => set({ runtimeErrors: errors }),
    setIsAutoFixing: (v) => set({ isAutoFixing: v }),
    dismissRuntimeErrors: () => set({ runtimeErrors: [], isAutoFixing: false }),
  }))
);

function saveMessagesToServer(workspaceId: string | undefined, messages: AIMessage[]) {
  if (!workspaceId) return;
  fetch("/api/ai/sessions", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workspaceId, messages }),
    keepalive: true,
  })
    .then((res) => { if (!res.ok) console.error("[Session] Failed to save messages: HTTP", res.status); })
    .catch((err) => console.error("[Session] Network error saving messages:", err));
}

// Per-file debounce timers for editor (Monaco) saves
const _fileEditTimers = new Map<string, ReturnType<typeof setTimeout>>();

// ─── Debounced auto-save subscribers ────────────────────────────────────────

let _msgTimer: ReturnType<typeof setTimeout> | null = null;
useWorkspaceStore.subscribe(
  (state) => state.messages,
  (messages) => {
    // initialize() resets messages to [] — don't persist that or we'll wipe
    // the server's saved history before loadMessages() can restore it.
    if (messages.length === 0) return;
    const { workspace, isAIStreaming } = useWorkspaceStore.getState();
    if (!workspace?.id) return;
    if (_msgTimer) clearTimeout(_msgTimer);
    _msgTimer = setTimeout(() => {
      saveMessagesToServer(workspace.id, messages);
    }, isAIStreaming ? 2000 : 500);
  }
);
