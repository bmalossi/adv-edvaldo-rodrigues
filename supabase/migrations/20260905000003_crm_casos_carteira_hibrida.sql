-- 1. Tipo Enum para Tipo de Demanda
DO $$ BEGIN
    CREATE TYPE public.tipo_demanda_crm AS ENUM ('judicial', 'extrajudicial', 'consultivo');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Tipo Enum para Status do Caso
DO $$ BEGIN
    CREATE TYPE public.status_caso_crm AS ENUM ('analise', 'em_andamento', 'aguardando_documentos', 'concluido', 'arquivado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Tabela de Casos do CRM
CREATE TABLE IF NOT EXISTS public.casos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
    titulo TEXT NOT NULL,
    descricao TEXT,
    area_direito TEXT NOT NULL,
    tipo_demanda public.tipo_demanda_crm NOT NULL DEFAULT 'judicial',
    status public.status_caso_crm NOT NULL DEFAULT 'em_andamento',
    visibilidade public.visibilidade_registro NOT NULL DEFAULT 'colegiado',
    responsavel_id UUID NOT NULL REFERENCES public.perfis(id) ON DELETE RESTRICT,
    google_drive_folder_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Tabela de Delegações de Colaboradores em Casos Privados
CREATE TABLE IF NOT EXISTS public.caso_colaboradores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caso_id UUID NOT NULL REFERENCES public.casos(id) ON DELETE CASCADE,
    perfil_id UUID NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
    permissao TEXT NOT NULL DEFAULT 'editor' CHECK (permissao IN ('leitor', 'editor')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(caso_id, perfil_id)
);

-- 5. Vincular Processos do JusTrack aos Casos (Relacionamento 1:N Opcional)
DO $$ BEGIN
    ALTER TABLE public.processos ADD COLUMN IF NOT EXISTS caso_id UUID REFERENCES public.casos(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_casos_cliente ON public.casos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_casos_responsavel ON public.casos(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_casos_status ON public.casos(status);
CREATE INDEX IF NOT EXISTS idx_processos_caso ON public.processos(caso_id);

-- RLS em Casos
ALTER TABLE public.casos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Casos visíveis segundo visibilidade colegiada ou privada"
    ON public.casos FOR SELECT
    TO authenticated
    USING (
        visibilidade = 'colegiado'
        OR responsavel_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND papel = 'advogado')
        OR EXISTS (SELECT 1 FROM public.caso_colaboradores cc WHERE cc.caso_id = casos.id AND cc.perfil_id = auth.uid())
    );

CREATE POLICY "Equipe autenticada pode inserir casos"
    ON public.casos FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Equipe autenticada pode atualizar casos autorizados"
    ON public.casos FOR UPDATE
    TO authenticated
    USING (
        visibilidade = 'colegiado'
        OR responsavel_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND papel = 'advogado')
        OR EXISTS (SELECT 1 FROM public.caso_colaboradores cc WHERE cc.caso_id = casos.id AND cc.perfil_id = auth.uid() AND cc.permissao = 'editor')
    );
