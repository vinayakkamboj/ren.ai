import { strToU8, zipSync } from "fflate";
import type { ProjectFile } from "./types";

export function downloadProjectZip(projectName: string, files: ProjectFile[]) {
  const entries: Record<string, Uint8Array> = {};
  for (const f of files) {
    entries[f.path] = strToU8(f.content);
  }

  const zipped = zipSync(entries, { level: 0 });
  const blob = new Blob([zipped], { type: "application/zip" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${projectName.toLowerCase().replace(/[\s/\\]+/g, "-")}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
