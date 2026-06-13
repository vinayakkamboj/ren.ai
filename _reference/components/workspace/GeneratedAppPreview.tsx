"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { FileText, X } from "lucide-react";
import type {
  PreviewAction,
  PreviewConfig,
  PreviewListItem,
  PreviewMetric,
  WorkspaceConfig,
} from "@/types";
import { cn } from "@/lib/utils";
import { preloadNutrientViewer } from "@/components/viewer/NutrientViewer";

const NutrientViewer = dynamic(
  () => import("@/components/viewer/NutrientViewer").then((m) => m.NutrientViewer),
  { ssr: false }
);

interface GeneratedAppPreviewProps {
  config: WorkspaceConfig;
  viewerKey: number;
}

function defaultPreview(config: WorkspaceConfig): PreviewConfig {
  const firstDocument = config.sampleDocuments[0];
  return {
    mode: "viewer",
    appName: config.theme.companyName || "Nutrient Demo",
    tagline: config.content.companyTagline || config.content.demoDescription,
    accentColor: config.theme.accentColor || "#0f766e",
    activeNav: "Review",
    navigation: ["Review", "Documents", "Workflow"],
    badges: ["Nutrient Web SDK", config.theme.industry || "WebSDK"],
    metrics: [
      { label: "Documents", value: String(config.sampleDocuments.length || 1), trend: "Ready" },
      { label: "Enabled tools", value: String(Object.values(config.features).filter(Boolean).length), trend: "Configured" },
      { label: "Workflow", value: String(config.workflow.length || 1), trend: "Live" },
    ],
    records: {
      title: config.content.demoTitle,
      description: config.content.demoDescription,
      items: config.workflow.slice(0, 4).map((step) => ({
        id: step.id,
        title: step.label,
        subtitle: step.description,
        meta: step.toolRequired || "Web SDK",
        status: "Ready",
      })),
    },
    workflow: {
      title: "Workflow",
      steps: config.workflow.slice(0, 4).map((step) => ({
        id: step.id,
        title: step.label,
        subtitle: step.description,
        meta: step.toolRequired || "Web SDK",
        status: "Ready",
      })),
    },
    viewer: {
      title: firstDocument?.name || "Document review",
      subtitle: firstDocument?.description || "Embedded Nutrient Web SDK viewer",
      documentLabel: firstDocument?.name || "Sample PDF",
      placement: "full",
      height: "560px",
    },
    actions: [
      { label: config.content.ctaText || "Open document", variant: "primary" },
      { label: "Export PDF", variant: "secondary" },
    ],
  };
}

function toneClass(tone?: PreviewMetric["tone"] | PreviewListItem["tone"]) {
  if (tone === "positive") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-200";
  if (tone === "warning") return "border-amber-500/25 bg-amber-500/10 text-amber-200";
  if (tone === "critical") return "border-red-500/25 bg-red-500/10 text-red-200";
  return "border-zinc-700/60 bg-white/[0.03] text-zinc-200";
}

