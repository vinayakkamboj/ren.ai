import type { Template } from "@/types";
import {
  NUTRIENT_CDN_BASE_URL,
  NUTRIENT_CDN_SCRIPT_URL,
  NUTRIENT_WEB_SDK_PACKAGE,
  NUTRIENT_WEB_DEMO_DOCUMENT_URL,
} from "@/lib/nutrient/sdk-version";

export interface ProjectFileTemplate {
  path: string;
  content: string;
  isSystem: boolean;
  language: string;
}

// Standalone Vite + React project that loads the Nutrient Web SDK from Nutrient's
// CDN (window.NutrientViewer). The SDK is NOT an npm dependency — loading the
// prebuilt nutrient-viewer.js from the CDN avoids bundler transpile failures and
// matches Nutrient's recommended quick-start path.
const SYSTEM_FILES: ProjectFileTemplate[] = [
  {
    path: "package.json",
    isSystem: true,
    language: "json",
    content: JSON.stringify(
      {
        name: "nutrient-demo",
        private: true,
        version: "0.0.1",
        type: "module",
        scripts: {
          dev: "vite",
          build: "vite build",
          preview: "vite preview",
        },
        dependencies: {
          react: "^18.3.1",
          "react-dom": "^18.3.1",
          "lucide-react": "^0.469.0",
          clsx: "^2.1.1",
          "tailwind-merge": "^2.5.5",
          "framer-motion": "^11.15.0",
          "date-fns": "^4.1.0",
          recharts: "^2.13.0",
          "class-variance-authority": "^0.7.1",
          "@radix-ui/react-accordion": "^1.2.3",
          "@radix-ui/react-alert-dialog": "^1.1.4",
          "@radix-ui/react-avatar": "^1.1.3",
          "@radix-ui/react-checkbox": "^1.1.3",
          "@radix-ui/react-collapsible": "^1.1.3",
          "@radix-ui/react-dialog": "^1.1.4",
          "@radix-ui/react-dropdown-menu": "^2.1.4",
          "@radix-ui/react-label": "^2.1.1",
          "@radix-ui/react-popover": "^1.1.4",
          "@radix-ui/react-progress": "^1.1.2",
          "@radix-ui/react-radio-group": "^1.2.3",
          "@radix-ui/react-scroll-area": "^1.2.3",
          "@radix-ui/react-select": "^2.1.4",
          "@radix-ui/react-separator": "^1.1.1",
          "@radix-ui/react-slot": "^1.1.1",
          "@radix-ui/react-switch": "^1.1.2",
          "@radix-ui/react-tabs": "^1.1.2",
          "@radix-ui/react-tooltip": "^1.1.6",
        },
        devDependencies: {
          "@types/react": "^18.3.12",
          "@types/react-dom": "^18.3.1",
          "@vitejs/plugin-react": "^4.3.4",
          typescript: "^5.7.2",
          vite: "^6.0.7",
        },
      },
      null,
      2
    ),
  },
  {
    path: "vite.config.ts",
    isSystem: true,
    language: "typescript",
    content: `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 3000 },
});`,
  },
  {
    path: "src/lib/utils.ts",
    isSystem: true,
    language: "typescript",
    content: `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// shadcn/ui standard helper — merge classes with Tailwind conflict resolution.
// Usage: <div className={cn("p-4", isActive && "bg-accent")} />
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`,
  },
  {
    path: "index.html",
    isSystem: true,
    language: "html",
    content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Nutrient Demo</title>
    <!-- Tailwind Play CDN — runs at runtime, no PostCSS build needed.              -->
    <!-- Sandpack does NOT run PostCSS, so @tailwind directives in CSS will crash.  -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      // shadcn/ui-compatible token mapping.
      // HSL format + <alpha-value> enables opacity modifiers: bg-primary/10, text-foreground/80
      tailwind.config = {
        darkMode: ["class"],
        theme: {
          extend: {
            colors: {
              background:  "hsl(var(--background) / <alpha-value>)",
              foreground:  "hsl(var(--foreground) / <alpha-value>)",
              card: {
                DEFAULT:    "hsl(var(--card) / <alpha-value>)",
                foreground: "hsl(var(--card-foreground) / <alpha-value>)",
              },
              popover: {
                DEFAULT:    "hsl(var(--popover) / <alpha-value>)",
                foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
              },
              primary: {
                DEFAULT:    "hsl(var(--primary) / <alpha-value>)",
                foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
              },
              secondary: {
                DEFAULT:    "hsl(var(--secondary) / <alpha-value>)",
                foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
              },
              muted: {
                DEFAULT:    "hsl(var(--muted) / <alpha-value>)",
                foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
              },
              accent: {
                DEFAULT:    "hsl(var(--accent) / <alpha-value>)",
                foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
              },
              destructive: {
                DEFAULT:    "hsl(var(--destructive) / <alpha-value>)",
                foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
              },
              success:  "hsl(var(--success) / <alpha-value>)",
              warning:  "hsl(var(--warning) / <alpha-value>)",
              border:   "hsl(var(--border) / <alpha-value>)",
              input:    "hsl(var(--input) / <alpha-value>)",
              ring:     "hsl(var(--ring) / <alpha-value>)",
            },
            borderRadius: {
              lg: "var(--radius)",
              md: "calc(var(--radius) - 2px)",
              sm: "calc(var(--radius) - 4px)",
            },
            fontFamily: { sans: ["var(--font)", "system-ui", "sans-serif"] },
          },
        },
      };
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
  },
  {
    path: "src/main.tsx",
    isSystem: false,
    language: "typescript",
    content: `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { AppErrorBoundary } from "./ErrorBoundary.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>
);`,
  },
  {
    path: "src/ErrorBoundary.tsx",
    isSystem: true,
    language: "typescript",
    content: `import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props { children: ReactNode }
interface State { error: Error | null }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[AppErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: "var(--bg,#f8fafc)", fontFamily: "var(--font,system-ui)",
          padding: "32px", gap: "16px",
        }}>
          <div style={{
            background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: "10px",
            padding: "24px 32px", maxWidth: "560px", width: "100%",
          }}>
            <p style={{ fontWeight: 700, fontSize: "15px", color: "#be123c", marginBottom: "8px" }}>
              Runtime error
            </p>
            <pre style={{
              fontSize: "12px", color: "#881337", whiteSpace: "pre-wrap",
              wordBreak: "break-word", margin: 0, lineHeight: "1.6",
            }}>
              {this.state.error.message}
            </pre>
          </div>
          <p style={{ fontSize: "12px", color: "#64748b" }}>
            Ask the AI to fix this error — paste the message above into the chat.
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              padding: "8px 20px", borderRadius: "8px", border: "none",
              background: "var(--accent,#0f766e)", color: "#fff",
              fontSize: "13px", fontWeight: 600, cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}`,
  },
  {
    path: "src/index.css",
    isSystem: false,
    language: "css",
    content: `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

/* Tailwind is loaded from the Play CDN in index.html.
   NEVER add @tailwind, @apply, or @layer here — Sandpack has no PostCSS plugin. */

/* ── LIGHT THEME (default) ──────────────────────────────────────────────────
   All values are space-separated HSL (H S% L%) so Tailwind's <alpha-value>
   modifier works: bg-primary/10, text-foreground/80, border-border/50, etc.  */
:root, [data-theme="light"] {
  --background:          40 30% 97%;
  --foreground:           0  0% 10%;

  --card:                 0  0% 100%;
  --card-foreground:      0  0% 10%;

  --popover:              0  0% 100%;
  --popover-foreground:   0  0% 10%;

  --primary:            170 82% 39%;
  --primary-foreground:   0  0% 100%;

  --secondary:           40 20% 94%;
  --secondary-foreground: 0  0% 30%;

  --muted:               40 15% 92%;
  --muted-foreground:     0  0% 45%;

  --accent:             170 82% 39%;
  --accent-foreground:    0  0% 100%;

  --destructive:          0 72% 51%;
  --destructive-foreground: 0 0% 100%;

  --success:            142 71% 45%;
  --warning:             38 92% 50%;

  --border:              40 15% 88%;
  --input:               40 15% 92%;
  --ring:               170 82% 39%;

  --radius: 0.5rem;
  --font: 'Inter', system-ui, -apple-system, sans-serif;
}

/* ── DARK THEME ─────────────────────────────────────────────────────────── */
[data-theme="dark"] {
  --background:           0 13%  9%;
  --foreground:           0  0% 96%;

  --card:                 0 10% 11%;
  --card-foreground:      0  0% 96%;

  --popover:              0 10% 11%;
  --popover-foreground:   0  0% 96%;

  --primary:            170 82% 55%;
  --primary-foreground:   0  0% 10%;

  --secondary:            0  9% 13%;
  --secondary-foreground: 0  0% 80%;

  --muted:                0  8% 15%;
  --muted-foreground:   240  4% 55%;

  --accent:             170 82% 55%;
  --accent-foreground:    0  0% 10%;

  --destructive:          0 72% 51%;
  --destructive-foreground: 0 0% 100%;

  --success:            142 71% 45%;
  --warning:             38 92% 50%;

  --border:               0  8% 18%;
  --input:                0  8% 15%;
  --ring:               170 82% 55%;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #root { width: 100%; height: 100%; }
body { font-family: var(--font); background: hsl(var(--background)); color: hsl(var(--foreground)); }

/* Default starter — full-screen Nutrient viewer. AI replaces with a real app. */
.viewer-app { height: 100vh; background: hsl(var(--background)); }
.viewer-mount { position: relative; height: 100%; width: 100%; overflow: hidden; }
.empty-viewer { height: 100%; display: grid; place-items: center; color: hsl(var(--muted-foreground)); font-size: 13px; }`,
  },
  {
    path: "src/NutrientViewer.tsx",
    isSystem: false,
    language: "typescript",
    content: `import { useEffect, useRef, useState } from "react";

// Nutrient Web SDK type surface (window.NutrientViewer, loaded from the CDN).
type NutrientToolbarItem = {
  type: string;
  id?: string;
  title?: string;
  icon?: string;
  className?: string;
  dropdownGroup?: string;
  responsiveGroup?: string;
  mediaQueries?: string[];
  disabled?: boolean;
  selected?: boolean;
  onPress?: (event: Event, id?: string) => void;
  [key: string]: unknown;
};

type NutrientToolbarInput = NutrientToolbarItem | string;
type NutrientViewerInstance = Record<string, unknown>;

type NutrientViewerModule = {
  load: (options: Record<string, unknown>) => Promise<NutrientViewerInstance>;
  unload: (target: HTMLElement | string | NutrientViewerInstance | null) => boolean;
  preloadWorker?: (options?: { baseUrl?: string }) => Promise<void>;
  defaultToolbarItems?: NutrientToolbarItem[];
  Theme: { DARK: string; LIGHT: string };
  ViewState: new (settings: Record<string, unknown>) => object;
  ZoomMode: { FIT_TO_WIDTH: string };
  InteractionMode: { INK: string; [key: string]: string };
};

declare global {
  interface Window { NutrientViewer?: NutrientViewerModule }
}

interface NutrientViewerProps {
  document?: string;
  theme?: "DARK" | "LIGHT";
  licenseKey?: string;
  toolbarItems?: NutrientToolbarInput[];
  useDefaultToolbarItems?: boolean;
  enableRichText?: boolean;
  onInstanceReady?: (instance: NutrientViewerInstance, NutrientViewer: NutrientViewerModule) => void;
  onInstanceUnload?: () => void;
}

const CDN_SCRIPT_URL = "${NUTRIENT_CDN_SCRIPT_URL}";
const CDN_BASE_URL = "${NUTRIENT_CDN_BASE_URL}";

let loaderPromise: Promise<NutrientViewerModule> | null = null;
let preloadStarted = false;

const TOOLBAR_TYPE_ALIASES: Record<string, string> = {
  highlight: "highlighter",
  draw: "ink",
  drawing: "ink",
  download: "export-pdf",
  export: "export-pdf",
  measurement: "measure",
  measurements: "measure",
  distance: "measure",
  perimeter: "measure",
  "rectangle-area": "measure",
  "ellipse-area": "measure",
  "polygon-area": "measure",
  thumbnails: "sidebar-thumbnails",
  bookmarks: "sidebar-bookmarks",
  annotations: "sidebar-annotations",
  signatures: "sidebar-signatures",
  layers: "sidebar-layers",
  outline: "sidebar-document-outline",
  forms: "form-creator",
  form: "form-creator",
  "redact-text": "redact-text-highlighter",
  "redaction-text": "redact-text-highlighter",
};

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

function normalizeToolbarItems(toolbarItems: NutrientToolbarInput[] | undefined): NutrientToolbarItem[] {
  const normalized: NutrientToolbarItem[] = [];
  if (!Array.isArray(toolbarItems)) return normalized;

  for (const item of toolbarItems) {
    if (typeof item === "string") {
      const type = TOOLBAR_TYPE_ALIASES[item] ?? item;
      if (VALID_TOOLBAR_ITEM_TYPES.has(type)) normalized.push({ type });
      continue;
    }

    if (!item || typeof item !== "object") continue;

    const type = typeof item.type === "string"
      ? TOOLBAR_TYPE_ALIASES[item.type] ?? item.type
      : item.type;

    if (typeof type === "string" && VALID_TOOLBAR_ITEM_TYPES.has(type)) normalized.push({ ...item, type });
  }

  return normalized;
}

// Load the prebuilt SDK from Nutrient's CDN. Running the SDK natively in the
// browser (instead of bundling the npm package) is the most reliable approach.
// Also calls NutrientViewer.preloadWorker() as soon as the SDK is available so
// WASM artifacts download in parallel with React mounting — this eliminates
// the "called without preloadWorker" warning and speeds up first document load.
function loadNutrient(): Promise<NutrientViewerModule> {
  if (window.NutrientViewer) {
    maybePreloadWorker(window.NutrientViewer);
    return Promise.resolve(window.NutrientViewer);
  }
  loaderPromise ??= new Promise<NutrientViewerModule>((resolve, reject) => {
    const finish = () => {
      if (window.NutrientViewer) {
        maybePreloadWorker(window.NutrientViewer);
        resolve(window.NutrientViewer);
      } else {
        reject(new Error("window.NutrientViewer is undefined after script load"));
      }
    };
    const existing = document.querySelector<HTMLScriptElement>('script[data-nutrient-cdn="true"]');
    if (existing) {
      if (window.NutrientViewer) return finish();
      existing.addEventListener("load", finish);
      existing.addEventListener("error", () => { loaderPromise = null; reject(new Error("Failed to load Nutrient SDK")); });
      return;
    }
    const script = document.createElement("script");
    script.src = CDN_SCRIPT_URL;
    script.async = true;
    script.dataset.nutrientCdn = "true";
    script.onload = finish;
    script.onerror = () => { loaderPromise = null; script.remove(); reject(new Error("Failed to load Nutrient SDK")); };
    document.head.appendChild(script);
  });
  return loaderPromise;
}

function maybePreloadWorker(NutrientViewer: NutrientViewerModule) {
  if (preloadStarted) return;
  preloadStarted = true;
  if (typeof NutrientViewer.preloadWorker === "function") {
    NutrientViewer.preloadWorker({ baseUrl: CDN_BASE_URL }).catch(() => {
      // Preload is a perf optimization, not a hard requirement. Ignore failures.
    });
  }
}

function unloadViewer(NutrientViewer: NutrientViewerModule, target: HTMLElement | object | null) {
  try {
    NutrientViewer.unload(target);
  } catch {
    // best-effort cleanup
  }
}

function notifyInstanceUnload(handler: (() => void) | undefined) {
  try {
    handler?.();
  } catch {
    // Consumer cleanup must not block SDK unload.
  }
}

export function NutrientViewer({
  document: documentUrl,
  theme = "DARK",
  licenseKey,
  toolbarItems = [],
  useDefaultToolbarItems = false,
  enableRichText = true,
  onInstanceReady,
  onInstanceUnload,
}: NutrientViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<NutrientViewerInstance | null>(null);
  const onInstanceReadyRef = useRef(onInstanceReady);
  const onInstanceUnloadRef = useRef(onInstanceUnload);
  const loadIdRef = useRef(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onInstanceReadyRef.current = onInstanceReady;
  }, [onInstanceReady]);

  useEffect(() => {
    onInstanceUnloadRef.current = onInstanceUnload;
  }, [onInstanceUnload]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    const loadId = ++loadIdRef.current;
    setError(null);

    async function init() {
      try {
        const NutrientViewer = await loadNutrient();
        if (cancelled || loadIdRef.current !== loadId) return;

        if (instanceRef.current) {
          notifyInstanceUnload(onInstanceUnloadRef.current);
          unloadViewer(NutrientViewer, instanceRef.current);
          instanceRef.current = null;
        }
        unloadViewer(NutrientViewer, container);

        const normalizedToolbarItems = normalizeToolbarItems(toolbarItems);
        const effectiveToolbarItems = useDefaultToolbarItems
          ? [...(NutrientViewer.defaultToolbarItems ?? []), ...normalizedToolbarItems]
          : normalizedToolbarItems;

        const options: Record<string, unknown> = {
          container,
          document: documentUrl || "${NUTRIENT_WEB_DEMO_DOCUMENT_URL}",
          baseUrl: CDN_BASE_URL,
          theme: NutrientViewer.Theme[theme],
          enableRichText: () => enableRichText,
          toolbarItems: effectiveToolbarItems.length ? effectiveToolbarItems : undefined,
          initialViewState: new NutrientViewer.ViewState({
            currentPageIndex: 0,
            showToolbar: true,
            zoom: NutrientViewer.ZoomMode.FIT_TO_WIDTH,
          }),
        };
        if (licenseKey) options.licenseKey = licenseKey;

        const instance = await NutrientViewer.load(options);
        if (cancelled || loadIdRef.current !== loadId) {
          unloadViewer(NutrientViewer, instance);
          unloadViewer(NutrientViewer, container);
          return;
        }
        instanceRef.current = instance;
        onInstanceReadyRef.current?.(instance, NutrientViewer);
      } catch (err) {
        if (!cancelled) {
          if (instanceRef.current) {
            notifyInstanceUnload(onInstanceUnloadRef.current);
            instanceRef.current = null;
          }
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      if (loadIdRef.current === loadId) loadIdRef.current += 1;
      if (container && window.NutrientViewer) {
        if (instanceRef.current) {
          notifyInstanceUnload(onInstanceUnloadRef.current);
          unloadViewer(window.NutrientViewer, instanceRef.current);
          instanceRef.current = null;
        }
        unloadViewer(window.NutrientViewer, container);
      }
    };
  }, [documentUrl, theme, licenseKey, useDefaultToolbarItems, enableRichText, JSON.stringify(toolbarItems)]);

  if (error) {
    return (
      <div style={{ height: "100%", display: "grid", placeItems: "center", color: "#fca5a5", fontFamily: "monospace", fontSize: 12, padding: 24, textAlign: "center" }}>
        Nutrient Web SDK failed to load: {error}
      </div>
    );
  }

  return <div ref={containerRef} style={{ position: "relative", height: "100%", width: "100%", overflow: "hidden" }} />;
}`,
  },
  {
    path: "src/App.tsx",
    isSystem: false,
    language: "typescript",
    content: `import { NutrientViewer } from "./NutrientViewer";

const EXTRA_TOOLBAR_ITEMS = [
  { type: "cloudy-rectangle", dropdownGroup: "shapes" },
  { type: "dashed-rectangle", dropdownGroup: "shapes" },
  { type: "cloudy-ellipse", dropdownGroup: "shapes" },
  { type: "dashed-ellipse", dropdownGroup: "shapes" },
  { type: "dashed-polygon", dropdownGroup: "shapes" },
  { type: "content-editor", dropdownGroup: "editor" },
  { type: "form-creator", dropdownGroup: "editor" },
  { type: "measure", dropdownGroup: "editor" },
  { type: "document-comparison", dropdownGroup: "editor" },
];

/* nutrient-preview
{
  "mode": "viewer",
  "appName": "Nutrient Workspace",
  "tagline": "Ask AI to build anything with Nutrient",
  "accentColor": "#0f766e",
  "viewer": { "title": "Document Viewer", "placement": "full" },
  "actions": [
    { "label": "Build a logistics app", "variant": "primary" },
    { "label": "Build a legal platform", "variant": "secondary" }
  ]
}
*/

// Full-screen Nutrient SDK viewer — the AI replaces this with a real app.
// Ask the AI to build any product: "Create a healthcare portal", "Build a legal review platform", etc.
export default function App() {
  return (
    <div className="viewer-app">
      <div className="viewer-mount">
        <NutrientViewer
          document="${NUTRIENT_WEB_DEMO_DOCUMENT_URL}"
          theme="LIGHT"
          useDefaultToolbarItems
          toolbarItems={EXTRA_TOOLBAR_ITEMS}
        />
      </div>
    </div>
  );
}`,
  },
];

