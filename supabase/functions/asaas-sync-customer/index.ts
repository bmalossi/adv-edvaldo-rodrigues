import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
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

    // 1. Validação da sessão autenticada do usuário
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

    // 2. Cliente com Service Role para gravação no banco
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const asaasApiKey = Deno.env.get("ASAAS_API_KEY");
    if (!asaasApiKey) {
      return new Response(
        JSON.stringify({
          error: "Configuração ausente: ASAAS_API_KEY não definida nas variáveis de ambiente.",
        }),
        { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    const asaasEnv = (Deno.env.get("ASAAS_ENVIRONMENT") || "sandbox").toLowerCase();
    const asaasBaseUrl = asaasEnv === "production"
      ? "https://api.asaas.com/v3"
      : "https://sandbox.asaas.com/api/v3";

    const body = await req.json();
    const clienteId = body.cliente_id;

    if (!clienteId) {
      return new Response(
        JSON.stringify({ error: "Parâmetro cliente_id é obrigatório." }),
        { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    // 3. Buscar dados do cliente no banco
    const { data: cliente, error: cliError } = await adminClient
      .from("clientes")
      .select("*")
      .eq("id", clienteId)
      .single();

    if (cliError || !cliente) {
      return new Response(
        JSON.stringify({ error: "Cliente não encontrado no CRM." }),
        { status: 404, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    const docLimpo = (cliente.cpf_cnpj || "").replace(/\D/g, "");
    if (!docLimpo || (docLimpo.length !== 11 && docLimpo.length !== 14)) {
      return new Response(
        JSON.stringify({
          error: "CPF ou CNPJ válido é obrigatório para sincronização no Asaas.",
        }),
        { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    const telLimpo = (cliente.telefone_whatsapp || "").replace(/\D/g, "");
    const cepLimpo = (cliente.endereco_cep || "").replace(/\D/g, "");

    const customerPayload = {
      name: cliente.nome_razao_social.trim(),
      cpfCnpj: docLimpo,
      email: cliente.email?.trim() || undefined,
      phone: telLimpo || undefined,
      mobilePhone: telLimpo || undefined,
      address: cliente.endereco_logradouro?.trim() || undefined,
      addressNumber: cliente.endereco_numero?.trim() || undefined,
      complement: cliente.endereco_complemento?.trim() || undefined,
      province: cliente.endereco_bairro?.trim() || undefined,
      postalCode: cepLimpo || undefined,
      externalReference: `cliente_${cliente.id}`,
      notificationDisabled: false,
    };

    let asaasCustomerId = cliente.asaas_customer_id;
    let customerData = null;

    // 4. Se já possui asaas_customer_id, atualiza no Asaas
    if (asaasCustomerId) {
      const updateRes = await fetch(`${asaasBaseUrl}/customers/${asaasCustomerId}`, {
        method: "POST",
        headers: {
          "access_token": asaasApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(customerPayload),
      });

      if (!updateRes.ok) {
        const errJson = await updateRes.json().catch(() => null);
        console.error("Erro ao atualizar cliente no Asaas:", errJson);
        return new Response(
          JSON.stringify({
            error: "Falha ao atualizar cliente no Asaas.",
            details: errJson?.errors || errJson,
          }),
          { status: updateRes.status, headers: { ...corsHeaders, "content-type": "application/json" } }
        );
      }

      customerData = await updateRes.json();
    } else {
      // 5. Prevenção de duplicidade: busca primeiro se cliente já existe por CPF/CNPJ
      const searchRes = await fetch(`${asaasBaseUrl}/customers?cpfCnpj=${docLimpo}`, {
        method: "GET",
        headers: {
          "access_token": asaasApiKey,
          "Content-Type": "application/json",
        },
      });

      if (searchRes.ok) {
        const searchJson = await searchRes.json();
        if (searchJson.data && searchJson.data.length > 0) {
          // Cliente já existente no Asaas: reaproveita ID e atualiza dados
          asaasCustomerId = searchJson.data[0].id;
          const updateExistingRes = await fetch(`${asaasBaseUrl}/customers/${asaasCustomerId}`, {
            method: "POST",
            headers: {
              "access_token": asaasApiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(customerPayload),
          });
          customerData = updateExistingRes.ok ? await updateExistingRes.json() : searchJson.data[0];
        }
      }

      // Se ainda não tem ID, cria um novo
      if (!asaasCustomerId) {
        const createRes = await fetch(`${asaasBaseUrl}/customers`, {
          method: "POST",
          headers: {
            "access_token": asaasApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(customerPayload),
        });

        if (!createRes.ok) {
          const errJson = await createRes.json().catch(() => null);
          console.error("Erro ao criar cliente no Asaas:", errJson);
          return new Response(
            JSON.stringify({
              error: "Falha ao cadastrar cliente no Asaas.",
              details: errJson?.errors || errJson,
            }),
            { status: createRes.status, headers: { ...corsHeaders, "content-type": "application/json" } }
          );
        }

        customerData = await createRes.json();
        asaasCustomerId = customerData.id;
      }

      // 6. Persiste asaas_customer_id na tabela clientes local
      await adminClient
        .from("clientes")
        .update({
          asaas_customer_id: asaasCustomerId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", clienteId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        asaas_customer_id: asaasCustomerId,
        environment: asaasEnv,
        customer: customerData,
      }),
      { status: 200, headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  } catch (err: unknown) {
    console.error("Erro na Edge Function asaas-sync-customer:", err);
    const msg = err instanceof Error ? err.message : "Erro interno no servidor";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  }
});
