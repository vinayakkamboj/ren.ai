import type { ProjectFile } from "@/types";

export interface ZipBackendInfo {
  // Absolute managed proxy URL (or the user's custom backend URL)
  url: string;
  // Workspace demo token — only set for managed mode; baked into the local
  // download so the repo connects out of the box. Never pushed to GitHub.
  token?: string;
}

function buildEnvExample(backend?: ZipBackendInfo | null): string {
  const lines = [
    "# Nutrient Web SDK license (get one at https://www.nutrient.io/web/)",
    "VITE_NUTRIENT_LICENSE_KEY=your-license-key-here",
    "",
    "# Backend processing — pre-wired connection",
  ];
  if (backend) {
    lines.push(`VITE_BACKEND_URL=${backend.url}`);
    if (backend.token) {
      lines.push(`VITE_BACKEND_TOKEN=${backend.token}`);
      lines.push("# Demo token: credit-limited, expires in 30 days. Rotate in workspace settings.");
    }
    lines.push("", "# Or run your own backend (see backend/ folder):", "# VITE_BACKEND_URL=http://localhost:8000");
  } else {
    lines.push("# VITE_BACKEND_URL=http://localhost:8000", "# VITE_BACKEND_TOKEN=");
  }
  return lines.join("\n") + "\n";
}

export async function zipFiles(
  files: ProjectFile[],
  projectName: string,
  backend?: ZipBackendInfo | null
): Promise<void> {
  const { strToU8, zipSync } = await import("fflate");

  const zipEntries: Record<string, Uint8Array> = {};

  for (const file of files) {
    zipEntries[`${projectName}/${file.path}`] = strToU8(file.content);
  }

  // .env.local works immediately; .env.local.example documents the shape.
  const env = buildEnvExample(backend);
  zipEntries[`${projectName}/.env.local`] = strToU8(env);
  zipEntries[`${projectName}/.env.local.example`] = strToU8(env);

  const zipped = zipSync(zipEntries, { level: 6 });

  const blob = new Blob([zipped], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${projectName.replace(/[^a-z0-9-_]/gi, "-")}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
