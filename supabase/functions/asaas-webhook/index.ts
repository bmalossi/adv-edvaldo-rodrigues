import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, asaas-access-token",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Validação de Segurança do Webhook via cabeçalho asaas-access-token
    const webhookTokenConfig = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
    const receivedToken = req.headers.get("asaas-access-token");

    if (webhookTokenConfig && receivedToken !== webhookTokenConfig) {
      console.warn("Webhook rejeitado: Token secreto inválido ou ausente.");
      return new Response(
        JSON.stringify({ error: "Unauthorized: Token de webhook inválido." }),
        { status: 401, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    const event = payload.event;
    const payment = payload.payment;

    console.log(`[Asaas Webhook] Evento recebido: ${event} para pagamento: ${payment?.id}`);

    if (!payment || !payment.id) {
      return new Response(JSON.stringify({ received: true, ignored: true }), {
        status: 200,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    // 2. Localiza a cobrança no banco local
    const { data: cobranca } = await adminClient
      .from("cobrancas_asaas")
      .select("*")
      .or(`asaas_payment_id.eq.${payment.id},external_reference.eq.${payment.externalReference}`)
      .maybeSingle();

    if (!cobranca) {
      console.info(`Cobrança com ref ${payment.id} não encontrada no CRM. Encerrando.`);
      return new Response(JSON.stringify({ received: true, not_found: true }), {
        status: 200,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const clienteId = cobranca.cliente_id;
    const casoId = cobranca.caso_id;

    // 3. Processa eventos de confirmação ou liquidação de pagamento
    if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
      const dataPagamento = payment.clientPaymentDate || payment.paymentDate || new Date().toISOString();

      // 3.1 Atualiza status da cobrança
      await adminClient
        .from("cobrancas_asaas")
        .update({
          status: "CONFIRMED",
          data_pagamento: dataPagamento,
          valor_liquido: payment.netValue || null,
          updated_at: new Date().toISOString(),
          raw_data: payment,
        })
        .eq("id", cobranca.id);

      // 3.2 Promove cliente de 'lead'/'consulta' para 'ativo'
      const { data: cliente } = await adminClient
        .from("clientes")
        .select("id, status_ciclo")
        .eq("id", clienteId)
        .single();

      if (cliente && (cliente.status_ciclo === "lead" || cliente.status_ciclo === "consulta")) {
        await adminClient
          .from("clientes")
          .update({
            status_ciclo: "ativo",
            updated_at: new Date().toISOString(),
          })
          .eq("id", clienteId);
        console.log(`Cliente ${clienteId} promovido para 'ativo' com sucesso.`);
      }

      // 3.3 Avança caso para etapa 'Fechamento' se estiver em fase de negociação
      if (casoId) {
        const { data: caso } = await adminClient
          .from("casos")
          .select("id, fase_funil, etapa_id")
          .eq("id", casoId)
          .single();

        if (caso && caso.fase_funil === "negociacao") {
          // Busca etapa 'Fechamento' da fase negociacao
          const { data: etapaFechamento } = await adminClient
            .from("etapas_funil")
            .select("id")
            .eq("fase", "negociacao")
            .ilike("nome", "%fechamento%")
            .maybeSingle();

          if (etapaFechamento) {
            await adminClient
              .from("casos")
              .update({
                etapa_id: etapaFechamento.id,
                updated_at: new Date().toISOString(),
              })
              .eq("id", casoId);
            console.log(`Caso ${casoId} avançado para etapa 'Fechamento'.`);
          }
        }
      }

      // 3.4 Registra na Timeline de Interações do cliente
      await adminClient.from("interacoes_cliente").insert({
        cliente_id: clienteId,
        tipo: "nota_interna",
        descricao: `[Asaas Pagamento Confirmado] Honorários de R$ ${payment.value?.toFixed(2) || cobranca.valor} liquidados via ${payment.billingType || cobranca.tipo_cobranca}. Fatura: ${payment.id}.`,
        data_interacao: new Date().toISOString(),
      });
    }

    // 4. Trata vencimento de fatura (PAYMENT_OVERDUE)
    if (event === "PAYMENT_OVERDUE") {
      await adminClient
        .from("cobrancas_asaas")
        .update({
          status: "OVERDUE",
          updated_at: new Date().toISOString(),
        })
        .eq("id", cobranca.id);

      await adminClient.from("interacoes_cliente").insert({
        cliente_id: clienteId,
        tipo: "nota_interna",
        descricao: `[Alerta Asaas Vencimento] Fatura de honorários de R$ ${payment.value?.toFixed(2) || cobranca.valor} (${payment.billingType || cobranca.tipo_cobranca}) venceu em ${payment.dueDate || cobranca.data_vencimento} sem confirmação de pagamento. Ref: ${payment.id}.`,
        data_interacao: new Date().toISOString(),
      });
    }

    return new Response(JSON.stringify({ success: true, event }), {
      status: 200,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("Erro interno no processamento do webhook Asaas:", err);
    return new Response(JSON.stringify({ error: "Erro interno no webhook" }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
