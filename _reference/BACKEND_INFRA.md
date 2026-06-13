# Backend Project Infrastructure — Architecture Design

Authored by Vinayak Kamboj  
Status: Phases 1–3 code complete (2026-06-12) — pending: Railway deployment + env vars + migration run (see "Remaining to go live" below)

---

## The Problem

Nucode today is a pure frontend platform. Every generated app runs inside Sandpack (in-browser Vite+React). This works perfectly for the Nutrient Web SDK because the browser can load the 5 MB CDN bundle at runtime.

It does **not** work for server-side SDKs:

- **Python SDK** (`nutrient-sdk`) — in-process native Python, cannot run in a browser
- **Node.js Server SDK** — requires a real Node.js server process
- **Java / .NET SDKs** — JVM / CLR required

Right now, when a user picks `/python-sdk`, Nucode generates Python scripts under `scripts/` and a simulated frontend UI — the simulation is fake. There is no real PDF processing happening.

This document designs the infrastructure to make it real.

---

## Two-Mode Architecture

Users get exactly two choices. The choice is framed at demo creation time and can be changed later at zero cost.

```
┌─────────────────────────────────────────────────────┐
│           How should your backend work?              │
│                                                      │
│  ┌──────────────────────┐  ┌────────────────────┐   │
│  │  Nucode Managed      │  │  Your Own Backend  │   │
│  │  (default, instant)  │  │  (BYO, portable)   │   │
│  └──────────────────────┘  └────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

The two modes share the **same REST contract**. Migrating from managed → custom is a single URL change in workspace settings. Generated app code is identical in both modes.

---

## Mode A — Nucode Managed Backend

### What it is

A proxy API route running inside the Nucode Next.js host (`/api/backend-proxy/[workspaceId]/[operation]`). The user's generated React app calls this proxy. The proxy runs the Nutrient Python SDK (or Node.js SDK) on Nucode's infrastructure, using Nucode's license key. The license key and secrets **never leave the server and are never visible to the user or their generated code**.

### Why this is safe

- The generated React app only knows the relative proxy URL (e.g. `/api/backend-proxy/ws_abc123/convert`). There is no API key in the frontend.
- The proxy validates the workspace ID against Supabase to confirm the requesting user owns it.
- Calls are credit-gated — same credit system as AI usage. Each backend operation deducts credits, preventing abuse.
- Rate limiting is enforced per workspace and per user.
- The Nutrient license key is read from a server-only environment variable (`NUTRIENT_LICENSE_KEY`), never exposed via any API response.

### Proxy contract

All operations share one endpoint shape:

```
POST /api/backend-proxy/{workspaceId}/{operation}
Content-Type: multipart/form-data

Fields:
  file      — the input document (PDF, DOCX, XLSX, etc.)
  options   — JSON string with operation-specific params

Response:
  200 OK — { result: <base64 or JSON>, meta: {...} }
  402     — insufficient credits
  429     — rate limited
  403     — workspace not owned by auth user
```

Supported operations on launch:

| Operation | Description |
|---|---|
| `convert` | DOCX/XLSX/PPTX → PDF, or PDF → image |
| `ocr` | Make a scanned PDF text-searchable |
| `extract` | Extract text, tables, or structured data from PDF |
| `redact` | Apply redactions and produce a clean PDF |
| `watermark` | Add text or image watermark |

### Credit costs (proposed)

| Operation | Credits |
|---|---|
| convert (< 10 pages) | 2 |
| convert (10–50 pages) | 5 |
| ocr (per page) | 1 |
| extract (< 10 pages) | 3 |
| redact | 4 |
| watermark | 1 |

This keeps demo use essentially free while preventing bulk abuse.

### Infrastructure needed

**New Next.js API route:**

```
app/api/backend-proxy/[workspaceId]/[operation]/route.ts
```

This route:
1. Authenticates the session (Supabase cookie)
2. Verifies workspace ownership
3. Deducts credits (pre-check, fail fast)
4. Invokes the backend runner (Python subprocess or Node.js SDK call)
5. Streams or returns the result
6. Logs to `backend_requests` table

**New Supabase table:**

```sql
create table backend_requests (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id      uuid references auth.users(id),
  operation    text not null,
  input_bytes  int,
  output_bytes int,
  credits_used int,
  duration_ms  int,
  status       text not null, -- 'success' | 'error'
  error_msg    text,
  created_at   timestamptz default now()
);
```

**Python runner process:**

Because Next.js (Node.js) cannot directly call the Python SDK, the proxy spawns a lightweight Python subprocess or calls a sidecar FastAPI process:

```
Option 1 (simple): exec Python script as subprocess, pass args as JSON stdin, capture stdout
Option 2 (better):  a long-running FastAPI sidecar on a local port (docker-compose service),
                    Next.js proxies to it over localhost — no process startup latency
