-- ============================================================
-- FIX RLS FINAL — Run ALL AT ONCE in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- STEP A: GRANT table-level permissions
-- ============================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_transactions TO authenticated;

GRANT SELECT ON public.users TO anon;
GRANT SELECT ON public.tenants TO anon;

-- ============================================================
-- STEP B: Drop EVERY policy on ALL tables (dynamic, catches all)
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
        'users','tenants','workers','attendance','payroll',
        'departments','inventory_categories','inventory_items','inventory_transactions'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- ============================================================
-- STEP C: Now safe to drop and recreate functions
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

GRANT EXECUTE ON FUNCTION public.get_user_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_tenant_id() TO anon;

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
  SELECT id INTO v_existing FROM public.users WHERE id = p_user_id;
  IF v_existing IS NOT NULL THEN
    SELECT row_to_json(u.*) INTO v_user FROM public.users u WHERE u.id = p_user_id;
    RETURN v_user;
  END IF;

  INSERT INTO public.tenants (id, name)
  VALUES (gen_random_uuid(), p_full_name || '''s Organization')
  RETURNING id INTO v_tenant_id;

  INSERT INTO public.users (id, email, full_name, role, tenant_id, is_active, onboarding_completed)
  VALUES (p_user_id, p_email, p_full_name, 'owner', v_tenant_id, TRUE, FALSE)
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
-- STEP D: Enable RLS on all tables
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP E: Recreate policies — USERS
-- ============================================================

CREATE POLICY users_select_self
  ON public.users FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY users_select_tenant
  ON public.users FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY users_insert_own
  ON public.users FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY users_update_own
  ON public.users FOR UPDATE TO authenticated
  USING (id = auth.uid());

CREATE POLICY users_update_tenant
  ON public.users FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY users_delete_tenant
  ON public.users FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- ============================================================
-- STEP F: Recreate policies — TENANTS
-- ============================================================

CREATE POLICY tenants_select_own
  ON public.tenants FOR SELECT TO authenticated
  USING (id = public.get_user_tenant_id());

CREATE POLICY tenants_insert_authenticated
  ON public.tenants FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY tenants_update_own
  ON public.tenants FOR UPDATE TO authenticated
  USING (id = public.get_user_tenant_id());

-- ============================================================
-- STEP G: Recreate policies — WORKERS
-- ============================================================

CREATE POLICY workers_select_tenant ON public.workers FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY workers_insert_tenant ON public.workers FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id());
CREATE POLICY workers_update_tenant ON public.workers FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY workers_delete_tenant ON public.workers FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- ============================================================
-- STEP H: Recreate policies — ATTENDANCE
-- ============================================================

CREATE POLICY attendance_select_tenant ON public.attendance FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY attendance_insert_tenant ON public.attendance FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id());
CREATE POLICY attendance_update_tenant ON public.attendance FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY attendance_delete_tenant ON public.attendance FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- ============================================================
-- STEP I: Recreate policies — PAYROLL
-- ============================================================

CREATE POLICY payroll_select_tenant ON public.payroll FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY payroll_insert_tenant ON public.payroll FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id());
CREATE POLICY payroll_update_tenant ON public.payroll FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY payroll_delete_tenant ON public.payroll FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- ============================================================
-- STEP J: Recreate policies — DEPARTMENTS
-- ============================================================

CREATE POLICY departments_select_tenant ON public.departments FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY departments_insert_tenant ON public.departments FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id());
CREATE POLICY departments_update_tenant ON public.departments FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY departments_delete_tenant ON public.departments FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- ============================================================
-- STEP K: Recreate policies — INVENTORY
-- ============================================================

CREATE POLICY inventory_categories_select_tenant ON public.inventory_categories FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY inventory_categories_insert_tenant ON public.inventory_categories FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id());
CREATE POLICY inventory_categories_update_tenant ON public.inventory_categories FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY inventory_categories_delete_tenant ON public.inventory_categories FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY inventory_items_select_tenant ON public.inventory_items FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY inventory_items_insert_tenant ON public.inventory_items FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id());
CREATE POLICY inventory_items_update_tenant ON public.inventory_items FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY inventory_items_delete_tenant ON public.inventory_items FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY inventory_transactions_select_tenant ON public.inventory_transactions FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY inventory_transactions_insert_tenant ON public.inventory_transactions FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id());
CREATE POLICY inventory_transactions_update_tenant ON public.inventory_transactions FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY inventory_transactions_delete_tenant ON public.inventory_transactions FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- ============================================================
-- VERIFY
-- ============================================================

SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
