-- ============================================================
-- TEMPORARY DEBUG: Disable RLS on all tables
-- Use this ONLY to confirm 403 errors are caused by RLS
-- ⚠️ RE-ENABLE IMMEDIATELY after testing!
-- ============================================================

-- === DISABLE RLS (for debugging ONLY) ===
ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions DISABLE ROW LEVEL SECURITY;

-- Now test your app. If queries succeed → the problem was RLS policies.
-- Run the section below to RE-ENABLE RLS after testing.

-- ============================================================
-- RE-ENABLE RLS (run this IMMEDIATELY after debugging)
-- ============================================================
/*
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
*/
