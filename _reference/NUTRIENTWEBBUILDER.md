# Nutrient Web Builder Project Memory

## Purpose

This repository is Nutrient Demo Studio: an AI-powered all-rounder builder that creates real Nutrient-centered projects. It can build focused Web SDK demos, workflow tools, full Vite/React products, backend/Python extraction pipelines, document assistants, form approval systems, and targeted SDK fixes.

The builder must not behave like a config editor, template patcher, static dashboard generator, or single-file UI patcher. It must behave like an autonomous repository engineer, choosing the right project shape for the user's request.

## Core Product Philosophy

Generated applications must be product-first.

1. Build the real project requested by the user: SDK demo, workflow, branding, industry model, pages, navigation, state, forms, actions, backend scripts, data, and business logic as needed.
2. Then identify where documents create business value.
3. Integrate Nutrient naturally in that document workflow.

Nutrient is a business workflow layer, not the whole application.

The builder should choose the correct Nutrient capability for the business workflow, not always a dashboard plus viewer.

Good placements:
- Approval workflow: PDF review, signature, audit export.
- Legal workflow: contract review, annotations, redaction, comparison.
- Healthcare portal: chart packets, consent forms, signed intake PDFs.
- Logistics app: bill of lading, customs documents, inspection evidence.
- Finance app: loan packets, invoice extraction, report exports.
- HR app: onboarding forms, signatures, policy acknowledgements.
- Compliance app: evidence review, annotations, audit trail exports.

Bad placements:
- PDF viewer pasted onto every page.
- Home page as a document viewer when the user asked for a full product.
- Fake document cards with no real Nutrient viewer.
- Static dashboard metrics that are not connected to workflow state.

## Nutrient Capability Matrix

Use the capability that matches the product workflow:

- Viewer/review: embedded `NutrientViewer`, thumbnails, search, bookmarks, selected record context.
- Annotation/collaboration: highlights, ink, notes, review assignment, activity/audit trail.
- Redaction: sensitive data workflow, redaction status, clean-copy export action.
- Forms/signatures: form fill or creator workflows, signature capture state, signer status.
- OCR/extraction: upload metadata, processing queue, extracted fields, confidence scores, validation.
- AI document assistant: chat/question panel, selected document context, cited snippets, source PDF side-by-side.
- Document comparison: version selector, changed sections, comparison status, approval actions.
- Export/reporting: generated report records, PDF export status, audit-ready package state.

If a capability would need a production backend, the generated app should still be honest and functional locally: create service interfaces, local async simulations, loading/error/success states, validated forms, record updates, and audit events.

## Repository Agent Contract

The AI owns the generated repository for each app request.

It must be context-aware:
- Read the provided project files before editing.
- Read the current workspace `NUTRIENTWEBBUILDER.md` before editing.
- Reuse existing layouts, pages, components, hooks, services, stores, data, types, and CSS variables when they fit.
- Extend the current architecture instead of creating parallel disconnected structures.
- Refactor intentionally when the existing structure prevents a real working product.
- Keep imports, routing/page switching, state, and project memory in sync.
- Update `NUTRIENTWEBBUILDER.md` in every file-changing patch response with the latest architecture and change summary.

It has authority to:
- Create files.
- Delete files.
- Rename files.
- Refactor structure.
- Split components.
- Create layouts.
- Create pages.
- Create hooks.
- Create services.
- Create stores.
- Create data modules.
- Create utilities.
- Create types.
- Fix broken imports.
- Iterate until the app would work if deployed.

Do not stay trapped inside `src/App.tsx`. `src/App.tsx` should be thin root composition and page state/routing only.

## Required Generated App Structure

For full app requests, prefer this structure:

