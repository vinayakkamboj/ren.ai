"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, FileDiff } from "lucide-react";
import { useWorkspaceStore } from "@/features/workspaces/store";
import { cn } from "@/lib/utils";
import { parseFilePatchPlan, stripFilePatchPlan } from "@/features/ai/prompts";
import { sanitizePatchPlan } from "@/features/ai/validators";
import {
  buildCandidate,
  mergeIntoCandidate,
  detectFatalIssues,
  candidateToPatchPlan,
} from "@/features/ai/build-transaction";
import type { AIPatchPlan, ProjectFile } from "@/types";

// ── Local stream utilities (mirrors ChatPanel's Deep dispatch) ────────────────

function decodeAIStreamPayload(payload: string): string {
  if (!payload || payload === "[DONE]") return "";
  const sep = payload.indexOf(":");
  const prefix = sep > 0 ? payload.slice(0, sep) : "";
  if (/^[0-9a-z]$/.test(prefix)) {
    const value = payload.slice(sep + 1);
    if (prefix === "0") {
      try { return JSON.parse(value) as string; } catch { return ""; }
    }
    if (prefix === "3") {
      try { const p = JSON.parse(value); throw new Error(typeof p === "string" ? p : "AI stream failed."); }
      catch (err) { if (err instanceof Error) throw err; throw new Error("AI stream failed."); }
    }
    return "";
  }
  try {
    const p = JSON.parse(payload) as Record<string, unknown>;
    if (typeof p === "string") return p;
    if (p.type === "text-delta" && p.textDelta) return p.textDelta as string;
    if (p.text) return p.text as string;
    if (p.delta) return p.delta as string;
    if (p.content) return p.content as string;
  } catch { /* not JSON */ }
  return "";
}

function decodeAIResponse(raw: string): string {
  const chunks = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map(decodeAIStreamPayload)
    .join("");
  return chunks || raw.trim();
}

function stripThinking(text: string): string {
  return text.replace(/<thinking>[\s\S]*?<\/thinking>/g, "").trim();
}

function hasAnyPatchChanges(plan: AIPatchPlan | null): boolean {
  return (plan?.changes?.length ?? 0) > 0 || (plan?.deletes?.length ?? 0) > 0 || (plan?.renames?.length ?? 0) > 0;
}

function getAffectedPaths(plan: AIPatchPlan | null): string[] {
  return [
    ...(plan?.changes?.map((c) => c.path) ?? []),
    ...(plan?.deletes ?? []),
    ...(plan?.renames?.flatMap((r) => [r.from, r.to]) ?? []),
  ];
}

function ensureBuilderMemoryPatch(
  userText: string,
  projectFiles: ProjectFile[],
  patchPlan: AIPatchPlan | null
): AIPatchPlan | null {
  if (!patchPlan || !hasAnyPatchChanges(patchPlan)) return patchPlan;
  if (patchPlan.changes.some((c) => c.path === "NUTRIENTWEBBUILDER.md")) return patchPlan;
  const affectedPaths = getAffectedPaths(patchPlan);
  const rawMem =
    projectFiles.find((f) => f.path === "NUTRIENTWEBBUILDER.md")?.content.trim() ||
    "# Nutrient Web Builder Memory\n\n## Project\n\nThis generated app uses Nutrient Web SDK inside product workflows.";
  const mem = rawMem.replace(/\n*## Latest AI Change[\s\S]*$/m, "").trim();
  const capped = mem.length > 3000 ? mem.slice(-3000) : mem;
  return {
    ...patchPlan,
    changes: [
      ...patchPlan.changes,
      {
        path: "NUTRIENTWEBBUILDER.md",
        content: [
          capped, "",
          "## Latest AI Change", "",
          `- Request: ${userText}`,
          `- Plan: ${patchPlan.plan || "Updated the project via Nucode."}`,
          `- Files touched: ${affectedPaths.join(", ") || "none"}`,
        ].join("\n"),
      },
    ],
  };
}

// ── Message content renderer ──────────────────────────────────────────────────

function renderContent(text: string): React.ReactNode {
  const segments = text.split(/(```[\w]*\n[\s\S]*?```)/g);
  return (
    <>
      {segments.map((seg, i) => {
        const codeMatch = seg.match(/^```([\w]*)\n([\s\S]*)```$/);
        if (codeMatch) {
          const lang = codeMatch[1];
          const code = codeMatch[2];
          return (
            <div key={i} className="my-2 rounded-md overflow-hidden border border-[#2a2222]">
              {lang && (
                <div className="flex items-center px-3 py-1 bg-[#1f1919] border-b border-[#2a2222]">
                  <span className="text-[10px] text-zinc-600 font-mono">{lang}</span>
                </div>
              )}
              <pre className="bg-[#110d0d] p-3 overflow-x-auto text-[11px] font-mono text-zinc-300 leading-relaxed whitespace-pre">
                <code>{code.replace(/\n$/, "")}</code>
              </pre>
            </div>
          );
        }
        if (!seg.trim()) return null;
        return (
          <span key={i} className="whitespace-pre-wrap leading-relaxed">
            {seg}
          </span>
        );
      })}
    </>
  );
}

// ── Quick prompts ────────────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  "How do I add a custom toolbar button to the Nutrient viewer?",
  "Show me how to add annotations programmatically using the Web SDK",
  "How do I enable redaction and apply redactions to a document?",
  "What's the correct way to export a PDF with annotations?",
];

