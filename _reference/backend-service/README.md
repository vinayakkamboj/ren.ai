# Nucode Managed Backend (Railway sidecar)

One Docker container with the Nutrient Python SDK and Node.js SDK installed.
The Nucode Next.js app proxies all backend operations here — this service is
never called directly by browsers.

## Deploy to Railway

1. Railway dashboard → **New Project → Deploy from GitHub repo**, pick this repo.
2. In the service settings, set **Root Directory** to `backend-service` (Railway
   auto-detects the Dockerfile).
3. Add environment variables:
   - `BACKEND_SHARED_SECRET` — generate one: `openssl rand -hex 32`
   - `NUTRIENT_LICENSE_KEY` — optional; trial/watermark mode without it
4. Settings → Networking → **Generate Domain** to get the public URL.
5. In Vercel (the Nucode app), set:
   - `BACKEND_SIDECAR_URL` = the Railway URL from step 4
   - `BACKEND_SHARED_SECRET` = same value as step 3

## Verify

```bash
curl https://<railway-url>/health
# → {"status":"ok","sdks":{...},"licensed":true}

curl -X POST https://<railway-url>/convert \
  -H "X-Backend-Secret: <secret>" \
  -F "file=@test.docx" -o out.pdf
```

## Local dev

```bash
cd backend-service
docker build -t nucode-backend .
docker run -p 8080:8080 -e BACKEND_SHARED_SECRET=dev-secret nucode-backend
# then in .env.local: BACKEND_SIDECAR_URL=http://localhost:8080  BACKEND_SHARED_SECRET=dev-secret
```

## Status

- `/convert` — implemented (Python engine default, `{"engine":"node"}` in options for @nutrient-sdk/node)
- `/ocr` `/extract` `/redact` `/watermark` — 501 stubs until the Python SDK API reference for them is published