// ── Nutrient Python SDK backend — seeded into EVERY template ────────────────
// In-process server-side document processing (pip install nutrient-sdk).
// The frontend preview runs in Sandpack (browser only); these files are the
// ready-to-run backend project structure the user can run locally.
const PYTHON_SDK_FILES: ProjectFileTemplate[] = [
  {
    path: "backend/requirements.txt",
    isSystem: false,
    language: "text",
    content: `nutrient-sdk
fastapi
uvicorn
python-multipart
`,
  },
  {
    path: "backend/main.py",
    isSystem: false,
    language: "python",
    content: `"""Nutrient Python SDK backend - pre-installed and ready to extend.

Quick start:
    cd backend
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000

The nutrient-sdk package runs in-process - no external server, no network
round-trips. Docs: https://www.nutrient.io/guides/python/llms.txt
"""

import tempfile
from pathlib import Path

from fastapi import FastAPI, UploadFile
from fastapi.responses import FileResponse
from nutrient_sdk import Document, PdfExporter

# Register your license key before processing documents (trial mode without one).
# from nutrient_sdk import License
# License.register_key("your-license-key")

app = FastAPI(title="Nutrient Python SDK API")


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "sdk": "nutrient-sdk"}


@app.post("/convert/pdf")
async def convert_to_pdf(file: UploadFile) -> FileResponse:
    """Convert an uploaded Office document or image to PDF in-process."""
    workdir = Path(tempfile.mkdtemp())
    source = workdir / (file.filename or "input")
    source.write_bytes(await file.read())

    output = workdir / "output.pdf"
    with Document.open(str(source)) as doc:
        doc.export(str(output), PdfExporter())

    return FileResponse(output, media_type="application/pdf", filename="output.pdf")
`,
  },
];

