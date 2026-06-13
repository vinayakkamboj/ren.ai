/**
 * Product dashboard types. These mirror the Supabase schema
 * (supabase/migrations/0002_product.sql). In demo mode (no auth configured)
 * the dashboard renders empty states; once a user signs in and connects
 * GitHub, these shapes are populated from their own data — never invented
 * company-wide metrics.
 */

export type ProjectKind = "new" | "repository";
export type ProjectStatus = "draft" | "building" | "active" | "archived";

export interface Project {
  id: string;
  name: string;
  kind: ProjectKind;
  status: ProjectStatus;
  description: string;
  repoFullName?: string;
  updatedAt: string;
}

export type RepoIndexState = "indexed" | "indexing" | "queued" | "error";

export interface Repository {
  id: string;
  fullName: string;
  defaultBranch: string;
  private: boolean;
  language: string;
  indexState: RepoIndexState;
  lastSynced: string;
}

export type PullRequestState = "open" | "merged" | "draft" | "closed";

export interface PullRequest {
  id: string;
  title: string;
  repoFullName: string;
  number: number;
  state: PullRequestState;
  branch: string;
  createdAt: string;
}

export type ConversationScope = "project" | "repository" | "general";

export interface Conversation {
  id: string;
  title: string;
  scope: ConversationScope;
  context?: string;
  messageCount: number;
  updatedAt: string;
}

export interface DocPage {
  id: string;
  title: string;
  repoFullName: string;
  kind: "architecture" | "api" | "guide" | "readme";
  updatedAt: string;
}

/**
 * Empty workspace — what a brand-new authenticated account actually contains.
 * The dashboard is built to render this gracefully. Replace with live Supabase
 * queries once a user connects GitHub and creates projects.
 */
export const emptyWorkspace = {
  projects: [] as Project[],
  repositories: [] as Repository[],
  pullRequests: [] as PullRequest[],
  conversations: [] as Conversation[],
  docs: [] as DocPage[],
};

export type Workspace = typeof emptyWorkspace;
