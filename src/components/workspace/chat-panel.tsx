"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  ChevronDown,
  Cpu,
  FileCode2,
  Layers,
  Loader2,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";
import { useWorkspaceStore } from "@/lib/builder/store";
import { MODEL_TIERS, type ModelTierId } from "@/lib/builder/model-tiers";
import type { BuildMessage } from "@/lib/builder/types";
import { cn } from "@/lib/utils";

const PHASE_LABEL: Record<string, string> = {
  thinking: "Astra is planning",
  writing: "Writing files",
  applying: "Applying changes",
};

const TIER_ICON: Record<ModelTierId, React.ComponentType<{ className?: string }>> = {
  spark: Zap,
  flow: Sparkles,
  forge: Cpu,
  apex: Wand2,
};

export function ChatPanel() {
  const messages = useWorkspaceStore((s) => s.messages);
  const isBuilding = useWorkspaceStore((s) => s.isBuilding);
  const phase = useWorkspaceStore((s) => s.phase);
  const streamingText = useWorkspaceStore((s) => s.streamingText);
  const sendMessage = useWorkspaceStore((s) => s.sendMessage);
  const modelTier = useWorkspaceStore((s) => s.modelTier);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, streamingText]);

  function submit() {
    if (!input.trim() || isBuilding) return;
    sendMessage(input);
    setInput("");
  }

  const TierIcon = TIER_ICON[modelTier] ?? Sparkles;

  return (
    <div className="flex h-full flex-col bg-[#0c0c0c]">
      {/* Header */}
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-[#1e1e1e] px-4">
        <div className="flex size-5 items-center justify-center rounded-md bg-[#c4a882]/15">
          <Sparkles className="size-3 text-[#c4a882]" />
        </div>
        <span className="text-[12px] font-semibold tracking-wide text-[#c4a882]">
          Astra
        </span>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-[#2e2e2e]">
          AI Builder
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="platform-scroll flex-1 overflow-y-auto px-3 py-4">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-5">
            {messages.map((m) => (
              <Message key={m.id} message={m} />
            ))}
          </div>
        )}

        {isBuilding && (
          <div className="mt-5 overflow-hidden rounded-xl border border-[#1e1e1e] bg-[#111]">
            <div className="flex items-center gap-2 px-3 py-2.5 text-[12.5px] text-[#c4a882]">
              <Loader2 className="size-3.5 animate-spin" />
              <span>{PHASE_LABEL[phase] ?? "Working"}…</span>
            </div>
            {streamingText && (
              <div className="border-t border-[#1e1e1e] px-3 py-2.5">
                <p className="line-clamp-5 whitespace-pre-wrap font-mono text-[11.5px] leading-relaxed text-[#444]">
                  {streamingText}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-[#1e1e1e] p-3">
        <ModelPicker />
        <div className="mt-2 overflow-hidden rounded-xl border border-[#252525] bg-[#111] focus-within:border-[#333]">
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
            className="platform-scroll w-full resize-none bg-transparent px-3 py-2.5 text-[13px] text-[#ccc] outline-none placeholder:text-[#333]"
          />
          <div className="flex items-center justify-between px-3 pb-2.5 pt-0.5">
            <div className="flex items-center gap-1.5 text-[10.5px] text-[#2e2e2e]">
              <TierIcon className="size-3" />
              <span>⏎ send · ⇧⏎ newline</span>
            </div>
            <button
              onClick={submit}
              disabled={!input.trim() || isBuilding}
              className="flex size-7 items-center justify-center rounded-lg bg-[#c4a882] text-[#0c0c0c] transition-all hover:bg-[#d4b892] disabled:opacity-30"
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
      <div className="flex justify-end">
        <div className="max-w-[88%] rounded-2xl rounded-br-sm bg-[#1c1c1c] px-3.5 py-2.5 text-[13px] leading-relaxed text-[#d0d0d0]">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5">
      <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-[#c4a882]/15">
        <Sparkles className="size-3 text-[#c4a882]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#909090]">
          {message.content}
        </p>
        {message.plan && (
          <div className="mt-2.5 overflow-hidden rounded-xl border border-[#1e1e1e] bg-[#0f0f0f]">
            <div className="border-b border-[#1e1e1e] px-3 py-2">
              <p className="text-[12.5px] font-medium text-[#c4a882]">
                {message.plan.summary}
              </p>
            </div>
            <ul className="space-y-0.5 p-2">
              {message.plan.files.map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-[#1a1a1a]"
                >
                  <FileCode2 className="size-3 shrink-0 text-[#c4a882]/50" />
                  <span className="font-mono text-[11.5px] text-[#555]">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function ModelPicker() {
  const modelTier = useWorkspaceStore((s) => s.modelTier);
  const setModelTier = useWorkspaceStore((s) => s.setModelTier);
  const [open, setOpen] = useState(false);
  const active = MODEL_TIERS.find((t) => t.id === modelTier)!;
  const ActiveIcon = TIER_ICON[modelTier] ?? Sparkles;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg border border-[#1e1e1e] bg-[#111] px-3 py-2 text-left transition-colors hover:border-[#2a2a2a]"
      >
        <span className="flex items-center gap-2 text-[12px]">
          <ActiveIcon className="size-3.5 text-[#c4a882]" />
          <span className="text-[#aaa]">{active.brandName}</span>
          <span className="text-[11px] text-[#3a3a3a]">· {active.usageLevel}</span>
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 text-[#3a3a3a] transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 z-20 mb-1.5 w-full overflow-hidden rounded-xl border border-[#252525] bg-[#0f0f0f] shadow-2xl">
            {MODEL_TIERS.map((tier) => {
              const TierIcon = TIER_ICON[tier.id as ModelTierId] ?? Sparkles;
              const isActive = tier.id === modelTier;
              return (
                <button
                  key={tier.id}
                  onClick={() => {
                    setModelTier(tier.id as ModelTierId);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[#181818]",
                    isActive && "bg-[#161616]",
                  )}
                >
                  <TierIcon
                    className={cn(
                      "mt-0.5 size-3.5 shrink-0",
                      isActive ? "text-[#c4a882]" : "text-[#3a3a3a]",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-[12.5px] font-medium",
                          isActive ? "text-[#c4a882]" : "text-[#777]",
                        )}
                      >
                        {tier.brandName}
                      </span>
                      <span className="text-[10.5px] text-[#333]">{tier.usageLevel}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#3a3a3a]">{tier.tagline}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

const EXAMPLES = [
  {
    icon: Layers,
    text: "Build a project management board with draggable columns",
  },
  {
    icon: Sparkles,
    text: "Create a landing page for a coffee subscription brand",
  },
  {
    icon: Wand2,
    text: "Make an expense tracker with charts and categories",
  },
];

function EmptyState() {
  const sendMessage = useWorkspaceStore((s) => s.sendMessage);
  return (
    <div className="flex h-full flex-col items-center justify-center py-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-[#c4a882]/10 ring-1 ring-[#c4a882]/20">
        <Sparkles className="size-5 text-[#c4a882]" />
      </div>
      <p className="mt-4 text-[14px] font-semibold text-[#777]">Start with Astra</p>
      <p className="mt-1.5 max-w-[30ch] text-[12.5px] leading-relaxed text-[#3a3a3a]">
        Describe what you want to build. Astra writes the code, wires the
        state, and renders it live.
      </p>
      <div className="mt-5 w-full space-y-2">
        {EXAMPLES.map(({ icon: Icon, text }) => (
          <button
            key={text}
            onClick={() => sendMessage(text)}
            className="flex w-full items-start gap-2.5 rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] px-3 py-2.5 text-left transition-all hover:border-[#252525] hover:bg-[#141414]"
          >
            <Icon className="mt-0.5 size-3.5 shrink-0 text-[#c4a882]/50" />
            <span className="text-[12px] leading-relaxed text-[#444]">{text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
