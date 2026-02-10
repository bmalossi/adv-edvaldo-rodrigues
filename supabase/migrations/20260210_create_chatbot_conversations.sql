-- ========================================
-- Tabela de Conversas do Chatbot com IA
-- Advocacia Edvaldo Rodrigues
-- ========================================

-- 1. Criar tabela de conversas do chatbot
CREATE TABLE IF NOT EXISTS public.chatbot_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    session_id TEXT NOT NULL UNIQUE,
    
    -- Dados coletados
    nome TEXT,
    email TEXT,
    telefone TEXT,
    mensagem_inicial TEXT,
    
    -- Histórico completo da conversa em formato JSON
    historico_conversa JSONB DEFAULT '[]'::jsonb NOT NULL,
    
    -- Dados estruturados extraídos pela IA
    dados_coletados JSONB DEFAULT '{}'::jsonb NOT NULL,
    
    -- Status da conversa
    status TEXT DEFAULT 'em_andamento' NOT NULL CHECK (status IN ('em_andamento', 'finalizado', 'abandonado')),
    
    -- Metadata
    origem TEXT DEFAULT 'advogado-website',
    dispositivo TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_session_id 
    ON public.chatbot_conversations(session_id);

CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_created_at 
    ON public.chatbot_conversations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_status 
    ON public.chatbot_conversations(status);

CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_email 
    ON public.chatbot_conversations(email) WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_telefone 
    ON public.chatbot_conversations(telefone) WHERE telefone IS NOT NULL;

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.chatbot_conversations ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas de acesso

-- Política para permitir leitura pública
CREATE POLICY "Enable read access for chatbot" 
    ON public.chatbot_conversations FOR SELECT 
    USING (true);

-- Política para permitir inserção pública (chatbot pode criar conversas)
CREATE POLICY "Enable insert for chatbot" 
    ON public.chatbot_conversations FOR INSERT 
    WITH CHECK (true);

-- Política para permitir atualização pública (chatbot pode atualizar conversas)
CREATE POLICY "Enable update for chatbot" 
    ON public.chatbot_conversations FOR UPDATE 
    USING (true);

-- 5. Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_chatbot_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Criar trigger para atualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_chatbot_conversation_updated_at ON public.chatbot_conversations;

CREATE TRIGGER trigger_update_chatbot_conversation_updated_at
    BEFORE UPDATE ON public.chatbot_conversations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_chatbot_conversation_updated_at();

-- 7. Criar função para buscar conversa por telefone (para persistência)
CREATE OR REPLACE FUNCTION public.get_conversation_by_phone(phone_number TEXT)
RETURNS TABLE (
    id UUID,
    session_id TEXT,
    nome TEXT,
    email TEXT,
    telefone TEXT,
    historico_conversa JSONB,
    dados_coletados JSONB,
    status TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.session_id,
        c.nome,
        c.email,
        c.telefone,
        c.historico_conversa,
        c.dados_coletados,
        c.status,
        c.created_at,
        c.updated_at
    FROM public.chatbot_conversations c
    WHERE c.telefone = phone_number
    ORDER BY c.updated_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
