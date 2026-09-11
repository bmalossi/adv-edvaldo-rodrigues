// Edge Function: google-drive-explorer
// Gerencia a navegação em pastas, varredura de "Processos por área",
// criação de subpastas e upload de documentos no Google Drive via OAuth2.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

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
      "Credenciais do Google Drive não configuradas no ambiente (GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN)."
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
    throw new Error(`Falha ao renovar token do Google Drive: ${JSON.stringify(data)}`);
  }
  return data.access_token as string;
}

// ─── Listar Conteúdo de uma Pasta ────────────────────────────────────────────

async function listarConteudoPasta(token: string, folderId: string) {
  // 1. Obter metadados da pasta atual
  let currentFolderName = "Pasta";
  let currentFolderViewLink = `https://drive.google.com/drive/folders/${folderId}`;

  try {
    const folderRes = await fetch(
      `${DRIVE_API}/files/${folderId}?fields=id,name,webViewLink`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (folderRes.ok) {
      const folderData = await folderRes.json();
      currentFolderName = folderData.name || "Pasta";
      currentFolderViewLink = folderData.webViewLink || currentFolderViewLink;
    }
  } catch (err) {
    console.warn("Erro ao buscar metadados da pasta:", err);
  }

  // 2. Listar itens dentro da pasta
  const q = `'${folderId}' in parents and trashed=false`;
  const listRes = await fetch(
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,size,webViewLink,webContentLink,createdTime,modifiedTime,iconLink)&orderBy=folder,name&pageSize=1000`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const listData = await listRes.json();
  if (!listRes.ok) {
    throw new Error(`Erro ao listar arquivos do Drive: ${JSON.stringify(listData)}`);
  }

  const items = listData.files || [];
  const folders = items
    .filter((it: any) => it.mimeType === "application/vnd.google-apps.folder")
    .map((f: any) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      webViewLink: f.webViewLink || `https://drive.google.com/drive/folders/${f.id}`,
      modifiedTime: f.modifiedTime,
      isFolder: true,
    }));

  const files = items
    .filter((it: any) => it.mimeType !== "application/vnd.google-apps.folder")
    .map((f: any) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      size: f.size ? parseInt(f.size, 10) : null,
      webViewLink: f.webViewLink,
      webContentLink: f.webContentLink,
      createdTime: f.createdTime,
      modifiedTime: f.modifiedTime,
      iconLink: f.iconLink,
      isFolder: false,
    }));

  return {
    currentFolder: {
      id: folderId,
      name: currentFolderName,
      webViewLink: currentFolderViewLink,
    },
    folders,
    files,
  };
}

// ─── Criar Subpasta ──────────────────────────────────────────────────────────

async function criarSubpasta(token: string, parentFolderId: string, nomePasta: string) {
  const createRes = await fetch(`${DRIVE_API}/files`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: nomePasta,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    }),
  });

  const folder = await createRes.json();
  if (!createRes.ok) {
    throw new Error(`Erro ao criar pasta "${nomePasta}": ${JSON.stringify(folder)}`);
  }

  return {
    id: folder.id,
    name: folder.name || nomePasta,
    webViewLink: folder.webViewLink || `https://drive.google.com/drive/folders/${folder.id}`,
    isFolder: true,
  };
}

// ─── Upload de Arquivo Direto ────────────────────────────────────────────────

