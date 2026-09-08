// Edge Function: upload-documento-drive
// Autentica via OAuth2 Refresh Token (conta pessoal Google) e faz
// upload real de arquivos no Google Drive com hierarquia de pastas automática.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

const TIPO_LABELS: Record<string, string> = {
  procuracao_contrato: "Procurações e Contratos",
  documento_pessoal: "Documentos Pessoais",
  prova_documental: "Provas Documentais",
  peca_processual: "Peças Processuais",
  decisao_sentenca: "Decisões e Sentenças",
  outros: "Outros",
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── OAuth2: Refresh Token → Access Token ────────────────────────────────────

async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
  const refreshToken = Deno.env.get("GOOGLE_OAUTH_REFRESH_TOKEN");

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Variáveis de ambiente OAuth2 não configuradas: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN"
    );
  }

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Falha ao obter access token: ${JSON.stringify(data)}`);
  }
  return data.access_token as string;
}

// ─── Drive: Busca ou cria pasta ──────────────────────────────────────────────

async function findOrCreateFolder(
  token: string,
  name: string,
  parentId: string
): Promise<string> {
  const safeName = name.replace(/'/g, "\\'");
  const q = `name='${safeName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;

  const searchRes = await fetch(
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id)&pageSize=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const searchData = await searchRes.json();

  if (searchData.files?.length > 0) {
    return searchData.files[0].id as string;
  }

  const createRes = await fetch(`${DRIVE_API}/files`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    }),
  });

  const folder = await createRes.json();
  if (!createRes.ok) {
    throw new Error(`Erro ao criar pasta "${name}": ${JSON.stringify(folder)}`);
  }
  return folder.id as string;
}

// ─── Drive: Upload multipart ─────────────────────────────────────────────────

async function uploadFileToDrive(
  token: string,
  file: File,
  fileName: string,
  folderId: string
): Promise<{ id: string; webViewLink: string }> {
  const mimeType = file.type || "application/octet-stream";
  const boundary = `boundary_${crypto.randomUUID().replace(/-/g, "")}`;
  const metadata = JSON.stringify({ name: fileName, parents: [folderId] });

  const enc = new TextEncoder();
  const fileBuffer = new Uint8Array(await file.arrayBuffer());

  const parts = [
    enc.encode(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`
    ),
    enc.encode(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    fileBuffer,
    enc.encode(`\r\n--${boundary}--`),
  ];

  const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
  const body = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    body.set(part, offset);
    offset += part.length;
  }

  const uploadRes = await fetch(
    `${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id,webViewLink`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  const result = await uploadRes.json();
  if (!uploadRes.ok) {
    throw new Error(`Erro no upload: ${JSON.stringify(result)}`);
  }
  return result as { id: string; webViewLink: string };
}

// ─── Handler Principal ────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const formData = await req.formData();

    const file = formData.get("file") as File | null;
    const casoId = formData.get("caso_id") as string;
    const clienteNome = (formData.get("cliente_nome") as string) || "Cliente";
    const clienteId = (formData.get("cliente_id") as string) || "sem-id";
    const casoTitulo = (formData.get("caso_titulo") as string) || "Caso";
    const tipoDocumento =
      (formData.get("tipo_documento") as string) || "outros";
    const nomeArquivo =
      (formData.get("nome_arquivo") as string) || file?.name || "documento";

    if (!file) throw new Error("Nenhum arquivo enviado.");
    if (!casoId) throw new Error("caso_id é obrigatório.");

    const rootFolderId = Deno.env.get("GOOGLE_DRIVE_ROOT_FOLDER_ID");
    if (!rootFolderId) throw new Error("GOOGLE_DRIVE_ROOT_FOLDER_ID não configurado.");

    // Obtém access token via OAuth2 Refresh Token
    const token = await getAccessToken();

    // Hierarquia de pastas: Raiz → Cliente → Caso → TipoDocumento
    const clienteFolder = await findOrCreateFolder(
      token,
      `${clienteNome} — ${clienteId.slice(0, 8)}`,
      rootFolderId
    );

    const casoFolder = await findOrCreateFolder(
      token,
      `${casoTitulo} — ${casoId.slice(0, 8)}`,
      clienteFolder
    );

    const tipoFolder = await findOrCreateFolder(
      token,
      TIPO_LABELS[tipoDocumento] ?? "Outros",
      casoFolder
    );

    // Upload real do arquivo
    const uploaded = await uploadFileToDrive(token, file, nomeArquivo, tipoFolder);

    return new Response(
      JSON.stringify({
        file_id: uploaded.id,
        view_link: uploaded.webViewLink,
        folder_id: tipoFolder,
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[upload-documento-drive]", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