```

For Vercel deployment, Option 2 is not viable (no persistent sidecar). The recommended deployment target for managed backend support is a **VPS or container environment** (e.g. Railway, Render, Fly.io, or self-hosted Docker). The sidecar pattern is used there.

The FastAPI sidecar is private (not internet-accessible) — it only listens on `localhost:8080` inside the container network and only the Next.js app proxy can reach it.

---

## Mode B — User's Own Backend

### What it is

The user runs their own backend (FastAPI, Express, Spring Boot, ASP.NET — any language) that implements the same REST contract as Mode A's proxy. Nucode generates a working FastAPI starter that implements the contract, ready to copy and deploy.

### Why this is the right long-term default

Prospects and customers evaluating Nutrient SDKs need to see the SDK running in their own stack. Mode A is for "wow, it works" in the first 2 minutes. Mode B is for "here's what it looks like in my environment." Both are needed.

Mode B has zero Nucode dependency. Once the user deploys their own backend, their app is fully self-contained. This is the correct migration path from demo to production.

### How the generated code handles both modes identically

The generated React app never hardcodes a backend URL. It reads from a single env var:

```tsx
const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "/api/backend-proxy/WORKSPACE_ID";
```

- In Mode A, this resolves to the Nucode managed proxy route (injected at build/runtime).
- In Mode B, this resolves to the user's deployed backend URL.

The generated app code is **the same file** in both cases. There are no `if (mode === 'managed')` branches in generated code.

### What gets generated for Mode B

When the user selects `/python-sdk` and Mode B, the AI generates:

**`backend/main.py`** — a complete FastAPI app implementing the standard contract:

```python
from fastapi import FastAPI, UploadFile, File, Form
from nutrient_sdk import Document, License, PdfExporter
import json, base64, io

License.register_key(os.environ["NUTRIENT_LICENSE_KEY"])

app = FastAPI()

@app.post("/convert")
async def convert(file: UploadFile = File(...), options: str = Form("{}")):
    opts = json.loads(options)
    data = await file.read()
    with Document.open(io.BytesIO(data)) as doc:
        out = io.BytesIO()
        doc.export(out, PdfExporter())
        return {"result": base64.b64encode(out.getvalue()).decode()}
```

**`backend/requirements.txt`**:
```
nutrient-sdk
fastapi
python-multipart
uvicorn
```

**`backend/Dockerfile`** (optional, generated on request):
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
```

**`NUTRIENTWEBBUILDER.md` section appended**:
```
## Backend Setup

Your backend is a FastAPI app in backend/.

1. Set your Nutrient license key:
   export NUTRIENT_LICENSE_KEY=your-key-here

2. Run locally:
   cd backend && uvicorn main:app --reload

3. Connect to your frontend:
   Set NEXT_PUBLIC_BACKEND_URL=http://localhost:8080 in .env.local

4. Deploy (example: Railway):
   railway up --service backend
   Then set NEXT_PUBLIC_BACKEND_URL to your deployed URL.
```

### Storing the user's backend URL in Nucode

When the user switches to Mode B in workspace settings, they paste their backend URL. Nucode stores it in the workspace config and injects it into the Sandpack env at preview time so the live preview actually calls the real backend.

No API key is stored for Mode B — the user's backend is responsible for its own auth. If the user wants Nucode to store a token, it is stored encrypted in a `backend_credentials` table and injected at proxy time as a request header, never surfaced in the browser.

**New Supabase table:**

```sql
create table backend_credentials (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid references workspaces(id) on delete cascade,
  backend_url   text not null,
  api_key_enc   text,          -- AES-256 encrypted, key in SUPABASE_SECRET_KEY
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
```

---

## Migration: Mode A → Mode B (zero rework)

This is the key design guarantee. The migration steps are:

