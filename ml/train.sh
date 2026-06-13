#!/usr/bin/env bash
# QLoRA fine-tune of the Astra base on Apple Silicon (defaults tuned for 48GB).
# Usage: ./train.sh   (override with env vars: BASE_MODEL, ITERS, NUM_LAYERS, BATCH_SIZE)
set -euo pipefail
cd "$(dirname "$0")"

BASE_MODEL="${BASE_MODEL:-mlx-community/Qwen3.5-27B-MLX-4bit}"
ITERS="${ITERS:-600}"
NUM_LAYERS="${NUM_LAYERS:-16}"   # lower to 8 if you hit memory pressure
BATCH_SIZE="${BATCH_SIZE:-1}"

echo "Training Astra adapter"
echo "  base:   ${BASE_MODEL}"
echo "  iters:  ${ITERS} · layers: ${NUM_LAYERS} · batch: ${BATCH_SIZE}"
echo

mlx_lm.lora \
  --model "${BASE_MODEL}" \
  --train \
  --data ./data \
  --batch-size "${BATCH_SIZE}" \
  --num-layers "${NUM_LAYERS}" \
  --iters "${ITERS}" \
  --steps-per-eval 100 \
  --adapter-path ./adapters

echo
echo "Done → adapters/adapters.safetensors"
echo "Next: ./eval.sh to sanity-check, ./serve.sh to serve on :8080"
