"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, ArrowRight } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { getTemplateById } from "@/features/templates/registry";
import type { Workspace } from "@/types";

interface RecentWorkspacesProps {
  workspaces: Workspace[];
}

export function RecentWorkspaces({ workspaces }: RecentWorkspacesProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
      {workspaces.slice(0, 6).map((workspace, i) => {
        const template = getTemplateById(workspace.templateId);

        return (
          <motion.div
            key={workspace.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: i * 0.03 }}
          >
            <Link
              href={`/workspace/${workspace.id}`}
              className="group flex flex-col justify-between min-w-[220px] max-w-[220px] rounded-xl border border-border bg-card p-4 hover:border-border/80 hover:bg-card/80 transition-all duration-200"
            >
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">
                    {template?.name ?? "Custom"}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">
                  {workspace.name}
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{formatRelativeTime(workspace.updatedAt)}</span>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
