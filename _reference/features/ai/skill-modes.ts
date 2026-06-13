export type SkillModeId =
  | "auto"
  | "nutrient-web-sdk"
  | "document-processor-api"
  | "pdf-to-markdown"
  | "nutrient-document-engine"
  | "nutrient-ai-assistant"
  | "nutrient-document-authoring"
  | "nutrient-python-sdk"
  | "nutrient-nodejs-server-sdk"
  | "nutrient-java-server-sdk"
  | "nutrient-dotnet-server-sdk"
  | "nutrient-ios-sdk"
  | "nutrient-android-sdk"
  | "nutrient-react-native-sdk"
  | "nutrient-flutter-sdk"
  | "nutrient-maui-sdk";

export interface SkillModeOption {
  id: SkillModeId;
  command: string;
  label: string;
  plugin: string;
  skill: string;
  description: string;
}

export const DEFAULT_SKILL_MODE: SkillModeId = "nutrient-web-sdk";

export const SKILL_MODE_OPTIONS: SkillModeOption[] = [
  {
    id: "auto",
    command: "/auto",
    label: "Auto",
    plugin: "nucode",
    skill: "auto",
    description: "Infer the right Nutrient product context from the request.",
  },
  {
    id: "nutrient-web-sdk",
    command: "/web-sdk",
    label: "Web SDK",
    plugin: "nutrient-sdk-dev",
    skill: "nutrient-web-sdk",
    description: "Build browser PDF viewer, toolbar, annotation, form, signature, redaction, and comparison workflows.",
  },
  {
    id: "document-processor-api",
    command: "/dws",
    label: "DWS",
    plugin: "nutrient-dws",
    skill: "document-processor-api",
    description: "Convert, extract, transform, and secure documents through Nutrient Document Web Services.",
  },
  {
    id: "pdf-to-markdown",
    command: "/pdf-md",
    label: "PDF to MD",
    plugin: "pdf-to-markdown",
    skill: "pdf-to-markdown",
    description: "Extract PDF text into structured semantic Markdown.",
  },
  {
    id: "nutrient-document-engine",
    command: "/doc-engine",
    label: "Doc Engine",
    plugin: "nutrient-sdk-dev",
    skill: "nutrient-document-engine",
    description: "Build self-hosted Document Engine REST/Docker workflows.",
  },
  {
    id: "nutrient-ai-assistant",
    command: "/ai-assistant",
    label: "AI Assistant",
    plugin: "nutrient-sdk-dev",
    skill: "nutrient-ai-assistant",
    description: "Wire Nutrient AI Assistant and document chat with backend JWT support.",
  },
  {
    id: "nutrient-document-authoring",
    command: "/authoring",
    label: "Authoring",
    plugin: "nutrient-sdk-dev",
    skill: "nutrient-document-authoring",
    description: "Build DOCX/document authoring and editing experiences.",
  },
  {
    id: "nutrient-python-sdk",
    command: "/python-sdk",
    label: "Python SDK",
    plugin: "nutrient-sdk-dev",
    skill: "nutrient-python-sdk",
    description: "Build Python scripts and server workflows for PDF processing.",
  },
  {
    id: "nutrient-nodejs-server-sdk",
    command: "/node-sdk",
    label: "Node SDK",
    plugin: "nutrient-sdk-dev",
    skill: "nutrient-nodejs-server-sdk",
    description: "Build Node.js server-side PDF processing workflows.",
  },
  {
    id: "nutrient-java-server-sdk",
    command: "/java-sdk",
    label: "Java SDK",
    plugin: "nutrient-sdk-dev",
    skill: "nutrient-java-server-sdk",
    description: "Build Java server-side PDF processing workflows.",
  },
  {
    id: "nutrient-dotnet-server-sdk",
    command: "/dotnet-sdk",
    label: ".NET SDK",
    plugin: "nutrient-sdk-dev",
    skill: "nutrient-dotnet-server-sdk",
    description: "Build .NET server-side PDF processing workflows.",
  },
  {
    id: "nutrient-ios-sdk",
    command: "/ios-sdk",
    label: "iOS SDK",
    plugin: "nutrient-sdk-dev",
    skill: "nutrient-ios-sdk",
    description: "Build native iOS/macOS Nutrient SDK integrations.",
  },
  {
    id: "nutrient-android-sdk",
    command: "/android-sdk",
    label: "Android SDK",
    plugin: "nutrient-sdk-dev",
    skill: "nutrient-android-sdk",
    description: "Build native Android Nutrient SDK integrations.",
  },
  {
    id: "nutrient-react-native-sdk",
    command: "/rn-sdk",
    label: "React Native",
    plugin: "nutrient-sdk-dev",
    skill: "nutrient-react-native-sdk",
    description: "Build React Native Nutrient SDK integrations.",
  },
  {
    id: "nutrient-flutter-sdk",
    command: "/flutter-sdk",
    label: "Flutter SDK",
    plugin: "nutrient-sdk-dev",
    skill: "nutrient-flutter-sdk",
    description: "Build Flutter Nutrient SDK integrations.",
  },
  {
    id: "nutrient-maui-sdk",
    command: "/maui-sdk",
    label: "MAUI SDK",
    plugin: "nutrient-sdk-dev",
    skill: "nutrient-maui-sdk",
    description: "Build .NET MAUI Nutrient SDK integrations.",
  },
];

