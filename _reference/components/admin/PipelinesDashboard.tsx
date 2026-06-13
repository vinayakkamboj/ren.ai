"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Plug, Power, Check, Zap } from "lucide-react";
import { toast } from "sonner";
import {
  PIPELINE_REGISTRY,
  type PipelineDefinition,
  type PipelinePhase,
  type MCPHook,
} from "@/features/ai/pipeline-registry";
import { MODEL_TIERS, DEFAULT_MODEL_TIER } from "@/features/ai/model-registry";

// ── localStorage keys ──────────────────────────────────────────────────────────
const CTX_PREFIX = "nucode.ctx.";
const PIPELINE_DISABLED_KEY = (id: string) => `nucode.pipeline.${id}.disabled`;

function loadAllContextValues(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const values: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CTX_PREFIX)) {
      const rawContextKey = key.slice(CTX_PREFIX.length);
      const contextKey = rawContextKey === "nucode.build.extra" ? "deep.build.extra" : rawContextKey;
      values[contextKey] = localStorage.getItem(key) ?? "";
    }
  }
  return values;
}

function isPipelineDisabled(id: string): boolean {
  if (typeof window === "undefined") return false;
  return (
    localStorage.getItem(PIPELINE_DISABLED_KEY(id)) === "true" ||
    (id === "deep" && localStorage.getItem(PIPELINE_DISABLED_KEY("nucode")) === "true")
  );
}

function setCtxValue(contextKey: string, value: string) {
  const storageKey = `${CTX_PREFIX}${contextKey}`;
  if (contextKey === "deep.build.extra") {
    localStorage.removeItem(`${CTX_PREFIX}nucode.build.extra`);
  }
  if (value.trim()) {
    localStorage.setItem(storageKey, value);
  } else {
    localStorage.removeItem(storageKey);
  }
}

// ── Shared design tokens ───────────────────────────────────────────────────────
const T = {
  bg:            "#1a1414",
  surface:       "#1f1818",
  surfaceUp:     "#211a1a",
  border:        "#2a2222",
  borderUp:      "#332b2b",
  textPrimary:   "#f4f4f5",
  textSecondary: "#8b7070",
  textMuted:     "#52403f",
  accent:        "#c4a882",
  green:         "#4ade80",
  amber:         "#f59e0b",
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: T.textMuted }}>
      {children}
    </p>
  );
}

function Tag({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "in" | "out" | "neutral" }) {
  const styles: Record<string, React.CSSProperties> = {
    in:      { background: "#1a1f1a", color: "#6b8f6b", border: "1px solid #2a3a2a" },
    out:     { background: "#1a1a22", color: "#7070a0", border: "1px solid #2a2a3a" },
    neutral: { background: T.surfaceUp, color: T.textSecondary, border: `1px solid ${T.borderUp}` },
  };
  return (
    <code className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={styles[tone]}>
      {children}
    </code>
  );
}

function MCPHookRow({ hook }: { hook: MCPHook }) {
  const dotColor = hook.status === "connected" ? T.green : hook.status === "available" ? T.amber : "#3f3535";
  const badgeStyle: React.CSSProperties =
    hook.status === "connected"
      ? { background: "#0d1f14", color: T.green, border: "1px solid #1a4a28" }
      : hook.status === "planned"
      ? { background: "#1a1a14", color: "#8b8b60", border: "1px solid #2a2a1a" }
      : {};

  return (
    <div className="flex items-start gap-2.5 py-2" style={{ borderBottom: `1px solid ${T.border}` }}>
      <span className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" style={{ background: dotColor }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium" style={{ color: T.textPrimary }}>{hook.name}</span>
          {(hook.status === "planned" || hook.status === "connected") && (
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={badgeStyle}>
              {hook.status === "connected" ? "Connected" : "Planned"}
            </span>
          )}
          {hook.toolName && <Tag>{hook.toolName}</Tag>}
        </div>
        <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: T.textSecondary }}>
          {hook.description}
        </p>
      </div>
    </div>
  );
}

