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
    const subscription = payload.subscription;

    console.log(`[Asaas Webhook] Evento: ${event} | Payment: ${payment?.id} | Subscription: ${subscription?.id}`);

    // ─────────────────────────────────────────────────────────────
    // 2. Eventos de Assinatura (Partido Mensal Recorrente)
    // ─────────────────────────────────────────────────────────────
    if (event?.startsWith("SUBSCRIPTION_") && subscription?.id) {
      const { data: cobrancasSub } = await adminClient
        .from("cobrancas_asaas")
        .select("cliente_id, caso_id")
        .eq("asaas_subscription_id", subscription.id)
        .limit(1);

      if (cobrancasSub && cobrancasSub.length > 0) {
        const clienteId = cobrancasSub[0].cliente_id;

        if (event === "SUBSCRIPTION_DELETED" || event === "SUBSCRIPTION_INACTIVATED") {
          // Cancela parcelas pendentes da assinatura
          await adminClient
            .from("cobrancas_asaas")
            .update({ status: "CANCELLED", updated_at: new Date().toISOString() })
            .eq("asaas_subscription_id", subscription.id)
            .eq("status", "PENDING");

          await adminClient.from("interacoes_cliente").insert({
            cliente_id: clienteId,
            tipo: "nota_interna",
            descricao: `[Partido Mensal] Assinatura recorrente ${subscription.id} foi cancelada/inativada no Asaas (${event}).`,
            data_interacao: new Date().toISOString(),
          });
        } else if (event === "SUBSCRIPTION_UPDATED") {
          await adminClient.from("interacoes_cliente").insert({
            cliente_id: clienteId,
            tipo: "nota_interna",
            descricao: `[Partido Mensal] Dados da assinatura ${subscription.id} foram alterados no Asaas. Valor: R$ ${subscription.value?.toFixed(2) || 'N/A'}, Próximo vencimento: ${subscription.nextDueDate || 'N/A'}.`,
            data_interacao: new Date().toISOString(),
          });
        }
      }

      return new Response(JSON.stringify({ success: true, handled: "subscription", event }), {
        status: 200,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    if (!payment || !payment.id) {
      return new Response(JSON.stringify({ received: true, ignored: true }), {
        status: 200,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 3. Localização da Cobrança no CRM
    // ─────────────────────────────────────────────────────────────
    let { data: cobranca } = await adminClient
      .from("cobrancas_asaas")
      .select("*")
      .or(`asaas_payment_id.eq.${payment.id},external_reference.eq.${payment.externalReference}`)
      .maybeSingle();

    // Se for uma nova parcela de partido mensal gerada pelo Asaas (PAYMENT_CREATED)
    if (!cobranca && payment.subscription) {
      const { data: modeloSub } = await adminClient
        .from("cobrancas_asaas")
        .select("cliente_id, caso_id, contrato_financeiro_id, tipo_cobranca, forma")
        .eq("asaas_subscription_id", payment.subscription)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (modeloSub) {
        const { data: novaCobranca } = await adminClient
          .from("cobrancas_asaas")
          .insert({
            cliente_id: modeloSub.cliente_id,
            caso_id: modeloSub.caso_id,
            contrato_financeiro_id: modeloSub.contrato_financeiro_id,
            asaas_payment_id: payment.id,
            asaas_subscription_id: payment.subscription,
            tipo_cobranca: payment.billingType || modeloSub.tipo_cobranca,
            forma: "assinatura",
            status: payment.status || "PENDING",
            valor: payment.value,
            data_vencimento: payment.dueDate,
            invoice_url: payment.invoiceUrl || null,
            bank_slip_url: payment.bankSlipUrl || null,
            external_reference: payment.externalReference || null,
            raw_data: payment,
          })
          .select()
          .single();

        cobranca = novaCobranca;

        await adminClient.from("interacoes_cliente").insert({
          cliente_id: modeloSub.cliente_id,
          tipo: "nota_interna",
          descricao: `[Partido Mensal - Nova Mensalidade] Nova fatura gerada automaticamente pelo Asaas: R$ ${payment.value.toFixed(2)} (Vencimento: ${payment.dueDate}). Ref: ${payment.id}.`,
          data_interacao: new Date().toISOString(),
        });
      }
    }

    if (!cobranca) {
      console.info(`Cobrança com ref ${payment.id} não encontrada no CRM. Encerrando.`);
      return new Response(JSON.stringify({ received: true, not_found: true }), {
        status: 200,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const clienteId = cobranca.cliente_id;
    const casoId = cobranca.caso_id;

    // ─────────────────────────────────────────────────────────────
    // 4. Processamento dos Eventos de Pagamento
    // ─────────────────────────────────────────────────────────────

    // 4.1 Liquidação / Pagamento Confirmado
    if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
      const dataPagamento = payment.clientPaymentDate || payment.paymentDate || new Date().toISOString();

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

      // Promove cliente para 'ativo'
      const { data: cliente } = await adminClient
        .from("clientes")
        .select("id, status_ciclo")
        .eq("id", clienteId)
        .single();

      if (cliente && (cliente.status_ciclo === "lead" || cliente.status_ciclo === "consulta")) {
        await adminClient
          .from("clientes")
          .update({ status_ciclo: "ativo", updated_at: new Date().toISOString() })
          .eq("id", clienteId);
      }

      // Avança caso para etapa 'Fechamento'
      if (casoId) {
        const { data: caso } = await adminClient
          .from("casos")
          .select("id, fase_funil, etapa_id")
          .eq("id", casoId)
          .single();

        if (caso && caso.fase_funil === "negociacao") {
          const { data: etapaFechamento } = await adminClient
            .from("etapas_funil")
            .select("id")
            .eq("fase", "negociacao")
            .ilike("nome", "%fechamento%")
            .maybeSingle();

          if (etapaFechamento) {
            await adminClient
              .from("casos")
              .update({ etapa_id: etapaFechamento.id, updated_at: new Date().toISOString() })
              .eq("id", casoId);
          }
        }
      }

      await adminClient.from("interacoes_cliente").insert({
        cliente_id: clienteId,
        tipo: "nota_interna",
        descricao: `[Asaas Pagamento Confirmado] Honorários de R$ ${payment.value?.toFixed(2) || cobranca.valor} liquidados via ${payment.billingType || cobranca.tipo_cobranca}. Fatura: ${payment.id}.`,
        data_interacao: new Date().toISOString(),
      });
    }

    // 4.2 Vencimento da Cobrança
    else if (event === "PAYMENT_OVERDUE") {
      await adminClient
        .from("cobrancas_asaas")
        .update({ status: "OVERDUE", updated_at: new Date().toISOString(), raw_data: payment })
        .eq("id", cobranca.id);

      await adminClient.from("interacoes_cliente").insert({
        cliente_id: clienteId,
        tipo: "nota_interna",
        descricao: `[Alerta Asaas Vencimento] Fatura de honorários de R$ ${payment.value?.toFixed(2) || cobranca.valor} (${payment.billingType || cobranca.tipo_cobranca}) venceu em ${payment.dueDate || cobranca.data_vencimento} sem liquidação. Ref: ${payment.id}.`,
        data_interacao: new Date().toISOString(),
      });
    }

    // 4.3 Atualização de Dados da Fatura (Valor, Vencimento, Descrição)
    else if (event === "PAYMENT_UPDATED") {
      await adminClient
        .from("cobrancas_asaas")
        .update({
          valor: payment.value ?? cobranca.valor,
          data_vencimento: payment.dueDate ?? cobranca.data_vencimento,
          updated_at: new Date().toISOString(),
          raw_data: payment,
        })
        .eq("id", cobranca.id);

      await adminClient.from("interacoes_cliente").insert({
        cliente_id: clienteId,
        tipo: "nota_interna",
        descricao: `[Asaas Fatura Atualizada] Fatura ref: ${payment.id} atualizada para R$ ${payment.value?.toFixed(2)} (Vencimento: ${payment.dueDate || cobranca.data_vencimento}).`,
        data_interacao: new Date().toISOString(),
      });
    }

    // 4.4 Cancelamento / Exclusão de Fatura
    else if (event === "PAYMENT_DELETED") {
      await adminClient
        .from("cobrancas_asaas")
        .update({ status: "CANCELLED", updated_at: new Date().toISOString(), raw_data: payment })
        .eq("id", cobranca.id);

      await adminClient.from("interacoes_cliente").insert({
        cliente_id: clienteId,
        tipo: "nota_interna",
        descricao: `[Asaas Fatura Cancelada] Fatura ref: ${payment.id} de R$ ${payment.value?.toFixed(2) || cobranca.valor} foi cancelada/excluída no Asaas.`,
        data_interacao: new Date().toISOString(),
      });
    }

    // 4.5 Restauração de Fatura Cancelada
    else if (event === "PAYMENT_RESTORED") {
      await adminClient
        .from("cobrancas_asaas")
        .update({ status: "PENDING", updated_at: new Date().toISOString(), raw_data: payment })
        .eq("id", cobranca.id);

      await adminClient.from("interacoes_cliente").insert({
        cliente_id: clienteId,
        tipo: "nota_interna",
        descricao: `[Asaas Fatura Restaurada] Fatura ref: ${payment.id} foi reativada no Asaas como pendente.`,
        data_interacao: new Date().toISOString(),
      });
    }

    // 4.6 Estorno / Reembolso (Total ou Parcial)
    else if (event === "PAYMENT_REFUNDED" || event === "PAYMENT_PARTIALLY_REFUNDED") {
      await adminClient
        .from("cobrancas_asaas")
        .update({ status: "REFUNDED", updated_at: new Date().toISOString(), raw_data: payment })
        .eq("id", cobranca.id);

      await adminClient.from("interacoes_cliente").insert({
        cliente_id: clienteId,
        tipo: "nota_interna",
        descricao: `[ALERTA ESTORNO ASAAS] Fatura ref: ${payment.id} no valor de R$ ${payment.value?.toFixed(2)} foi estornada/reembolsada (${event}).`,
        data_interacao: new Date().toISOString(),
      });
    }

    // 4.7 Contestação / Chargeback de Cartão
    else if (event === "PAYMENT_CHARGEBACK_REQUESTED" || event === "PAYMENT_CHARGEBACK_DISPUTE") {
      await adminClient
        .from("cobrancas_asaas")
        .update({ status: "CHARGEBACK", updated_at: new Date().toISOString(), raw_data: payment })
        .eq("id", cobranca.id);

      await adminClient.from("interacoes_cliente").insert({
        cliente_id: clienteId,
        tipo: "nota_interna",
        descricao: `[ALERTA CRÍTICO CHARGEBACK] Notificação de contestação/chargeback para a fatura ref: ${payment.id} (R$ ${payment.value?.toFixed(2)}). Verifique imediatamente no painel Asaas.`,
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