const OPTION_BY_ID = new Map(SKILL_MODE_OPTIONS.map((option) => [option.id, option]));

const COMMAND_ALIASES: Record<string, SkillModeId> = {
  auto: "auto",
  sdk: "nutrient-web-sdk",
  "web-sdk": "nutrient-web-sdk",
  websdk: "nutrient-web-sdk",
  viewer: "nutrient-web-sdk",
  dws: "document-processor-api",
  "document-processor-api": "document-processor-api",
  processor: "document-processor-api",
  "pdf-md": "pdf-to-markdown",
  "pdf-markdown": "pdf-to-markdown",
  "pdf-to-markdown": "pdf-to-markdown",
  markdown: "pdf-to-markdown",
  "doc-engine": "nutrient-document-engine",
  "document-engine": "nutrient-document-engine",
  "ai-assistant": "nutrient-ai-assistant",
  authoring: "nutrient-document-authoring",
  "document-authoring": "nutrient-document-authoring",
  "python-sdk": "nutrient-python-sdk",
  python: "nutrient-python-sdk",
  "node-sdk": "nutrient-nodejs-server-sdk",
  node: "nutrient-nodejs-server-sdk",
  "java-sdk": "nutrient-java-server-sdk",
  java: "nutrient-java-server-sdk",
  "dotnet-sdk": "nutrient-dotnet-server-sdk",
  "net-sdk": "nutrient-dotnet-server-sdk",
  dotnet: "nutrient-dotnet-server-sdk",
  "ios-sdk": "nutrient-ios-sdk",
  ios: "nutrient-ios-sdk",
  "android-sdk": "nutrient-android-sdk",
  android: "nutrient-android-sdk",
  "rn-sdk": "nutrient-react-native-sdk",
  "react-native": "nutrient-react-native-sdk",
  "react-native-sdk": "nutrient-react-native-sdk",
  "flutter-sdk": "nutrient-flutter-sdk",
  flutter: "nutrient-flutter-sdk",
  "maui-sdk": "nutrient-maui-sdk",
  maui: "nutrient-maui-sdk",
};

