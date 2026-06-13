// ─── Template System ─────────────────────────────────────────────────────────

export type TemplateCategory =
  | "document"
  | "forms"
  | "collaboration"
  | "workflow"
  | "industry"
  | "sdk";

export interface TemplateFeatures {
  annotations: boolean;
  forms: boolean;
  signatures: boolean;
  search: boolean;
  thumbnails: boolean;
  ocr: boolean;
  redaction: boolean;
  comparison: boolean;
  export: boolean;
  collaboration: boolean;
  aiAssistant: boolean;
}

export interface TemplateTheme {
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  fontFamily: string;
  logoUrl: string | null;
  companyName: string;
  industry: string | null;
  mode: "dark" | "light";
}

export interface TemplateContent {
  demoTitle: string;
  demoDescription: string;
  companyTagline: string | null;
  heroText: string | null;
  ctaText: string;
}

export interface SampleDocument {
  id: string;
  name: string;
  url: string;
  type: "pdf" | "docx" | "image";
  description: string | null;
}

export interface WorkflowStep {
  id: string;
  label: string;
  description: string;
  toolRequired: string | null;
  order: number;
}

export interface TemplateToolbar {
  showAnnotationTools: boolean;
  showFormTools: boolean;
  showExportTools: boolean;
  showSearchBar: boolean;
  showThumbnails: boolean;
  position: "top" | "bottom";
  customItems: string[];
}

export interface BackendConfig {
  mode: "managed" | "custom" | "none";
  customBackendUrl?: string;
  customBackendConnected?: boolean;
  // Workspace-scoped demo token for the managed proxy (ndk_...). Stored here in
  // plaintext for preview injection + ZIP export; the proxy validates against a
  // hash in backend_tokens (revocable, expiring, credit-limited). Owner-only via RLS.
  demoToken?: string;
  demoTokenExpiresAt?: string;
}

export interface WorkspaceConfig {
  theme: TemplateTheme;
  features: TemplateFeatures;
  content: TemplateContent;
  sampleDocuments: SampleDocument[];
  toolbar: TemplateToolbar;
  workflow: WorkflowStep[];
  activeSampleDocumentId: string | null;
  preview?: PreviewConfig | null;
  backend?: BackendConfig | null;
}

export interface PreviewMetric {
  label: string;
  value: string;
  trend?: string | null;
  tone?: "neutral" | "positive" | "warning" | "critical";
}

export interface PreviewListItem {
  id: string;
  title: string;
  subtitle?: string | null;
  meta?: string | null;
  status?: string | null;
  tone?: "neutral" | "positive" | "warning" | "critical";
}

export interface PreviewAction {
  label: string;
  variant?: "primary" | "secondary" | "danger";
}

export interface PreviewConfig {
  mode: "viewer" | "app";
  appName: string;
  tagline?: string | null;
  accentColor?: string | null;
  activeNav?: string | null;
  navigation?: string[];
  badges?: string[];
  metrics?: PreviewMetric[];
  records?: {
    title: string;
    description?: string | null;
    items: PreviewListItem[];
  };
  workflow?: {
    title: string;
    description?: string | null;
    steps: PreviewListItem[];
  };
  viewer?: {
    title: string;
    subtitle?: string | null;
    documentLabel?: string | null;
    placement?: "right" | "bottom" | "modal" | "full";
    height?: string | null;
  };
  actions?: PreviewAction[];
  modal?: {
    triggerLabel: string;
    title: string;
    description?: string | null;
  };
}

export interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  tags: string[];
  version: string;
  thumbnail: string | null;
  previewUrl: string | null;
  estimatedSetupMinutes: number;
  // Visible in the picker but not selectable yet (e.g. waiting on backend infra).
  comingSoon?: boolean;
}

export interface Template extends TemplateMetadata {
  defaultConfig: WorkspaceConfig;
}

// ─── Workspace System ─────────────────────────────────────────────────────────

export interface Workspace {
  id: string;
  userId: string;
  templateId: string;
  name: string;
  config: WorkspaceConfig;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceWithTemplate extends Workspace {
  template: Template;
}

// ─── AI System ───────────────────────────────────────────────────────────────

export type AIActionType =
  | "update_theme"
  | "toggle_feature"
  | "update_content"
  | "update_sample_docs"
  | "update_toolbar"
  | "update_workflow"
  | "reset_to_template";

export interface AIAction {
  type: AIActionType;
  path?: string;
  value?: unknown;
  documents?: SampleDocument[];
  steps?: WorkflowStep[];
}

export interface AIActionPlan {
  intent: string;
  summary: string;
  actions: AIAction[];
}

export type AIMessageRole = "user" | "assistant" | "system";

export interface AIMessage {
  id: string;
  role: AIMessageRole;
  content: string;
  actionPlan?: AIActionPlan;
  patchedFiles?: string[];
  timestamp: string;
}

export interface AISession {
  id: string;
  workspaceId: string;
  messages: AIMessage[];
  createdAt: string;
  updatedAt: string;
}

// ─── Deployment System ────────────────────────────────────────────────────────

export interface Deployment {
  id: string;
  workspaceId: string;
  userId: string;
  name: string;
  snapshot: WorkspaceConfig | DeploymentSnapshot;
  shareToken: string;
  shareUrl: string;
  createdAt: string;
}

// ─── Project File System ──────────────────────────────────────────────────────

export interface ProjectFile {
  id: string;
  workspaceId: string;
  path: string;
  content: string;
  isSystem: boolean;
  language: string;
  updatedAt: string;
}

export interface DeploymentSnapshot {
  version: 2;
  config: WorkspaceConfig;
  projectFiles: ProjectFile[];
  createdAt: string;
}

export interface FilePatch {
  path: string;
  content: string;
}

export interface FileRename {
  from: string;
  to: string;
}

export interface AIPatchPlan {
  plan: string;
  changes: FilePatch[];
  deletes?: string[];
  renames?: FileRename[];
}

// ─── UI State ─────────────────────────────────────────────────────────────────

export type PanelView = "chat" | "docs" | "settings";

export interface WorkspaceUIState {
  activePanelView: PanelView;
  isAISidebarCollapsed: boolean;
  isViewerLoading: boolean;
  isAIStreaming: boolean;
  pendingActionPlan: AIActionPlan | null;
}
