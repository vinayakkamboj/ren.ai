"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  SandpackProvider,
  SandpackPreview,
  SandpackLayout,
  useSandpack,
} from "@codesandbox/sandpack-react";
import { ChevronUp, Terminal, AlertCircle, Trash2, Copy, Check, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useWorkspaceStore } from "@/features/workspaces/store";
import { cn } from "@/lib/utils";
import {
  NUTRIENT_CDN_BASE_URL,
  NUTRIENT_CDN_SCRIPT_URL,
  NUTRIENT_WEB_DEMO_DOCUMENT_URL,
} from "@/lib/nutrient/sdk-version";
import type { ProjectFile } from "@/types";

// All packages that are pre-installed in every generated project. This mirrors
// the dependencies block in lib/project-files/base-template.ts. Sandpack needs
// the full list so imports work even for old projects or custom templates that
// don't have a complete package.json yet.
const STANDARD_DEPS: Record<string, string> = {
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
};

const DEFAULT_INDEX_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Nutrient Demo</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = {
        darkMode: ["class"],
        theme: {
          extend: {
            colors: {
              background: "hsl(var(--background) / <alpha-value>)",
              foreground: "hsl(var(--foreground) / <alpha-value>)",
              card: { DEFAULT: "hsl(var(--card) / <alpha-value>)", foreground: "hsl(var(--card-foreground) / <alpha-value>)" },
              popover: { DEFAULT: "hsl(var(--popover) / <alpha-value>)", foreground: "hsl(var(--popover-foreground) / <alpha-value>)" },
              primary: { DEFAULT: "hsl(var(--primary) / <alpha-value>)", foreground: "hsl(var(--primary-foreground) / <alpha-value>)" },
              secondary: { DEFAULT: "hsl(var(--secondary) / <alpha-value>)", foreground: "hsl(var(--secondary-foreground) / <alpha-value>)" },
              muted: { DEFAULT: "hsl(var(--muted) / <alpha-value>)", foreground: "hsl(var(--muted-foreground) / <alpha-value>)" },
              accent: { DEFAULT: "hsl(var(--accent) / <alpha-value>)", foreground: "hsl(var(--accent-foreground) / <alpha-value>)" },
              destructive: { DEFAULT: "hsl(var(--destructive) / <alpha-value>)", foreground: "hsl(var(--destructive-foreground) / <alpha-value>)" },
              success: "hsl(var(--success) / <alpha-value>)",
              warning: "hsl(var(--warning) / <alpha-value>)",
              border: "hsl(var(--border) / <alpha-value>)",
              input: "hsl(var(--input) / <alpha-value>)",
              ring: "hsl(var(--ring) / <alpha-value>)",
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
</html>`;

const DEFAULT_MAIN_TSX = `import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;

const DEFAULT_INDEX_CSS = `* { box-sizing: border-box; }
html, body, #root { width: 100%; height: 100%; margin: 0; }
body { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }`;

const TAILWIND_RUNTIME_SNIPPET = `<script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = {
        darkMode: ["class"],
        theme: {
          extend: {
            colors: {
              background: "hsl(var(--background) / <alpha-value>)",
              foreground: "hsl(var(--foreground) / <alpha-value>)",
              card: { DEFAULT: "hsl(var(--card) / <alpha-value>)", foreground: "hsl(var(--card-foreground) / <alpha-value>)" },
              popover: { DEFAULT: "hsl(var(--popover) / <alpha-value>)", foreground: "hsl(var(--popover-foreground) / <alpha-value>)" },
              primary: { DEFAULT: "hsl(var(--primary) / <alpha-value>)", foreground: "hsl(var(--primary-foreground) / <alpha-value>)" },
              secondary: { DEFAULT: "hsl(var(--secondary) / <alpha-value>)", foreground: "hsl(var(--secondary-foreground) / <alpha-value>)" },
              muted: { DEFAULT: "hsl(var(--muted) / <alpha-value>)", foreground: "hsl(var(--muted-foreground) / <alpha-value>)" },
              accent: { DEFAULT: "hsl(var(--accent) / <alpha-value>)", foreground: "hsl(var(--accent-foreground) / <alpha-value>)" },
              destructive: { DEFAULT: "hsl(var(--destructive) / <alpha-value>)", foreground: "hsl(var(--destructive-foreground) / <alpha-value>)" },
              success: "hsl(var(--success) / <alpha-value>)",
              warning: "hsl(var(--warning) / <alpha-value>)",
              border: "hsl(var(--border) / <alpha-value>)",
              input: "hsl(var(--input) / <alpha-value>)",
              ring: "hsl(var(--ring) / <alpha-value>)",
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
    </script>`;

// Real Nutrient Web SDK wrapper used inside Sandpack. It loads the prebuilt SDK
// from Nutrient's CDN via a <script> tag and uses window.NutrientViewer. We do
// NOT import the npm package here - Sandpack's in-browser bundler cannot
// transpile the 5 MB minified SDK and throws "_Symbol$iterator is not defined".
const NUTRIENT_VIEWER_RUNTIME = `
import { useEffect, useRef, useState } from "react";

let loaderPromise = null;
let preloadStarted = false;

const TOOLBAR_TYPE_ALIASES = {
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

function normalizeToolbarItems(toolbarItems) {
  if (!Array.isArray(toolbarItems)) return [];
  const normalized = [];

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

function maybePreloadWorker(NutrientViewerModule) {
  if (preloadStarted) return;
  preloadStarted = true;
  if (typeof NutrientViewerModule.preloadWorker === "function") {
    NutrientViewerModule.preloadWorker({ baseUrl: "${NUTRIENT_CDN_BASE_URL}" }).catch(() => {
      // Preload is a performance optimization, not a hard requirement.
    });
  }
}

function loadNutrientFromCDN() {
  if (window.NutrientViewer) {
    maybePreloadWorker(window.NutrientViewer);
    return Promise.resolve(window.NutrientViewer);
  }
  loaderPromise ??= new Promise((resolve, reject) => {
    const finish = () => {
      if (window.NutrientViewer) {
        maybePreloadWorker(window.NutrientViewer);
        resolve(window.NutrientViewer);
      } else {
        reject(new Error("window.NutrientViewer is undefined after script load"));
      }
    };
    const existing = document.querySelector('script[data-nutrient-cdn="true"]');
    if (existing) {
      if (window.NutrientViewer) return finish();
      existing.addEventListener("load", finish);
      existing.addEventListener("error", () => { loaderPromise = null; reject(new Error("Failed to load Nutrient SDK from CDN")); });
      return;
    }
    const script = document.createElement("script");
    script.src = "${NUTRIENT_CDN_SCRIPT_URL}";
    script.async = true;
    script.setAttribute("data-nutrient-cdn", "true");
    script.onload = finish;
    script.onerror = () => { loaderPromise = null; script.remove(); reject(new Error("Failed to load Nutrient SDK from CDN")); };
    document.head.appendChild(script);
  });
  return loaderPromise;
}

function unloadViewer(NutrientViewer, target) {
  try {
    NutrientViewer.unload(target);
  } catch {
    // best-effort cleanup
  }
}

function notifyInstanceUnload(handler) {
  try {
    handler?.();
  } catch {
    // Consumer cleanup must not block SDK unload.
  }
}

export function NutrientViewer({
  document: documentUrl,
  theme = "DARK",
  toolbarItems = [],
  useDefaultToolbarItems = false,
  enableRichText = true,
  licenseKey,
  onInstanceReady,
  onInstanceUnload,
}) {
  const containerRef = useRef(null);
  const instanceRef = useRef(null);
  const onInstanceReadyRef = useRef(onInstanceReady);
  const onInstanceUnloadRef = useRef(onInstanceUnload);
  const loadIdRef = useRef(0);
  const [error, setError] = useState(null);

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
        const NutrientViewerModule = await loadNutrientFromCDN();
        if (cancelled || loadIdRef.current !== loadId) return;

        // Wait until the container has non-zero width AND height before loading.
        // On reload the CDN script is cached and resolves almost synchronously -
        // before the Sandpack iframe's flex layout has finished computing dimensions.
        // ResizeObserver fires once layout settles, guaranteeing both dimensions > 0.
        await new Promise((resolve) => {
          if (container.offsetHeight > 0 && container.offsetWidth > 0) { resolve(undefined); return; }
          const ro = new ResizeObserver((entries) => {
            const r = entries[0]?.contentRect;
            if ((r?.height ?? 0) > 0 && (r?.width ?? 0) > 0) { ro.disconnect(); resolve(undefined); }
          });
          ro.observe(container);
          // Safety fallback - try after 3s regardless; error overlay handles it if still 0
          setTimeout(() => { ro.disconnect(); resolve(undefined); }, 3000);
        });
        if (cancelled || loadIdRef.current !== loadId) return;

        if (instanceRef.current) {
          notifyInstanceUnload(onInstanceUnloadRef.current);
          unloadViewer(NutrientViewerModule, instanceRef.current);
          instanceRef.current = null;
        }
        unloadViewer(NutrientViewerModule, container);

        const normalizedToolbarItems = normalizeToolbarItems(toolbarItems);
        const effectiveToolbarItems = useDefaultToolbarItems
          ? [...(NutrientViewerModule.defaultToolbarItems ?? []), ...normalizedToolbarItems]
          : normalizedToolbarItems;

        const loadOptions = {
          container,
          document: documentUrl || "${NUTRIENT_WEB_DEMO_DOCUMENT_URL}",
          baseUrl: "${NUTRIENT_CDN_BASE_URL}",
          theme: theme === "LIGHT" ? NutrientViewerModule.Theme.LIGHT : NutrientViewerModule.Theme.DARK,
          enableRichText: () => enableRichText,
          toolbarItems: effectiveToolbarItems?.length ? effectiveToolbarItems : undefined,
          initialViewState: new NutrientViewerModule.ViewState({
            currentPageIndex: 0,
            showToolbar: true,
            zoom: NutrientViewerModule.ZoomMode.FIT_TO_WIDTH,
          }),
        };

        if (licenseKey) loadOptions.licenseKey = licenseKey;

        const instance = await NutrientViewerModule.load(loadOptions);
        if (cancelled || loadIdRef.current !== loadId) {
          unloadViewer(NutrientViewerModule, instance);
          unloadViewer(NutrientViewerModule, container);
          return;
        }
        instanceRef.current = instance;
        onInstanceReadyRef.current?.(instance, NutrientViewerModule);
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

  return (
    <div style={{ position: "relative", height: "100%", width: "100%", minHeight: 360 }}>
      <div ref={containerRef} style={{ height: "100%", width: "100%", minHeight: 360 }} />
      {error && (
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "rgba(17, 17, 17, 0.94)",
          color: "#fca5a5",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 11,
          lineHeight: 1.5,
          textAlign: "center",
        }}>
          Nutrient Web SDK failed to load: {error}
        </div>
      )}
    </div>
  );
}
`;

/**
 * Strip/fix things Sandpack's bundler can't handle:
 *  1. import.meta.env → undefined / {}
 *  2. @/ alias imports → correct relative paths (Sandpack has no tsconfig alias)
 */
function sanitizeForSandpack(code: string, filePath = ""): string {
  let result = code
    .replace(/import\.meta\.env\.[A-Z_a-z0-9]+/g, "undefined")
    .replace(/import\.meta\.env/g, "{}");

  // Resolve @/ → relative path based on the file's depth inside src/
  // e.g. src/components/Foo.tsx is depth 1 inside src → prefix = "../"
  const srcIdx = filePath.split("/").indexOf("src");
  if (srcIdx !== -1) {
    const partsAfterSrc = filePath.split("/").slice(srcIdx + 1);
    const depth = partsAfterSrc.length - 1; // subtract filename
    const prefix = depth > 0 ? "../".repeat(depth) : "./";
    result = result.replace(/from\s+["']@\/([^"']+)["']/g, `from "${prefix}$1"`);
    result = result.replace(/import\s+["']@\/([^"']+)["']/g, `import "${prefix}$1"`);
  }

  return result;
}

/**
 * Validate that a JS/TS/JSX/TSX file appears syntactically complete.
 * Catches the most common AI truncation pattern: brace-depth > 0.
 */
function isSyntacticallyComplete(code: string, path: string): boolean {
  if (!/\.(tsx?|jsx?)$/.test(path)) return true;
  const trimmed = code.trim();
  if (!trimmed) return false;
  if (!/[};>"]$/.test(trimmed)) return false;

  let depth = 0;
  let i = 0;
  while (i < trimmed.length) {
    const ch = trimmed[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      const q = ch;
      i++;
      while (i < trimmed.length) {
        if (trimmed[i] === "\\" && q !== "`") { i += 2; continue; }
        if (trimmed[i] === q) { i++; break; }
        i++;
      }
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    i++;
  }
  return depth === 0;
}

/**
 * Best-effort recovery for truncated AI output.
 *
 * Scans for the last character position where brace depth returned to 0,
 * meaning the last complete top-level block (function, const, class, etc.).
 * Returns the recovered slice, or null if there isn't enough usable content.
 *
 * This avoids the "Loading X…" stub whenever a file was cut off mid-function
 * but still has earlier exports or helper components that are fully intact.
 */
function tryRepairTruncated(code: string, path: string): string | null {
  if (!/\.(tsx?|jsx?)$/.test(path)) return null;

  const trimmed = code.trim();
  let depth = 0;
  // Last position where depth returned to 0 AND what follows is a new top-level
  // declaration (import/export/function/class/const/let/var/type/interface) or EOF.
  // This prevents recording depth-0 positions caused by destructuring parameters
  // e.g. `function Foo({ bar }` - the `}` brings depth to 0 mid-signature.
  let lastCompleteBlockEnd = -1;
  let i = 0;

  while (i < trimmed.length) {
    const ch = trimmed[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      const q = ch;
      i++;
      while (i < trimmed.length) {
        if (trimmed[i] === "\\" && q !== "`") { i += 2; continue; }
        if (trimmed[i] === q) { i++; break; }
        i++;
      }
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        const pos = i + 1;
        const rest = trimmed.slice(pos).trimStart();
        // Only record this as a complete block boundary if what follows is
        // the start of a new top-level declaration, a comment, or EOF.
        // A bare identifier/operator here means we're inside an expression.
        const isTopLevelBoundary =
          rest === "" ||
          /^(?:import[\s{]|export[\s{]|function\s|class\s|const\s|let\s|var\s|type\s|interface\s|\/\/|\/\*)/.test(rest);
        if (isTopLevelBoundary) lastCompleteBlockEnd = pos;
      }
    }
    i++;
  }

  // Already balanced - not truncated.
  if (depth === 0) return null;
  // Nothing usable recovered (the only complete block was the truncated one).
  if (lastCompleteBlockEnd < 80) return null;

  let recovered = trimmed.slice(0, lastCompleteBlockEnd).trimEnd();

  // Sanity check: recovered content must end at a real statement boundary.
  if (!/[};>"]$/.test(recovered)) return null;

  // If the recovered slice has no `export default`, try to surface the last
  // named export so the file is still importable.
  if (!/export\s+default\b/.test(recovered)) {
    const matches = [...recovered.matchAll(/^export\s+(?:function|const)\s+([A-Z][a-zA-Z0-9]*)/gm)];
    const last = matches.pop();
    if (last) recovered += `\nexport default ${last[1]};\n`;
  }

  return recovered;
}

/** Safe stub - exports both named + default so any import style works.
 *  .ts files must NOT contain JSX (Sandpack transpiles them without JSX support).
 *  Hooks get a no-op function; service/type/data/util .ts files get an empty export.
 *  Only .tsx/.jsx files get the React placeholder component.
 */
function makeSafeStub(path: string): string {
  // JSON files must contain valid JSON - not JS exports.
  if (path.endsWith(".json")) return "{}";
  // CSS files must contain valid CSS.
  if (path.endsWith(".css")) return "/* stub */";

  const raw = path.split("/").pop()?.replace(/\.(tsx?|jsx?)$/, "") ?? "Component";
  const isTsx = path.endsWith(".tsx") || path.endsWith(".jsx");

  if (!isTsx) {
    // Pure TypeScript file - no JSX allowed.
    const isHook = /\/use[A-Z]/.test(path);
    if (isHook) {
      const fnName = raw.charAt(0).toLowerCase() + raw.slice(1);
      return `export function ${fnName}() { return {}; }\nexport default ${fnName};\n`;
    }
    return `export {};\n`;
  }

  const name = raw.charAt(0).toUpperCase() + raw.slice(1).replace(/[^a-zA-Z0-9]/g, "");
  return (
    `import React from "react";\n` +
    `export function ${name}() { return <div style={{padding:24,color:"#555",fontFamily:"monospace",fontSize:12}}>Loading ${name}…</div>; }\n` +
    `export default ${name};\n`
  );
}

/** Extract all relative import/export specifiers from a file's source. */
function extractRelativeImports(code: string): string[] {
  const results: string[] = [];
  // static: import ... from "./foo"  |  export ... from "./foo"  |  import "./foo"
  const staticRe = /(?:from|import)\s+['"](\.[^'"]+)['"]/g;
  // dynamic: import("./foo")
  const dynRe = /import\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g;
  let m;
  while ((m = staticRe.exec(code)) !== null) results.push(m[1]);
  while ((m = dynRe.exec(code)) !== null) results.push(m[1]);
  return results;
}

/** Resolve a relative specifier + the importing file's sandpack path to candidate paths. */
function resolveImportCandidates(spec: string, fromSandpackPath: string): string[] {
  const dir = fromSandpackPath.replace(/\/[^/]+$/, "");
  const parts = (dir + "/" + spec).split("/");
  const out: string[] = [];
  for (const p of parts) {
    if (p === "" || p === ".") continue;
    if (p === "..") { out.pop(); continue; }
    out.push(p);
  }
  const base = "/" + out.join("/");
  // If the specifier already has a recognised extension, return as-is.
  if (/\.(tsx?|jsx?|css|json|svg|png|jpg)$/.test(base)) return [base];
  return [`${base}.tsx`, `${base}.ts`, `${base}.jsx`, `${base}.js`, `${base}/index.tsx`, `${base}/index.ts`];
}

/**
 * Scan every file in the map for relative imports; for any that have no
 * corresponding entry, inject a safe stub. Runs iteratively so chains
 * (A → missing B → B imports missing C) are resolved in one pass.
 */
function injectMissingStubs(files: Record<string, { code: string }>): void {
  let changed = true;
  for (let iter = 0; changed && iter < 8; iter++) {
    changed = false;
    for (const [path, { code }] of Object.entries(files)) {
      for (const spec of extractRelativeImports(code)) {
        const candidates = resolveImportCandidates(spec, path);
        if (!candidates.some((c) => c in files)) {
          files[candidates[0]] = { code: makeSafeStub(candidates[0]) };
          changed = true;
        }
      }
    }
  }
}

function ensureTailwindRuntime(indexHtml: string): string {
  if (/cdn\.tailwindcss\.com|tailwind\.config/.test(indexHtml)) return indexHtml;
  if (indexHtml.includes("</head>")) {
    return indexHtml.replace("</head>", `    ${TAILWIND_RUNTIME_SNIPPET}\n  </head>`);
  }
  return `${TAILWIND_RUNTIME_SNIPPET}\n${indexHtml}`;
}

/** Connection info for real backend processing from inside the preview iframe.
 *  Generated code reads window.__NUCODE_BACKEND__ (cross-origin, so the demo
 *  token authenticates against the proxy instead of cookies). */
export interface BackendRuntimeGlobals {
  url: string;
  token?: string;
}

function injectBackendRuntime(indexHtml: string, backend: BackendRuntimeGlobals | null): string {
  if (!backend) return indexHtml;
  const snippet = `<script>window.__NUCODE_BACKEND__ = ${JSON.stringify({ url: backend.url, token: backend.token ?? null })};</script>`;
  if (indexHtml.includes("__NUCODE_BACKEND__")) return indexHtml;
  if (indexHtml.includes("</head>")) {
    return indexHtml.replace("</head>", `    ${snippet}\n  </head>`);
  }
  return `${snippet}\n${indexHtml}`;
}

/** Build Sandpack file map, validating + sanitizing every file. */
function buildSandpackFiles(
  projectFiles: ProjectFile[],
  backendGlobals: BackendRuntimeGlobals | null = null
): Record<string, { code: string; active?: boolean }> {
  const files: Record<string, { code: string; active?: boolean }> = {};
  for (const f of projectFiles) {
    const sandpackPath = f.path.startsWith("/") ? f.path : `/${f.path}`;
    if (f.path === "src/NutrientViewer.tsx") {
      files[sandpackPath] = { code: NUTRIENT_VIEWER_RUNTIME };
      continue;
    }
    const sanitized = sanitizeForSandpack(f.content, f.path);
    let code: string;
    if (isSyntacticallyComplete(sanitized, f.path)) {
      code = sanitized;
    } else {
      const repaired = tryRepairTruncated(sanitized, f.path);
      if (repaired) {
        console.warn(`[Sandpack] Recovered truncated file: ${f.path} (${repaired.length}/${sanitized.length} chars kept)`);
        code = repaired;
      } else {
        code = makeSafeStub(f.path);
      }
    }
    files[sandpackPath] = { code: f.path === "index.html" ? ensureTailwindRuntime(code) : code };
  }
  if (!files["/src/NutrientViewer.tsx"]) {
    files["/src/NutrientViewer.tsx"] = { code: NUTRIENT_VIEWER_RUNTIME };
  }
  if (!files["/index.html"]) {
    files["/index.html"] = { code: DEFAULT_INDEX_HTML };
  } else {
    files["/index.html"].code = ensureTailwindRuntime(files["/index.html"].code);
  }
  files["/index.html"].code = injectBackendRuntime(files["/index.html"].code, backendGlobals);
  if (!files["/src/main.tsx"] && !files["/src/main.jsx"]) {
    files["/src/main.tsx"] = { code: DEFAULT_MAIN_TSX };
  }
  if (!files["/src/index.css"]) {
    files["/src/index.css"] = { code: DEFAULT_INDEX_CSS };
  }
  // Auto-stub any relative imports that don't have a corresponding file.
  // This prevents ModuleNotFoundError when the AI generates imports for files
  // it hasn't included in the patch yet (or forgot entirely).
  injectMissingStubs(files);
  return files;
}

// ─── Internal sub-components ──────────────────────────────────────────────────

/** Syncs projectFiles into the running Sandpack instance without remounting. */
function FileSyncer({ projectFiles, backendGlobals = null }: { projectFiles: ProjectFile[]; backendGlobals?: BackendRuntimeGlobals | null }) {
  const { sandpack } = useSandpack();
  const prevRef = useRef<ProjectFile[]>([]);
  const lastGoodRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const prevMap = new Map(prevRef.current.map((f) => [f.path, f.content]));
    const nextPaths = new Set(projectFiles.map((file) =>
      file.path.startsWith("/") ? file.path : `/${file.path}`
    ));
    for (const previous of prevRef.current) {
      const previousPath = previous.path.startsWith("/") ? previous.path : `/${previous.path}`;
      if (!nextPaths.has(previousPath) && previousPath in sandpack.files) {
        sandpack.deleteFile(previousPath);
      }
    }
    for (const file of projectFiles) {
      if (file.path === "src/NutrientViewer.tsx") continue;
      if (prevMap.get(file.path) === file.content) continue;
      const sandpackPath = file.path.startsWith("/") ? file.path : `/${file.path}`;
      const sanitized = sanitizeForSandpack(file.content, file.path);
      let toApply: string | null = null;
      if (isSyntacticallyComplete(sanitized, file.path)) {
        toApply = sanitized;
      } else {
        const repaired = tryRepairTruncated(sanitized, file.path);
        if (repaired) {
          console.warn(`[Sandpack] Recovered truncated live update: ${file.path}`);
          toApply = repaired;
        }
        // else: nothing usable - leave the previous version in place
      }
      if (!toApply) continue;
      if (file.path === "index.html") toApply = injectBackendRuntime(ensureTailwindRuntime(toApply), backendGlobals);
      lastGoodRef.current.set(sandpackPath, toApply);
      sandpack.updateFile(sandpackPath, toApply);

      // For each relative import in the incoming file, add a stub if the
      // target doesn't already exist in the live sandbox (prevents
      // ModuleNotFoundError during streaming before all files arrive).
      const currentFiles = sandpack.files as Record<string, { code: string }>;
      const toAdd: Record<string, { code: string }> = { [sandpackPath]: { code: sanitized }, ...currentFiles };
      injectMissingStubs(toAdd);
      for (const [stubPath, { code }] of Object.entries(toAdd)) {
        if (!(stubPath in currentFiles) && stubPath !== sandpackPath) {
          sandpack.addFile(stubPath, code);
        }
      }
    }
    prevRef.current = projectFiles;
  }, [projectFiles]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

/** Captures runtime console errors + build errors and writes them to the store. */
function ErrorCapture() {
  const { listen, sandpack } = useSandpack();
  const setRuntimeErrors = useWorkspaceStore((s) => s.setRuntimeErrors);
  const dismissRuntimeErrors = useWorkspaceStore((s) => s.dismissRuntimeErrors);
  const errorsRef = useRef<string[]>([]);

  // When Sandpack remounts (new viewerKey after a fix), start fresh
  useEffect(() => {
    errorsRef.current = [];
    dismissRuntimeErrors();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pushErrors = useCallback(
    (newErrs: string[]) => {
      if (!newErrs.length) return;
      // Deduplicate - the same error can fire dozens of times per render cycle.
      // Each duplicate changes the joined key in ChatPanel, resetting the attempt
      // counter and causing an infinite auto-fix loop.
      const existing = new Set(errorsRef.current);
      const fresh = newErrs.filter((e) => !existing.has(e));
      if (!fresh.length) return;
      errorsRef.current = [...errorsRef.current, ...fresh].slice(-10);
      setRuntimeErrors([...errorsRef.current]);
    },
    [setRuntimeErrors]
  );

  // Listen for console errors from the sandbox iframe
  useEffect(() => {
    const unsub = listen((msg: { type?: string; log?: Array<{ method: string; data?: unknown[] }> }) => {
      if (msg.type !== "console") return;
      const logEntries = msg.log ?? [];
      const errs = logEntries
        .filter((l) => l.method === "error")
        .map((l) => formatConsoleMessage(l.data))
        .filter(Boolean);
      pushErrors(errs);
    });
    return () => { unsub(); };
  }, [listen, pushErrors]);

  // Also capture build/compile errors from sandpack.error
  const buildError = sandpack.error as { message?: string } | null;
  const prevBuildErrorRef = useRef<string | null>(null);
  useEffect(() => {
    const msg = buildError?.message ?? null;
    if (msg && msg !== prevBuildErrorRef.current) {
      prevBuildErrorRef.current = msg;
      pushErrors([`Build error: ${msg.split("\n")[0]}`]);
    } else if (!msg) {
      prevBuildErrorRef.current = null;
    }
  }, [buildError, pushErrors]);

  return null;
}

/** Centered boot indicator — replaces Sandpack's tiny bottom-corner status text.
 *  Visible only during the initial boot (until the first done/idle), so AI-edit
 *  recompiles never cover the running app. A viewerKey remount re-arms it. */
function BootLoadingOverlay() {
  const { listen } = useSandpack();
  const [stage, setStage] = useState<string | null>("Starting preview…");

  useEffect(() => {
    const unsub = listen((msg) => {
      const message = msg as { type?: string; status?: string };
      setStage((current) => {
        if (current === null) return null; // boot finished — stay hidden
        if (message.type === "done" || (message.type === "status" && message.status === "idle")) {
          return null;
        }
        if (message.type === "status") {
          if (message.status === "installing-dependencies") return "Installing packages…";
          if (message.status === "transpiling" || message.status === "evaluating") return "Building preview…";
          if (message.status === "initializing") return "Starting preview…";
        }
        return current;
      });
    });
    return () => { unsub(); };
  }, [listen]);

  if (stage === null) return null;

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 10,
      background: "rgba(10,8,8,0.96)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 14, pointerEvents: "none",
    }}>
      <div style={{
        height: 28, width: 28, borderRadius: "50%",
        border: "2.5px solid #2a2222", borderTopColor: "#c4a882",
        animation: "spin 0.8s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ color: "#e4e4e7", fontSize: 13, fontWeight: 600 }}>{stage}</div>
      <div style={{ color: "#52525b", fontSize: 11 }}>
        First load takes a moment while packages install
      </div>
    </div>
  );
}

/** Friendly overlay when Sandpack reports a build/compile error. */
function SandpackErrorOverlay() {
  const { sandpack } = useSandpack();
  const err = sandpack.error as { message?: string } | null;
  if (!err) return null;
  const msg = err.message ?? String(err);
  const fileMatch = msg.match(/\/src\/([^\n:]+)/);
  const fileName = fileMatch ? fileMatch[1].trim() : null;
  const summary = msg.split("\n").slice(0, 2).join(" ").slice(0, 220);

  function triggerFix() {
    const prompt = `Fix this crash${fileName ? ` in ${fileName}` : ""}: ${summary.slice(0, 200)}`;
    window.dispatchEvent(new CustomEvent("nutrient:send-prompt", { detail: { prompt } }));
  }

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 20,
      background: "rgba(10,8,8,0.96)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: 28, gap: 14,
    }}>
      <div style={{ color: "#f87171", fontSize: 11, fontFamily: "monospace", fontWeight: 600 }}>
        {fileName ? `Syntax error · ${fileName}` : "Compilation error"}
      </div>
      <pre style={{
        color: "#52525b", fontSize: 9, fontFamily: "monospace",
        maxWidth: "100%", whiteSpace: "pre-wrap", overflow: "auto", maxHeight: 100,
        border: "1px solid #2a2222", borderRadius: 4, padding: "8px 12px",
        background: "#0c0a0a", margin: 0,
      }}>{summary}</pre>
      <button
        onClick={triggerFix}
        style={{
          padding: "8px 20px", background: "#dc2626", color: "#fff",
          border: "none", borderRadius: 6, cursor: "pointer",
          fontSize: 12, fontWeight: 600, letterSpacing: "0.01em",
        }}
      >
        Fix this crash →
      </button>
      <p style={{ color: "#3f3f46", fontSize: 10, textAlign: "center", margin: 0 }}>
        or describe the fix in the chat panel
      </p>
    </div>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

interface Props {
  projectFiles: ProjectFile[];
  viewerKey: number;
  chrome?: "workspace" | "share";
}

export function SandpackLivePreview({ projectFiles, viewerKey, chrome = "workspace" }: Props) {
  const config = useWorkspaceStore((s) => s.config);
  const workspace = useWorkspaceStore((s) => s.workspace);

  // Real backend connection for the preview iframe. Custom mode → the user's
  // own backend URL; managed mode → our proxy + the workspace demo token
  // (cookies don't cross the sandbox origin, so the token is the auth).
  let backendGlobals: BackendRuntimeGlobals | null = null;
  const backend = config?.backend;
  if (backend?.mode === "custom" && backend.customBackendUrl?.trim()) {
    backendGlobals = { url: backend.customBackendUrl.trim() };
  } else if (workspace && typeof window !== "undefined") {
    backendGlobals = {
      url: `${window.location.origin}/api/backend-proxy/${workspace.id}`,
      token: backend?.demoToken,
    };
  }

  const files = buildSandpackFiles(projectFiles, backendGlobals);
  const isSharedRuntime = chrome === "share";
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const runtimeErrors = useWorkspaceStore((s) => s.runtimeErrors);

  // Auto-expand console when new errors arrive
  const prevErrorLen = useRef(0);
  useEffect(() => {
    if (runtimeErrors.length > prevErrorLen.current) {
      setConsoleOpen(true);
      setErrorCount(runtimeErrors.length);
    }
    prevErrorLen.current = runtimeErrors.length;
  }, [runtimeErrors]);

  const pkgFile = projectFiles.find((f) => f.path === "package.json");
  // Start with all standard packages. If the project has its own package.json
  // (e.g. it added recharts or supabase), merge it in - project wins for version
  // pins and adds any extra packages. Nutrient SDK must NOT be bundled; it loads
  // from the CDN at runtime (see NUTRIENT_VIEWER_RUNTIME).
  let deps: Record<string, string> = { ...STANDARD_DEPS };
  if (pkgFile) {
    try {
      const pkg = JSON.parse(pkgFile.content) as { dependencies?: Record<string, string> };
      const extra = { ...(pkg.dependencies ?? {}) };
      delete extra["pspdfkit"];
      delete extra["@nutrient-sdk/viewer"];
      deps = { ...STANDARD_DEPS, ...extra };
    } catch { /* use STANDARD_DEPS */ }
  }

  return (
    <div className="w-full h-full flex flex-col" key={viewerKey} style={{ minHeight: 300 }}>
      <SandpackProvider
        template="react-ts"
        files={files}
        customSetup={{ dependencies: deps }}
        options={{
          activeFile: "/src/App.tsx",
          visibleFiles: ["/src/App.tsx"],
          recompileMode: "delayed",
          recompileDelay: 800,
          externalResources: [
            "https://cdn.tailwindcss.com",
            "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap",
          ],
        }}
        theme="dark"
        style={{ flex: 1, minHeight: 0, width: "100%", display: "flex", flexDirection: "column" }}
      >
        <SandpackLayout style={{ flex: 1, minHeight: 0, border: "none", borderRadius: 0, position: "relative", display: "flex", flexDirection: "column" }}>
          <SandpackPreview
            style={{ flex: 1, minHeight: 0 }}
            showOpenInCodeSandbox={false}
            showRefreshButton={!isSharedRuntime}
            showNavigator={false}
          />
          <BootLoadingOverlay />
          <SandpackErrorOverlay />
        </SandpackLayout>

        {/* Console toggle bar */}
        {!isSharedRuntime && (
          <ConsoleToggleBar
            open={consoleOpen}
            onToggle={() => setConsoleOpen((v) => !v)}
            errorCount={errorCount}
            onClearBadge={() => setErrorCount(0)}
            runtimeErrors={runtimeErrors}
          />
        )}

        {/* Console panel - custom UI with level filtering + noise suppression */}
        <AnimatePresence initial={false}>
          {!isSharedRuntime && consoleOpen && (
            <motion.div
              key="console-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 240, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              style={{ minHeight: 0, overflow: "hidden", background: "#0a0a0a", borderTop: "1px solid #1a1a1a" }}
            >
              <NutrientConsolePanel runtimeErrors={runtimeErrors} />
            </motion.div>
          )}
        </AnimatePresence>

        <FileSyncer projectFiles={projectFiles} backendGlobals={backendGlobals} />
        <ErrorCapture />
      </SandpackProvider>
    </div>
  );
}

// ── Polished console toggle bar ──────────────────────────────────────────────
// ── Custom Sandpack console with level filtering + noise suppression ─────────
type ConsoleEntry = { id: number; level: "error" | "warn" | "log" | "info" | "debug"; text: string };

// Lines we don't want cluttering the console - pure SDK info, Sandpack telemetry
// timeouts, and the Nutrient version banner.
const NOISE_PATTERNS: RegExp[] = [
  /^Nutrient Web \d/,
  /preloadWorker\(\) first/,
  /WebAssembly artifacts need to be downloaded/,
  /^Using WASM method$/,
  /^Start https:\/\/cdn\.cloud\.pspdfkit\.com.*\.wasm download\.?$/,
  /Download and Instantiation complete, took:/,
  /Native initialization complete, took:/,
  /col\.csbops\.io\/data\/sandpack/,
  /ERR_CONNECTION_TIMED_OUT/,
  /persistMeasurements/,
];

function isNoise(text: string): boolean {
  return NOISE_PATTERNS.some((p) => p.test(text));
}

const LEVEL_META = {
  error: { label: "ERR",  color: "text-red-300",     bg: "bg-red-500/10",     dot: "bg-red-400" },
  warn:  { label: "WARN", color: "text-amber-300",   bg: "bg-amber-500/10",   dot: "bg-amber-400" },
  info:  { label: "INFO", color: "text-sky-300",     bg: "bg-sky-500/10",     dot: "bg-sky-400" },
  log:   { label: "LOG",  color: "text-zinc-400",    bg: "bg-transparent",    dot: "bg-zinc-600" },
  debug: { label: "DBG",  color: "text-zinc-500",    bg: "bg-transparent",    dot: "bg-zinc-700" },
} as const;

function NutrientConsolePanel({ runtimeErrors }: { runtimeErrors: string[] }) {
  const { listen } = useSandpack();
  const [entries, setEntries] = useState<ConsoleEntry[]>([]);
  const [filter, setFilter] = useState<"all" | "error" | "warn">("all");
  const idCounter = useRef(0);
  const seenTextsRef = useRef<Set<string>>(new Set());

  const appendEntries = useCallback((fresh: Array<Omit<ConsoleEntry, "id">>) => {
    const unique: ConsoleEntry[] = [];
    for (const entry of fresh) {
      const key = `${entry.level}:${entry.text}`;
      if (seenTextsRef.current.has(key)) continue;
      seenTextsRef.current.add(key);
      unique.push({ ...entry, id: ++idCounter.current });
    }
    if (unique.length) setEntries((prev) => [...prev, ...unique].slice(-200));
  }, []);

  // ErrorCapture is always mounted, while this panel mounts only after the user
  // opens it. Seed the panel from the runtime error store so the badge and log
  // list cannot get out of sync.
  useEffect(() => {
    appendEntries(
      runtimeErrors
        .filter((text) => text && !isNoise(text))
        .map((text) => ({ level: "error" as const, text }))
    );
  }, [appendEntries, runtimeErrors]);

  useEffect(() => {
    const unsub = listen((msg) => {
      const message = msg as { type?: string; log?: Array<{ method?: string; data?: unknown[] }> };
      if (message.type !== "console" || !message.log) return;
      const fresh: Array<Omit<ConsoleEntry, "id">> = [];
      for (const item of message.log) {
        const text = formatConsoleMessage(item.data);
        if (!text || isNoise(text)) continue;
        const rawMethod = item.method ?? "log";
        const level: ConsoleEntry["level"] =
          rawMethod === "error" || rawMethod === "warn" || rawMethod === "info" || rawMethod === "debug"
            ? rawMethod
            : "log";
        fresh.push({ level, text });
      }
      appendEntries(fresh);
    });
    return () => { unsub(); };
  }, [appendEntries, listen]);

  const visible = entries.filter((e) => filter === "all" || e.level === filter);
  const counts = {
    error: entries.filter((e) => e.level === "error").length,
    warn: entries.filter((e) => e.level === "warn").length,
    all: entries.length,
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filter strip */}
      <div className="flex items-center gap-1 px-3 py-1 border-b border-[#1a1a1a] bg-[#0a0a0a] shrink-0">
        {(["all", "error", "warn"] as const).map((k) => {
          const active = filter === k;
          const label = k === "all" ? `All · ${counts.all}` : k === "error" ? `Errors · ${counts.error}` : `Warnings · ${counts.warn}`;
          return (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={cn(
                "px-2 py-0.5 text-[10px] font-mono rounded transition-colors",
                active
                  ? k === "error"
                    ? "bg-red-500/15 text-red-200"
                    : k === "warn"
                      ? "bg-amber-500/15 text-amber-200"
                      : "bg-white/10 text-zinc-200"
                  : "text-zinc-600 hover:text-zinc-400 hover:bg-white/5"
              )}
            >
              {label}
            </button>
          );
        })}
        <div className="flex-1" />
        <button
          onClick={() => {
            seenTextsRef.current.clear();
            setEntries([]);
          }}
          className="px-2 py-0.5 text-[10px] font-mono text-zinc-600 transition-colors hover:text-zinc-300 hover:bg-white/5 rounded"
          title="Clear console"
        >
          Clear
        </button>
      </div>

      {/* Log list */}
      <div className="flex-1 min-h-0 overflow-auto font-mono text-[11px]" style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace" }}>
        {visible.length === 0 ? (
          <div className="px-3 py-6 text-center text-[10px] text-zinc-700">
            {entries.length === 0 ? "Console is clean." : `No ${filter} entries.`}
          </div>
        ) : (
          <div className="py-1">
            {visible.map((e) => {
              const meta = LEVEL_META[e.level];
              return (
                <div
                  key={e.id}
                  className={cn(
                    "flex items-start gap-2 px-3 py-1 border-l-2 transition-colors",
                    e.level === "error"
                      ? "border-red-500/50 bg-red-500/5"
                      : e.level === "warn"
                        ? "border-amber-500/50 bg-amber-500/5"
                        : "border-transparent"
                  )}
                >
                  <span className={cn("w-1.5 h-1.5 mt-1.5 rounded-full shrink-0", meta.dot)} />
                  <span className={cn("w-9 shrink-0 text-[9px] font-bold tracking-wider mt-0.5", meta.color)}>{meta.label}</span>
                  <span className={cn("flex-1 break-all whitespace-pre-wrap", meta.color)}>{e.text}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function formatConsoleMessage(data: unknown[] | undefined): string {
  return (data ?? []).map(formatConsoleValue).join(" ").trim();
}

function formatConsoleValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.stack || value.message;

  if (value && typeof value === "object") {
    const record = value as { name?: unknown; message?: unknown; stack?: unknown };
    if (typeof record.stack === "string") return record.stack;
    if (typeof record.message === "string") {
      return typeof record.name === "string" ? `${record.name}: ${record.message}` : record.message;
    }
  }

  try {
    const json = JSON.stringify(value);
    return json && json !== "{}" ? json : String(value);
  } catch {
    return String(value);
  }
}

function ConsoleToggleBar({
  open,
  onToggle,
  errorCount,
  onClearBadge,
  runtimeErrors,
}: {
  open: boolean;
  onToggle: () => void;
  errorCount: number;
  onClearBadge: () => void;
  runtimeErrors: string[];
}) {
  const [copied, setCopied] = useState(false);
  const hasErrors = errorCount > 0;

  function copyErrors(e: React.MouseEvent) {
    e.stopPropagation();
    const text = runtimeErrors.join("\n\n");
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    }).catch(() => { /* ignore */ });
  }

  function sendToAgent(e: React.MouseEvent) {
    e.stopPropagation();
    const text = runtimeErrors.slice(0, 3).join("\n\n").slice(0, 1500);
    if (!text) return;
    // Dispatch the same event ChatPanel listens for to auto-send a prompt.
    window.dispatchEvent(
      new CustomEvent("nutrient:send-prompt", {
        detail: { prompt: `Fix this crash:\n\n${text}` },
      })
    );
  }

  return (
    <div
      onClick={onToggle}
      className={cn(
        "group flex items-center justify-between px-3 py-1.5 border-t cursor-pointer select-none shrink-0 transition-colors",
        hasErrors
          ? "bg-[#1a0a0a] border-red-500/20 hover:bg-[#240d0d]"
          : "bg-[#0d0d0d] border-[#1e1e1e] hover:bg-[#141414]"
      )}
    >
      <div className="flex items-center gap-2.5 text-[11px]">
        {/* Status dot - pulses red on errors, dim zinc when clean */}
        <span className="relative flex h-1.5 w-1.5">
          {hasErrors && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
          )}
          <span
            className={cn(
              "relative inline-flex h-1.5 w-1.5 rounded-full",
              hasErrors ? "bg-red-400" : "bg-zinc-700"
            )}
          />
        </span>

        <Terminal className={cn("h-3 w-3", hasErrors ? "text-red-300" : "text-zinc-600")} />
        <span className={cn("font-mono", hasErrors ? "text-red-300" : "text-zinc-500")}>
          Console
        </span>

        {hasErrors && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 border border-red-500/30 px-1.5 py-0.5 text-[10px] font-medium text-red-300">
            <AlertCircle className="h-2.5 w-2.5" />
            {errorCount} error{errorCount !== 1 ? "s" : ""}
          </span>
        )}
        {!hasErrors && (
          <span className="text-[10px] text-zinc-700">
            {open ? "open" : "clean"}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        {hasErrors && (
          <>
            <button
              type="button"
              onClick={sendToAgent}
              className="inline-flex items-center gap-1 rounded-md border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[10px] font-medium text-red-200 transition-colors hover:bg-red-500/25"
              title="Send these errors to the Coding Agent"
            >
              <Sparkles className="h-2.5 w-2.5" />
              Fix with Agent
            </button>
            <button
              type="button"
              onClick={copyErrors}
              className="flex h-5 w-5 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-200"
              title={copied ? "Copied" : "Copy errors"}
            >
              {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            </button>
          </>
        )}
        {open && hasErrors && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClearBadge(); }}
            className="flex h-5 w-5 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-200"
            title="Clear error count"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
        <span className="ml-0.5 flex h-5 w-5 items-center justify-center text-zinc-600 transition-transform group-hover:text-zinc-400" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
          <ChevronUp className="h-3 w-3" />
        </span>
      </div>
    </div>
  );
}
