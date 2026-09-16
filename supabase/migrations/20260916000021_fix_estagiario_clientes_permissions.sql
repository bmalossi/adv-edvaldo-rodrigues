-- ==============================================================================
-- MIGRATION: Correcao de Permissoes do Estagiario para Clientes
-- Arquivo: 20260916000021_fix_estagiario_clientes_permissions.sql
-- ==============================================================================
-- NOTA: O nome do perfil no banco e 'Estagiario/Assistente' (sem espacos)
-- conforme criado na migration 20 via UPDATE nos roles de fabrica.
-- A migration 16 tentou criar 'Estagiario / Assistente' (com espacos) mas o
-- UPDATE da migration 20 prevaleceu/criou o registro com nome sem espacos.
-- ==============================================================================
DO $$
DECLARE
    v_estagiario_id UUID;
BEGIN
    -- Tenta ambos os nomes para ser resiliente
    SELECT id INTO v_estagiario_id
    FROM public.roles
    WHERE nome IN ('Estagiário/Assistente', 'Estagiário / Assistente')
    ORDER BY nome
    LIMIT 1;

    IF v_estagiario_id IS NULL THEN
        RAISE NOTICE 'Perfil Estagiario nao encontrado. Migration ignorada.';
        RETURN;
    END IF;

    INSERT INTO public.permissions (role_id, modulo, acao)
    VALUES (v_estagiario_id, 'clientes', 'criar')
    ON CONFLICT (role_id, modulo, acao) DO NOTHING;

    INSERT INTO public.permissions (role_id, modulo, acao)
    VALUES (v_estagiario_id, 'clientes', 'editar')
    ON CONFLICT (role_id, modulo, acao) DO NOTHING;

    RAISE NOTICE 'Permissoes clientes(criar, editar) adicionadas ao Estagiario id=%.', v_estagiario_id;
END $$;