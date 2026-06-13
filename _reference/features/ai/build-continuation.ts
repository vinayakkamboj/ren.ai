import type { ProjectFile } from "@/types";

const REUSABLE_RUNTIME_FILES = new Set([
  "package.json",
  "vite.config.ts",
  "index.html",
  "src/main.tsx",
  "src/ErrorBoundary.tsx",
  "src/NutrientViewer.tsx",
  "src/lib/utils.ts",
]);

const MEMORY_FILE = "NUTRIENTWEBBUILDER.md";

function isStarterApp(path: string, content: string): boolean {
  if (path !== "src/App.tsx") return false;
  return (
    content.includes("Nutrient Workspace") &&
    content.includes("Ask AI to build anything with Nutrient") &&
    content.includes("viewer-app") &&
    content.includes("<NutrientViewer")
  );
}

function isStarterCss(path: string, content: string): boolean {
  if (path !== "src/index.css") return false;
  return (
    content.includes("Default starter") &&
    content.includes(".viewer-app") &&
    content.includes(".viewer-mount")
  );
}

export function isStarterPreviewScaffold(path: string, content: string): boolean {
  return isStarterApp(path, content) || isStarterCss(path, content);
}

export function getPlannedFilesNeedingGeneration(
  plannedFiles: string[],
  projectFiles: Pick<ProjectFile, "path" | "content">[],
  generatedThisBuildPaths: ReadonlySet<string>
): string[] {
  const fileMap = new Map(projectFiles.map((file) => [file.path, file.content]));

  return plannedFiles.filter((path) => {
    const content = fileMap.get(path);
    if (content === undefined) return true;
    if (isStarterPreviewScaffold(path, content)) return true;
    if (generatedThisBuildPaths.has(path)) return false;
    if (path === MEMORY_FILE) return false;
    if (REUSABLE_RUNTIME_FILES.has(path)) return false;

    // During a full build, source files that merely existed before the request
    // are not proof that the current app was generated. They must be produced
    // in this build pass, otherwise old/starter UI can remain in preview.
    return (
      path.startsWith("src/") ||
      path.startsWith("backend/") ||
      path.startsWith("scripts/")
    );
  });
}

