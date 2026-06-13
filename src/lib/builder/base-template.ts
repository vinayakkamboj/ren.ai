/**
 * Base template — the files seeded into every brand-new Ren Code project.
 *
 * This is a generic, modern React + Vite + Tailwind starter. It is intentionally
 * framework-neutral (no product SDK) so the builder agent can shape it into any
 * application the user describes. The CSS exposes shadcn-style HSL design tokens
 * so generated components can use semantic Tailwind colors that the agent can
 * re-theme per app.
 */

import type { ProjectFile } from "./types";

/** The system file the agent must never touch — the runtime entry. */
export const PROTECTED_PATHS = ["src/main.tsx", "index.html", "vite.config.ts"];

/** Project memory file — the agent's persistent notes about the app. */
export const PROJECT_MEMORY_FILE = "REN.md";

/** Packages pre-installed in every preview sandbox. */
export const STANDARD_DEPENDENCIES: Record<string, string> = {
  react: "^18.3.1",
  "react-dom": "^18.3.1",
  "lucide-react": "^0.469.0",
  clsx: "^2.1.1",
  "tailwind-merge": "^2.5.5",
  "framer-motion": "^11.15.0",
  "date-fns": "^4.1.0",
  recharts: "^2.13.0",
  "class-variance-authority": "^0.7.1",
};

const INDEX_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Ren Code App</title>
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
              border: "hsl(var(--border) / <alpha-value>)",
              input: "hsl(var(--input) / <alpha-value>)",
              ring: "hsl(var(--ring) / <alpha-value>)",
            },
            borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)" },
            fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
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

const MAIN_TSX = `import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;

const INDEX_CSS = `@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");

:root {
  --background: 40 30% 98%;
  --foreground: 24 10% 12%;
  --card: 0 0% 100%;
  --card-foreground: 24 10% 12%;
  --popover: 0 0% 100%;
  --popover-foreground: 24 10% 12%;
  --primary: 35 32% 41%;
  --primary-foreground: 40 30% 98%;
  --secondary: 40 14% 94%;
  --secondary-foreground: 24 10% 18%;
  --muted: 40 14% 94%;
  --muted-foreground: 30 6% 45%;
  --accent: 35 40% 90%;
  --accent-foreground: 24 10% 18%;
  --destructive: 5 65% 48%;
  --destructive-foreground: 40 30% 98%;
  --border: 38 18% 88%;
  --input: 38 18% 88%;
  --ring: 35 32% 41%;
  --radius: 0.625rem;
}

[data-theme="dark"] {
  --background: 24 12% 8%;
  --foreground: 40 20% 90%;
  --card: 24 11% 11%;
  --card-foreground: 40 20% 90%;
  --popover: 24 11% 11%;
  --popover-foreground: 40 20% 90%;
  --primary: 38 45% 62%;
  --primary-foreground: 24 12% 8%;
  --secondary: 24 8% 16%;
  --secondary-foreground: 40 20% 90%;
  --muted: 24 8% 16%;
  --muted-foreground: 36 8% 60%;
  --accent: 24 8% 18%;
  --accent-foreground: 40 20% 90%;
  --destructive: 5 60% 55%;
  --destructive-foreground: 40 20% 90%;
  --border: 24 8% 20%;
  --input: 24 8% 20%;
  --ring: 38 45% 62%;
}

* { box-sizing: border-box; border-color: hsl(var(--border)); }
html, body, #root { width: 100%; min-height: 100%; margin: 0; }
body {
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  -webkit-font-smoothing: antialiased;
}`;

const UTILS_TS = `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}`;

const APP_TSX = `import { useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-8 text-center">
      <div className="flex items-center justify-center size-14 rounded-2xl bg-primary/10 text-primary">
        <Sparkles className="size-7" />
      </div>
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Your app starts here
        </h1>
        <p className="max-w-md text-muted-foreground">
          Describe what you want to build in the chat and Ren Code will write the
          components, pages, state, and styling for you.
        </p>
      </div>
      <button
        onClick={() => setCount((c) => c + 1)}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        Clicked {count} {count === 1 ? "time" : "times"}
        <ArrowRight className="size-4" />
      </button>
    </div>
  );
}`;

const PACKAGE_JSON = JSON.stringify(
  {
    name: "ren-code-app",
    private: true,
    version: "0.0.0",
    type: "module",
    scripts: {
      dev: "vite",
      build: "tsc && vite build",
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
    },
  },
  null,
  2,
);

const PROJECT_MEMORY = `# Project Memory

This file is Ren Code's persistent memory for this app. The agent reads it before
every change and updates it whenever files change.

## Overview

A fresh React + Vite + Tailwind starter. No product purpose has been defined yet —
the first build will shape it from the user's prompt.

## Architecture

- \`src/App.tsx\` — root composition and page routing (keep thin).
- \`src/index.css\` — design tokens (\`:root\` + \`[data-theme="dark"]\`) and base styles.
- \`src/lib/utils.ts\` — the \`cn()\` className helper.

## Conventions

- Tailwind utilities use the semantic color tokens (\`bg-primary\`, \`text-foreground\`,
  \`border-border\`, etc.). Only \`src/index.css\` :root holds raw HSL values.
- Components live under \`src/components/\`, pages under \`src/pages/\`.
`;

/**
 * Build the seed file set for a brand-new project.
 */
export function createBaseTemplate(): ProjectFile[] {
  return [
    { path: "index.html", content: INDEX_HTML },
    { path: "package.json", content: PACKAGE_JSON },
    { path: "src/main.tsx", content: MAIN_TSX },
    { path: "src/index.css", content: INDEX_CSS },
    { path: "src/App.tsx", content: APP_TSX },
    { path: "src/lib/utils.ts", content: UTILS_TS },
    { path: PROJECT_MEMORY_FILE, content: PROJECT_MEMORY },
  ];
}
