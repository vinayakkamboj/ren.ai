"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import {
  Activity,
  Bot,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  LayoutPanelLeft,
  Lock,
  Palette,
  PenLine,
  Search,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import { useWorkspaceStore } from "@/features/workspaces/store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { NUTRIENT_WEB_SDK_VERSION } from "@/lib/nutrient/sdk-version";

const FEATURES_META: Record<string, { label: string; icon: LucideIcon; color: string; desc: string }> = {
  annotations:   { label: "Annotations",   icon: PenLine,         color: "#f59e0b", desc: "Highlights, ink, shapes, notes" },
  forms:         { label: "Forms",         icon: FileText,        color: "#6366f1", desc: "Fill PDF form fields" },
  signatures:    { label: "Signatures",    icon: CheckCircle2,    color: "#10b981", desc: "Draw, type or upload signatures" },
  search:        { label: "Search",        icon: Search,          color: "#0f766e", desc: "Full-text document search" },
  thumbnails:    { label: "Thumbnails",    icon: LayoutPanelLeft, color: "#a78bfa", desc: "Page thumbnail sidebar" },
  redaction:     { label: "Redaction",     icon: Lock,            color: "#ef4444", desc: "Mark and remove sensitive content" },
  export:        { label: "Export",        icon: Download,        color: "#34d399", desc: "Export as PDF or print" },
  collaboration: { label: "Collaboration", icon: Users,           color: "#fb923c", desc: "Real-time shared annotations" },
  ocr:           { label: "OCR",           icon: Activity,        color: "#e879f9", desc: "Extract text from scanned pages" },
  comparison:    { label: "Comparison",    icon: ShieldCheck,     color: "#facc15", desc: "Side-by-side document diff" },
  aiAssistant:   { label: "AI Assistant",  icon: Bot,             color: "#2dd4bf", desc: "AI document chat and analysis" },
};

