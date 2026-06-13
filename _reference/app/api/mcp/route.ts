"use server";
/**
 * Nutrient Demo Studio - MCP Server
 *
 * Exposes Nutrient product documentation as MCP tools via the
 * Streamable HTTP transport. Claude Code and the in-app AI agent
 * can both query this server for authoritative Nutrient knowledge.
 *
 * Endpoint: POST/GET /api/mcp
 * Protocol: MCP 2025-03-26, Streamable HTTP transport
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { buildNutrientDocsContext } from "@/features/ai/nutrient-docs-context";

// ── Nutrient product catalogue ──────────────────────────────────────────────

const PRODUCT_CATALOGUE = {
  "web-sdk": {
    name: "Nutrient Web SDK",
    useCase: "PDF viewer, annotations, redaction, forms, signatures in a web browser",
    import: "window.NutrientViewer via CDN (never npm)",
    keyFeatures: ["viewer", "annotations", "redaction", "comparison", "forms", "signatures", "search", "export-pdf"],
    docs: "https://www.nutrient.io/guides/web/",
  },
  "document-authoring": {
    name: "Document Authoring SDK",
    useCase: "DOCX / Word editing in the browser",
    import: "@nutrient-sdk/document-authoring-react",
    keyFeatures: ["word-editing", "collaboration", "track-changes"],
    docs: "https://www.nutrient.io/sdk/document-authoring/",
  },
  "ai-assistant": {
    name: "Nutrient AI Assistant",
    useCase: "AI chat over a document, agentic document editing",
    requires: "Document Engine or backend JWT",
    docs: "https://www.nutrient.io/sdk/ai-assistant/getting-started/web/",
  },
  "document-engine": {
    name: "Nutrient Document Engine",
    useCase: "Server-side PDF processing, OCR, conversion, merge/split (self-hosted)",
    protocol: "REST API / Docker",
    mcp: "https://www.nutrient.io/blog/nutrient-document-engine-mcp-server-release/",
    docs: "https://www.nutrient.io/sdk/document-engine/",
  },
  "dws": {
    name: "Nutrient DWS (Document Web Services)",
    useCase: "Cloud document processing - OCR, conversion, merge/split, viewer API",
    mcp: "https://www.nutrient.io/guides/dws-processor/getting-started/mcp-server/",
    docs: "https://www.nutrient.io/api/processor-api/",
  },
  "python-sdk": {
    name: "Nutrient Python SDK",
    useCase: "Python scripts, AI pipelines, data extraction from PDFs",
    docs: "https://www.nutrient.io/sdk/python/",
  },
  "ios-sdk": {
    name: "Nutrient iOS SDK",
    useCase: "Native iOS / macOS PDF features (Swift / Objective-C)",
    docs: "https://www.nutrient.io/sdk/ios/",
  },
  "android-sdk": {
    name: "Nutrient Android SDK",
    useCase: "Native Android PDF features (Kotlin / Java, Jetpack Compose)",
    docs: "https://www.nutrient.io/sdk/android/",
  },
  "react-native-sdk": {
    name: "Nutrient React Native SDK",
    useCase: "Cross-platform React Native PDF features",
    docs: "https://www.nutrient.io/sdk/react-native/",
  },
  "dotnet-sdk": {
    name: "Nutrient .NET SDK",
    useCase: ".NET / Windows desktop or server PDF processing",
    docs: "https://www.nutrient.io/sdk/dotnet/",
  },
  "java-sdk": {
    name: "Nutrient Java SDK",
    useCase: "Java / Spring server-side PDF processing",
    docs: "https://www.nutrient.io/sdk/java/",
  },
} as const;

const WEB_SDK_TOOLBAR_ITEMS = {
  navigation: ["pager", "zoom-out", "zoom-in", "zoom-mode", "spacer"],
  sidebar: ["search", "sidebar-thumbnails", "sidebar-bookmarks", "sidebar-annotations", "sidebar-layers", "sidebar-signatures"],
  annotate: ["highlighter", "text-highlighter", "ink", "ink-eraser", "note", "text", "callout", "arrow", "line", "rectangle", "ellipse", "polygon", "polyline", "image", "stamp", "link", "multi-annotations-selection"],
  forms: ["form-creator", "signature"],
  redact: ["redact-text-highlighter", "redact-rectangle"],
  documents: ["document-editor", "document-crop", "document-comparison"],
  measure: ["measure"],
  output: ["export-pdf", "print"],
};

// ── Build MCP server ─────────────────────────────────────────────────────────

function createNutrientMcpServer() {
  const server = new McpServer({
    name: "nutrient-demo-studio",
    version: "1.0.0",
  });

  // Tool 1: Full Nutrient product knowledge
  server.registerTool(
    "get_nutrient_docs",
    {
      description:
        "Get authoritative Nutrient SDK documentation. Returns the full knowledge base including product catalogue, Web SDK API, toolbar items, ViewState, Instance API, events, and integration patterns.",
      inputSchema: z.object({}),
    },
    async () => ({
      content: [{ type: "text" as const, text: buildNutrientDocsContext() }],
    })
  );

  // Tool 2: Product recommendation for a use case
  server.registerTool(
    "nutrient_product_for",
    {
      description:
        "Given a use case description, returns the best Nutrient product to use and key guidance.",
      inputSchema: z.object({
        use_case: z.string().describe("Description of what the user wants to build or do, e.g. 'PDF viewer in a React web app', 'server-side OCR', 'iOS PDF annotations'"),
      }),
    },
    async ({ use_case }) => {
      const lc = use_case.toLowerCase();
      let product: (typeof PRODUCT_CATALOGUE)[keyof typeof PRODUCT_CATALOGUE];
      let key: keyof typeof PRODUCT_CATALOGUE;

      if (/python|script|extract|ai pipeline|data extract/.test(lc)) {
        key = "python-sdk";
      } else if (/ios|swift|objective|macos|mac app/.test(lc)) {
        key = "ios-sdk";
      } else if (/android|kotlin|java.*mobile|jetpack/.test(lc)) {
        key = "android-sdk";
      } else if (/react native|rn|cross.platform mobile/.test(lc)) {
        key = "react-native-sdk";
      } else if (/\.net|windows desktop|c#|asp\.net/.test(lc)) {
        key = "dotnet-sdk";
      } else if (/java|spring|server.*java/.test(lc)) {
        key = "java-sdk";
      } else if (/docx|word|document author/.test(lc)) {
        key = "document-authoring";
      } else if (/ai chat|ai assistant|agentic|chat.*document/.test(lc)) {
        key = "ai-assistant";
      } else if (/server.side|ocr|convert|merge|split|cloud.*process|dws/.test(lc)) {
        key = "dws";
      } else if (/self.host|document engine/.test(lc)) {
        key = "document-engine";
      } else {
        // Default: Web SDK for browser demos
        key = "web-sdk";
      }

      product = PRODUCT_CATALOGUE[key];
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ product: key, ...product }, null, 2),
        }],
      };
    }
  );

  // Tool 3: Web SDK toolbar items
  server.registerTool(
    "get_web_sdk_toolbar_items",
    {
      description:
        "Returns all available Nutrient Web SDK toolbar item names, grouped by category. Use this when building toolbarItems configuration for NutrientViewer.",
      inputSchema: z.object({
        category: z.enum(["all", "navigation", "sidebar", "annotate", "forms", "redact", "documents", "measure", "output"])
          .optional()
          .describe("Filter by category. Omit for all items."),
      }),
    },
    async ({ category }) => {
      const items = category && category !== "all"
        ? { [category]: WEB_SDK_TOOLBAR_ITEMS[category] }
        : WEB_SDK_TOOLBAR_ITEMS;
      return {
        content: [{ type: "text" as const, text: JSON.stringify(items, null, 2) }],
      };
    }
  );

  // Tool 4: Web SDK viewer mount pattern
  server.registerTool(
    "get_viewer_mount_pattern",
    {
      description:
        "Returns the correct React pattern for mounting the Nutrient Web SDK viewer (NutrientViewer component). Use this when you need to add a PDF viewer to a React app.",
      inputSchema: z.object({
        features: z.array(z.string()).optional().describe("List of features needed, e.g. ['redaction', 'annotations', 'comparison']"),
      }),
    },
    async ({ features = [] }) => {
      const toolbarItems: string[] = ["pager", "zoom-out", "zoom-in"];
      if (features.includes("annotations")) toolbarItems.push("highlighter", "text-highlighter", "note", "ink");
      if (features.includes("redaction")) toolbarItems.push("redact-text-highlighter", "redact-rectangle");
      if (features.includes("comparison")) toolbarItems.push("document-comparison");
      if (features.includes("forms")) toolbarItems.push("form-creator", "signature");
      if (features.includes("signatures")) toolbarItems.push("signature");
      toolbarItems.push("export-pdf");

      const pattern = `// src/pages/ViewerPage.tsx - add the Nutrient viewer to a page
import { NutrientViewer } from "../NutrientViewer";

export function ViewerPage({ documentUrl }: { documentUrl?: string }) {
  return (
    <div style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column" }}>
      {/* Viewer container MUST have explicit height - flex-1 or fixed px both work */}
      <div style={{ flex: 1, position: "relative", minHeight: 400 }}>
        <NutrientViewer
          document={documentUrl}
          theme="DARK"
          toolbarItems={${JSON.stringify(toolbarItems)}}
        />
      </div>
    </div>
  );
}
export default ViewerPage;`;

      return { content: [{ type: "text" as const, text: pattern }] };
    }
  );

  // Tool 5: All official Nutrient documentation URLs
  server.registerTool(
    "get_nutrient_docs_urls",
    {
      description: "Returns a list of all official Nutrient documentation URLs for all products.",
      inputSchema: z.object({}),
    },
    async () => ({
      content: [{
        type: "text" as const,
        text: [
          "Web SDK guides: https://www.nutrient.io/guides/web/",
          "Web SDK API ref: https://www.nutrient.io/api/web/",
          "Getting started (React+Vite): https://www.nutrient.io/sdk/web/getting-started/react-vite/",
          "AI Assistant: https://www.nutrient.io/sdk/ai-assistant/getting-started/web/",
          "Document Engine: https://www.nutrient.io/sdk/document-engine/",
          "Document Engine MCP: https://www.nutrient.io/blog/nutrient-document-engine-mcp-server-release/",
          "DWS Processor API: https://www.nutrient.io/api/processor-api/",
          "DWS MCP server: https://www.nutrient.io/guides/dws-processor/getting-started/mcp-server/",
          "Document Authoring SDK: https://www.nutrient.io/sdk/document-authoring/",
          "Python SDK: https://www.nutrient.io/sdk/python/",
          "iOS SDK: https://www.nutrient.io/sdk/ios/",
          "Android SDK: https://www.nutrient.io/sdk/android/",
          "React Native SDK: https://www.nutrient.io/sdk/react-native/",
          ".NET SDK: https://www.nutrient.io/sdk/dotnet/",
          "Java SDK: https://www.nutrient.io/sdk/java/",
          "All products: https://www.nutrient.io/sdk/products/",
        ].join("\n"),
      }],
    })
  );

  return server;
}

// ── Next.js route handler ───────────────────────────────────────────────────
// Stateless mode: one server + transport pair per request (no session affinity needed).

async function handleMcpRequest(req: Request): Promise<Response> {
  const server = createNutrientMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
  });
  // Connect server to transport BEFORE handling the request.
  await server.connect(transport);
  return transport.handleRequest(req);
}

export const POST = handleMcpRequest;
export const GET = handleMcpRequest;
export const DELETE = handleMcpRequest;
