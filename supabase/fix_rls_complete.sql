-- ============================================================
-- COMPLETE RLS FIX — Run in Supabase SQL Editor
-- Fixes 403 Forbidden errors on all tables
-- Safe to re-run multiple times
-- ============================================================

-- ============================================================
-- STEP 1: Drop ALL existing RLS policies (clean slate)
-- ============================================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'tenants','users','workers','attendance','payroll',
        'departments','inventory_categories','inventory_items','inventory_transactions'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- ✅ All old policies dropped

-- ============================================================
-- STEP 2: Ensure RLS is ENABLED on all tables
-- ============================================================
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 3: Recreate get_user_tenant_id() — SECURITY DEFINER
-- This function bypasses RLS to read the users table
-- ============================================================
DROP FUNCTION IF EXISTS public.get_user_tenant_id();

CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid();
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_tenant_id() TO anon;

-- ============================================================
-- STEP 4: USERS table policies
-- ============================================================

-- users: SELECT own row always (breaks circular dependency)
CREATE POLICY users_select_self
  ON public.users FOR SELECT
  USING (id = auth.uid());

-- users: SELECT all users in same tenant
CREATE POLICY users_select_tenant
  ON public.users FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

-- users: INSERT own profile only
CREATE POLICY users_insert_own
  ON public.users FOR INSERT
  WITH CHECK (id = auth.uid());

-- users: UPDATE own profile only
CREATE POLICY users_update_own
  ON public.users FOR UPDATE
  USING (id = auth.uid());

-- users: UPDATE any user in same tenant (for owner/admin approvals)
CREATE POLICY users_update_tenant
  ON public.users FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id());

-- users: DELETE in same tenant (for owner rejecting workers)
CREATE POLICY users_delete_tenant
  ON public.users FOR DELETE
  USING (tenant_id = public.get_user_tenant_id());

-- ============================================================
-- STEP 5: TENANTS table policies
-- ============================================================

-- tenants: SELECT own tenant
CREATE POLICY tenants_select_own
  ON public.tenants FOR SELECT
  USING (id = public.get_user_tenant_id());

-- tenants: INSERT (for signup flow via SECURITY DEFINER function)
-- The handle_new_signup function uses SECURITY DEFINER so this
-- policy only needs to cover edge cases
CREATE POLICY tenants_insert_authenticated
  ON public.tenants FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- tenants: UPDATE own tenant
CREATE POLICY tenants_update_own
  ON public.tenants FOR UPDATE
  USING (id = public.get_user_tenant_id());

-- ============================================================
-- STEP 6: WORKERS table policies (tenant-scoped)
-- ============================================================

-- workers: SELECT — users can see workers in their tenant
CREATE POLICY workers_select_tenant
  ON public.workers FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

-- workers: INSERT — users can add workers to their tenant
CREATE POLICY workers_insert_tenant
  ON public.workers FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id());

-- workers: UPDATE — users can update workers in their tenant
CREATE POLICY workers_update_tenant
  ON public.workers FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id());

-- workers: DELETE — users can delete workers in their tenant
CREATE POLICY workers_delete_tenant
  ON public.workers FOR DELETE
  USING (tenant_id = public.get_user_tenant_id());

-- ============================================================
-- STEP 7: ATTENDANCE table policies (tenant-scoped)
-- ============================================================

CREATE POLICY attendance_select_tenant
  ON public.attendance FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY attendance_insert_tenant
  ON public.attendance FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY attendance_update_tenant
  ON public.attendance FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY attendance_delete_tenant
  ON public.attendance FOR DELETE
  USING (tenant_id = public.get_user_tenant_id());

-- ============================================================
-- STEP 8: PAYROLL table policies (tenant-scoped)
-- ============================================================

CREATE POLICY payroll_select_tenant
  ON public.payroll FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY payroll_insert_tenant
  ON public.payroll FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY payroll_update_tenant
  ON public.payroll FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY payroll_delete_tenant
  ON public.payroll FOR DELETE
  USING (tenant_id = public.get_user_tenant_id());

