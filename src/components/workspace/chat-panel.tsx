"use client";

/**
 * Chat panel — the conversation with the build agent. Renders the message
 * history, the live streaming/build status, the model-tier selector, and the
 * composer. Submitting a message runs the full build loop in the store.
 */

import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  ChevronDown,
  FileCode2,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useWorkspaceStore } from "@/lib/builder/store";
import { MODEL_TIERS, type ModelTierId } from "@/lib/builder/model-tiers";
import type { BuildMessage } from "@/lib/builder/types";
import { cn } from "@/lib/utils";

const PHASE_LABEL: Record<string, string> = {
  thinking: "Planning the change",
  writing: "Writing files",
  applying: "Applying patch",
};

export function ChatPanel() {
  const messages = useWorkspaceStore((s) => s.messages);
  const isBuilding = useWorkspaceStore((s) => s.isBuilding);
  const phase = useWorkspaceStore((s) => s.phase);
  const streamingText = useWorkspaceStore((s) => s.streamingText);
  const sendMessage = useWorkspaceStore((s) => s.sendMessage);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, streamingText]);

  function submit() {
    if (!input.trim() || isBuilding) return;
    sendMessage(input);
    setInput("");
  }

  return (
    <div className="flex h-full flex-col bg-carbon-raised">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-carbon-line px-4">
        <Sparkles className="size-3.5 text-brass" />
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-dusk-muted">
          Ren Code
        </span>
      </div>

      <div ref={scrollRef} className="platform-scroll flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {messages.map((m) => (
              <Message key={m.id} message={m} />
            ))}
          </div>
        )}

        {isBuilding && (
          <div className="mt-4 rounded-lg border border-carbon-line bg-carbon px-3 py-2.5">
            <div className="flex items-center gap-2 text-[12px] text-brass">
              <Loader2 className="size-3.5 animate-spin" />
              {PHASE_LABEL[phase] ?? "Working"}…
            </div>
            {streamingText && (
              <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-[12px] leading-relaxed text-dusk-muted">
                {streamingText}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-carbon-line p-3">
        <ModelPicker />
        <div className="mt-2 rounded-xl border border-carbon-line bg-carbon focus-within:border-carbon-line-strong">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={3}
            placeholder="Describe a change — a page, a feature, a fix…"
            className="platform-scroll w-full resize-none bg-transparent px-3 py-2.5 text-[13px] text-dusk outline-none placeholder:text-dusk-faint"
          />
          <div className="flex items-center justify-between px-3 pb-2.5">
            <span className="text-[11px] text-dusk-faint">⏎ to send</span>
            <button
              onClick={submit}
              disabled={!input.trim() || isBuilding}
              className="flex size-7 items-center justify-center rounded-lg bg-brass text-carbon transition-colors hover:bg-brass-deep disabled:opacity-40"
            >
              {isBuilding ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <ArrowUp className="size-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Message({ message }: { message: BuildMessage }) {
  if (message.role === "user") {
    return (
      <div className="ml-6 rounded-xl rounded-tr-sm border border-carbon-line bg-carbon-high px-3 py-2.5 text-[13px] leading-relaxed text-dusk">
        {message.content}
      </div>
    );
  }
  return (
    <div className="mr-2">
      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-dusk-muted">
        {message.content}
      </p>
      {message.plan && (
        <div className="mt-2 rounded-lg border border-carbon-line bg-carbon px-3 py-2">
          <p className="text-[12px] font-medium text-dusk">{message.plan.summary}</p>
          <ul className="mt-1.5 space-y-0.5">
            {message.plan.files.map((f) => (
              <li
                key={f}
                className="flex items-center gap-1.5 font-mono text-[11.5px] text-dusk-faint"
              >
                <FileCode2 className="size-3 text-brass/70" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ModelPicker() {
  const modelTier = useWorkspaceStore((s) => s.modelTier);
  const setModelTier = useWorkspaceStore((s) => s.setModelTier);
  const [open, setOpen] = useState(false);
  const active = MODEL_TIERS.find((t) => t.id === modelTier)!;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg border border-carbon-line bg-carbon px-3 py-2 text-left transition-colors hover:border-carbon-line-strong"
      >
        <span className="flex items-center gap-2 text-[12px] text-dusk">
          <span className="size-1.5 rounded-full bg-brass" />
          {active.brandName}
          <span className="text-[11px] text-dusk-faint">· {active.usageLevel}</span>
        </span>
        <ChevronDown className="size-3.5 text-dusk-faint" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 z-20 mb-1.5 w-full overflow-hidden rounded-lg border border-carbon-line bg-carbon-high shadow-xl">
            {MODEL_TIERS.map((tier) => (
              <button
                key={tier.id}
                onClick={() => {
                  setModelTier(tier.id as ModelTierId);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left transition-colors hover:bg-carbon-raised",
                  tier.id === modelTier && "bg-carbon-raised",
                )}
              >
                <span className="flex items-center gap-2 text-[12.5px] text-dusk">
                  {tier.brandName}
                  <span className="text-[10.5px] text-dusk-faint">{tier.usageLevel}</span>
                </span>
                <span className="text-[11px] text-dusk-faint">{tier.tagline}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function EmptyState() {
  const sendMessage = useWorkspaceStore((s) => s.sendMessage);
  const examples = [
    "Build a project management board with draggable columns",
    "Create a landing page for a coffee subscription brand",
    "Make an expense tracker with charts and categories",
  ];
  return (
    <div className="flex h-full flex-col items-center justify-center px-2 text-center">
      <div className="flex size-10 items-center justify-center rounded-xl border border-carbon-line bg-carbon">
        <Sparkles className="size-5 text-brass" />
      </div>
      <p className="mt-4 text-[13.5px] font-medium text-dusk">Start building</p>
      <p className="mt-1 max-w-[34ch] text-[12.5px] leading-relaxed text-dusk-muted">
        Describe what you want. Ren Code writes the components, wires the state,
        and renders it live.
      </p>
      <div className="mt-5 w-full space-y-1.5">
        {examples.map((ex) => (
          <button
            key={ex}
            onClick={() => sendMessage(ex)}
            className="w-full rounded-lg border border-carbon-line bg-carbon px-3 py-2 text-left text-[12px] text-dusk-muted transition-colors hover:border-carbon-line-strong hover:text-dusk"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
