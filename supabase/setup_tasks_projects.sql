-- ============================================================
-- TASKS & PROJECTS MODULE
-- Run this in Supabase SQL Editor
-- Safe to re-run: uses IF NOT EXISTS
-- ============================================================

-- Projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','completed','archived')),
  start_date DATE,
  end_date DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES public.workers(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo','in_progress','review','completed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  due_date DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Avatar URL column on users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- ============================================================
-- RLS Policies for projects and tasks
-- ============================================================
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['projects','tasks']
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = tbl || '_select_tenant' AND tablename = tbl) THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (tenant_id = public.get_user_tenant_id())', tbl || '_select_tenant', tbl);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = tbl || '_insert_tenant' AND tablename = tbl) THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id())', tbl || '_insert_tenant', tbl);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = tbl || '_update_tenant' AND tablename = tbl) THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE USING (tenant_id = public.get_user_tenant_id())', tbl || '_update_tenant', tbl);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = tbl || '_delete_tenant' AND tablename = tbl) THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE USING (tenant_id = public.get_user_tenant_id())', tbl || '_delete_tenant', tbl);
    END IF;
  END LOOP;
END $$;

-- updated_at triggers
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['projects','tasks']
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

-- Done! Projects, tasks tables, avatar_url column, RLS, and triggers ready.
