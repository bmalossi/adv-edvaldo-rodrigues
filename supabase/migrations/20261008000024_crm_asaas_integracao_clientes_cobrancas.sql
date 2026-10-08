-- ============================================================
-- Migration: 20261008000024_crm_asaas_integracao_clientes_cobrancas.sql
-- Integração Asaas: Sincronização de Clientes, Cobranças e RLS
-- ============================================================

-- 1. Coluna de identificação do cliente no Asaas
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;
CREATE INDEX IF NOT EXISTS idx_clientes_asaas_customer_id ON public.clientes(asaas_customer_id);

-- 2. Tabela de Cobranças e Faturas do Asaas
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

-- Índices para consultas e conciliação
CREATE INDEX IF NOT EXISTS idx_cobrancas_asaas_cliente ON public.cobrancas_asaas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cobrancas_asaas_caso ON public.cobrancas_asaas(caso_id);
CREATE INDEX IF NOT EXISTS idx_cobrancas_asaas_status ON public.cobrancas_asaas(status);
CREATE INDEX IF NOT EXISTS idx_cobrancas_asaas_ext_ref ON public.cobrancas_asaas(external_reference);

-- 3. Habilitar e configurar Row-Level Security (RLS)
ALTER TABLE public.cobrancas_asaas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cobranças visíveis para advogados e administradores"
    ON public.cobrancas_asaas FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.perfis
            WHERE id = auth.uid()
            AND (papel = 'advogado' OR papel = 'admin' OR papel = 'administrador')
            AND ativo = true
        )
    );

CREATE POLICY "Apenas advogados e administradores podem inserir cobranças"
    ON public.cobrancas_asaas FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.perfis
            WHERE id = auth.uid()
            AND (papel = 'advogado' OR papel = 'admin' OR papel = 'administrador')
            AND ativo = true
        )
    );

CREATE POLICY "Apenas advogados e administradores podem alterar cobranças"
    ON public.cobrancas_asaas FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.perfis
            WHERE id = auth.uid()
            AND (papel = 'advogado' OR papel = 'admin' OR papel = 'administrador')
            AND ativo = true
        )
    );
