import type { Template, TemplateFeatures, WorkspaceConfig } from "@/types";
import { NUTRIENT_WEB_DEMO_DOCUMENT_URL } from "@/lib/nutrient/sdk-version";

const DEFAULT_FEATURES: TemplateFeatures = {
  annotations: false,
  forms: false,
  signatures: false,
  search: true,
  thumbnails: true,
  ocr: false,
  redaction: false,
  comparison: false,
  export: true,
  collaboration: false,
  aiAssistant: false,
};

interface WebSdkTemplateInput {
  id: string;
  name: string;
  description: string;
  category: Template["category"];
  tags: string[];
  accentColor: string;
  comingSoon?: boolean;
  features: Partial<TemplateFeatures>;
  content: {
    demoTitle: string;
    demoDescription: string;
    companyTagline: string;
    ctaText: string;
  };
  workflow: Array<{
    id: string;
    label: string;
    description: string;
    toolRequired: string | null;
    order: number;
  }>;
  documents: Array<{
    id: string;
    name: string;
    description: string;
  }>;
}

function createWebSdkTemplate(input: WebSdkTemplateInput): Template {
  const features = { ...DEFAULT_FEATURES, ...input.features };
  const config: WorkspaceConfig = {
    theme: {
      primaryColor: "#101820",
      accentColor: input.accentColor,
      backgroundColor: "#1a1414",
      fontFamily: "Inter",
      logoUrl: null,
      companyName: "Nutrient",
      industry: "Web SDK",
      mode: "dark",
    },
    features,
    content: {
      ...input.content,
      heroText: null,
    },
    sampleDocuments: input.documents.map((document) => ({
      ...document,
      url: NUTRIENT_WEB_DEMO_DOCUMENT_URL,
      type: "pdf",
    })),
    toolbar: {
      showAnnotationTools: features.annotations,
      showFormTools: features.forms,
      showExportTools: features.export,
      showSearchBar: features.search,
      showThumbnails: features.thumbnails,
      position: "top",
      customItems: [],
    },
    workflow: input.workflow,
    activeSampleDocumentId: input.documents[0]?.id ?? null,
  };

  return {
    id: input.id,
    name: input.name,
    description: input.description,
    category: input.category,
    tags: ["web-sdk", ...input.tags],
    version: "1.0.0",
    thumbnail: null,
    previewUrl: null,
    estimatedSetupMinutes: 2,
    comingSoon: input.comingSoon,
    defaultConfig: config,
  };
}

export const WEB_SDK_TEMPLATES: Template[] = [
  createWebSdkTemplate({
    id: "web-sdk-viewer",
    name: "Web SDK Viewer",
    description:
      "Embed high-fidelity PDF and image viewing in a browser app with search, thumbnails, and export.",
    category: "document",
    tags: ["viewer", "pdf", "search", "thumbnails"],
    accentColor: "#0f766e",
    features: {},
    content: {
      demoTitle: "Nutrient Web SDK Viewer",
      demoDescription:
        "A polished browser document viewer with fast rendering, search, page navigation, and export.",
      companyTagline: "Document viewing built for modern web apps",
      ctaText: "Open Viewer",
    },
    documents: [
      {
        id: "web-sdk-demo-pdf",
        name: "Web SDK Demo PDF",
        description: "PDF viewer demo document",
      },
    ],
    workflow: [
      {
        id: "step-1",
        label: "Load Document",
        description: "Render a PDF directly in the browser",
        toolRequired: null,
        order: 1,
      },
      {
        id: "step-2",
        label: "Search and Navigate",
        description: "Use search and thumbnails to move through pages",
        toolRequired: "search",
        order: 2,
      },
      {
        id: "step-3",
        label: "Export or Print",
        description: "Let users export or print the current document",
        toolRequired: "export",
        order: 3,
      },
    ],
  }),
  createWebSdkTemplate({
    id: "python-sdk",
    name: "Python SDK",
    description:
      "Server-side document processing with the Nutrient Python SDK — a FastAPI backend scaffold (nutrient-sdk pre-installed) for conversion, OCR, and extraction, plus the Web SDK viewer up front.",
    category: "sdk",
    tags: ["python", "fastapi", "server", "conversion", "ocr"],
    accentColor: "#3776ab",
    comingSoon: true,
    features: {
      ocr: true,
    },
    content: {
      demoTitle: "Nutrient Python SDK",
      demoDescription:
        "A Python backend project structure with the Nutrient Python SDK installed — convert, OCR, and extract documents in-process, and view results with the Web SDK.",
      companyTagline: "In-process document intelligence for Python",
      ctaText: "Explore the Backend",
    },
    documents: [
      {
        id: "python-sdk-demo-pdf",
        name: "Processed Output PDF",
        description: "Sample output viewed with the Web SDK",
      },
    ],
    workflow: [
      {
        id: "step-1",
        label: "Ingest Document",
        description: "Upload a PDF or Office file to the Python backend",
        toolRequired: null,
        order: 1,
      },
      {
        id: "step-2",
        label: "Process with nutrient-sdk",
        description: "Convert, OCR, or extract data in-process with the Python SDK",
        toolRequired: null,
        order: 2,
      },
      {
        id: "step-3",
        label: "Review Output",
        description: "View the processed result in the Web SDK viewer",
        toolRequired: "export",
        order: 3,
      },
    ],
  }),
  createWebSdkTemplate({
    id: "nodejs-sdk",
    name: "Node.js SDK",
    description:
      "Server-side PDF generation with @nutrient-sdk/node — a Node backend scaffold for converting Office documents and images to PDF in-process, plus the Web SDK viewer up front.",
    category: "sdk",
    tags: ["nodejs", "server", "conversion", "office-to-pdf"],
    accentColor: "#5fa04e",
    comingSoon: true,
    features: {},
    content: {
      demoTitle: "Nutrient Node.js SDK",
      demoDescription:
        "A Node.js backend project structure with @nutrient-sdk/node — convert Word, Excel, PowerPoint, and images to PDF in-process, and view results with the Web SDK.",
      companyTagline: "In-process PDF generation for Node.js",
      ctaText: "Explore the Backend",
    },
    documents: [
      {
        id: "nodejs-sdk-demo-pdf",
        name: "Generated Output PDF",
        description: "Sample output viewed with the Web SDK",
      },
    ],
    workflow: [
      {
        id: "step-1",
        label: "Ingest Document",
        description: "Send a Word, Excel, PowerPoint, or image file to the Node backend",
        toolRequired: null,
        order: 1,
      },
      {
        id: "step-2",
        label: "Convert with @nutrient-sdk/node",
        description: "Generate the PDF in-process with the Node.js SDK",
        toolRequired: null,
        order: 2,
      },
      {
        id: "step-3",
        label: "Review Output",
        description: "View the generated PDF in the Web SDK viewer",
        toolRequired: "export",
        order: 3,
      },
    ],
  }),
];

