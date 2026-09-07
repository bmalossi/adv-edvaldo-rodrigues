-- Migration: Adicionar campos completos ao cadastro de clientes e criar tabela de documentos do cliente
-- Data: 2026-09-07

-- 1. Novos campos na tabela clientes
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS data_nascimento DATE,
  ADD COLUMN IF NOT EXISTS sexo TEXT,
  ADD COLUMN IF NOT EXISTS pais TEXT DEFAULT 'Brasil',
  ADD COLUMN IF NOT EXISTS telefone_secundario TEXT,
  ADD COLUMN IF NOT EXISTS anotacoes_gerais TEXT,
  ADD COLUMN IF NOT EXISTS tem_representante BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS rep_nome TEXT,
  ADD COLUMN IF NOT EXISTS rep_cpf_cnpj TEXT,
  ADD COLUMN IF NOT EXISTS rep_rg TEXT,
  ADD COLUMN IF NOT EXISTS rep_data_nascimento DATE,
  ADD COLUMN IF NOT EXISTS rep_pais TEXT DEFAULT 'Brasil',
  ADD COLUMN IF NOT EXISTS rep_uf TEXT,
  ADD COLUMN IF NOT EXISTS rep_cidade TEXT,
  ADD COLUMN IF NOT EXISTS rep_endereco TEXT,
  ADD COLUMN IF NOT EXISTS rep_bairro TEXT,
  ADD COLUMN IF NOT EXISTS rep_cep TEXT;

-- 2. Tabela de Documentos/Arquivos do Cliente
CREATE TABLE IF NOT EXISTS public.documentos_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  tamanho_bytes BIGINT,
  mime_type TEXT,
  storage_path TEXT NOT NULL,
  criado_por UUID REFERENCES public.perfis(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_documentos_clientes_cliente_id ON public.documentos_clientes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_documentos_clientes_created_at ON public.documentos_clientes(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.documentos_clientes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para documentos_clientes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'documentos_clientes' AND policyname = 'Advogados e membros podem ver documentos dos clientes'
  ) THEN
    CREATE POLICY "Advogados e membros podem ver documentos dos clientes"
      ON public.documentos_clientes
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'documentos_clientes' AND policyname = 'Advogados e membros podem inserir documentos dos clientes'
  ) THEN
    CREATE POLICY "Advogados e membros podem inserir documentos dos clientes"
      ON public.documentos_clientes
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'documentos_clientes' AND policyname = 'Advogados e membros podem atualizar documentos dos clientes'
  ) THEN
    CREATE POLICY "Advogados e membros podem atualizar documentos dos clientes"
      ON public.documentos_clientes
      FOR UPDATE
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'documentos_clientes' AND policyname = 'Advogados e membros podem excluir documentos dos clientes'
  ) THEN
    CREATE POLICY "Advogados e membros podem excluir documentos dos clientes"
      ON public.documentos_clientes
      FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;

-- 3. Bucket de Storage 'documentos-clientes'
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos-clientes', 'documentos-clientes', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso ao storage para autenticados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Permitir visualizacao autenticada de documentos-clientes'
  ) THEN
    CREATE POLICY "Permitir visualizacao autenticada de documentos-clientes"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (bucket_id = 'documentos-clientes');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Permitir upload autenticado em documentos-clientes'
  ) THEN
    CREATE POLICY "Permitir upload autenticado em documentos-clientes"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'documentos-clientes');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Permitir update autenticado em documentos-clientes'
  ) THEN
    CREATE POLICY "Permitir update autenticado em documentos-clientes"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'documentos-clientes');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Permitir delecao autenticada em documentos-clientes'
  ) THEN
    CREATE POLICY "Permitir delecao autenticada em documentos-clientes"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'documentos-clientes');
  END IF;
END $$;