-- ============================================================
-- STEP 9: DEPARTMENTS table policies (tenant-scoped)
-- ============================================================

CREATE POLICY departments_select_tenant
  ON public.departments FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY departments_insert_tenant
  ON public.departments FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY departments_update_tenant
  ON public.departments FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY departments_delete_tenant
  ON public.departments FOR DELETE
  USING (tenant_id = public.get_user_tenant_id());

-- ============================================================
-- STEP 10: INVENTORY_CATEGORIES policies (tenant-scoped)
-- ============================================================

CREATE POLICY inventory_categories_select_tenant
  ON public.inventory_categories FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY inventory_categories_insert_tenant
  ON public.inventory_categories FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY inventory_categories_update_tenant
  ON public.inventory_categories FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY inventory_categories_delete_tenant
  ON public.inventory_categories FOR DELETE
  USING (tenant_id = public.get_user_tenant_id());

-- ============================================================
-- STEP 11: INVENTORY_ITEMS policies (tenant-scoped)
-- ============================================================

CREATE POLICY inventory_items_select_tenant
  ON public.inventory_items FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY inventory_items_insert_tenant
  ON public.inventory_items FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY inventory_items_update_tenant
  ON public.inventory_items FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY inventory_items_delete_tenant
  ON public.inventory_items FOR DELETE
  USING (tenant_id = public.get_user_tenant_id());

-- ============================================================
-- STEP 12: INVENTORY_TRANSACTIONS policies (tenant-scoped)
-- ============================================================

CREATE POLICY inventory_transactions_select_tenant
  ON public.inventory_transactions FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY inventory_transactions_insert_tenant
  ON public.inventory_transactions FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY inventory_transactions_update_tenant
  ON public.inventory_transactions FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY inventory_transactions_delete_tenant
  ON public.inventory_transactions FOR DELETE
  USING (tenant_id = public.get_user_tenant_id());

-- ============================================================
-- STEP 13: Recreate handle_new_signup (SECURITY DEFINER)
-- This function bypasses ALL RLS to create tenant + user atomically
-- ============================================================
DROP FUNCTION IF EXISTS public.handle_new_signup(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.handle_new_signup(
  p_user_id UUID,
  p_email TEXT,
  p_full_name TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_user      JSON;
  v_existing  UUID;
BEGIN
  -- Check if user already exists (prevent duplicate creation)
  SELECT id INTO v_existing FROM public.users WHERE id = p_user_id;
  IF v_existing IS NOT NULL THEN
    -- User already exists, return existing data
    SELECT row_to_json(u.*) INTO v_user FROM public.users u WHERE u.id = p_user_id;
    RETURN v_user;
  END IF;

  -- Create a new tenant for this user
  INSERT INTO public.tenants (id, name)
  VALUES (gen_random_uuid(), p_full_name || '''s Organization')
  RETURNING id INTO v_tenant_id;

  -- Create the user profile linked to the new tenant
  INSERT INTO public.users (id, email, full_name, role, tenant_id, is_active, onboarding_completed)
  VALUES (
    p_user_id,
    p_email,
    p_full_name,
    'owner',
    v_tenant_id,
    TRUE,
    FALSE
  )
  ON CONFLICT (id) DO UPDATE SET
    email     = EXCLUDED.email,
    full_name = EXCLUDED.full_name
  RETURNING row_to_json(users.*) INTO v_user;

  RETURN v_user;
END;
$$;

GRANT EXECUTE ON FUNCTION public.handle_new_signup(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_signup(UUID, TEXT, TEXT) TO anon;

-- ============================================================
-- STEP 14: Verify policies were created
-- ============================================================
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================
-- ✅ DONE! All RLS policies are now correctly configured.
-- ============================================================
