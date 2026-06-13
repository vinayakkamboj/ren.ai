"""Nucode managed backend — Nutrient SDK processing sidecar.

Runs on Railway (or any Docker host). The Nucode Next.js proxy is the ONLY
intended caller; every request must carry the shared secret header.

Env vars:
    BACKEND_SHARED_SECRET   required — must match the Next.js proxy's value
    NUTRIENT_LICENSE_KEY    optional — runs in trial/watermark mode without it

Contract (all operations):
    POST /{operation}  multipart/form-data
        file     — input document
        options  — JSON string, operation-specific params
    Returns the processed document bytes (application/pdf) or JSON error.

Implemented: /convert (Office/image → PDF, engine=python|node)
Stubbed 501: /ocr /extract /redact /watermark — the Nutrient Python SDK API
reference for these is not published yet (https://www.nutrient.io/api/python/).
Fill them in as the API docs land; the proxy and frontend contract won't change.
"""

import json
import os
import subprocess
import tempfile
from pathlib import Path

from fastapi import FastAPI, Form, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse

SHARED_SECRET = os.environ.get("BACKEND_SHARED_SECRET", "")
LICENSE_KEY = os.environ.get("NUTRIENT_LICENSE_KEY", "")

app = FastAPI(title="Nucode Managed Backend", docs_url=None, redoc_url=None)

_license_registered = False


def ensure_license() -> None:
    """Register the license once, lazily — keeps boot fast and trial mode working."""
    global _license_registered
    if _license_registered or not LICENSE_KEY:
        return
    from nutrient_sdk import License

    License.register_key(LICENSE_KEY)
    _license_registered = True


@app.middleware("http")
async def require_shared_secret(request: Request, call_next):
    if request.url.path != "/health":
        if not SHARED_SECRET or request.headers.get("x-backend-secret") != SHARED_SECRET:
            return JSONResponse({"error": "Unauthorized"}, status_code=401)
    return await call_next(request)


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "sdks": {"python": "nutrient-sdk", "node": "@nutrient-sdk/node"},
        "licensed": bool(LICENSE_KEY),
    }


@app.post("/convert")
async def convert(file: UploadFile, options: str = Form("{}")) -> FileResponse:
    """Convert an Office document or image to PDF in-process."""
    opts = json.loads(options or "{}")
    engine = opts.get("engine", "python")

    workdir = Path(tempfile.mkdtemp(prefix="nucode-"))
    source = workdir / (file.filename or "input")
    source.write_bytes(await file.read())
    output = workdir / "output.pdf"

    if engine == "node":
        result = subprocess.run(
            ["node", "node-runner/convert.mjs", str(source), str(output)],
            capture_output=True,
            text=True,
            timeout=120,
        )
        if result.returncode != 0:
            return JSONResponse(
                {"error": f"Node conversion failed: {result.stderr[-500:]}"},
                status_code=500,
            )
    else:
        ensure_license()
        from nutrient_sdk import Document, PdfExporter

        with Document.open(str(source)) as doc:
            doc.export(str(output), PdfExporter())

    return FileResponse(output, media_type="application/pdf", filename="output.pdf")


def _not_implemented(operation: str) -> JSONResponse:
    return JSONResponse(
        {
            "error": f"Operation '{operation}' is not implemented in the managed backend yet.",
            "hint": "The Nutrient Python SDK API reference for this operation is pending release.",
        },
        status_code=501,
    )


@app.post("/ocr")
async def ocr(file: UploadFile, options: str = Form("{}")):
    # TODO: implement with nutrient_sdk Vision once the API reference is published.
    return _not_implemented("ocr")


@app.post("/extract")
async def extract(file: UploadFile, options: str = Form("{}")):
    # TODO: implement once the extraction API reference is published.
    return _not_implemented("extract")


@app.post("/redact")
async def redact(file: UploadFile, options: str = Form("{}")):
    # TODO: implement once the redaction API reference is published.
    return _not_implemented("redact")


@app.post("/watermark")
async def watermark(file: UploadFile, options: str = Form("{}")):
    # TODO: implement once the watermark API reference is published.
    return _not_implemented("watermark")
