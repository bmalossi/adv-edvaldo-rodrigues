-- Migration: 20260905000007_crm_google_drive_documentos_casos.sql
-- Description: Tabela de documentos do caso integrados com metadados do Google Drive e RLS híbrida

-- 1. Tipo enumerado para tipos de documentos do caso
DO $$ BEGIN
    CREATE TYPE tipo_documento_caso_crm AS ENUM (
        'procuracao_contrato',
        'documento_pessoal',
        'prova_documental',
        'peca_processual',
        'decisao_sentenca',
        'outros'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Tabela de documentos vinculados ao caso
CREATE TABLE IF NOT EXISTS public.documentos_casos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caso_id UUID NOT NULL REFERENCES public.casos(id) ON DELETE CASCADE,
    nome_arquivo TEXT NOT NULL,
    tipo_documento tipo_documento_caso_crm NOT NULL DEFAULT 'outros',
    tamanho_bytes BIGINT,
    mime_type TEXT,
    google_drive_file_id TEXT,
    google_drive_view_link TEXT,
    criado_por UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_documentos_casos_caso_id ON public.documentos_casos(caso_id);
CREATE INDEX IF NOT EXISTS idx_documentos_casos_tipo ON public.documentos_casos(tipo_documento);

-- 4. Função set_updated_at idempotente e Trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_documentos_casos_updated_at ON public.documentos_casos;
CREATE TRIGGER trg_documentos_casos_updated_at
    BEFORE UPDATE ON public.documentos_casos
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 5. RLS (Herda a política híbrida de casos: visível se caso for colegiado ou delegado)
ALTER TABLE public.documentos_casos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura de documentos do caso"
    ON public.documentos_casos
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.perfis p
            WHERE p.id = auth.uid() AND p.papel = 'advogado'
        )
        OR EXISTS (
            SELECT 1 FROM public.casos c
            WHERE c.id = documentos_casos.caso_id
              AND (
                  c.visibilidade = 'colegiado'
                  OR c.responsavel_id = auth.uid()
                  OR EXISTS (
                      SELECT 1 FROM public.caso_colaboradores cc
                      WHERE cc.caso_id = c.id AND cc.perfil_id = auth.uid()
                  )
              )
        )
    );

CREATE POLICY "Insercao de documentos do caso"
    ON public.documentos_casos
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.perfis p
            WHERE p.id = auth.uid() AND p.ativo = true
        )
    );

CREATE POLICY "Exclusao de documentos do caso"
    ON public.documentos_casos
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.perfis p
            WHERE p.id = auth.uid() AND p.papel = 'advogado'
        )
        OR criado_por = auth.uid()
    );

COMMENT ON TABLE public.documentos_casos IS 'Metadados e referências de arquivos sincronizados com a Service Account do Google Drive no CRM.';
