import type { ProjectFile, WorkspaceConfig } from "@/types";
import { extractPreviewConfigFromSource } from "@/lib/project-files/source-preview";

function tryParse<T>(content: string): T | null {
  try {
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

export function parseProjectFilesToConfig(
  files: ProjectFile[],
  baseConfig: WorkspaceConfig
): WorkspaceConfig {
  const fileMap = new Map(files.map((f) => [f.path, f.content]));
  let config = { ...baseConfig };

  const theme = tryParse<WorkspaceConfig["theme"]>(fileMap.get("config/theme.json") ?? "");
  if (theme) config = { ...config, theme };

  const features = tryParse<WorkspaceConfig["features"]>(fileMap.get("config/features.json") ?? "");
  if (features) config = { ...config, features };

  const content = tryParse<WorkspaceConfig["content"]>(fileMap.get("config/content.json") ?? "");
  if (content) config = { ...config, content };

  const documents = tryParse<WorkspaceConfig["sampleDocuments"]>(
    fileMap.get("config/documents.json") ?? ""
  );
  if (documents) {
    config = {
      ...config,
      sampleDocuments: documents,
      activeSampleDocumentId: documents[0]?.id ?? null,
    };
  }

  const toolbar = tryParse<WorkspaceConfig["toolbar"]>(fileMap.get("config/toolbar.json") ?? "");
  if (toolbar) config = { ...config, toolbar };

  const workflow = tryParse<WorkspaceConfig["workflow"]>(fileMap.get("config/workflow.json") ?? "");
  if (workflow) config = { ...config, workflow };

  const preview = tryParse<WorkspaceConfig["preview"]>(fileMap.get("config/preview.json") ?? "");
  if (preview) config = { ...config, preview };

  const sourcePreview = extractPreviewConfigFromSource(fileMap.get("src/App.tsx"));
  if (sourcePreview) config = { ...config, preview: sourcePreview };

  return config;
}

export function detectLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    json: "json",
    css: "css",
    html: "html",
    md: "markdown",
    mdx: "markdown",
    txt: "plaintext",
  };
  return map[ext] ?? "plaintext";
}