```text
src/
  App.tsx
  index.css
  NutrientViewer.tsx
  layouts/
    AppLayout.tsx
  pages/
    HomePage.tsx
    DashboardPage.tsx
    DomainPage.tsx
    DocumentWorkflowPage.tsx
    SettingsPage.tsx
  components/
    RecordTable.tsx
    RecordDetails.tsx
    DocumentWorkspace.tsx
    WorkflowActions.tsx
    StatusBadge.tsx
  hooks/
    useWorkflowState.ts
  services/
    workflowService.ts
  store/
    workflowStore.ts
  data/
    mockData.ts
  types/
    workflow.ts
  utils/
    formatters.ts
NUTRIENTWEBBUILDER.md
```

Use only the folders needed by the product, but full app requests should normally include pages, layouts, components, hooks, services, data, types, and project memory.

For focused SDK demos or workflow tools, use the smallest coherent tree that still works. For Python SDK, Vision API, data extraction, OCR, or document-processing requests, include backend/scripts/service files and setup notes, while keeping the browser preview runnable with honest local simulation state.

## Functional Requirements

Everything visible must work.

- Navbar links must switch pages.
- CTAs must navigate, open modals, submit forms, or update state.
- Forms must validate and submit.
- Tables and lists must support selection or filtering when shown.
- Workflow actions must update status, activity, audit trail, or local state.
- Upload controls must store file metadata in state even when the sample PDF URL is used for the viewer.
- Modals and drawers must open and close.
- Document review actions must open or update the Nutrient workflow.
- Dashboard metrics must come from realistic data or derived state.

Never generate:
- Dead buttons.
- Placeholder pages.
- Fake CRUD.
- Screenshot-like static UIs.
- Giant static JSON layouts.
- Config-only responses for product requests.

## Nutrient Integration Rules

When a generated app needs a PDF/document viewer, always use the real wrapper:

```tsx
import { NutrientViewer } from "./NutrientViewer";
```

or from nested folders:

```tsx
import { NutrientViewer } from "../NutrientViewer";
```

The viewer parent must have an explicit height or a fixed-height flex container.

Generated apps use `@nutrient-sdk/viewer` through the local `src/NutrientViewer.tsx` wrapper. Do not import the SDK directly in generated app code. Do not create a dummy PDF viewer.

## AI Prompt System

Important files:

- `features/ai/prompts.ts`: Builds the main system prompt that tells the model how to generate the right Nutrient project shape for each request.
- `features/ai/nutrient-docs-context.ts`: Provides authoritative Nutrient documentation context, current SDK package/version, official docs URLs, and integration rules for every AI chat request.
- `features/ai/request-intent.ts`: Detects repository-level app requests and injects request-specific instructions.
- `features/ai/fallback-preview.ts`: Creates a local multi-file fallback app if the model returns incomplete patches.
- `components/workspace/ChatPanel.tsx`: Sends chat requests, displays live generation progress, retries incomplete builds, and applies file patches.
- `components/workspace/LiveViewer.tsx`: Runs the actual generated app from project files through Sandpack. It must not render a static metadata/config preview for the main workspace preview.
- `components/workspace/SandpackPreview.tsx`: Builds the runnable preview file map and injects a real `@nutrient-sdk/viewer` runtime wrapper for `src/NutrientViewer.tsx` so Sandpack uses the actual SDK with CDN-loaded assets, not a fake PDF UI.
- `app/api/ai/chat/route.ts`: Reads this memory file and sends the system prompt to the AI model.
- `features/workspaces/store.ts`: Applies changes/deletes/renames to project files and syncs workspace config.

The server reads this file on every AI request and appends it to the system prompt. Keep it current when the builder philosophy or architecture changes.

Workspace memory is also spoon-fed separately:
- `app/api/ai/chat/route.ts` extracts `NUTRIENTWEBBUILDER.md` from the active workspace files.
- That workspace memory is inserted into the system prompt under a dedicated "CURRENT WORKSPACE NUTRIENTWEBBUILDER.md" section before the generated app prompt.
- If no workspace memory exists yet, the system prompt explicitly tells the model to create it in the same response when project files change.
- `features/ai/prompts.ts` and `features/ai/request-intent.ts` both tell the model that omitting `NUTRIENTWEBBUILDER.md` from a repository-level response is incomplete.
- `components/workspace/ChatPanel.tsx` adds a final client-side guard: when a patch plan changes files but omits `NUTRIENTWEBBUILDER.md`, it appends a memory update that records the user request, plan, touched files, and future-edit requirements.

