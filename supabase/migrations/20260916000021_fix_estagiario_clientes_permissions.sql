-- ==============================================================================
-- MIGRATION: Correcao de Permissoes do Estagiario para Clientes
-- Arquivo: 20260916000021_fix_estagiario_clientes_permissions.sql
-- ==============================================================================
-- O perfil "Estagiario / Assistente" nao possuia 'criar' e 'editar' em clientes,
-- causando 403 ao cadastrar ou ao excluir (soft-delete via PATCH).
-- ==============================================================================
DO $$
DECLARE
    v_estagiario_id UUID;
BEGIN
    SELECT id INTO v_estagiario_id
    FROM public.roles
    WHERE nome = 'Estagiário / Assistente'
    LIMIT 1;

    IF v_estagiario_id IS NULL THEN
        RAISE NOTICE 'Perfil Estagiário / Assistente nao encontrado. Migration ignorada.';
        RETURN;
    END IF;

    INSERT INTO public.permissions (role_id, modulo, acao)
    VALUES (v_estagiario_id, 'clientes', 'criar')
    ON CONFLICT (role_id, modulo, acao) DO NOTHING;

    INSERT INTO public.permissions (role_id, modulo, acao)
    VALUES (v_estagiario_id, 'clientes', 'editar')
    ON CONFLICT (role_id, modulo, acao) DO NOTHING;

    RAISE NOTICE 'Permissoes clientes(criar, editar) adicionadas ao Estagiário / Assistente id=%.', v_estagiario_id;
END $$;