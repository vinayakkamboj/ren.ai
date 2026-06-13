# Ren

**Ren is an AI research project building its own reasoning model — Astra — and
the institution around it.**

The name is the thesis: *ren* (錬) — to refine, to temper. We don't claim to
have invented intelligence. We take the strongest open foundation available,
refine it with our own training, our own identity, and our own standards of
honesty, and publish the measurements that prove what it can and cannot do.

## What Ren is, concretely

**1. A model.** Astra is our fine-tune of Qwen3.5-27B (Apache 2.0), trained
via QLoRA to be a calibrated reasoning model for coding and mathematics. Its
defining behavior is honesty under uncertainty: a confident wrong answer is
the failure mode we train against hardest. When Astra doesn't know, it says
so. Training runs on our own hardware; the recipe lives in [`ml/`](ml/) and is
fully reproducible.

**2. A product — Ren Code.** The flagship. AI-powered software engineering
that builds new applications from a prompt, or continues development on an
existing repository: understanding architecture and dependencies, generating
features, refactoring, writing tests, and opening pull requests you review.
The repository workflow is the differentiator — Ren Code works inside the
codebases you already have, not just blank pages.

- **Playground** — a research-grade chat interface that streams from the model.
- **OpenAI-compatible API** — the same model behind a stable endpoint, local
  or cloud, switchable with two environment variables.

**3. A standard.** We publish progress honestly. Capability numbers arrive
only with the evaluation harness that produces them — no benchmark claims
before the method to reproduce them. Negative results enter the record. This is not marketing
copy; it is the operating policy of the project, and the internal platform
(`/dashboard`) is built around enforcing it.

## What Ren is not

- Not a wrapper around someone else's API. The weights are ours to train,
  serve, and ship.
- Not a from-scratch frontier lab — yet. We are honest about standing on
  Qwen's open foundation; the value we add is refinement, calibration,
  identity, and measurement. That is also how every serious lab started:
  by shipping something real and compounding.
- Not hype-driven. If we can't measure a claim, we don't make it.

## The long intent

Ren is built to grow from a one-Mac fine-tune into a research organization:
own data → own adapters → own full fine-tunes → own pretraining, with the
evaluation discipline installed from day one rather than retrofitted. The
roadmap for getting there is in [`buildingren.md`](buildingren.md).

*Building intelligence through reasoning.*
