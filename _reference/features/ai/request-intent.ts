// Patterns that indicate a pure SDK/config request. Everything else that affects
// product UI, SDK behavior, workflow logic, or project architecture should be
// treated as repository-level software generation.
const CONFIG_ONLY_PATTERNS = [
  /^(enable|disable|toggle|turn on|turn off)\s+(annotations?|forms?|signatures?|search|thumbnails?|ocr|redaction|comparison|export|collaboration|ai\s*assistant)\s*$/i,
  /^(change|set)\s+(the\s+)?(primary|accent|background)\s+color\s+to\b/i,
  /^(switch to|use)\s+(dark|light)\s+mode\s*$/i,
  /^set\s+company\s+name\s+to\b/i,
];

const DESIGN_REQUEST_PATTERNS = [
  /\b(design|redesign|restyle|style|theme|palette|color|colour|font|typography|ui|visual|look|feel|polish|modernize|modernise)\b/i,
  /\b(make|looks?|feel)\b[\s\S]{0,40}\b(nice|better|modern|clean|premium|beautiful|professional|fresh|warm|dark|black)\b/i,
  /\b(warmish|warm\s*black|charcoal|rainbow|too many colors?|button color|accent color)\b/i,
];

export function requestsDesignChange(message: string): boolean {
  return DESIGN_REQUEST_PATTERNS.some((pattern) => pattern.test(message));
}

export function requiresRepositoryBuild(message: string): boolean {
  if (CONFIG_ONLY_PATTERNS.some((p) => p.test(message.trim()))) return false;

  const UI_PATTERNS = [
    /\b(navbar|nav\s*bar|navigation|header|top\s*bar|app\s*shell|layout|route|page|pages)\b/i,
    /\b(dashboard|homepage|home\s*page|landing\s*page|website|site|portal|app|software|product|platform|tool|saas|crm)\b/i,
    /\b(patient|patients|medical|healthcare|health|clinic|hospital|pharma)\b/i,
    /\b(legal|law|compliance|contract|invoice|finance|fintech|banking|insurance|loan|mortgage)\b/i,
    /\b(hr|human\s*resources|onboarding|employee|payroll|recruiting|hiring)\b/i,
    /\b(real\s*estate|property|listing|lease|rental)\b/i,
    /\b(construction|field\s*report|inspection|engineering|logistics|shipment|supply\s*chain)\b/i,
    /\b(education|school|student|learning|course|university)\b/i,
    /\b(government|public\s*sector|audit|regulatory)\b/i,
    /\b(button|popup|modal|tab|tabs|panel|sidebar|list|card|table|form|crud|filter)\b/i,
    /\b(approval|workflow|intake|claims|review\s*queue|pipeline|processing)\b/i,
    /\b(auth|login|signup|sign\s*in|sign\s*up|database|db|supabase|postgres|crud|persist|persistence|save\s+data|backend|api|server)\b/i,
    /\b(extraction|extract|ocr|icr|vision|python\s*sdk|document\s*processing|data\s*filter|filteration|filtering|smart\s*data)\b/i,
    /\b(viewer|web\s*sdk|sdk|zoom|toolbar|load|loading|document\s*engine|dws|nutrient)\b/i,
    /\b(design|redesign|rebrand|style|theme|look|feel|brand)\b/i,
    /\b(build|create|make|generate|add|show|give\s*me|i\s*want|i\s*need)\b/i,
    /\b(cool|nice|better|clean|modern|beautiful|polished|professional|custom|advanced)\b/i,
    /\b(random|industry|company|startup|enterprise|client)\b/i,
  ];

  return UI_PATTERNS.some((p) => p.test(message));
}

// Backward-compatible alias for older imports and tests.
export const requiresAppRewrite = requiresRepositoryBuild;

export function requiresMultiFileApp(message: string): boolean {
  const MULTI_PATTERNS = [
    /\b(dashboard|homepage|home\s*page|website|site|portal|landing\s*page|saas|crm)\b/i,
    /\b(random\s+(healthcare|medical|website|dashboard|app|company))\b/i,
    /\b(full|complete|production|client|advanced|real)\s+(app|software|product|platform|tool|system)\b/i,
    /\b(auth|database|db|supabase|backend|api|crud|persistence)\b/i,
    /\b(build|create|make|generate)\b[\s\S]*\b(app|software|product|platform|tool|dashboard|portal)\b/i,
    /\b(design|redesign)\b[\s\S]*\b(homepage|home\s*page|website|site|app|product)\b/i,
  ];
  return MULTI_PATTERNS.some((p) => p.test(message));
}

