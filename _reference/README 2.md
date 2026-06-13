# Nucode

> The complete Nutrient demo platform — engineered and developed by Vinayak Kamboj

**Built for sales teams to create live, custom Nutrient demos on the fly — describe what a prospect needs, and the AI builds a working app in seconds, right there on the call.**

Nucode is an autonomous AI coding agent that creates and builds real React projects powered by Nutrient products. Describe what you want in plain English — the agent plans the architecture, designs the visual system, writes every file, and ships a live, working Nutrient-integrated React app you can preview, share, and push to GitHub.

## Pipelines

Three pipelines, each optimised for a different task:

| Pipeline | Best for | Phases |
|---|---|---|
| **Light** | All new builds, edits, and fixes — the default | plan → design → build |
| **Full** | Complex multi-page first builds | plan → design → build → (pass 2 if needed) |
| **Deep** | Surgical Nutrient Web SDK coding + expert-level changes | single pass, full SDK context |

Nucode is the app/agent name. The docs-heavy third pipeline is **Deep**.

The **Deep pipeline** runs on Claude Sonnet with the complete Nutrient Web SDK reference as its system prompt. It writes exact, working code changes — toolbar customisation, annotations, redaction, forms, signatures, comparison, and any other SDK capability.

---

---

## What it does

- **Autonomous AI builder** — a multi-step Claude agent (roadmap → design system → code generation) that creates complete React projects from a natural language prompt
- **Nutrient-first** — every generated app is wired to the Nutrient Web SDK with the right capability for the workflow (viewer, annotations, redaction, forms, signatures, OCR, comparison, AI document processing)
- **Real code, not templates** — the agent owns the full repository: pages, layouts, components, hooks, services, state, data, types, and config
- **Curated design system** — each build picks a complete palette + typography + layout signature from a curated bank, so apps look distinct and polished
- **Live preview** — Sandpack runs the generated project in-browser; edit, regenerate, and iterate in seconds
- **One-click sharing** — publish any workspace as a shareable link, or push the generated project as a fresh GitHub repo

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Animation | Framer Motion |
| Auth & DB | Supabase (email+password, RLS) |
| AI | Anthropic Claude via Vercel AI SDK |
| Document SDK | Nutrient Web SDK (`@nutrient-sdk/viewer`) |
| Deployment | Vercel |

---

## Project structure

```
app/
  (auth)/login          # Login page
  (auth)/signup         # Signup page
  (dashboard)/          # Template picker dashboard
  api/ai/               # Streaming AI chat endpoint
  api/auth/             # Signup / login API routes
  api/deployments/      # Workspace publishing
  api/migrate/          # One-click database migration
  api/workspaces/       # Workspace CRUD
  auth/callback/        # Supabase confirmation link handler
  share/[token]/        # Public shareable demo viewer
  workspace/[id]/       # Workspace editor

components/
  auth/                 # Login and signup forms
  dashboard/            # Template cards, recent workspaces
  viewer/               # Nutrient Web SDK wrapper
  workspace/            # AI sidebar, config panel, live viewer, top bar

features/
  ai/                   # Prompt builder and config applier
  templates/            # Template registry and definitions
  workspaces/           # Server actions and Zustand store

lib/
  auth/email.ts         # @nutrient.io domain enforcement
  nutrient/config.ts    # SDK config builder
  supabase/             # Client, server, and env helpers

supabase/
  schema.sql            # Database schema (idempotent, re-runnable)
```

