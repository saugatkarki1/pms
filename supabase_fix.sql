-- ============================================================
-- STEP 0: Create a SECURITY DEFINER helper function
-- This bypasses RLS so we can safely look up the current
-- user's tenant_id without triggering recursive policy checks
-- on the users table.
-- ============================================================

CREATE OR REPLACE FUNCTION get_my_tenant_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$;

-- ============================================================
-- FIX: Add missing 'is_active' column to workers table
-- ============================================================

ALTER TABLE workers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
UPDATE workers SET is_active = true WHERE is_active IS NULL;

-- ============================================================
-- FIX: RLS Policies for users table
-- Uses auth.uid() direct comparison for own-row access and
-- the helper function for tenant-scoped access (no recursion).
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can view users in their tenant" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Owners and admins can update users in tenant" ON users;
DROP POLICY IF EXISTS "Owners and admins can delete users in tenant" ON users;

-- SELECT: Users can view their own row, OR any row in the same tenant
CREATE POLICY "Users can view users in their tenant" ON users
  FOR SELECT USING (
    id = auth.uid()
    OR tenant_id = get_my_tenant_id()
  );

-- INSERT: Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (
    id = auth.uid()
  );

-- UPDATE: Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (
    id = auth.uid()
  );

-- UPDATE: Owners/admins can update any user in their tenant
CREATE POLICY "Owners and admins can update users in tenant" ON users
  FOR UPDATE USING (
    tenant_id = get_my_tenant_id()
    AND get_my_role() IN ('owner', 'admin')
  );

-- DELETE: Owners/admins can delete users in their tenant
CREATE POLICY "Owners and admins can delete users in tenant" ON users
  FOR DELETE USING (
    tenant_id = get_my_tenant_id()
    AND get_my_role() IN ('owner', 'admin')
  );

-- ============================================================
-- FIX: RLS Policies for workers table
-- Uses helper function instead of sub-query on users
-- ============================================================

ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view workers in their tenant" ON workers;
DROP POLICY IF EXISTS "Users can insert workers in their tenant" ON workers;
DROP POLICY IF EXISTS "Users can update workers in their tenant" ON workers;
DROP POLICY IF EXISTS "Users can delete workers in their tenant" ON workers;
DROP POLICY IF EXISTS "Workers can view own profile" ON workers;
DROP POLICY IF EXISTS "Workers can insert own profile" ON workers;
DROP POLICY IF EXISTS "Workers can update own profile" ON workers;

-- SELECT: Users can view workers in the same tenant
CREATE POLICY "Users can view workers in their tenant" ON workers
  FOR SELECT USING (
    tenant_id = get_my_tenant_id()
  );

-- INSERT: Users can insert workers in their own tenant
CREATE POLICY "Users can insert workers in their tenant" ON workers
  FOR INSERT WITH CHECK (
    tenant_id = get_my_tenant_id()
  );

-- UPDATE: Users can update workers in their own tenant
CREATE POLICY "Users can update workers in their tenant" ON workers
  FOR UPDATE USING (
    tenant_id = get_my_tenant_id()
  );

-- DELETE: Only owners/admins can delete workers
CREATE POLICY "Users can delete workers in their tenant" ON workers
  FOR DELETE USING (
    tenant_id = get_my_tenant_id()
    AND get_my_role() IN ('owner', 'admin')
  );

-- ============================================================
-- FIX: RLS Policies for tenants table
-- ============================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tenant" ON tenants;
DROP POLICY IF EXISTS "Anyone can insert tenants" ON tenants;

-- SELECT: Users can view their own tenant
CREATE POLICY "Users can view own tenant" ON tenants
  FOR SELECT USING (
    id = get_my_tenant_id()
  );

-- INSERT: Allow creating tenants (needed during signup)
CREATE POLICY "Anyone can insert tenants" ON tenants
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- FIX: RLS Policies for departments table
-- ============================================================

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view departments in their tenant" ON departments;
DROP POLICY IF EXISTS "Owners and admins can manage departments" ON departments;

-- SELECT: Anyone in tenant can view departments
CREATE POLICY "Users can view departments in their tenant" ON departments
  FOR SELECT USING (
    tenant_id = get_my_tenant_id()
  );

-- INSERT/UPDATE/DELETE: Owners and admins can manage departments
CREATE POLICY "Owners and admins can manage departments" ON departments
  FOR ALL USING (
    tenant_id = get_my_tenant_id()
    AND get_my_role() IN ('owner', 'admin')
  );
