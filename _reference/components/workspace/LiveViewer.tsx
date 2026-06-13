"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize2, Minimize2, RefreshCw, AlertTriangle, X } from "lucide-react";
import { useWorkspaceStore } from "@/features/workspaces/store";
import { SandpackLivePreview } from "@/components/workspace/SandpackPreview";

export function LiveViewer() {
  const viewerKey = useWorkspaceStore((s) => s.viewerKey);
  const projectFiles = useWorkspaceStore((s) => s.projectFiles);
  const refreshViewer = useWorkspaceStore((s) => s.refreshViewer);
  const isAutoFixing = useWorkspaceStore((s) => s.isAutoFixing);
  const runtimeErrors = useWorkspaceStore((s) => s.runtimeErrors);
  const dismissRuntimeErrors = useWorkspaceStore((s) => s.dismissRuntimeErrors);
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!projectFiles.length) return <ViewerSkeleton />;

  return (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-50 flex flex-col bg-[#1a1414]"
          : "relative h-full w-full flex flex-col bg-[#1a1414] overflow-hidden"
      }
    >
      {/* Error / auto-fix banner - sits above the viewer, never causes a remount */}
      <AnimatePresence>
        {(isAutoFixing || runtimeErrors.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="flex items-center gap-2.5 px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-[11px] text-amber-400 shrink-0 z-20"
          >
            {isAutoFixing ? (
              <>
                <span className="flex gap-0.5 shrink-0">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="inline-block h-1 w-1 rounded-full bg-amber-400 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </span>
                <span>Auto-fixing errors in the preview…</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-3 w-3 shrink-0" />
                <span>
                  {runtimeErrors.length} runtime error
                  {runtimeErrors.length !== 1 ? "s" : ""} detected - ask AI to fix, or dismiss
                </span>
              </>
            )}
            <button
              onClick={dismissRuntimeErrors}
              className="ml-auto text-amber-600 hover:text-amber-300 transition-colors shrink-0"
              title="Dismiss"
            >
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main preview - run the generated app from the actual project files. */}
      <div className="flex-1 min-h-0 relative">
        <SandpackLivePreview projectFiles={projectFiles} viewerKey={viewerKey} />

        {/* Floating controls */}
        <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
          <button
            onClick={refreshViewer}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-[#332b2b] bg-[#111]/85 text-zinc-500 backdrop-blur-sm transition-colors hover:bg-[#241d1d] hover:text-zinc-200"
            title="Refresh viewer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setIsFullscreen((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-[#332b2b] bg-[#111]/85 text-zinc-500 backdrop-blur-sm transition-colors hover:bg-[#241d1d] hover:text-zinc-200"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ViewerSkeleton() {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-3 bg-[#1a1414]">
      <div className="h-8 w-8 rounded-lg border border-[#2a2222] bg-[#211a1a] animate-pulse" />
      <p className="text-xs text-zinc-600">Loading viewer…</p>
    </div>
  );
}
