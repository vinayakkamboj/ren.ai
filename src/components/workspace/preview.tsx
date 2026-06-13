"use client";

/**
 * Live preview — runs the generated project files in an in-browser Vite+React
 * sandbox (Sandpack). Shows a nice loading overlay while packages install.
 */

import { useEffect, useMemo, useState } from "react";
import {
  SandpackProvider,
  SandpackPreview as SandpackPreviewPane,
} from "@codesandbox/sandpack-react";
import { Check, Loader2 } from "lucide-react";
import { STANDARD_DEPENDENCIES } from "@/lib/builder/base-template";
import type { ProjectFile } from "@/lib/builder/types";
import { cn } from "@/lib/utils";

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
      setTimeout(() => setStep(3), 4000),
      setTimeout(() => setVisible(false), 5500),
    ];
    return () => timers.forEach(clearTimeout);
  }, [viewerKey]);

  if (!visible) return null;

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 bg-carbon">
      <div className="space-y-2.5">
        {LOAD_STEPS.map((label, i) => (
          <div
            key={label}
            className={cn(
              "flex items-center gap-2.5 transition-all duration-300 text-[13px]",
              i < step
                ? "text-dusk-muted"
                : i === step
                  ? "text-dusk"
                  : "text-dusk-faint/25",
            )}
          >
            {i < step ? (
              <Check className="size-3.5 shrink-0 text-brass" />
            ) : i === step ? (
              <Loader2 className="size-3.5 shrink-0 animate-spin text-brass" />
            ) : (
              <span className="size-3.5 shrink-0 rounded-full border border-current/30" />
            )}
            {label}
            {i === step && (
              <span className="animate-pulse text-[12px] text-brass">…</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function LivePreview({ projectFiles, viewerKey }: PreviewProps) {
  const { files, dependencies } = useMemo(() => {
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

    return { files: fileMap, dependencies: pkgDeps };
  }, [projectFiles]);

  if (!projectFiles.length) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-carbon text-[13px] text-dusk-faint">
        Nothing to preview yet.
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-carbon">
      <SandpackLoader viewerKey={viewerKey} />
      <SandpackProvider
        key={viewerKey}
        template="vite-react-ts"
        files={files}
        customSetup={{ dependencies, entry: "/src/main.tsx" }}
        options={{ recompileMode: "delayed", recompileDelay: 400 }}
      >
        <SandpackPreviewPane
          showOpenInCodeSandbox={false}
          showRefreshButton={true}
          style={{ height: "100%", width: "100%" }}
        />
      </SandpackProvider>
    </div>
  );
}
