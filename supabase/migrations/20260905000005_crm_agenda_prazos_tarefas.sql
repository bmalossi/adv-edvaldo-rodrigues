-- Migration: 20260905000005_crm_agenda_prazos_tarefas.sql
-- Description: Agenda, Prazos Fatais e Tarefas Operacionais com RLS e triggers

-- 1. Tipos enumerados
DO $$ BEGIN
    CREATE TYPE tipo_pendencia_crm AS ENUM ('prazo_fatal', 'tarefa');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE status_pendencia_crm AS ENUM ('pendente', 'em_execucao', 'concluido');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Tabela de pendências (prazos fatais e tarefas)
CREATE TABLE IF NOT EXISTS public.pendencias_crm (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo tipo_pendencia_crm NOT NULL DEFAULT 'tarefa',
    titulo TEXT NOT NULL,
    descricao TEXT,
    responsavel_id UUID NOT NULL REFERENCES public.perfis(id) ON DELETE RESTRICT,
    caso_id UUID REFERENCES public.casos(id) ON DELETE SET NULL,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    status status_pendencia_crm NOT NULL DEFAULT 'pendente',
    data_vencimento TIMESTAMPTZ,
    concluido_em TIMESTAMPTZ,
    concluido_por UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_prazo_fatal_vencimento CHECK (
        tipo != 'prazo_fatal' OR data_vencimento IS NOT NULL
    )
);

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_pendencias_responsavel ON public.pendencias_crm(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_pendencias_status ON public.pendencias_crm(status);
CREATE INDEX IF NOT EXISTS idx_pendencias_tipo ON public.pendencias_crm(tipo);
CREATE INDEX IF NOT EXISTS idx_pendencias_data_vencimento ON public.pendencias_crm(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_pendencias_caso_id ON public.pendencias_crm(caso_id);

-- 4. Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pendencias_updated_at ON public.pendencias_crm;
CREATE TRIGGER trg_pendencias_updated_at
    BEFORE UPDATE ON public.pendencias_crm
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 5. RLS
ALTER TABLE public.pendencias_crm ENABLE ROW LEVEL SECURITY;

-- Advogados podem ver todas as pendências
-- Outros perfis podem ver onde são responsáveis, ou atribuídas a casos que têm acesso
CREATE POLICY "Leitura de pendencias crm"
    ON public.pendencias_crm
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.perfis p
            WHERE p.id = auth.uid() AND p.papel = 'advogado'
        )
        OR responsavel_id = auth.uid()
        OR (
            caso_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM public.casos c
                WHERE c.id = pendencias_crm.caso_id
                  AND (
                      c.visibilidade = 'colegiado'
                      OR c.responsavel_id = auth.uid()
                      OR EXISTS (
                          SELECT 1 FROM public.caso_colaboradores cc
                          WHERE cc.caso_id = c.id AND cc.perfil_id = auth.uid()
                      )
                  )
            )
        )
    );

CREATE POLICY "Insercao de pendencias crm"
    ON public.pendencias_crm
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.perfis p
            WHERE p.id = auth.uid() AND p.ativo = true
        )
    );

CREATE POLICY "Atualizacao de pendencias crm"
    ON public.pendencias_crm
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.perfis p
            WHERE p.id = auth.uid() AND p.papel = 'advogado'
        )
        OR responsavel_id = auth.uid()
        OR concluido_por = auth.uid()
    );

CREATE POLICY "Exclusao de pendencias crm"
    ON public.pendencias_crm
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.perfis p
            WHERE p.id = auth.uid() AND p.papel = 'advogado'
        )
        OR responsavel_id = auth.uid()
    );

-- 6. Comentário operacional para Edge Function de Lembretes
COMMENT ON TABLE public.pendencias_crm IS 'Tabela central de prazos fatais e tarefas do CRM. Monitorada por cron/edge function para disparo de lembretes em 48h e 24h.';
