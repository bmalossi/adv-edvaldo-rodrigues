-- Migration: Corrigir tabela documentos_emitidos, escopos de acesso e suporte a qualquer perfil de emissão (Admin, Advogado, Colaborador)

-- Garante existência da tabela public.documentos_emitidos
CREATE TABLE IF NOT EXISTS public.documentos_emitidos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advogado_id   UUID REFERENCES public.advogados(id) ON DELETE SET NULL,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cliente_id    UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  cliente_nome  TEXT NOT NULL,
  tipo          TEXT NOT NULL,
  numero        TEXT NOT NULL,
  titulo        TEXT NOT NULL,
  html_content  TEXT NOT NULL,
  opcoes_json   JSONB DEFAULT '{}'::jsonb,
  emitido_em    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Permite advogado_id nulo (caso o emitente seja admin ou colaborador sem registro na tabela advogados)
ALTER TABLE public.documentos_emitidos ALTER COLUMN advogado_id DROP NOT NULL;

-- Adiciona coluna user_id caso a tabela já tenha sido criada anteriormente sem ela
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'documentos_emitidos' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.documentos_emitidos ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Habilita Row Level Security
ALTER TABLE public.documentos_emitidos ENABLE ROW LEVEL SECURITY;

-- Limpa políticas legadas
DROP POLICY IF EXISTS "advogado_gerencia_proprios_documentos_emitidos" ON public.documentos_emitidos;
DROP POLICY IF EXISTS "documentos_emitidos_select" ON public.documentos_emitidos;
DROP POLICY IF EXISTS "documentos_emitidos_insert" ON public.documentos_emitidos;
DROP POLICY IF EXISTS "documentos_emitidos_delete" ON public.documentos_emitidos;

-- 1. SELECT:
-- Administradores (public.is_admin()) ou perfis com escopo institucional/global têm visão completa de todas as emissões do escritório.
-- Usuários comuns vêem seus próprios documentos emitidos (por user_id ou por advogado_id).
CREATE POLICY "documentos_emitidos_select"
  ON public.documentos_emitidos
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR user_id = auth.uid()
    OR (advogado_id IS NOT NULL AND advogado_id IN (
      SELECT id FROM public.advogados WHERE user_id = auth.uid()
    ))
    OR EXISTS (
      SELECT 1 FROM public.perfis p
      JOIN public.roles r ON r.id = p.role_id
      WHERE p.id = auth.uid() AND (r.escopo IN ('global', 'escritorio') OR r.nome IN ('Administrador', 'Sócio', 'Gerente'))
    )
  );

-- 2. INSERT: Qualquer usuário autenticado no sistema pode registrar a emissão de documento
CREATE POLICY "documentos_emitidos_insert"
  ON public.documentos_emitidos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- 3. DELETE: Administradores ou o próprio usuário que emitiu o documento podem removê-lo
CREATE POLICY "documentos_emitidos_delete"
  ON public.documentos_emitidos
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
    OR user_id = auth.uid()
    OR (advogado_id IS NOT NULL AND advogado_id IN (
      SELECT id FROM public.advogados WHERE user_id = auth.uid()
    ))
  );

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_doc_emitidos_user_id ON public.documentos_emitidos (user_id);
CREATE INDEX IF NOT EXISTS idx_doc_emitidos_advogado_data ON public.documentos_emitidos (advogado_id, emitido_em DESC);
CREATE INDEX IF NOT EXISTS idx_doc_emitidos_cliente ON public.documentos_emitidos (cliente_id);
CREATE INDEX IF NOT EXISTS idx_doc_emitidos_tipo ON public.documentos_emitidos (tipo);
CREATE INDEX IF NOT EXISTS idx_doc_emitidos_emitido_em ON public.documentos_emitidos (emitido_em DESC);