Nutrient documentation context is also spoon-fed on every AI request:
- `app/api/ai/chat/route.ts` injects `buildNutrientDocsContext()` into the system prompt before the generated app prompt.
- The docs context pins the current Web SDK package/version, official setup/API/workflow docs links, CDN loading rule, explicit viewer sizing rule, and no-fake-viewer rule.
- The docs context also pins official Nutrient MCP packages for agent/backend workflows: `@nutrient-sdk/document-engine-mcp-server` and `@nutrient-sdk/dws-mcp-server`. Generated browser apps must use service adapters and local simulations unless real credentials/backend wiring are present.
- The live task UI should show that Nutrient docs context is being read for repository-level generation requests.

## Nucode Model Tiers

Full documentation lives in `nucode.md` ("Model tiers" section) — that file is the main Nucode doc. Summary: users pick a Nucode model per workspace (chat panel Model dropdown) for the build/deep phases — Nucode Spark (Low, Haiku 4.5), Nucode Flow (Medium, Sonnet 4.6, default), Nucode Forge (High, Opus 4.8), Nucode Apex (Max, Fable 5). Plan/design/classify/ask always run on Spark. Single source of truth: `features/ai/model-registry.ts`. Usage is logged per resolved model in `token_usage`; the admin Pipelines page shows the tier → model mapping.

## Repository Intelligence Layer

The builder now constructs a local repository intelligence context before asking the model to plan, build, QA, or fix runtime errors.

Important file:
- `features/ai/repository-intelligence.ts`: Browser-safe analyzer for generated project files. It classifies file roles, builds the local import graph, extracts exports/symbols/domain tokens/CSS classes, detects Nutrient capabilities, ranks request-relevant files, summarizes architecture, and records Nutrient MCP boundaries.

This context is injected into:
- Planning prompts, so the roadmap extends the existing architecture.
- Build prompts, so generation sees the current file graph and product shape before writing patches.
- SDK-focused prompts, so Nutrient changes touch the wrapper, mounts, state, and affected product files.
- Runtime investigation/planning/fix/review prompts, so crash repair sees the stack, recent changes, import neighbors, data contracts, and true source files.
- Generated-code QA prompts, so pre-apply review understands the merged candidate repository, not just isolated patches.

The local quality gate remains deterministic:
- It validates import/export resolution, missing CSS classes, blocked SDK imports, truncated files, unsafe array state, and unguarded array receivers before applying code.
- It can skip expensive model QA only when there are no fatal issues and no first-render-risk warnings.
- Runtime fixes still use investigator -> planner -> coder -> reviewer because those need root-cause confidence, not just regex patching.

## Network Resilience

AI chat requests can fail because of temporary network/API issues. The chat client should retry transient failures before surfacing an error to the user.

Current behavior in `components/workspace/ChatPanel.tsx`:
- Retries up to three attempts for transient statuses: 408, 409, 425, 429, 500, 502, 503, and 504.
- Retries common fetch/stream/network errors such as failed fetch, timeout, aborted, terminated, connection reset, and connection lost.
- Shows a live retry state in the generation task panel so the user can see the system is still working.
- Does not retry non-transient validation/auth/configuration errors.

## Source-First Preview And Context

The workspace is an all-rounder Nutrient project builder. The source tree is the product surface.

- The main workspace preview must run `src/App.tsx` and the generated source files through `SandpackLivePreview`.
- `GeneratedAppPreview` is metadata/config fallback UI for share surfaces only, not the main builder preview.
- The chat live activity should display source files and project memory first: `NUTRIENTWEBBUILDER.md`, `src/App.tsx`, `src/index.css`, layouts, pages, components, hooks, services, store, data, types, utils, and package/root files.
- `config/*.json` files are SDK settings and should only be shown as primary context for explicit config-only requests.
- The AI system prompt should order project context source-first and config-last so the model extends the actual repository instead of patching old config/demo JSON.