const SDK_TOPICS = [
  {
    id: "custom-ui",
    label: "All-Rounder Projects",
    icon: LayoutPanelLeft,
    description: "Build the right project shape: SDK demo, workflow tool, backend pipeline, or full product.",
    prompts: [
      "Build a focused Nutrient Web SDK viewer lab using v1.15.0 with full-height editor workspace, document loading, zoom controls, toolbar customization, annotations, search, and clean docs-backed integration",
      "Create a smart data extraction split workbench with upload queue, Python SDK backend script, extracted JSON fields, confidence filters, validation workflow, audit events, and Nutrient source PDF review tied to selected files",
      "Build a form approval stepper system with submission queue, reviewer routing, field validation, signatures, approval/reject actions, audit history, and Nutrient PDF forms at the signing step",
      "Build a real claims intake product with left-sidebar navigation, claim queue, evidence CRUD, working payout actions, local persistence, and a Nutrient evidence review/export workspace",
      "Create a contract operations SaaS with split workbench layout, accounts, contract pipeline, clause tasks, signature routing, audit state, and Nutrient redaction/comparison tied to selected contracts",
    ],
  },
  {
    id: "annotations",
    label: "Annotations & Markup",
    icon: PenLine,
    description: "Highlights, ink, shapes, arrows, callouts, stamps, and freehand drawing tools.",
    prompts: [
      "Add a clinical chart annotation workflow with patient queue, reviewer assignment, Nutrient highlight/ink/note tools, saved review state, and audit activity",
      "Create an insurance evidence markup page with claim filters, selected packet details, Nutrient annotations, adjuster notes, and export-ready status",
      "Build a construction plan markup workflow with project records, issue list, measurement notes, Nutrient drawing annotations, and correction routing",
    ],
  },
  {
    id: "forms",
    label: "Forms & Signatures",
    icon: FileText,
    description: "Fill PDF form fields, create form overlays, and add electronic or digital signatures.",
    prompts: [
      "Build an HR onboarding product with employee packets, checklist progress, form validation, Nutrient PDF forms, signature routing, and completed packet export",
      "Create a healthcare intake workflow with patient registration, consent tracking, form completion state, Nutrient signatures, and audit-ready submission",
      "Add a vendor onboarding app with supplier records, W-9 form workflow, signature status, approval actions, and Nutrient form review/export",
    ],
  },
  {
    id: "redaction",
    label: "Redaction",
    icon: Lock,
    description: "Mark text or areas for redaction, apply permanent removals, useful for legal/compliance workflows.",
    prompts: [
      "Build a legal discovery redaction product with matters, privilege queue, reviewer assignments, Nutrient redaction tools, clean-copy export, and audit trail",
      "Create a healthcare privacy review app with chart packets, PII risk flags, redaction tasks, approval routing, and Nutrient redacted export",
      "Add a public records release workflow with request intake, exemption review, redaction status, release approvals, and Nutrient PDF redaction/export",
    ],
  },
  {
    id: "document-editor",
    label: "Document Editor",
    icon: FileText,
    description: "Page operations: insert, delete, rotate, reorder pages. Crop, watermark, merge documents.",
    prompts: [
      "Build a document assembly product with packet templates, page reorder tasks, reviewer actions, Nutrient document editing tools, and final packet export state",
      "Create a permit packet manager with submitted plans, missing-page checks, rotate/reorder workflow, Nutrient document editor, and approval routing",
      "Add a policy publishing workflow with draft packets, page operations, watermark status, Nutrient document editing, and release audit log",
    ],
  },
  {
    id: "comparison",
    label: "Document Comparison",
    icon: ShieldCheck,
    description: "Side-by-side comparison of two document versions with diff highlighting.",
    prompts: [
      "Build a contract version review product with deal records, version selector, changed clause list, Nutrient document comparison, and approval actions",
      "Create a compliance policy comparison workflow with policy owners, diff findings, reviewer notes, Nutrient comparison tools, and audit export",
      "Add a loan document comparison page with application records, old/new packet state, discrepancy tasks, and Nutrient side-by-side comparison",
    ],
  },
  {
    id: "ocr",
    label: "Extraction / Python SDK",
    icon: Activity,
    description: "Build data extraction systems with Python SDK/Vision API style pipelines and source PDF review.",
    prompts: [
      "Create a smart invoice extraction project with Python SDK backend files, sample extraction schema, confidence filters, field correction UI, queue states, and Nutrient PDF review",
      "Build a document AI filtration tool with uploaded packet metadata, extracted entities, search/filter controls, local validation service, Python SDK implementation notes, and Nutrient source viewer",
      "Build an invoice processing app with vendor queue, upload metadata, OCR-style extraction, confidence scores, field validation, and Nutrient invoice PDF review",
      "Create a scanned records intake workflow with processing states, extracted fields, search results, exception handling, and Nutrient source PDF review",
      "Add an OCR plus redaction workflow for compliance packets with extracted sensitive fields, validation actions, Nutrient redaction, and export state",
    ],
  },
  {
    id: "collaboration",
    label: "Collaboration",
    icon: Users,
    description: "Real-time shared annotations, comments, and collaborative review workflows.",
    prompts: [
      "Build a team contract review workspace with reviewers, assignments, comment activity, Nutrient annotations, approval status, and signature handoff",
      "Create a collaborative compliance evidence app with owner requests, reviewer comments, Nutrient shared annotations, exception resolution, and audit log",
      "Add a mortgage packet collaboration workflow with underwriter tasks, document comments, Nutrient review tools, and working approval state",
    ],
  },
  {
    id: "theming",
    label: "Theming & Branding",
    icon: Palette,
    description: "Customize colors, typography, logos, and layouts to match any company brand.",
    prompts: [
      "Rebuild this as a polished healthcare records split workbench with sage branding, patient workflows, care tasks, and a natural Nutrient chart review workspace",
      "Apply a financial underwriting command-center design with dense applicant tables, risk states, decision actions, and Nutrient packet review tied to selected applications",
      "Create a legal operations product theme with left matter navigation, contract pipeline, redaction/signature status, and Nutrient audit export",
      "Switch to a light enterprise product design with sidebar navigation, real workflow queues, working filters/actions, and a contextual Nutrient document panel",
    ],
  },
  {
    id: "workflow",
    label: "Demo Workflow Steps",
    icon: Workflow,
    description: "Build guided demo workflows that walk prospects through key features step-by-step.",
    prompts: [
      "Add a guided legal review workflow with matter queue, clause triage, Nutrient redaction/comparison, signature routing, and audit export steps",
      "Create a financial onboarding workflow with applicant records, packet upload, form validation, Nutrient signing, approval actions, and submitted state",
      "Build an HR document automation workflow with employee packets, policy acknowledgement, Nutrient forms/signatures, manager approval, and activity log",
    ],
  },
];

