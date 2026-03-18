-- ================================================================
-- JusTrack — Seed do Administrador
-- Execute este script no SQL EDITOR do Supabase
-- ================================================================

-- 1. Cria o usuário na tabela de autenticação (auth.users)
-- Substitua a senha se desejar, mas o formato abaixo é o solicitado.
-- O UUID será gerado automaticamente.

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'contato@automab.dev',
  crypt('Trakinas1990!', gen_salt('bf')), -- Senha criptografada
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"nome":"Administrador JusTrack"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- O trigger 'trg_criar_perfil_advogado' que criamos na migration
-- irá inserir automaticamente o registro correspondente na tabela public.advogados.