// ── Nutrient Node.js SDK backend — seeded into the nodejs-sdk template ──────
const NODE_SDK_FILES: ProjectFileTemplate[] = [
  {
    path: "server/package.json",
    isSystem: false,
    language: "json",
    content: JSON.stringify(
      {
        name: "nutrient-node-backend",
        private: true,
        type: "module",
        scripts: { start: "node index.mjs" },
        dependencies: { "@nutrient-sdk/node": "latest" },
      },
      null,
      2
    ),
  },
  {
    path: "server/index.mjs",
    isSystem: false,
    language: "javascript",
    content: `// Nutrient Node.js SDK backend - convert Office documents and images to PDF
// in-process. Quick start:
//   cd server && npm install && npm start
// Docs: https://www.nutrient.io/guides/nodejs/llms.txt
import { createServer } from "node:http";
import { load } from "@nutrient-sdk/node";

const server = createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/convert/pdf") {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    try {
      const instance = await load({ document: Buffer.concat(chunks) });
      const pdf = await instance.exportPDF();
      await instance.close();
      res.writeHead(200, { "Content-Type": "application/pdf" });
      res.end(Buffer.from(pdf));
    } catch (error) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(error) }));
    }
    return;
  }
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok", sdk: "@nutrient-sdk/node" }));
});

server.listen(8000, () => console.log("Nutrient Node SDK API on http://localhost:8000"));
`,
  },
];

