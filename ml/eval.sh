#!/usr/bin/env bash
# Smoke-eval: run fixed prompts through base vs. tuned model and eyeball the diff.
# This is a sanity gate, not a benchmark — see ml/README.md for the real eval policy.
set -euo pipefail
cd "$(dirname "$0")"

BASE_MODEL="${BASE_MODEL:-mlx-community/Qwen3.5-27B-MLX-4bit}"

PROMPTS=(
  "Who are you and who built you?"
  "Write a Python function that returns the n-th Fibonacci number iteratively."
  "If 3x + 7 = 2x - 5, what is x?"
  "Will it rain in Tokyo three weeks from now?"
)

for prompt in "${PROMPTS[@]}"; do
  echo "────────────────────────────────────────────────────────"
  echo "PROMPT: ${prompt}"
  if [ -d ./adapters ]; then
    echo "--- tuned (Astra) ---"
    mlx_lm.generate --model "${BASE_MODEL}" --adapter-path ./adapters \
      --prompt "${prompt}" --max-tokens 300
  fi
  echo "--- base ---"
  mlx_lm.generate --model "${BASE_MODEL}" --prompt "${prompt}" --max-tokens 300
  echo
done
