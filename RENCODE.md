# Ren Code — Architecture & Technology Reference

> Last updated: 2026-06-13

Ren Code is the AI-powered application builder inside the Ren platform. Users
describe what they want to build; **Astra** (the Ren build intelligence) writes
the React + Vite + Tailwind code, applies it to a live Sandpack sandbox, and
iterates in a continuous chat loop.

---

## 1. High-Level Architecture

```
Browser
│
├── Dashboard  /dashboard               (Next.js App Router, server components)
│   ├── Project cards grid              "Your Projects"
│   ├── Usage strip                     builds-this-month / allowance
│   └── New project flow               new app | existing GitHub repo
│
└── Workspace  /workspace/[id]          (client-heavy, real-time)
    ├── Chat panel  ◄── Astra AI        message history + composer
    ├── File tree                       directory of generated files
    ├── Monaco editor                   live code editing
    └── Live preview                    Sandpack iframe sandbox
         ├── Console tab                sandpack console output
         └── Dependencies tab           installed npm packages

Server
├── /api/builder           POST         streams Anthropic responses
└── /api/builder/files     GET/POST     loads and saves project files to Supabase
```

---

## 2. Astra — The Build Intelligence

**Astra** is the Ren AI agent that powers the build loop. It has four tiers,
all backed by Anthropic Claude models:

| Tier         | Internal Model        | Best For                          |
|--------------|-----------------------|-----------------------------------|
| Astra Flash  | Claude Haiku 4.5      | Quick fixes, simple edits         |
| Astra Flow   | Claude Sonnet 4.6     | General builds (recommended)      |
| Astra Pro    | Claude Opus 4.8       | Complex, high-quality generation  |
| Astra Max    | Claude Fable 5        | Maximum capability, premium usage |

The tier is resolved **server-side** in `/api/builder`. The client only ever
sends a tier id (`spark | flow | forge | apex`); the actual model id never
leaves the server.

---

## 3. Build Loop

Each message submission triggers the following sequence in the Zustand store
(`src/lib/builder/store.ts`):

```
User submits message
        │
        ▼
  Phase: thinking
        │  Stream /api/builder with:
        │  · chat history (last 16 turns)
        │  · current project files (context-packed)
        │  · model tier, first-build flag
        ▼
  Phase: writing
        │  Accumulate streamed text
        │  Parse <file_patches> block as it arrives
        ▼
  Phase: applying
        │  detectFatalIssues()
        │    ├── Missing App.tsx? → repair pass
        │    └── Truncated files? → repair pass
        │  applyPatchPlan() atomically writes files
        │  Increment viewerKey → Sandpack re-runs
        ▼
  Phase: idle
        │  Persist to localStorage
        └── Best-effort sync to Supabase
```

### File Patches Protocol

Astra returns a `<file_patches>` JSON block at the end of every response:

```json
{
  "plan": "one-line summary of changes",
  "changes": [
    { "path": "src/App.tsx", "content": "...full file content..." }
  ],
  "deletes": [],
  "renames": []
}
```

`src/lib/builder/file-patches.ts` implements **6 recovery strategies** to parse
this block even when the LLM truncates mid-response:

1. Direct JSON parse
2. Suffix closure (append `}]}` and retry)
3. Boundary truncation (strip after last complete change)
4. Character scanning (find balanced braces)
5. XML tag extraction
6. Markdown section fallback

---

## 4. Repository Intelligence

`src/lib/builder/context.ts` ranks project files by relevance to the current
request and packs them into the prompt within a token budget.

Scoring heuristics:

| Signal                      | Weight |
|-----------------------------|--------|
| `REN.md` (project memory)   | +25    |
| `src/App.tsx`               | +24    |
| Error-related paths         | +40    |
| Recently changed files      | +16    |
| Request token matches       | +8 per |

The packed context is injected as a leading block on the final user turn so
the model always has current project state before it generates.

---

