"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Settings2, BookOpen } from "lucide-react";
import { useWorkspaceStore } from "@/features/workspaces/store";
import { ChatPanel } from "./ChatPanel";
import { ConfigPanel } from "./ConfigPanel";
import { PromptManager } from "./PromptManager";
import { cn } from "@/lib/utils";
import type { PanelView } from "@/types";

const NAV: { id: PanelView; icon: React.ElementType; label: string }[] = [
  { id: "chat", icon: Sparkles, label: "AI" },
  { id: "docs", icon: BookOpen, label: "Prompts" },
  { id: "settings", icon: Settings2, label: "Config" },
];

export function AISidebar() {
  const activePanelView = useWorkspaceStore((s) => s.activePanelView);
  const setActivePanelView = useWorkspaceStore((s) => s.setActivePanelView);
  const isAIStreaming = useWorkspaceStore((s) => s.isAIStreaming);
  const changedFilePaths = useWorkspaceStore((s) => s.changedFilePaths);

  return (
    <div className="flex flex-col h-full bg-[#1a1414] border-r border-[#2a2222]">
      {/* Tab nav */}
      <div className="flex items-center gap-0.5 border-b border-[#2a2222] px-3 h-9 shrink-0 bg-[#1a1414]">
        {NAV.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActivePanelView(id)}
            className={cn(
              "relative flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] font-medium transition-colors",
              activePanelView === id
                ? "bg-white/6 text-zinc-200"
                : "text-zinc-600 hover:text-zinc-300 hover:bg-white/3"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {id === "chat" && isAIStreaming && (
              <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
            )}
            {id === "chat" && !isAIStreaming && changedFilePaths.length > 0 && (
              <span className="ml-1 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
            )}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {activePanelView === "chat" && (
            <motion.div
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="h-full"
            >
              <ChatPanel />
            </motion.div>
          )}
          {activePanelView === "docs" && (
            <motion.div
              key="docs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="h-full"
            >
              <PromptManager />
            </motion.div>
          )}
          {activePanelView === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="h-full overflow-y-auto"
            >
              <ConfigPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
