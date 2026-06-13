import {
  getCurrentNutrientSdkFileTemplates,
  type ProjectFileTemplate,
} from "@/lib/project-files/base-template";
import {
  NUTRIENT_WEB_SDK_DEPENDENCY,
  NUTRIENT_WEB_SDK_PACKAGE,
} from "@/lib/nutrient/sdk-version";

type ProjectFileLike = {
  path: string;
  content: string;
  language?: string;
  isSystem?: boolean;
  is_system?: boolean;
};

const currentSdkTemplates = getCurrentNutrientSdkFileTemplates();
const currentSdkTemplateMap = new Map(currentSdkTemplates.map((file) => [file.path, file]));

function updatePackageJson(content: string): string {
  try {
    const pkg = JSON.parse(content) as {
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    const scripts = { ...(pkg.scripts ?? {}) };
    if (scripts.build?.includes("copy-assets") || scripts.build?.includes("copy-pspdfkit")) {
      scripts.build = "vite build";
    }
    if (scripts["copy-assets"]?.includes("pspdfkit") || scripts["copy-pspdfkit-files"]?.includes("pspdfkit")) {
      delete scripts["copy-assets"];
      delete scripts["copy-pspdfkit-files"];
    }
    if (scripts.postinstall?.includes("copy-assets") || scripts.postinstall?.includes("copy-pspdfkit")) {
      delete scripts.postinstall;
    }

    const dependencies = { ...(pkg.dependencies ?? {}) };
    delete dependencies.pspdfkit;
    dependencies[NUTRIENT_WEB_SDK_PACKAGE] = NUTRIENT_WEB_SDK_DEPENDENCY;

    return JSON.stringify(
      {
        ...pkg,
        scripts,
        dependencies,
      },
      null,
      2
    );
  } catch {
    return currentSdkTemplateMap.get("package.json")?.content ?? content;
  }
}

function updateViteConfig(content: string): string {
  const latest = currentSdkTemplateMap.get("vite.config.ts")?.content ?? content;
  if (!content.trim()) return latest;
  if (/pspdfkit|copy-assets|copy-pspdfkit/i.test(content)) return latest;

  return content;
}

function updateBuilderMemory(content: string): string {
  if (content.includes(NUTRIENT_WEB_SDK_PACKAGE) && content.includes(NUTRIENT_WEB_SDK_DEPENDENCY)) {
    return content;
  }

  return [
    content.trim(),
    "",
    "## Current Nutrient Web SDK",
    "",
    `- Package: \`${NUTRIENT_WEB_SDK_PACKAGE}\``,
    `- Version: \`${NUTRIENT_WEB_SDK_DEPENDENCY}\``,
    "- Requirement: New projects and custom-template copies must keep this package installed and use the local `src/NutrientViewer.tsx` wrapper with `useCDN: true` for fast integration.",
  ].join("\n");
}

function isOldStarterApp(content: string): boolean {
  return (
    content.includes("Demo header") ||
    content.includes('height: "calc(100vh - 56px)"') ||
    content.includes("No document configured. Add one in config/documents.json.")
  ) && content.includes("../config/documents.json");
}

function isOldStarterCss(content: string): boolean {
  const normalized = content.replace(/\s+/g, " ").trim();
  return (
    !normalized ||
    normalized === "* { box-sizing: border-box; margin: 0; padding: 0; } body { font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif; } #root { height: 100vh; }"
  );
}

export function upgradeNutrientSdkProjectFileContent(path: string, content: string): string {
  if (path === "package.json") return updatePackageJson(content);
  if (path === "vite.config.ts") return updateViteConfig(content);
  if (path === "src/NutrientViewer.tsx") {
    return currentSdkTemplateMap.get("src/NutrientViewer.tsx")?.content ?? content;
  }
  if (path === "src/App.tsx" && isOldStarterApp(content)) {
    return currentSdkTemplateMap.get("src/App.tsx")?.content ?? content;
  }
  if (path === "src/index.css" && isOldStarterCss(content)) {
    return currentSdkTemplateMap.get("src/index.css")?.content ?? content;
  }
  if (path === "NUTRIENTWEBBUILDER.md") return updateBuilderMemory(content);
  if (path === "README.md") {
    return content
      .replace(/pspdfkit npm package/gi, `${NUTRIENT_WEB_SDK_PACKAGE} package`)
      .replace(/PSPDFKit/gi, "Nutrient Web SDK");
  }
  return content;
}

export function ensureCurrentNutrientSdkFiles<T extends ProjectFileLike>(
  files: T[],
  createMissingFile: (template: ProjectFileTemplate) => T
): T[] {
  const seen = new Set<string>();
  const updated = files.map((file) => {
    seen.add(file.path);
    return {
      ...file,
      content: upgradeNutrientSdkProjectFileContent(file.path, file.content),
    };
  });

  for (const template of currentSdkTemplates) {
    if (!seen.has(template.path)) {
      updated.push(createMissingFile(template));
    }
  }

  return updated;
}
