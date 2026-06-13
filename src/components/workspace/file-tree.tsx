"use client";

/**
 * File tree — renders the flat project file list as a collapsible directory
 * tree and lets the user open files in the editor.
 */

import { useMemo, useState } from "react";
import { ChevronRight, File, FileCode2, Folder, FolderOpen } from "lucide-react";
import { useWorkspaceStore } from "@/lib/builder/store";
import { cn } from "@/lib/utils";

interface TreeNode {
  name: string;
  path: string;
  children: Map<string, TreeNode>;
  isFile: boolean;
}

function buildTree(paths: string[]): TreeNode {
  const root: TreeNode = { name: "", path: "", children: new Map(), isFile: false };
  for (const path of paths) {
    const parts = path.split("/");
    let node = root;
    parts.forEach((part, i) => {
      const isFile = i === parts.length - 1;
      const childPath = parts.slice(0, i + 1).join("/");
      if (!node.children.has(part)) {
        node.children.set(part, {
          name: part,
          path: childPath,
          children: new Map(),
          isFile,
        });
      }
      node = node.children.get(part)!;
    });
  }
  return root;
}

function sortChildren(node: TreeNode): TreeNode[] {
  return Array.from(node.children.values()).sort((a, b) => {
    if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
}

function isCode(name: string) {
  return /\.(tsx?|jsx?|css)$/.test(name);
}

function Row({ node, depth }: { node: TreeNode; depth: number }) {
  const activeFile = useWorkspaceStore((s) => s.activeFile);
  const setActiveFile = useWorkspaceStore((s) => s.setActiveFile);
  const [open, setOpen] = useState(depth < 2);

  const children = useMemo(() => sortChildren(node), [node]);
  const pad = { paddingLeft: `${depth * 12 + 8}px` };

  if (node.isFile) {
    const active = activeFile === node.path;
    return (
      <button
        onClick={() => setActiveFile(node.path)}
        style={pad}
        className={cn(
          "flex w-full items-center gap-1.5 py-1 pr-2 text-left text-[12.5px] transition-colors",
          active
            ? "bg-carbon-high text-dusk"
            : "text-dusk-muted hover:bg-carbon-raised hover:text-dusk",
        )}
      >
        {isCode(node.name) ? (
          <FileCode2 className="size-3.5 shrink-0 text-brass/70" />
        ) : (
          <File className="size-3.5 shrink-0 text-dusk-faint" />
        )}
        <span className="truncate">{node.name}</span>
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        style={pad}
        className="flex w-full items-center gap-1 py-1 pr-2 text-left text-[12.5px] text-dusk-muted transition-colors hover:text-dusk"
      >
        <ChevronRight
          className={cn("size-3 shrink-0 transition-transform", open && "rotate-90")}
        />
        {open ? (
          <FolderOpen className="size-3.5 shrink-0 text-dusk-faint" />
        ) : (
          <Folder className="size-3.5 shrink-0 text-dusk-faint" />
        )}
        <span className="truncate">{node.name}</span>
      </button>
      {open &&
        children.map((child) => (
          <Row key={child.path} node={child} depth={depth + 1} />
        ))}
    </div>
  );
}

export function FileTree() {
  const projectFiles = useWorkspaceStore((s) => s.projectFiles);
  const tree = useMemo(
    () => buildTree(projectFiles.map((f) => f.path)),
    [projectFiles],
  );
  const children = useMemo(() => sortChildren(tree), [tree]);

  return (
    <div className="flex h-full flex-col border-r border-carbon-line bg-carbon">
      <div className="flex h-9 shrink-0 items-center border-b border-carbon-line px-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-dusk-faint">
        Files
      </div>
      <div className="platform-scroll flex-1 overflow-y-auto py-1">
        {children.map((child) => (
          <Row key={child.path} node={child} depth={0} />
        ))}
      </div>
    </div>
  );
}
