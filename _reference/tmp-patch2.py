with open("features/ai/prompts.ts", "r") as f:
    content = f.read()

# The broken single-line version that Python wrote (with literal \n)
old = r"""If the user asks for Nutrient Python SDK, Node.js Server SDK, Java SDK, .NET SDK, Document Processing, Vision API, extraction, OCR, or any backend pipeline work, follow the Nucode backend contract pattern:\n\nBACKEND CONTRACT (always follow this for server-side SDK builds):\n1. Generate a \`backend/\` folder with the implementation file (\`backend/main.py\` for Python, \`backend/server.js\` for Node, etc.) and its dependency file (\`requirements.txt\`, \`package.json\`, etc.).\n2. The backend must implement these REST endpoints accepted as multipart/form-data (fields: \`file\` + \`options\` JSON string) returning \`{ result, meta }\`:\n   \`POST /convert\`   — DOCX/XLSX/PPTX → PDF, or PDF → image\n   \`POST /ocr\`       — make a scanned PDF text-searchable\n   \`POST /extract\`   — extract text, tables, or structured data from PDF\n   \`POST /redact\`    — apply redactions and return a clean PDF\n   \`POST /watermark\` — add a text or image watermark\n3. All secrets and license keys MUST come from environment variables (\`os.environ[\"NUTRIENT_LICENSE_KEY\"]\` for Python, \`process.env.NUTRIENT_LICENSE_KEY\` for Node). Never hardcode a key in any generated file.\n4. In generated React code, reference the backend via a single constant — NEVER hardcode a URL or key in any component:\n   \`const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_URL ?? \"/api/backend-proxy/WORKSPACE_ID\";\`\n5. Always include a simulation fallback in the React frontend service layer:\n   - Try the real backend first (fetch to BACKEND_BASE_URL).\n   - If the fetch fails or VITE_BACKEND_URL is absent, return a realistic mocked result from a local \`simulateOperation()\` function.\n   - Show a visible banner when simulation is active: "Running in simulation mode — connect a backend for real processing".\n   - This ensures the Sandpack preview always works, even with no backend running.\n6. Always add a Backend Setup section to NUTRIENTWEBBUILDER.md in the same patch response:\n   - How to set NUTRIENT_LICENSE_KEY\n   - How to run the backend locally (e.g. \`uvicorn main:app --reload\` for Python)\n   - How to set \`VITE_BACKEND_URL=http://localhost:8080\` in .env.local\n   - Migration note: switching from Nucode managed backend to own backend = change VITE_BACKEND_URL only; no React code changes needed.\nDo not import backend SDK packages into React code. The browser preview simulates the pipeline state honestly while the backend/ files contain the real implementation."""

# The proper multi-line replacement with real newlines
new = """If the user asks for Nutrient Python SDK, Node.js Server SDK, Java SDK, .NET SDK, Document Processing, Vision API, extraction, OCR, or any backend pipeline work, follow the Nucode backend contract pattern:

BACKEND CONTRACT (always follow this for server-side SDK builds):
1. Generate a \\`backend/\\` folder with the implementation file (\\`backend/main.py\\` for Python, \\`backend/server.js\\` for Node, etc.) and its dependency file (\\`requirements.txt\\`, \\`package.json\\`, etc.).
2. The backend must implement these REST endpoints accepted as multipart/form-data (fields: \\`file\\` + \\`options\\` JSON string) returning \\`{ result, meta }\\`:
   \\`POST /convert\\`   — DOCX/XLSX/PPTX → PDF, or PDF → image
   \\`POST /ocr\\`       — make a scanned PDF text-searchable
   \\`POST /extract\\`   — extract text, tables, or structured data from PDF
   \\`POST /redact\\`    — apply redactions and return a clean PDF
   \\`POST /watermark\\` — add a text or image watermark
3. All secrets and license keys MUST come from environment variables (\\`os.environ["NUTRIENT_LICENSE_KEY"]\\` for Python, \\`process.env.NUTRIENT_LICENSE_KEY\\` for Node). Never hardcode a key in any generated file.
4. In generated React code, reference the backend via a single constant — NEVER hardcode a URL or key in any component:
   \\`const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_URL ?? "/api/backend-proxy/WORKSPACE_ID";\\`
5. Always include a simulation fallback in the React frontend service layer:
   - Try the real backend first (fetch to BACKEND_BASE_URL).
   - If the fetch fails or VITE_BACKEND_URL is absent, return a realistic mocked result from a local \\`simulateOperation()\\` function.
   - Show a visible banner when simulation is active: "Running in simulation mode — connect a backend for real processing".
   - This ensures the Sandpack preview always works, even with no backend running.
6. Always add a Backend Setup section to NUTRIENTWEBBUILDER.md in the same patch response:
   - How to set NUTRIENT_LICENSE_KEY
   - How to run the backend locally (e.g. \\`uvicorn main:app --reload\\` for Python)
   - How to set \\`VITE_BACKEND_URL=http://localhost:8080\\` in .env.local
   - Migration note: switching from Nucode managed backend to own backend = change VITE_BACKEND_URL only; no React code changes needed.
Do not import backend SDK packages into React code. The browser preview simulates the pipeline state honestly while the backend/ files contain the real implementation."""

if old not in content:
    raise ValueError("Target string not found")

content = content.replace(old, new, 1)

with open("features/ai/prompts.ts", "w") as f:
    f.write(content)

print("done")