// ── Types ────────────────────────────────────────────────────────────────────

interface NucodeMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  patchedFiles?: string[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function NucodePanel() {
  const [messages, setMessages] = useState<NucodeMsg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const projectFiles = useWorkspaceStore((s) => s.projectFiles);
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id);
  const templateId = useWorkspaceStore((s) => s.workspace?.templateId);
  const applyFilePatches = useWorkspaceStore((s) => s.applyFilePatches);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    setInput("");

    const uid = `u-${Date.now()}`;
    const aid = `a-${Date.now() + 1}`;

    setMessages((prev) => [
      ...prev,
      { id: uid, role: "user", content: trimmed },
      { id: aid, role: "assistant", content: "" },
    ]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          workspaceId,
          templateId,
          projectFiles,
          messageHistory: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
          mode: "deep",
          pipelineType: "deep",
        }),
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let raw = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += dec.decode(value, { stream: true });
      }

      const decoded = stripThinking(decodeAIResponse(raw));

      // Apply file patches if present
      const lp = sanitizePatchPlan(parseFilePatchPlan(decoded) as AIPatchPlan | null);
      let displayText = decoded;
      let patchedFiles: string[] | undefined;

      if (lp?.changes?.length) {
        const candidate = buildCandidate(projectFiles);
        mergeIntoCandidate(candidate, lp);
        const fatal = detectFatalIssues(candidate);
        const blocked =
          fatal.some((i) => i.type === "missing-app-tsx") ||
          fatal.some((i) => i.type === "sdk-npm-import");

        if (!blocked && candidate.size > 0) {
          const plan = candidateToPatchPlan(candidate, projectFiles, "Nucode edit");
          if (plan && hasAnyPatchChanges(plan)) {
            const withMem = ensureBuilderMemoryPatch(trimmed, projectFiles, plan);
            if (withMem) {
              await applyFilePatches(withMem);
              patchedFiles = withMem.changes.map((c) => c.path);
              displayText = stripFilePatchPlan(decoded) || "Done - changes applied to your project.";
            }
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === aid
            ? { ...m, content: displayText || "No response - please rephrase.", patchedFiles }
            : m
        )
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Request failed";
      setMessages((prev) =>
        prev.map((m) => (m.id === aid ? { ...m, content: `Error: ${msg}` } : m))
      );
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages, projectFiles, workspaceId, templateId, applyFilePatches]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "#1a1414" }}>

      {/* ── Nucode branded header ── */}
      <div
        className="shrink-0 px-5 pt-5 pb-4"
        style={{ borderBottom: "1px solid #2a2222" }}
      >
        <p
          style={{
            fontFamily: "'Satoshi', var(--font-geist-sans), sans-serif",
            fontSize: 32,
            fontWeight: 700,
            color: "#f4f4f5",
            letterSpacing: "-0.03em",
            lineHeight: 1,
            marginBottom: 10,
          }}
        >
          Nucode
        </p>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            background: "#130f0f",
            border: "1px solid #2a2020",
            borderRadius: 5,
            padding: "3px 8px",
            fontSize: 10,
            fontWeight: 500,
            color: "#6b5555",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "#4a3535",
              flexShrink: 0,
            }}
          />
          Nutrient&apos;s coding agent
        </span>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col gap-3 mt-1">
            <p className="text-[11px]" style={{ color: "#4a3535" }}>
              Ask about the Nutrient Web SDK, request code changes, or get help with integrations.
            </p>
            <div className="flex flex-col gap-1.5">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  disabled={isLoading}
                  className="text-left rounded-md px-3 py-2 transition-colors disabled:opacity-40"
                  style={{
                    fontSize: 11,
                    color: "#5a4444",
                    background: "#1f1919",
                    border: "1px solid #2a2222",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = "#9a7070";
                    (e.currentTarget as HTMLButtonElement).style.background = "#231d1d";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = "#5a4444";
                    (e.currentTarget as HTMLButtonElement).style.background = "#1f1919";
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex flex-col gap-1",
              msg.role === "user" ? "items-end" : "items-start"
            )}
          >
            {msg.role === "user" ? (
              <div
                className="max-w-[90%] text-[12px] rounded-lg px-3 py-2"
                style={{ background: "#231d1d", color: "#d4c4c4", border: "1px solid #2e2626" }}
              >
                {msg.content}
              </div>
            ) : (
              <div className="w-full text-[12px]" style={{ color: "#a89090" }}>
                {msg.content ? (
                  renderContent(msg.content)
                ) : (
                  <span className="flex items-center gap-1.5" style={{ color: "#4a3535" }}>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Thinking…
                  </span>
                )}
                {msg.patchedFiles && msg.patchedFiles.length > 0 && (
                  <div
                    className="mt-2.5 flex items-center gap-1.5"
                    style={{ fontSize: 10, color: "#4a6a4a" }}
                  >
                    <FileDiff className="h-3 w-3" style={{ color: "#4a8a4a" }} />
                    {msg.patchedFiles.length} file{msg.patchedFiles.length !== 1 ? "s" : ""} updated in project
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div
        className="shrink-0 p-3"
        style={{ borderTop: "1px solid #2a2222" }}
      >
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={autoResize}
            onKeyDown={handleKeyDown}
            placeholder="Ask Nucode…"
            disabled={isLoading}
            rows={1}
            className="flex-1 resize-none rounded-lg px-3 py-2 text-[12px] placeholder:opacity-40 focus:outline-none disabled:opacity-50"
            style={{
              background: "#1f1919",
              border: "1px solid #2a2222",
              color: "#d4c4c4",
              lineHeight: "20px",
              minHeight: 36,
              maxHeight: 120,
              caretColor: "#9a7070",
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="flex items-center justify-center rounded-lg transition-colors disabled:opacity-25 shrink-0"
            style={{
              width: 36,
              height: 36,
              background: "#231d1d",
              border: "1px solid #2e2626",
              color: "#7a6060",
            }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) {
                (e.currentTarget as HTMLButtonElement).style.background = "#2e2626";
                (e.currentTarget as HTMLButtonElement).style.color = "#b09090";
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "#231d1d";
              (e.currentTarget as HTMLButtonElement).style.color = "#7a6060";
            }}
          >
            {isLoading
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Send className="h-3.5 w-3.5" />
            }
          </button>
        </div>
        <p
          className="mt-1.5 text-center"
          style={{ fontSize: 10, color: "#3a2e2e", letterSpacing: "0.02em" }}
        >
          Web SDK-first · No hallucinated APIs
        </p>
      </div>
    </div>
  );
}
