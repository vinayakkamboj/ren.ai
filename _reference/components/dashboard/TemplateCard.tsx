"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
import { createWorkspace } from "@/features/workspaces/actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Template } from "@/types";

const categoryLabels: Record<string, string> = {
  document: "Viewer",
  forms: "Forms",
  collaboration: "Collaboration",
  workflow: "Automation",
  industry: "Industry",
};

interface TemplateCardProps {
  template: Template;
  index: number;
}

export function TemplateCard({ template, index }: TemplateCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleOpen() {
    startTransition(async () => {
      try {
        const result = await createWorkspace(template.id);
        if ("workspaceId" in result) {
          router.push(`/workspace/${result.workspaceId}`);
        } else {
          toast.error(result.error);
        }
      } catch {
        toast.error("Could not create workspace. Check your Supabase setup.");
      }
    });
  }

  const enabledFeatures = Object.entries(template.defaultConfig.features)
    .filter(([, enabled]) => enabled)
    .map(([f]) => f);

  const visibleFeatures = enabledFeatures.slice(0, 3);
  const extraCount = enabledFeatures.length - visibleFeatures.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04, ease: "easeOut" }}
    >
      <button
        onClick={handleOpen}
        disabled={isPending}
        className={cn(
          "group relative w-full text-left rounded-xl border border-border bg-card",
          "p-5 flex flex-col gap-4",
          "hover:border-primary/30 hover:bg-card/80 transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        {/* Top row: badges + arrow */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center rounded-md bg-secondary border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              Web SDK
            </span>
            <span className="inline-flex items-center rounded-md bg-secondary border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {categoryLabels[template.category] ?? template.category}
            </span>
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            {isPending
              ? <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
              : <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />}
          </div>
        </div>

        {/* Title + description */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1 leading-snug">
            {template.name}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {template.description}
          </p>
        </div>

        {/* Feature pills - uniform style */}
        <div className="flex flex-wrap gap-1">
          {visibleFeatures.map((feature) => (
            <span
              key={feature}
              className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground border border-border/50"
            >
              {feature}
            </span>
          ))}
          {extraCount > 0 && (
            <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground border border-border/50">
              +{extraCount}
            </span>
          )}
        </div>
      </button>
    </motion.div>
  );
}
