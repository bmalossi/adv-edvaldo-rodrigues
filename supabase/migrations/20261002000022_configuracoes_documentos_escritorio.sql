-- Migration: 20261002000022_configuracoes_documentos_escritorio.sql
-- Description: Tabela centralizada para logotipo, dados institucionais e modelos de documentos
-- Permite que Administradores salvem o padrão do escritório para todos os usuários,
-- e usuários não-administradores salvem preferências exclusivas para sua própria conta.

CREATE TABLE IF NOT EXISTS public.configuracoes_documentos (
  chave TEXT PRIMARY KEY,
  tipo_escopo TEXT NOT NULL CHECK (tipo_escopo IN ('escritorio', 'usuario')),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  logo_url TEXT,
  config_institucional JSONB DEFAULT '{}'::jsonb,
  padroes_json JSONB DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_cfg_docs_tipo_escopo ON public.configuracoes_documentos (tipo_escopo);
CREATE INDEX IF NOT EXISTS idx_cfg_docs_user_id ON public.configuracoes_documentos (user_id);

-- Habilitar RLS
ALTER TABLE public.configuracoes_documentos ENABLE ROW LEVEL SECURITY;

-- 1. Leitura: Todos os usuários autenticados podem ler as configurações do escritório ('escritorio')
-- e também sua própria linha ('usuario_<uid>')
DROP POLICY IF EXISTS "configuracoes_documentos_select" ON public.configuracoes_documentos;
CREATE POLICY "configuracoes_documentos_select"
  ON public.configuracoes_documentos FOR SELECT
  TO authenticated
  USING (
    chave = 'escritorio'
    OR (tipo_escopo = 'usuario' AND user_id = auth.uid())
  );

-- 2. Inserção:
-- 'escritorio': apenas Administradores
-- 'usuario': usuário autenticado para seu próprio user_id
DROP POLICY IF EXISTS "configuracoes_documentos_insert" ON public.configuracoes_documentos;
CREATE POLICY "configuracoes_documentos_insert"
  ON public.configuracoes_documentos FOR INSERT
  TO authenticated
  WITH CHECK (
    (chave = 'escritorio' AND (
      public.is_admin() OR EXISTS (
        SELECT 1 FROM public.perfis p
        JOIN public.roles r ON p.role_id = r.id
        WHERE p.id = auth.uid() AND r.nome = 'Administrador'
      )
    ))
    OR (tipo_escopo = 'usuario' AND user_id = auth.uid() AND chave = ('usuario_' || auth.uid()::text))
  );

-- 3. Atualização:
DROP POLICY IF EXISTS "configuracoes_documentos_update" ON public.configuracoes_documentos;
CREATE POLICY "configuracoes_documentos_update"
  ON public.configuracoes_documentos FOR UPDATE
  TO authenticated
  USING (
    (chave = 'escritorio' AND (
      public.is_admin() OR EXISTS (
        SELECT 1 FROM public.perfis p
        JOIN public.roles r ON p.role_id = r.id
        WHERE p.id = auth.uid() AND r.nome = 'Administrador'
      )
    ))
    OR (tipo_escopo = 'usuario' AND user_id = auth.uid())
  )
  WITH CHECK (
    (chave = 'escritorio' AND (
      public.is_admin() OR EXISTS (
        SELECT 1 FROM public.perfis p
        JOIN public.roles r ON p.role_id = r.id
        WHERE p.id = auth.uid() AND r.nome = 'Administrador'
      )
    ))
    OR (tipo_escopo = 'usuario' AND user_id = auth.uid())
  );

-- 4. Exclusão:
DROP POLICY IF EXISTS "configuracoes_documentos_delete" ON public.configuracoes_documentos;
CREATE POLICY "configuracoes_documentos_delete"
  ON public.configuracoes_documentos FOR DELETE
  TO authenticated
  USING (
    (chave = 'escritorio' AND (
      public.is_admin() OR EXISTS (
        SELECT 1 FROM public.perfis p
        JOIN public.roles r ON p.role_id = r.id
        WHERE p.id = auth.uid() AND r.nome = 'Administrador'
      )
    ))
    OR (tipo_escopo = 'usuario' AND user_id = auth.uid())
  );

-- Inserir registro inicial do escritório com valores institucionais se não existir
INSERT INTO public.configuracoes_documentos (
  chave,
  tipo_escopo,
  config_institucional,
  padroes_json
) VALUES (
  'escritorio',
  'escritorio',
  '{
    "prefixo": "ERF",
    "empresa": "EDVALDO RODRIGUES FERREIRA SOCIEDADE INDIVIDUAL DE ADVOCACIA – ME",
    "socOab": "62.067",
    "cnpj": "62.068.076/0001-06",
    "foro": "Comarca de Praia Grande/SP",
    "lawyerCpf": "925.540.401-68",
    "pix": "(13) 99682-4364"
  }'::jsonb,
  '{}'::jsonb
)
ON CONFLICT (chave) DO NOTHING;
