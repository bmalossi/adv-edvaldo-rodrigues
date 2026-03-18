import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jcnomzbnitypvsjkvbrc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impjbm9temJuaXR5cHZzamt2YnJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjk5ODQsImV4cCI6MjA4NTgwNTk4NH0.g8Y6DY1Batizov0ogChGe0UmhkaJsIF8qS_Nrez88QI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyVulnerability() {
    console.log('--- Phase 1: Direct Table Access (Should be blocked) ---');

    const { data, error } = await supabase
        .from('chatbot_conversations')
        .select('id, nome, email, telefone, created_at')
        .limit(5);

    if (error) {
        console.log('[+] SUCCESS: Direct table access blocked:', error.message);
    } else {
        console.warn('[!] WARNING: Direct table access still allowed. Ensure migration is applied.');
    }

    console.log('\n--- Phase 2: Secure RPC Access (Should work for specific session) ---');

    // Testing with a dummy session ID
    const sid = 'test-security-' + Date.now();

    console.log('Testing RPC get_conversation_by_session_id...');
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_conversation_by_session_id', {
        sid: sid
    });

    if (rpcError) {
        console.error('[-] Error calling RPC get_conversation_by_session_id:', rpcError.message);
    } else {
        console.log('[+] SUCCESS: RPC get_conversation_by_session_id is reachable.');
    }

    console.log('Testing RPC save_chatbot_conversation...');
    const { data: saveResult, error: saveError } = await supabase.rpc('save_chatbot_conversation', {
        payload: {
            session_id: sid,
            nome: 'Security Test',
            status: 'em_andamento'
        }
    });

    if (saveError) {
        console.error('[-] Error calling RPC save_chatbot_conversation:', saveError.message);
    } else {
        console.log('[+] SUCCESS: RPC save_chatbot_conversation worked successfully.');
    }
}

verifyVulnerability();