1. User builds their demo on Mode A. Everything works.
2. User wants to ship to production with their own infrastructure.
3. User runs `pip install nutrient-sdk && uvicorn main:app` with the generated `backend/` folder.
4. User sets `NEXT_PUBLIC_BACKEND_URL` to their backend URL.
5. Done. No changes to React app code.

The REST contract is the migration boundary. As long as the user's backend implements the same endpoints with the same request/response shapes, the frontend is unmodified.

---

## WorkspaceConfig type additions

```typescript
export interface BackendConfig {
  mode: "managed" | "custom" | "none";
  customBackendUrl?: string;
  // API key never stored in WorkspaceConfig — only in backend_credentials table
  customBackendConnected?: boolean; // true once user has verified their backend responds
}

// Add to WorkspaceConfig:
export interface WorkspaceConfig {
  // ... existing fields ...
  backend?: BackendConfig | null;
}
```

---

## SkillModeContext changes (skill-modes.ts)

The `nutrient-python-sdk` skill context needs one addition:

```
When generating frontend code that calls the Python backend:
- Reference NEXT_PUBLIC_BACKEND_URL (or the injected proxy URL) for all fetch calls.
- Never hardcode a URL or API key in a React component.
- In backend/main.py, always read NUTRIENT_LICENSE_KEY from os.environ.
- The backend/ folder is separate from the React src/ — never import from it.
- Always generate a working simulation mode in the frontend so the Sandpack preview
  works even when no backend is running.
```

Same pattern applies to `nutrient-nodejs-server-sdk`, `nutrient-java-server-sdk`, `nutrient-dotnet-server-sdk`.

---

## Sandpack simulation fallback (critical)

Sandpack cannot call external URLs reliably in demo contexts. The generated frontend always includes a **simulation mode** that:
- Detects when `NEXT_PUBLIC_BACKEND_URL` is absent or returns an error
- Falls back to a local mock that returns a hardcoded success result
- Shows a banner: "Running in simulation mode — connect a backend for real processing"

This preserves the current behavior where every Sandpack preview works immediately, while the real backend integration is opt-in.

---

## New UI surfaces needed

### Workspace Settings → Backend tab

```
┌─────────────────────────────────────────────────────┐
│  Backend Mode                                        │
│                                                      │
│  ○ Nucode Managed  (uses 2–5 credits per operation) │
│  ○ My Own Backend                                    │
│    URL: [https://my-api.example.com          ]       │
│    [Test Connection]  ✓ Connected                    │
│                                                      │
│  [Save]                                              │
└─────────────────────────────────────────────────────┘
```

### Dashboard → Credits bar

Show backend credit usage separately from AI credits, since they come from the same pool but users need visibility:

```
AI builds: ████░░░░░░  42 / 100
Backend:   ██░░░░░░░░  18 / 100
```

---

## Deployment requirements for Managed Backend

The managed proxy depends on a Python runtime being available on the server. This affects deployment:

| Platform | Status |
|---|---|
| Vercel (serverless) | Not supported — no persistent Python runtime |
| Railway / Render / Fly.io | Supported — Docker deploy with Python sidecar |
| Self-hosted VPS + Docker Compose | Supported — preferred for full control |
| Vercel + separate Python microservice | Supported — Next.js proxies to a deployed FastAPI service |

The simplest production path: deploy the Next.js app to Vercel and deploy the Python sidecar as a separate Railway or Render service. The Next.js proxy calls the Railway service URL via an internal `BACKEND_SIDECAR_URL` env var. The sidecar is private (no public auth needed — auth is enforced in the Next.js proxy layer before any call reaches the sidecar).

---

## Implementation order

### Phase 1 — Foundation (no UI, no managed backend) ✅ COMPLETE (2026-06-09)

**Files changed:**
- `types/index.ts` — Added `BackendConfig` interface (`mode`, `customBackendUrl`, `customBackendConnected`) and `backend?: BackendConfig | null` to `WorkspaceConfig`.
- `features/ai/skill-modes.ts` — Updated `SKILL_CONTEXTS` for `nutrient-python-sdk`, `nutrient-nodejs-server-sdk`, `nutrient-java-server-sdk`, `nutrient-dotnet-server-sdk` with the full Nucode backend contract pattern (standard REST endpoints, env-var-only secrets, `VITE_BACKEND_URL` reference, simulation fallback requirement).
- `features/ai/prompts.ts` — Replaced the single-line backend pipeline note with a six-rule Nucode backend contract block covering: `backend/` folder generation, REST endpoint contract, env-var-only secrets, `VITE_BACKEND_URL` constant in React, simulation fallback, and `NUTRIENTWEBBUILDER.md` Backend Setup section.
- `NUTRIENTWEBBUILDER.md` — Added a Latest AI Change entry documenting Phase 1.
- `BACKEND_INFRA.md` — This document.