const DOC_LINKS = [
  { label: "Web SDK guides", href: "https://www.nutrient.io/guides/web/" },
  { label: "React + Vite setup", href: "https://www.nutrient.io/sdk/web/getting-started/react-vite/" },
  { label: "API reference", href: "https://www.nutrient.io/api/web/" },
  { label: "Python SDK", href: "https://www.nutrient.io/sdk/python/" },
  { label: "AI extraction", href: "https://www.nutrient.io/sdk/ai-document-processing/" },
];

const DOC_CONTEXT_CARDS = [
  {
    label: "Current SDK",
    value: `@nutrient-sdk/viewer ${NUTRIENT_WEB_SDK_VERSION}`,
    detail: "CDN assets, explicit container sizing",
    icon: ShieldCheck,
  },
  {
    label: "Workflow docs",
    value: "Web, Python, extraction",
    detail: "Viewer, forms, signatures, OCR, AI",
    icon: BookOpen,
  },
  {
    label: "Preview runtime",
    value: "Existing app sandbox",
    detail: "Runs generated source, no static duplicate",
    icon: LayoutPanelLeft,
  },
];

export function PromptManager() {
  const config = useWorkspaceStore((s) => s.config);
  const updateConfig = useWorkspaceStore((s) => s.updateConfig);
  const setActivePanelView = useWorkspaceStore((s) => s.setActivePanelView);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  if (!config) return null;

  function toggleFeature(key: string) {
    if (!config) return;
    const newVal = !config.features[key as keyof typeof config.features];
    updateConfig({
      ...config,
      features: { ...config.features, [key]: newVal },
      toolbar: {
        ...config.toolbar,
        showAnnotationTools: key === "annotations" ? newVal : config.toolbar.showAnnotationTools,
        showFormTools: key === "forms" ? newVal : config.toolbar.showFormTools,
        showExportTools: key === "export" ? newVal : config.toolbar.showExportTools,
        showSearchBar: key === "search" ? newVal : config.toolbar.showSearchBar,
        showThumbnails: key === "thumbnails" ? newVal : config.toolbar.showThumbnails,
      },
    });
  }

  function sendPromptToAI(prompt: string) {
    setActivePanelView("chat");
    // Let the chat tab mount before dispatching the prompt event.
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("nutrient:send-prompt", { detail: { prompt } }));
    }, 80);
  }

  const filteredTopics = SDK_TOPICS.filter(
    (t) => !search || t.label.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#1a1414]">
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-4">
          <div className="rounded-lg border border-[#303036] bg-[#202024] px-3 py-3 shadow-[0_12px_35px_rgba(0,0,0,0.18)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold text-zinc-200">Docs-aware app builder</p>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                  AI reads Nutrient docs context, project memory, and source files before choosing the right project shape.
                </p>
              </div>
              <span className="shrink-0 rounded-md border border-sky-400/20 bg-sky-400/10 px-2 py-1 text-[10px] font-medium text-sky-300">
                SDK {NUTRIENT_WEB_SDK_VERSION}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-1.5">
              {DOC_CONTEXT_CARDS.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="rounded-md border border-[#2a2a30] bg-[#17171b] px-2.5 py-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[#34343b] bg-[#222229] text-zinc-400">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">{card.label}</p>
                        <p className="truncate text-[11px] font-medium text-zinc-300">{card.value}</p>
                        <p className="truncate text-[10px] text-zinc-600">{card.detail}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SDK capability toggles */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-700 uppercase tracking-widest mb-2 px-0.5">
              SDK capabilities
            </p>
            <div className="grid grid-cols-2 gap-1">
              {Object.entries(FEATURES_META).map(([key, meta]) => {
                const enabled = config.features[key as keyof typeof config.features] ?? false;
                const Icon = meta.icon;
                return (
                  <button
                    key={key}
                    onClick={() => toggleFeature(key)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-all text-[11px]",
                      enabled
                        ? "border text-zinc-200"
                        : "border border-[#2a2222] bg-[#211a1a]/40 text-zinc-600 hover:text-zinc-400 hover:border-[#3a3030]"
                    )}
                    style={enabled ? {
                      borderColor: meta.color + "40",
                      background: meta.color + "0f",
                    } : {}}
                  >
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border"
                      style={enabled ? {
                        borderColor: meta.color + "33",
                        background: meta.color + "12",
                        color: meta.color,
                      } : {}}
                    >
                      <Icon className={cn("h-3.5 w-3.5", !enabled && "text-zinc-700")} />
                    </span>
                    <span className="truncate font-medium">{meta.label}</span>
                    <span className="ml-auto shrink-0">
                      {enabled
                        ? <ToggleRight className="h-3 w-3" style={{ color: meta.color }} />
                        : <ToggleLeft className="h-3 w-3 text-zinc-700" />
                      }
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[#2a2222]" />

          {/* Product builder prompts */}
          <div>
            <div className="flex items-center justify-between mb-2 px-0.5">
              <p className="text-[10px] font-semibold text-zinc-700 uppercase tracking-widest">
                All-rounder builders
              </p>
              <BookOpen className="h-3 w-3 text-zinc-700" />
            </div>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search topics…"
              className="w-full rounded-md border border-[#332b2b] bg-[#211a1a] px-2.5 py-1.5 text-xs text-zinc-400 placeholder:text-zinc-700 outline-none focus:border-zinc-600 mb-2"
            />

            <div className="mb-2 grid grid-cols-1 gap-1">
              {DOC_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-md border border-[#2a2222] px-2.5 py-1.5 text-[11px] text-zinc-600 transition-colors hover:border-[#3a3030] hover:text-zinc-300"
                >
                  {link.label}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ))}
            </div>

            <div className="space-y-1">
              {filteredTopics.map((topic) => {
                const isExpanded = expandedTopic === topic.id;
                const TopicIcon = topic.icon;
                return (
                  <div key={topic.id} className="rounded-md border border-[#2a2222] overflow-hidden bg-[#1a1414]">
                    <button
                      onClick={() => setExpandedTopic(isExpanded ? null : topic.id)}
                      className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-white/3 transition-colors"
                    >
                      <span className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors",
                        isExpanded
                          ? "border-zinc-600 bg-zinc-800/60 text-zinc-200"
                          : "border-[#2a2222] bg-[#211a1a] text-zinc-600"
                      )}>
                        <TopicIcon className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-[11px] font-medium text-zinc-400 flex-1">{topic.label}</span>
                      <ChevronRight className={cn("h-3 w-3 text-zinc-700 transition-transform", isExpanded && "rotate-90")} />
                    </button>

                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="border-t border-[#2a2222] px-2.5 pt-2 pb-2 space-y-2"
                      >
                        <p className="text-[11px] text-zinc-600 leading-relaxed">{topic.description}</p>
                        <div className="space-y-1">
                          {topic.prompts.map((prompt) => (
                            <button
                              key={prompt}
                              onClick={() => sendPromptToAI(prompt)}
                              className="w-full flex items-start gap-1.5 text-left text-[11px] text-zinc-500 hover:text-zinc-200 rounded px-2 py-1.5 hover:bg-white/4 transition-colors border border-transparent hover:border-[#332b2b]"
                            >
                              <Zap className="h-3 w-3 mt-0.5 shrink-0 text-zinc-700" />
                              <span className="leading-relaxed">{prompt}</span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
