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
    const {
      cliente_id,
      caso_id,
      contrato_id,
      tipo_cobranca = "PIX",
      forma = "avista",
      valor,
      data_vencimento,
      numero_parcelas = 1,
      descricao,
      postal_service,
      postalService,
      discount,
      fine,
      interest,
    } = body;

    if (!cliente_id || !valor || valor < 5 || !data_vencimento) {
      return new Response(
        JSON.stringify({
          error: "O valor da cobrança não pode ser inferior a R$ 5,00 (requisito obrigatório do Asaas).",
        }),
        { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    if (forma === "parcelado" && valor / (numero_parcelas || 1) < 5) {
      const vParc = (valor / (numero_parcelas || 1)).toFixed(2).replace(".", ",");
      return new Response(
        JSON.stringify({
          error: `O valor de cada parcela não pode ser inferior a R$ 5,00 (atualmente R$ ${vParc} por parcela).`,
        }),
        { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    // 2. Busca o cliente no banco
    const { data: cliente, error: cliError } = await adminClient
      .from("clientes")
      .select("*")
      .eq("id", cliente_id)
      .single();

    if (cliError || !cliente) {
      return new Response(
        JSON.stringify({ error: "Cliente não encontrado no CRM." }),
        { status: 404, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    let asaasCustomerId = cliente.asaas_customer_id;

    // 3. Se o cliente ainda não tiver asaas_customer_id, sincroniza sob demanda
    if (!asaasCustomerId) {
      const docLimpo = (cliente.cpf_cnpj || "").replace(/\D/g, "");
      const telLimpo = (cliente.telefone_whatsapp || "").replace(/\D/g, "");
      const cepLimpo = (cliente.endereco_cep || "").replace(/\D/g, "");

      if (!docLimpo || (docLimpo.length !== 11 && docLimpo.length !== 14)) {
        return new Response(
          JSON.stringify({
            error: "Cliente precisa de um CPF ou CNPJ válido cadastrado para emitir cobranças no Asaas.",
          }),
          { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } }
        );
      }

      // Consulta se já existe por CPF/CNPJ
      const searchRes = await fetch(`${asaasBaseUrl}/customers?cpfCnpj=${docLimpo}`, {
        headers: { "access_token": asaasApiKey, "Content-Type": "application/json" },
      });

      if (searchRes.ok) {
        const searchJson = await searchRes.json();
        if (searchJson.data && searchJson.data.length > 0) {
          asaasCustomerId = searchJson.data[0].id;
        }
      }

      if (!asaasCustomerId) {
        const createRes = await fetch(`${asaasBaseUrl}/customers`, {
          method: "POST",
          headers: { "access_token": asaasApiKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            name: cliente.nome_razao_social.trim(),
            cpfCnpj: docLimpo,
            email: cliente.email?.trim() || undefined,
            mobilePhone: telLimpo || undefined,
            address: cliente.endereco_logradouro?.trim() || undefined,
            addressNumber: cliente.endereco_numero?.trim() || undefined,
            postalCode: cepLimpo || undefined,
            externalReference: `cliente_${cliente.id}`,
          }),
        });

        if (!createRes.ok) {
          const errJson = await createRes.json().catch(() => null);
          return new Response(
            JSON.stringify({
              error: "Falha ao registrar cliente no Asaas.",
              details: errJson?.errors || errJson,
            }),
            { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } }
          );
        }

        const newCustomer = await createRes.json();
        asaasCustomerId = newCustomer.id;
      }

      // Salva no banco local
      await adminClient
        .from("clientes")
        .update({ asaas_customer_id: asaasCustomerId, updated_at: new Date().toISOString() })
        .eq("id", cliente_id);
    }

    // 4. Idempotência: externalReference determinístico
    const extRefParts = [];
    if (caso_id) extRefParts.push(`caso_${caso_id}`);
    if (contrato_id) extRefParts.push(`contrato_${contrato_id}`);
    if (!caso_id && !contrato_id) extRefParts.push(`cliente_${cliente_id}_${Date.now()}`);
    extRefParts.push(`val_${Math.round(valor * 100)}`);
    const externalRef = extRefParts.join("_");

    // Verifica se já existe cobrança pendente com essa referência
    const { data: cobrancaExistente } = await adminClient
      .from("cobrancas_asaas")
      .select("*")
      .eq("external_reference", externalRef)
      .eq("status", "PENDING")
      .maybeSingle();

    if (cobrancaExistente) {
      return new Response(
        JSON.stringify({
          success: true,
          reaproveitada: true,
          cobranca: cobrancaExistente,
        }),
        { status: 200, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    // 5. Chamada à API Asaas para criação da cobrança
    const isParcelado = forma === "parcelado" && numero_parcelas > 1;
    const isAssinatura = forma === "assinatura";

    let asaasResult: any = null;
    let subscriptionId: string | null = null;
    let paymentId: string | null = null;

    if (isAssinatura) {
      // POST /v3/subscriptions
      const subPayload: any = {
        customer: asaasCustomerId,
        billingType: tipo_cobranca,
        value: valor,
        nextDueDate: data_vencimento,
        cycle: "MONTHLY",
        description: descricao || "Honorários de Assessoria Jurídica Recorrente (Partido Mensal)",
        externalReference: externalRef,
      };

      if (discount && Number(discount.value) > 0) {
        subPayload.discount = {
          value: Number(discount.value),
          dueDateLimitDays: Number(discount.dueDateLimitDays ?? 0),
          type: discount.type || "PERCENTAGE",
        };
      }

      if (fine && Number(fine.value) > 0) {
        subPayload.fine = {
          value: Number(fine.value),
          type: fine.type || "PERCENTAGE",
        };
      }

      if (interest && Number(interest.value) > 0) {
        subPayload.interest = {
          value: Number(interest.value),
          type: interest.type || "PERCENTAGE",
        };
      }

      const subRes = await fetch(`${asaasBaseUrl}/subscriptions`, {
        method: "POST",
        headers: { "access_token": asaasApiKey, "Content-Type": "application/json" },
        body: JSON.stringify(subPayload),
      });

      if (!subRes.ok) {
        const errJson = await subRes.json().catch(() => null);
        console.error("Erro Asaas /subscriptions:", errJson);
        const descAsaas = errJson?.errors?.[0]?.description;
        const msgFinal = descAsaas || "Falha ao criar assinatura no Asaas.";
        return new Response(
          JSON.stringify({
            error: msgFinal,
            details: errJson?.errors || errJson,
          }),
          { status: subRes.status, headers: { ...corsHeaders, "content-type": "application/json" } }
        );
      }

      asaasResult = await subRes.json();
      subscriptionId = asaasResult.id;

      // Busca os pagamentos gerados para obter a primeira fatura
      const listPayRes = await fetch(`${asaasBaseUrl}/subscriptions/${subscriptionId}/payments`, {
        headers: { "access_token": asaasApiKey, "Content-Type": "application/json" },
      });
      if (listPayRes.ok) {
        const listJson = await listPayRes.json();
        if (listJson.data && listJson.data.length > 0) {
          paymentId = listJson.data[0].id;
          asaasResult = listJson.data[0];
        }
      }
    } else {
      // POST /v3/payments
      const payPayload: any = {
        customer: asaasCustomerId,
        billingType: tipo_cobranca,
        dueDate: data_vencimento,
        description: descricao || "Honorários Advocatícios",
        externalReference: externalRef,
        postalService: Boolean(postal_service || postalService),
      };

      if (isParcelado) {
        payPayload.installmentCount = numero_parcelas;
        payPayload.totalValue = valor;
      } else {
        payPayload.value = valor;
      }

      if (discount && Number(discount.value) > 0) {
        payPayload.discount = {
          value: Number(discount.value),
          dueDateLimitDays: Number(discount.dueDateLimitDays ?? 0),
          type: discount.type || "PERCENTAGE",
        };
      }

      if (fine && Number(fine.value) > 0) {
        payPayload.fine = {
          value: Number(fine.value),
          type: fine.type || "PERCENTAGE",
        };
      }

      if (interest && Number(interest.value) > 0) {
        payPayload.interest = {
          value: Number(interest.value),
          type: interest.type || "PERCENTAGE",
        };
      }

      const payRes = await fetch(`${asaasBaseUrl}/payments`, {
        method: "POST",
        headers: { "access_token": asaasApiKey, "Content-Type": "application/json" },
        body: JSON.stringify(payPayload),
      });

      if (!payRes.ok) {
        const errJson = await payRes.json().catch(() => null);
        console.error("Erro Asaas /payments:", errJson);
        const descAsaas = errJson?.errors?.[0]?.description;
        const msgFinal = descAsaas || "Falha ao gerar cobrança no Asaas.";
        return new Response(
          JSON.stringify({
            error: msgFinal,
            details: errJson?.errors || errJson,
          }),
          { status: payRes.status, headers: { ...corsHeaders, "content-type": "application/json" } }
        );
      }

      asaasResult = await payRes.json();
      paymentId = asaasResult.id;
    }

    // 6. Se for Pix, busca QR Code dinâmico
    let pixQrCodeImage: string | null = null;
    let pixCopiaCola: string | null = null;

    if (paymentId && (tipo_cobranca === "PIX" || tipo_cobranca === "UNDEFINED")) {
      try {
        const pixRes = await fetch(`${asaasBaseUrl}/payments/${paymentId}/pixQrCode`, {
          headers: { "access_token": asaasApiKey, "Content-Type": "application/json" },
        });
        if (pixRes.ok) {
          const pixJson = await pixRes.json();
          pixQrCodeImage = pixJson.encodedImage ? `data:image/png;base64,${pixJson.encodedImage}` : null;
          pixCopiaCola = pixJson.payload || null;
        }
      } catch (e) {
        console.warn("Aviso ao buscar QrCode Pix:", e);
      }
    }

    // 7. Se for Boleto, busca linha digitável
    let linhaDigitavel: string | null = null;
    let bankSlipUrl: string | null = asaasResult?.bankSlipUrl || null;

    if (paymentId && (tipo_cobranca === "BOLETO" || tipo_cobranca === "UNDEFINED")) {
      try {
        const boletoRes = await fetch(`${asaasBaseUrl}/payments/${paymentId}/identificationField`, {
          headers: { "access_token": asaasApiKey, "Content-Type": "application/json" },
        });
        if (boletoRes.ok) {
          const boletoJson = await boletoRes.json();
          linhaDigitavel = boletoJson.identificationField || null;
        }
      } catch (e) {
        console.warn("Aviso ao buscar código de barras do boleto:", e);
      }
    }

    // 8. Grava registro na tabela cobrancas_asaas
    const { data: novaCobranca, error: insError } = await adminClient
      .from("cobrancas_asaas")
      .insert({
        cliente_id,
        caso_id: caso_id || null,
        contrato_financeiro_id: contrato_id || null,
        asaas_payment_id: paymentId,
        asaas_subscription_id: subscriptionId,
        tipo_cobranca,
        forma,
        status: asaasResult?.status || "PENDING",
        valor: asaasResult?.value || valor,
        valor_liquido: asaasResult?.netValue || null,
        data_vencimento: asaasResult?.dueDate || data_vencimento,
        invoice_url: asaasResult?.invoiceUrl || null,
        bank_slip_url: bankSlipUrl,
        pix_qrcode_image: pixQrCodeImage,
        pix_copia_cola: pixCopiaCola,
        linha_digitavel: linhaDigitavel,
        external_reference: externalRef,
        numero_parcela: 1,
        total_parcelas: numero_parcelas || 1,
        raw_data: asaasResult,
      })
      .select()
      .single();

    if (insError) {
      console.error("Erro ao salvar cobrança no banco local:", insError);
      return new Response(
        JSON.stringify({
          error: "Cobrança gerada no Asaas, mas houve falha ao persistir no CRM.",
          details: insError,
          asaas_payment_id: paymentId,
        }),
        { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        cobranca: novaCobranca,
      }),
      { status: 200, headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  } catch (err: unknown) {
    console.error("Erro na Edge Function asaas-criar-cobranca:", err);
    const msg = err instanceof Error ? err.message : "Erro interno no servidor";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  }
});