function PhaseDoc({
  phase, index, total, savedValue, onSave,
}: {
  phase: PipelinePhase;
  index: number;
  total: number;
  savedValue: string;
  onSave: (key: string, value: string) => void;
}) {
  const [ctxOpen, setCtxOpen] = useState(savedValue.trim().length > 0);
  const [localValue, setLocalValue] = useState(savedValue);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    setLocalValue(savedValue);
    if (savedValue.trim().length > 0) setCtxOpen(true);
  }, [savedValue]);

  const isHaiku = phase.model === "haiku-4-5";
  const hasContent = localValue.trim().length > 0;
  const isDirty = localValue !== savedValue;

  const modelStyle: React.CSSProperties = isHaiku
    ? { background: T.surfaceUp, color: T.textSecondary, border: `1px solid ${T.borderUp}` }
    : { background: "#1a1820", color: "#9d8eca", border: "1px solid #2a2535" };

  function handleSave() {
    onSave(phase.contextInjectionKey, localValue);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
    if (localValue.trim()) {
      toast.success(`Context saved for "${phase.name}" - active on next request`);
    } else {
      toast.success(`Context cleared for "${phase.name}"`);
    }
  }

  return (
    <div className="relative">
      <div className="flex gap-4">
        <div className="flex flex-col items-center shrink-0">
          <div
            className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: T.surfaceUp, border: `1px solid ${T.borderUp}`, color: T.accent }}
          >
            {index + 1}
          </div>
          {index < total - 1 && (
            <div className="w-px flex-1 mt-2" style={{ background: T.borderUp, minHeight: 24 }} />
          )}
        </div>

        <div className="flex-1 min-w-0 pb-5">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h4 className="text-sm font-semibold" style={{ color: T.textPrimary }}>{phase.name}</h4>
            <span className="text-[11px] px-2 py-0.5 rounded" style={modelStyle}>{phase.modelLabel}</span>
            <span className="text-[11px]" style={{ color: T.textMuted }}>{phase.maxTokens.toLocaleString()} max tokens</span>
            {hasContent && (
              <span
                className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium"
                style={{ background: "#0d1f14", color: T.green, border: "1px solid #1a4a28" }}
              >
                <Zap size={8} />
                Context active
              </span>
            )}
          </div>

          <p className="text-xs leading-relaxed mb-3" style={{ color: T.textSecondary }}>
            {phase.description}
          </p>

          {((phase.inputTags?.length ?? 0) > 0 || (phase.outputTags?.length ?? 0) > 0) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-3 text-xs">
              {(phase.inputTags?.length ?? 0) > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span style={{ color: T.textMuted }}>Input</span>
                  {phase.inputTags!.map((t) => <Tag key={t} tone="in">{t}</Tag>)}
                </div>
              )}
              {(phase.outputTags?.length ?? 0) > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span style={{ color: T.textMuted }}>Output</span>
                  {phase.outputTags!.map((t) => <Tag key={t} tone="out">{t}</Tag>)}
                </div>
              )}
            </div>
          )}

          {phase.mcpHooks.length > 0 && (
            <div className="rounded-lg px-4 py-2 mb-3" style={{ background: T.surfaceUp, border: `1px solid ${T.borderUp}` }}>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: T.textMuted }}>
                Phase MCP Hooks
              </p>
              {phase.mcpHooks.map((h) => (
                <MCPHookRow key={h.id} hook={h} />
              ))}
            </div>
          )}

          {/* Context injection - live */}
          <div>
            <button
              onClick={() => setCtxOpen((o) => !o)}
              className="flex items-center gap-1 text-[11px] transition-colors"
              style={{ color: ctxOpen ? T.textSecondary : hasContent ? T.accent : T.textMuted }}
            >
              {ctxOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              {hasContent ? "Edit injected context for this phase" : "Inject extra context into this phase"}
            </button>
            {ctxOpen && (
              <div className="mt-2 space-y-2">
                <textarea
                  rows={3}
                  value={localValue}
                  onChange={(e) => setLocalValue(e.target.value)}
                  placeholder={`e.g. "Always use dark theme in all generated apps", "Prefer strict TypeScript", "Include aria-labels on all interactive elements"…`}
                  className="w-full text-xs rounded px-3 py-2 resize-none font-mono focus:outline-none transition-colors"
                  style={{
                    background: T.surfaceUp,
                    border: `1px solid ${isDirty ? T.accent : T.borderUp}`,
                    color: T.textPrimary,
                  }}
                />
                <div className="flex items-center justify-between">
                  <p className="text-[10px]" style={{ color: T.textMuted }}>
                    Key: <code style={{ color: T.textSecondary }}>{phase.contextInjectionKey}</code>
                    {" · "}
                    <span style={{ color: hasContent ? T.green : T.textMuted }}>
                      {hasContent ? "Injected into every request on this phase" : "Empty - no injection"}
                    </span>
                  </p>
                  <button
                    onClick={handleSave}
                    disabled={!isDirty}
                    className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded transition-colors"
                    style={
                      isDirty
                        ? { background: "#1a2820", color: T.green, border: "1px solid #2a4a38" }
                        : justSaved
                        ? { background: "#0d1f14", color: T.green, border: "1px solid #1a4a28" }
                        : { background: T.surfaceUp, color: T.textMuted, border: `1px solid ${T.borderUp}` }
                    }
                  >
                    {justSaved ? <Check size={10} /> : null}
                    {justSaved ? "Saved" : "Save"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PhaseFlowDiagram({ pipeline }: { pipeline: PipelineDefinition }) {
  return (
    <div className="flex items-center gap-0 flex-wrap">
      {pipeline.phases.map((phase, i) => (
        <div key={phase.id} className="flex items-center">
          <div
            className="text-xs px-3 py-1.5 rounded"
            style={{ background: T.surfaceUp, border: `1px solid ${T.borderUp}`, color: T.textSecondary }}
          >
            <span style={{ color: T.accent, marginRight: 6, fontVariantNumeric: "tabular-nums" }}>
              {i + 1}
            </span>
            {phase.name}
          </div>
          {i < pipeline.phases.length - 1 && (
            <div className="mx-1.5 text-xs" style={{ color: T.textMuted }}>→</div>
          )}
        </div>
      ))}
    </div>
  );
}

function PipelineDoc({
  pipeline, isDisabled, onToggleDisabled, allContextValues, onSaveContext,
}: {
  pipeline: PipelineDefinition;
  isDisabled: boolean;
  onToggleDisabled: () => void;
  allContextValues: Record<string, string>;
  onSaveContext: (key: string, value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const activeContextCount = pipeline.phases.filter(
    (p) => allContextValues[p.contextInjectionKey]?.trim()
  ).length;

  return (
    <article
      className="rounded-xl overflow-hidden transition-opacity"
      style={{
        background: T.surface,
        border: `1px solid ${isDisabled ? "#1f1818" : T.border}`,
        opacity: isDisabled ? 0.55 : 1,
      }}
    >
      {/* Header */}
      <div className="flex items-start">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex-1 text-left px-6 py-5 flex items-start justify-between gap-4 transition-colors"
          style={{ background: open ? T.surfaceUp : "transparent" }}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1.5">
              <h2 className="text-base font-bold" style={{ color: isDisabled ? T.textMuted : T.textPrimary }}>
                {pipeline.name}
              </h2>
              <span
                className="text-[11px] font-medium px-2 py-0.5 rounded"
                style={{ background: T.surfaceUp, color: T.accent, border: `1px solid ${T.borderUp}` }}
              >
                {pipeline.label}
              </span>
              <span className="text-xs" style={{ color: T.textMuted }}>{pipeline.tagline}</span>
              {pipeline.nutrientDocsEnabled && (
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded"
                  style={{ background: "#1a1820", color: "#9d8eca", border: "1px solid #2a2535" }}
                >
                  {pipeline.id === "deep" ? "Deep Docs" : "Nutrient Docs"}
                </span>
              )}
              {isDisabled && (
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded"
                  style={{ background: "#1f1414", color: "#5a3535", border: "1px solid #3a2222" }}
                >
                  Disabled
                </span>
              )}
            </div>
            <p className="text-xs leading-relaxed" style={{ color: T.textSecondary }}>
              {pipeline.description}
            </p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[11px]" style={{ color: T.textMuted }}>
                {pipeline.phases.length} phase{pipeline.phases.length !== 1 ? "s" : ""}
              </span>
              {pipeline.mcpHooks.length > 0 && (
                <span className="flex items-center gap-1 text-[11px]" style={{ color: T.textMuted }}>
                  <Plug size={10} />
                  {pipeline.mcpHooks.length} MCP hook{pipeline.mcpHooks.length !== 1 ? "s" : ""}
                </span>
              )}
              {activeContextCount > 0 && (
                <span className="flex items-center gap-1 text-[11px]" style={{ color: T.green }}>
                  <Zap size={10} />
                  {activeContextCount} active context injection{activeContextCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
          <span className="shrink-0 mt-1" style={{ color: T.textMuted }}>
            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </span>
        </button>

        {/* Enable/disable toggle */}
        <div className="flex items-center px-4 py-5 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleDisabled(); }}
            title={isDisabled ? "Enable pipeline" : "Disable pipeline"}
            className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded transition-colors"
            style={
              isDisabled
                ? { background: "#1f1414", color: "#6a4040", border: "1px solid #3a2222" }
                : { background: "#0d1f14", color: T.green, border: "1px solid #1a4a28" }
            }
          >
            <Power size={11} />
            {isDisabled ? "Off" : "On"}
          </button>
        </div>
      </div>

      {/* Expanded view */}
      {open && (
        <div className="px-6 pt-5 pb-6 space-y-8" style={{ borderTop: `1px solid ${T.border}` }}>
          <section>
            <SectionLabel>Overview</SectionLabel>
            <p className="text-sm leading-relaxed" style={{ color: T.textSecondary }}>
              {pipeline.description}
            </p>
          </section>

          <section>
            <SectionLabel>Phase Flow - {pipeline.phases.length} step{pipeline.phases.length !== 1 ? "s" : ""}</SectionLabel>
            <PhaseFlowDiagram pipeline={pipeline} />
            <div className="mt-5 space-y-0">
              {pipeline.phases.map((phase, i) => (
                <PhaseDoc
                  key={phase.id}
                  phase={phase}
                  index={i}
                  total={pipeline.phases.length}
                  savedValue={allContextValues[phase.contextInjectionKey] ?? ""}
                  onSave={onSaveContext}
                />
              ))}
            </div>
          </section>

          {pipeline.mcpHooks.length > 0 && (
            <section>
              <SectionLabel>MCP Integration Points</SectionLabel>
              <p className="text-xs leading-relaxed mb-4" style={{ color: T.textSecondary }}>
                These hooks are labeled connection points where MCP servers can be wired in.
                When connected, they replace static embedded context with live real-time data.
              </p>
              <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${T.borderUp}` }}>
                {pipeline.mcpHooks.map((hook) => (
                  <div key={hook.id} className="px-4" style={{ background: T.surfaceUp }}>
                    <MCPHookRow hook={hook} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </article>
  );
}

export default function PipelinesDashboard() {
  const [contextValues, setContextValues] = useState<Record<string, string>>({});
  const [disabledPipelines, setDisabledPipelines] = useState<Set<string>>(new Set());
  const [totalActive, setTotalActive] = useState(0);

  // Load from localStorage on mount
  useEffect(() => {
    const ctx = loadAllContextValues();
    setContextValues(ctx);
    const disabled = new Set(
      PIPELINE_REGISTRY.filter((p) => isPipelineDisabled(p.id)).map((p) => p.id)
    );
    setDisabledPipelines(disabled);
  }, []);

  useEffect(() => {
    const count = Object.values(contextValues).filter((v) => v.trim()).length;
    setTotalActive(count);
  }, [contextValues]);

  function handleSaveContext(key: string, value: string) {
    setCtxValue(key, value);
    setContextValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleTogglePipeline(id: string) {
    const isCurrentlyDisabled = disabledPipelines.has(id);
    if (isCurrentlyDisabled) {
      localStorage.removeItem(PIPELINE_DISABLED_KEY(id));
      setDisabledPipelines((prev) => { const next = new Set(prev); next.delete(id); return next; });
      toast.success(`Pipeline "${id}" enabled`);
    } else {
      localStorage.setItem(PIPELINE_DISABLED_KEY(id), "true");
      setDisabledPipelines((prev) => new Set([...prev, id]));
      toast.success(`Pipeline "${id}" disabled - hidden from workspace selector`);
    }
  }

  function handleClearAll() {
    for (const key of Object.keys(contextValues)) {
      localStorage.removeItem(`${CTX_PREFIX}${key}`);
    }
    setContextValues({});
    toast.success("All context injections cleared");
  }

  const disabledCount = disabledPipelines.size;

  return (
    <div className="px-8 py-8 max-w-4xl mx-auto">
      {/* Page heading */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight" style={{ color: T.textPrimary }}>
            Pipelines
          </h1>
          <p className="text-sm mt-0.5" style={{ color: T.textSecondary }}>
            {PIPELINE_REGISTRY.length} pipelines
            {disabledCount > 0 ? ` · ${disabledCount} disabled` : ""}
            {totalActive > 0 ? ` · ${totalActive} context injection${totalActive !== 1 ? "s" : ""} active` : ""}
          </p>
        </div>
        {totalActive > 0 && (
          <button
            onClick={handleClearAll}
            className="text-[11px] px-3 py-1.5 rounded transition-colors shrink-0"
            style={{ background: T.surfaceUp, color: T.textSecondary, border: `1px solid ${T.borderUp}` }}
          >
            Clear all injections
          </button>
        )}
      </div>

      {/* How context injection works */}
      <div
        className="mb-6 px-5 py-4 rounded-xl"
        style={{ background: "#1a1820", border: "1px solid #2a2535" }}
      >
        <p className="text-xs font-semibold mb-1.5" style={{ color: "#9d8eca" }}>
          How context injection works
        </p>
        <p className="text-xs leading-relaxed" style={{ color: T.textSecondary }}>
          Text you save here is automatically appended to the AI prompt for that pipeline phase on every request.
          Use it to enforce global rules across all builds - e.g. <Tag>Always use dark theme</Tag>{" "}
          or <Tag>Prefer strict TypeScript generics</Tag>. Changes take effect immediately on the next request.
          Injections are stored in your browser&apos;s localStorage and applied client-side.
        </p>
      </div>

      {/* Nucode model tiers — which Claude model each brand name resolves to */}
      <div
        className="mb-6 px-5 py-4 rounded-xl"
        style={{ background: T.surface, border: `1px solid ${T.border}` }}
      >
        <p className="text-xs font-semibold mb-1" style={{ color: T.accent }}>
          Nucode model tiers
        </p>
        <p className="text-xs leading-relaxed mb-3" style={{ color: T.textSecondary }}>
          Users pick a Nucode model in the chat panel for the build and deep phases. This is the
          underlying model each tier resolves to — token usage in the dashboard is logged against
          the resolved model. Plan, design, classify, and ask always run on Nucode Spark.
        </p>
        <div className="space-y-1.5">
          {MODEL_TIERS.map((tier) => (
            <div
              key={tier.id}
              className="flex items-center gap-3 rounded-lg px-3 py-2"
              style={{ background: T.surfaceUp, border: `1px solid ${T.borderUp}` }}
            >
              <span className="text-xs font-semibold w-32 shrink-0" style={{ color: T.textPrimary }}>
                {tier.brandName}
              </span>
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0"
                style={{
                  background: tier.usageLevel === "Max" ? "#2a1a12" : T.surface,
                  color: tier.usageLevel === "Max" ? "#c49878" : T.textSecondary,
                  border: `1px solid ${T.borderUp}`,
                }}
              >
                {tier.usageLevel} usage
              </span>
              {tier.id === DEFAULT_MODEL_TIER && (
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0"
                  style={{ background: "#12251a", color: T.green, border: "1px solid #1d3a28" }}
                >
                  Default
                </span>
              )}
              <span className="text-[11px] font-mono ml-auto truncate" style={{ color: T.textMuted }}>
                {tier.anthropicModelId}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Pipeline list */}
      <div className="space-y-3">
        {PIPELINE_REGISTRY.map((pipeline) => (
          <PipelineDoc
            key={pipeline.id}
            pipeline={pipeline}
            isDisabled={disabledPipelines.has(pipeline.id)}
            onToggleDisabled={() => handleTogglePipeline(pipeline.id)}
            allContextValues={contextValues}
            onSaveContext={handleSaveContext}
          />
        ))}
      </div>

      {/* MCP roadmap footer */}
      <div
        className="mt-8 px-5 py-4 rounded-xl"
        style={{ background: T.surfaceUp, border: `1px solid ${T.borderUp}` }}
      >
        <p className="text-xs font-semibold mb-1.5" style={{ color: T.textMuted }}>
          MCP Integration - Roadmap
        </p>
        <p className="text-xs leading-relaxed" style={{ color: T.textMuted }}>
          Each pipeline has labeled MCP hook points. When MCP servers are connected -
          such as <Tag>nutrient-docs-fetch</Tag> or <Tag>build-validator</Tag> - those hooks
          replace static embedded context with live real-time data. Manage connections from the
          MCP Connections tab.
        </p>
      </div>
    </div>
  );
}
