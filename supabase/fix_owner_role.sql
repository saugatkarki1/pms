-- ============================================================
-- Fix: Ensure your account has the 'owner' role
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Step 1: Check your current role (verify the problem)
SELECT id, email, role, tenant_id, is_active 
FROM public.users 
WHERE email = 'Karkiaman2580@gmail.com';

-- Step 2: Update your role to 'owner'
UPDATE public.users 
SET role = 'owner' 
WHERE email = 'Karkiaman2580@gmail.com';

-- Step 3: Verify it worked
SELECT id, email, role, tenant_id, is_active 
FROM public.users 
WHERE email = 'Karkiaman2580@gmail.com';