**What is now true:**
- When a user builds with `/python-sdk`, `/node-sdk`, `/java-sdk`, or `/dotnet-sdk`, the AI will generate a `backend/` folder with the standard contract, a simulation fallback in React, and setup docs.
- The React frontend code never contains hardcoded URLs or secrets.
- Migration from managed → custom backend requires no React code changes (only `VITE_BACKEND_URL` env var change).

**What Phase 1 does NOT include:**
- No settings UI for backend configuration.
- No Supabase tables yet.
- No managed proxy route yet.
- The `backend` field on `WorkspaceConfig` exists in types but is not yet read or written by any UI or API route.

### Phase 2 — Mode B (BYO backend, full flow) ✅ CODE COMPLETE (2026-06-12)
1. ✅ `backend_credentials` Supabase table — in `app/api/migrate/route.ts` (run migration to create)
2. ✅ Backend Processing section in workspace ConfigPanel (mode picker, URL field, Test Connection)
3. ✅ Custom backend URL stored in `config.backend` (`BackendConfig` in types)
4. ✅ Backend URL injected into Sandpack preview at runtime as `window.__NUCODE_BACKEND__` (`injectBackendRuntime` in SandpackPreview.tsx) — the AI contract in prompts.ts/skill-modes.ts reads it with VITE_ env fallback for downloaded repos
5. ✅ Test Connection endpoint: `GET /api/workspaces/[id]/backend/ping?url=...` (server-side /health probe)

### Phase 3 — Mode A (managed backend) ✅ APP CODE COMPLETE (2026-06-12) — ⏳ DEPLOYMENT PENDING
1. ✅ FastAPI sidecar built in `backend-service/` (Docker: Python + Node runtimes, shared-secret auth; `/convert` implemented, `/ocr` `/extract` `/redact` `/watermark` are 501 stubs until the Python SDK API reference for them is published)
2. ✅ `app/api/backend-proxy/[workspaceId]/[operation]/route.ts` — auth (session cookie OR `ndk_` demo token), ownership check, credit gating, CORS for preview/downloaded repos, forwards to sidecar (managed) or the user's URL (custom)
3. ✅ `backend_requests` table — in the migration
4. ✅ Credit deduction in proxy (per-op credits, 1 credit = 1000 tokens against the shared user_credits pool)
5. ⏳ Backend usage shown separately in the dashboard credits bar — NOT built yet
6. ✅ EXTRA (beyond original plan): workspace demo tokens (`backend_tokens` table, 30-day expiry, hashed, rotate from ConfigPanel) so downloaded repos and the cross-origin preview can authenticate; connection strings baked into ZIP `.env.local` and placeholder-documented in GitHub-pushed `.env.local.example` + project README

### Remaining to go live (operator steps — see backend-service/README.md)
1. Deploy `backend-service/` to Railway (root dir = `backend-service`, generate domain)
2. Railway env vars: `BACKEND_SHARED_SECRET` (openssl rand -hex 32), `NUTRIENT_LICENSE_KEY` (optional)
3. Vercel/.env.local: `BACKEND_SIDECAR_URL` + `BACKEND_SHARED_SECRET`
4. Run the migration once: `/api/migrate?secret=<MIGRATE_SECRET>` (creates backend_tokens, backend_requests, backend_credentials)
5. Verify `curl https://<railway-domain>/health`

### Later
- Implement `/ocr` `/extract` `/redact` `/watermark` in the sidecar when Nutrient publishes the Python SDK API reference for them
- Backend usage segment in the dashboard credits bar
- Node/Java/.NET engines in the same sidecar image (contract already supports it)

---

## What this is NOT

- Not a general-purpose cloud compute service — the managed backend only runs operations that correspond to Nutrient SDK capabilities
- Not a persistent file store — input and output files are ephemeral (request/response only); storing outputs is the user's responsibility
- Not a replacement for Document Engine — Document Engine is the right product for persistent annotations, collaboration, and server-side PDF state; this infra is for stateless processing demos only
