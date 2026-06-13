"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { CheckCircle2, ExternalLink, Github, Loader2, Plug, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ProjectFile, Workspace } from "@/types";

interface GitHubPushDialogProps {
  open: boolean;
  onClose: () => void;
  workspace: Workspace | null;
  projectFiles: ProjectFile[];
}

interface GitHubPushResponse {
  ok: boolean;
  repoFullName: string;
  repoUrl: string;
  branch: string;
  commitUrl: string;
  fileCount: number;
  error?: string;
}

interface GitHubStatus {
  configured: boolean;
  connected: boolean;
  login: string | null;
  scopes: string[];
  connectedAt: string | null;
}

const FIELD_INPUT_CLASS =
  "w-full rounded-md border border-[#332b2b] bg-[#211a1a] px-3 py-2 text-xs text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-zinc-500";

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100) || "nutrient-demo";
}

function buildUniqueRepoName(base: string): string {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  return slugify(`${base}-${stamp}`);
}

export function GitHubPushDialog({
  open,
  onClose,
  workspace,
  projectFiles,
}: GitHubPushDialogProps) {
  const baseRepoName = useMemo(() => slugify(workspace?.name ?? "nutrient-demo"), [workspace?.name]);
  const pathname = usePathname();
  const [token, setToken] = useState("");
  const [showTokenFallback, setShowTokenFallback] = useState(false);
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState(() => buildUniqueRepoName(baseRepoName));
  const [branch, setBranch] = useState("main");
  const [privateRepo, setPrivateRepo] = useState(true);
  const [message, setMessage] = useState("Initial commit from Nutrient Demo Studio");
  const [isPushing, setIsPushing] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [status, setStatus] = useState<GitHubStatus | null>(null);
  const [result, setResult] = useState<GitHubPushResponse | null>(null);
  const [needsReauth, setNeedsReauth] = useState(false);

  useEffect(() => {
    // Regenerate a fresh unique repo name every time the dialog opens so each push
    // creates a NEW repo on GitHub rather than overwriting an existing one.
    if (!open) return;
    setRepo(buildUniqueRepoName(baseRepoName));
    setResult(null);
    setNeedsReauth(false);
  }, [baseRepoName, open]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setIsLoadingStatus(true);
    fetch("/api/github/status")
      .then((response) => response.json() as Promise<GitHubStatus>)
      .then((data) => {
        if (cancelled) return;
        setStatus(data);
        if (data.login) setOwner((current) => current || data.login || "");
      })
      .catch(() => {
        if (!cancelled) setStatus({ configured: false, connected: false, login: null, scopes: [], connectedAt: null });
      })
      .finally(() => {
        if (!cancelled) setIsLoadingStatus(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  const hasAuth = Boolean(status?.connected || token.trim());

  function connectGitHub() {
    const returnTo = `${pathname || "/"}?githubDialog=1`;
    window.location.href = `/api/github/connect?returnTo=${encodeURIComponent(returnTo)}`;
  }

  async function disconnectGitHub() {
    setIsDisconnecting(true);
    try {
      await fetch("/api/github/disconnect", { method: "POST" });
      setStatus((current) => current ? { ...current, connected: false, login: null, scopes: [], connectedAt: null } : current);
      setOwner("");
      toast.success("GitHub disconnected");
    } catch {
      toast.error("Could not disconnect GitHub");
    } finally {
      setIsDisconnecting(false);
    }
  }

  async function handlePush() {
    if (!repo.trim() || !hasAuth || !projectFiles.length) return;
    setIsPushing(true);
    setResult(null);
    setNeedsReauth(false);

    try {
      const response = await fetch("/api/github/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          owner,
          repo,
          branch,
          privateRepo,
          message,
          alwaysCreateNewRepo: true,
          files: projectFiles.map((file) => ({
            path: file.path,
            content: file.content,
          })),
        }),
      });

      const data = (await response.json()) as GitHubPushResponse & { reauthRequired?: boolean };
      if (!response.ok) {
        if (data.reauthRequired || response.status === 401) {
          setNeedsReauth(true);
          setStatus((current) =>
            current ? { ...current, connected: false, login: null } : current
          );
          toast.error("GitHub session expired. Reconnect to push.");
          return;
        }
        throw new Error(data.error || "GitHub push failed.");
      }

      setResult(data);
      toast.success("Pushed to a new GitHub repo", {
        description: `${data.repoFullName}@${data.branch}`,
      });
      // Pre-generate the next unique repo name so a second push goes to a fresh repo, not the same one.
      setRepo(buildUniqueRepoName(baseRepoName));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "GitHub push failed.");
    } finally {
      setIsPushing(false);
    }
  }

  function closeDialog() {
    if (isPushing) return;
    setResult(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-[#332b2b] bg-[#1a1414] shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-[#2a2222] p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#332b2b] bg-[#211a1a] text-zinc-200">
              <Github className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Create new GitHub repo and push</h2>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                Each push creates a brand-new GitHub repo for the generated project. Secrets are never exported; only project files are pushed.
              </p>
            </div>
          </div>
          <button
            onClick={closeDialog}
            disabled={isPushing}
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-white/5 hover:text-zinc-300 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-4">
          {needsReauth && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-amber-200">GitHub session expired</p>
                <p className="mt-1 text-[11px] leading-relaxed text-amber-300/80">
                  Your previous connection is no longer valid. Reconnect to push.
                </p>
              </div>
              <button
                onClick={connectGitHub}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-amber-200 px-3 py-1.5 text-xs font-medium text-[#3a2a06] transition-colors hover:bg-amber-100"
              >
                <Plug className="h-3.5 w-3.5" />
                Reconnect
              </button>
            </div>
          )}
          <div className="rounded-lg border border-[#332b2b] bg-[#211a1a] p-3">
            {isLoadingStatus ? (
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Checking GitHub connection...
              </div>
            ) : status?.connected ? (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-medium text-zinc-100">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    Connected as {status.login}
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-600">
                    OAuth scopes: {status.scopes.length ? status.scopes.join(", ") : "default"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    onClick={connectGitHub}
                    className="shrink-0 rounded-md border border-[#3a3030] px-2 py-1 text-[11px] text-zinc-500 transition-colors hover:text-zinc-200"
                  >
                    Switch account
                  </button>
                  <button
                    onClick={disconnectGitHub}
                    disabled={isDisconnecting}
                    className="shrink-0 rounded-md border border-[#3a3030] px-2 py-1 text-[11px] text-zinc-500 transition-colors hover:text-zinc-200 disabled:opacity-50"
                  >
                    {isDisconnecting ? "Disconnecting" : "Disconnect"}
                  </button>
                </div>
              </div>
            ) : status?.configured ? (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-zinc-100">GitHub is not connected</p>
                  <p className="mt-1 text-[11px] text-zinc-600">
                    Uses GitHub OAuth. The token stays in an encrypted HttpOnly cookie.
                  </p>
                </div>
                <button
                  onClick={connectGitHub}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                  style={{ background: "#c4a882", color: "#1a1414" }}
                >
                  <Plug className="h-3.5 w-3.5" />
                  Connect
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-medium text-amber-200">GitHub OAuth is not configured</p>
                <p className="text-[11px] leading-relaxed text-zinc-600">
                  Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in Vercel, with callback URL
                  {" "}<span className="font-mono text-zinc-500">/api/github/callback</span>.
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Owner or org">
              <input
                value={owner}
                onChange={(event) => setOwner(event.target.value)}
                placeholder="blank = your account"
                className={FIELD_INPUT_CLASS}
              />
            </Field>
            <Field label="Repository">
              <input
                value={repo}
                onChange={(event) => setRepo(slugify(event.target.value))}
                placeholder="nutrient-demo"
                className={FIELD_INPUT_CLASS}
              />
            </Field>
          </div>
          <p className="-mt-1 text-[11px] leading-relaxed text-zinc-600">
            Each push creates a brand-new repo. A timestamp is appended so repeated pushes never overwrite an existing project.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
            <Field label="Branch">
              <input
                value={branch}
                onChange={(event) => setBranch(event.target.value)}
                placeholder="main"
                className={FIELD_INPUT_CLASS}
              />
            </Field>
            <label className="flex items-end gap-2 pb-2 text-xs text-zinc-500">
              <input
                type="checkbox"
                checked={privateRepo}
                onChange={(event) => setPrivateRepo(event.target.checked)}
                className="h-3.5 w-3.5 rounded border-[#332b2b] bg-[#211a1a]"
              />
              Private repo
            </label>
          </div>

          <Field label="Commit message">
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className={FIELD_INPUT_CLASS}
            />
          </Field>

          <button
            type="button"
            onClick={() => setShowTokenFallback((value) => !value)}
            className="text-[11px] text-zinc-600 transition-colors hover:text-zinc-300"
          >
            {showTokenFallback ? "Hide token fallback" : "Use token fallback"}
          </button>

          {showTokenFallback && (
            <div className="space-y-2 rounded-lg border border-[#332b2b] bg-[#211a1a] p-3">
              <Field label="GitHub fine-grained token">
                <input
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  type="password"
                  placeholder="github_pat_..."
                  className={cn(FIELD_INPUT_CLASS, "font-mono")}
                />
              </Field>
              <p className="text-[11px] leading-relaxed text-zinc-600">
                Fallback for local testing. The token is sent once and not saved.
              </p>
              <a
                href="https://github.com/settings/personal-access-tokens/new"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500 transition-colors hover:text-zinc-200"
              >
                Create a GitHub token
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {result && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-200">
              <p className="font-medium">Pushed {result.fileCount} files to {result.repoFullName}</p>
              <a
                href={result.commitUrl || result.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-emerald-300 hover:text-emerald-100"
              >
                Open commit
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[#2a2222] p-4">
          <button
            onClick={closeDialog}
            disabled={isPushing}
            className="rounded-md border border-[#332b2b] px-3 py-1.5 text-xs text-zinc-500 transition-colors hover:border-[#463735] hover:text-zinc-300 disabled:opacity-50"
          >
            Close
          </button>
          <button
            onClick={handlePush}
            disabled={isPushing || !repo.trim() || !hasAuth || !projectFiles.length}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
            style={isPushing || !repo.trim() || !hasAuth || !projectFiles.length
              ? { background: "#2a2222", color: "#52403f" }
              : { background: "#c4a882", color: "#1a1414" }
            }
          >
            {isPushing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isPushing ? "Creating repo..." : "Create new repo and push"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-medium text-zinc-500">{label}</span>
      {children}
    </label>
  );
}
