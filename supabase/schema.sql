-- ScopeDrop: Supabase schema
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor → New query)

-- =============================================
-- 1. USERS
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_user_id   TEXT UNIQUE NOT NULL,
  email           TEXT NOT NULL DEFAULT '',
  name            TEXT NOT NULL DEFAULT '',
  avatar_url      TEXT,
  plan            TEXT NOT NULL DEFAULT 'free',
  credits_remaining INTEGER NOT NULL DEFAULT 3,
  razorpay_subscription_id TEXT UNIQUE,
  subscription_status TEXT NOT NULL DEFAULT 'inactive',
  subscription_current_start TIMESTAMPTZ,
  subscription_current_end TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_razorpay_subscription_id ON users(razorpay_subscription_id);

-- =============================================
-- 2. BRIEFS
-- =============================================
CREATE TABLE IF NOT EXISTS briefs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL DEFAULT '',
  client_name     TEXT NOT NULL DEFAULT '',
  raw_input       TEXT NOT NULL DEFAULT '',
  generated_brief JSONB NOT NULL DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'draft',
  share_token     TEXT UNIQUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_briefs_user_id ON briefs(user_id);

-- =============================================
-- 3. PAYMENTS
-- =============================================
CREATE TABLE IF NOT EXISTS payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  razorpay_order_id     TEXT UNIQUE,
  razorpay_payment_id   TEXT,
  razorpay_subscription_id TEXT,
  razorpay_invoice_id   TEXT,
  razorpay_event_id     TEXT UNIQUE,
  event_type            TEXT,
  plan                  TEXT NOT NULL,
  amount                INTEGER NOT NULL DEFAULT 0,
  status                TEXT NOT NULL DEFAULT 'created',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_subscription_id ON payments(razorpay_subscription_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_razorpay_subscription_payment
ON payments(razorpay_subscription_id, razorpay_payment_id)
WHERE razorpay_subscription_id IS NOT NULL AND razorpay_payment_id IS NOT NULL;

-- =============================================
-- 4. SECURITY: RLS + API ROLE LOCKDOWN
-- =============================================
-- The app currently uses custom signed sessions and server-side service-role
-- Supabase access. Browser-facing Supabase roles must not be able to read or
-- mutate private application tables directly.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE users FROM anon, authenticated;
REVOKE ALL ON TABLE briefs FROM anon, authenticated;
REVOKE ALL ON TABLE payments FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE users TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE briefs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE payments TO service_role;

DROP POLICY IF EXISTS "service_role_manage_users" ON users;
CREATE POLICY "service_role_manage_users"
ON users
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_manage_briefs" ON briefs;
CREATE POLICY "service_role_manage_briefs"
ON briefs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_manage_payments" ON payments;
CREATE POLICY "service_role_manage_payments"
ON payments
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================
-- 5. RPC: decrement_credit
-- =============================================
CREATE OR REPLACE FUNCTION decrement_credit(user_id_param UUID)
RETURNS VOID AS $$
  UPDATE users
  SET credits_remaining = GREATEST(credits_remaining - 1, 0)
  WHERE id = user_id_param;
$$ LANGUAGE sql;

REVOKE ALL ON FUNCTION decrement_credit(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION decrement_credit(UUID) TO service_role;