## Live Task System

The user should see the AI working like a repository agent.

The chat UI should show:
- Planning architecture.
- Reading project files.
- Creating app shell.
- Creating layouts and routes.
- Creating pages and components.
- Wiring data and interactions.
- Adding types and utilities.
- Integrating Nutrient workflow.
- Finalizing design system.
- Updating SDK configuration.
- Writing project memory.

Streaming file paths should include files under:
- `src/pages/`
- `src/layouts/`
- `src/components/`
- `src/hooks/`
- `src/services/`
- `src/store/`
- `src/data/`
- `src/types/`
- `src/utils/`
- `src/lib/`
- `NUTRIENTWEBBUILDER.md`

## Validation Checklist

Before finishing a generated app, the AI should verify:

- The app has a clear product purpose and brand.
- The home/entry page is not just a viewer.
- The dashboard shows product-level workflow state, not random metrics.
- The domain page manages real business objects.
- The Nutrient viewer appears where documents naturally belong.
- Every navigation item renders a real page.
- Every button has a real handler.
- Every form has validation and submit behavior.
- Imports match files included in the patch plan.
- `src/App.tsx` is thin and does not contain the whole product.
- `NUTRIENTWEBBUILDER.md` describes the generated app for future edits.
- File-changing responses include `NUTRIENTWEBBUILDER.md` in the patch plan.

## Design Philosophy — Light First, Unique Per App

Every generated app must look and feel different. Design the palette, layout, and typography to match the specific industry and brand — not a reused template.

**Light theme is the primary experience.** `:root` defines light colors. `[data-theme="dark"]` is the secondary option. Always ship both and include a working toggle.

### Palette construction rules
- **Background**: slightly off-white (`#f8fafc`, `#fafafa`, `#f9f7f4`) — never pure `#ffffff`
- **Surface (cards)**: white or very light — appears elevated above the background
- **Borders**: low-opacity black on light (`rgba(0,0,0,0.08–0.12)`), low-opacity white on dark (`rgba(255,255,255,0.08–0.12)`)
- **Text**: near-black with a hint of hue (`#0f172a`, `#111827`) — never pure black
- **Accent**: one color, used only on the primary action and active state — not spread everywhere
- **Dark bg**: dark but not black — `#0f172a`, `#0d1117`, `#111118` — slight hue always

### Industry accent starting points
| Industry | Light accent | Dark accent |
|---|---|---|
| Healthcare | `#0891b2` | `#22d3ee` |
| Legal | `#6d28d9` | `#a78bfa` |
| Finance | `#047857` | `#34d399` |
| Construction / ops | `#c2410c` | `#fb923c` |
| HR / onboarding | `#4338ca` | `#818cf8` |
| Real estate | `#0369a1` | `#38bdf8` |
| Insurance | `#b45309` | `#fbbf24` |
| Logistics | `#1d4ed8` | `#60a5fa` |
| General tech | `#2563eb` | `#3b82f6` |

### Spacing — 8px scale
`4, 8, 12, 16, 24, 32, 48, 64px`. Card padding 20–24px. Section gaps 32–48px. Never cram.

### Typography
Pick a font pairing that fits the brand. Load via Google Fonts `@import`. Set a real scale: heading (18–24px 600–700), body (14–15px 400–500), caption (11–12px 500). Generous line-height (1.5 body, 1.2 headings).

### Polish
- Consistent `border-radius` (8, 10, or 12px — pick one)
- `transition: all 150ms ease` on every interactive element
- Soft shadows per elevation level
- Hover state on every clickable element

Avoid: flashy gradients, neon-on-neon, accent used everywhere, cramped spacing, same layout/palette for every app, more than 2 font families.

## Latest AI Change