export function requiresFocusedRepositoryProject(message: string): boolean {
  return requiresRepositoryBuild(message) && !requiresMultiFileApp(message);
}

// Signals that the user wants a real app/product/dashboard, not just the viewer.
const APP_INTENT_PATTERNS = [
  /\b(app|application|product|platform|portal|dashboard|website|site|saas|crm|system)\b/i,
  /\b(home\s*page|homepage|landing\s*page|navbar|nav\s*bar|navigation|multi[-\s]?page|pages|sign[-\s]?in|sign[-\s]?up|login)\b/i,
  /\b(patient|healthcare|clinic|hospital|legal|law|finance|fintech|banking|insurance|loan|mortgage|hr|human\s*resources|real\s*estate|construction|logistics|education|government)\b/i,
];

// Signals a Nutrient viewer/SDK capability request (no surrounding product).
const VIEWER_FEATURE_PATTERNS = [
  /\b(viewer|view|open|load|render|display|preview)\b/i,
  /\b(pdf|docx|office|word|excel|image|png|jpe?g)\b/i,
  /\b(zoom|toolbar|sidebar|thumbnails?|pager|search)\b/i,
  /\b(annotations?|annotate|highlight|ink|note|comment|stamp)\b/i,
  /\b(forms?|fill|signatures?|sign|redact|redaction)\b/i,
  /\b(split|merge|combine|delete\s*pages?|remove\s*pages?|rotate|extract|export|print|download)\b/i,
  /\b(sdk|nutrient|web\s*sdk)\b/i,
];

export function requestsAppProduct(message: string): boolean {
  return requiresMultiFileApp(message) || APP_INTENT_PATTERNS.some((p) => p.test(message));
}

// A focused viewer/SDK feature change: edit the viewer + config only. Keep the
// full-screen Nutrient viewer — do NOT scaffold a dashboard/app around it.
export function requiresViewerOnlyChange(message: string): boolean {
  if (requestsAppProduct(message)) return false;
  return VIEWER_FEATURE_PATTERNS.some((p) => p.test(message));
}

export function requestsAnnotations(message: string): boolean {
  return /\b(annotation|annotations|annotate|markup|highlight|ink|note)\b/i.test(message);
}

function requestsCustomDrawToolbarButton(message: string): boolean {
  return (
    /\b(custom|button|toolbar|tool)\b/i.test(message) &&
    /\b(draw|drawing|ink|freehand|annotat(?:e|ion|ions))\b/i.test(message) &&
    /\b(viewer|toolbar|export|annotation|button)\b/i.test(message)
  );
}

