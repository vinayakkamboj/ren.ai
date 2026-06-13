#!/usr/bin/env bash
# Serve Astra (base + adapter) as an OpenAI-compatible API on localhost:8080.
# The website's /api/chat route consumes this directly:
#   INFERENCE_BASE_URL=http://localhost:8080/v1
set -euo pipefail
cd "$(dirname "$0")"

BASE_MODEL="${BASE_MODEL:-mlx-community/Qwen3.5-27B-MLX-4bit}"
PORT="${PORT:-8080}"

ADAPTER_ARGS=()
if [ -d ./adapters ]; then
  ADAPTER_ARGS=(--adapter-path ./adapters)
  echo "Serving ${BASE_MODEL} + Astra adapter on :${PORT}"
else
  echo "No ./adapters directory — serving the raw base ${BASE_MODEL} on :${PORT}"
  echo "(run ./train.sh first to serve your fine-tune)"
fi

mlx_lm.server --model "${BASE_MODEL}" "${ADAPTER_ARGS[@]}" --port "${PORT}"
