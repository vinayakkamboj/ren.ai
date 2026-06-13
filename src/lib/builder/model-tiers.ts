/**
 * Astra model tiers — user-facing brand names mapped to the underlying models.
 * The UI shows Astra tier names; the build API route resolves tier id → model id
 * server-side and never exposes the underlying model to the client.
 */

export type ModelTierId = "spark" | "flow" | "forge" | "apex";

export interface ModelTier {
  id: ModelTierId;
  brandName: string;
  tagline: string;
  usageLevel: "Low" | "Medium" | "High" | "Max";
  modelId: string;
}

export const MODEL_TIERS: ModelTier[] = [
  {
    id: "spark",
    brandName: "Astra Flash",
    tagline: "Fastest — quick edits, instant results",
    usageLevel: "Low",
    modelId: "claude-haiku-4-5-20251001",
  },
  {
    id: "flow",
    brandName: "Astra Flow",
    tagline: "Balanced speed and quality — ideal default",
    usageLevel: "Medium",
    modelId: "claude-sonnet-4-6",
  },
  {
    id: "forge",
    brandName: "Astra Pro",
    tagline: "High-quality builds — complex features",
    usageLevel: "High",
    modelId: "claude-opus-4-8",
  },
  {
    id: "apex",
    brandName: "Astra Max",
    tagline: "Maximum capability — best possible output",
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