// ── Per-template src/App.tsx starters ────────────────────────────────────────
// The default SYSTEM_FILES App.tsx is the full-screen viewer (web-sdk-viewer).
// Other templates get a structure-appropriate starting point.
const BLANK_APP_TSX = `// Blank canvas - describe your app in the chat and the AI builds it here.
// The Nutrient Web SDK is ready to integrate:
//   import { NutrientViewer } from "./NutrientViewer";
// The Nutrient Python SDK is pre-installed in backend/ (FastAPI + nutrient-sdk).
export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground grid place-items-center p-8">
      <div className="max-w-md text-center space-y-3">
        <h1 className="text-2xl font-bold">Blank canvas</h1>
        <p className="text-sm text-muted-foreground">
          Describe your app in the chat to start building.
        </p>
      </div>
    </div>
  );
}
`;

const PYTHON_SDK_APP_TSX = `import { NutrientViewer } from "./NutrientViewer";

// Python SDK starter - the processing logic lives in backend/main.py
// (FastAPI + nutrient-sdk, pre-installed via backend/requirements.txt).
// This frontend is the review surface: backend output viewed with the Web SDK.
const ENDPOINTS = [
  { method: "GET", path: "/health", description: "Backend + SDK status" },
  { method: "POST", path: "/convert/pdf", description: "Convert Office docs and images to PDF in-process" },
];

export default function App() {
  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <header className="px-6 py-4 border-b border-border">
        <h1 className="text-lg font-bold">Nutrient Python SDK</h1>
        <p className="text-xs text-muted-foreground">
          In-process document processing - run the backend with: cd backend && uvicorn main:app --reload
        </p>
      </header>
      <div className="flex-1 flex min-h-0">
        <aside className="w-80 shrink-0 border-r border-border p-4 space-y-3 overflow-y-auto">
          <h2 className="text-sm font-semibold">Backend endpoints</h2>
          {ENDPOINTS.map((e) => (
            <div key={e.path} className="rounded-lg border border-border p-3">
              <p className="text-xs font-mono font-semibold">{e.method} {e.path}</p>
              <p className="text-xs text-muted-foreground mt-1">{e.description}</p>
            </div>
          ))}
        </aside>
        <main className="flex-1 min-w-0">
          <NutrientViewer theme="LIGHT" useDefaultToolbarItems />
        </main>
      </div>
    </div>
  );
}
`;

