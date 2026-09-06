-- Migration: 20260906000009_crm_agenda_advbox.sql
-- Description: Adiciona colunas para compatibilidade com o formato visual de tarefas da Advbox

ALTER TABLE public.pendencias_crm
    ADD COLUMN IF NOT EXISTS hora TEXT,
    ADD COLUMN IF NOT EXISTS dia_inteiro BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS local TEXT,
    ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS mostrar_na_agenda BOOLEAN DEFAULT true;

-- Índice para busca por data em formatos de calendário
CREATE INDEX IF NOT EXISTS idx_pendencias_mostrar_agenda ON public.pendencias_crm(mostrar_na_agenda) WHERE mostrar_na_agenda = true;
