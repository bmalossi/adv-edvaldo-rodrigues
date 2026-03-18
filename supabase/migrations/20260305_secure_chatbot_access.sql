-- ========================================
-- Secure Chatbot Access Migration
-- ========================================

-- 1. Disable public direct access that was enabled in previous migration
-- (Removing the overly permissive policies)
DROP POLICY IF EXISTS "Enable read access for chatbot" ON public.chatbot_conversations;
DROP POLICY IF EXISTS "Enable insert for chatbot" ON public.chatbot_conversations;
DROP POLICY IF EXISTS "Enable update for chatbot" ON public.chatbot_conversations;

-- 2. Create more restrictive policies (Optional but good for defense in depth)
-- Only allow select if the session_id is known (still public but requires knowing the UUID/SessionID)
CREATE POLICY "Restrict select by session_id" 
    ON public.chatbot_conversations FOR SELECT 
    USING (false); -- Default to false, rely on SECURITY DEFINER functions for sensitive access

-- 3. Secure function to get conversation by session_id
CREATE OR REPLACE FUNCTION public.get_conversation_by_session_id(sid TEXT)
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
    WHERE c.session_id = sid
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Secure function to save/upsert chatbot conversation
-- This prevents direct table manipulation and allows us to add server-side validation logic later
CREATE OR REPLACE FUNCTION public.save_chatbot_conversation(payload JSONB)
RETURNS JSONB AS $$
DECLARE
    v_session_id TEXT;
    v_result JSONB;
BEGIN
    v_session_id := payload->>'session_id';
    
    IF v_session_id IS NULL THEN
        RAISE EXCEPTION 'session_id is required';
    END IF;

    INSERT INTO public.chatbot_conversations (
        session_id,
        nome,
        email,
        telefone,
        mensagem_inicial,
        historico_conversa,
        dados_coletados,
        status,
        origem,
        dispositivo
    )
    VALUES (
        v_session_id,
        payload->>'nome',
        payload->>'email',
        payload->>'telefone',
        payload->>'mensagem_inicial',
        COALESCE((payload->'historico_conversa')::jsonb, '[]'::jsonb),
        COALESCE((payload->'dados_coletados')::jsonb, '{}'::jsonb),
        COALESCE(payload->>'status', 'em_andamento'),
        COALESCE(payload->>'origem', 'advogado-website'),
        payload->>'dispositivo'
    )
    ON CONFLICT (session_id) DO UPDATE SET
        nome = COALESCE(EXCLUDED.nome, chatbot_conversations.nome),
        email = COALESCE(EXCLUDED.email, chatbot_conversations.email),
        telefone = COALESCE(EXCLUDED.telefone, chatbot_conversations.telefone),
        historico_conversa = EXCLUDED.historico_conversa,
        dados_coletados = EXCLUDED.dados_coletados,
        status = EXCLUDED.status,
        updated_at = NOW()
    RETURNING to_jsonb(chatbot_conversations.*) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
