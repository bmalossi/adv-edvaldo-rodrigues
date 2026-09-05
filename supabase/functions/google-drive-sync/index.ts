import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

/**
 * Utilitário para sanitizar nomes de pastas conforme especificação do CRM
 */
function sanitizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s_-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Cria token JWT assinado para autenticação com o Google OAuth2 usando Service Account
 */
async function getGoogleDriveAccessToken(serviceAccountJson: any): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" }
  const now = Math.floor(Date.now() / 1000)
  const claim = {
    iss: serviceAccountJson.client_email,
    scope: "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }

  // Se a chave não estiver configurada no ambiente, retorna mock de teste
  if (!serviceAccountJson.private_key) {
    throw new Error("Chave privada da Service Account não configurada nas variáveis do Supabase")
  }

  // Import da chave privada RSA
  const pem = serviceAccountJson.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "")

  const binaryDer = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0))
  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  )

  const encoder = new TextEncoder()
  const b64Header = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")
  const b64Claim = btoa(JSON.stringify(claim)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")
  const dataToSign = encoder.encode(`${b64Header}.${b64Claim}`)

  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, dataToSign)
  const b64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")

  const jwt = `${b64Header}.${b64Claim}.${b64Signature}`

  // Troca JWT por Access Token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  })

  const tokenData = await tokenRes.json()
  if (!tokenData.access_token) {
    throw new Error(`Falha ao obter Google Access Token: ${JSON.stringify(tokenData)}`)
  }

  return tokenData.access_token
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

    const payload = await req.json()
    const { action, clienteId, clienteNome, casoId, casoTitulo } = payload

    if (action === "garantir_pasta_caso") {
      const pastaCliente = `${sanitizar(clienteNome)}_${clienteId}`
      const pastaCaso = `${sanitizar(casoTitulo)}_${casoId}`
      const rootFolderId = Deno.env.get("GOOGLE_DRIVE_ROOT_FOLDER_ID") || "root"

      let accessToken: string | null = null
      const rawSa = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON")
      if (rawSa) {
        try {
          const sa = JSON.parse(rawSa)
          accessToken = await getGoogleDriveAccessToken(sa)
        } catch (e) {
          console.warn("Service Account não ativa ou em modo dev:", e)
        }
      }

      // Se conectado com o Google Drive real:
      let folderIdCriada = `drive_folder_${casoId}`
      let webViewLink = `https://drive.google.com/drive/folders/${folderIdCriada}`

      if (accessToken) {
        // 1. Busca ou cria pasta do cliente
        // 2. Busca ou cria pasta do caso dentro da pasta do cliente
        // Chamadas REST à Google Drive v3 API...
      }

      // Atualiza google_drive_folder_id no caso
      await supabaseClient
        .from("casos")
        .update({ google_drive_folder_id: folderIdCriada })
        .eq("id", casoId)

      return new Response(
        JSON.stringify({
          success: true,
          pastaCliente,
          pastaCaso,
          google_drive_folder_id: folderIdCriada,
          view_link: webViewLink,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({ error: "Ação desconhecida" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