const SKILL_CONTEXTS: Record<Exclude<SkillModeId, "auto">, string> = {
  "nutrient-web-sdk": `Nutrient SDK skill: nutrient-web-sdk
- Use the generated src/NutrientViewer.tsx wrapper for browser previews. It loads window.NutrientViewer from the CDN; never import the Web SDK npm package inside generated React code.
- Valid toolbar item examples: highlighter, text-highlighter, ink, ink-eraser, note, signature, form-creator, redact-text-highlighter, redact-rectangle, document-comparison, measure, export-pdf.
- Do not use invalid aliases like highlight, draw, distance, perimeter, separator, apply-redactions, or sidebar-custom.
- Viewer parents must have explicit height and width before load.
- For custom buttons, expose instance/module through onInstanceReady and clear refs through onInstanceUnload.`,

  "document-processor-api": `Nutrient DWS skill: document-processor-api
- Use Nutrient Document Web Services for cloud document processing: conversion, OCR, extraction, redaction, watermarking, signing, merging, splitting, and transformations.
- Never expose DWS credentials in browser code. Put API calls in a server route, backend file, or documented service adapter.
- Generated browser apps should include a local async fallback/simulation so the preview works without credentials.
- Use environment variables such as NUTRIENT_DWS_API_KEY or NUTRIENT_API_KEY and document setup in NUTRIENTWEBBUILDER.md.
- For user uploads, keep file metadata, processing status, result download links, and errors visible in UI state.`,

  "pdf-to-markdown": `PDF-to-Markdown skill: pdf-to-markdown
- Convert PDF content into structured semantic Markdown: headings, paragraphs, lists, tables where possible, citations/page references when relevant.
- If building a browser preview, add an upload UI and local mocked extraction result so the app remains usable without a backend.
- If implementing real extraction, keep parsing on the server/backend or through DWS. Do not parse secure documents with exposed browser secrets.
- Output should be easy to copy, download, search, and inspect alongside the source PDF.`,

  "nutrient-document-engine": `Nutrient SDK skill: nutrient-document-engine
- Use Document Engine for self-hosted server-side PDF processing, persistent annotations, signing, conversion, OCR, collaboration, and Web SDK backend workflows.
- Prefer Docker Compose or clearly documented server setup when the user asks for real backend behavior.
- Browser previews must use a local service fallback unless credentials and a running Document Engine URL are present.
- Keep backend URLs and JWT/secrets in environment variables; never expose them in generated React components.`,

  "nutrient-ai-assistant": `Nutrient SDK skill: nutrient-ai-assistant
- AI Assistant needs a backend/JWT or Document Engine-style server support. Do not fake a direct browser-only AI Assistant integration with secrets.
- Build a visible document chat workflow, selected-document context, loading/error states, and setup notes.
- If credentials are unavailable, simulate AI response states honestly while keeping the real integration shape documented.`,

  "nutrient-document-authoring": `Nutrient SDK skill: nutrient-document-authoring
- Use Document Authoring for DOCX/document creation and editing workflows, not as a PDF viewer replacement.
- Keep authoring UI distinct from Web SDK PDF viewing.
- Include local preview-safe state and setup notes when a licensed backend or package configuration is required.`,

  "nutrient-python-sdk": `Nutrient SDK skill: nutrient-python-sdk
- Use Python SDK for server-side processing only — never import Python packages into React code.
- Always generate a backend/ folder with backend/main.py (FastAPI) and backend/requirements.txt.
- backend/main.py must implement the standard Nucode backend contract: POST /{operation} endpoints (convert, ocr, extract, redact, watermark) accepting multipart/form-data with file and options fields, returning { result, meta }.
- All secrets and license keys must come from os.environ["NUTRIENT_LICENSE_KEY"] — never hardcode in any file.
- In generated React code, reference the backend via: const NUCODE = (window as { __NUCODE_BACKEND__?: { url: string; token?: string | null } }).__NUCODE_BACKEND__; const BACKEND_BASE_URL = NUCODE?.url ?? import.meta.env.VITE_BACKEND_URL ?? null; const BACKEND_TOKEN = NUCODE?.token ?? import.meta.env.VITE_BACKEND_TOKEN ?? null. Send BACKEND_TOKEN as an "Authorization: Bearer" header on backend fetches when present; if BACKEND_BASE_URL is null, use simulation mode.
- Never hardcode a backend URL or API key in any React component or hook.
- Always include a simulation fallback in the React frontend: detect when the backend is unavailable, return realistic mocked results, and show a visible "Running in simulation mode" banner.
- Include backend setup instructions in NUTRIENTWEBBUILDER.md: how to set NUTRIENT_LICENSE_KEY, run uvicorn, and set VITE_BACKEND_URL for local dev and deployment.`,

  "nutrient-nodejs-server-sdk": `Nutrient SDK skill: nutrient-nodejs-server-sdk
- Use Node.js server code for server-side PDF operations. Never import server SDK packages into React.
- Always generate a backend/ folder with backend/server.js (or backend/server.ts) and backend/package.json.
- backend/server.js must implement the standard Nucode backend contract: POST /{operation} endpoints (convert, ocr, extract, redact, watermark) accepting multipart/form-data, returning { result, meta }.
- All secrets and license keys come from process.env.NUTRIENT_LICENSE_KEY — never hardcode.
- In generated React code, reference the backend via: const NUCODE = (window as { __NUCODE_BACKEND__?: { url: string; token?: string | null } }).__NUCODE_BACKEND__; const BACKEND_BASE_URL = NUCODE?.url ?? import.meta.env.VITE_BACKEND_URL ?? null; const BACKEND_TOKEN = NUCODE?.token ?? import.meta.env.VITE_BACKEND_TOKEN ?? null. Send BACKEND_TOKEN as an "Authorization: Bearer" header on backend fetches when present; if BACKEND_BASE_URL is null, use simulation mode.
- Always include a simulation fallback in the React frontend so the preview works without a running backend.
- Include setup instructions in NUTRIENTWEBBUILDER.md.`,

  "nutrient-java-server-sdk": `Nutrient SDK skill: nutrient-java-server-sdk
- Use Java/Spring server-side files for Java SDK workflows. Do not import Java SDKs into browser code.
- Generate backend/src/main/java/ files with a Spring Boot controller implementing the standard Nucode backend contract: POST /{operation} endpoints accepting multipart, returning { result, meta }.
- All license keys come from application.properties or environment variables — never hardcode.
- In generated React code, reference the backend via: const NUCODE = (window as { __NUCODE_BACKEND__?: { url: string; token?: string | null } }).__NUCODE_BACKEND__; const BACKEND_BASE_URL = NUCODE?.url ?? import.meta.env.VITE_BACKEND_URL ?? null; const BACKEND_TOKEN = NUCODE?.token ?? import.meta.env.VITE_BACKEND_TOKEN ?? null. Send BACKEND_TOKEN as an "Authorization: Bearer" header on backend fetches when present; if BACKEND_BASE_URL is null, use simulation mode.
- Always include a preview-safe simulation fallback in the React frontend.
- Include Maven/Gradle setup and VITE_BACKEND_URL instructions in NUTRIENTWEBBUILDER.md.`,

  "nutrient-dotnet-server-sdk": `Nutrient SDK skill: nutrient-dotnet-server-sdk
- Use .NET server-side files for .NET SDK workflows. Do not import .NET SDKs into browser code.
- Generate backend/ files with an ASP.NET Core controller implementing the standard Nucode backend contract: POST /{operation} endpoints accepting multipart, returning { result, meta }.
- All license keys come from appsettings.json or environment variables — never hardcode.
- In generated React code, reference the backend via: const NUCODE = (window as { __NUCODE_BACKEND__?: { url: string; token?: string | null } }).__NUCODE_BACKEND__; const BACKEND_BASE_URL = NUCODE?.url ?? import.meta.env.VITE_BACKEND_URL ?? null; const BACKEND_TOKEN = NUCODE?.token ?? import.meta.env.VITE_BACKEND_TOKEN ?? null. Send BACKEND_TOKEN as an "Authorization: Bearer" header on backend fetches when present; if BACKEND_BASE_URL is null, use simulation mode.
- Always include a preview-safe simulation fallback in the React frontend.
- Include dotnet run setup and VITE_BACKEND_URL instructions in NUTRIENTWEBBUILDER.md.`,

  "nutrient-ios-sdk": `Nutrient SDK skill: nutrient-ios-sdk
- Use Swift/iOS project snippets and setup notes for iOS SDK work. Do not pretend iOS SDK code runs in the React preview.
- If asked to build a demo app in this workspace, create a browser planning/demo surface plus native code files or README instructions.`,

  "nutrient-android-sdk": `Nutrient SDK skill: nutrient-android-sdk
- Use Kotlin/Java Android project snippets and setup notes for Android SDK work. Do not pretend Android SDK code runs in the React preview.
- If asked to build a demo app in this workspace, create a browser planning/demo surface plus native code files or README instructions.`,

  "nutrient-react-native-sdk": `Nutrient SDK skill: nutrient-react-native-sdk
- Use React Native integration patterns for mobile PDF workflows. Keep browser preview behavior separate from native runtime code.
- Include setup notes and preview-safe UI when editing this React/Vite workspace.`,

  "nutrient-flutter-sdk": `Nutrient SDK skill: nutrient-flutter-sdk
- Use Flutter/Dart integration patterns for mobile PDF workflows. Keep browser preview behavior separate from native runtime code.
- Include setup notes and preview-safe UI when editing this React/Vite workspace.`,

  "nutrient-maui-sdk": `Nutrient SDK skill: nutrient-maui-sdk
- Use .NET MAUI integration patterns for mobile/desktop PDF workflows. Keep browser preview behavior separate from native runtime code.
- Include setup notes and preview-safe UI when editing this React/Vite workspace.`,
};

