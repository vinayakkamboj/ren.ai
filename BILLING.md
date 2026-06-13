# Ren Credit System — Billing Reference

> Internal document. Last updated: 2026-06-13

---

## Overview

Ren Code uses a **credit-based billing model**. Users buy Ren Credits and spend
them on Astra builds. All credit operations are server-side; the client never
controls or even sees the underlying API cost structure.

```
1 Ren Credit = $0.01 USD
```

New users receive **100 free credits** ($1.00 value) on signup.

---

## Credit Purchase Packs

| Pack    | Price  | Credits | Bonus | Effective rate |
|---------|--------|---------|-------|----------------|
| Starter | $5.00  | 550     | +50   | $0.0091/cr     |
| Growth  | $15.00 | 1,800   | +300  | $0.0083/cr     |
| Pro     | $50.00 | 7,000   | +2000 | $0.0071/cr     |
| Studio  | $150.00| 24,000  | +9000 | $0.0063/cr     |

Credits never expire. Larger packs give better value (more bonus credits).

---

## Per-Build Cost

Credits are deducted once per message sent to Astra (one "build call").
The cost is based on the model tier selected.

| Tier         | Credits/build | USD equiv. | Anthropic cost* | Margin |
|--------------|---------------|-----------|-----------------|--------|
| Astra Flash  | 8             | $0.08     | ~$0.046         | ~73%   |
| Astra Flow   | 35            | $0.35     | ~$0.174         | ~101%  |
| Astra Pro    | 175           | $1.75     | ~$0.870         | ~101%  |
| Astra Max    | 200           | $2.00     | ~$0.870         | ~130%  |

*Anthropic API cost estimated at: 8k input + 10k output tokens per build call.
 Flash: H4.5 ($0.80/$4.00/MTok), Flow: S4.6 ($3.00/$15.00/MTok),
 Pro/Max: O4.8/F5 ($15.00/$75.00/MTok).

Margins are intentionally ~100% to cover:
- Server hosting (Vercel / Railway)
- Supabase database
- Support operations
- Business overhead
- Net profit

---

## What Users Can Build with Free Credits

With 100 free credits a new user can run:

| Tier         | Free builds |
|--------------|-------------|
| Astra Flash  | 12 builds   |
| Astra Flow   | 2 builds    |
| Astra Pro    | 0 builds    |
| Astra Max    | 0 builds    |

This gives a meaningful trial without giving away premium capacity.

---

## Security Architecture

### 1. Server-side only
The credit check and deduction happen in `/api/builder` (Node.js) before
the Anthropic call is made. The client **never** sends a credit amount or
balance — those come from the database.

### 2. Atomic deduction (no double-spend)
Credit deduction uses the `deduct_build_credits` Supabase RPC, which:
1. Acquires a row-level lock (`SELECT ... FOR UPDATE`)
2. Checks the balance inside the transaction
3. Deducts and logs atomically

Two simultaneous requests cannot both succeed when only one credit remains.

### 3. Identity from session cookie
The user id is always read from the Supabase server session cookie (set via
`createClient` from `@supabase/ssr`). The client cannot inject a different
`user_id` into the request.

### 4. Fail-closed on errors
If the credit system encounters an unexpected DB error, the API route returns
500 and the build does **not** proceed. Credits are never consumed without a
build.

### 5. Development bypass
If `NEXT_PUBLIC_SUPABASE_URL` is not set (local dev), or if the credits table
doesn't exist yet (pre-migration), the gate is skipped so development works.
In production, run the migration to activate enforcement.

### 6. Row-level security
`user_credits` and `credit_transactions` have RLS enabled. Users can only
`SELECT` their own rows. All `INSERT`/`UPDATE` goes through `SECURITY DEFINER`
RPC functions, not direct client mutations.

### 7. Rate limiting (future)
Planned: add a per-user build rate limit in the Supabase function (e.g., max
20 builds per minute) to prevent scripted abuse even with valid credits.

---

## Database Schema

See `supabase/migrations/20260613_credits.sql` for the full schema.

Tables:
- `user_credits` — current balance per user
- `credit_transactions` — append-only ledger (signup_bonus / purchase / build_usage / refund)

Function:
- `deduct_build_credits(user_id, amount, tier, project_id)` — atomic deduction RPC

Trigger:
- `on_auth_user_created_credits` — grants 100 credits + logs signup_bonus on new signup

---

## Running the Migration

```bash
# Via Supabase CLI
supabase db push --db-url "$DATABASE_URL"

# Or paste supabase/migrations/20260613_credits.sql into the Supabase
# Dashboard → SQL Editor and run it.
```

After the migration, new signups automatically receive 100 credits.
Existing users get their row created on first login (via `ensureCreditsAccount`).

---

## Future Plans

- **Stripe integration** — checkout sessions for credit purchases
- **Subscription tier** — flat-rate monthly plan for high-volume users
- **Team billing** — shared credit pool across team members
- **Rate limits** — build frequency limits per tier
- **Credit expiry** — optional expiry on purchased (not free) credits
- **Usage alerts** — email notification when balance drops below threshold
