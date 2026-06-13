-- User approval queue: new signups wait here until the admin approves them.
CREATE TABLE IF NOT EXISTS user_approvals (
  user_id      UUID        PRIMARY KEY,
  email        TEXT        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at  TIMESTAMPTZ,
  reviewed_by  TEXT
);

ALTER TABLE user_approvals ENABLE ROW LEVEL SECURITY;

-- Users can read only their own row (so the pending-approval page can poll status)
CREATE POLICY "Users can read own approval status"
  ON user_approvals FOR SELECT
  USING (auth.uid() = user_id);

-- Service role bypasses RLS for admin operations