const NODE_SDK_APP_TSX = `import { NutrientViewer } from "./NutrientViewer";

// Node.js SDK starter - the conversion logic lives in server/index.mjs
// (@nutrient-sdk/node). This frontend is the review surface: server output
// viewed with the Web SDK. The Python SDK is also installed in backend/.
const ENDPOINTS = [
  { method: "GET", path: "/", description: "Server + SDK status" },
  { method: "POST", path: "/convert/pdf", description: "Convert Office docs and images to PDF in-process" },
];

export default function App() {
  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <header className="px-6 py-4 border-b border-border">
        <h1 className="text-lg font-bold">Nutrient Node.js SDK</h1>
        <p className="text-xs text-muted-foreground">
          In-process PDF generation - run the server with: cd server && npm install && npm start
        </p>
      </header>
      <div className="flex-1 flex min-h-0">
        <aside className="w-80 shrink-0 border-r border-border p-4 space-y-3 overflow-y-auto">
          <h2 className="text-sm font-semibold">Server endpoints</h2>
          {ENDPOINTS.map((e) => (
            <div key={e.path} className="rounded-lg border border-border p-3">
              <p className="text-xs font-mono font-semibold">{e.method} {e.path}</p>
              <p className="text-xs text-muted-foreground mt-1">{e.description}</p>
            </div>
          ))}
        </aside>
        <main className="flex-1 min-w-0">
          <NutrientViewer theme="LIGHT" useDefaultToolbarItems />
        </main>
      </div>
    </div>
  );
}
`;