- Request: Make the default/template state feel like a modern latest Nutrient Web SDK build instead of an empty viewer.
- Changes: Rebuilt the seeded `src/App.tsx` and `src/index.css` in `lib/project-files/base-template.ts` into a polished default Web SDK workspace with document selection, workflow progress, feature chips, review notes, activity log, viewer refresh, explicit viewer sizing, and the real `src/NutrientViewer.tsx` wrapper using the current SDK package. Added a safe upgrade path for old default starter shells and minimal starter CSS without overwriting user-built apps.
- Requirement: New workspaces, templates, and old untouched starter shells should open with a useful modern Nutrient viewer experience by default, while still letting the AI replace it with the correct project shape for the user's request.

## Latest AI Change

- Request: Make the builder an all-rounder that can build any Nutrient project shape while keeping Web SDK v1.15.0 integrated by default.
- Changes: Simplified the AI prompt philosophy around a scope ladder, expanded docs context with Web/Python/extraction links, updated request intent so focused SDK/workflow/Python requests do not get forced into full-dashboard architecture, refreshed quick prompts, and reinforced that default Web SDK projects use `@nutrient-sdk/viewer@1.15.0` through the real wrapper.
- Requirement: Future AI behavior must choose the architecture the user asked for: focused SDK demo, workflow tool, full product, backend/Python extraction pipeline, document assistant, form approval system, or targeted SDK fix. Do not always generate a full app, and do not output config-only patches for repository work.

## Latest AI Change

- Request: Keep the latest Nutrient Web SDK installed and fast to use in both new projects and custom-template projects.
- Changes: Added centralized SDK constants in `lib/nutrient/sdk-version.ts`, wired new generated projects to use that package/version, added an SDK upgrade pass for loaded workspaces, API file saves/deletes, saved files, saved configs, saved custom templates, and custom-template copies, and made the Sandpack dependency map enforce the current Nutrient package while removing legacy `pspdfkit`.
- Requirement: New workspaces, custom template saves, and custom template clones must preserve `@nutrient-sdk/viewer` at the current pinned version and the real local `src/NutrientViewer.tsx` wrapper with `useCDN: true`; do not copy stale SDK asset scripts or dummy viewers forward.

## Latest AI Change

- Request: Harden network errors and ensure `NUTRIENTWEBBUILDER.md` is updated and spoon-fed for every prompt/change.
- Changes: Added transient AI request retry behavior in `components/workspace/ChatPanel.tsx`, dedicated workspace memory injection in `app/api/ai/chat/route.ts`, stricter prompt rules in `features/ai/prompts.ts`, stricter repository completeness checks in `features/ai/request-intent.ts`, and this memory update.
- Requirement: Future platform changes must keep the server prompt, client patch guard, request intent checks, and this memory document aligned.

## Latest AI Change

- Request: Stop the workspace from feeling like old static/config-driven viewer output and reinforce the source-first builder principle.
- Changes: Switched `components/workspace/LiveViewer.tsx` to render the runnable generated app via `SandpackLivePreview`, changed chat "Reading files" activity to source-first context, changed `features/ai/prompts.ts` project-file ordering to put memory/source architecture before `config/*.json`, and relabeled `components/workspace/PromptManager.tsx` around source-first product prompts instead of config-first feature thinking.
- Requirement: Do not make the main builder preview depend on `config/preview.json` or static metadata. Project files under `src/` are the source of truth for the generated app experience.

## Latest AI Change

- Request: Remove the fake/dummy Web SDK viewer and migrate to the latest Nutrient Web SDK package.
- Changes: Migrated the platform and generated app templates from deprecated `pspdfkit` to `@nutrient-sdk/viewer@1.15.0`, changed both the Next viewer and Sandpack runtime viewer to load the real SDK with `useCDN: true`, removed the old local asset-copy script/build dependency, updated SDK prompts/docs/templates to the current package and demo document URL, and kept legacy generated projects previewable by mapping their viewer wrapper to the real Nutrient runtime.
- Requirement: Never render a fake PDF UI as the main SDK viewer. Sandpack may inject the real `@nutrient-sdk/viewer` wrapper for compatibility, but document surfaces must use the actual SDK.

