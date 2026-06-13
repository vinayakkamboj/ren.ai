import type { AIAction, AIActionPlan, WorkspaceConfig, SampleDocument, WorkflowStep } from "@/types";
import { setNestedValue } from "@/lib/utils";

export function applyActionPlan(
  currentConfig: WorkspaceConfig,
  plan: AIActionPlan
): WorkspaceConfig {
  let config = { ...currentConfig };

  for (const action of plan.actions) {
    config = applyAction(config, action);
  }

  return config;
}

function applyAction(config: WorkspaceConfig, action: AIAction): WorkspaceConfig {
  switch (action.type) {
    case "update_theme":
    case "update_content":
    case "update_toolbar": {
      if (!action.path || action.value === undefined) return config;
      return setNestedValue(
        config as unknown as Record<string, unknown>,
        action.path,
        action.value
      ) as unknown as WorkspaceConfig;
    }

    case "toggle_feature": {
      if (!action.path || action.value === undefined) return config;
      return setNestedValue(
        config as unknown as Record<string, unknown>,
        action.path,
        Boolean(action.value)
      ) as unknown as WorkspaceConfig;
    }

    case "update_sample_docs": {
      if (!action.documents) return config;
      return {
        ...config,
        sampleDocuments: action.documents as SampleDocument[],
        activeSampleDocumentId: action.documents[0]?.id ?? null,
      };
    }

    case "update_workflow": {
      if (!action.steps) return config;
      return {
        ...config,
        workflow: action.steps as WorkflowStep[],
      };
    }

    case "reset_to_template":
      // Handled at the store level with the template's default config
      return config;

    default:
      return config;
  }
}
