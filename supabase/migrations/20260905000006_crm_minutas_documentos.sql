-- Migration: 20260905000006_crm_minutas_documentos.sql
-- Description: Tabela de templates de minutas (.docx) e bucket de armazenamento

-- 1. Tipo enumerado para categoria de minuta
DO $$ BEGIN
    CREATE TYPE categoria_template_crm AS ENUM (
        'procuracao',
        'contrato',
        'notificacao',
        'declaracao',
        'outro'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Tabela de templates de documentos
CREATE TABLE IF NOT EXISTS public.templates_minutas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    descricao TEXT,
    categoria categoria_template_crm NOT NULL DEFAULT 'outro',
    arquivo_url TEXT NOT NULL,
    exige_qualificacao_completa BOOLEAN NOT NULL DEFAULT true,
    variaveis_disponiveis JSONB DEFAULT '[]'::jsonb,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_templates_categoria ON public.templates_minutas(categoria);
CREATE INDEX IF NOT EXISTS idx_templates_ativo ON public.templates_minutas(ativo);

-- 4. Trigger de updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_templates_minutas_updated_at ON public.templates_minutas;
CREATE TRIGGER trg_templates_minutas_updated_at
    BEFORE UPDATE ON public.templates_minutas
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 5. RLS
ALTER TABLE public.templates_minutas ENABLE ROW LEVEL SECURITY;

-- Todos os membros da equipe ativos podem visualizar templates
CREATE POLICY "Leitura de templates minutas"
    ON public.templates_minutas
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.perfis p
            WHERE p.id = auth.uid() AND p.ativo = true
        )
    );

-- Apenas advogados podem criar, atualizar ou inativar templates
CREATE POLICY "Gerenciamento de templates minutas"
    ON public.templates_minutas
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.perfis p
            WHERE p.id = auth.uid() AND p.papel = 'advogado'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.perfis p
            WHERE p.id = auth.uid() AND p.papel = 'advogado'
        )
    );

-- 6. Inserção de templates padrão do escritório
INSERT INTO public.templates_minutas (nome, descricao, categoria, arquivo_url, exige_qualificacao_completa, variaveis_disponiveis)
VALUES
(
    'Procuração Ad Judicia et Extra',
    'Instrumento de mandato com cláusulas ad judicia et extra para atuação judicial e administrativa geral.',
    'procuracao',
    'templates/procuracao_ad_judicia.docx',
    true,
    '["nome_cliente", "tipo_pessoa", "cpf_cnpj", "rg_ie", "nacionalidade", "estado_civil", "profissao", "endereco_completo", "advogado_nome", "advogado_oab", "data_extenso"]'::jsonb
),
(
    'Contrato de Prestação de Serviços Advocatícios',
    'Contrato de honorários advocatícios padrão com cláusulas de êxito e fixação de obrigações.',
    'contrato',
    'templates/contrato_honorarios.docx',
    true,
    '["nome_cliente", "cpf_cnpj", "endereco_completo", "titulo_caso", "advogado_nome", "advogado_oab", "data_extenso"]'::jsonb
),
(
    'Declaração de Hipossuficiência Econômica',
    'Declaração para requerimento do benefício da assistência judiciária gratuita (Justiça Gratuita).',
    'declaracao',
    'templates/declaracao_hipossuficiencia.docx',
    true,
    '["nome_cliente", "cpf_cnpj", "rg_ie", "nacionalidade", "estado_civil", "profissao", "endereco_completo", "data_extenso"]'::jsonb
),
(
    'Notificação Extrajudicial Geral',
    'Notificação formal para constituição em mora, cumprimento de obrigação ou interpelação.',
    'notificacao',
    'templates/notificacao_extrajudicial.docx',
    false,
    '["nome_cliente", "cpf_cnpj", "titulo_caso", "advogado_nome", "data_extenso"]'::jsonb
)
ON CONFLICT DO NOTHING;