const BLANK_CONFIG: WorkspaceConfig = {
  theme: {
    primaryColor: "#101820",
    accentColor: "#0f766e",
    backgroundColor: "#f8f8f6",
    fontFamily: "Inter",
    logoUrl: null,
    companyName: "Nutrient Web SDK",
    industry: null,
    mode: "light",
  },
  features: {
    annotations: false,
    forms: false,
    signatures: false,
    search: true,
    thumbnails: true,
    ocr: false,
    redaction: false,
    comparison: false,
    export: true,
    collaboration: false,
    aiAssistant: false,
  },
  content: {
    demoTitle: "Nutrient Web SDK",
    demoDescription: "Build a complete app with Nutrient Web SDK integrated",
    companyTagline: "Document intelligence for modern apps",
    heroText: null,
    ctaText: "Get Started",
  },
  sampleDocuments: [],
  toolbar: {
    showAnnotationTools: false,
    showFormTools: false,
    showExportTools: false,
    showSearchBar: false,
    showThumbnails: false,
    position: "top",
    customItems: [],
  },
  workflow: [
    {
      id: "intake",
      label: "Intake document packet",
      description: "Load the PDF into the product workflow",
      toolRequired: "viewer",
      order: 1,
    },
    {
      id: "review",
      label: "Review and annotate",
      description: "Use Nutrient Web SDK tools to inspect and mark up the document",
      toolRequired: "annotations",
      order: 2,
    },
    {
      id: "approve",
      label: "Sign or approve",
      description: "Capture signatures or route the packet to the next reviewer",
      toolRequired: "signatures",
      order: 3,
    },
    {
      id: "export",
      label: "Export final PDF",
      description: "Export or print the reviewed packet",
      toolRequired: "export",
      order: 4,
    },
  ],
  activeSampleDocumentId: "web-sdk-demo-pdf",
  preview: {
    mode: "viewer",
    appName: "Nutrient Web SDK",
    tagline: "Describe your app — the AI will build it around the real Nutrient SDK",
    accentColor: "#0f766e",
    navigation: [],
    viewer: {
      title: "Ready to build",
      subtitle: "Write a prompt to generate a full app with Nutrient integrated",
      documentLabel: "Nutrient Web SDK Demo PDF",
      placement: "full",
    },
  },
};

export const BLANK_TEMPLATE = {
  id: "blank",
  name: "Blank",
  description:
    "A blank canvas with the Web SDK ready to integrate and the Python SDK pre-installed. Describe any app and the AI builds it from scratch.",
  category: "document" as const,
  tags: ["blank", "custom", "ai", "web-sdk", "python"],
  version: "1.0.0",
  thumbnail: null,
  previewUrl: null,
  estimatedSetupMinutes: 0,
  defaultConfig: BLANK_CONFIG,
};