function hasSourceArchitecture(paths: string[], strict = false): boolean {
  const hasRoot = paths.includes("src/App.tsx");
  const hasPageOrLayout = paths.some((path) => /^src\/(pages|layouts)\//.test(path));
  const hasComponent = paths.some((path) => path.startsWith("src/components/"));
  const hasStateOrLogic = paths.some((path) =>
    /^src\/(hooks|services|store|data|utils|lib|types)\//.test(path)
  );

  // Realistic multi-file app: must have root + components + (pages OR state/data).
  // We used to require pages AND components AND state — too strict; perfectly valid
  // apps can put pages-as-components or logic-in-pages and still be a real app.
  return strict
    ? hasRoot && hasComponent && (hasPageOrLayout || hasStateOrLogic)
    : hasRoot && (hasComponent || hasPageOrLayout || hasStateOrLogic);
}

export function isIncompleteRepositoryBuild(userText: string, changedPaths: string[]): boolean {
  // Focused viewer change: complete as long as the viewer surface or config moved.
  if (requiresViewerOnlyChange(userText)) {
    return (
      !changedPaths.includes("src/App.tsx") &&
      !changedPaths.includes("src/NutrientViewer.tsx") &&
      !changedPaths.some((p) => p.startsWith("config/"))
    );
  }
  if (!requiresRepositoryBuild(userText)) return false;
  if (!changedPaths.includes("src/App.tsx")) return true;
  if (requiresMultiFileApp(userText) && !hasSourceArchitecture(changedPaths, true)) return true;
  if (requiresFocusedRepositoryProject(userText) && !hasSourceArchitecture(changedPaths, false)) return true;
  return false;
}

// Backward-compatible alias for older imports and tests.
export const isIncompleteAppRewrite = isIncompleteRepositoryBuild;

// Returns true when the user is asking to throw away the current project and start fresh.
// Used to gate the full plan→design→build pipeline on existing projects.
export function isRebuildRequest(message: string): boolean {
  return /\b(rebuild|restart|start\s+over|start\s+fresh|from\s+scratch|completely\s+(redo|rebuild|new|rewrite)|replace\s+(the\s+)?(whole|entire)|scrap|throw\s+away|reset\s+(the\s+)?(whole|all|app|project))\b/i.test(message);
}

export function buildRequestSpecificInstruction(message: string): string {
  const instructions: string[] = [];

  // Focused viewer/SDK feature: keep it a full-screen Nutrient viewer. Do NOT
  // build a dashboard/app/pages around it.
  if (requiresViewerOnlyChange(message)) {
    instructions.push(`## FOCUSED VIEWER CHANGE — DO NOT BUILD AN APP

The user is asking for a Nutrient Web SDK viewer capability, not a full product. Keep the current full-screen viewer layout.

- Edit \`src/App.tsx\` (the viewer surface) and \`src/NutrientViewer.tsx\` ONLY if the SDK \`load()\` call itself must change.
- Do NOT add navbars, home pages, dashboards, sidebars, metrics, workflow panels, activity logs, routing, or multi-page chrome.
- Do NOT scaffold \`src/pages/\`, \`src/layouts/\`, \`src/services/\`, \`src/store/\`, or \`src/data/\` for this.
- Implement the requested capability with the real Nutrient SDK (toolbar items, annotations, forms, signatures, redaction, search, page operations, export, etc.) via the existing \`src/NutrientViewer.tsx\` wrapper (\`window.NutrientViewer\` from the CDN — never the npm package).
- Keep the viewer mount parent at full height.`);

    if (requestsAnnotations(message)) {
      instructions.push(`## ANNOTATION FEATURE REQUIRED

Add annotation toolbar items (\`highlighter\`, \`ink\`, \`note\`, \`text-highlighter\`) to the \`toolbarItems\` prop on \`<NutrientViewer>\` in the relevant component unless they are already present.`);
      instructions.push(`Use the exact toolbar item \`{ type: "highlighter" }\`; \`{ type: "highlight" }\` is invalid and crashes Nutrient Web SDK.`);
    }
    if (requestsCustomDrawToolbarButton(message)) {
      instructions.push(`## CUSTOM DRAW TOOLBAR BUTTON REQUIRED

- Do not invent a toolbar item type like \`"draw"\`; Nutrient's built-in freehand drawing tool is \`{ type: "ink" }\`.
- If the user explicitly asked for a custom Draw button, add \`{ type: "custom", id: "draw-ink", title: "Draw", onPress: ... }\` next to \`export-pdf\`.
- The custom button must activate freehand drawing with the loaded viewer instance: \`instance.setViewState((viewState) => viewState.set("interactionMode", NutrientViewer.InteractionMode.INK))\`.
- Keep \`viewerReady\` state in the parent/component. Set it true only in \`onInstanceReady(instance, NutrientViewer)\`; clear refs and set it false in \`onInstanceUnload()\`.
- If the current \`src/NutrientViewer.tsx\` wrapper does not expose both lifecycle callbacks, update it to accept \`onInstanceReady(instance, NutrientViewer)\` and \`onInstanceUnload()\`.
- External Draw buttons must be disabled until \`viewerReady\` is true. Custom toolbar-item \`onPress\` handlers must guard with a ref, e.g. \`if (!viewerReadyRef.current || !instance || !NutrientViewer) return;\`, so the handler still works after React re-renders.
- Do not call \`instance.create()\`, \`instance.getAnnotations()\`, \`instance.exportPDF()\`, \`instance.setToolbarItems()\`, or \`instance.setViewState()\` during render or before the document has loaded.`);
    }
    if (requestsDesignChange(message)) {
      instructions.push(`## VISUAL DESIGN REQUEST — CSS CHANGE REQUIRED

- The user asked for visual design/theme/style/color changes. Include an updated \`src/index.css\`; a JSX-only response is incomplete.
- Implement color, mood, font, and contrast in \`:root\` and \`[data-theme="dark"]\` tokens, then keep components referencing those tokens.
- If the user asks for dark/black/warmish black, use a disciplined warm charcoal foundation plus one restrained accent family. Avoid rainbow palettes and random per-button colors.`);
    }
    return instructions.join("\n\n");
  }

  if (requiresRepositoryBuild(message)) {
    instructions.push(`## CRITICAL: THIS REQUEST REQUIRES REPOSITORY-LEVEL SOFTWARE GENERATION

The user is asking for product behavior, SDK behavior, UI, workflow, document processing, or project architecture. You are not a template patcher. You own the generated repository for this request.

You MUST update source files. Config-only patches are INVALID unless the user explicitly requested only a config toggle.

Repository rules:
- Choose the right scope: standalone SDK demo, focused workflow, full app/product, backend/pipeline, or targeted fix.
- Treat the project plan, current \`NUTRIENTWEBBUILDER.md\`, and user design wording as source-of-truth. Do not discard the planned layout, palette, architecture scope, state model, routing model, or file strategy while coding.
- Design like a senior product designer: use a disciplined two-color palette (neutral foundation + one accent family), clear visual hierarchy, polished interactive states, and a workflow-specific shell. Do not add random extra accents, gradients, or generic template chrome.
- Do not use a blue/cyan default palette. Avoid \`#4f8cff\`, \`#38bdf8\`, \`#0ea5e9\`, \`#2563eb\`, and \`#3b82f6\` unless the user explicitly asked for blue/cyan or the existing brand already uses it for a small change.
- Set \`src/index.css\` design tokens and the \`/* nutrient-preview */\` \`accentColor\` from the planned/user palette, not from old defaults.
- Treat \`src/App.tsx\` as root wiring. For full products keep it thin; for focused demos keep it clean and small.
- Create or update a real file tree under \`src/pages/\`, \`src/layouts/\`, \`src/components/\`, \`src/hooks/\`, \`src/services/\`, \`src/store/\`, \`src/data/\`, \`src/utils/\`, \`src/lib/\`, \`src/types/\`, \`backend/\`, or \`scripts/\` as needed.
- Read the provided project files and existing \`NUTRIENTWEBBUILDER.md\` context first. Extend the existing architecture when possible; refactor deliberately when the current structure blocks a real product.
- Build the requested product first: industry model, branding, navigation, pages, records, forms, actions, and business workflow.
- Then integrate Nutrient where documents create value: approval review, contract redaction, onboarding forms/signatures, invoice OCR, compliance audit, report export, evidence review, or similar.
- Pick the correct Nutrient capability for the workflow: viewer/review, annotations, redaction, forms, signatures, OCR/extraction, AI document assistant, document comparison, audit export, or report generation.
- Do not force Nutrient onto every screen. It is a workflow layer, not the entire product.
- Use real React state, localStorage, hooks, services, and local data modules so every visible interaction works.
- If the user asks for auth, database, Supabase, backend/API, CRUD, or persistence, create the needed client/service/store/API files and wire visible actions through them. Use a local fallback so the browser preview still works without external credentials.
- Every navbar link, CTA, button, tab, modal, form, row selection, approval action, upload interaction, and filter must do something real.
- Use \`<NutrientViewer />\` only for actual browser document/PDF surfaces. Never create a fake PDF viewer or disconnected processing card.
- For Python SDK, extraction, OCR, Vision API, Document Processing, or server-side requests, create backend/script/service files plus a runnable frontend workflow that honestly simulates the processing states and shows setup docs.
- For Web SDK behavior changes such as zoom, toolbar, load speed, annotations, forms, redaction, comparison, or signatures, follow the Nutrient docs context and update the wrapper/component/config precisely.
- Keep every Nutrient viewer parent height explicit, such as \`height: "560px"\` or a flex child inside a fixed-height panel.
- Add a \`/* nutrient-preview ... */\` JSON comment near the top of \`src/App.tsx\` with \`"mode": "app"\`, appName, navigation, metrics, records, workflow, viewer placement, and actions so Studio can preview the app.
- Add or update \`NUTRIENTWEBBUILDER.md\` in the generated project with the app architecture, routes/pages, state model, services, Nutrient integration point, and validation notes. This file is mandatory in every repository-level response.
- Before responding, check whether the app would actually work if deployed. If not, keep generating files and fixes.

Do NOT respond with only \`config/*.json\` for this request.`);
  }

  if (requestsDesignChange(message)) {
    instructions.push(`## VISUAL DESIGN REQUEST — CSS CHANGE REQUIRED

- The user asked for visual design/theme/style/color changes. Include an updated \`src/index.css\`; a JSX-only response is incomplete.
- Implement color, mood, font, and contrast in \`:root\` and \`[data-theme="dark"]\` tokens, then keep components referencing those tokens.
- If the user asks for dark/black/warmish black, use a disciplined warm charcoal foundation plus one restrained accent family. Avoid rainbow palettes and random per-button colors.`);
  }

  if (requiresMultiFileApp(message)) {
    instructions.push(`## MANDATORY MULTI-FILE APP ARCHITECTURE

This must be a real componentized repository, not a single-file UI:
- Follow the planned architecture before creating files. If the plan says operations/split/workspace/approval/sidebar, implement that shape exactly.
- \`src/App.tsx\` — root state/routing composition only.
- \`src/layouts/\` — app shell, sidebar/topbar, page frame.
- \`src/pages/\` — Home/Dashboard/domain workflow/document workflow/settings or audit pages.
- \`src/components/\` — reusable tables, cards, panels, modals, forms, viewer shells.
- \`src/hooks/\` — shared local state, localStorage persistence, workflow orchestration.
- \`src/services/\` — local async business logic for CRUD/status transitions/document processing simulations.
- \`src/store/\` — shared store if state crosses multiple workflows.
- \`src/data/\` — realistic seed records, users, documents, audit events, metrics.
- \`src/types/\` — business object and workflow types.
- \`src/utils/\` or \`src/lib/\` — formatting, validation, derived metrics where helpful.

The generated app must include working navigation across pages, working actions, state updates, and a natural Nutrient document workflow embedded in the product.`);
  } else if (requiresFocusedRepositoryProject(message)) {
    instructions.push(`## FOCUSED NUTRIENT PROJECT MODE

This does not need to become a generic full SaaS app unless the user asked for that. Build the focused project completely:
- Use the smallest coherent file tree that works.
- Include source files for UI, services, data, types, and backend/scripts when relevant.
- Keep every visible control functional.
- Keep Nutrient integrated by default using the current docs-backed SDK path.
- Update \`NUTRIENTWEBBUILDER.md\` with the project shape and latest change.`);
  }

  if (requestsAnnotations(message)) {
    instructions.push(`## ANNOTATION FEATURE REQUIRED

Add annotation tools to the actual \`<NutrientViewer toolbarItems={...}>\` source code. Config-only patches are not enough. If config files already exist, keep them in sync, but the viewer component/page must expose the requested toolbar behavior. Use \`{ type: "highlighter" }\`, never \`{ type: "highlight" }\`.`);
  }

  if (requestsCustomDrawToolbarButton(message)) {
    instructions.push(`## CUSTOM DRAW TOOLBAR BUTTON REQUIRED

- Do not invent a toolbar item type like \`"draw"\`; Nutrient's built-in freehand drawing tool is \`{ type: "ink" }\`.
- If the user explicitly asked for a custom Draw button, add \`{ type: "custom", id: "draw-ink", title: "Draw", onPress: ... }\` next to \`export-pdf\`.
- The custom button must activate freehand drawing with the loaded viewer instance: \`instance.setViewState((viewState) => viewState.set("interactionMode", NutrientViewer.InteractionMode.INK))\`.
- Keep \`viewerReady\` state in the parent/component. Set it true only in \`onInstanceReady(instance, NutrientViewer)\`; clear refs and set it false in \`onInstanceUnload()\`.
- If the current \`src/NutrientViewer.tsx\` wrapper does not expose both lifecycle callbacks, update it to accept \`onInstanceReady(instance, NutrientViewer)\` and \`onInstanceUnload()\`.
- External Draw buttons must be disabled until \`viewerReady\` is true. Custom toolbar-item \`onPress\` handlers must guard with a ref, e.g. \`if (!viewerReadyRef.current || !instance || !NutrientViewer) return;\`, so the handler still works after React re-renders.
- Do not call \`instance.create()\`, \`instance.getAnnotations()\`, \`instance.exportPDF()\`, \`instance.setToolbarItems()\`, or \`instance.setViewState()\` during render or before the document has loaded.`);
  }

  return instructions.join("\n\n");
}