async function uploadArquivo(token: string, folderId: string, file: File, nomePersonalizado?: string) {
  const fileName = nomePersonalizado || file.name || "arquivo";
  const mimeType = file.type || "application/octet-stream";
  const boundary = `boundary_${crypto.randomUUID().replace(/-/g, "")}`;
  const metadata = JSON.stringify({ name: fileName, parents: [folderId] });

  const enc = new TextEncoder();
  const fileBuffer = new Uint8Array(await file.arrayBuffer());

  const parts = [
    enc.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`),
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
    `${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id,name,size,mimeType,webViewLink,webContentLink,modifiedTime`,
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

  return {
    id: result.id,
    name: result.name,
    mimeType: result.mimeType,
    size: result.size ? parseInt(result.size, 10) : null,
    webViewLink: result.webViewLink,
    webContentLink: result.webContentLink,
    modifiedTime: result.modifiedTime,
    isFolder: false,
  };
}

// ─── Escanear "Processos por área" ───────────────────────────────────────────

async function escanearProcessosPorArea(token: string, rootFolderId: string) {
  // 1. Nível 1: Buscar pastas de Áreas (ex.: INVENTARIO, TRABALHISTA, CIVIL)
  const qAreas = `'${rootFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const areasRes = await fetch(
    `${DRIVE_API}/files?q=${encodeURIComponent(qAreas)}&fields=files(id,name)&pageSize=100&orderBy=name`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const areasData = await areasRes.json();
  if (!areasRes.ok) {
    throw new Error(`Erro ao acessar pasta raiz: ${JSON.stringify(areasData)}`);
  }

  const areasList = areasData.files || [];
  const areasComClientes: any[] = [];
  let totalPastasClientes = 0;

  // 2. Nível 2: Para cada área, buscar pastas de Clientes
  for (const area of areasList) {
    const qClientes = `'${area.id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const clientesRes = await fetch(
      `${DRIVE_API}/files?q=${encodeURIComponent(qClientes)}&fields=files(id,name,webViewLink,modifiedTime)&pageSize=1000&orderBy=name`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const clientesData = await clientesRes.json();
    const clientFolders = (clientesData.files || []).map((cf: any) => ({
      folderId: cf.id,
      folderName: cf.name,
      areaName: area.name,
      webViewLink: cf.webViewLink,
      modifiedTime: cf.modifiedTime,
    }));

    totalPastasClientes += clientFolders.length;

    areasComClientes.push({
      areaName: area.name,
      areaFolderId: area.id,
      clientFolders,
    });
  }

  return {
    areas: areasComClientes,
    totalAreas: areasList.length,
    totalPastasClientes,
  };
}

// ─── Servidor Principal ──────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const contentType = req.headers.get("content-type") || "";

    // 1. Requisição com FormData (Upload de arquivo)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const action = formData.get("action") as string;

      if (action === "upload_arquivo") {
        const file = formData.get("file") as File | null;
        const folderId = formData.get("folder_id") as string;
        const nomePersonalizado = (formData.get("nome_arquivo") as string) || undefined;

        if (!file) throw new Error("Nenhum arquivo enviado.");
        if (!folderId) throw new Error("folder_id é obrigatório.");

        const token = await getAccessToken();
        const uploaded = await uploadArquivo(token, folderId, file, nomePersonalizado);

        return new Response(JSON.stringify(uploaded), {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
    }

    // 2. Requisição JSON
    const body = await req.json();
    const { action } = body;

    const token = await getAccessToken();

    if (action === "listar_conteudo") {
      const folderId = body.folder_id;
      if (!folderId) throw new Error("folder_id é obrigatório para listar conteúdo.");

      const result = await listarConteudoPasta(token, folderId);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    if (action === "criar_pasta") {
      const parentFolderId = body.parent_folder_id;
      const nomePasta = (body.nome_pasta || "").trim();

      if (!parentFolderId) throw new Error("parent_folder_id é obrigatório.");
      if (!nomePasta) throw new Error("nome_pasta é obrigatório.");

      const result = await criarSubpasta(token, parentFolderId, nomePasta);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    if (action === "escanear_processos_por_area") {
      const rootFolderId =
        body.root_folder_id || Deno.env.get("GOOGLE_DRIVE_ROOT_FOLDER_ID");

      if (!rootFolderId) {
        throw new Error(
          "ID da pasta raiz 'Processos por área' não informado nem configurado em GOOGLE_DRIVE_ROOT_FOLDER_ID."
        );
      }

      const result = await escanearProcessosPorArea(token, rootFolderId);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Ação "${action}" não reconhecida.`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[google-drive-explorer]", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
