-- ============================================================
-- COMPLETE DATABASE SETUP for PMS application
-- Run this ENTIRE script in Supabase SQL Editor
-- Safe to re-run: uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS
-- ============================================================

-- ============================================================
-- 1. TENANTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. USERS (profiles linked to auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                 TEXT NOT NULL,
  full_name             TEXT,
  role                  TEXT NOT NULL DEFAULT 'worker' CHECK (role IN ('owner','admin','worker')),
  tenant_id             UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  is_active             BOOLEAN DEFAULT TRUE,
  phone                 TEXT,
  approved_by           UUID,
  approved_at           TIMESTAMPTZ,
  onboarding_completed  BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Safe add of columns that might be missing
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. WORKERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.workers (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id                 UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_id             TEXT NOT NULL,
  first_name              TEXT NOT NULL,
  last_name               TEXT NOT NULL,
  email                   TEXT,
  phone                   TEXT,
  date_of_birth           DATE,
  address                 TEXT,
  employment_type         TEXT NOT NULL DEFAULT 'full_time'
                            CHECK (employment_type IN ('full_time','part_time','contract','freelance','intern')),
  department              TEXT,
  position                TEXT,
  salary_per_month        NUMERIC(12,2),
  hire_date               DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active               BOOLEAN DEFAULT TRUE,
  bonus                   NUMERIC(12,2) DEFAULT 0,
  overtime_pay            NUMERIC(12,2) DEFAULT 0,
  increment               NUMERIC(12,2) DEFAULT 0,
  retroactive_adjustment  NUMERIC(12,2) DEFAULT 0,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Safe add of salary management columns (in case table already exists)
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS bonus NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS overtime_pay NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS increment NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS retroactive_adjustment NUMERIC(12,2) DEFAULT 0;

ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. ATTENDANCE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.attendance (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  worker_id         UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  attendance_date   DATE NOT NULL,
  check_in_time     TIMESTAMPTZ,
  check_out_time    TIMESTAMPTZ,
  status            TEXT NOT NULL DEFAULT 'present'
                      CHECK (status IN ('present','absent','late','on_leave','half_day')),
  notes             TEXT,
  biometric_device  TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, worker_id, attendance_date)
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. PAYROLL
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payroll (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  worker_id          UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  period_start_date  DATE NOT NULL,
  period_end_date    DATE NOT NULL,
  base_salary        NUMERIC(12,2) NOT NULL DEFAULT 0,
  overtime_hours     NUMERIC(8,2) DEFAULT 0,
  overtime_rate      NUMERIC(4,2) DEFAULT 1.5,
  deductions         NUMERIC(12,2) DEFAULT 0,
  bonuses            NUMERIC(12,2) DEFAULT 0,
  net_salary         NUMERIC(12,2) NOT NULL DEFAULT 0,
  status             TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','approved','paid','cancelled')),
  paid_date          TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. DEPARTMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.departments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 7. INVENTORY CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.inventory_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 8. INVENTORY ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category_id       UUID REFERENCES public.inventory_categories(id) ON DELETE SET NULL,
  item_code         TEXT NOT NULL,
  name              TEXT NOT NULL,
  description       TEXT,
  quantity_on_hand  INTEGER NOT NULL DEFAULT 0,
  minimum_quantity  INTEGER NOT NULL DEFAULT 10,
  unit_price        NUMERIC(12,2),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 9. INVENTORY TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  item_id           UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  transaction_type  TEXT NOT NULL CHECK (transaction_type IN ('purchase','usage','return','adjustment','damage')),
  quantity          INTEGER NOT NULL,
  transaction_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 10. RLS POLICIES — allow authenticated users to access their own tenant's data
-- ============================================================

-- Helper: get current user's tenant_id
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid();
$$;

-- TENANTS: users can see their own tenant
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_select_own' AND tablename = 'tenants') THEN
    CREATE POLICY tenant_select_own ON public.tenants FOR SELECT USING (id = public.get_user_tenant_id());
  END IF;
END $$;

-- USERS: users can see users in their tenant
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_select_own_tenant' AND tablename = 'users') THEN
    CREATE POLICY users_select_own_tenant ON public.users FOR SELECT USING (tenant_id = public.get_user_tenant_id());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_insert_own' AND tablename = 'users') THEN
    CREATE POLICY users_insert_own ON public.users FOR INSERT WITH CHECK (id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_update_own' AND tablename = 'users') THEN
    CREATE POLICY users_update_own ON public.users FOR UPDATE USING (id = auth.uid());
  END IF;
END $$;

-- Generic tenant-scoped policies for data tables
DO $$ 
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['workers','attendance','payroll','departments','inventory_categories','inventory_items','inventory_transactions']
  LOOP
    -- SELECT
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = tbl || '_select_tenant' AND tablename = tbl) THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (tenant_id = public.get_user_tenant_id())', tbl || '_select_tenant', tbl);
    END IF;
    -- INSERT
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = tbl || '_insert_tenant' AND tablename = tbl) THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id())', tbl || '_insert_tenant', tbl);
    END IF;
    -- UPDATE
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = tbl || '_update_tenant' AND tablename = tbl) THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE USING (tenant_id = public.get_user_tenant_id())', tbl || '_update_tenant', tbl);
    END IF;
    -- DELETE
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = tbl || '_delete_tenant' AND tablename = tbl) THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE USING (tenant_id = public.get_user_tenant_id())', tbl || '_delete_tenant', tbl);
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 11. Re-create handle_new_signup (if not already done)
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
BEGIN
  INSERT INTO tenants (id, name)
  VALUES (gen_random_uuid(), p_full_name || '''s Organization')
  RETURNING id INTO v_tenant_id;

  INSERT INTO users (id, email, full_name, role, tenant_id, is_active, onboarding_completed)
  VALUES (p_user_id, p_email, p_full_name, 'owner', v_tenant_id, TRUE, FALSE)
  ON CONFLICT (id) DO UPDATE SET
    email     = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role      = EXCLUDED.role,
    tenant_id = EXCLUDED.tenant_id
  RETURNING row_to_json(users.*) INTO v_user;

  RETURN v_user;
END;
$$;

GRANT EXECUTE ON FUNCTION public.handle_new_signup(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_signup(UUID, TEXT, TEXT) TO anon;

-- ============================================================
-- 12. updated_at trigger for all tables
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['tenants','users','workers','attendance','payroll','departments','inventory_items']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.triggers
      WHERE trigger_name = 'trg_' || tbl || '_updated_at' AND event_object_table = tbl
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
        'trg_' || tbl || '_updated_at', tbl
      );
    END IF;
  END LOOP;
END $$;

-- Done! All tables, RLS policies, triggers, and the signup function are ready.
