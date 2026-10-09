-- ==============================================================================
-- MIGRATION: Corrigir RLS de Clientes (Soft-Delete), RPC e Cobranças Asaas
-- Arquivo: 20261009000025_fix_clientes_soft_delete_rls.sql
-- ==============================================================================

-- 1. BLINDAGEM DAS FUNÇÕES RBAC DE SEGURANÇA
-- Garante que has_permission e has_role_scope_geral não falhem por variações
-- de nome ou por campos nulos em p.ativo

CREATE OR REPLACE FUNCTION public.has_permission(p_modulo TEXT, p_acao TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_has BOOLEAN;
BEGIN
    -- Se for Administrador, possui acesso total irrestrito
    IF EXISTS (
        SELECT 1 FROM public.perfis p
        JOIN public.roles r ON p.role_id = r.id
        WHERE p.id = auth.uid()
          AND (r.nome ILIKE '%admin%' OR r.nome ILIKE '%administrador%')
    ) THEN
        RETURN true;
    END IF;

    -- Verifica se o perfil do usuário possui a permissão específica
    SELECT EXISTS (
        SELECT 1
        FROM public.perfis p
        JOIN public.permissions perm ON perm.role_id = p.role_id
        WHERE p.id = auth.uid()
          AND COALESCE(p.ativo, true) = true
          AND perm.modulo = p_modulo
          AND perm.acao = p_acao
    ) INTO v_has;

    RETURN coalesce(v_has, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_permission(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(TEXT, TEXT) TO anon;

CREATE OR REPLACE FUNCTION public.has_role_scope_geral()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfis p
    JOIN public.roles r ON p.role_id = r.id
    WHERE p.id = auth.uid()
      AND (
          r.nome ILIKE '%admin%' 
          OR r.nome ILIKE '%administrador%' 
          OR r.nome ILIKE '%sócio%' 
          OR r.nome ILIKE '%socio%' 
          OR r.nome ILIKE '%estagiário%' 
          OR r.nome ILIKE '%estagiario%'
          OR r.escopo = 'geral'
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_role_scope_geral() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role_scope_geral() TO anon;

-- 2. LIMPEZA TOTAL DE TODAS AS POLÍTICAS ANTIGAS DE PUBLIC.CLIENTES
-- Elimina qualquer policy legada que possa estar conflitando com a nova linha do UPDATE
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'clientes'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.clientes;', r.policyname);
    END LOOP;
END $$;

-- 3. RECRIAÇÃO LIMPA DAS POLÍTICAS DE PUBLIC.CLIENTES
CREATE POLICY "clientes_select_policy"
    ON public.clientes FOR SELECT
    TO authenticated
    USING (
        deleted_at IS NULL AND (
            public.is_admin()
            OR (
                public.has_permission('clientes', 'visualizar') AND (
                    public.has_role_scope_geral()
                    OR responsavel_id = auth.uid()
                    OR visibilidade = 'colegiado'
                    OR EXISTS (
                        SELECT 1 FROM public.casos c
                        WHERE c.cliente_id = clientes.id
                          AND (c.responsavel_id = auth.uid() OR auth.uid() = ANY(c.compartilhado_com))
                    )
                )
            )
        )
    );

CREATE POLICY "clientes_insert_policy"
    ON public.clientes FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_admin() OR public.has_permission('clientes', 'criar')
    );

CREATE POLICY "clientes_update_policy"
    ON public.clientes FOR UPDATE
    TO authenticated
    USING (
        -- Seleciona a linha a ser alterada
        deleted_at IS NULL AND (
            public.is_admin()
            OR public.has_role_scope_geral()
            OR public.has_permission('clientes', 'editar')
            OR public.has_permission('clientes', 'deletar')
            OR responsavel_id = auth.uid()
            OR visibilidade = 'colegiado'
            OR EXISTS (
                SELECT 1 FROM public.casos c
                WHERE c.cliente_id = clientes.id
                  AND (c.responsavel_id = auth.uid() OR auth.uid() = ANY(c.compartilhado_com))
            )
        )
    )
    WITH CHECK (
        -- Cenário A: SOFT-DELETE (marcando deleted_at para mover para lixeira)
        (
            deleted_at IS NOT NULL AND (
                public.is_admin()
                OR public.has_role_scope_geral()
                OR public.has_permission('clientes', 'deletar')
                OR public.has_permission('clientes', 'editar')
            )
        )
        -- Cenário B: EDIÇÃO NORMAL (mantendo deleted_at nulo)
        OR (
            deleted_at IS NULL AND (
                public.is_admin()
                OR public.has_role_scope_geral()
                OR (
                    public.has_permission('clientes', 'editar')
                    AND (
                        responsavel_id = auth.uid()
                        OR visibilidade = 'colegiado'
                        OR EXISTS (
                            SELECT 1 FROM public.casos c
                            WHERE c.cliente_id = clientes.id
                              AND (c.responsavel_id = auth.uid() OR auth.uid() = ANY(c.compartilhado_com))
                        )
                    )
                )
            )
        )
    );

CREATE POLICY "clientes_delete_policy"
    ON public.clientes FOR DELETE
    TO authenticated
    USING (
        public.is_admin()
        OR (
            public.has_permission('clientes', 'deletar') AND (
                public.has_role_scope_geral()
                OR responsavel_id = auth.uid()
                OR visibilidade = 'colegiado'
            )
        )
    );

-- 4. FUNÇÃO RPC DEDICADA PARA SOFT-DELETE (SECURITY DEFINER)
-- Bypassa quaisquer conflitos pontuais de RLS avaliando as permissões de forma atômica
CREATE OR REPLACE FUNCTION public.soft_delete_cliente(p_cliente_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Validação de segurança: apenas admin, quem tem escopo geral ou permissão de deletar/editar
    IF NOT (
        public.is_admin()
        OR public.has_role_scope_geral()
        OR public.has_permission('clientes', 'deletar')
        OR public.has_permission('clientes', 'editar')
        OR EXISTS (
            SELECT 1 FROM public.clientes c
            WHERE c.id = p_cliente_id AND c.responsavel_id = auth.uid()
        )
    ) THEN
        RAISE EXCEPTION 'Acesso negado: seu perfil não possui autorização para excluir clientes.';
    END IF;

    UPDATE public.clientes
    SET deleted_at = now()
    WHERE id = p_cliente_id;

    RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_cliente(UUID) TO authenticated;

-- 5. SINCRONIZAÇÃO DAS ROLES E PERMISSÕES DO ESTAGIÁRIO
-- Garante que qualquer role com nome de estagiário tenha escopo geral e permissão de deletar
DO $$
DECLARE
    v_r RECORD;
BEGIN
    FOR v_r IN (
        SELECT id FROM public.roles 
        WHERE nome ILIKE '%estagiário%' OR nome ILIKE '%estagiario%'
    ) LOOP
        UPDATE public.roles SET escopo = 'geral' WHERE id = v_r.id;

        INSERT INTO public.permissions (role_id, modulo, acao)
        VALUES 
            (v_r.id, 'clientes', 'visualizar'),
            (v_r.id, 'clientes', 'criar'),
            (v_r.id, 'clientes', 'editar'),
            (v_r.id, 'clientes', 'deletar')
        ON CONFLICT (role_id, modulo, acao) DO NOTHING;
    END LOOP;
END $$;

UPDATE public.perfis
SET ativo = true
WHERE ativo IS NULL OR ativo = false;

-- 6. CRIAÇÃO E RLS DA TABELA COBRANÇAS ASAAS
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;
CREATE INDEX IF NOT EXISTS idx_clientes_asaas_customer_id ON public.clientes(asaas_customer_id);

CREATE TABLE IF NOT EXISTS public.cobrancas_asaas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    caso_id UUID REFERENCES public.casos(id) ON DELETE SET NULL,
    contrato_financeiro_id UUID REFERENCES public.contratos_financeiros(id) ON DELETE SET NULL,
    asaas_payment_id TEXT UNIQUE,
    asaas_subscription_id TEXT,
    tipo_cobranca TEXT NOT NULL CHECK (tipo_cobranca IN ('PIX', 'BOLETO', 'CREDIT_CARD', 'UNDEFINED')),
    forma TEXT NOT NULL CHECK (forma IN ('avista', 'parcelado', 'assinatura')),
    status TEXT NOT NULL DEFAULT 'PENDING',
    valor NUMERIC(12,2) NOT NULL,
    valor_liquido NUMERIC(12,2),
    data_vencimento DATE NOT NULL,
    data_pagamento TIMESTAMPTZ,
    invoice_url TEXT,
    bank_slip_url TEXT,
    pix_qrcode_image TEXT,
    pix_copia_cola TEXT,
    linha_digitavel TEXT,
    external_reference TEXT UNIQUE,
    numero_parcela INTEGER DEFAULT 1,
    total_parcelas INTEGER DEFAULT 1,
    raw_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cobrancas_asaas_cliente ON public.cobrancas_asaas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cobrancas_asaas_caso ON public.cobrancas_asaas(caso_id);
CREATE INDEX IF NOT EXISTS idx_cobrancas_asaas_status ON public.cobrancas_asaas(status);
CREATE INDEX IF NOT EXISTS idx_cobrancas_asaas_ext_ref ON public.cobrancas_asaas(external_reference);

ALTER TABLE public.cobrancas_asaas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cobrancas_asaas_select_policy" ON public.cobrancas_asaas;
DROP POLICY IF EXISTS "cobrancas_asaas_insert_policy" ON public.cobrancas_asaas;
DROP POLICY IF EXISTS "cobrancas_asaas_update_policy" ON public.cobrancas_asaas;

CREATE POLICY "cobrancas_asaas_select_policy"
    ON public.cobrancas_asaas FOR SELECT
    TO authenticated
    USING (
        public.is_admin()
        OR public.has_permission('financeiro', 'visualizar')
        OR public.has_role_scope_geral()
    );

CREATE POLICY "cobrancas_asaas_insert_policy"
    ON public.cobrancas_asaas FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_admin()
        OR public.has_permission('financeiro', 'criar')
        OR public.has_role_scope_geral()
    );

CREATE POLICY "cobrancas_asaas_update_policy"
    ON public.cobrancas_asaas FOR UPDATE
    TO authenticated
    USING (
        public.is_admin()
        OR public.has_permission('financeiro', 'editar')
        OR public.has_role_scope_geral()
    );
