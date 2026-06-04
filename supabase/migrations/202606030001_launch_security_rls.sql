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

REVOKE ALL ON FUNCTION decrement_credit(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION decrement_credit(UUID) TO service_role;
