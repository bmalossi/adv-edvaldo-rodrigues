-- ================================================================
-- UPDATE ADMIN CREDENTIALS
-- Run this in the Supabase SQL Editor
-- ================================================================

-- 1. Update the user in auth.users
-- We find the user by their current email and update to the new one and new password
UPDATE auth.users 
SET 
  email = 'edvaldorodrigues.advocacia@gmail.com',
  encrypted_password = crypt('Edvaldo123', gen_salt('bf')),
  email_confirmed_at = now(),
  updated_at = now()
WHERE email = 'contato@automab.dev';

-- 2. Update the profile in public.advogados to match the new email
-- This ensures the application logic remains consistent
UPDATE public.advogados
SET 
    email = 'edvaldorodrigues.advocacia@gmail.com',
    updated_at = now()
WHERE email = 'contato@automab.dev';
