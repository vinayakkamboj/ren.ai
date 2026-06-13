# Astra fine-tuning kit (Apple Silicon, 48GB)

Turn `Qwen3.5-27B` into **Astra** — your own model — with QLoRA on a single
48GB Mac. No paid services anywhere in this pipeline.

## Why these choices

- **Base: Qwen3.5-27B** — strongest dense Apache-2.0 Qwen for coding + math
  that both runs and trains on 48GB. (Qwen3-Coder-Next 80B runs on this Mac
  at 4-bit, but cannot be trained on it.)
- **QLoRA via MLX** — Unsloth/Axolotl are CUDA-only; MLX is the Mac-native
  stack. Passing a 4-bit model with `--train` automatically trains
  full-precision LoRA adapters over the quantized base (~20GB peak, fits 48GB
  with room for the OS).
- **OpenAI-compatible serving** — `mlx_lm.server` exposes `/v1/chat/completions`,
  which is exactly what the website's `/api/chat` route speaks. The same route
  works unchanged against cloud vLLM later.

## 0. Prerequisites

```bash
# Python 3.10+ on Apple Silicon
pip install -U mlx-lm "huggingface_hub[cli]"
```

Close memory-hungry apps before training. Expect the run to use ~20–28GB.

## 1. Get the base model

```bash
# Pre-quantized 4-bit (recommended on 48GB; ~16GB download)
hf download mlx-community/Qwen3.5-27B-MLX-4bit

# OR the raw bf16 weights (~55GB) if you want to quantize yourself:
#   hf download Qwen/Qwen3.5-27B
#   mlx_lm.convert --hf-path Qwen/Qwen3.5-27B -q --q-bits 4
```

## 2. Build the dataset

`data/train.jsonl` and `data/valid.jsonl` ship with starter examples that
teach the model its **identity** (it is Astra, built by Ren AI) and its
**voice** (calibrated, evidence-first, honest about uncertainty). Format:

```json
{"messages": [{"role": "user", "content": "…"}, {"role": "assistant", "content": "…"}]}
```

The starter set is enough to verify the pipeline and shift identity/tone.
For real capability gains, grow it to thousands of examples — your own coding
conventions, worked math solutions, reviewed agent transcripts. Quality beats
volume; never include benchmark problems (see eval contamination note below).

## 3. Train

```bash
./train.sh                  # defaults tuned for 48GB
# knobs: BASE_MODEL, ITERS (default 600), NUM_LAYERS (default 16), BATCH_SIZE (default 1)
```

Produces `adapters/adapters.safetensors`. If you hit memory pressure, lower
`NUM_LAYERS` to 8 before anything else.

## 4. Evaluate before you believe it

```bash
./eval.sh                   # smoke prompts through base vs. adapter
```

`eval.sh` is a sanity gate, not a benchmark. Before shipping any adapter,
run a fixed suite you never train on (EvalPlus, a held-out AIME set) against
base and tuned models and compare. A fine-tune that isn't measured is a
regression waiting to happen.

## 5. Serve locally

```bash
./serve.sh                  # OpenAI-compatible server on http://localhost:8080/v1
```

Then point the website at it (`.env.local` in the repo root):

```
INFERENCE_BASE_URL=http://localhost:8080/v1
INFERENCE_MODEL_ID=astra
```

`npm run dev` → open `/playground` → the session bar shows **Live** and
responses stream from your model.

## 6. Make it permanent (fuse) and go to the world

```bash
mlx_lm.fuse --model mlx-community/Qwen3.5-27B-MLX-4bit \
  --adapter-path ./adapters --save-path ./astra
```

- **Local daily use:** serve `./astra` directly, or convert to GGUF for Ollama.
- **Free public demo:** keep serving from the Mac and expose it with a free
  Cloudflare tunnel (`cloudflared tunnel --url http://localhost:8080`), then
  set `INFERENCE_BASE_URL` on your Vercel deployment to the tunnel URL.
- **Always-on later (paid):** push `./astra` to a private Hugging Face repo
  and serve with vLLM on serverless GPU (Modal / RunPod). The website needs
  zero code changes — only the two env vars.

## Free GPU escape hatch

When the Mac becomes the bottleneck (bigger datasets, more iterations):
**Kaggle Notebooks** give 30 free GPU-hours/week. Run an Unsloth QLoRA
notebook there on the same JSONL data, download the adapter (a few hundred
MB), and fuse/serve on the Mac exactly as above.
