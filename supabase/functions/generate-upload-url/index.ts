import { AwsClient } from "https://esm.sh/aws4fetch@1.0.17";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Tratamento de preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Validar autenticação do usuário via JWT do Supabase
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Cabeçalho Authorization não fornecido" }),
        { status: 401, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Sessão inválida ou expirada" }),
        { status: 401, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    // 2. Verificar se secrets do Cloudflare R2 estão configurados
    const accountId = Deno.env.get("R2_ACCOUNT_ID");
    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
    const bucketName = Deno.env.get("R2_BUCKET_NAME") || "edvaldorodrigues-artigos";
    const publicUrl = Deno.env.get("R2_PUBLIC_URL") || "https://cdn.edvaldorodrigues.com.br";

    if (!accountId || !accessKeyId || !secretAccessKey) {
      return new Response(
        JSON.stringify({
          error: "R2_SECRETS_NOT_CONFIGURED",
          message:
            "As variáveis de ambiente do Cloudflare R2 ainda não foram configuradas na Edge Function.",
        }),
        { status: 503, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    // 3. Extrair nome e tipo do arquivo
    const { fileName, contentType } = await req.json();
    if (!fileName || !contentType) {
      return new Response(
        JSON.stringify({ error: "fileName e contentType são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "-");
    const key = `articles/${crypto.randomUUID()}-${safeName}`;

    const client = new AwsClient({
      accessKeyId,
      secretAccessKey,
    });

    const endpoint = `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${key}`;
    const signed = await client.sign(endpoint, {
      method: "PUT",
      aws: {
        signQuery: true,
      },
    });

    return new Response(
      JSON.stringify({
        uploadUrl: signed.url,
        publicUrl: `${publicUrl}/${key}`,
      }),
      { headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: "INTERNAL_ERROR", message }),
      { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  }
});
