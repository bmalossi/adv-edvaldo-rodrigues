-- ============================================================
-- Migration: CRM Funil Processual ADVBOX
-- Criada em: 2026-09-08
-- ============================================================

-- 1. Enum das 8 fases processuais
DO $$ BEGIN
  CREATE TYPE fase_funil AS ENUM (
    'negociacao',
    'consultoria',
    'administrativo',
    'judicial',
    'recursal',
    'execucao',
    'financeiro',
    'arquivamento'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Tabela de etapas dinâmicas (colunas do Kanban)
CREATE TABLE IF NOT EXISTS etapas_funil (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fase        fase_funil NOT NULL,
  nome        text NOT NULL,
  ordem       int NOT NULL DEFAULT 0,
  eh_padrao   boolean NOT NULL DEFAULT false,
  criada_por  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(fase, nome)
);

-- 3. Seed das etapas padrão
INSERT INTO etapas_funil (fase, nome, ordem, eh_padrao) VALUES
  -- Negociação
  ('negociacao', 'Análise do caso',                 1, true),
  ('negociacao', 'Aguardando documentos',            2, true),
  ('negociacao', 'Apresentação de proposta',         3, true),
  ('negociacao', 'Agendar consulta',                 4, true),
  ('negociacao', 'Cobrança inicial',                 5, true),
  ('negociacao', 'Definição de interesses',          6, true),
  ('negociacao', 'Elaboração de parecer jurídico',   7, true),
  ('negociacao', 'Fechamento',                       8, true),
  ('negociacao', 'Planejamento',                     9, true),
  -- Consultoria
  ('consultoria', 'Elaboração de contrato',              1, true),
  ('consultoria', 'Elaboração de parecer',               2, true),
  ('consultoria', 'Enviada notificação extrajudicial',   3, true),
  ('consultoria', 'Elaboração de termo de acordo',       4, true),
  ('consultoria', 'Agendada reunião de composição',      5, true),
  -- Administrativo
  ('administrativo', 'Requerimento administrativo',      1, true),
  ('administrativo', 'Aguardando resposta',              2, true),
  ('administrativo', 'Recurso administrativo',           3, true),
  ('administrativo', 'Concluído administrativamente',    4, true),
  -- Judicial
  ('judicial', 'Elaboração de petição inicial',      1, true),
  ('judicial', 'Aguardando distribuição',            2, true),
  ('judicial', 'Citação/Intimação',                  3, true),
  ('judicial', 'Instrução processual',               4, true),
  ('judicial', 'Aguardando sentença',                5, true),
  ('judicial', 'Sentença proferida',                 6, true),
  -- Recursal
  ('recursal', 'Análise de recurso',                 1, true),
  ('recursal', 'Elaboração de recurso',              2, true),
  ('recursal', 'Recurso protocolado',                3, true),
  ('recursal', 'Aguardando julgamento',              4, true),
  ('recursal', 'Acórdão proferido',                  5, true),
  -- Execução
  ('execucao', 'Cálculo de liquidação',              1, true),
  ('execucao', 'Petição de cumprimento',             2, true),
  ('execucao', 'Penhora/Bloqueio',                   3, true),
  ('execucao', 'Pagamento/Levantamento',             4, true),
  -- Financeiro
  ('financeiro', 'Acordo financeiro',                1, true),
  ('financeiro', 'Honorários pendentes',             2, true),
  ('financeiro', 'Honorários recebidos',             3, true),
  ('financeiro', 'Parcelamento ativo',               4, true),
  -- Arquivamento
  ('arquivamento', 'Encerrado com êxito',            1, true),
  ('arquivamento', 'Encerrado sem êxito',            2, true),
  ('arquivamento', 'Arquivado por acordo',           3, true),
  ('arquivamento', 'Arquivado administrativamente',  4, true)
ON CONFLICT (fase, nome) DO NOTHING;

-- 4. Expandir tabela casos
ALTER TABLE casos
  ADD COLUMN IF NOT EXISTS fase_funil      fase_funil DEFAULT 'negociacao',
  ADD COLUMN IF NOT EXISTS etapa_id        uuid REFERENCES etapas_funil(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS data_prazo      timestamptz,
  ADD COLUMN IF NOT EXISTS data_audiencia  timestamptz,
  ADD COLUMN IF NOT EXISTS data_fechamento timestamptz,
  ADD COLUMN IF NOT EXISTS data_transito_julgado timestamptz,
  ADD COLUMN IF NOT EXISTS resultado_final text CHECK (resultado_final IN (
    'procedente', 'improcedente', 'parcialmente_procedente',
    'acordo', 'desistencia', 'extincao_sem_resolucao', 'outro'
  )),
  ADD COLUMN IF NOT EXISTS valor_causa         numeric(15,2),
  ADD COLUMN IF NOT EXISTS numero_processo     text,
  ADD COLUMN IF NOT EXISTS compartilhado_com   uuid[] NOT NULL DEFAULT '{}';

-- 5. Tabela de eventos / linha do tempo
CREATE TABLE IF NOT EXISTS eventos_caso (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caso_id     uuid NOT NULL REFERENCES casos(id) ON DELETE CASCADE,
  tipo        text NOT NULL CHECK (tipo IN ('prazo','audiencia','movimentacao','documento','nota')),
  descricao   text NOT NULL,
  data_evento timestamptz NOT NULL DEFAULT now(),
  criado_por  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eventos_caso_caso_id ON eventos_caso(caso_id);
CREATE INDEX IF NOT EXISTS idx_eventos_caso_data    ON eventos_caso(data_evento DESC);
CREATE INDEX IF NOT EXISTS idx_casos_fase_funil     ON casos(fase_funil);
CREATE INDEX IF NOT EXISTS idx_casos_etapa_id       ON casos(etapa_id);

-- 6. RLS — etapas_funil
ALTER TABLE etapas_funil ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "etapas_funil_select" ON etapas_funil;
CREATE POLICY "etapas_funil_select" ON etapas_funil
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "etapas_funil_insert_admin" ON etapas_funil;
CREATE POLICY "etapas_funil_insert_admin" ON etapas_funil
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.perfis WHERE id = auth.uid() AND (papel::text = 'advogado' OR papel::text = 'admin')
    )
  );

DROP POLICY IF EXISTS "etapas_funil_update_admin" ON etapas_funil;
CREATE POLICY "etapas_funil_update_admin" ON etapas_funil
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfis WHERE id = auth.uid() AND (papel::text = 'advogado' OR papel::text = 'admin')
    )
  );

