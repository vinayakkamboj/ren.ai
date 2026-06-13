import type { Template } from "@/types";
import { WEB_SDK_TEMPLATES, BLANK_TEMPLATE } from "./web-sdk-templates";

const TEMPLATES: Template[] = [...WEB_SDK_TEMPLATES, BLANK_TEMPLATE];

// Removed templates that existing workspaces may still reference.
const LEGACY_TEMPLATE_ALIASES: Record<string, string> = {
  "web-sdk-edit-redact": "web-sdk-viewer",
};

export function getAllTemplates(): Template[] {
  return TEMPLATES;
}

export function getTemplateById(id: string): Template | null {
  const resolvedId = LEGACY_TEMPLATE_ALIASES[id] ?? id;
  return TEMPLATES.find((t) => t.id === resolvedId) ?? null;
}

export function getTemplatesByCategory(category: string): Template[] {
  return TEMPLATES.filter((t) => t.category === category);
}

export const TEMPLATE_CATEGORY_LABELS: Record<string, string> = {
  document: "Web SDK Viewer",
  forms: "Forms & Signatures",
  collaboration: "Collaboration",
  workflow: "Workflow Automation",
  industry: "Industry",
  sdk: "Server SDK",
};

export const TEMPLATE_CATEGORY_ORDER = [
  "document",
  "sdk",
  "forms",
  "workflow",
  "collaboration",
];