export function GeneratedAppPreview({ config, viewerKey }: GeneratedAppPreviewProps) {
  const preview = useMemo(() => config.preview ?? defaultPreview(config), [config]);
  const accent = preview.accentColor ?? config.theme.accentColor ?? "#0f766e";
  const records = preview.records?.items ?? [];
  const [activeRecordId, setActiveRecordId] = useState(records[0]?.id ?? "");
  const [viewerOpen, setViewerOpen] = useState(false);
  const viewerPlacement = preview.viewer?.placement ?? "full";
  const activeRecord = records.find((r) => r.id === activeRecordId) ?? records[0];
  const metrics = preview.metrics?.length ? preview.metrics : defaultPreview(config).metrics ?? [];

  const warmViewer = () => void preloadNutrientViewer();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(warmViewer, { timeout: 2500 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(warmViewer, 1200);
    return () => window.clearTimeout(t);
  }, []);

  // Full-viewer layout - just a branded header + the real SDK taking the rest
  if (viewerPlacement === "full") {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#1a1414] text-zinc-100">
        <AppHeader preview={preview} accent={accent} />
        <div className="min-h-0 flex-1">
          <NutrientViewer viewerKey={viewerKey} />
        </div>
      </div>
    );
  }

  // Split layout - viewer on right or bottom, queue/workflow on left
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#1a1414] text-zinc-100">
      <AppHeader preview={preview} accent={accent} />

      <main
        className={cn(
          "grid min-h-0 flex-1 gap-4 overflow-auto p-4",
          viewerPlacement === "bottom"
            ? "grid-cols-1"
            : "grid-cols-1 xl:grid-cols-[minmax(360px,0.82fr)_minmax(520px,1.18fr)]"
        )}
      >
        {/* Left panel - metrics + records + workflow + actions */}
        <section className="flex min-h-0 flex-col gap-4">
          {/* Metrics */}
          <div className="grid grid-cols-3 gap-3">
            {metrics.slice(0, 3).map((metric) => (
              <MetricTile key={metric.label} metric={metric} accent={accent} />
            ))}
          </div>

          {/* Records list */}
          <div className="min-h-0 rounded-lg border border-[#2a2222] bg-[#201919] flex-1">
            <div className="border-b border-[#2a2222] p-4">
              <h2 className="truncate text-sm font-semibold text-zinc-100">
                {preview.records?.title ?? config.content.demoTitle}
              </h2>
              {preview.records?.description && (
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500">
                  {preview.records.description}
                </p>
              )}
            </div>
            <div className="max-h-[260px] overflow-auto p-2">
              {records.length ? records.map((record) => {
                const active = record.id === activeRecord?.id;
                return (
                  <button
                    key={record.id}
                    onPointerEnter={warmViewer}
                    onClick={() => {
                      setActiveRecordId(record.id);
                      if (viewerPlacement === "modal") setViewerOpen(true);
                    }}
                    className={cn(
                      "mb-1.5 w-full rounded-md border p-3 text-left transition-colors",
                      active
                        ? "border-zinc-500/40 bg-white/[0.06]"
                        : "border-transparent hover:border-[#332b2b] hover:bg-white/[0.03]"
                    )}
                    style={active ? { borderColor: `${accent}40` } : {}}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-zinc-100">{record.title}</p>
                        {record.subtitle && (
                          <p className="mt-0.5 line-clamp-2 text-[11px] text-zinc-500">{record.subtitle}</p>
                        )}
                        {record.meta && (
                          <p className="mt-1.5 text-[10px] uppercase tracking-[0.14em] text-zinc-700">{record.meta}</p>
                        )}
                      </div>
                      {record.status && (
                        <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px]", toneClass(record.tone))}>
                          {record.status}
                        </span>
                      )}
                    </div>
                  </button>
                );
              }) : (
                <div className="p-6 text-center text-xs text-zinc-600">No records yet.</div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {(preview.actions ?? []).slice(0, 3).map((action) => (
              <ActionButton key={action.label} action={action} accent={accent} onPointerEnter={warmViewer} onClick={() => {
                if (viewerPlacement === "modal") setViewerOpen(true);
              }} />
            ))}
            {viewerPlacement === "modal" && (
              <button
                onPointerEnter={warmViewer}
                onClick={() => setViewerOpen(true)}
                className="rounded-md border px-3 py-1.5 text-[11px] transition-colors"
                style={{ background: accent, borderColor: accent, color: "#fff" }}
              >
                {preview.modal?.triggerLabel ?? "Open PDF view"}
              </button>
            )}
          </div>
        </section>

        {/* Viewer pane (right or bottom) */}
        {viewerPlacement !== "modal" && (
          <ViewerPane
            title={preview.viewer?.title ?? "Document review"}
            subtitle={activeRecord?.title ?? preview.viewer?.subtitle ?? "Embedded Nutrient Web SDK"}
            label={preview.viewer?.documentLabel}
            viewerKey={viewerKey}
            accent={accent}
            height={viewerPlacement === "bottom" ? preview.viewer?.height ?? "520px" : undefined}
          />
        )}
      </main>

      {/* Modal viewer */}
      {viewerPlacement === "modal" && viewerOpen && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm">
          <div className="flex h-[86vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-[#332b2b] bg-[#1a1414] shadow-2xl">
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#2a2222] px-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-100">{preview.modal?.title ?? preview.viewer?.title ?? "PDF review"}</p>
                <p className="truncate text-[11px] text-zinc-500">
                  {activeRecord?.title ?? preview.modal?.description ?? preview.viewer?.subtitle}
                </p>
              </div>
              <button
                onClick={() => setViewerOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <NutrientViewer viewerKey={viewerKey} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function AppHeader({ preview, accent }: { preview: PreviewConfig; accent: string }) {
  return (
    <header
      className="flex h-14 shrink-0 items-center justify-between border-b border-[#2a2222] px-5"
      style={{ background: "rgba(26,20,20,0.97)" }}
    >
      <div className="flex min-w-0 items-center gap-3">
        {/* Logo dot in accent color */}
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-white"
          style={{ background: accent }}
        >
          {preview.appName.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-zinc-50">{preview.appName}</div>
          {preview.tagline && (
            <div className="truncate text-[11px] text-zinc-500">{preview.tagline}</div>
          )}
        </div>
      </div>

      <nav className="hidden min-w-0 items-center gap-0.5 md:flex">
        {(preview.navigation ?? ["Review", "Documents", "Workflow"]).slice(0, 6).map((item) => {
          const active = item === preview.activeNav;
          return (
            <button
              key={item}
              className="rounded-md px-2.5 py-1.5 text-[11px] transition-colors"
              style={active
                ? { background: `${accent}1a`, color: accent }
                : { color: "#71717a" }
              }
            >
              {item}
            </button>
          );
        })}
      </nav>

      <div className="flex items-center gap-1.5">
        {(preview.badges ?? []).slice(0, 2).map((badge) => (
          <span
            key={badge}
            className="hidden rounded-full border border-[#3a3030] bg-[#211a1a] px-2 py-1 text-[10px] text-zinc-400 sm:inline-flex"
          >
            {badge}
          </span>
        ))}
      </div>
    </header>
  );
}

function MetricTile({ metric, accent }: { metric: PreviewMetric; accent: string }) {
  return (
    <div className="rounded-lg border border-[#2a2222] bg-[#201919] p-3">
      <p className="text-[11px] text-zinc-500">{metric.label}</p>
      <p className="mt-2 truncate text-xl font-semibold" style={{ color: accent }}>
        {metric.value}
      </p>
      {metric.trend && (
        <p className={cn("mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px]", toneClass(metric.tone))}>
          {metric.trend}
        </p>
      )}
    </div>
  );
}

function ActionButton({
  action,
  accent,
  onPointerEnter,
  onClick,
}: {
  action: PreviewAction;
  accent: string;
  onPointerEnter?: () => void;
  onClick?: () => void;
}) {
  if (action.variant === "danger") {
    return (
      <button
        onPointerEnter={onPointerEnter}
        onClick={onClick}
        className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[11px] text-red-100 transition-colors hover:bg-red-500/15"
      >
        {action.label}
      </button>
    );
  }
  if (action.variant === "secondary") {
    return (
      <button
        onPointerEnter={onPointerEnter}
        onClick={onClick}
        className="rounded-md border border-[#332b2b] bg-transparent px-3 py-1.5 text-[11px] text-zinc-300 transition-colors hover:bg-white/[0.04]"
      >
        {action.label}
      </button>
    );
  }
  return (
    <button
      onPointerEnter={onPointerEnter}
      onClick={onClick}
      className="rounded-md border px-3 py-1.5 text-[11px] font-medium text-white transition-all hover:opacity-90"
      style={{ background: accent, borderColor: accent }}
    >
      {action.label}
    </button>
  );
}

function ViewerPane({
  title,
  subtitle,
  label,
  viewerKey,
  accent,
  height,
}: {
  title: string;
  subtitle?: string | null;
  label?: string | null;
  viewerKey: number;
  accent: string;
  height?: string;
}) {
  return (
    <section
      className="flex min-h-[480px] flex-col overflow-hidden rounded-lg border border-[#2a2222] bg-[#201919]"
      style={height ? { height } : undefined}
    >
      <div
        className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-[#2a2222] px-4"
        style={{ borderBottomColor: `${accent}20` }}
      >
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-zinc-100">{title}</h2>
          {subtitle && <p className="truncate text-[11px] text-zinc-500">{subtitle}</p>}
        </div>
        {label && (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#3a3030] px-2 py-1 text-[10px] text-zinc-500">
            <FileText className="h-3 w-3" />
            {label}
          </span>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <NutrientViewer viewerKey={viewerKey} />
      </div>
    </section>
  );
}
