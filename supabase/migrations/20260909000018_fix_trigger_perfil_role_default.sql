-- 1. Definir DEFAULT na coluna role_id de perfis para garantir que qualquer insert sem role_id use Advogado Associado
ALTER TABLE public.perfis ALTER COLUMN role_id SET DEFAULT 'c3850828-120e-4f55-8f2b-cebfbc6d9646'::uuid;

-- 2. Atualizar handle_new_user para o novo schema RBAC dinâmico (sem a coluna papel e com role_id + tolerância a falhas)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role_id UUID;
BEGIN
    IF NEW.raw_user_meta_data->>'role_id' IS NOT NULL THEN
        BEGIN
            v_role_id := (NEW.raw_user_meta_data->>'role_id')::uuid;
        EXCEPTION WHEN OTHERS THEN
            v_role_id := 'c3850828-120e-4f55-8f2b-cebfbc6d9646'::uuid;
        END;
    ELSE
        v_role_id := 'c3850828-120e-4f55-8f2b-cebfbc6d9646'::uuid;
    END IF;

    INSERT INTO public.perfis (
        id,
        nome,
        email,
        oab,
        telefone,
        role_id,
        ativo,
        must_change_password
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.email,
        NEW.raw_user_meta_data->>'oab',
        NEW.raw_user_meta_data->>'telefone',
        v_role_id,
        true,
        COALESCE((NEW.raw_user_meta_data->>'must_change_password')::boolean, true)
    )
    ON CONFLICT (id) DO UPDATE SET
        nome = EXCLUDED.nome,
        role_id = COALESCE(perfis.role_id, EXCLUDED.role_id),
        oab = COALESCE(EXCLUDED.oab, perfis.oab),
        telefone = COALESCE(EXCLUDED.telefone, perfis.telefone),
        updated_at = now();

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Erro ao criar perfil em handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 3. Blindar fn_criar_perfil_advogado com tratamento de exceção
CREATE OR REPLACE FUNCTION public.fn_criar_perfil_advogado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.advogados (user_id, nome, email)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
      NEW.email
    )
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Erro em fn_criar_perfil_advogado: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;