## Latest AI Change

- Request: Make the AI documentation-aware for Nutrient and improve the builder UX so it no longer feels like a stale demo sandbox.
- Changes: Added `features/ai/nutrient-docs-context.ts`, injected that context into every AI chat system prompt, updated chat live activity to show docs/source context, redesigned `components/workspace/PromptManager.tsx` with current SDK/docs/runtime cards, and reinforced in the main prompt that the model must follow the docs context instead of stale SDK assumptions.
- Requirement: Future AI changes must keep the docs context current with official Nutrient docs and the installed `@nutrient-sdk/viewer` version.

## Latest AI Change

- Request: Diagnose empty preview console output and repeated generated-app crashes such as `Cannot read properties of undefined (reading 'map')`.
- Changes: Seeded the custom Sandpack console panel from the always-on runtime error store so errors captured before the panel opens are visible, improved console value formatting for Error objects, and expanded generated-code null-guard sanitization for deeper chained arrays and keyed buckets such as `dealsByStage[stage].map(...)`.
- Requirement: Runtime error badges and console rows must stay in sync. Generated app patches must defensively guard array method receivers before they reach Sandpack, especially workflow/CRM grouped data structures.

## Latest AI Change

- Request: Make the agent context-aware and stop direct regex-style runtime patching, especially for first-build crashes.
- Changes: Added runtime bug dossiers with stack frame, failing expression, related files, and recent changes; added staged `error-investigate`, `error-plan`, `error-fix`, and `error-review` API modes; added a pre-apply `qa` mode for generated files; and wired full-build/continuation/post-build crash handling through QA or investigator/planner/reviewer gates before applying patches.
- Requirement: Runtime fixes must investigate and plan before editing, then review the candidate patch. Full app generation must run a first-render safety QA pass before files are applied to Sandpack.

## Latest AI Change

- Request: Add local engineering systems so the agent does not spend AI calls on failures deterministic checks can catch.
- Changes: Added a repository quality gate in `features/ai/validators.ts` that applies candidate patches in memory, validates imports/exports, blocked SDK imports, truncated files, unsafe collection state, unguarded array receivers, missing custom CSS classes, and emits a confidence score. Wired `components/workspace/ChatPanel.tsx` so high-confidence generated patches skip model QA, low-confidence patches send the deterministic report to QA/reviewer, and fatal issues block application if unresolved.
- Requirement: Before Sandpack sees generated code, the local quality gate should run first. AI QA is now a repair/escalation layer, not the primary validator.

## Latest AI Change

- Request: Add Phase 1 of backend project infrastructure to support server-side SDK builds (Python, Node.js, Java, .NET).
- Changes: Added `BackendConfig` interface and `backend?: BackendConfig | null` field to `WorkspaceConfig` in `types/index.ts`. Updated skill contexts for `nutrient-python-sdk`, `nutrient-nodejs-server-sdk`, `nutrient-java-server-sdk`, and `nutrient-dotnet-server-sdk` in `features/ai/skill-modes.ts` to include the Nucode backend contract pattern (standard REST endpoints, env-var-only secrets, `VITE_BACKEND_URL` reference, simulation fallback requirement). Expanded backend pipeline instructions in `features/ai/prompts.ts` with the full six-rule Nucode backend contract. Created `BACKEND_INFRA.md` as the architecture design document.
- Requirement: When the AI generates a server-side SDK build (Python, Node, Java, .NET), it must produce: (1) a `backend/` folder with the implementation file and dependency file; (2) a simulation fallback in the React frontend that works without a backend running; (3) a `VITE_BACKEND_URL`-based service constant in React code — never a hardcoded URL or key; (4) a Backend Setup section in `NUTRIENTWEBBUILDER.md`. The migration path from Nucode managed backend to user's own backend must require zero React code changes.