## 5. Live Preview (Sandpack)

The preview uses `@codesandbox/sandpack-react` with the `vite-react-ts`
template. Every time Astra applies a patch, `viewerKey` increments, which
remounts the `SandpackProvider` and re-executes the app from scratch.

### Base Template

Every new project starts with:
- `index.html` — Tailwind CDN + semantic CSS custom properties (`--primary`,
  `--background`, `--foreground`, etc.)
- `src/index.css` — HSL design tokens for light + dark themes
- `src/App.tsx` — minimal starter with a counter demo
- `src/lib/utils.ts` — the `cn()` helper (clsx + tailwind-merge)
- `REN.md` — project memory file that Astra reads and updates

Standard dependencies pre-installed in every sandbox:
`react`, `react-dom`, `lucide-react`, `framer-motion`, `recharts`,
`clsx`, `tailwind-merge`, `class-variance-authority`, `date-fns`

### Bottom Panel

The live preview includes a collapsible bottom panel with two tabs:
- **Console** — real-time `console.log/warn/error` output via `SandpackConsole`
- **Dependencies** — all installed npm packages with versions

---

## 6. GitHub Integration

Users can connect GitHub via OAuth. Connected repos are stored in the
`repositories` table in Supabase. A repository-mode project seeds the
workspace from the repo's source files via `src/lib/builder/github-loader.ts`,
which fetches up to 80 text files from the default branch.

---

## 7. Persistence

| Layer          | What is stored                                | When           |
|----------------|-----------------------------------------------|----------------|
| localStorage   | Files + chat messages per project id          | Every build     |
| Supabase       | Project metadata, file snapshots              | Best-effort     |
| Supabase       | Collaborator invites (`project_collaborators`)| On invite send  |

localStorage is the primary source of truth for in-flight sessions. Supabase
sync is best-effort and silently skipped if tables do not exist (useful during
local development without a full migration).

---

## 8. System Prompts

`src/lib/builder/prompts.ts` exports three prompt builders:

- `buildNewProjectPrompt()` — first build from a user description
- `buildEditPrompt()` — subsequent edits to an existing project
- `buildRepairPrompt(issues)` — one-pass repair when fatal issues are detected

All prompts instruct Astra to respond with a prose explanation followed by a
`<file_patches>` JSON block. No intermediate build tools or shell commands are
used; everything runs in the browser.

---

## 9. Collaborators

Projects can be shared with collaborators via invite email. The invite flow:
1. Owner clicks **Invite** in the workspace toolbar
2. Enters email; `inviteCollaborator()` server action inserts into
   `project_collaborators` with status `pending`
3. When the invitee signs in with that email, they see the project in
   the **Shared with you** section on the dashboard

---

## 10. Directory Structure

```
src/
├── app/
│   ├── api/builder/          POST stream + GET/POST files
│   ├── dashboard/            Overview, Projects, Repositories, Settings…
│   └── workspace/[id]/       Full-screen build surface
├── components/
│   ├── platform/             Dashboard shell, project cards, new-project flow
│   └── workspace/            ChatPanel, EditorPanel, FileTree, LivePreview
├── lib/
│   ├── builder/
│   │   ├── store.ts          Zustand workspace state + build loop
│   │   ├── file-patches.ts   6-strategy patch parser + atomic apply
│   │   ├── context.ts        Repository intelligence + context packing
│   │   ├── prompts.ts        System prompt builders (new / edit / repair)
│   │   ├── base-template.ts  Starter file set for new projects
│   │   ├── model-tiers.ts    Astra tier → model id mapping
│   │   ├── github-loader.ts  Fetch source files from GitHub API
│   │   └── download.ts       Browser-side ZIP export (fflate)
│   ├── actions/
│   │   ├── projects.ts       createProject / deleteProject
│   │   └── collaborators.ts  inviteCollaborator / getCollaborators
│   └── supabase/             Server + browser Supabase clients
└── …
```
