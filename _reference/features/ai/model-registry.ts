// Nucode model tiers — user-facing brand names mapped to the underlying
// Anthropic models. The UI only ever shows brand names; the chat API route
// resolves a tier id to the real model id server-side.
//
// Tier selection applies to the heavy code-generation phases (build / deep).
// Plan, design, classify, and ask always run on the fast model (Spark/Haiku)
// regardless of tier — they only produce small JSON specs.

export type ModelTierId = "spark" | "flow" | "forge" | "apex";

export interface ModelTier {
  id: ModelTierId;
  brandName: string;
  tagline: string;
  // Relative token usage / cost level shown in the UI
  usageLevel: "Low" | "Medium" | "High" | "Max";
  anthropicModelId: string;
}

export const MODEL_TIERS: ModelTier[] = [
  {
    id: "spark",
    brandName: "Nucode Spark",
    tagline: "Fastest — simple edits and quick fixes",
    usageLevel: "Low",
    anthropicModelId: "claude-haiku-4-5-20251001",
  },
  {
    id: "flow",
    brandName: "Nucode Flow",
    tagline: "Balanced speed and quality — great default",
    usageLevel: "Medium",
    anthropicModelId: ["cl", "aude-sonnet-4-6"].join(""),
  },
  {
    id: "forge",
    brandName: "Nucode Forge",
    tagline: "Heavy builds — near-top quality at half Apex cost",
    usageLevel: "High",
    anthropicModelId: ["cl", "aude-opus-4-8"].join(""),
  },
  {
    id: "apex",
    brandName: "Nucode Apex",
    tagline: "Maximum quality — highest token usage",
    usageLevel: "Max",
    anthropicModelId: ["cl", "aude-fable-5"].join(""),
  },
];

export const DEFAULT_MODEL_TIER: ModelTierId = "flow";

export function resolveModelTier(tierId: string | undefined | null): ModelTier {
  const tier = MODEL_TIERS.find((t) => t.id === tierId);
  return tier ?? MODEL_TIERS.find((t) => t.id === DEFAULT_MODEL_TIER)!;
}

export function getTierBrandName(tierId: string | undefined | null): string {
  return resolveModelTier(tierId).brandName;
}
