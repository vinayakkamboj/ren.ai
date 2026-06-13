-- Ren Credit System — database migration
-- Run once in your Supabase project via the SQL editor or CLI.
-- Safe to re-run (all statements use IF NOT EXISTS).

-- ── 1. user_credits ─────────────────────────────────────────────────────────
-- One row per user, holding their current balance.
-- Default balance is the signup bonus (100 credits = $1.00).

CREATE TABLE IF NOT EXISTS public.user_credits (
  user_id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance          integer     NOT NULL DEFAULT 100 CHECK (balance >= 0),
  lifetime_purchased integer   NOT NULL DEFAULT 0,
  lifetime_used    integer     NOT NULL DEFAULT 0,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Row-level security: users can only read their own row.
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can read own credits" ON public.user_credits;
CREATE POLICY "users can read own credits"
  ON public.user_credits FOR SELECT
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE policies — all mutations go through the RPC below.

-- ── 2. credit_transactions ───────────────────────────────────────────────────
-- Append-only ledger of every credit movement.

CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount        integer     NOT NULL,
  type          text        NOT NULL CHECK (type IN ('signup_bonus', 'purchase', 'build_usage', 'refund')),
  tier          text,
  project_id    text,
  description   text,
  balance_after integer     NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS credit_transactions_user_idx
  ON public.credit_transactions (user_id, created_at DESC);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can read own transactions" ON public.credit_transactions;
CREATE POLICY "users can read own transactions"
  ON public.credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- ── 3. Atomic deduction RPC ──────────────────────────────────────────────────
-- SECURITY DEFINER so it runs with elevated rights, bypassing the read-only
-- RLS policies. Called by the Next.js API route (server key), never directly
-- by client code.
--
-- Returns: { ok, error?, balance?, deducted? }

CREATE OR REPLACE FUNCTION public.deduct_build_credits(
  p_user_id   uuid,
  p_amount    integer,
  p_tier      text,
  p_project_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance     integer;
  v_new_balance integer;
BEGIN
  -- Acquire a row-level lock to prevent concurrent double-spend.
  SELECT balance INTO v_balance
  FROM public.user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Auto-create account with signup bonus (first-time users).
    INSERT INTO public.user_credits (user_id, balance)
    VALUES (p_user_id, 100)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT balance INTO v_balance
    FROM public.user_credits
    WHERE user_id = p_user_id
    FOR UPDATE;
  END IF;

  IF v_balance < p_amount THEN
    RETURN jsonb_build_object(
      'ok',      false,
      'error',   'insufficient_credits',
      'balance', v_balance,
      'cost',    p_amount
    );
  END IF;

  v_new_balance := v_balance - p_amount;

  UPDATE public.user_credits
  SET
    balance       = v_new_balance,
    lifetime_used = lifetime_used + p_amount,
    updated_at    = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.credit_transactions
    (user_id, amount, type, tier, project_id, description, balance_after)
  VALUES
    (p_user_id, -p_amount, 'build_usage', p_tier, p_project_id,
     'Astra build · tier ' || p_tier, v_new_balance);

  RETURN jsonb_build_object(
    'ok',       true,
    'balance',  v_new_balance,
    'deducted', p_amount
  );
END;
$$;

-- Grant execute to the authenticated role (supabase service key calls this).
GRANT EXECUTE ON FUNCTION public.deduct_build_credits TO service_role;

-- ── 4. Signup trigger ────────────────────────────────────────────────────────
-- Automatically create a credits row with 100 credits when a user signs up.

CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, balance)
  VALUES (NEW.id, 100)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.credit_transactions
    (user_id, amount, type, description, balance_after)
  VALUES
    (NEW.id, 100, 'signup_bonus', 'Welcome credit — $1.00 free', 100);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_credits ON auth.users;
CREATE TRIGGER on_auth_user_created_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_credits();
