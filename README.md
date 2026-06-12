# Ren AI

Public website and internal research platform for **Ren AI** — a frontier AI
research organization built around a single premise: *evidence over hype*.

> Building intelligence through reasoning.

## What's here

| Surface | Route | Description |
| --- | --- | --- |
| Homepage | `/` | Hero, benchmark progression, model evolution, playground preview, research philosophy, products, API platform, latest research |
| Playground | `/playground` | Research-grade chat interface preview with visible deliberation, calibrated confidence, and source attribution |
| Research portal | `/research` | Papers, technical reports, safety research, evaluations, model cards, and benchmark methodology — filterable, with full publication pages |
| Models | `/models` | The Ren-1 → Ren-2 → Ren-3 lineage: milestones, training improvements, and the complete benchmark record |
| Products | `/products/[slug]` | Ren Chat, Ren Code, Ren Agents, Ren API, Ren Research |
| API platform | `/platform` | Enterprise presentation: access, documentation, SDKs, deployment, security, reliability |
| Philosophy | `/philosophy` | Research principles and standing commitments |
| Internal platform | `/dashboard` | Model registry, training runs, experiment comparison, datasets, benchmark center, evaluation reports, API analytics, deployment monitoring, GPU utilization |

## Stack

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS 4** — design tokens live in `src/app/globals.css`
- **Framer Motion** — restrained entrance motion, reduced-motion aware
- **PostgreSQL** — internal platform schema in `db/schema.sql`; the UI consumes
  identical shapes from static fixtures (`src/lib/data/platform.ts`) so the app
  runs with no database in development and previews
- shadcn-style component primitives (`cva` + `tailwind-merge`) in `src/components/ui`

## Design system

- **Typography** — Newsreader (editorial serif display) paired with Inter
  (text) and JetBrains Mono (data), on a fluid clamp-based scale
  (`display-xl`, `display`, `headline`, `title`, `lede`)
- **Color** — warm paper surfaces, deep charcoal ink, graphite secondaries,
  stone hairlines, a single muted-bronze accent; the internal platform uses a
  warm graphite dark palette with brass signals
- **Motion** — one entrance pattern (short fade-and-rise), no loops, no parallax

## Development

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run lint
```

All benchmark figures, publications, and platform telemetry are illustrative
fixtures for a fictional organization.
