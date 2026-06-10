-- =======================================================
-- ScopeDrop v2 Migration: Client Portal Tables
-- Run this ONCE in Supabase Dashboard → SQL Editor
-- =======================================================

-- =============================================
-- 1. PROJECTS
-- =============================================
CREATE TABLE IF NOT EXISTS projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_name   TEXT NOT NULL DEFAULT '',
  client_email  TEXT NOT NULL DEFAULT '',
  scope_id      UUID REFERENCES briefs(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'not_started',
  portal_slug   TEXT UNIQUE NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_portal_slug ON projects(portal_slug);

-- =============================================
-- 2. PORTAL_FILES
-- =============================================
CREATE TABLE IF NOT EXISTS portal_files (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  uploaded_by   TEXT NOT NULL DEFAULT 'freelancer', -- 'freelancer' | 'client'
  file_name     TEXT NOT NULL,
  file_url      TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_files_project_id ON portal_files(project_id);

-- =============================================
-- 3. INVOICES
-- =============================================
CREATE TABLE IF NOT EXISTS invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  amount          INTEGER NOT NULL DEFAULT 0,      -- in paise (₹1 = 100 paise)
  currency        TEXT NOT NULL DEFAULT 'INR',
  status          TEXT NOT NULL DEFAULT 'unpaid',  -- 'unpaid' | 'paid'
  payment_method  TEXT NOT NULL DEFAULT 'upi',     -- 'upi' | 'bank'
  payment_details TEXT NOT NULL DEFAULT '',        -- UPI ID or bank account details
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON invoices(project_id);

-- =============================================
-- 4. PORTAL_ACTIVITY
-- =============================================
CREATE TABLE IF NOT EXISTS portal_activity (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  event       TEXT NOT NULL, -- 'scope_viewed' | 'scope_approved' | 'file_uploaded' | 'invoice_viewed' | 'invoice_paid' | 'portal_created'
  actor       TEXT NOT NULL DEFAULT 'freelancer', -- 'freelancer' | 'client'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_activity_project_id ON portal_activity(project_id);

-- =============================================
-- 5. RLS: Lock down to service_role only
-- =============================================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_activity ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE projects FROM anon, authenticated;
REVOKE ALL ON TABLE portal_files FROM anon, authenticated;
REVOKE ALL ON TABLE invoices FROM anon, authenticated;
REVOKE ALL ON TABLE portal_activity FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE projects TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE portal_files TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE invoices TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE portal_activity TO service_role;

DROP POLICY IF EXISTS "service_role_manage_projects" ON projects;
CREATE POLICY "service_role_manage_projects" ON projects FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_manage_portal_files" ON portal_files;
CREATE POLICY "service_role_manage_portal_files" ON portal_files FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_manage_invoices" ON invoices;
CREATE POLICY "service_role_manage_invoices" ON invoices FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_manage_portal_activity" ON portal_activity;
CREATE POLICY "service_role_manage_portal_activity" ON portal_activity FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================
-- 6. Storage RLS hint (bucket must be created manually in Supabase Dashboard)
-- Bucket name: project-files (private)
-- After creating the bucket, run:
-- =============================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('project-files', 'project-files', false);
-- (or create it via dashboard UI — Storage → New bucket → project-files → Private)
