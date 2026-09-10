import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Cabeçalho de autorização ausente." }),
        { status: 401, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1. Valida o usuário autenticado da requisição
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Sessão inválida ou expirada." }),
        { status: 401, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    // 2. Cria cliente com Service Role para operações privilegiadas
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verifica se o requisitante é Administrador (leitura direta por id, sem RLS)
    const { data: perfilExecutor } = await adminClient
      .from('perfis')
      .select('role:roles(nome)')
      .eq('id', user.id)
      .maybeSingle();

    const isAdm = perfilExecutor?.role?.nome === 'Administrador';

    // Verifica permissão granular via userClient (mantém auth.uid() do JWT)
    const { data: hasPerm } = await userClient.rpc('has_permission', {
      p_modulo: 'usuarios',
      p_acao: 'criar'
    });

    if (!isAdm && !hasPerm) {
      return new Response(
        JSON.stringify({ error: "Apenas administradores podem criar novos usuários." }),
        { status: 403, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    const body = await req.json();
    console.log("criar-usuario body recebido:", JSON.stringify(body));
    const { email, password, nome, oab, telefone, role_id, must_change_password } = body;

    if (!email || !password || !nome || !role_id) {
      console.error("Campos ausentes:", { email: !!email, password: !!password, nome: !!nome, role_id: !!role_id });
      return new Response(
        JSON.stringify({ error: `Parâmetros obrigatórios ausentes. Recebidos: email=${!!email}, senha=${!!password}, nome=${!!nome}, role_id=${!!role_id}` }),
        { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    // 3. Cria a conta de autenticação no Supabase Auth com senha temporária
    const { data: authCreated, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome, oab, telefone, role_id, must_change_password },
    });

    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    const newUserId = authCreated.user.id;

    // 4. Cria ou atualiza o perfil associado ao novo usuário na tabela perfis
    const { error: perfilError } = await adminClient
      .from('perfis')
      .upsert({
        id: newUserId,
        nome: nome.trim(),
        email: email.trim(),
        oab: oab ? oab.trim() : null,
        telefone: telefone ? telefone.trim() : null,
        role_id,
        ativo: true,
        must_change_password: must_change_password !== false, // Padrão true
        updated_at: new Date().toISOString(),
      });

    if (perfilError) {
      console.error("Erro ao salvar perfil do novo usuário:", perfilError);
      return new Response(
        JSON.stringify({ error: "Usuário autenticado criado, mas falhou ao gravar perfil: " + perfilError.message }),
        { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, userId: newUserId }),
      { status: 200, headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Exceção na Edge Function criar-usuario:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Erro interno no servidor." }),
      { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  }
});
