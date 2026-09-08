// Edge Function: upload-documento-drive
// Recebe um arquivo via multipart/form-data, autentica com Google Drive
// usando Service Account e faz upload na hierarquia correta de pastas.

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

// ─── JWT / Auth ───────────────────────────────────────────────────────────────

async function createServiceAccountJWT(
  email: string,
  privateKey: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: email,
    scope: "https://www.googleapis.com/auth/drive",
    aud: GOOGLE_TOKEN_URL,
    exp: now + 3600,
    iat: now,
  };

  const toBase64Url = (obj: object) =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  const headerB64 = toBase64Url(header);
  const payloadB64 = toBase64Url(payload);
  const signingInput = `${headerB64}.${payloadB64}`;

  // Limpa a chave PEM
  const pemKey = privateKey
    .replace(/-----BEGIN (RSA )?PRIVATE KEY-----/, "")
    .replace(/-----END (RSA )?PRIVATE KEY-----/, "")
    .replace(/\s/g, "");

  const binaryKey = Uint8Array.from(atob(pemKey), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBytes = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const signatureB64 = btoa(
    String.fromCharCode(...new Uint8Array(signatureBytes))
  )
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${signingInput}.${signatureB64}`;
}

async function getAccessToken(
  email: string,
  privateKey: string
): Promise<string> {
  const jwt = await createServiceAccountJWT(email, privateKey);

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Falha ao obter token: ${JSON.stringify(data)}`);
  return data.access_token as string;
}

// ─── Drive: Pasta ─────────────────────────────────────────────────────────────

async function findOrCreateFolder(
  token: string,
  name: string,
  parentId: string
): Promise<string> {
  const q = `name='${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;

  const searchRes = await fetch(
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id)&pageSize=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const searchData = await searchRes.json();

  if (searchData.files?.length > 0) return searchData.files[0].id as string;

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
  if (!createRes.ok)
    throw new Error(`Erro ao criar pasta: ${JSON.stringify(folder)}`);
  return folder.id as string;
}

// ─── Drive: Upload Multipart ──────────────────────────────────────────────────

async function uploadFileToDrive(
  token: string,
  file: File,
  folderId: string
): Promise<{ id: string; webViewLink: string }> {
  const boundary = `boundary_${crypto.randomUUID().replace(/-/g, "")}`;
  const metadata = JSON.stringify({ name: file.name, parents: [folderId] });
  const mimeType = file.type || "application/octet-stream";

  const fileBuffer = new Uint8Array(await file.arrayBuffer());

  const enc = new TextEncoder();
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
        "Content-Length": totalLength.toString(),
      },
      body,
    }
  );

  const result = await uploadRes.json();
  if (!uploadRes.ok)
    throw new Error(`Erro no upload: ${JSON.stringify(result)}`);
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
    const tipoDocumento = (formData.get("tipo_documento") as string) || "outros";

    if (!file) throw new Error("Nenhum arquivo enviado.");
    if (!casoId) throw new Error("caso_id é obrigatório.");

    // Credenciais via variáveis de ambiente do Supabase
    const email = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL");
    const rawKey = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");
    const rootFolderId = Deno.env.get("GOOGLE_DRIVE_ROOT_FOLDER_ID");

    if (!email || !rawKey || !rootFolderId) {
      throw new Error(
        "Variáveis de ambiente do Google Drive não configuradas."
      );
    }

    // \n literal → quebra de linha real (Supabase armazena como \\n)
    const privateKey = rawKey.replace(/\\n/g, "\n");

    const token = await getAccessToken(email, privateKey);

    // Hierarquia: Raiz / Cliente / Caso / TipoDocumento
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

    // Faz upload real
    const uploaded = await uploadFileToDrive(token, file, tipoFolder);

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