---

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/vinayakkamboj/demo-nutrient.git
cd demo-nutrient
npm install
```

### 2. Configure environment variables

Copy the example file and fill in the values:

```bash
cp .env.local.example .env.local
```

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → Data API → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → Data API → Publishable key |
| `DATABASE_URL` | Supabase → Project Settings → Database → Connection string (URI) |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `NEXT_PUBLIC_NUTRIENT_LICENSE_KEY` | Nutrient customer portal |
| `MIGRATE_SECRET` | Any random string — used to protect the `/api/migrate` endpoint |
| `GITHUB_CLIENT_ID` | GitHub OAuth app → Client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth app → Client secret |
| `GITHUB_SESSION_SECRET` | Long random string for encrypting the HttpOnly GitHub session cookie |

For GitHub push, create a GitHub OAuth app and add these callback URLs:

- Local: `http://localhost:3000/api/github/callback`
- Vercel: `https://your-app.vercel.app/api/github/callback`

### 3. Set up the database

The app includes a self-migration endpoint. After setting the env vars, run:

```bash
# Local
curl "http://localhost:3000/api/migrate?secret=YOUR_MIGRATE_SECRET"

# Deployed on Vercel
curl "https://your-app.vercel.app/api/migrate?secret=YOUR_MIGRATE_SECRET"
```

You should see `{"ok":true,"message":"Migration complete"}`. The endpoint is idempotent — safe to run multiple times.

### 4. Configure Supabase auth

In the Supabase dashboard:

1. **Authentication → Providers → Email** — ensure the Email provider is **enabled**
2. **Authentication → Providers → Email → Confirm email** — set to **off** for internal use (recommended), or **on** if you want confirmation emails
3. **Authentication → URL Configuration → Site URL** — set to your production URL (e.g. `https://your-app.vercel.app`)
4. **Authentication → URL Configuration → Redirect URLs** — add `https://your-app.vercel.app/auth/callback`

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up with your `@nutrient.io` email address.

---

## Deploying to Vercel

1. Push the repo to GitHub
2. Import the project in [vercel.com](https://vercel.com)
3. Add all environment variables from `.env.local.example` in Vercel → Project Settings → Environment Variables — **including `DATABASE_URL` and `MIGRATE_SECRET`**
4. Deploy, then hit `https://your-app.vercel.app/api/migrate?secret=YOUR_MIGRATE_SECRET` once to create the database tables

---

## Auth

- Signup and login are restricted to `@nutrient.io` email addresses — enforced on both client and server
- Auth uses Supabase email+password (`signUp` / `signInWithPassword`)
- Confirmation link flow: Supabase sends an email → user clicks the link → `/auth/callback` exchanges the code for a session
- With "Confirm email" disabled in Supabase (recommended for internal tools), accounts are active immediately after signup

---

## Database schema

Three tables with Row Level Security enabled:

| Table | Description |
|---|---|
| `workspaces` | Per-user demo workspaces linked to a template |
| `ai_sessions` | Chat history for each workspace |
| `deployments` | Published snapshots with unique share tokens |

All tables are owned by the authenticated user. Deployments have an additional public-read policy so share links work without login.

---

## Templates

Templates are defined in `features/templates/web-sdk-templates.ts`. Each template specifies:

- **Category** — `document`, `forms`, `workflow`, `collaboration`, `industry`
- **Features** — which Nutrient SDK capabilities are enabled (annotations, forms, signatures, OCR, redaction, etc.)
- **Content** — demo title, description, company tagline, CTA text
- **Workflow steps** — guided demo flow shown in the AI sidebar
- **Sample documents** — pre-loaded PDFs

To add a new template, append an entry to the `WEB_SDK_TEMPLATES` array in that file.

---

## Contributing

This is an internal tool. Access is restricted to `@nutrient.io` accounts. For issues or feature requests, open a ticket in the internal tracker.

---

## Engineered & Developed by

Nucode was designed, engineered, and built by **Vinayak Kamboj** — Sales Engineer at Nutrient.

Built to solve a real sales problem: giving sales teams a way to spin up live, working Nutrient demos during a prospect call, without needing engineering support. Every pipeline, prompt, design decision, and line of code in this tool was conceived and authored by Vinayak.

[vinayakkamboj@nutrient.io](mailto:vinayakkamboj@nutrient.io)
