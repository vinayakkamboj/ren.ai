"use client";

/**
 * Live preview — runs the generated project files in an in-browser Vite+React
 * sandbox (Sandpack). The file map is rebuilt whenever the project files or the
 * viewer key change, so applied patches render immediately.
 */

import { useMemo } from "react";
import {
  SandpackProvider,
  SandpackPreview as SandpackPreviewPane,
} from "@codesandbox/sandpack-react";
import { STANDARD_DEPENDENCIES } from "@/lib/builder/base-template";
import type { ProjectFile } from "@/lib/builder/types";

interface PreviewProps {
  projectFiles: ProjectFile[];
  viewerKey: number;
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
      // Sandpack expects leading-slash paths.
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
    <div className="h-full w-full bg-white">
      <SandpackProvider
        key={viewerKey}
        template="vite-react-ts"
        files={files}
        customSetup={{ dependencies, entry: "/src/main.tsx" }}
        options={{ recompileMode: "delayed", recompileDelay: 400 }}
      >
        <SandpackPreviewPane
          showOpenInCodeSandbox={false}
          showRefreshButton={false}
          style={{ height: "100%", width: "100%" }}
        />
      </SandpackProvider>
    </div>
  );
}