const APP_TSX_OVERRIDES: Record<string, string> = {
  blank: BLANK_APP_TSX,
  "python-sdk": PYTHON_SDK_APP_TSX,
  "nodejs-sdk": NODE_SDK_APP_TSX,
};

function buildReadme(template: Template): string {
  return `# ${template.name}

${template.description}

> Generated by **Nucode** — Nutrient's AI coding agent

## Quick start

\`\`\`bash
npm install       # installs React + tooling
npm run dev       # starts dev server at http://localhost:3000
\`\`\`

The Nutrient Web SDK is loaded at runtime from Nutrient's CDN (see \`src/NutrientViewer.tsx\`), so there is no SDK npm package to install or assets to copy.

## Python backend (Nutrient Python SDK)

Every project ships with a server-side backend in \`backend/\` with the [Nutrient Python SDK](https://www.nutrient.io/guides/python/llms.txt) pre-installed:

\`\`\`bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
\`\`\`

## Built with Nucode

Nucode is the AI agent and app builder. It routes work through three pipelines:

- \`light\` — fast plan → design → code for most app builds, edits, and fixes
- \`full-build\` — larger app builds that need extra validation/repair capacity
- \`deep\` — docs-heavy Nutrient Web SDK expert mode for precise SDK/tooling changes

## Configuration

Build the requested Nutrient project as a repository. For focused SDK/workflow requests, keep the file tree compact but real. For full products, keep \`src/App.tsx\` thin, put app shell in \`src/layouts/\`, pages in \`src/pages/\`, reusable UI in \`src/components/\`, state in \`src/hooks/\` or \`src/store/\`, business logic in \`src/services/\`, records in \`src/data/\`, and types in \`src/types/\`.

Keep \`NUTRIENTWEBBUILDER.md\` updated so future AI edits understand the generated app architecture and Nutrient integration.

## Environment variables

Create \`.env.local\`:

\`\`\`
VITE_NUTRIENT_LICENSE_KEY=your-license-key

# Backend processing — pick ONE:
# A) Nucode managed backend (copy URL + demo token from workspace settings → Backend Processing)
VITE_BACKEND_URL=https://<nucode-host>/api/backend-proxy/<workspace-id>
VITE_BACKEND_TOKEN=ndk_...

# B) Your own backend (run the included backend/ folder)
# VITE_BACKEND_URL=http://localhost:8000
\`\`\`

Both modes implement the same REST contract, so switching is just changing \`VITE_BACKEND_URL\` — no code changes. Get a Web SDK license at [nutrient.io/web](https://www.nutrient.io/web/).

## Tech stack

- [Nutrient Web SDK](https://www.nutrient.io/sdk/web/) (${NUTRIENT_WEB_SDK_PACKAGE})
- React 18 + TypeScript + Vite

---

> Built using Nucode · Tool developed by Vinayak Kamboj
`;
}

