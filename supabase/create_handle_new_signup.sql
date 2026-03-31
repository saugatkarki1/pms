-- ============================================================
-- Fix: add missing column + create the handle_new_signup RPC
-- Run this ENTIRE script in the Supabase SQL Editor
-- ============================================================

-- Step 1: Add the missing column (safe to re-run, no-ops if it already exists)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Step 2: Drop old function if it exists (avoids signature conflicts)
DROP FUNCTION IF EXISTS public.handle_new_signup(UUID, TEXT, TEXT);

-- Step 3: Recreate the function
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
  -- 1. Create a new tenant for this user
  INSERT INTO tenants (id, name)
  VALUES (gen_random_uuid(), p_full_name || '''s Organization')
  RETURNING id INTO v_tenant_id;

  -- 2. Create the user profile linked to the new tenant
  INSERT INTO users (id, email, full_name, role, tenant_id, is_active, onboarding_completed)
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
    full_name = EXCLUDED.full_name,
    role      = EXCLUDED.role,
    tenant_id = EXCLUDED.tenant_id
  RETURNING row_to_json(users.*) INTO v_user;

  RETURN v_user;
END;
$$;

-- Step 4: Grant execute permissions
GRANT EXECUTE ON FUNCTION public.handle_new_signup(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_signup(UUID, TEXT, TEXT) TO anon;
