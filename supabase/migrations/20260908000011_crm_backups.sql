-- Migration: Tabelas de Histórico de Backups e Configurações do Google Drive
-- Data: 2026-09-08

-- 1. Tabela de Configuração da Integração com Google Drive
CREATE TABLE IF NOT EXISTS public.configuracoes_backup_drive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ativo BOOLEAN DEFAULT false,
  google_drive_folder_id TEXT,
  google_service_account_email TEXT,
  google_service_account_private_key TEXT,
  webhook_backup_url TEXT,
  frequencia_automatica TEXT DEFAULT 'manual', -- 'manual', 'diario', 'semanal', 'mensal'
  ultimo_backup_em TIMESTAMPTZ,
  ultimo_status TEXT, -- 'sucesso', 'erro', 'pendente'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para configuracoes_backup_drive
ALTER TABLE public.configuracoes_backup_drive ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'configuracoes_backup_drive' AND policyname = 'Advogados podem gerenciar configuracoes de backup'
  ) THEN
    CREATE POLICY "Advogados podem gerenciar configuracoes de backup"
      ON public.configuracoes_backup_drive
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 2. Tabela de Histórico de Backups Executados
CREATE TABLE IF NOT EXISTS public.historico_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_arquivo TEXT NOT NULL,
  escopo TEXT NOT NULL, -- 'completo', 'apenas_dados', 'apenas_documentos'
  tamanho_bytes BIGINT DEFAULT 0,
  total_clientes INT DEFAULT 0,
  total_documentos INT DEFAULT 0,
  total_casos INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'concluido', -- 'concluido', 'falhou', 'enviado_drive'
  destino TEXT NOT NULL DEFAULT 'local', -- 'local', 'google_drive', 'ambos'
  google_drive_file_id TEXT,
  google_drive_link TEXT,
  erro_mensagem TEXT,
  criado_por UUID REFERENCES public.perfis(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_historico_backups_created_at ON public.historico_backups(created_at DESC);

-- RLS para historico_backups
ALTER TABLE public.historico_backups ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'historico_backups' AND policyname = 'Advogados podem visualizar e registrar historico de backups'
  ) THEN
    CREATE POLICY "Advogados podem visualizar e registrar historico de backups"
      ON public.historico_backups
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
