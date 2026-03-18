-- ================================================================
-- JusTrack — Schema Completo
-- Sistema de monitoramento de processos judiciais
-- Adv. Edvaldo Rodrigues
-- ================================================================

-- ================================================================
-- TABELA: advogados
-- Perfil complementar ao auth.users do Supabase
-- ================================================================
CREATE TABLE IF NOT EXISTS public.advogados (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome              TEXT NOT NULL,
  oab               TEXT,
  telefone_whatsapp TEXT,
  email             TEXT,
  ativo             BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.advogados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "advogados_select_own"
  ON public.advogados FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "advogados_insert_own"
  ON public.advogados FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "advogados_update_own"
  ON public.advogados FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ================================================================
-- TABELA: processos
-- Cada processo monitorado. Advogado preenche: numero_cnj + etiqueta.
-- n8n preenche os demais campos via service_role.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.processos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advogado_id       UUID NOT NULL REFERENCES public.advogados(id) ON DELETE CASCADE,

  -- Campos inseridos pelo advogado (frontend)
  numero_cnj        TEXT NOT NULL,
  etiqueta          TEXT NOT NULL,
  status_processo   TEXT NOT NULL DEFAULT 'ativo'
                      CHECK (status_processo IN ('ativo', 'arquivado', 'suspenso', 'encerrado')),
  ativo             BOOLEAN NOT NULL DEFAULT true,

  -- Campos populados pelo n8n
  numero_cnj_limpo  TEXT,
  tribunal_base     TEXT,
  classe_nome       TEXT,
  classe_codigo     INTEGER,
  grau              TEXT,
  data_ajuizamento  DATE,
  orgao_julgador_nome TEXT,
  data_hora_ultima_atualizacao_datajud TIMESTAMPTZ,
  data_ultima_consulta_n8n             TIMESTAMPTZ,

  -- Flags de UX
  tem_novidade      BOOLEAN NOT NULL DEFAULT false,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (advogado_id, numero_cnj)
);

CREATE INDEX IF NOT EXISTS idx_processos_advogado_ativo
  ON public.processos(advogado_id, ativo);

CREATE INDEX IF NOT EXISTS idx_processos_numero_cnj
  ON public.processos(numero_cnj);

CREATE INDEX IF NOT EXISTS idx_processos_tem_novidade
  ON public.processos(advogado_id, tem_novidade)
  WHERE tem_novidade = true;

ALTER TABLE public.processos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "processos_select_own"
  ON public.processos FOR SELECT
  USING (advogado_id IN (
    SELECT id FROM public.advogados WHERE user_id = auth.uid()
  ));

CREATE POLICY "processos_insert_own"
  ON public.processos FOR INSERT
  WITH CHECK (advogado_id IN (
    SELECT id FROM public.advogados WHERE user_id = auth.uid()
  ));

CREATE POLICY "processos_update_own"
  ON public.processos FOR UPDATE
  USING (advogado_id IN (
    SELECT id FROM public.advogados WHERE user_id = auth.uid()
  ));

CREATE POLICY "processos_delete_own"
  ON public.processos FOR DELETE
  USING (advogado_id IN (
    SELECT id FROM public.advogados WHERE user_id = auth.uid()
  ));

-- ================================================================
-- TABELA: movimentacoes
-- Cada andamento individual. Inserido exclusivamente pelo n8n.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.movimentacoes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id           UUID NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,

  -- Dados da movimentação (inseridos pelo n8n)
  codigo                INTEGER,
  nome                  TEXT,
  data_hora             TIMESTAMPTZ NOT NULL,
  orgao_julgador_nome   TEXT,
  complementos_json     JSONB,

  -- Chave de idempotência: gerada pelo n8n como "cnj_limpo|codigo|data_hora"
  chave_unica           TEXT NOT NULL,

  -- Flags
  nova                  BOOLEAN NOT NULL DEFAULT true,
  notificado_whatsapp   BOOLEAN NOT NULL DEFAULT false,

  -- Backup do payload original do DataJud
  payload_completo      JSONB,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (chave_unica)
);

