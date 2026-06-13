import type { AIPatchPlan, ProjectFile } from "@/types";

export interface FileEdit {
  path: string;
  find: string;
  replace: string;
}

export interface ParsedFileEdits {
  plan: string;
  edits: FileEdit[];
}

export interface EditApplyResult {
  patchPlan: AIPatchPlan | null;
  failures: Array<{ edit: FileEdit; reason: string }>;
}

// Extracts <file_edits>{...}</file_edits> block from Claude output.
export function parseFileEdits(raw: string): ParsedFileEdits | null {
  const match = raw.match(/<file_edits>\s*([\s\S]*?)\s*<\/file_edits>/);
  if (!match) return null;
  const body = match[1].trim();
  try {
    const parsed = JSON.parse(body) as { plan?: string; edits?: FileEdit[] };
    if (!Array.isArray(parsed.edits)) return null;
    return {
      plan: parsed.plan || "Applied edits",
      edits: parsed.edits.filter(
        (e): e is FileEdit =>
          !!e &&
          typeof e.path === "string" &&
          typeof e.find === "string" &&
          typeof e.replace === "string"
      ),
    };
  } catch {
    return null;
  }
}

export function stripFileEdits(content: string): string {
  return content.replace(/<file_edits>[\s\S]*?<\/file_edits>/, "").trim();
}

// Applies a parsed edits block to the current project files. Returns a patchPlan
// containing only the files that actually changed, plus any failures for retry.
export function applyEditsToFiles(
  parsed: ParsedFileEdits,
  projectFiles: ProjectFile[]
): EditApplyResult {
  const fileMap = new Map(projectFiles.map((f) => [f.path, f.content]));
  // Group edits by file so multiple edits on the same file stack correctly.
  const editsByPath = new Map<string, FileEdit[]>();
  for (const edit of parsed.edits) {
    const list = editsByPath.get(edit.path) ?? [];
    list.push(edit);
    editsByPath.set(edit.path, list);
  }

  const changes: { path: string; content: string }[] = [];
  const failures: Array<{ edit: FileEdit; reason: string }> = [];

  for (const [path, edits] of editsByPath) {
    let content = fileMap.get(path);
    // If the file doesn't exist and the only edit has an empty find, treat the
    // replace as full file content (Claude can use this to create a new file).
    if (content === undefined) {
      if (edits.length === 1 && edits[0].find === "") {
        changes.push({ path, content: edits[0].replace });
        continue;
      }
      for (const e of edits) failures.push({ edit: e, reason: "File not found" });
      continue;
    }

    let mutated = false;
    for (const edit of edits) {
      if (edit.find === "") {
        // Whole-file replace for an existing file.
        content = edit.replace;
        mutated = true;
        continue;
      }
      const idx = content.indexOf(edit.find);
      if (idx === -1) {
        failures.push({ edit, reason: "find string not found in file" });
        continue;
      }
      const last = content.lastIndexOf(edit.find);
      if (last !== idx) {
        failures.push({ edit, reason: "find string is not unique — expand context" });
        continue;
      }
      content = content.slice(0, idx) + edit.replace + content.slice(idx + edit.find.length);
      mutated = true;
    }

    if (mutated) changes.push({ path, content });
  }

  if (!changes.length) return { patchPlan: null, failures };

  return {
    patchPlan: { plan: parsed.plan, changes },
    failures,
  };
}

// Builds a concise human-readable report of edit failures, used in retry prompts.
export function describeEditFailures(failures: EditApplyResult["failures"]): string {
  if (!failures.length) return "";
  return failures
    .map((f, i) => {
      const findPreview = f.edit.find.slice(0, 80).replace(/\n/g, "\\n");
      return `${i + 1}. ${f.edit.path}: ${f.reason}\n   find: "${findPreview}${f.edit.find.length > 80 ? "..." : ""}"`;
    })
    .join("\n");
}
