-- ============================================================
-- DEBUG QUERIES — Run in Supabase SQL Editor
-- Use these to verify your auth + profile setup is correct
-- ============================================================

-- ============================================================
-- 1. Check if user exists in public.users
-- Replace the email with your actual email
-- ============================================================
SELECT id, email, role, tenant_id, is_active, onboarding_completed
FROM public.users
WHERE email = 'Karkiaman2580@gmail.com';

-- ============================================================
-- 2. Check if auth.users has the same user
-- Compare the id from this query with the id from query #1
-- They MUST match — if not, that's the bug
-- ============================================================
SELECT id, email, created_at
FROM auth.users
WHERE email = 'Karkiaman2580@gmail.com';

-- ============================================================
-- 3. Verify IDs match between auth.users and public.users
-- This should return exactly 1 row if everything is correct
-- If it returns 0 rows, your public.users row has a wrong id
-- ============================================================
SELECT
  a.id AS auth_id,
  a.email AS auth_email,
  u.id AS profile_id,
  u.email AS profile_email,
  u.tenant_id,
  u.role,
  CASE WHEN a.id = u.id THEN '✅ IDs MATCH' ELSE '❌ ID MISMATCH' END AS status
FROM auth.users a
LEFT JOIN public.users u ON a.id = u.id
WHERE a.email = 'Karkiaman2580@gmail.com';

-- ============================================================
-- 4. Check if tenant exists for the user
-- ============================================================
SELECT t.id AS tenant_id, t.name AS tenant_name, u.email, u.role
FROM public.users u
JOIN public.tenants t ON u.tenant_id = t.id
WHERE u.email = 'Karkiaman2580@gmail.com';

-- ============================================================
-- 5. List ALL RLS policies on the users table
-- You should see: users_select_self, users_select_tenant,
-- users_insert_own, users_update_own, users_update_tenant, users_delete_tenant
-- ============================================================
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'users'
ORDER BY policyname;

-- ============================================================
-- 6. List ALL RLS policies across all tables (quick check)
-- ============================================================
SELECT tablename, COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- ============================================================
-- 7. Test get_user_tenant_id() function
-- This will return NULL if you're not authenticated in SQL Editor
-- (Expected — SQL Editor runs as postgres superuser)
-- ============================================================
-- SELECT public.get_user_tenant_id();

-- ============================================================
-- 8. TEMPORARY DEBUG: Open SELECT on users to confirm RLS is the issue
-- Run this, test your app, then DROP this policy immediately
-- ============================================================
-- CREATE POLICY debug_users_select_all ON public.users FOR SELECT USING (true);
-- After testing, remove it:
-- DROP POLICY IF EXISTS debug_users_select_all ON public.users;
