-- ============================================================
-- SUPABASE COMPLETE DATABASE SETUP
-- PMS (Payroll Management System)
--
-- Run this entire script in the Supabase SQL Editor.
-- It creates everything from scratch in the correct order.
-- ============================================================


-- ============================================================
-- STEP 1: Helper Functions (SECURITY DEFINER)
-- These bypass RLS to avoid infinite recursion when policies
-- need to look up the current user's tenant_id or role.
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
-- STEP 2: Auto-update trigger function for updated_at columns
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- STEP 3: Create Tables
-- ============================================================

-- 3a. tenants
CREATE TABLE IF NOT EXISTS tenants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  email       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3b. users (references auth.users and tenants)
CREATE TABLE IF NOT EXISTS users (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email                 TEXT NOT NULL,
  full_name             TEXT,
  role                  TEXT NOT NULL DEFAULT 'worker'
                          CHECK (role IN ('owner', 'admin', 'worker')),
  is_active             BOOLEAN NOT NULL DEFAULT false,
  phone                 TEXT,
  approved_by           UUID REFERENCES auth.users(id),
  approved_at           TIMESTAMPTZ,
  onboarding_completed  BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3c. departments
CREATE TABLE IF NOT EXISTS departments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3d. workers
CREATE TABLE IF NOT EXISTS workers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_id       TEXT NOT NULL,
  first_name        TEXT NOT NULL,
  last_name         TEXT NOT NULL,
  email             TEXT,
  phone             TEXT,
  date_of_birth     DATE,
  address           TEXT,
  employment_type   TEXT NOT NULL DEFAULT 'full_time'
                      CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'intern', 'freelance')),
  department        TEXT,
  position          TEXT,
  salary_per_month  NUMERIC(12,2) DEFAULT 0,
  hire_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3e. attendance
