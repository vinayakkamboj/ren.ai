import type { AIPatchPlan, FilePatch, PreviewConfig, ProjectFile } from "@/types";
import { buildPreviewSourceComment } from "@/lib/project-files/source-preview";
import { NUTRIENT_WEB_DEMO_DOCUMENT_URL } from "@/lib/nutrient/sdk-version";

type JsonRecord = Record<string, unknown>;

type ProjectPlan = {
  brand?: {
    name?: string;
    tagline?: string;
    industry?: string;
  };
  design?: {
    accent?: string;
    accentLight?: string;
    accentDark?: string;
    layout?: string;
    navigationPattern?: string;
    layoutSignature?: string;
    paletteFormula?: string;
    designBrief?: string;
  };
  architecture?: {
    scope?: string;
    dataPersistence?: string;
  };
  pages?: Array<{
    component?: string;
    nav?: string;
    desc?: string;
  }>;
  nutrient?: {
    page?: string;
    capability?: string;
    toolbar?: string[];
    description?: string;
    connection?: string;
  };
  data?: {
    entity?: string;
    fields?: string[];
    statuses?: string[];
    count?: number;
  };
};

function tryParseJson<T>(content: string | undefined): T | null {
  if (!content) return null;
  try {
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function extractRequestedName(message: string): string | null {
  const match = message.match(/\b(?:name it|call it|named|title it)\s+([a-z0-9][a-z0-9\s-]{1,40})/i);
  if (!match) return null;
  const cleaned = match[1]
    .replace(/\b(?:and|with|also|please|add|make|create|build)\b[\s\S]*$/i, "")
    .replace(/[.,;:!?]+$/g, "")
    .trim();
  return cleaned ? titleCase(cleaned) : null;
}

function hasAny(message: string, words: string[]): boolean {
  const normalized = message.toLowerCase();
  return words.some((word) => normalized.includes(word));
}

function wantsPdfModal(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    hasAny(normalized, ["popup", "pop up", "modal", "open it", "pdf view", "open pdf", "viewer opens", "check records"]) ||
    (hasAny(normalized, ["button", "click"]) && hasAny(normalized, ["pdf", "viewer", "records", "document"]))
  );
}

function parseProjectPlan(rawPlan?: string | null): ProjectPlan | null {
  if (!rawPlan) return null;
  try {
    return JSON.parse(rawPlan) as ProjectPlan;
  } catch {
    return null;
  }
}

function navForNutrientPage(plan: ProjectPlan): string {
  const pages = plan.pages ?? [];
  const nutrientPage = plan.nutrient?.page;
  const direct = pages.find((page) =>
    page.component === nutrientPage || page.nav === nutrientPage
  )?.nav;
  if (direct) return direct;
  const docLike = pages.find((page) =>
    /doc|pdf|review|assistant|contract|packet|evidence|chart|invoice|form|sign|redact/i.test(
      `${page.component ?? ""} ${page.nav ?? ""} ${page.desc ?? ""}`
    )
  )?.nav;
  return docLike || pages[1]?.nav || "Documents";
}

function titleFromEntity(entity: string, index: number, assistantLike: boolean) {
  if (assistantLike) {
    return [
      "Vendor agreement packet",
      "Security policy handbook",
      "Clinical intake summary",
      "Quarterly compliance evidence",
    ][index] ?? `${entity} ${index + 1}`;
  }
  return `${entity} ${String(index + 1).padStart(3, "0")}`;
}

function buildPlanPreviewData(
  plan: ProjectPlan,
  message: string,
  files: ProjectFile[]
): JsonRecord | null {
  const brandName = plan.brand?.name?.trim();
  if (!brandName) return null;

  const fileMap = new Map(files.map((file) => [file.path, file.content]));
  const documents = tryParseJson<Array<{ name?: string; description?: string }>>(fileMap.get("config/documents.json")) ?? [];
  const firstDoc = documents[0];
  const pages = (plan.pages ?? []).map((page) => page.nav).filter(Boolean) as string[];
  const navigation = pages.length ? pages : ["Home", navForNutrientPage(plan), "Audit", "Settings"];
  const activeNav = navForNutrientPage(plan);
  const entity = plan.data?.entity || "Document";
  const statuses = plan.data?.statuses?.length
    ? plan.data.statuses
    : ["Needs review", "In progress", "Ready", "Approved"];
  const count = Math.max(3, Math.min(12, Number(plan.data?.count ?? 6)));
  const assistantLike = /assistant|question|answer|chat|citation|docmind|ai/i.test(
    `${message} ${brandName} ${plan.nutrient?.capability ?? ""} ${plan.nutrient?.description ?? ""}`
  );
  const placement = plan.design?.navigationPattern === "viewer-workspace" ? "full" : "right";

  const items = Array.from({ length: Math.min(count, 5) }, (_, index) => {
    const status = statuses[index % statuses.length] ?? "Ready";
    const title = titleFromEntity(entity, index, assistantLike);
    return {
      id: `${entity.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "record"}-${index + 1}`,
      title,
      subtitle: firstDoc?.name || `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`,
      meta: assistantLike
        ? `Questions: ${index + 2} | Citations ready`
        : `Owner: ${["Review team", "Operations", "Legal ops", "Compliance"][index % 4]} | ${plan.nutrient?.capability || "review"}`,
      status,
      tone: index === 0 ? "warning" : index === 1 ? "positive" : index === 2 ? "neutral" : "critical",
    };
  });

  return {
    mode: "app",
    appName: brandName,
    tagline: plan.brand?.tagline || `${entity} workflow powered by Nutrient`,
    accentColor: plan.design?.accentLight || plan.design?.accent || "#0f766e",
    activeNav,
    navigation,
    badges: [
      "Nutrient Web SDK",
      plan.nutrient?.capability ? `${plan.nutrient.capability} workflow` : "Document workflow",
    ],
    heroTitle: assistantLike
      ? `Ask grounded questions across ${entity.toLowerCase()}s with source PDFs beside every answer.`
      : `${brandName} connects ${entity.toLowerCase()} operations to the right document workflow.`,
    heroDescription:
      plan.nutrient?.connection ||
      plan.nutrient?.description ||
      "Selecting a business record updates the Nutrient workspace, document actions update workflow state, and audit activity stays tied to the product.",
    integrationLabel: plan.nutrient?.description || `${entity} document workspace`,
    shellPattern: plan.design?.navigationPattern || plan.design?.layout || "split-workbench",
    layoutSignature: plan.design?.layoutSignature || "Plan-driven generated fallback, not the generic DocuOps shell",
    startPage: activeNav,
    metrics: [
      { label: `${entity}s`, value: String(count), trend: plan.architecture?.scope || "planned build", tone: "positive" },
      { label: "Document workflow", value: plan.nutrient?.capability || "Review", trend: activeNav, tone: "neutral" },
      { label: "Persistence", value: plan.architecture?.dataPersistence || "Local state", trend: "wired through services", tone: "warning" },
    ],
    records: {
      title: assistantLike ? "Source document library" : `${entity} work queue`,
      description:
        plan.nutrient?.connection ||
        `Select a ${entity.toLowerCase()} to update the Nutrient document workspace and workflow actions.`,
      items,
    },
    workflow: {
      title: assistantLike ? "Document assistant workflow" : `${entity} document workflow`,
      description: plan.nutrient?.description || "Nutrient is embedded where document work belongs.",
      steps: [
        { id: "select", title: `Select ${entity}`, subtitle: "Choose the business record that owns the document context", status: "Ready", tone: "positive" },
        { id: "review", title: plan.nutrient?.capability || "Review PDF", subtitle: "Open the relevant source document in Nutrient", status: "Active", tone: "warning" },
        { id: "act", title: assistantLike ? "Ask and cite" : "Run workflow action", subtitle: "Update product state from document decisions", status: "Pending", tone: "neutral" },
        { id: "audit", title: "Write audit trail", subtitle: "Store decision, export, or validation activity", status: "Queued", tone: "neutral" },
      ],
    },
    viewer: {
      title: assistantLike ? "Source PDF context" : `${entity} PDF workspace`,
      subtitle: plan.nutrient?.description || "Nutrient Web SDK connected to selected records",
      documentLabel: firstDoc?.name || `${entity.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "document"}-source.pdf`,
      placement,
      height: "560px",
    },
    actions: assistantLike
      ? [
          { label: "Ask document question", variant: "primary" },
          { label: "Save cited answer", variant: "secondary" },
          { label: "Export Q&A packet", variant: "secondary" },
        ]
      : [
          { label: `Open ${entity} PDF`, variant: "primary" },
          { label: `Update ${entity} status`, variant: "secondary" },
          { label: "Export audit PDF", variant: "secondary" },
        ],
    modal: {
      triggerLabel: assistantLike ? "Open source PDF" : "Open document workspace",
      title: assistantLike ? "Source PDF context" : `${entity} document workspace`,
      description: plan.nutrient?.description || "Review the selected document in Nutrient Web SDK.",
    },
  };
}

function buildPreviewData(message: string, files: ProjectFile[], rawProjectPlan?: string | null) {
  const plannedPreview = buildPlanPreviewData(parseProjectPlan(rawProjectPlan) ?? {}, message, files);
  if (plannedPreview) return plannedPreview;

  const fileMap = new Map(files.map((file) => [file.path, file.content]));
  const theme = tryParseJson<JsonRecord>(fileMap.get("config/theme.json")) ?? {};
  const content = tryParseJson<JsonRecord>(fileMap.get("config/content.json")) ?? {};
  const documents = tryParseJson<Array<{ name?: string; description?: string }>>(fileMap.get("config/documents.json")) ?? [];
  const firstDoc = documents[0];

  const requestedName = extractRequestedName(message);
  const wantsModal = wantsPdfModal(message);
  const wantsAnnotations = hasAny(message, ["annotation", "annotations", "annotate", "anotation", "markup", "highlight"]);
  const placement = wantsModal ? "modal" : "right";
  const defaultName = String(theme.companyName || content.demoTitle || "DocuOps");
  const documentLabel = firstDoc?.name || "Nutrient Web SDK Demo PDF";

  const makeViewer = (title: string, subtitle: string, fallbackLabel: string) => ({
    title,
    subtitle,
    documentLabel: firstDoc?.name || fallbackLabel,
    placement,
    height: "560px",
  });

  const scenarios = [
    {
      match: hasAny(message, ["assistant", "docmind", "question", "answer", "chat", "citation", "source document"]),
      appName: "DocMind",
      tagline: "AI document answers with source PDFs powered by Nutrient",
      accentColor: "#0f766e",
      activeNav: "Assistant",
      navigation: ["Assistant", "Sources", "History", "Exports"],
      badges: ["Nutrient Web SDK", "AI document assistant"],
      heroTitle: "Ask questions against source PDFs and keep every answer grounded in document context.",
      heroDescription: "The selected source document drives the Nutrient viewer, question history, cited answer panel, and exportable audit packet.",
      integrationLabel: "Source PDF context",
      shellPattern: "split-workbench",
      startPage: "Assistant",
      metrics: [
        { label: "Source docs", value: "8", trend: "Indexed for Q&A", tone: "positive" },
        { label: "Questions asked", value: "24", trend: "6 with saved citations", tone: "neutral" },
        { label: "Review gaps", value: "3", trend: "Needs human validation", tone: "warning" },
      ],
      records: {
        title: "Source document library",
        description: "Select a document to update the Nutrient PDF context and ask grounded questions against it.",
        items: [
          { id: "docmind-1", title: "Vendor agreement packet", subtitle: "vendor-agreement.pdf", meta: "Questions: 8 | Citations ready", status: "Ready", tone: "positive" },
          { id: "docmind-2", title: "Security policy handbook", subtitle: "security-policy.pdf", meta: "Questions: 5 | Needs validation", status: "Review", tone: "warning" },
          { id: "docmind-3", title: "Compliance evidence bundle", subtitle: "evidence-bundle.pdf", meta: "Questions: 11 | Exportable", status: "Cited", tone: "neutral" },
        ],
      },
      workflow: {
        title: "Document assistant workflow",
        description: "Select a source PDF, ask a question, save cited answers, and export a review packet.",
        steps: [
          { id: "source", title: "Select source", subtitle: "Choose the document that owns the context", status: "Ready", tone: "positive" },
          { id: "ask", title: "Ask question", subtitle: "Use saved question history and source context", status: "Active", tone: "warning" },
          { id: "cite", title: "Save citation", subtitle: "Tie answer snippets back to the PDF", status: "Pending", tone: "neutral" },
          { id: "export", title: "Export answer packet", subtitle: "Create a PDF-ready audit bundle", status: "Queued", tone: "neutral" },
        ],
      },
      viewer: makeViewer("Source PDF context", "Nutrient viewer connected to the selected source document", "source-document.pdf"),
      actions: [
        { label: "Ask document question", variant: "primary" },
        { label: "Save cited answer", variant: "secondary" },
        { label: "Export Q&A packet", variant: "secondary" },
      ],
      modal: { triggerLabel: "Open source PDF", title: "Source PDF context", description: "Review the selected source document in Nutrient Web SDK." },
    },
    {
      match: hasAny(message, ["patient", "patirnet", "patinet", "pateint", "medical", "health", "record", "clinic"]),
      appName: "MedPath Review",
      tagline: "Clinical document review powered by Nutrient Web SDK",
      accentColor: "#059669",
      activeNav: "Patient Records",
      navigation: ["Dashboard", "Patient Records", "Approvals", "Audit"],
      badges: ["Nutrient Web SDK", wantsAnnotations ? "Annotations enabled" : "Clinical PDF review"],
      heroTitle: "Review patient chart PDFs without leaving the care workflow.",
      heroDescription: "Patient packets, consent forms, annotations, signatures, and audit-ready exports are handled in one Nutrient-powered review surface.",
      integrationLabel: "Clinical PDF workspace",
      metrics: [
        { label: "Records awaiting review", value: "23", trend: "8 need signoff", tone: "warning" },
        { label: "Annotated today", value: "41", trend: "+12 vs yesterday", tone: "positive" },
        { label: "Audit-ready packets", value: "91%", trend: "Export queue healthy", tone: "positive" },
      ],
      records: {
        title: "Patient PDF packets",
        description: "Select a patient packet, review the PDF, annotate clinical notes, and approve the record.",
        items: [
          { id: "pt-1001", title: "Maya Patel", subtitle: "mri-referral-packet.pdf", meta: "Owner: Dr. Singh | Due 2:30 PM", status: "Needs annotation", tone: "warning" },
          { id: "pt-1002", title: "Owen Brooks", subtitle: "discharge-summary-insurance.pdf", meta: "Owner: Care team | Due today", status: "Ready to export", tone: "positive" },
          { id: "pt-1003", title: "Leah Chen", subtitle: "cardiology-intake-bundle.pdf", meta: "Owner: Nurse review | SLA 1h", status: "Consent signature", tone: "critical" },
        ],
      },
      workflow: {
        title: "Record review workflow",
        description: "The app routes patient packets through PDF review, annotations, signatures, and final export.",
        steps: [
          { id: "intake", title: "Intake packet", subtitle: "Receive and classify uploaded PDF records", status: "Done", tone: "positive" },
          { id: "annotate", title: "Annotate findings", subtitle: "Use Nutrient annotation tools for review notes", status: "Ready", tone: "positive" },
          { id: "approve", title: "Approve record", subtitle: "Complete clinical approval workflow", status: "Pending", tone: "warning" },
          { id: "archive", title: "Archive audit copy", subtitle: "Export final PDF for compliance", status: "Queued", tone: "neutral" },
        ],
      },
      viewer: makeViewer("Patient PDF review", "Embedded Nutrient Web SDK viewer for the selected patient packet", "clinical-packet.pdf"),
      actions: [
        { label: "Open patient PDF", variant: "primary" },
        { label: "Request signature", variant: "secondary" },
        { label: "Export audit PDF", variant: "secondary" },
      ],
      modal: { triggerLabel: "Open patient PDF", title: "Patient PDF review", description: "Review the selected patient record in Nutrient Web SDK." },
    },
    {
      match: hasAny(message, ["legal", "law", "contract", "clause", "redaction", "redact", "nda"]),
      appName: "LexVault",
      tagline: "Contract review, redaction, and signature workflows powered by Nutrient",
      accentColor: "#7c3aed",
      activeNav: "Contracts",
      navigation: ["Dashboard", "Contracts", "Redactions", "Signatures", "Audit"],
      badges: ["Nutrient Web SDK", "Redaction workflow"],
      heroTitle: "Move contracts from clause review to signed PDF without leaving the workspace.",
      heroDescription: "Legal teams triage contract packets, inspect clauses in Nutrient, mark redactions, request signatures, and export clean audit copies.",
      integrationLabel: "Contract PDF workspace",
      metrics: [
        { label: "Clauses needing review", value: "18", trend: "5 high-risk", tone: "warning" },
        { label: "Redactions pending", value: "7", trend: "PII queue", tone: "critical" },
        { label: "Ready for signature", value: "12", trend: "3 closing today", tone: "positive" },
      ],
      records: {
        title: "Contract packets",
        description: "Open a packet, review the PDF in Nutrient, mark redactions, and send for signature.",
        items: [
          { id: "ct-204", title: "Northwind MSA", subtitle: "northwind-msa-v4.pdf", meta: "Owner: Priya Shah | Renewal due Fri", status: "Redaction", tone: "critical" },
          { id: "ct-188", title: "Acme DPA", subtitle: "acme-dpa-exhibits.pdf", meta: "Owner: Legal ops | 14 clauses", status: "Clause review", tone: "warning" },
          { id: "ct-177", title: "Vertex Partner NDA", subtitle: "vertex-nda-signed-draft.pdf", meta: "Owner: Sales legal | Counterparty", status: "Signature", tone: "positive" },
        ],
      },
      workflow: {
        title: "Contract processing workflow",
        description: "Nutrient handles PDF review, redaction markup, signature handoff, and final export.",
        steps: [
          { id: "review", title: "Review clauses", subtitle: "Search and inspect the contract packet", status: "Ready", tone: "positive" },
          { id: "redact", title: "Mark redactions", subtitle: "Use Nutrient redaction tools for sensitive terms", status: "Pending", tone: "warning" },
          { id: "sign", title: "Request signature", subtitle: "Move approved PDF to signature handoff", status: "Queued", tone: "neutral" },
          { id: "export", title: "Export clean copy", subtitle: "Download the final audit PDF", status: "Ready", tone: "positive" },
        ],
      },
      viewer: makeViewer("Contract PDF review", "Nutrient redaction and signature tools for the selected packet", documentLabel),
      actions: [
        { label: "Mark redactions", variant: "primary" },
        { label: "Request signature", variant: "secondary" },
        { label: "Export clean PDF", variant: "secondary" },
      ],
      modal: { triggerLabel: "Open contract PDF", title: "Contract PDF review", description: "Review, redact, and prepare this contract in Nutrient Web SDK." },
    },
    {
      match: hasAny(message, ["finance", "bank", "banking", "loan", "mortgage", "underwriting", "invoice", "payment", "insurance", "claim", "claims", "adjuster"]),
      appName: hasAny(message, ["insurance", "claim", "claims", "adjuster"]) ? "ClaimDesk" : "ClearLedger",
      tagline: "Packet review and document processing powered by Nutrient Web SDK",
      accentColor: hasAny(message, ["insurance", "claim", "claims", "adjuster"]) ? "#b45309" : "#047857",
      activeNav: hasAny(message, ["insurance", "claim", "claims", "adjuster"]) ? "Claims" : "Underwriting",
      navigation: ["Dashboard", "Applications", "Review", "Exceptions", "Audit"],
      badges: ["Nutrient Web SDK", "Packet processing"],
      heroTitle: "Process application and evidence PDFs from intake to approved export.",
      heroDescription: "The workflow keeps intake data, review decisions, signatures, and export actions next to the embedded Nutrient document workspace.",
      integrationLabel: "Packet PDF workspace",
      metrics: [
        { label: "Packets awaiting review", value: "31", trend: "9 due today", tone: "warning" },
        { label: "Form fields incomplete", value: "14", trend: "Needs follow-up", tone: "critical" },
        { label: "Export-ready packets", value: "22", trend: "+6 today", tone: "positive" },
      ],
      records: {
        title: "Application packets",
        description: "Select a packet, review the PDF in Nutrient, complete required form/signature steps, and export the approved copy.",
        items: [
          { id: "ln-520", title: "Riverbend mortgage application", subtitle: "riverbend-loan-packet.pdf", meta: "Underwriter: Kai Stone | SLA 4h", status: "Form review", tone: "warning" },
          { id: "ln-489", title: "Harbor equipment financing", subtitle: "harbor-financing-docs.pdf", meta: "Owner: Credit team | Missing signature", status: "Signature", tone: "critical" },
          { id: "ln-461", title: "Cobalt working capital", subtitle: "cobalt-financials-packet.pdf", meta: "Owner: Ops review | Ready", status: "Export", tone: "positive" },
        ],
      },
      workflow: {
        title: "Packet processing workflow",
        description: "Nutrient powers the PDF review, form completion, signature checks, and final export steps.",
        steps: [
          { id: "intake", title: "Intake packet", subtitle: "Classify uploaded evidence and forms", status: "Done", tone: "positive" },
          { id: "review", title: "Review PDF evidence", subtitle: "Inspect pages, search, and annotate findings", status: "Ready", tone: "positive" },
          { id: "forms", title: "Complete required fields", subtitle: "Resolve missing form and signature items", status: "Pending", tone: "warning" },
          { id: "export", title: "Export approved PDF", subtitle: "Create the final packet for audit", status: "Queued", tone: "neutral" },
        ],
      },
      viewer: makeViewer("Application packet review", "Embedded Nutrient workspace for PDF review, forms, signatures, and export", documentLabel),
      actions: [
        { label: "Annotate finding", variant: "primary" },
        { label: "Request missing signature", variant: "secondary" },
        { label: "Export approved packet", variant: "secondary" },
      ],
      modal: { triggerLabel: "Open packet PDF", title: "Application packet review", description: "Review and process the selected packet in Nutrient Web SDK." },
    },
    {
      match: hasAny(message, ["construction", "permit", "blueprint", "field", "inspection", "site", "engineering"]),
      appName: "PermitFlow",
      tagline: "Permit packets and blueprint markup powered by Nutrient",
      accentColor: "#ea580c",
      activeNav: "Permit Review",
      navigation: ["Dashboard", "Permits", "Blueprints", "Inspections", "Archive"],
      badges: ["Nutrient Web SDK", "Blueprint markup"],
      heroTitle: "Review permit PDFs and mark up blueprints in the field operations workflow.",
      heroDescription: "Permit reviewers inspect submitted plans, add measurements and annotations in Nutrient, route corrections, and export approved PDF packets.",
      integrationLabel: "Blueprint PDF workspace",
      metrics: [
        { label: "Plan sets awaiting markup", value: "16", trend: "6 priority permits", tone: "warning" },
        { label: "Corrections routed", value: "9", trend: "Architect follow-up", tone: "neutral" },
        { label: "Approved packets", value: "27", trend: "+4 today", tone: "positive" },
      ],
      records: {
        title: "Permit plan sets",
        description: "Select a permit packet, review drawings in Nutrient, add measurements, and export approved plans.",
        items: [
          { id: "pm-331", title: "Tower A structural revision", subtitle: "tower-a-structural-set.pdf", meta: "Reviewer: Lina Ortiz | Due 11:00 AM", status: "Needs markup", tone: "warning" },
          { id: "pm-318", title: "Warehouse fire safety plan", subtitle: "warehouse-fire-safety.pdf", meta: "Owner: Safety review | 42 pages", status: "Measurement", tone: "critical" },
          { id: "pm-304", title: "Retail TI permit packet", subtitle: "retail-ti-permit.pdf", meta: "Owner: Building dept | Ready", status: "Approved", tone: "positive" },
        ],
      },
      workflow: {
        title: "Permit PDF workflow",
        description: "Nutrient handles plan review, annotations, measurement tools, correction routing, and final export.",
        steps: [
          { id: "intake", title: "Receive permit packet", subtitle: "Load submitted PDF drawings", status: "Done", tone: "positive" },
          { id: "markup", title: "Mark up drawings", subtitle: "Use annotation and measurement tools", status: "Ready", tone: "positive" },
          { id: "route", title: "Route corrections", subtitle: "Send issues back to applicants", status: "Pending", tone: "warning" },
          { id: "archive", title: "Export approved set", subtitle: "Archive final stamped PDF", status: "Queued", tone: "neutral" },
        ],
      },
      viewer: makeViewer("Blueprint PDF review", "Nutrient annotation and measurement workspace for the selected permit", "blueprint-plan-set.pdf"),
      actions: [
        { label: "Add markup", variant: "primary" },
        { label: "Route corrections", variant: "secondary" },
        { label: "Export approved set", variant: "secondary" },
      ],
      modal: { triggerLabel: "Open blueprint PDF", title: "Blueprint PDF review", description: "Review and mark up the selected plan set in Nutrient Web SDK." },
    },
    {
      match: hasAny(message, ["hr", "human resources", "onboarding", "employee", "hiring", "policy"]),
      appName: "PeopleFlow",
      tagline: "Onboarding forms, policy PDFs, and signatures powered by Nutrient",
      accentColor: "#be185d",
      activeNav: "Onboarding",
      navigation: ["Dashboard", "Onboarding", "Forms", "Policies", "Audit"],
      badges: ["Nutrient Web SDK", "Forms and signatures"],
      heroTitle: "Move employee onboarding packets from form review to signed PDF.",
      heroDescription: "HR coordinators review employee packets, complete PDF forms, capture signatures, and export audit-ready onboarding files.",
      integrationLabel: "Onboarding PDF workspace",
      metrics: [
        { label: "Packets awaiting signature", value: "19", trend: "7 start Monday", tone: "warning" },
        { label: "Forms incomplete", value: "11", trend: "I-9 and policy gaps", tone: "critical" },
        { label: "Audit-ready files", value: "84%", trend: "+9%", tone: "positive" },
      ],
      records: {
        title: "Employee onboarding packets",
        description: "Open a packet, review forms in Nutrient, capture signatures, and export the final PDF.",
        items: [
          { id: "hr-121", title: "Ari Walker", subtitle: "ari-walker-onboarding.pdf", meta: "Owner: HR ops | Start date Jun 3", status: "Signature", tone: "critical" },
          { id: "hr-114", title: "Jordan Lee", subtitle: "jordan-lee-policy-ack.pdf", meta: "Owner: People team | Due today", status: "Form review", tone: "warning" },
          { id: "hr-109", title: "Sam Rivera", subtitle: "sam-rivera-complete-packet.pdf", meta: "Owner: Compliance | Ready", status: "Export", tone: "positive" },
        ],
      },
      workflow: {
        title: "Onboarding PDF workflow",
        description: "Nutrient powers form completion, signature capture, policy review, and export.",
        steps: [
          { id: "packet", title: "Prepare packet", subtitle: "Load required onboarding PDFs", status: "Done", tone: "positive" },
          { id: "forms", title: "Complete forms", subtitle: "Fill missing PDF fields", status: "Ready", tone: "positive" },
          { id: "sign", title: "Capture signature", subtitle: "Route policy acknowledgements", status: "Pending", tone: "warning" },
          { id: "export", title: "Export final packet", subtitle: "Archive audit-ready PDF", status: "Queued", tone: "neutral" },
        ],
      },
      viewer: makeViewer("Onboarding PDF review", "Nutrient forms and signature workspace for the selected employee packet", "employee-onboarding-packet.pdf"),
      actions: [
        { label: "Complete form fields", variant: "primary" },
        { label: "Request signature", variant: "secondary" },
        { label: "Export onboarding PDF", variant: "secondary" },
      ],
      modal: { triggerLabel: "Open onboarding PDF", title: "Onboarding PDF review", description: "Review forms and signatures in Nutrient Web SDK." },
    },
  ];

  const fallback = {
    match: true,
    appName: defaultName === "My App" ? "DocuOps" : defaultName,
    tagline: "Document processing workspace powered by Nutrient Web SDK",
    accentColor: "#0f766e",
    activeNav: "Review Queue",
    navigation: ["Dashboard", "Review Queue", "Processing", "Approvals", "Audit"],
    badges: ["Nutrient Web SDK", wantsAnnotations ? "Annotations enabled" : "PDF processing"],
    heroTitle: "Process business-critical PDF packets from intake to export.",
    heroDescription: "This product workspace keeps document queues, review decisions, PDF processing status, and Nutrient-powered viewer actions in one operational flow.",
    integrationLabel: "PDF processing workspace",
    metrics: [
      { label: "Packets awaiting review", value: "26", trend: "10 due today", tone: "warning" },
      { label: "PDF actions completed", value: "143", trend: "Annotations, signatures, exports", tone: "positive" },
      { label: "Audit exceptions", value: "5", trend: "Needs owner review", tone: "critical" },
    ],
    records: {
      title: "Document processing queue",
      description: "Select a packet, inspect the PDF in Nutrient, resolve processing tasks, and export the final document.",
      items: [
        { id: "doc-1", title: "Vendor onboarding packet", subtitle: "vendor-onboarding-forms.pdf", meta: "Owner: Operations | Due 1:00 PM", status: "Form review", tone: "warning" },
        { id: "doc-2", title: "Compliance evidence bundle", subtitle: "soc2-evidence-packet.pdf", meta: "Owner: GRC team | Audit export", status: "Export ready", tone: "positive" },
        { id: "doc-3", title: "Customer agreement packet", subtitle: "customer-agreement-redline.pdf", meta: "Owner: Revenue ops | Signature gap", status: "Signature", tone: "critical" },
      ],
    },
    workflow: {
      title: "PDF processing workflow",
      description: "The embedded Nutrient workspace sits inside the product flow for review, processing, approval, and export.",
      steps: [
        { id: "upload", title: "Upload document", subtitle: "Load the PDF into the review queue", status: "Done", tone: "positive" },
        { id: "process", title: "Process PDF tasks", subtitle: "Review forms, annotations, signatures, or redactions in Nutrient", status: "Ready", tone: "positive" },
        { id: "approve", title: "Approve or route", subtitle: "Move the packet to the next owner", status: "Pending", tone: "warning" },
        { id: "export", title: "Export final PDF", subtitle: "Create the final audit-ready file", status: "Queued", tone: "neutral" },
      ],
    },
    viewer: makeViewer("PDF processing review", "Embedded Nutrient Web SDK viewer for the selected document packet", "document-processing-packet.pdf"),
    actions: [
      { label: "Resolve PDF tasks", variant: "primary" },
      { label: "Approve packet", variant: "secondary" },
      { label: "Export final PDF", variant: "secondary" },
    ],
    modal: { triggerLabel: "Open PDF workspace", title: "PDF processing review", description: "Open the selected packet in Nutrient Web SDK." },
  };

  const scenario = scenarios.find((item) => item.match) ?? fallback;
  const { match: _match, ...scenarioPreview } = scenario;
  return {
    mode: "app",
    ...scenarioPreview,
    appName: requestedName || scenarioPreview.appName,
  };
}

function buildFallbackAppSource(preview: JsonRecord) {
  return `import { useState } from "react";
import { NutrientViewer } from "./NutrientViewer";
import documents from "../config/documents.json";
import theme from "../config/theme.json";
import features from "../config/features.json";
import toolbar from "../config/toolbar.json";

${buildPreviewSourceComment(preview as unknown as PreviewConfig)}

const preview = ${JSON.stringify(preview, null, 2)} as const;

type PreviewRecord = {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  status?: string;
};

type FeatureMap = Record<string, boolean>;
type ToolbarConfig = Record<string, boolean | string | string[]>;

function buildToolbarItems(featureConfig: FeatureMap, toolbarConfig: ToolbarConfig) {
  const items: Array<{ type: string; dropdownGroup?: string }> = [];
  if (toolbarConfig.showSearchBar) items.push({ type: "search" });
  items.push({ type: "spacer" });
  if (toolbarConfig.showThumbnails) items.push({ type: "sidebar-thumbnails" });
  if (featureConfig.annotations) {
    items.push(
      { type: "sidebar-annotations" },
      { type: "highlighter" },
      { type: "text-highlighter" },
      { type: "ink" },
      { type: "note" },
      { type: "rectangle" },
      { type: "arrow" },
      { type: "cloudy-rectangle", dropdownGroup: "shapes" },
      { type: "dashed-rectangle", dropdownGroup: "shapes" },
      { type: "cloudy-ellipse", dropdownGroup: "shapes" },
      { type: "dashed-ellipse", dropdownGroup: "shapes" },
      { type: "dashed-polygon", dropdownGroup: "shapes" }
    );
  }
  if (featureConfig.forms) items.push({ type: "form-creator", dropdownGroup: "editor" });
  if (featureConfig.signatures) items.push({ type: "signature" });
  if (featureConfig.redaction) items.push({ type: "redact-text-highlighter" }, { type: "redact-rectangle" });
  items.push({ type: "spacer" });
  if (featureConfig.export) items.push({ type: "export-pdf" });
  items.push({ type: "print" });
  return items;
}

export default function App() {
  const records = preview.records?.items ?? [];
  const [activeRecordId, setActiveRecordId] = useState(records[0]?.id ?? "");
  const [viewerOpen, setViewerOpen] = useState(false);
  const activeRecord = records.find((record: PreviewRecord) => record.id === activeRecordId) ?? records[0];
  const firstDocument = (documents as Array<{ url: string; name: string }>)[0];
  const viewerPlacement = preview.viewer?.placement ?? "right";

  return (
    <div style={{ height: "100vh", background: "#1a1414", color: "#f6f0ee", display: "flex", flexDirection: "column", fontFamily: "Inter, system-ui, sans-serif" }}>
      <header style={{ height: 64, borderBottom: "1px solid #332827", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{preview.appName}</div>
          <div style={{ fontSize: 12, color: "#9f8f8b", marginTop: 3 }}>{preview.tagline}</div>
        </div>
        <nav style={{ display: "flex", gap: 8 }}>
          {(preview.navigation ?? []).map((item: string) => (
            <button key={item} style={{ border: "1px solid #3a3030", background: item === preview.activeNav ? "#2b2323" : "transparent", color: "#eee", borderRadius: 6, padding: "7px 10px", fontSize: 12 }}>
              {item}
            </button>
          ))}
        </nav>
      </header>

      <main style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: viewerPlacement === "modal" ? "1fr" : "minmax(420px, 0.9fr) minmax(520px, 1.1fr)", gap: 16, padding: 16, overflow: "auto" }}>
        <section style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
            {(preview.metrics ?? []).slice(0, 3).map((metric: { label: string; value: string; trend?: string }) => (
              <div key={metric.label} style={{ border: "1px solid #332827", background: "#211a1a", borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 12, color: "#a0928f" }}>{metric.label}</div>
                <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>{metric.value}</div>
                {metric.trend && <div style={{ fontSize: 11, color: "#8abf9b", marginTop: 8 }}>{metric.trend}</div>}
              </div>
            ))}
          </div>

          <section style={{ border: "1px solid #332827", background: "#211a1a", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ padding: 16, borderBottom: "1px solid #332827" }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{preview.records?.title}</div>
              <div style={{ fontSize: 12, color: "#9f8f8b", marginTop: 4 }}>{preview.records?.description}</div>
            </div>
            <div style={{ padding: 10, display: "grid", gap: 8 }}>
              {records.map((record: PreviewRecord) => (
                <button
                  key={record.id}
                  onClick={() => {
                    setActiveRecordId(record.id);
                    if (viewerPlacement === "modal") setViewerOpen(true);
                  }}
                  style={{ textAlign: "left", border: activeRecord?.id === record.id ? "1px solid #f6f0ee" : "1px solid #332827", background: "#1a1414", color: "#f6f0ee", borderRadius: 7, padding: 12 }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 650 }}>{record.title}</div>
                      <div style={{ fontSize: 12, color: "#9f8f8b", marginTop: 4 }}>{record.subtitle}</div>
                      <div style={{ fontSize: 10, color: "#746662", marginTop: 8, textTransform: "uppercase", letterSpacing: 1 }}>{record.meta}</div>
                    </div>
                    {record.status && <span style={{ fontSize: 11, color: "#f7d58a" }}>{record.status}</span>}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(preview.actions ?? []).map((action: { label: string; variant?: string }) => (
              <button
                key={action.label}
                onClick={() => {
                  if (viewerPlacement === "modal") setViewerOpen(true);
                }}
                style={{ border: action.variant === "primary" ? "1px solid #f6f0ee" : "1px solid #3a3030", background: action.variant === "primary" ? "#f6f0ee" : "transparent", color: action.variant === "primary" ? "#1a1414" : "#f6f0ee", borderRadius: 7, padding: "9px 12px", fontSize: 12 }}
              >
                {action.label}
              </button>
            ))}
            {viewerPlacement === "modal" && (
              <button onClick={() => setViewerOpen(true)} style={{ border: "1px solid #f6f0ee", background: "#f6f0ee", color: "#1a1414", borderRadius: 7, padding: "9px 12px", fontSize: 12 }}>
                {preview.modal?.triggerLabel ?? "Open PDF view"}
              </button>
            )}
          </div>
        </section>

        {viewerPlacement !== "modal" && (
          <section style={{ minHeight: 520, display: "flex", flexDirection: "column", border: "1px solid #332827", background: "#211a1a", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ height: 56, borderBottom: "1px solid #332827", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{preview.viewer?.title}</div>
                <div style={{ fontSize: 12, color: "#9f8f8b" }}>{activeRecord?.title ?? preview.viewer?.subtitle}</div>
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <NutrientViewer
                document={firstDocument?.url ?? "${NUTRIENT_WEB_DEMO_DOCUMENT_URL}"}
                theme={(theme as { mode?: string }).mode === "light" ? "LIGHT" : "DARK"}
                licenseKey={import.meta.env.VITE_NUTRIENT_LICENSE_KEY}
                toolbarItems={buildToolbarItems(features as FeatureMap, toolbar as ToolbarConfig)}
              />
            </div>
          </section>
        )}
      </main>

      {viewerPlacement === "modal" && viewerOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ width: "min(1120px, 100%)", height: "86vh", background: "#1a1414", border: "1px solid #3a3030", borderRadius: 10, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ height: 56, borderBottom: "1px solid #332827", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{preview.modal?.title ?? preview.viewer?.title}</div>
                <div style={{ fontSize: 12, color: "#9f8f8b" }}>{activeRecord?.title ?? preview.modal?.description}</div>
              </div>
              <button onClick={() => setViewerOpen(false)} style={{ border: "1px solid #3a3030", background: "transparent", color: "#f6f0ee", borderRadius: 6, padding: "7px 10px" }}>Close</button>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <NutrientViewer
                document={firstDocument?.url ?? "${NUTRIENT_WEB_DEMO_DOCUMENT_URL}"}
                theme={(theme as { mode?: string }).mode === "light" ? "LIGHT" : "DARK"}
                licenseKey={import.meta.env.VITE_NUTRIENT_LICENSE_KEY}
                toolbarItems={buildToolbarItems(features as FeatureMap, toolbar as ToolbarConfig)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`;
}

function buildComponentizedAppSource(preview: JsonRecord) {
  return `import { DemoLayout } from "./layouts/DemoLayout";
import { GeneratedProductPage } from "./pages/GeneratedProductPage";
import { DocumentReviewModal } from "./components/DocumentReviewModal";
import { useDemoWorkflow } from "./hooks/useDemoWorkflow";

${buildPreviewSourceComment(preview as unknown as PreviewConfig)}

const preview = ${JSON.stringify(preview, null, 2)} as const;

export default function App() {
  const workflow = useDemoWorkflow(preview);

  return (
    <DemoLayout
      preview={preview}
      activePage={workflow.activePage}
      onNavigate={workflow.setActivePage}
    >
      <GeneratedProductPage
        preview={preview}
        workflow={workflow}
      />
      <DocumentReviewModal
        preview={preview}
        record={workflow.selectedRecord}
        open={workflow.isViewerOpen}
        onClose={() => workflow.setViewerOpen(false)}
      />
    </DemoLayout>
  );
}
`;
}

function buildDemoDataSource(preview: JsonRecord) {
  const recordItems = ((preview.records as JsonRecord | undefined)?.items as JsonRecord[] | undefined) ?? [];
  const metricItems = (preview.metrics as JsonRecord[] | undefined) ?? [];
  const workflowItems = ((preview.workflow as JsonRecord | undefined)?.steps as JsonRecord[] | undefined) ?? [];

  const records = recordItems.map((record, index) => ({
    id: String(record.id ?? `record-${index + 1}`),
    title: String(record.title ?? `Document packet ${index + 1}`),
    subtitle: String(record.subtitle ?? "review-packet.pdf"),
    meta: String(record.meta ?? "Owner: Document ops"),
    status: String(record.status ?? "Review"),
    tone: ["positive", "warning", "critical", "neutral"].includes(String(record.tone))
      ? String(record.tone)
      : "neutral",
  }));

  const metrics = metricItems.map((metric) => ({
    label: String(metric.label ?? "PDF tasks"),
    value: String(metric.value ?? "0"),
    trend: String(metric.trend ?? "Ready"),
  }));

  const workflowSteps = workflowItems.map((step) =>
    `${String(step.title ?? "Review PDF")} — ${String(step.subtitle ?? "Use Nutrient Web SDK")}`
  );

  return `import type { DemoRecord } from "../types/demo";

export type { DemoRecord } from "../types/demo";

export const records: DemoRecord[] = ${JSON.stringify(records, null, 2)} as DemoRecord[];

export const metrics = ${JSON.stringify(metrics, null, 2)};

export const workflowSteps = ${JSON.stringify(workflowSteps, null, 2)};

type FeatureMap = Record<string, boolean>;
type ToolbarConfig = Record<string, boolean | string | string[]>;

export function buildToolbarItems(featureConfig: FeatureMap, toolbarConfig: ToolbarConfig) {
  const items: Array<{ type: string; dropdownGroup?: string }> = [];
  if (toolbarConfig.showSearchBar) items.push({ type: "search" });
  items.push({ type: "spacer" });
  if (toolbarConfig.showThumbnails) items.push({ type: "sidebar-thumbnails" });
  if (featureConfig.annotations) {
    items.push(
      { type: "sidebar-annotations" },
      { type: "highlighter" },
      { type: "text-highlighter" },
      { type: "ink" },
      { type: "note" },
      { type: "rectangle" },
      { type: "arrow" },
      { type: "cloudy-rectangle", dropdownGroup: "shapes" },
      { type: "dashed-rectangle", dropdownGroup: "shapes" },
      { type: "cloudy-ellipse", dropdownGroup: "shapes" },
      { type: "dashed-ellipse", dropdownGroup: "shapes" },
      { type: "dashed-polygon", dropdownGroup: "shapes" }
    );
  }
  if (featureConfig.forms) items.push({ type: "form-creator", dropdownGroup: "editor" });
  if (featureConfig.signatures) items.push({ type: "signature" });
  if (featureConfig.redaction) items.push({ type: "redact-text-highlighter" }, { type: "redact-rectangle" });
  items.push({ type: "spacer" });
  if (featureConfig.export) items.push({ type: "export-pdf" });
  items.push({ type: "print" });
  return items;
}
`;
}

function buildDemoTypesSource() {
  return `export type DemoTone = "positive" | "warning" | "critical" | "neutral";

export type DemoRecord = {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  status: string;
  tone: DemoTone;
};

export type DemoWorkflowState = {
  activePage: string;
  selectedRecordId: string;
  isViewerOpen: boolean;
  recordStatuses: Record<string, string>;
  activityLog: string[];
};
`;
}

function buildWorkflowServiceSource() {
  return `export function nextStatusForAction(label: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes("export")) return "Exported";
  if (normalized.includes("approve") || normalized.includes("complete") || normalized.includes("resolve")) return "Approved";
  if (normalized.includes("signature") || normalized.includes("sign")) return "Signature requested";
  if (normalized.includes("redact")) return "Redaction marked";
  if (normalized.includes("annotate") || normalized.includes("markup")) return "Annotated";
  if (normalized.includes("route") || normalized.includes("request")) return "Routed";
  return "Updated";
}

export function shouldOpenViewerForAction(label: string) {
  return /open|view|review|annotate|markup|redact|sign|pdf|packet/i.test(label);
}
`;
}

function buildDemoWorkflowHookSource() {
  return `import { useMemo, useState } from "react";
import { records } from "../data/demoData";
import { nextStatusForAction, shouldOpenViewerForAction } from "../services/workflowService";

type PreviewShape = {
  appName?: string;
  activeNav?: string | null;
  startPage?: string | null;
  navigation?: string[];
};

export function useDemoWorkflow(preview: PreviewShape) {
  const navItems = useMemo(
    () => {
      const items = preview.navigation?.length
        ? preview.navigation
        : ["Dashboard", preview.activeNav ?? "Review Queue", "Approvals", "Audit"];
      return ["Home", ...items.filter((item) => item !== "Home")];
    },
    [preview]
  );
  const [activePage, setActivePage] = useState(preview.startPage || preview.activeNav || navItems[0] || "Home");
  const [selectedRecordId, setSelectedRecordId] = useState(records[0]?.id ?? "");
  const [isViewerOpen, setViewerOpen] = useState(false);
  const [recordStatuses, setRecordStatuses] = useState<Record<string, string>>({});
  const [activityLog, setActivityLog] = useState<string[]>([
    "Loaded " + (preview.appName ?? "workspace") + " with " + records.length + " active records",
  ]);

  const selectedBaseRecord = records.find((record) => record.id === selectedRecordId) ?? records[0];
  const selectedRecord = selectedBaseRecord
    ? { ...selectedBaseRecord, status: recordStatuses[selectedBaseRecord.id] ?? selectedBaseRecord.status }
    : undefined;

  function runAction(label: string) {
    const target = selectedBaseRecord?.title ?? "selected record";
    setRecordStatuses((current) =>
      selectedBaseRecord ? { ...current, [selectedBaseRecord.id]: nextStatusForAction(label) } : current
    );
    setActivityLog((items) => [label + " for " + target, ...items].slice(0, 6));
    if (shouldOpenViewerForAction(label)) setViewerOpen(true);
  }

  return {
    navItems,
    activePage,
    setActivePage,
    selectedRecordId,
    setSelectedRecordId,
    selectedRecord,
    isViewerOpen,
    setViewerOpen,
    recordStatuses,
    activityLog,
    runAction,
  };
}
`;
}

function buildDemoLayoutSource() {
  return `import type { ReactNode } from "react";
import { DemoNavbar } from "../components/DemoNavbar";

type DemoLayoutProps = {
  preview: {
    appName?: string;
    tagline?: string | null;
    activeNav?: string | null;
    navigation?: string[];
    badges?: string[];
  };
  activePage: string;
  onNavigate: (page: string) => void;
  children: ReactNode;
};

export function DemoLayout({ preview, activePage, onNavigate, children }: DemoLayoutProps) {
  return (
    <div className="app-shell">
      <DemoNavbar preview={preview} activePage={activePage} onNavigate={onNavigate} />
      {children}
    </div>
  );
}
`;
}

function buildGeneratedProductPageSource() {
  return `import { AuditPage } from "./AuditPage";
import { DashboardPage } from "./DashboardPage";
import { DocumentWorkflowPage } from "./DocumentWorkflowPage";
import { HomePage } from "./HomePage";

type GeneratedProductPageProps = {
  preview: any;
  workflow: any;
};

function isDocumentWorkflowPage(page: string, preview: any) {
  const normalized = page.toLowerCase();
  const active = String(preview.activeNav ?? "").toLowerCase();
  return (
    normalized === active ||
    /record|document|review|contract|claim|application|permit|blueprint|onboarding|form|evidence|packet|redaction|signature|assistant|source|pdf|chat|question|answer|invoice|extract|ocr/.test(normalized)
  );
}

export function GeneratedProductPage({ preview, workflow }: GeneratedProductPageProps) {
  if (isDocumentWorkflowPage(workflow.activePage, preview)) {
    return <DocumentWorkflowPage preview={preview} workflow={workflow} />;
  }

  if (workflow.activePage === "Dashboard") {
    return <DashboardPage preview={preview} workflow={workflow} />;
  }

  if (/audit|approval|approvals|report|settings|exception|compliance/i.test(workflow.activePage)) {
    return <AuditPage preview={preview} workflow={workflow} />;
  }

  return <HomePage preview={preview} workflow={workflow} />;
}
`;
}

function buildHomePageSource() {
  return `import { metrics, records } from "../data/demoData";

type HomePageProps = {
  preview: any;
  workflow: any;
};

export function HomePage({ preview, workflow }: HomePageProps) {
  const documentNav = preview.activeNav ?? preview.navigation?.[1] ?? "Review Queue";

  return (
    <main className="dashboard-grid single-column">
      <section className="dashboard-content">
        <section className="hero-panel">
          <div>
            <p className="eyebrow">{preview.appName ?? "Product workspace"}</p>
            <h1>{preview.heroTitle ?? "Run the business workflow with documents integrated where they belong."}</h1>
            <p>{preview.heroDescription ?? "A working product surface with navigation, records, actions, and a connected Nutrient document review flow."}</p>
          </div>
          <div className="action-row">
            <button className="primary-action" onClick={() => workflow.setActivePage(documentNav)}>
              Open document workflow
            </button>
            <button className="secondary-action" onClick={() => workflow.setActivePage("Dashboard")}>
              View dashboard
            </button>
          </div>
        </section>

        <section className="metric-grid">
          {metrics.map((metric) => (
            <article key={metric.label} className="metric-card">
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <em>{metric.trend}</em>
            </article>
          ))}
        </section>

        <section className="records-panel">
          <div className="panel-heading">
            <div>
              <h2>Priority work</h2>
              <p>Recent business records with a document workflow available when review is needed.</p>
            </div>
          </div>
          <div className="page-grid">
            {records.slice(0, 3).map((record) => (
              <button
                key={record.id}
                className="record-row"
                onClick={() => {
                  workflow.setSelectedRecordId(record.id);
                  workflow.setActivePage(documentNav);
                }}
              >
                <div>
                  <strong>{record.title}</strong>
                  <span>{record.meta}</span>
                </div>
                <em className={"status " + record.tone}>{workflow.recordStatuses[record.id] ?? record.status}</em>
              </button>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
`;
}

function buildDashboardPageSource() {
  return `import { metrics, records } from "../data/demoData";

type DashboardPageProps = {
  preview: any;
  workflow: any;
};

export function DashboardPage({ preview, workflow }: DashboardPageProps) {
  const documentNav = preview.activeNav ?? preview.navigation?.[1] ?? "Review Queue";

  return (
    <main className="dashboard-grid single-column">
      <section className="dashboard-content">
        <section className="metric-grid">
          {metrics.map((metric) => (
            <article key={metric.label} className="metric-card">
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <em>{metric.trend}</em>
            </article>
          ))}
        </section>

        <section className="records-panel">
          <div className="panel-heading">
            <div>
              <h2>{preview.appName ?? "Operations"} dashboard</h2>
              <p>Track product work first, then jump into Nutrient only for records that need document review.</p>
            </div>
            <button className="secondary-action" onClick={() => workflow.setActivePage(documentNav)}>
              Open document queue
            </button>
          </div>
          <div className="record-list">
            {records.map((record) => (
              <button
                key={record.id}
                className={record.id === workflow.selectedRecordId ? "record-row active" : "record-row"}
                onClick={() => workflow.setSelectedRecordId(record.id)}
              >
                <div>
                  <strong>{record.title}</strong>
                  <span>{record.subtitle}</span>
                  <small>{record.meta}</small>
                </div>
                <em className={"status " + record.tone}>{workflow.recordStatuses[record.id] ?? record.status}</em>
              </button>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
`;
}

function buildDocumentWorkflowPageSource() {
  return `import { DocumentWorkflowWorkspace } from "../components/DocumentWorkflowWorkspace";

type DocumentWorkflowPageProps = {
  preview: any;
  workflow: any;
};

export function DocumentWorkflowPage({ preview, workflow }: DocumentWorkflowPageProps) {
  return (
    <DocumentWorkflowWorkspace
      preview={preview}
      activePage={workflow.activePage}
      selectedRecordId={workflow.selectedRecordId}
      recordStatuses={workflow.recordStatuses}
      activityLog={workflow.activityLog}
      onSelectRecord={workflow.setSelectedRecordId}
      onNavigate={workflow.setActivePage}
      onRunAction={workflow.runAction}
      onOpenViewer={() => workflow.setViewerOpen(true)}
    />
  );
}
`;
}

function buildAuditPageSource() {
  return `import { workflowSteps } from "../data/demoData";

type AuditPageProps = {
  preview: any;
  workflow: any;
};

export function AuditPage({ preview, workflow }: AuditPageProps) {
  return (
    <main className="dashboard-grid single-column">
      <section className="dashboard-content">
        <section className="workflow-panel">
          <div className="panel-heading compact">
            <div>
              <h2>{workflow.activePage} trail</h2>
              <p>{preview.workflow?.description ?? "Workflow updates, document review events, and audit-ready state changes."}</p>
            </div>
          </div>
          <div className="workflow-steps">
            {workflowSteps.map((step, index) => (
              <div key={step} className="workflow-step">
                <span>{index + 1}</span>
                <p>{step}</p>
              </div>
            ))}
          </div>
          <div className="activity-panel">
            <h2>Live activity</h2>
            <div className="activity-list">
              {workflow.activityLog.map((item: string) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
`;
}

function buildDemoNavbarSource() {
  return `type DemoNavbarProps = {
  preview: {
    appName?: string;
    tagline?: string | null;
    activeNav?: string | null;
    navigation?: string[];
    badges?: string[];
  };
  activePage: string;
  onNavigate: (page: string) => void;
};

export function DemoNavbar({ preview, activePage, onNavigate }: DemoNavbarProps) {
  const baseItems = preview.navigation?.length
    ? preview.navigation
    : ["Dashboard", "Review Queue", "Processing", "Approvals"];
  const navItems = ["Home", ...baseItems.filter((item) => item !== "Home")];
  const initials = (preview.appName ?? "Nutrient")
    .split(/\\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <header className="demo-navbar">
      <div className="brand-block">
        <div className="brand-mark">{initials}</div>
        <div>
          <div className="brand-name">{preview.appName ?? "DocuOps"}</div>
          <div className="brand-tagline">{preview.tagline ?? "Document workflows powered by Nutrient"}</div>
        </div>
      </div>

      <nav className="nav-links" aria-label="Primary navigation">
        {navItems.map((item) => (
          <button
            key={item}
            className={item === activePage ? "nav-link active" : "nav-link"}
            onClick={() => onNavigate(item)}
          >
            {item}
          </button>
        ))}
      </nav>

      <div className="nav-badges">
        {(preview.badges ?? ["Nutrient Web SDK"]).slice(0, 2).map((badge) => (
          <span key={badge}>{badge}</span>
        ))}
      </div>
    </header>
  );
}
`;
}

function buildDocumentWorkflowWorkspaceSource() {
  return `import { NutrientViewer } from "../NutrientViewer";
import documents from "../../config/documents.json";
import features from "../../config/features.json";
import theme from "../../config/theme.json";
import toolbar from "../../config/toolbar.json";
import { buildToolbarItems, metrics, records, workflowSteps } from "../data/demoData";

type DocumentWorkflowWorkspaceProps = {
  preview: any;
  activePage: string;
  selectedRecordId: string;
  recordStatuses: Record<string, string>;
  activityLog: string[];
  onSelectRecord: (id: string) => void;
  onNavigate: (page: string) => void;
  onRunAction: (label: string) => void;
  onOpenViewer: () => void;
};

function isDocumentWorkflowPage(page: string, preview: any) {
  const normalized = page.toLowerCase();
  const active = String(preview.activeNav ?? "").toLowerCase();
  return (
    normalized === active ||
    /record|document|review|contract|claim|application|permit|blueprint|onboarding|form|evidence|packet|redaction|signature|assistant|source|pdf|chat|question|answer|invoice|extract|ocr/.test(normalized)
  );
}

export function DocumentWorkflowWorkspace({
  preview,
  activePage,
  selectedRecordId,
  recordStatuses,
  activityLog,
  onSelectRecord,
  onNavigate,
  onRunAction,
  onOpenViewer,
}: DocumentWorkflowWorkspaceProps) {
  const recordsWithStatus = records.map((record) => ({
    ...record,
    status: recordStatuses[record.id] ?? record.status,
  }));
  const selectedRecord = recordsWithStatus.find((record) => record.id === selectedRecordId) ?? recordsWithStatus[0];
  const firstDocument = (documents as Array<{ url: string; name: string }>)[0];
  const viewerPlacement = preview.viewer?.placement ?? "right";
  const documentPage = isDocumentWorkflowPage(activePage, preview);
  const documentNav = preview.activeNav ?? preview.navigation?.[1] ?? "Review Queue";

  return (
    <main className={documentPage && viewerPlacement !== "modal" ? "dashboard-grid" : "dashboard-grid single-column"}>
      <section className="dashboard-content">
        <section className="hero-panel">
          <div>
            <p className="eyebrow">{documentPage ? preview.integrationLabel ?? "Nutrient PDF workspace" : activePage}</p>
            <h1>
              {documentPage
                ? preview.heroTitle ?? "Process document packets inside the workflow."
                : activePage + " for " + (preview.appName ?? "the workspace")}
            </h1>
            <p>
              {documentPage
                ? preview.heroDescription ?? "The generated app keeps queues, record details, PDF review, and approval actions in one focused product surface."
                : "This page handles the product workflow first. Open the connected document workspace only when a PDF review step is needed."}
            </p>
          </div>
          <div className="action-row">
            <button className="primary-action" onClick={documentPage ? onOpenViewer : () => onNavigate(documentNav)}>
              {documentPage ? preview.modal?.triggerLabel ?? "Open PDF workspace" : "Open document workflow"}
            </button>
            <button className="secondary-action" onClick={() => onRunAction("Create " + activePage + " update")}>
              Create update
            </button>
          </div>
        </section>

        <section className="metric-grid">
          {metrics.map((metric) => (
            <article key={metric.label} className="metric-card">
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <em>{metric.trend}</em>
            </article>
          ))}
        </section>

        {documentPage ? (
          <>
            <section className="records-panel">
              <div className="panel-heading">
                <div>
                  <h2>{preview.records?.title ?? "Business records"}</h2>
                  <p>{preview.records?.description ?? "Select a record to preview the connected PDF workflow."}</p>
                </div>
                <button className="secondary-action" onClick={onOpenViewer}>
                  Open PDF viewer
                </button>
              </div>

              <div className="record-list">
                {recordsWithStatus.map((record) => (
                  <button
                    key={record.id}
                    className={record.id === selectedRecordId ? "record-row active" : "record-row"}
                    onClick={() => {
                      onSelectRecord(record.id);
                      if (viewerPlacement === "modal") onOpenViewer();
                    }}
                  >
                    <div>
                      <strong>{record.title}</strong>
                      <span>{record.subtitle}</span>
                      <small>{record.meta}</small>
                    </div>
                    <em className={"status " + record.tone}>{record.status}</em>
                  </button>
                ))}
              </div>
            </section>

            <section className="workflow-panel">
              <div className="panel-heading compact">
                <div>
                  <h2>{preview.workflow?.title ?? "Document workflow"}</h2>
                  <p>{preview.workflow?.description ?? "The PDF workspace is connected to the product workflow."}</p>
                </div>
              </div>
              <div className="workflow-steps">
                {workflowSteps.map((step, index) => (
                  <div key={step} className="workflow-step">
                    <span>{index + 1}</span>
                    <p>{step}</p>
                  </div>
                ))}
              </div>
              <div className="action-row padded">
                {(preview.actions ?? []).map((action: { label: string; variant?: string }) => (
                  <button
                    key={action.label}
                    className={action.variant === "primary" ? "primary-action" : "secondary-action"}
                    onClick={() => onRunAction(action.label)}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </section>
          </>
        ) : (
          <section className="records-panel">
            <div className="panel-heading">
              <div>
                <h2>{activePage} workspace</h2>
                <p>Manage the business queue, select records, and jump into document review only for records that need PDF work.</p>
              </div>
              <button className="secondary-action" onClick={() => onNavigate(documentNav)}>
                Review documents
              </button>
            </div>

            <div className="page-grid">
              {recordsWithStatus.map((record) => (
                <button
                  key={record.id}
                  className={record.id === selectedRecordId ? "record-row active" : "record-row"}
                  onClick={() => onSelectRecord(record.id)}
                >
                  <div>
                    <strong>{record.title}</strong>
                    <span>{record.meta}</span>
                  </div>
                  <em className={"status " + record.tone}>{record.status}</em>
                </button>
              ))}
            </div>

            <div className="activity-panel">
              <h2>Live activity</h2>
              <div className="activity-list">
                {activityLog.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </div>
          </section>
        )}
      </section>

      {documentPage && viewerPlacement !== "modal" && (
        <aside className="viewer-panel">
          <div className="viewer-heading">
            <div>
              <h2>{preview.viewer?.title ?? "PDF review workspace"}</h2>
              <p>{selectedRecord?.title ?? preview.viewer?.subtitle}</p>
            </div>
            <span>{firstDocument?.name ?? preview.viewer?.documentLabel ?? "document-packet.pdf"}</span>
          </div>
          <div className="viewer-mount">
            <NutrientViewer
              document={firstDocument?.url ?? "${NUTRIENT_WEB_DEMO_DOCUMENT_URL}"}
              theme={(theme as { mode?: string }).mode === "light" ? "LIGHT" : "DARK"}
              licenseKey={import.meta.env.VITE_NUTRIENT_LICENSE_KEY}
              toolbarItems={buildToolbarItems(features as Record<string, boolean>, toolbar as Record<string, boolean | string | string[]>)}
            />
          </div>
        </aside>
      )}
    </main>
  );
}
`;
}

function buildDocumentReviewModalSource() {
  return `import { NutrientViewer } from "../NutrientViewer";
import documents from "../../config/documents.json";
import features from "../../config/features.json";
import theme from "../../config/theme.json";
import toolbar from "../../config/toolbar.json";
import { buildToolbarItems, type DemoRecord } from "../data/demoData";

type DocumentReviewModalProps = {
  preview: any;
  record?: DemoRecord;
  open: boolean;
  onClose: () => void;
};

export function DocumentReviewModal({ preview, record, open, onClose }: DocumentReviewModalProps) {
  if (!open || preview.viewer?.placement !== "modal") return null;

  const firstDocument = (documents as Array<{ url: string; name: string }>)[0];

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="modal-shell">
        <header className="modal-header">
          <div>
            <h2>{preview.modal?.title ?? "PDF review workspace"}</h2>
            <p>{record?.title ?? preview.modal?.description ?? "Review the selected record."}</p>
          </div>
          <button onClick={onClose}>Close</button>
        </header>
        <div className="modal-viewer">
          <NutrientViewer
            document={firstDocument?.url ?? "${NUTRIENT_WEB_DEMO_DOCUMENT_URL}"}
            theme={(theme as { mode?: string }).mode === "light" ? "LIGHT" : "DARK"}
            licenseKey={import.meta.env.VITE_NUTRIENT_LICENSE_KEY}
            toolbarItems={buildToolbarItems(features as Record<string, boolean>, toolbar as Record<string, boolean | string | string[]>)}
          />
        </div>
      </section>
    </div>
  );
}
`;
}

function fallbackAccentForeground(accent: string) {
  const brightAccents = new Set(["#f59e0b", "#fbbf24", "#2dd4bf", "#34d399", "#f472b6", "#a78bfa"]);
  return brightAccents.has(accent.toLowerCase()) ? "#0c0a09" : "#ffffff";
}

function buildFallbackCssSource(preview: JsonRecord) {
  const accent = typeof preview.accentColor === "string" ? preview.accentColor : "#0f766e";
  const accentFg = fallbackAccentForeground(accent);

  return `* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0c0a09; color: #f5f5f4; }
button { font: inherit; cursor: pointer; }
#root { min-height: 100vh; }
.app-shell { min-height: 100vh; background: #0c0a09; color: #f5f5f4; }
.demo-navbar { height: 68px; display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 0 24px; border-bottom: 1px solid #292524; background: rgba(12, 10, 9, 0.96); position: sticky; top: 0; z-index: 5; }
.brand-block { display: flex; align-items: center; gap: 12px; min-width: 240px; }
.brand-mark { width: 34px; height: 34px; border-radius: 8px; display: grid; place-items: center; border: 1px solid #44403c; background: #292524; color: ${accent}; font-size: 12px; font-weight: 800; }
.brand-name { font-size: 15px; font-weight: 750; }
.brand-tagline { margin-top: 2px; color: #a8a29e; font-size: 11px; }
.nav-links { display: flex; align-items: center; gap: 6px; }
.nav-link { border: 1px solid transparent; background: transparent; color: #a8a29e; border-radius: 7px; padding: 8px 10px; font-size: 12px; }
.nav-link.active, .nav-link:hover { color: #f5f5f4; background: #292524; border-color: #44403c; }
.nav-badges { display: flex; align-items: center; gap: 6px; }
.nav-badges span { border: 1px solid #44403c; color: #a8a29e; border-radius: 999px; padding: 6px 9px; font-size: 11px; white-space: nowrap; }
.dashboard-grid { min-height: calc(100vh - 68px); display: grid; grid-template-columns: minmax(420px, .9fr) minmax(520px, 1.1fr); gap: 16px; padding: 16px; }
.dashboard-grid.single-column { grid-template-columns: minmax(0, 1fr); max-width: 1180px; margin: 0 auto; width: 100%; }
.dashboard-content { min-width: 0; display: flex; flex-direction: column; gap: 16px; }
.hero-panel, .records-panel, .workflow-panel, .viewer-panel, .metric-card { border: 1px solid #292524; background: #1c1917; border-radius: 8px; }
.hero-panel { padding: 22px; display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; }
.eyebrow { color: ${accent}; font-size: 11px; letter-spacing: .13em; text-transform: uppercase; margin-bottom: 10px; }
.hero-panel h1 { font-size: clamp(24px, 3vw, 40px); line-height: 1.05; max-width: 720px; }
.hero-panel p { color: #a8a29e; font-size: 13px; line-height: 1.55; max-width: 680px; margin-top: 12px; }
.action-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.action-row.padded { padding: 0 16px 16px; }
.primary-action, .secondary-action { border-radius: 8px; padding: 10px 13px; white-space: nowrap; }
.primary-action { border: 1px solid ${accent}; background: ${accent}; color: ${accentFg}; font-weight: 700; }
.secondary-action { border: 1px solid #57534e; background: transparent; color: #f5f5f4; }
.metric-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.metric-card { padding: 15px; }
.metric-card span { color: #a8a29e; font-size: 12px; }
.metric-card strong { display: block; margin-top: 8px; font-size: 28px; }
.metric-card em { display: inline-block; margin-top: 8px; color: #34d399; font-size: 11px; font-style: normal; }
.panel-heading { padding: 16px; border-bottom: 1px solid #292524; display: flex; align-items: start; justify-content: space-between; gap: 12px; }
.panel-heading.compact { border-bottom: 0; padding-bottom: 4px; }
.panel-heading h2, .workflow-panel h2, .viewer-heading h2, .modal-header h2 { font-size: 15px; }
.panel-heading p, .workflow-panel > p, .viewer-heading p, .modal-header p { margin-top: 4px; color: #a8a29e; font-size: 12px; line-height: 1.45; }
.record-list { display: grid; gap: 8px; padding: 10px; }
.page-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; padding: 12px; }
.record-row { width: 100%; border: 1px solid #292524; background: #0c0a09; color: #f5f5f4; border-radius: 8px; padding: 12px; text-align: left; display: flex; justify-content: space-between; gap: 12px; }
.record-row.active, .record-row:hover { border-color: ${accent}; }
.record-row strong { display: block; font-size: 13px; }
.record-row span { display: block; margin-top: 5px; color: #a8a29e; font-size: 12px; }
.record-row small { display: block; margin-top: 8px; color: #78716c; font-size: 10px; text-transform: uppercase; letter-spacing: .12em; }
.status { font-style: normal; font-size: 11px; white-space: nowrap; }
.status.positive { color: #34d399; }
.status.warning { color: #f7c76c; }
.status.critical { color: #ff8b8b; }
.status.neutral { color: #a8a29e; }
.workflow-panel { padding: 16px; }
.workflow-steps { display: grid; gap: 8px; margin-top: 12px; }
.workflow-step { display: flex; gap: 10px; align-items: center; border: 1px solid #292524; background: #0c0a09; border-radius: 8px; padding: 10px; color: #e7e5e4; font-size: 12px; }
.workflow-step span { width: 23px; height: 23px; display: grid; place-items: center; border-radius: 7px; background: #292524; color: ${accent}; font-size: 11px; font-weight: 700; }
.activity-panel { margin: 0 12px 12px; border: 1px solid #292524; background: #0c0a09; border-radius: 8px; padding: 14px; }
.activity-list { display: grid; gap: 7px; margin-top: 10px; }
.activity-list p { color: #a8a29e; font-size: 12px; }
.viewer-panel { min-height: 560px; display: flex; flex-direction: column; overflow: hidden; }
.viewer-heading, .modal-header { min-height: 58px; border-bottom: 1px solid #292524; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 0 16px; flex-shrink: 0; }
.viewer-heading span { color: #a8a29e; border: 1px solid #44403c; border-radius: 999px; padding: 6px 8px; font-size: 11px; }
.viewer-mount, .modal-viewer { flex: 1; min-height: 0; }
.modal-backdrop { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; padding: 24px; background: rgba(0,0,0,.72); }
.modal-shell { width: min(1160px, 100%); height: 86vh; border: 1px solid #57534e; background: #0c0a09; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 24px 80px rgba(0,0,0,.45); }
.modal-header button { border: 1px solid #57534e; background: transparent; color: #f5f5f4; border-radius: 7px; padding: 8px 11px; }
@media (max-width: 1100px) {
  .dashboard-grid { grid-template-columns: 1fr; }
  .hero-panel { align-items: flex-start; flex-direction: column; }
}
@media (max-width: 760px) {
  .demo-navbar { height: auto; min-height: 68px; align-items: flex-start; flex-direction: column; padding: 14px; }
  .nav-links { overflow-x: auto; width: 100%; }
  .nav-badges { display: none; }
  .dashboard-grid { padding: 10px; }
  .metric-grid { grid-template-columns: 1fr; }
  .page-grid { grid-template-columns: 1fr; }
}
`;
}

function buildGeneratedBuilderMemorySource(
  preview: JsonRecord,
  existingMemory?: string,
  projectPlan?: string | null
) {
  const appName = String(preview.appName ?? "Generated Nutrient App");
  const activeNav = String(preview.activeNav ?? "Document Workflow");
  const navigation = (preview.navigation as string[] | undefined)?.join(", ") || "Dashboard, Workflow, Audit";
  const workflowTitle = String((preview.workflow as JsonRecord | undefined)?.title ?? "Document workflow");
  const viewerTitle = String((preview.viewer as JsonRecord | undefined)?.title ?? "Nutrient document workspace");
  const fallbackNote = `## Latest AI Change

- Request: The primary Nutrient Coding Agent build response was incomplete, so the local fallback generated source files from the saved project plan instead of using the generic DocuOps shell.
- Changes: Preserved planned app name \`${appName}\`, active workflow \`${activeNav}\`, navigation \`${navigation}\`, and Nutrient workspace \`${viewerTitle}\`.
- Requirement: Future edits must continue from the original project plan and replace fallback scaffolding with richer domain-specific files when requested. Do not revert to DocuOps or generic document-processing copy.
`;

  if (existingMemory?.trim()) {
    return `${existingMemory.trim()}\n\n${fallbackNote}`;
  }

  return `# ${appName} Builder Memory

${projectPlan ? `## Original Project Plan\n\n\`\`\`json\n${projectPlan}\n\`\`\`\n\n` : ""}

## Product
${appName} is a generated Nutrient project with working navigation or workflow screens, business records, local state, and a Nutrient-powered document workflow.

## Architecture
- \`src/App.tsx\` composes the app and keeps the Nutrient preview metadata.
- \`src/layouts/DemoLayout.tsx\` owns the app shell and navigation.
- \`src/pages/GeneratedProductPage.tsx\` dispatches active navigation state to page modules.
- \`src/pages/HomePage.tsx\` renders the product entry surface and CTAs.
- \`src/pages/DashboardPage.tsx\` renders operational metrics and selectable business records.
- \`src/pages/DocumentWorkflowPage.tsx\` renders the natural Nutrient document workflow page.
- \`src/pages/AuditPage.tsx\` renders activity and workflow audit state.
- \`src/components/DemoNavbar.tsx\` renders functional navigation.
- \`src/components/DocumentWorkflowWorkspace.tsx\` renders product pages, record queues, workflow actions, activity, and the embedded document workspace.
- \`src/components/DocumentReviewModal.tsx\` renders the modal Nutrient viewer when the workflow uses modal placement.
- \`src/hooks/useDemoWorkflow.ts\` manages active page, selected record, viewer state, record status transitions, and activity log.
- \`src/services/workflowService.ts\` contains reusable workflow transition helpers.
- \`src/data/demoData.ts\` contains realistic records, metrics, workflow steps, and toolbar construction.
- \`src/types/demo.ts\` contains domain/workflow types.

## Navigation
Primary pages: ${navigation}

The current document workflow page is \`${activeNav}\`. Navigation is state-driven in React, so every nav button changes the rendered page.

## Nutrient Integration
Nutrient appears in the natural document workflow: ${viewerTitle}. It uses the existing \`src/NutrientViewer.tsx\` wrapper and real toolbar feature configuration from \`config/features.json\` and \`config/toolbar.json\`.

Workflow: ${workflowTitle}

## Interaction Contract
- Record rows select records and update the detail/viewer context.
- Workflow action buttons update record status and append activity log entries.
- Document-related actions open the Nutrient viewer when appropriate.
- Non-document pages keep the product workflow visible and link into the document workflow only when it makes sense.

## Future AI Edits
Keep the app product-first. Add Nutrient only where document workflows create business value. If new features are requested, add real pages/components/hooks/services/data/types instead of placing all code in \`App.tsx\`.

${fallbackNote}
`;
}

function mergeFilePatches(basePlan: AIPatchPlan | null, fallbackPatches: FilePatch[]): AIPatchPlan {
  const changes = [...(basePlan?.changes ?? [])];

  for (const fallbackPatch of fallbackPatches) {
    const existingIndex = changes.findIndex((change) => change.path === fallbackPatch.path);
    if (existingIndex >= 0) {
      changes[existingIndex] = fallbackPatch;
    } else {
      changes.push(fallbackPatch);
    }
  }

  return {
    plan: basePlan?.plan || "Generate a visible app preview for the UI request",
    changes,
  };
}

export function buildFallbackAppPatchPlan(
  message: string,
  projectFiles: ProjectFile[],
  basePlan: AIPatchPlan | null,
  projectPlan?: string | null
): AIPatchPlan {
  const patchMap = new Map(basePlan?.changes.map((change) => [change.path, change.content]) ?? []);
  const mergedFiles = projectFiles.map((file) =>
    patchMap.has(file.path) ? { ...file, content: patchMap.get(file.path)! } : file
  );
  for (const [path, content] of patchMap) {
    if (!mergedFiles.some((file) => file.path === path)) {
      mergedFiles.push({
        id: path,
        workspaceId: "",
        path,
        content,
        isSystem: false,
        language: path.endsWith(".json") ? "json" : path.endsWith(".tsx") ? "typescript" : "plaintext",
        updatedAt: new Date().toISOString(),
      });
    }
  }

  const preview = buildPreviewData(message, mergedFiles, projectPlan);
  const existingMemory = mergedFiles.find((file) => file.path === "NUTRIENTWEBBUILDER.md")?.content;

  return mergeFilePatches(basePlan, [
    {
      path: "src/App.tsx",
      content: buildComponentizedAppSource(preview),
    },
    {
      path: "src/layouts/DemoLayout.tsx",
      content: buildDemoLayoutSource(),
    },
    {
      path: "src/pages/GeneratedProductPage.tsx",
      content: buildGeneratedProductPageSource(),
    },
    {
      path: "src/pages/HomePage.tsx",
      content: buildHomePageSource(),
    },
    {
      path: "src/pages/DashboardPage.tsx",
      content: buildDashboardPageSource(),
    },
    {
      path: "src/pages/DocumentWorkflowPage.tsx",
      content: buildDocumentWorkflowPageSource(),
    },
    {
      path: "src/pages/AuditPage.tsx",
      content: buildAuditPageSource(),
    },
    {
      path: "src/components/DemoNavbar.tsx",
      content: buildDemoNavbarSource(),
    },
    {
      path: "src/components/DocumentWorkflowWorkspace.tsx",
      content: buildDocumentWorkflowWorkspaceSource(),
    },
    {
      path: "src/components/DocumentReviewModal.tsx",
      content: buildDocumentReviewModalSource(),
    },
    {
      path: "src/data/demoData.ts",
      content: buildDemoDataSource(preview),
    },
    {
      path: "src/hooks/useDemoWorkflow.ts",
      content: buildDemoWorkflowHookSource(),
    },
    {
      path: "src/services/workflowService.ts",
      content: buildWorkflowServiceSource(),
    },
    {
      path: "src/types/demo.ts",
      content: buildDemoTypesSource(),
    },
    {
      path: "src/index.css",
      content: buildFallbackCssSource(preview),
    },
    {
      path: "NUTRIENTWEBBUILDER.md",
      content: buildGeneratedBuilderMemorySource(preview, existingMemory, projectPlan),
    },
  ]);
}
