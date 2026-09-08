-- Migration: Campos complementares do processo (ADVBOX)
ALTER TABLE public.casos
  ADD COLUMN IF NOT EXISTS numero_protocolo TEXT,
  ADD COLUMN IF NOT EXISTS processo_originario TEXT,
  ADD COLUMN IF NOT EXISTS identificacao_pasta TEXT,
  ADD COLUMN IF NOT EXISTS data_requerimento TIMESTAMPTZ;
