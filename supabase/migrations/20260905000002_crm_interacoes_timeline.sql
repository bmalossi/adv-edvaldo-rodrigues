-- Tipo Enum para Tipo de Interação
DO $$ BEGIN
    CREATE TYPE public.tipo_interacao_crm AS ENUM ('ligacao', 'reuniao', 'whatsapp', 'email', 'nota_interna');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Tabela de Interações com o Cliente (Timeline / Histórico)
CREATE TABLE IF NOT EXISTS public.interacoes_cliente (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    autor_id UUID NOT NULL REFERENCES public.perfis(id) ON DELETE RESTRICT,
    tipo public.tipo_interacao_crm NOT NULL DEFAULT 'nota_interna',
    descricao TEXT NOT NULL,
    data_interacao TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_interacoes_cliente ON public.interacoes_cliente(cliente_id);
CREATE INDEX IF NOT EXISTS idx_interacoes_data ON public.interacoes_cliente(data_interacao DESC);

-- RLS
ALTER TABLE public.interacoes_cliente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Interações visíveis para usuários autenticados"
    ON public.interacoes_cliente FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.clientes c
            WHERE c.id = interacoes_cliente.cliente_id
            AND c.deleted_at IS NULL
            AND (
                c.visibilidade = 'colegiado'
                OR c.responsavel_id = auth.uid()
                OR EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND papel = 'advogado')
            )
        )
    );

CREATE POLICY "Equipe autenticada pode inserir interações"
    ON public.interacoes_cliente FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.clientes c
            WHERE c.id = interacoes_cliente.cliente_id
            AND c.deleted_at IS NULL
        )
    );
