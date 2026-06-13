"use client";

/**
 * Live preview — runs the generated project files in Sandpack.
 * Includes a bottom status bar with Console and Dependencies tabs.
 */

import { useMemo, useState } from "react";
import {
  SandpackProvider,
  SandpackPreview as SandpackPreviewPane,
  SandpackConsole,
} from "@codesandbox/sandpack-react";
import { Check, ChevronDown, ChevronUp, Loader2, Package, Terminal } from "lucide-react";
import { STANDARD_DEPENDENCIES } from "@/lib/builder/base-template";
import type { ProjectFile } from "@/lib/builder/types";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

interface PreviewProps {
  projectFiles: ProjectFile[];
  viewerKey: number;
}

const LOAD_STEPS = [
  "Starting sandbox",
  "Installing packages",
  "Compiling app",
  "Rendering",
];

function SandpackLoader({ viewerKey }: { viewerKey: number }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setStep(0);
    setVisible(true);
    const timers = [
      setTimeout(() => setStep(1), 900),
      setTimeout(() => setStep(2), 2400),
      setTimeout(() => setStep(3), 3800),
      setTimeout(() => setVisible(false), 5200),
    ];
    return () => timers.forEach(clearTimeout);
  }, [viewerKey]);

  if (!visible) return null;

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 bg-white">
      <div className="space-y-2.5">
        {LOAD_STEPS.map((label, i) => (
          <div
            key={label}
            className={cn(
              "flex items-center gap-2.5 text-[13px] transition-all duration-300",
              i < step
                ? "text-neutral-400"
                : i === step
                  ? "text-neutral-800"
                  : "text-neutral-300",
            )}
          >
            {i < step ? (
              <Check className="size-3.5 shrink-0 text-emerald-500" />
            ) : i === step ? (
              <Loader2 className="size-3.5 shrink-0 animate-spin text-amber-600" />
            ) : (
              <span className="flex size-3.5 shrink-0 items-center justify-center rounded-full border border-neutral-200" />
            )}
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function DepsPanel({ deps }: { deps: Record<string, string> }) {
  const entries = Object.entries(deps).sort(([a], [b]) => a.localeCompare(b));
  return (
    <div className="platform-scroll h-full overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
        {entries.map(([name, version]) => (
          <div
            key={name}
            className="flex flex-col rounded-md border border-[#222] bg-[#151515] px-2.5 py-1.5"
          >
            <span className="truncate font-mono text-[11.5px] text-[#c4a882]">{name}</span>
            <span className="font-mono text-[10.5px] text-[#555]">{version}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewContent({
  viewerKey,
  packageDeps,
}: {
  viewerKey: number;
  packageDeps: Record<string, string>;
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [bottomTab, setBottomTab] = useState<"console" | "deps">("console");

  function toggleTab(tab: "console" | "deps") {
    if (panelOpen && bottomTab === tab) {
      setPanelOpen(false);
    } else {
      setBottomTab(tab);
      setPanelOpen(true);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Preview */}
      <div className="relative min-h-0 flex-1">
        <SandpackLoader viewerKey={viewerKey} />
        <SandpackPreviewPane
          showOpenInCodeSandbox={false}
          showRefreshButton={true}
          style={{ height: "100%", width: "100%" }}
        />
      </div>

      {/* Bottom panel */}
      {panelOpen && (
        <div className="h-48 shrink-0 overflow-hidden border-t border-[#1f1f1f] bg-[#0e0e0e]">
          {bottomTab === "console" ? (
            <SandpackConsole
              style={{
                height: "100%",
                background: "transparent",
                color: "#ccc",
                fontSize: "12px",
                fontFamily: "ui-monospace, monospace",
              }}
            />
          ) : (
            <DepsPanel deps={packageDeps} />
          )}
        </div>
      )}

      {/* Status bar */}
      <div className="flex h-7 shrink-0 items-center gap-1 border-t border-[#1f1f1f] bg-[#0e0e0e] px-3">
        <button
          onClick={() => toggleTab("console")}
          className={cn(
            "flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] transition-colors",
            panelOpen && bottomTab === "console"
              ? "bg-[#1e1e1e] text-[#c4a882]"
              : "text-[#555] hover:text-[#888]",
          )}
        >
          <Terminal className="size-3" />
          Console
        </button>
        <button
          onClick={() => toggleTab("deps")}
          className={cn(
            "flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] transition-colors",
            panelOpen && bottomTab === "deps"
              ? "bg-[#1e1e1e] text-[#c4a882]"
              : "text-[#555] hover:text-[#888]",
          )}
        >
          <Package className="size-3" />
          Dependencies
        </button>
        <div className="ml-auto">
          <button
            onClick={() => setPanelOpen((v) => !v)}
            className="text-[#444] transition-colors hover:text-[#888]"
          >
            {panelOpen ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

export function LivePreview({ projectFiles, viewerKey }: PreviewProps) {
  const { files, dependencies, packageDeps } = useMemo(() => {
    const fileMap: Record<string, string> = {};
    let pkgDeps: Record<string, string> = { ...STANDARD_DEPENDENCIES };

    for (const f of projectFiles) {
      if (f.path === "package.json") {
        try {
          const parsed = JSON.parse(f.content) as {
            dependencies?: Record<string, string>;
          };
          pkgDeps = { ...pkgDeps, ...(parsed.dependencies ?? {}) };
        } catch {
          /* keep standard deps */
        }
        continue;
      }
      fileMap["/" + f.path] = f.content;
    }

    return { files: fileMap, dependencies: pkgDeps, packageDeps: pkgDeps };
  }, [projectFiles]);

  if (!projectFiles.length) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#f9f9f9] text-[13px] text-neutral-400">
        <Package className="size-8 text-neutral-300" />
        <span>Nothing to preview yet.</span>
      </div>
    );
  }

  return (
    <SandpackProvider
      key={viewerKey}
      template="vite-react-ts"
      files={files}
      customSetup={{ dependencies, entry: "/src/main.tsx" }}
      options={{
        recompileMode: "delayed",
        recompileDelay: 400,
        externalResources: ["https://cdn.tailwindcss.com"],
      }}
      style={{ height: "100%", display: "flex", flexDirection: "column" }}
    >
      <PreviewContent viewerKey={viewerKey} packageDeps={packageDeps} />
    </SandpackProvider>
  );
}
