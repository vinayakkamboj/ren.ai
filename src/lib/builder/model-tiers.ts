/**
 * Ren Code model tiers — user-facing brand names mapped to the underlying
 * models. The UI only ever shows brand names; the build API route resolves a
 * tier id to the real model id server-side and never exposes it to the client.
 *
 * Tier selection applies to the heavy code-generation pass. The brand names are
 * Ren-owned; the provider model is an implementation detail.
 */

export type ModelTierId = "spark" | "flow" | "forge" | "apex";

export interface ModelTier {
  id: ModelTierId;
  brandName: string;
  tagline: string;
  /** Relative token usage / cost level shown in the UI. */
  usageLevel: "Low" | "Medium" | "High" | "Max";
  modelId: string;
}

export const MODEL_TIERS: ModelTier[] = [
  {
    id: "spark",
    brandName: "Ren Spark",
    tagline: "Fastest — simple edits and quick fixes",
    usageLevel: "Low",
    modelId: "claude-haiku-4-5-20251001",
  },
  {
    id: "flow",
    brandName: "Ren Flow",
    tagline: "Balanced speed and quality — great default",
    usageLevel: "Medium",
    modelId: "claude-sonnet-4-6",
  },
  {
    id: "forge",
    brandName: "Ren Forge",
    tagline: "Heavy builds — near-top quality",
    usageLevel: "High",
    modelId: "claude-opus-4-8",
  },
  {
    id: "apex",
    brandName: "Ren Apex",
    tagline: "Maximum quality — highest token usage",
    usageLevel: "Max",
    modelId: "claude-fable-5",
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
