# Nucode managed backend — polyglot Nutrient SDK processing container.
# Python is the front door (FastAPI); Node.js is installed in the same image
# so @nutrient-sdk/node operations run here too. Java/.NET runtimes can be
# added to this image later without changing the proxy contract.
FROM python:3.11-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends nodejs npm \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY node-runner/package.json node-runner/
RUN cd node-runner && npm install --omit=dev

COPY . .

EXPOSE 8080
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
