import type { PreviewConfig } from "@/types";

const PREVIEW_BLOCK_PATTERN = /\/\*\s*nutrient-preview\s*([\s\S]*?)\s*\*\//i;

function isPreviewConfig(value: unknown): value is PreviewConfig {
  if (!value || typeof value !== "object") return false;
  const preview = value as Partial<PreviewConfig>;
  return (preview.mode === "app" || preview.mode === "viewer") &&
    typeof preview.appName === "string" &&
    preview.appName.trim().length > 0;
}

export function extractPreviewConfigFromSource(source: string | undefined): PreviewConfig | null {
  if (!source) return null;

  const match = source.match(PREVIEW_BLOCK_PATTERN);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[1].trim());
    return isPreviewConfig(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function buildPreviewSourceComment(preview: PreviewConfig): string {
  return `/* nutrient-preview\n${JSON.stringify(preview, null, 2)}\n*/`;
}
