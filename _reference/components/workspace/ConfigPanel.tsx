"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bot,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  KeyRound,
  LayoutPanelLeft,
  Loader2,
  Lock,
  PenLine,
  Search,
  Server,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useWorkspaceStore } from "@/features/workspaces/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { BackendConfig } from "@/types";

const FEATURE_META: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  annotations: { label: "Annotations", icon: PenLine, color: "#f59e0b" },
  forms: { label: "Forms", icon: FileText, color: "#6366f1" },
  signatures: { label: "Signatures", icon: CheckCircle2, color: "#10b981" },
  search: { label: "Search", icon: Search, color: "#0f766e" },
  thumbnails: { label: "Thumbnails", icon: LayoutPanelLeft, color: "#a78bfa" },
  ocr: { label: "OCR", icon: Activity, color: "#e879f9" },
  redaction: { label: "Redaction", icon: Lock, color: "#ef4444" },
  comparison: { label: "Comparison", icon: ShieldCheck, color: "#facc15" },
  export: { label: "Export", icon: Download, color: "#34d399" },
  collaboration: { label: "Collaboration", icon: Users, color: "#fb923c" },
  aiAssistant: { label: "AI Assistant", icon: Bot, color: "#67e8f9" },
};

export function ConfigPanel() {
  const config = useWorkspaceStore((s) => s.config);
  const updateConfig = useWorkspaceStore((s) => s.updateConfig);

  if (!config) return null;

  function toggleFeature(feature: string, value: boolean) {
    if (!config) return;
    updateConfig({
      ...config,
      features: { ...config.features, [feature]: value },
    });
  }

  function updateTheme(key: string, value: string) {
    if (!config) return;
    updateConfig({
      ...config,
      theme: { ...config.theme, [key]: value },
    });
  }

  function updateContent(key: string, value: string) {
    if (!config) return;
    updateConfig({
      ...config,
      content: { ...config.content, [key]: value },
    });
  }

  return (
    <div className="p-4 space-y-6">
      {/* Branding */}
      <section>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Branding
        </h3>
        <div className="space-y-2">
          <ConfigField
            label="Company name"
            value={config.theme.companyName}
            onChange={(v) => updateTheme("companyName", v)}
          />
          <ConfigField
            label="Demo title"
            value={config.content.demoTitle}
            onChange={(v) => updateContent("demoTitle", v)}
          />
          <ConfigField
            label="Tagline"
            value={config.content.companyTagline ?? ""}
            onChange={(v) => updateContent("companyTagline", v)}
          />
        </div>
      </section>

      {/* Colors */}
      <section>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Colors
        </h3>
        <div className="space-y-2">
          <ColorField
            label="Primary"
            value={config.theme.primaryColor}
            onChange={(v) => updateTheme("primaryColor", v)}
          />
          <ColorField
            label="Accent"
            value={config.theme.accentColor}
            onChange={(v) => updateTheme("accentColor", v)}
          />
        </div>
      </section>

      {/* Features */}
      <section>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Features
        </h3>
        <div className="space-y-1.5">
          {Object.entries(config.features).map(([key, value]) => {
            const meta = FEATURE_META[key] ?? { label: key, icon: FileText, color: "#71717a" };
            const Icon = meta.icon;
            return (
              <div
                key={key}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors",
                  value
                    ? "border-[#3a3030] bg-[#211a1a]"
                    : "border-[#2a2222] bg-transparent hover:bg-[#211a1a]/60"
                )}
              >
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border"
                  style={value ? {
                    borderColor: meta.color + "33",
                    background: meta.color + "12",
                    color: meta.color,
                  } : undefined}
                >
                  <Icon className={cn("h-3.5 w-3.5", !value && "text-zinc-700")} />
                </span>
                <span className={cn("min-w-0 flex-1 truncate text-sm", value ? "text-zinc-200" : "text-zinc-500")}>
                  {meta.label}
                </span>
                <Toggle
                  enabled={value}
                  onChange={(v) => toggleFeature(key, v)}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Backend processing */}
      <BackendSection />

      {/* Document */}
      <section>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Documents
        </h3>
        <div className="space-y-1">
          {config.sampleDocuments.map((doc) => (
            <button
              key={doc.id}
              onClick={() => {
                if (!config) return;
                updateConfig({ ...config, activeSampleDocumentId: doc.id });
              }}
              className={cn(
                "w-full text-left flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
                config.activeSampleDocumentId === doc.id
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50 border border-transparent"
              )}
            >
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{doc.name}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function BackendSection() {
  const config = useWorkspaceStore((s) => s.config);
  const updateConfig = useWorkspaceStore((s) => s.updateConfig);
  const workspace = useWorkspaceStore((s) => s.workspace);
  const [pinging, setPinging] = useState(false);
  const [generating, setGenerating] = useState(false);

  if (!config || !workspace) return null;

  const backend: BackendConfig = config.backend ?? { mode: "managed" };
  const proxyUrl = `/api/backend-proxy/${workspace.id}`;

  function setBackend(patch: Partial<BackendConfig>) {
    if (!config) return;
    updateConfig({ ...config, backend: { ...backend, ...patch } });
  }

  async function generateToken() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/workspaces/${workspace!.id}/backend/token`, { method: "POST" });
      const data = (await res.json()) as { token?: string; expiresAt?: string; error?: string };
      if (!res.ok || !data.token) {
        toast.error(data.error ?? "Could not generate token.");
        return;
      }
      setBackend({ demoToken: data.token, demoTokenExpiresAt: data.expiresAt });
      await navigator.clipboard.writeText(data.token).catch(() => {});
      toast.success("Demo token generated and copied — valid 30 days");
    } catch {
      toast.error("Could not generate token.");
    } finally {
      setGenerating(false);
    }
  }

  async function testConnection() {
    if (!backend.customBackendUrl?.trim()) {
      toast.error("Enter your backend URL first.");
      return;
    }
    setPinging(true);
    try {
      const res = await fetch(
        `/api/workspaces/${workspace!.id}/backend/ping?url=${encodeURIComponent(backend.customBackendUrl.trim())}`
      );
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (data.ok) {
        setBackend({ customBackendConnected: true });
        toast.success("Backend connected — /health responded");
      } else {
        setBackend({ customBackendConnected: false });
        toast.error(data.error ? `Not reachable: ${data.error}` : "Backend /health did not respond.");
      }
    } catch {
      toast.error("Connection test failed.");
    } finally {
      setPinging(false);
    }
  }

  return (
    <section>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Backend Processing
      </h3>
      <div className="space-y-2">
        {/* Mode picker */}
        <div className="grid grid-cols-2 gap-1.5">
          {([
            { id: "managed", label: "Nucode Managed", desc: "Instant, credit-gated" },
            { id: "custom", label: "My Own Backend", desc: "Your deployed server" },
          ] as const).map((m) => {
            const active = backend.mode === m.id || (m.id === "managed" && backend.mode === "none");
            return (
              <button
                key={m.id}
                onClick={() => setBackend({ mode: m.id })}
                className={cn(
                  "text-left rounded-lg border px-2.5 py-2 transition-colors",
                  active
                    ? "border-primary/40 bg-primary/10"
                    : "border-[#2a2222] hover:bg-[#211a1a]/60"
                )}
              >
                <span className={cn("flex items-center gap-1.5 text-xs font-medium", active ? "text-primary" : "text-zinc-400")}>
                  <Server className="h-3 w-3" />
                  {m.label}
                </span>
                <span className="block text-[10px] text-zinc-600 mt-0.5">{m.desc}</span>
              </button>
            );
          })}
        </div>

        {backend.mode === "custom" ? (
          <>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Backend URL</label>
              <input
                value={backend.customBackendUrl ?? ""}
                onChange={(e) => setBackend({ customBackendUrl: e.target.value, customBackendConnected: false })}
                placeholder="https://my-api.example.com"
                className="w-full rounded-md border border-input bg-input px-2.5 py-1.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <button
              onClick={testConnection}
              disabled={pinging}
              className="flex items-center gap-1.5 rounded-md border border-[#332b2b] bg-[#211a1a] px-2.5 py-1.5 text-xs text-zinc-300 hover:border-[#463735] transition-colors"
            >
              {pinging ? <Loader2 className="h-3 w-3 animate-spin" /> : <Activity className="h-3 w-3" />}
              Test Connection
              {backend.customBackendConnected && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
            </button>
            <p className="text-[10px] leading-relaxed text-zinc-600">
              Your server must implement the standard contract (see backend/ in your project files).
            </p>
          </>
        ) : (
          <>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Proxy URL</label>
              <div className="flex items-center gap-1.5">
                <code className="flex-1 truncate rounded-md border border-[#2a2222] bg-[#171212] px-2.5 py-1.5 text-[11px] text-zinc-400">
                  {proxyUrl}
                </code>
                <button
                  onClick={() => { navigator.clipboard.writeText(`${window.location.origin}${proxyUrl}`); toast.success("Copied"); }}
                  className="rounded-md border border-[#2a2222] p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            </div>
            <button
              onClick={generateToken}
              disabled={generating}
              className="flex items-center gap-1.5 rounded-md border border-[#332b2b] bg-[#211a1a] px-2.5 py-1.5 text-xs text-zinc-300 hover:border-[#463735] transition-colors"
            >
              {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <KeyRound className="h-3 w-3" />}
              {backend.demoToken ? "Rotate demo token" : "Generate demo token"}
            </button>
            {backend.demoToken && (
              <p className="text-[10px] leading-relaxed text-zinc-600">
                Token active{backend.demoTokenExpiresAt ? ` until ${new Date(backend.demoTokenExpiresAt).toLocaleDateString()}` : ""} — included in ZIP downloads so the repo connects out of the box.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function ConfigField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-input px-2.5 py-1.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-6 w-6 rounded-md border border-border flex-shrink-0 cursor-pointer relative"
        style={{ background: value }}
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
      <label className="text-xs text-muted-foreground flex-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-24 rounded-md border border-input bg-input px-2 py-1 text-xs font-mono text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </div>
  );
}

function Toggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={cn(
        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        enabled ? "bg-primary" : "bg-secondary border border-border"
      )}
    >
      <span
        className={cn(
          "inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform",
          enabled ? "translate-x-4" : "translate-x-0.5"
        )}
      />
    </button>
  );
}
