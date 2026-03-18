-- ================================================================
-- JusTrack — Ajuste de Fuso Horário
-- Define o padrão para America/Sao_Paulo em todo o banco
-- ================================================================

-- 1. Redefine o fuso horário padrão da base de dados
ALTER DATABASE postgres SET timezone TO 'America/Sao_Paulo';

-- 2. Ajusta a sessão atual (para efeito imediato no painel do Supabase)
SET timezone TO 'America/Sao_Paulo';

-- 3. (Opcional) Verificação
-- SELECT now(); -- Deve retornar o horário de Brasília