export function getSkillModeOption(id: SkillModeId): SkillModeOption {
  return OPTION_BY_ID.get(id) ?? SKILL_MODE_OPTIONS[0];
}

export function resolveSkillModeFromPrompt(message: string, fallback: SkillModeId = "auto") {
  const trimmed = message.trim();
  const commandMatch = trimmed.match(/^\/([a-z0-9-]+)\b/i);
  if (commandMatch) {
    const explicit = COMMAND_ALIASES[commandMatch[1].toLowerCase()] ?? fallback;
    return {
      id: explicit,
      explicit: true,
      command: commandMatch[0],
      cleanedMessage: trimmed.slice(commandMatch[0].length).trim() || trimmed,
    };
  }

  return {
    id: fallback,
    explicit: false,
    command: "",
    cleanedMessage: trimmed,
  };
}

export function inferSkillModeFromPrompt(message: string): SkillModeId {
  const lower = message.toLowerCase();
  if (/\b(dws|document web services|processor api|cloud document processing|convert pdf|ocr|watermark|merge pdf|split pdf)\b/.test(lower)) {
    return "document-processor-api";
  }
  if (/\b(pdf to markdown|pdf-to-markdown|markdown extraction|extract.*markdown)\b/.test(lower)) {
    return "pdf-to-markdown";
  }
  if (/\b(document engine|self-hosted|self hosted)\b/.test(lower)) return "nutrient-document-engine";
  if (/\b(ai assistant|chat with.*document|document chat)\b/.test(lower)) return "nutrient-ai-assistant";
  if (/\b(document authoring|docx|word editor)\b/.test(lower)) return "nutrient-document-authoring";
  if (/\b(python sdk|python script)\b/.test(lower)) return "nutrient-python-sdk";
  if (/\b(node sdk|nodejs|node\.js)\b/.test(lower)) return "nutrient-nodejs-server-sdk";
  if (/\b(java sdk|spring)\b/.test(lower)) return "nutrient-java-server-sdk";
  if (/\b(\.net sdk|dotnet|c#)\b/.test(lower)) return "nutrient-dotnet-server-sdk";
  if (/\b(ios sdk|swift|objective-c)\b/.test(lower)) return "nutrient-ios-sdk";
  if (/\b(android sdk|kotlin|jetpack)\b/.test(lower)) return "nutrient-android-sdk";
  if (/\b(react native|rn sdk)\b/.test(lower)) return "nutrient-react-native-sdk";
  if (/\b(flutter sdk|dart)\b/.test(lower)) return "nutrient-flutter-sdk";
  if (/\b(maui sdk|\.net maui)\b/.test(lower)) return "nutrient-maui-sdk";
  if (/\b(web sdk|viewer|toolbar|annotation|redaction|signature|nutrientviewer)\b/.test(lower)) return "nutrient-web-sdk";
  return "auto";
}

export function buildSkillModePromptPrefix(message: string, selectedMode: SkillModeId): string {
  if (selectedMode === "auto" || message.trim().startsWith("/")) return message;
  const option = getSkillModeOption(selectedMode);
  return `${option.command} ${message.trim()}`;
}

export function buildSkillModeContext(
  message: string,
  defaultMode: SkillModeId = DEFAULT_SKILL_MODE
): { context: string; cleanedMessage: string; mode: SkillModeId } {
  const resolved = resolveSkillModeFromPrompt(message);
  const inferred = resolved.id === "auto" ? inferSkillModeFromPrompt(resolved.cleanedMessage) : resolved.id;
  const mode = inferred === "auto" ? defaultMode : inferred;

  if (mode === "auto") {
    return { context: "", cleanedMessage: resolved.cleanedMessage, mode: "auto" };
  }

  const option = getSkillModeOption(mode);
  const body = SKILL_CONTEXTS[mode];
  return {
    mode,
    cleanedMessage: resolved.cleanedMessage,
    context: [
      `## ACTIVE NUTRIENT SKILL MODE: ${option.label}`,
      `Plugin: ${option.plugin}`,
      `Skill: ${option.skill}`,
      `Command: ${option.command}`,
      option.description,
      "",
      body,
    ].join("\n"),
  };
}
