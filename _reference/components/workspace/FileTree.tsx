"use client";

import { useState } from "react";
import {
  ChevronRight,
  FileJson,
  FileCode,
  FileText,
  File,
  Lock,
  FolderOpen,
  Folder,
} from "lucide-react";
import { useWorkspaceStore } from "@/features/workspaces/store";
import { cn } from "@/lib/utils";

function fileIcon(path: string, isSystem: boolean) {
  const ext = path.split(".").pop()?.toLowerCase();
  const cls = "h-3.5 w-3.5 shrink-0";

  if (ext === "json") return <FileJson className={cn(cls, isSystem ? "text-zinc-500" : "text-amber-400/80")} />;
  if (ext === "ts" || ext === "tsx" || ext === "js" || ext === "jsx")
    return <FileCode className={cn(cls, "text-sky-400/70")} />;
  if (ext === "md" || ext === "mdx") return <FileText className={cn(cls, "text-zinc-400")} />;
  if (ext === "css" || ext === "html") return <FileCode className={cn(cls, "text-violet-400/70")} />;
  return <File className={cn(cls, "text-zinc-500")} />;
}

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  isSystem: boolean;
  children: TreeNode[];
  changed: boolean;
}

function buildTree(
  files: Array<{ path: string; isSystem: boolean }>,
  changedPaths: string[]
): TreeNode[] {
  const root: TreeNode = {
    name: "",
    path: "",
    isDir: true,
    isSystem: false,
    children: [],
    changed: false,
  };
  const dirMap = new Map<string, TreeNode>([["", root]]);
  const changedSet = new Set(changedPaths);

  const sorted = [...files].sort((a, b) => {
    const order = (p: string) => {
      if (p.startsWith("src/")) return `0-${p}`;
      if (p.startsWith("config/")) return `1-${p}`;
      if (p.startsWith("public/")) return `2-${p}`;
      if (p === "package.json" || p === "vite.config.ts" || p === "index.html") return `3-${p}`;
      return `4-${p}`;
    };
    return order(a.path).localeCompare(order(b.path));
  });

  for (const file of sorted) {
    const parts = file.path.split("/");
    let parent = root;
    const ancestors: TreeNode[] = [root];

    for (let index = 0; index < parts.length - 1; index += 1) {
      const dirPath = parts.slice(0, index + 1).join("/");
      let dir = dirMap.get(dirPath);

      if (!dir) {
        dir = {
          name: parts[index],
          path: dirPath,
          isDir: true,
          isSystem: false,
          children: [],
          changed: false,
        };
        dirMap.set(dirPath, dir);
        parent.children.push(dir);
      }

      parent = dir;
      ancestors.push(dir);
    }

    const changed = changedSet.has(file.path);
    parent.children.push({
      name: parts[parts.length - 1],
      path: file.path,
      isDir: false,
      isSystem: file.isSystem,
      children: [],
      changed,
    });

    if (changed) ancestors.forEach((node) => { node.changed = true; });
  }

  function sortChildren(nodes: TreeNode[]) {
    nodes.sort((a, b) => {
      const priority = (node: TreeNode) => {
        if (node.path === "src") return 0;
        if (node.path === "config") return 1;
        if (node.path === "public") return 2;
        if (!node.path.includes("/")) return 3;
        return 4;
      };
      const priorityDiff = priority(a) - priority(b);
      if (priorityDiff !== 0) return priorityDiff;
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((node) => sortChildren(node.children));
  }

  sortChildren(root.children);
  return root.children;
}

function TreeItem({
  node,
  depth = 0,
  activeFilePath,
  onSelect,
}: {
  node: TreeNode;
  depth?: number;
  activeFilePath: string | null;
  onSelect: (path: string) => void;
}) {
  const [open, setOpen] = useState(node.changed || depth < 2 || node.name === "src");
  const isActive = node.path === activeFilePath;

  if (node.isDir) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className="flex w-full items-center gap-1 py-0.5 px-2 rounded text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/4 transition-colors group"
          style={{ paddingLeft: `${8 + depth * 12}px` }}
        >
          <ChevronRight
            className={cn(
              "h-3 w-3 shrink-0 transition-transform text-zinc-600",
              open && "rotate-90"
            )}
          />
          {open ? (
            <FolderOpen className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
          ) : (
            <Folder className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
          )}
          <span className="ml-1">{node.name}</span>
          {node.changed && (
            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
          )}
        </button>
        {open && node.children.map((child) => (
          <TreeItem
            key={child.path}
            node={child}
            depth={depth + 1}
            activeFilePath={activeFilePath}
            onSelect={onSelect}
          />
        ))}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelect(node.path)}
      className={cn(
        "flex w-full items-center gap-1.5 py-0.5 rounded text-xs transition-colors",
        isActive
          ? "bg-white/8 text-zinc-100"
          : "text-zinc-400 hover:text-zinc-200 hover:bg-white/4 cursor-pointer"
      )}
      style={{ paddingLeft: `${8 + depth * 12}px`, paddingRight: "8px" }}
    >
      {fileIcon(node.path, node.isSystem)}
      <span className="truncate">{node.name}</span>
      <span className="ml-auto flex items-center gap-1 shrink-0">
        {node.changed && <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />}
        {node.isSystem && <Lock className="h-2.5 w-2.5 text-zinc-700" />}
      </span>
    </button>
  );
}

export function FileTree() {
  const projectFiles = useWorkspaceStore((s) => s.projectFiles);
  const activeFilePath = useWorkspaceStore((s) => s.activeFilePath);
  const changedFilePaths = useWorkspaceStore((s) => s.changedFilePaths);
  const setActiveFile = useWorkspaceStore((s) => s.setActiveFile);

  const tree = buildTree(projectFiles, changedFilePaths);

  return (
    <div className="flex flex-col h-full bg-[#1a1414] border-r border-[#2a2222]">
      <div className="px-3 py-2.5 border-b border-[#2a2222]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">
            Project
          </span>
          <span className="text-[10px] text-zinc-700">{projectFiles.length} files</span>
        </div>
        {changedFilePaths.length > 0 && (
          <div className="mt-1 text-[10px] text-blue-500">
            {changedFilePaths.length} unsaved
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto py-1 px-1">
        {tree.map((node) => (
          <TreeItem
            key={node.path}
            node={node}
            activeFilePath={activeFilePath}
            onSelect={setActiveFile}
          />
        ))}
      </div>
    </div>
  );
}