function buildSeedBuilderMemory(template: Template): string {
  return `# Nucode — Project Memory

## Project
${template.name}

${template.description}

## About Nucode

Nucode is Nutrient's AI coding agent. It generates full React + TypeScript + Vite apps that integrate the Nutrient Web SDK, running entirely in the browser via Sandpack.

### How it works

**Pipelines** — Nucode is the agent; these are the build pipelines it can choose:
- \`light\` — fast 3-phase build (plan → design → code) for new app requests
- \`full-build\` — Full, the parent/advanced version of the reliable Light pipeline for larger builds
- \`deep\` — Light-style focused coding with heavy Nutrient docs and precise SDK/tooling control

**NutrientViewer** — all PDF rendering uses \`src/NutrientViewer.tsx\`, a CDN-loaded wrapper around \`window.NutrientViewer\`. Never import from npm. Always give the container an explicit height.

**Python backend** — every project includes \`backend/\` with the Nutrient Python SDK (\`nutrient-sdk\` on PyPI, imported as \`nutrient_sdk\`) pre-installed via \`backend/requirements.txt\`, behind a FastAPI app in \`backend/main.py\`. Backend files don't run in the Sandpack preview — they are the server-side project structure for conversion, OCR, and extraction. Extend them when the user asks for server-side processing.

**Persistence** — every edit (AI-generated or manual) is auto-saved to Supabase. Chat history, project files, and editor changes all survive page refresh.

## Builder Rules
- Build the requested product first: branding, pages, workflows, data, state, and business logic.
- Choose the correct scope: focused SDK demo, workflow tool, backend/pipeline, full app, or targeted fix.
- Integrate Nutrient only where documents create value: viewer/review, annotations, redaction, forms, signatures, comparison, export.
- Keep \`src/App.tsx\` thin (≤ 60 lines). Pages go in \`src/pages/\`, components in \`src/components/\`.
- Every visible navigation item, button, form, filter, modal, and workflow action must work.
- Use the real \`src/NutrientViewer.tsx\` wrapper. Never write a fake viewer.
- Read existing files before editing — extend the architecture instead of replacing it.
- Update this file after major changes so future AI edits have accurate project memory.

## Current State
Fresh workspace from the ${template.name} template. Replace with a real product architecture when the user describes their app.

---

> Built using Nucode · Tool developed by Vinayak Kamboj
`;
}

