import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    const agora = new Date()
    const daqui48h = new Date(agora.getTime() + 48 * 60 * 60 * 1000).toISOString()

    // Busca prazos fatais pendentes com vencimento nas próximas 48 horas
    const { data: prazos, error } = await supabaseClient
      .from("pendencias_crm")
      .select(`
        id,
        titulo,
        data_vencimento,
        tipo,
        status,
        responsavel:perfis!responsavel_id (
          id,
          nome,
          email
        )
      `)
      .eq("tipo", "prazo_fatal")
      .neq("status", "concluido")
      .gt("data_vencimento", agora.toISOString())
      .lte("data_vencimento", daqui48h)

    if (error) {
      throw error
    }

    const alertas = (prazos || []).map((p) => {
      const msRestante = new Date(p.data_vencimento).getTime() - agora.getTime()
      const horasRestantes = Math.round(msRestante / (1000 * 60 * 60))
      return {
        prazo_id: p.id,
        titulo: p.titulo,
        destinatario: p.responsavel?.email,
        destinatario_nome: p.responsavel?.nome,
        horas_restantes: horasRestantes,
        janela: horasRestantes <= 24 ? "24h" : "48h",
      }
    })

    return new Response(
      JSON.stringify({
        success: true,
        processados: alertas.length,
        alertas,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    )
  }
})
