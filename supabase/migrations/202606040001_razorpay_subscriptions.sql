ALTER TABLE users
  ADD COLUMN IF NOT EXISTS razorpay_subscription_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS subscription_current_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_current_end TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_razorpay_subscription_id
ON users(razorpay_subscription_id);

ALTER TABLE payments
  ALTER COLUMN razorpay_order_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS razorpay_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_invoice_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_event_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS event_type TEXT;

CREATE INDEX IF NOT EXISTS idx_payments_razorpay_subscription_id
ON payments(razorpay_subscription_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_razorpay_subscription_payment
ON payments(razorpay_subscription_id, razorpay_payment_id)
WHERE razorpay_subscription_id IS NOT NULL AND razorpay_payment_id IS NOT NULL;
