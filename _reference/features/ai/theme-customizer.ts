import type { AIPatchPlan, ProjectFile } from "@/types";

const DARK_TOKEN_BLOCK = `:root {
  --font: "Manrope", "Inter", ui-sans-serif, system-ui, sans-serif;
  --radius: 8px;

  --background: 24 12% 7%;
  --foreground: 36 22% 92%;

  --card: 24 11% 10%;
  --card-foreground: 36 22% 92%;
  --popover: 24 11% 10%;
  --popover-foreground: 36 22% 92%;

  --primary: 38 18% 84%;
  --primary-foreground: 24 14% 9%;
  --secondary: 24 9% 15%;
  --secondary-foreground: 36 18% 88%;
  --muted: 24 8% 16%;
  --muted-foreground: 34 10% 66%;
  --accent: 38 18% 84%;
  --accent-foreground: 24 14% 9%;

  --destructive: 0 74% 58%;
  --destructive-foreground: 0 0% 100%;
  --success: 142 46% 54%;
  --warning: 38 72% 58%;

  --border: 24 8% 22%;
  --input: 24 8% 18%;
  --ring: 38 18% 84%;
}`;

const DARK_THEME_BLOCK = `[data-theme="dark"] {
  --font: "Manrope", "Inter", ui-sans-serif, system-ui, sans-serif;
  --radius: 8px;

  --background: 24 12% 7%;
  --foreground: 36 22% 92%;

  --card: 24 11% 10%;
  --card-foreground: 36 22% 92%;
  --popover: 24 11% 10%;
  --popover-foreground: 36 22% 92%;

  --primary: 38 18% 84%;
  --primary-foreground: 24 14% 9%;
  --secondary: 24 9% 15%;
  --secondary-foreground: 36 18% 88%;
  --muted: 24 8% 16%;
  --muted-foreground: 34 10% 66%;
  --accent: 38 18% 84%;
  --accent-foreground: 24 14% 9%;

  --destructive: 0 74% 58%;
  --destructive-foreground: 0 0% 100%;
  --success: 142 46% 54%;
  --warning: 38 72% 58%;

  --border: 24 8% 22%;
  --input: 24 8% 18%;
  --ring: 38 18% 84%;
}`;

const UNIVERSAL_DARK_OVERRIDE = `/* nucode-theme-override */
html, body, #root {
  min-height: 100%;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
}

body {
  font-family: var(--font);
  color-scheme: dark;
}

button,
a,
input,
select,
textarea {
  font-family: inherit;
}

svg {
  color: currentColor;
}

button svg,
nav svg,
.nav svg,
.navbar svg,
.viewer-toolbar svg,
.viewer-actions svg {
  color: hsl(var(--foreground));
  opacity: 0.92;
}

.badge,
[class*="badge"],
[class*="Badge"] {
  background: hsl(var(--secondary));
  color: hsl(var(--secondary-foreground));
  border-color: hsl(var(--border));
}

.viewer-mount,
[class*="viewer"],
[class*="Viewer"] {
  background: hsl(var(--card));
  color: hsl(var(--card-foreground));
}`;

function replaceBlock(css: string, selectorRegex: RegExp, block: string): { css: string; replaced: boolean } {
  if (selectorRegex.test(css)) {
    return { css: css.replace(selectorRegex, block), replaced: true };
  }
  return { css, replaced: false };
}

function ensureFontImport(css: string): string {
  const importLine = `@import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap");`;
  if (/Manrope/.test(css)) return css;
  return `${importLine}\n${css.replace(/^\s+/, "")}`;
}

function applyUniversalDarkTheme(css: string): string {
  let next = ensureFontImport(css);
  const root = replaceBlock(next, /:root\s*\{[\s\S]*?\}/, DARK_TOKEN_BLOCK);
  next = root.replaced ? root.css : `${DARK_TOKEN_BLOCK}\n\n${next}`;

  const dark = replaceBlock(next, /\[data-theme=["']dark["']\]\s*\{[\s\S]*?\}/, DARK_THEME_BLOCK);
  next = dark.replaced ? dark.css : `${next.trim()}\n\n${DARK_THEME_BLOCK}`;

  next = next.replace(/\/\* nucode-theme-override \*\/[\s\S]*$/m, "").trim();
  return `${next}\n\n${UNIVERSAL_DARK_OVERRIDE}\n`;
}

export function shouldApplyLocalDarkThemePatch(message: string): boolean {
  const lower = message.toLowerCase();
  const asksForGlobalDark =
    /\b(no dark mode|dont add dark mode|don't add dark mode|make(?: the)? whole (?:website|web site|wesbite|site|app) dark|whole (?:website|web site|wesbite|site|app) dark|entire (?:website|web site|site|app) dark|universal(?:ly)? dark)\b/.test(lower);
  const hasWarmDarkPalette = /\b(warmish black|warm black|greyish white|grayish white|whiteish gray|whiteish grey)\b/.test(lower);
  const asksForGlobalSurface = /\b(whole|entire|universal|global|all pages|every page|website|web site|wesbite|site-wide|app-wide)\b/.test(lower);
  return (
    asksForGlobalDark ||
    (hasWarmDarkPalette && asksForGlobalSurface && /\b(dark|black)\b/.test(lower))
  );
}

export function buildLocalDarkThemePatch(message: string, projectFiles: ProjectFile[]): AIPatchPlan | null {
  if (!shouldApplyLocalDarkThemePatch(message)) return null;

  const cssFile = projectFiles.find((file) => file.path === "src/index.css");
  if (!cssFile) return null;

  const content = applyUniversalDarkTheme(cssFile.content);
  if (content === cssFile.content) return null;

  return {
    plan: "Applied a universal warm black theme with grey-white foreground tokens.",
    changes: [{ path: "src/index.css", content }],
  };
}
