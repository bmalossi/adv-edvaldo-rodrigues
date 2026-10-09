-- ==============================================================================
-- MIGRATION: Corrigir RLS de Clientes (Soft-Delete) e Cobranças Asaas
-- Arquivo: 20261009000025_fix_clientes_soft_delete_rls.sql
-- ==============================================================================

-- 1. CORREÇÃO DE CLIENTES (UPDATE / SOFT-DELETE / DELETE)
-- O erro 'new row violates row-level security policy for table "clientes"'
-- ocorria porque a cláusula WITH CHECK da clientes_update_policy exigia que
-- o novo registro atendesse a condições que bloqueavam o preenchimento de deleted_at.
-- Ao isolar a verificação de soft-delete no WITH CHECK, qualquer usuário com permissão
-- de editar ou deletar consegue mover o cliente para a lixeira.

DROP POLICY IF EXISTS "clientes_update_policy" ON public.clientes;
DROP POLICY IF EXISTS "clientes_delete_policy" ON public.clientes;

CREATE POLICY "clientes_update_policy"
    ON public.clientes FOR UPDATE
    TO authenticated
    USING (
        deleted_at IS NULL AND (
            public.is_admin()
            OR (
                (public.has_permission('clientes', 'editar') OR public.has_permission('clientes', 'deletar'))
                AND (
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
    )
    WITH CHECK (
        -- Se estiver fazendo soft delete (marcando deleted_at)
        (
            deleted_at IS NOT NULL AND (
                public.is_admin()
                OR (
                    (public.has_permission('clientes', 'editar') OR public.has_permission('clientes', 'deletar'))
                    AND (
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
        )
        -- Ou se for update normal (mantendo deleted_at nulo)
        OR (
            deleted_at IS NULL AND (
                public.is_admin()
                OR (
                    public.has_permission('clientes', 'editar')
                    AND (
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

-- 2. CRIAÇÃO E RLS DA TABELA COBRANÇAS ASAAS
-- Garante que a tabela exista (evita erro 404 Not Found) e que suas policies
-- utilizem o RBAC dinâmico compatível (has_permission / is_admin / has_role_scope_geral)
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

DROP POLICY IF EXISTS "Cobranças visíveis para advogados e administradores" ON public.cobrancas_asaas;
DROP POLICY IF EXISTS "Apenas advogados e administradores podem inserir cobranças" ON public.cobrancas_asaas;
DROP POLICY IF EXISTS "Apenas advogados e administradores podem alterar cobranças" ON public.cobrancas_asaas;
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
