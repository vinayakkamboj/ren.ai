import {
  NUTRIENT_CDN_BASE_URL,
  NUTRIENT_CDN_SCRIPT_URL,
  NUTRIENT_WEB_DEMO_DOCUMENT_URL,
  NUTRIENT_WEB_SDK_VERSION,
} from "@/lib/nutrient/sdk-version";
import { NUCODE_KNOWLEDGE_SOURCES } from "@/features/ai/nucode-knowledge-sources";

export const CURRENT_NUTRIENT_WEB_SDK_VERSION = NUTRIENT_WEB_SDK_VERSION;

function formatKnowledgeSourceLinks(): string {
  return NUCODE_KNOWLEDGE_SOURCES
    .map((source) => `- ${source.priority.toUpperCase()} [${source.category}] ${source.title}: ${source.url}`)
    .join("\n");
}

export function buildNutrientDocsContext(): string {
  return `## NUTRIENT PRODUCT KNOWLEDGE — AUTHORITATIVE REFERENCE

Use this as the source of truth for all Nutrient product knowledge when building demos. The summaries below are a compact working set; the official documentation links are authoritative when the user asks for exact API behavior.

## 0. OFFICIAL DOCUMENTATION SOURCES

Deep should reason from these official Nutrient docs, indexes, API references, samples, and release notes. If an API signature is not explicit in this prompt, cite the relevant URL and avoid inventing unsupported APIs.

${formatKnowledgeSourceLinks()}

---

## 1. PRODUCT PORTFOLIO — WHICH PRODUCT FOR WHICH USE CASE

| User asks for… | Product to use |
|---|---|
| PDF viewer in a web app | **Web SDK** (CDN, window.NutrientViewer) |
| Annotations, redaction, forms, signatures in browser | **Web SDK** |
| DOCX / Word file editing in browser | **Document Authoring SDK** |
| AI chat over a document / agentic editing | **AI Assistant** (requires Document Engine or backend JWT) |
| Server-side PDF processing, OCR, conversion, merge/split | **Document Engine** (self-hosted) or **DWS Processor API** (cloud) |
| Pixel-perfect document viewing without running infra | **DWS Viewer API** (cloud) |
| iOS / macOS app with PDF features | **Nutrient iOS SDK** (Swift/ObjC) |
| Android app with PDF features | **Nutrient Android SDK** (Kotlin/Java, Jetpack Compose) |
| React Native cross-platform | **Nutrient React Native SDK** |
| .NET / Windows desktop or server | **Nutrient .NET SDK** or **GdPicture.NET** |
| Java / Spring server-side | **Nutrient Java SDK** |
| Python scripts, AI pipelines, data extraction | **Nutrient Python SDK** |
| Agent/LLM workflow over documents | **Document Engine MCP** or **DWS MCP** |

**Decision rule for demos:** Build browser previews with Web SDK. Simulate backend features (Document Engine, DWS, Python SDK) with local async services and realistic state — never block the first render on real backend availability.

---

## 2. WEB SDK — PRIMARY PRODUCT FOR DEMOS

### Loading (version ${NUTRIENT_WEB_SDK_VERSION})

The SDK is loaded at runtime from Nutrient's CDN as \`window.NutrientViewer\`. NEVER import from npm.

\`\`\`tsx
// Reuse src/NutrientViewer.tsx — it handles CDN load, preloadWorker, cleanup.
// Direct load() shape:
const instance = await NutrientViewer.load({
  container,                                    // HTMLElement with explicit w/h
  document: "${NUTRIENT_WEB_DEMO_DOCUMENT_URL}",
  baseUrl: "${NUTRIENT_CDN_BASE_URL}",          // required — WASM/workers from CDN
  theme: NutrientViewer.Theme.DARK,             // .DARK | .LIGHT
  toolbarItems: [...],
  initialViewState: new NutrientViewer.ViewState({
    currentPageIndex: 0,
    showToolbar: true,
    zoom: NutrientViewer.ZoomMode.FIT_TO_WIDTH,
  }),
});
NutrientViewer.unload(instance); // cleanup
\`\`\`

Container must have \`position: relative; height: 100%; width: 100%; overflow: hidden\` before load().

### Toolbar items — complete list

Navigation: \`pager\` · \`zoom-out\` · \`zoom-in\` · \`zoom-mode\` · \`pan\` · \`marquee-zoom\` · \`layout-config\` · \`spacer\`
Sidebar:    \`search\` · \`sidebar-thumbnails\` · \`sidebar-bookmarks\` · \`sidebar-annotations\` · \`sidebar-layers\` · \`sidebar-signatures\`
Annotate:   \`annotate\` · \`highlighter\` · \`text-highlighter\` · \`ink\` · \`ink-eraser\` · \`note\` · \`text\` · \`callout\` · \`arrow\` · \`line\` · \`rectangle\` · \`ellipse\` · \`polygon\` · \`polyline\` · \`cloudy-rectangle\` · \`dashed-rectangle\` · \`cloudy-ellipse\` · \`dashed-ellipse\` · \`dashed-polygon\` · \`image\` · \`stamp\` · \`link\` · \`multi-annotations-selection\`
Forms/editor: \`form-creator\` · \`signature\` · \`content-editor\` · \`measure\`
Redact:     \`redact-text-highlighter\` · \`redact-rectangle\`
Documents:  \`document-editor\` · \`document-crop\` · \`document-comparison\`
Measure:    \`measure\`
History/output/AI: \`undo\` · \`redo\` · \`ai-assistant\` · \`export-pdf\` · \`print\`
Shape: \`{ type: "highlighter" }\` for built-ins. Use \`dropdownGroup\` for official grouped tools, e.g. \`{ type: "cloudy-rectangle", dropdownGroup: "shapes" }\` and \`{ type: "content-editor", dropdownGroup: "editor" }\`.
Never use \`{ type: "highlight" }\`; Nutrient rejects it. Use \`{ type: "highlighter" }\`.
Never use \`distance\`, \`perimeter\`, \`rectangle-area\`, \`ellipse-area\`, or \`polygon-area\` as toolbar item types; Nutrient rejects them. Use \`{ type: "measure" }\`.
Custom buttons: \`{ type: "custom", id: "approve", title: "Approve", icon: "<svg .../>", onPress: () => ... }\`.
Custom Draw button: do not invent \`type: "draw"\`. Freehand drawing is the built-in \`ink\` toolbar item or \`NutrientViewer.InteractionMode.INK\`. A true custom Draw button must use refs to the loaded instance/module and a readiness ref: \`if (!viewerReadyRef.current || !instance || !NutrientViewer) return; instance.setViewState((viewState) => viewState.set("interactionMode", NutrientViewer.InteractionMode.INK))\`. ToolbarItem \`onPress\` receives event/id, not the SDK instance, so expose \`onInstanceReady\` and \`onInstanceUnload\` from \`src/NutrientViewer.tsx\` when needed.
NO \`separator\`, \`apply-redactions\`, or \`sidebar-custom\`.

### ViewState API

\`\`\`tsx
new NutrientViewer.ViewState({
  currentPageIndex: 0,
  showToolbar: true,
  sidebarMode: NutrientViewer.SidebarMode.THUMBNAILS, // THUMBNAILS|BOOKMARKS|ANNOTATIONS|LAYERS|null
  zoom: NutrientViewer.ZoomMode.FIT_TO_WIDTH,         // FIT_TO_WIDTH|FIT_TO_VIEWPORT|AUTO|number
  scrollMode: NutrientViewer.ScrollMode.CONTINUOUS,   // CONTINUOUS|PER_PAGE|PER_SPREAD
  spreadMode: NutrientViewer.SpreadMode.NONE,         // NONE|ODD|EVEN
  layoutMode: NutrientViewer.LayoutMode.SINGLE,       // SINGLE|DOUBLE|DOUBLE_FIRST_SINGLE
  readOnly: false,
  enableTextSelection: true,
  keepSelectedTool: true,
})
\`\`\`

### Instance API — programmatic control

\`\`\`tsx
// Navigation
await instance.setViewState(vs => vs.set("currentPageIndex", 2));
const pageCount = instance.totalPageCount;

// Annotations (17 types: Highlight, Ink, Note, Text, Shape, Arrow, Image, Stamp, Redact…)
const annotations = await instance.getAnnotations(0); // page 0
await instance.create(annotation);
await instance.update(annotation);
await instance.delete(annotation);
// Export / import annotations
const xfdf = await instance.exportXFDF();
await instance.importXFDF(xfdfString);
const json = await instance.exportInstantJSON();
await instance.applyOperations([{ type: "importInstantJSON", instantJSON }]);

// Forms
const formFields = await instance.getFormFields();
await instance.setFormFieldValues({ fieldName: "value", checkbox: true });
const values = await instance.getFormFieldValues();

// Redaction
const annots = await instance.createRedactionsBySearch("confidential", { searchType: NutrientViewer.SearchType.TEXT });
await instance.applyRedactions(); // PERMANENT — removes content irreversibly

// Text extraction
const text = await instance.getTextFromRects(0, [rect]);
const results = await instance.search("search term");

// Export
const pdfBuffer = await instance.exportPDF({ flatten: true }); // ArrayBuffer
const blob = new Blob([pdfBuffer], { type: "application/pdf" });

// Signatures
await instance.signDocument(null, null); // opens signing UI
\`\`\`

### Instance events

\`\`\`tsx
instance.addEventListener("annotations.change", e => { /* e.annotations */ });
instance.addEventListener("viewState.change", e => { /* e.viewState */ });
instance.addEventListener("document.saveStateChange", e => { /* e.hasUnsavedChanges */ });
instance.addEventListener("textSelection.change", e => { /* e.selectedText */ });
instance.addEventListener("page.press", e => { /* e.pageIndex, e.point */ });
instance.addEventListener("formFieldValues.update", e => { /* e.formFieldValues */ });
\`\`\`

### Programmatic annotation creation

\`\`\`tsx
// Highlight
const highlight = new NutrientViewer.Annotations.HighlightAnnotation({
  pageIndex: 0,
  rects: NutrientViewer.Immutable.List([
    new NutrientViewer.Geometry.Rect({ left: 100, top: 100, width: 200, height: 20 }),
  ]),
  color: new NutrientViewer.Color({ r: 255, g: 220, b: 0 }),
});
await instance.create(highlight);

// Note / comment
const note = new NutrientViewer.Annotations.NoteAnnotation({
  pageIndex: 0,
  text: { format: "plain", value: "Review this section" },
  boundingBox: new NutrientViewer.Geometry.Rect({ left: 50, top: 50, width: 30, height: 30 }),
});
await instance.create(note);

// Text annotation
const textAnnot = new NutrientViewer.Annotations.TextAnnotation({
  pageIndex: 0,
  text: { format: "plain", value: "Approved" },
  boundingBox: new NutrientViewer.Geometry.Rect({ left: 200, top: 200, width: 120, height: 40 }),
  fontSize: 14,
  fontColor: new NutrientViewer.Color({ r: 15, g: 118, b: 110 }),
});
await instance.create(textAnnot);
\`\`\`

---

## 3. AI ASSISTANT — CHAT + AGENTIC DOCUMENT EDITING

Nutrient AI Assistant adds an in-viewer AI chat panel and an agentic document editing mode. Requires a backend to issue JWTs.

### Integration pattern (Web SDK + AI Assistant)

\`\`\`tsx
const instance = await NutrientViewer.load({
  container,
  document: documentUrl,
  baseUrl: "${NUTRIENT_CDN_BASE_URL}",
  // AI Assistant config — backend issues a signed JWT
  aiAssistantConfiguration: {
    serverUrl: "https://your-ai-assistant-server.example.com",
    jwt: await fetchJwtFromBackend(),  // RS256 signed, includes "exp" claim
    sessionId: crypto.randomUUID(),
    userId: "user-123",               // optional
  },
});
\`\`\`

### Capabilities
- **Chat**: User asks questions about the document; AI answers with page references.
- **Redaction AI**: Context-aware, confidence-based redaction suggestions in real time.
- **Document editing agent**: AI autonomously edits the document (annotations, form fills, text changes) via multistep tool calls, then presents results for review.

### Demo simulation pattern (no live backend)
When building a demo without a real AI Assistant server, simulate the experience:
\`\`\`tsx
// Show a chat UI panel alongside the viewer
// Fake AI responses with realistic document-aware messages
// Highlight annotations programmatically to show "AI found this"
const [chatMessages, setChatMessages] = useState<{role:"user"|"ai"; text:string}[]>([]);
async function sendMessage(text: string) {
  setChatMessages(prev => [...prev, { role:"user", text }]);
  await new Promise(r => setTimeout(r, 800)); // simulate thinking
  setChatMessages(prev => [...prev, { role:"ai", text: generateAIResponse(text) }]);
}
\`\`\`

---

## 4. DOCUMENT ENGINE — SERVER-SIDE PROCESSING

Self-hosted or managed cloud server for high-performance document processing. Accessed via REST API.

### Deployment options
- **Self-hosted Docker**: Full control, on-prem or your cloud. \`docker run nutrient/document-engine\`
- **Managed Cloud**: Nutrient hosts it; you access via API key.
- **DWS (as a service)**: Fully serverless, pay-per-use cloud APIs.

### Key REST API operations (simulate locally in demos)

\`\`\`tsx
// In a demo, simulate Document Engine calls with local async functions:
async function processDocument(documentId: string, operation: string) {
  // Simulate realistic latency
  await new Promise(r => setTimeout(r, 1200));
  return { status: "completed", pages: 12, processingTime: "1.1s" };
}

// Real API shape (for docs/setup files):
// POST /api/documents — upload document, returns { documentId }
// POST /api/documents/{id}/operations — apply operations (OCR, redact, convert)
// GET  /api/documents/{id}/pdf — download processed PDF
// DELETE /api/documents/{id} — cleanup

// Operations shape:
const operations = [
  { type: "performOcr", language: "english" },
  { type: "applyRedactions" },
  { type: "flattenAnnotations" },
  { type: "watermarkAllPages", watermark: { text: "CONFIDENTIAL", opacity: 0.3 } },
  { type: "mergeDocuments", documentIds: ["id1", "id2"] },
  { type: "splitDocument", splitPoints: [5, 10] },
  { type: "rotatePages", pageIndexes: [0, 1], rotateBy: 90 },
];
\`\`\`

### Document Engine MCP (for agent workflows)
\`\`\`json
{
  "mcpServers": {
    "nutrient-document-engine": {
      "command": "npx",
      "args": ["-y", "@nutrient-sdk/document-engine-mcp-server"],
      "env": {
        "DOCUMENT_ENGINE_BASE_URL": "https://your-engine.example.com",
        "DOCUMENT_ENGINE_API_AUTH_TOKEN": "your-token"
      }
    }
  }
}
\`\`\`

---

## 5. DWS — DOCUMENT WEB SERVICES (CLOUD REST API)

Two cloud APIs, no infrastructure required.

### DWS Viewer API
Pixel-perfect document viewing as a hosted service. Acts as the rendering backend for Web SDK instead of self-hosting Document Engine.
\`\`\`tsx
// Use as document source in Web SDK:
const instance = await NutrientViewer.load({
  container,
  document: "https://your-dws-instance.nutrient.io/documents/doc-id",
  authPayload: { jwt: "your-dws-jwt" },
  baseUrl: "${NUTRIENT_CDN_BASE_URL}",
});
\`\`\`

### DWS Processor API (REST)
Cloud-based document processing: OCR, conversion, merge, split, redaction, watermark, tagging, extraction.
\`\`\`tsx
// Simulate locally in demos; real API shape:
// POST https://api.nutrient.io/build — multipart form with instructions JSON + files
const instructions = {
  parts: [{ file: "document" }],
  actions: [
    { type: "ocr", language: "english" },
    { type: "watermark", text: "DRAFT", opacity: 0.3, fontSize: 40 },
  ],
  output: { type: "pdf" },
};
// Returns processed PDF blob
\`\`\`

### DWS MCP (for agent workflows)
\`\`\`json
{
  "mcpServers": {
    "nutrient-dws": {
      "command": "npx",
      "args": ["-y", "@nutrient-sdk/dws-mcp-server", "--sandbox", "/sandbox"],
      "env": { "NUTRIENT_DWS_API_KEY": "your-api-key" }
    }
  }
}
\`\`\`

---

## 6. DOCUMENT AUTHORING SDK — DOCX EDITING IN BROWSER

WYSIWYG Word document editor for web apps. Supports opening, editing, and exporting DOCX/PDF.

### Core API

\`\`\`tsx
import { DocAuthSystem, DocAuthEditor, DocAuthDocument } from "@nutrient-sdk/document-authoring";

// 1. Initialize the system (manages fonts, licensing, WASM)
const system = await DocAuthSystem.create({ licenseKey: undefined }); // undefined = demo mode

// 2. Load a document
const doc = await DocAuthDocument.load(system, { url: "/template.docx" });

// 3. Mount the editor UI
const editor = DocAuthEditor.create({ container: editorRef.current!, document: doc });

// 4. Export
const docxBuffer = await doc.exportDocx();
const pdfBuffer = await doc.exportPdf();

// Cleanup
editor.destroy();
doc.destroy();
system.destroy();
\`\`\`

### Key features
- Tables, floating images, headers/footers, custom styles, lists
- Import Word files with full fidelity, export back to DOCX or PDF
- Template filling: set named fields/variables in a DOCX template
- Collaborative editing (requires Document Engine backend)
- React component: \`@nutrient-sdk/react-docx-editor\`

### Demo pattern (without license)
\`\`\`tsx
// Show a DOCX editor panel. Demo mode = no license, watermarked output.
// Highlight template fields and let user fill them in.
// Show Export to PDF / Save as DOCX buttons with realistic async feedback.
\`\`\`

---

## 7. PLATFORM SDKs (BRIEF — FOR POSITIONING IN DEMOS)

| SDK | Language | Key notes |
|---|---|---|
| **iOS SDK** | Swift / Objective-C | Native PDF viewer, annotations, forms, AI Assistant (runs locally via Apple Foundation Models in Q4 2025), InstantSync collaboration |
| **Android SDK** | Kotlin / Java | Jetpack Compose support (\`InstantDocumentView\` composable), AI Assistant, real-time collaboration |
| **React Native SDK** | TypeScript | Cross-platform iOS+Android, AI Assistant support, wraps native SDKs |
| **.NET SDK** | C# / VB.NET | Server-side PDF generation, editing, signing; automated PDF/UA tagging for accessibility compliance |
| **Java SDK** | Java | Server-side processing, high-volume automation, Spring integration |
| **Python SDK** | Python | AI/ML document pipelines, data extraction, OCR, conversion, PDF generation |
| **GdPicture.NET** | C# | Advanced imaging + PDF, 100+ document formats, barcode, OCR |

**In demos:** Mention the right platform SDK for the user's tech stack in NUTRIENTWEBBUILDER.md and any setup documentation. The browser preview always uses Web SDK.

---

## 8. PYTHON SDK — AI/ML WORKFLOWS

\`\`\`python
from nutrient_dws import Client, operations

client = Client(api_key="your-key")

# Extract structured data
result = client.process(
    document="contract.pdf",
    operations=[
        operations.ExtractText(),
        operations.ExtractTables(),
        operations.PerformOCR(language="english"),
    ]
)

# AI-powered extraction (structured output)
extracted = client.extract(
    document="invoice.pdf",
    schema={"invoice_number": str, "total": float, "vendor": str}
)
\`\`\`

For Python SDK demos: create \`scripts/process_document.py\` with realistic code and show the pipeline in a backend service simulation panel in the browser.

---

## 9. INTEGRATION PATTERNS FOR DEMOS

### Pattern A: Web-only viewer (most common)
\`\`\`
Browser → NutrientViewer.load() → CDN SDK → renders PDF
\`\`\`
Use for: viewer demos, annotation workflows, form filling, redaction, signatures, search.

### Pattern B: Web SDK + simulated backend
\`\`\`
Browser → NutrientViewer.load() + custom UI panels
      ↕ async service simulation (setTimeout, local state)
"Backend" → realistic mock API responses
\`\`\`
Use for: Document Engine features (OCR, conversion, merge), DWS processing, AI extraction demos.

### Pattern C: Document Authoring (DOCX editor)
\`\`\`
Browser → DocAuthEditor renders DOCX → user edits → export PDF/DOCX
\`\`\`
Use for: contract authoring, template filling, DOCX editing demos.

### Pattern D: AI Assistant demo (simulated)
\`\`\`
Browser → viewer panel + custom chat UI
       → simulate JWT fetch → show aiAssistantConfiguration shape
       → fake chat responses that reference the document
\`\`\`
Use for: AI chat demos without a running AI Assistant server.

---

## 10. FEATURE DECISION TABLE

| Feature requested | API / approach |
|---|---|
| View a PDF | \`NutrientViewer.load()\` |
| Highlight / annotate | Annotation toolbar items + \`instance.create()\` |
| Fill a form | \`instance.setFormFieldValues()\` + form-creator toolbar |
| Sign a document | \`signature\` toolbar item + \`instance.signDocument()\` |
| Redact sensitive text | \`redact-text-highlighter\` + \`instance.applyRedactions()\` |
| AI redaction | \`aiAssistantConfiguration\` (or simulate) |
| Search text | \`instance.search()\` |
| OCR a scanned PDF | Document Engine / DWS Processor + \`performOcr\` op |
| Export PDF | \`instance.exportPDF({ flatten: true })\` |
| Edit Word document | Document Authoring SDK |
| Merge/split PDFs | Document Engine / DWS Processor API |
| Extract structured data | Python SDK / DWS extraction |
| Real-time collaboration | Document Engine + InstantSync |
| AI chat over document | AI Assistant SDK (+ backend JWT) |
| Mobile PDF app | iOS / Android / React Native SDK |

---

## 11. CORE RULES (NEVER BREAK)

1. **CDN only** — NEVER \`import from "@nutrient-sdk/viewer"\`. CDN URL: \`${NUTRIENT_CDN_SCRIPT_URL}\`
2. **baseUrl required** — always pass \`baseUrl: "${NUTRIENT_CDN_BASE_URL}"\` to \`load()\`
3. **Container dimensions** — parent div must have explicit height before \`load()\` is called
4. **Reuse wrapper** — \`src/NutrientViewer.tsx\` is the canonical wrapper; don't rewrite it unless asked
5. **No mock viewers** — never render a static PDF screenshot or fake viewer; always use real \`NutrientViewer.load()\`
6. **Backend simulation** — Document Engine / DWS / Python SDK features need local async service stubs in the browser preview; never block first render on real backend
7. **Default document** — use \`${NUTRIENT_WEB_DEMO_DOCUMENT_URL}\` as the demo document URL

---

## 12. OFFICIAL DOCUMENTATION URLS

- Web SDK guides: https://www.nutrient.io/guides/web/
- Web SDK API ref: https://www.nutrient.io/api/web/
- Getting started (React+Vite): https://www.nutrient.io/sdk/web/getting-started/react-vite/
- Toolbar / UI: https://www.nutrient.io/guides/web/user-interface/
- Annotations: https://www.nutrient.io/guides/web/annotations/
- Forms: https://www.nutrient.io/guides/web/forms/
- Signatures: https://www.nutrient.io/guides/web/signatures/
- Redaction: https://www.nutrient.io/guides/web/redaction/
- Search: https://www.nutrient.io/guides/web/search/
- Document comparison: https://www.nutrient.io/guides/web/comparison/
- AI Assistant (getting started): https://www.nutrient.io/sdk/ai-assistant/getting-started/web/
- AI Assistant agents: https://www.nutrient.io/guides/ai-assistant/features/agents/
- Document Engine: https://www.nutrient.io/sdk/document-engine/
- Document Engine guides: https://www.nutrient.io/guides/document-engine/intro/
- DWS Processor API: https://www.nutrient.io/api/processor-api/
- DWS Viewer API: https://www.nutrient.io/api/
- Document Authoring SDK: https://www.nutrient.io/sdk/document-authoring/
- Document Authoring API: https://www.nutrient.io/api/document-authoring/
- React DOCX editor: https://www.nutrient.io/sdk/react-docx-editor/
- Python SDK: https://www.nutrient.io/sdk/python/
- Document Engine MCP: https://www.nutrient.io/blog/nutrient-document-engine-mcp-server-release/
- DWS MCP: https://www.nutrient.io/guides/dws-processor/getting-started/mcp-server/
- iOS SDK: https://www.nutrient.io/sdk/ios/
- Android SDK: https://www.nutrient.io/sdk/android/
- React Native SDK: https://www.nutrient.io/sdk/react-native/
- .NET SDK: https://www.nutrient.io/sdk/dotnet/
- Java SDK: https://www.nutrient.io/sdk/java/
- All products: https://www.nutrient.io/sdk/products/`;
}
