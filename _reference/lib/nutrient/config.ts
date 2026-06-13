import type { WorkspaceConfig } from "@/types";
import type { NutrientToolbarItem } from "@/lib/nutrient/cdn-loader";
import { NUTRIENT_WEB_DEMO_DOCUMENT_URL } from "@/lib/nutrient/sdk-version";

const VALID_TOOLBAR_ITEM_TYPES = new Set([
  "sidebar-thumbnails",
  "sidebar-document-outline",
  "sidebar-annotations",
  "sidebar-bookmarks",
  "sidebar-signatures",
  "sidebar-attachments",
  "sidebar-layers",
  "pager",
  "pager-expanded",
  "multi-annotations-selection",
  "pan",
  "zoom-out",
  "zoom-in",
  "zoom-mode",
  "linearized-download-indicator",
  "spacer",
  "annotate",
  "ink",
  "highlighter",
  "text-highlighter",
  "ink-eraser",
  "signature",
  "image",
  "stamp",
  "note",
  "text",
  "callout",
  "line",
  "link",
  "arrow",
  "rectangle",
  "ellipse",
  "polygon",
  "cloudy-polygon",
  "polyline",
  "print",
  "document-editor",
  "document-crop",
  "search",
  "export-pdf",
  "debug",
  "layout-config",
  "marquee-zoom",
  "custom",
  "responsive-group",
  "comment",
  "redact-text-highlighter",
  "redact-rectangle",
  "cloudy-rectangle",
  "dashed-rectangle",
  "cloudy-ellipse",
  "dashed-ellipse",
  "dashed-polygon",
  "document-comparison",
  "measure",
  "undo",
  "redo",
  "form-creator",
  "content-editor",
  "ai-assistant",
]);

export function getNutrientBaseUrl(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/`;
  }
  return "/";
}

export function buildToolbarItems(
  config: WorkspaceConfig,
  defaultItems?: NutrientToolbarItem[]
): NutrientToolbarItem[] {
  if (defaultItems) {
    // Start from SDK defaults -- preserve curated order, filter disabled features, append extras
    const isEnabled = (type: string): boolean => {
      if (type === "search" && !config.toolbar.showSearchBar) return false;
      if (type === "sidebar-thumbnails" && !config.toolbar.showThumbnails) return false;
      const ANNOTATION_ITEMS = ["annotate", "highlighter", "text-highlighter", "ink", "ink-eraser", "note", "text", "callout", "arrow", "line", "rectangle", "ellipse", "polygon", "image", "stamp", "link", "sidebar-annotations"];
      if (ANNOTATION_ITEMS.includes(type) && !config.features.annotations) return false;
      if (type === "form-creator" && !config.features.forms) return false;
      if ((type === "signature" || type === "sidebar-signatures") && !config.features.signatures) return false;
      if ((type === "redact-text-highlighter" || type === "redact-rectangle") && !config.features.redaction) return false;
      if (type === "document-comparison" && !config.features.comparison) return false;
      if (type === "ai-assistant" && !config.features.aiAssistant) return false;
      if (type === "export-pdf" && !config.features.export) return false;
      return VALID_TOOLBAR_ITEM_TYPES.has(type);
    };

    const filtered = defaultItems
      .filter((item) => isEnabled(item.type))
      .map((item) => ({ ...item }));

    const present = new Set(filtered.map((i) => i.type));
    const append = (item: NutrientToolbarItem | string) => {
      const toolbarItem = typeof item === "string" ? { type: item } : item;
      if (VALID_TOOLBAR_ITEM_TYPES.has(toolbarItem.type) && !present.has(toolbarItem.type)) {
        filtered.push(toolbarItem);
        present.add(toolbarItem.type);
      }
    };

    // Append enabled extras not present in the SDK defaults, using Nutrient's
    // official dropdown grouping pattern for shape/editor tools.
    if (config.features.annotations) {
      append({ type: "cloudy-rectangle", dropdownGroup: "shapes" });
      append({ type: "dashed-rectangle", dropdownGroup: "shapes" });
      append({ type: "cloudy-ellipse", dropdownGroup: "shapes" });
      append({ type: "dashed-ellipse", dropdownGroup: "shapes" });
      append({ type: "dashed-polygon", dropdownGroup: "shapes" });
    }
    if (config.features.forms) append({ type: "form-creator", dropdownGroup: "editor" });
    if (config.features.comparison) append({ type: "document-comparison", dropdownGroup: "editor" });
    if (config.features.redaction) { append("redact-text-highlighter"); append("redact-rectangle"); }
    if (config.features.aiAssistant) append("ai-assistant");
    for (const type of config.toolbar.customItems ?? []) {
      append(type);
    }

    return filtered;
  }

  // Fallback: build from scratch when SDK defaults are not available
  const items: NutrientToolbarItem[] = [];
  const addItem = (item: NutrientToolbarItem | string) => {
    const toolbarItem = typeof item === "string" ? { type: item } : item;
    if (VALID_TOOLBAR_ITEM_TYPES.has(toolbarItem.type)) items.push(toolbarItem);
  };

  if (config.toolbar.showSearchBar) {
    addItem("search");
  }

  addItem("spacer");

  if (config.toolbar.showThumbnails) {
    addItem("sidebar-thumbnails");
  }
  addItem("sidebar-bookmarks");

  if (config.features.annotations) {
    addItem("sidebar-annotations");
  }

  addItem("spacer");

  addItem("zoom-out");
  addItem("zoom-in");
  addItem("zoom-mode");

  if (config.features.annotations) {
    addItem("highlighter");
    addItem("text-highlighter");
    addItem("ink");
    addItem("ink-eraser");
    addItem("note");
    addItem("text");
    addItem("callout");
    addItem("arrow");
    addItem("line");
    addItem("rectangle");
    addItem("ellipse");
    addItem("polygon");
    addItem("image");
    addItem("stamp");
    addItem("link");
    addItem({ type: "cloudy-rectangle", dropdownGroup: "shapes" });
    addItem({ type: "dashed-rectangle", dropdownGroup: "shapes" });
    addItem({ type: "cloudy-ellipse", dropdownGroup: "shapes" });
    addItem({ type: "dashed-ellipse", dropdownGroup: "shapes" });
    addItem({ type: "dashed-polygon", dropdownGroup: "shapes" });
  }

  if (config.features.forms) {
    addItem({ type: "form-creator", dropdownGroup: "editor" });
  }

  if (config.features.signatures) {
    addItem("signature");
  }

  if (config.features.redaction) {
    addItem("redact-text-highlighter");
    addItem("redact-rectangle");
  }

  addItem("document-editor");

  if (config.features.comparison) {
    addItem({ type: "document-comparison", dropdownGroup: "editor" });
  }

  if (config.features.aiAssistant) {
    addItem("ai-assistant");
  }

  for (const type of config.toolbar.customItems ?? []) {
    addItem(type);
  }

  addItem("spacer");

  if (config.features.export) {
    addItem("export-pdf");
  }
  addItem("print");

  return items;
}

export function getDocumentUrl(documentId: string, config: WorkspaceConfig): string {
  const doc = config.sampleDocuments.find((d) => d.id === documentId);
  if (doc?.url) return doc.url;
  return config.sampleDocuments[0]?.url || NUTRIENT_WEB_DEMO_DOCUMENT_URL;
}
