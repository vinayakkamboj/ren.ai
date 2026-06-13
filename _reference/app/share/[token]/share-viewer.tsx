"use client";

import type { DeploymentSnapshot, ProjectFile, WorkspaceConfig } from "@/types";
import { useWorkspaceStore } from "@/features/workspaces/store";
import { useEffect } from "react";
import { GeneratedAppPreview } from "@/components/workspace/GeneratedAppPreview";
import { SandpackLivePreview } from "@/components/workspace/SandpackPreview";

interface ShareViewerProps {
  name: string;
  snapshot: WorkspaceConfig | DeploymentSnapshot;
  createdAt: string;
}

function isDeploymentSnapshot(value: WorkspaceConfig | DeploymentSnapshot): value is DeploymentSnapshot {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    "config" in value &&
    "projectFiles" in value &&
    Array.isArray((value as DeploymentSnapshot).projectFiles)
  );
}

function hasRunnableApp(files: ProjectFile[]) {
  return files.some((file) => file.path === "src/App.tsx");
}

export function ShareViewer({ snapshot }: ShareViewerProps) {
  const config = isDeploymentSnapshot(snapshot) ? snapshot.config : snapshot;
  const projectFiles = isDeploymentSnapshot(snapshot) ? snapshot.projectFiles : [];
  const updateConfig = useWorkspaceStore((s) => s.updateConfig);
  const viewerKey = useWorkspaceStore((s) => s.viewerKey);

  useEffect(() => {
    updateConfig(config);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-screen overflow-hidden bg-[#1a1414]">
      <main className="h-screen min-h-0">
        {hasRunnableApp(projectFiles) ? (
          <SandpackLivePreview projectFiles={projectFiles} viewerKey={viewerKey} chrome="share" />
        ) : (
          <GeneratedAppPreview config={config} viewerKey={viewerKey} />
        )}
      </main>
    </div>
  );
}