CREATE INDEX IF NOT EXISTS idx_movimentacoes_processo_data
  ON public.movimentacoes(processo_id, data_hora DESC);

CREATE INDEX IF NOT EXISTS idx_movimentacoes_nova
  ON public.movimentacoes(processo_id, nova)
  WHERE nova = true;

ALTER TABLE public.movimentacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "movimentacoes_select_own"
  ON public.movimentacoes FOR SELECT
  USING (
    processo_id IN (
      SELECT p.id FROM public.processos p
      JOIN public.advogados a ON a.id = p.advogado_id
      WHERE a.user_id = auth.uid()
    )
  );

-- n8n usa service_role (bypass RLS) para INSERT.
-- Frontend não insere movimentações, apenas lê.

-- ================================================================
-- TRIGGER: ON INSERT movimentacoes → sinaliza novidade no processo
-- ================================================================
CREATE OR REPLACE FUNCTION public.fn_atualiza_novidade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.processos
  SET
    tem_novidade = true,
    updated_at   = now()
  WHERE id = NEW.processo_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_movimentacao_insert ON public.movimentacoes;

CREATE TRIGGER trg_movimentacao_insert
  AFTER INSERT ON public.movimentacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_atualiza_novidade();

-- ================================================================
-- TABELA: notificacoes
-- Log de alertas enviados pelo n8n via WhatsApp/email.
-- Frontend apenas lê. n8n insere via service_role.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.notificacoes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advogado_id      UUID NOT NULL REFERENCES public.advogados(id) ON DELETE CASCADE,
  processo_id      UUID NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  movimentacao_id  UUID REFERENCES public.movimentacoes(id) ON DELETE SET NULL,

  canal            TEXT NOT NULL DEFAULT 'whatsapp'
                     CHECK (canal IN ('whatsapp', 'email', 'push')),
  status_envio     TEXT NOT NULL DEFAULT 'pendente'
                     CHECK (status_envio IN ('pendente', 'enviado', 'falhou')),

  mensagem_enviada TEXT,
  resposta_api     JSONB,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  enviado_em       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notificacoes_advogado
  ON public.notificacoes(advogado_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notificacoes_processo
  ON public.notificacoes(processo_id);

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notificacoes_select_own"
  ON public.notificacoes FOR SELECT
  USING (advogado_id IN (
    SELECT id FROM public.advogados WHERE user_id = auth.uid()
  ));

-- ================================================================
-- TABELA: configuracoes_advogado
-- Preferências de notificação por advogado.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.configuracoes_advogado (
  advogado_id             UUID PRIMARY KEY REFERENCES public.advogados(id) ON DELETE CASCADE,
  notificar_whatsapp      BOOLEAN NOT NULL DEFAULT true,
  consolidar_notificacoes BOOLEAN NOT NULL DEFAULT false,
  horario_notificacao     TIME DEFAULT '07:00',
  timezone                TEXT DEFAULT 'America/Sao_Paulo',
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.configuracoes_advogado ENABLE ROW LEVEL SECURITY;

CREATE POLICY "configuracoes_select_own"
  ON public.configuracoes_advogado FOR SELECT
  USING (advogado_id IN (
    SELECT id FROM public.advogados WHERE user_id = auth.uid()
  ));

CREATE POLICY "configuracoes_insert_own"
  ON public.configuracoes_advogado FOR INSERT
  WITH CHECK (advogado_id IN (
    SELECT id FROM public.advogados WHERE user_id = auth.uid()
  ));

CREATE POLICY "configuracoes_update_own"
  ON public.configuracoes_advogado FOR UPDATE
  USING (advogado_id IN (
    SELECT id FROM public.advogados WHERE user_id = auth.uid()
  ));

-- ================================================================
-- FUNÇÃO AUXILIAR: criar perfil advogado automaticamente após signup
-- ================================================================
CREATE OR REPLACE FUNCTION public.fn_criar_perfil_advogado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.advogados (user_id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.email
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_criar_perfil_advogado ON auth.users;

CREATE TRIGGER trg_criar_perfil_advogado
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_criar_perfil_advogado();
