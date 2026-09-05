-- 1. Tipo Enum para Tipo de Honorário
DO $$ BEGIN
    CREATE TYPE public.tipo_honorario_crm AS ENUM ('fixo', 'exito', 'misto', 'mensal');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Tabela de Contratos Financeiros / Honorários
CREATE TABLE IF NOT EXISTS public.contratos_financeiros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caso_id UUID NOT NULL UNIQUE REFERENCES public.casos(id) ON DELETE CASCADE,
    tipo_honorario public.tipo_honorario_crm NOT NULL DEFAULT 'fixo',
    valor_total NUMERIC(12,2),
    valor_entrada NUMERIC(12,2),
    numero_parcelas INTEGER NOT NULL DEFAULT 1,
    percentual_exito NUMERIC(5,2),
    condicoes_pagamento TEXT,
    dados_bancarios TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_contratos_financeiros_caso ON public.contratos_financeiros(caso_id);

-- 3. Blindagem Rigorosa com Row-Level Security (RLS)
ALTER TABLE public.contratos_financeiros ENABLE ROW LEVEL SECURITY;

-- Política de Leitura (SELECT): APENAS usuários com papel 'advogado'
CREATE POLICY "Honorários acessíveis exclusivamente a advogados"
    ON public.contratos_financeiros FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.perfis
            WHERE id = auth.uid()
            AND papel = 'advogado'
            AND ativo = true
        )
    );

-- Política de Inserção (INSERT): APENAS advogados
CREATE POLICY "Apenas advogados podem registrar contratos financeiros"
    ON public.contratos_financeiros FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.perfis
            WHERE id = auth.uid()
            AND papel = 'advogado'
            AND ativo = true
        )
    );

-- Política de Atualização (UPDATE): APENAS advogados
CREATE POLICY "Apenas advogados podem alterar contratos financeiros"
    ON public.contratos_financeiros FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.perfis
            WHERE id = auth.uid()
            AND papel = 'advogado'
            AND ativo = true
        )
    );

-- Política de Exclusão (DELETE): APENAS advogados
CREATE POLICY "Apenas advogados podem excluir contratos financeiros"
    ON public.contratos_financeiros FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.perfis
            WHERE id = auth.uid()
            AND papel = 'advogado'
            AND ativo = true
        )
    );
