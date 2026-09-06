-- Migration: 20260906000008_crm_templates_minutas_editor.sql
-- Description: Adiciona coluna conteudo_texto e bucket storage para templates customizados de minutas

-- 1. Permite que o template seja salvo como texto/corpo direto (além de ou em substituição ao arquivo_url)
ALTER TABLE public.templates_minutas 
    ADD COLUMN IF NOT EXISTS conteudo_texto TEXT,
    ALTER COLUMN arquivo_url DROP NOT NULL;

-- 2. Criar bucket no storage para templates de minutas caso não exista
INSERT INTO storage.buckets (id, name, public)
VALUES ('templates-minutas', 'templates-minutas', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Políticas de Storage para o bucket templates-minutas
DO $$ BEGIN
    -- Leitura pública / autenticada
    CREATE POLICY "Acesso de leitura ao bucket templates-minutas"
        ON storage.objects FOR SELECT
        TO authenticated
        USING (bucket_id = 'templates-minutas');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    -- Upload / Edição restrito a advogados
    CREATE POLICY "Upload no bucket templates-minutas por advogados"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (
            bucket_id = 'templates-minutas'
            AND EXISTS (
                SELECT 1 FROM public.perfis p
                WHERE p.id = auth.uid() AND p.papel = 'advogado'
            )
        );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