DROP POLICY IF EXISTS "etapas_funil_delete_admin" ON etapas_funil;
CREATE POLICY "etapas_funil_delete_admin" ON etapas_funil
  FOR DELETE TO authenticated
  USING (
    eh_padrao = false AND
    EXISTS (
      SELECT 1 FROM public.perfis WHERE id = auth.uid() AND (papel::text = 'advogado' OR papel::text = 'admin')
    )
  );

-- 7. RLS — eventos_caso (herda visibilidade do caso)
ALTER TABLE eventos_caso ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "eventos_caso_select" ON eventos_caso;
CREATE POLICY "eventos_caso_select" ON eventos_caso
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM casos c
      WHERE c.id = eventos_caso.caso_id
        AND (
          c.visibilidade = 'colegiado'
          OR c.responsavel_id = auth.uid()
          OR auth.uid() = ANY(c.compartilhado_com)
        )
    )
  );

DROP POLICY IF EXISTS "eventos_caso_insert" ON eventos_caso;
CREATE POLICY "eventos_caso_insert" ON eventos_caso
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM casos c
      WHERE c.id = eventos_caso.caso_id
        AND (
          c.visibilidade = 'colegiado'
          OR c.responsavel_id = auth.uid()
          OR auth.uid() = ANY(c.compartilhado_com)
        )
    )
  );