CREATE TABLE IF NOT EXISTS attendance (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  worker_id         UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  attendance_date   DATE NOT NULL,
  check_in_time     TEXT,
  check_out_time    TEXT,
  status            TEXT NOT NULL DEFAULT 'present'
                      CHECK (status IN ('present', 'absent', 'late', 'on_leave', 'half_day')),
  notes             TEXT,
  biometric_device  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3f. payroll
CREATE TABLE IF NOT EXISTS payroll (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  worker_id           UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  period_start_date   DATE NOT NULL,
  period_end_date     DATE NOT NULL,
  base_salary         NUMERIC(12,2) NOT NULL DEFAULT 0,
  overtime_hours      NUMERIC(8,2) NOT NULL DEFAULT 0,
  overtime_rate       NUMERIC(4,2) NOT NULL DEFAULT 1.5,
  deductions          NUMERIC(12,2) NOT NULL DEFAULT 0,
  bonuses             NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_salary          NUMERIC(12,2) NOT NULL DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  paid_date           TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- STEP 4: Indexes
-- ============================================================

-- tenants
CREATE INDEX IF NOT EXISTS idx_tenants_email         ON tenants(email);

-- users
CREATE INDEX IF NOT EXISTS idx_users_tenant_id       ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email            ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role             ON users(role);

-- departments
CREATE INDEX IF NOT EXISTS idx_departments_tenant_id  ON departments(tenant_id);

-- workers
CREATE INDEX IF NOT EXISTS idx_workers_tenant_id      ON workers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workers_user_id        ON workers(user_id);
CREATE INDEX IF NOT EXISTS idx_workers_employee_id    ON workers(employee_id);
CREATE INDEX IF NOT EXISTS idx_workers_department     ON workers(department);

-- attendance
CREATE INDEX IF NOT EXISTS idx_attendance_tenant_id   ON attendance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_attendance_worker_id   ON attendance(worker_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date        ON attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_status      ON attendance(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_unique
  ON attendance(worker_id, attendance_date, tenant_id);

-- payroll
CREATE INDEX IF NOT EXISTS idx_payroll_tenant_id      ON payroll(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payroll_worker_id      ON payroll(worker_id);
CREATE INDEX IF NOT EXISTS idx_payroll_period         ON payroll(period_start_date, period_end_date);
CREATE INDEX IF NOT EXISTS idx_payroll_status         ON payroll(status);


-- ============================================================
-- STEP 5: Triggers (auto-update updated_at)
-- ============================================================

CREATE TRIGGER set_workers_updated_at
  BEFORE UPDATE ON workers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_attendance_updated_at
  BEFORE UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_payroll_updated_at
  BEFORE UPDATE ON payroll
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- STEP 6: Row Level Security (RLS)
-- ============================================================

-- ------------------------------------------------
-- 6a. tenants
-- ------------------------------------------------
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant" ON tenants
  FOR SELECT USING (
    id = get_my_tenant_id()
  );

CREATE POLICY "Anyone can insert tenants" ON tenants
  FOR INSERT WITH CHECK (true);

-- ------------------------------------------------
-- 6b. users
-- ------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- SELECT: own row OR same tenant
CREATE POLICY "Users can view users in their tenant" ON users
  FOR SELECT USING (
    id = auth.uid()
    OR tenant_id = get_my_tenant_id()
  );

-- INSERT: own profile only
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (
    id = auth.uid()
  );

-- UPDATE: own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (
    id = auth.uid()
  );

-- UPDATE: owners/admins can update users in their tenant
CREATE POLICY "Owners and admins can update users in tenant" ON users
  FOR UPDATE USING (
    tenant_id = get_my_tenant_id()
    AND get_my_role() IN ('owner', 'admin')
  );

-- DELETE: owners/admins can delete users in their tenant
CREATE POLICY "Owners and admins can delete users in tenant" ON users
  FOR DELETE USING (
    tenant_id = get_my_tenant_id()
    AND get_my_role() IN ('owner', 'admin')
  );

-- ------------------------------------------------
-- 6c. departments
-- ------------------------------------------------
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view departments in their tenant" ON departments
  FOR SELECT USING (
    tenant_id = get_my_tenant_id()
  );

CREATE POLICY "Owners and admins can manage departments" ON departments
  FOR ALL USING (
    tenant_id = get_my_tenant_id()
    AND get_my_role() IN ('owner', 'admin')
  );

-- ------------------------------------------------
-- 6d. workers
-- ------------------------------------------------
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workers in their tenant" ON workers
  FOR SELECT USING (
    tenant_id = get_my_tenant_id()
  );

CREATE POLICY "Users can insert workers in their tenant" ON workers
  FOR INSERT WITH CHECK (
    tenant_id = get_my_tenant_id()
  );

CREATE POLICY "Users can update workers in their tenant" ON workers
  FOR UPDATE USING (
    tenant_id = get_my_tenant_id()
  );

CREATE POLICY "Owners and admins can delete workers in tenant" ON workers
  FOR DELETE USING (
    tenant_id = get_my_tenant_id()
    AND get_my_role() IN ('owner', 'admin')
  );

-- ------------------------------------------------
-- 6e. attendance
-- ------------------------------------------------
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attendance in their tenant" ON attendance
  FOR SELECT USING (
    tenant_id = get_my_tenant_id()
  );

CREATE POLICY "Users can insert attendance in their tenant" ON attendance
  FOR INSERT WITH CHECK (
    tenant_id = get_my_tenant_id()
  );

CREATE POLICY "Users can update attendance in their tenant" ON attendance
  FOR UPDATE USING (
    tenant_id = get_my_tenant_id()
  );

CREATE POLICY "Owners and admins can delete attendance in tenant" ON attendance
  FOR DELETE USING (
    tenant_id = get_my_tenant_id()
    AND get_my_role() IN ('owner', 'admin')
  );

-- ------------------------------------------------
-- 6f. payroll
-- ------------------------------------------------
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payroll in their tenant" ON payroll
  FOR SELECT USING (
    tenant_id = get_my_tenant_id()
  );

CREATE POLICY "Users can insert payroll in their tenant" ON payroll
  FOR INSERT WITH CHECK (
    tenant_id = get_my_tenant_id()
  );

CREATE POLICY "Users can update payroll in their tenant" ON payroll
  FOR UPDATE USING (
    tenant_id = get_my_tenant_id()
  );

CREATE POLICY "Owners and admins can delete payroll in tenant" ON payroll
  FOR DELETE USING (
    tenant_id = get_my_tenant_id()
    AND get_my_role() IN ('owner', 'admin')
  );


-- ============================================================
-- DONE! All tables, indexes, triggers, and RLS policies created.
-- ============================================================