export function buildProjectFiles(template: Template): ProjectFileTemplate[] {
  const nonSystemFiles: ProjectFileTemplate[] = [
    {
      path: "README.md",
      isSystem: false,
      language: "markdown",
      content: buildReadme(template),
    },
    {
      path: "NUTRIENTWEBBUILDER.md",
      isSystem: false,
      language: "markdown",
      content: buildSeedBuilderMemory(template),
    },
  ];

  // Each template seeds a different project structure so work starts faster:
  // - web-sdk-viewer: full-screen Web SDK viewer app (default App.tsx)
  // - blank: empty canvas, Web SDK ready to integrate
  // - python-sdk: backend-first starter around backend/main.py
  // - nodejs-sdk: backend-first starter, plus the server/ Node SDK scaffold
  // The Python SDK backend (backend/) ships with EVERY template.
  const appOverride = APP_TSX_OVERRIDES[template.id];
  const systemFiles = appOverride
    ? SYSTEM_FILES.map((file) =>
        file.path === "src/App.tsx" ? { ...file, content: appOverride } : file
      )
    : SYSTEM_FILES;

  const backendFiles =
    template.id === "nodejs-sdk"
      ? [...PYTHON_SDK_FILES, ...NODE_SDK_FILES]
      : PYTHON_SDK_FILES;

  return [...nonSystemFiles, ...systemFiles, ...backendFiles];
}

export function getCurrentNutrientSdkFileTemplates(): ProjectFileTemplate[] {
  const sdkPaths = new Set(["package.json", "vite.config.ts", "src/NutrientViewer.tsx", "src/App.tsx", "src/index.css"]);
  return SYSTEM_FILES.filter((file) => sdkPaths.has(file.path));
}
