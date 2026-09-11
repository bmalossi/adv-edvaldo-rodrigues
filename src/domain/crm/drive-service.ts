import { supabase } from "@/lib/supabase";
import {
  DriveFolderContent,
  DriveItem,
  encontrarMelhorCorrespondenciaCliente,
  ScanClienteFolderMatch,
  AreaScanSummary,
} from "./drive";

/**
 * Invoca a Edge Function google-drive-explorer garantindo cabeçalhos e autenticação
 */
async function invocarExplorer(body: any): Promise<any> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-drive-explorer`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Erro ao comunicar com o Google Drive.");
  }
  return data;
}

/**
 * Busca todo o conteúdo (subpastas e arquivos) de uma pasta do Google Drive
 */
export async function buscarConteudoPastaDrive(
  folderId: string
): Promise<DriveFolderContent> {
  const res = await invocarExplorer({
    action: "listar_conteudo",
    folder_id: folderId,
  });

  return {
    currentFolder: res.currentFolder,
    breadcrumbs: [], // gerenciado no estado do componente de navegação
    folders: res.folders || [],
    files: res.files || [],
  };
}

/**
 * Cria uma nova subpasta dentro de uma pasta no Google Drive
 */
export async function criarSubpastaDrive(
  parentFolderId: string,
  nomePasta: string
): Promise<DriveItem> {
  return await invocarExplorer({
    action: "criar_pasta",
    parent_folder_id: parentFolderId,
    nome_pasta: nomePasta,
  });
}

/**
 * Faz upload de um arquivo para uma pasta específica do Google Drive
 */
export async function uploadArquivoDrive(
  folderId: string,
  file: File,
  nomePersonalizado?: string
): Promise<DriveItem> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  const formData = new FormData();
  formData.append("action", "upload_arquivo");
  formData.append("folder_id", folderId);
  formData.append("file", file);
  if (nomePersonalizado) {
    formData.append("nome_arquivo", nomePersonalizado);
  }

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-drive-explorer`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: formData,
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Erro ao realizar upload para o Google Drive.");
  }
  return data as DriveItem;
}

/**
 * Varre a pasta principal "Processos por área", identificando Áreas e Pastas de Clientes
 */
export async function escanearProcessosPorAreaDrive(rootFolderId?: string): Promise<{
  areas: Array<{
    areaName: string;
    areaFolderId: string;
    clientFolders: Array<{
      folderId: string;
      folderName: string;
      areaName: string;
      webViewLink?: string;
      modifiedTime?: string;
    }>;
  }>;
  totalAreas: number;
  totalPastasClientes: number;
}> {
  return await invocarExplorer({
    action: "escanear_processos_por_area",
    root_folder_id: rootFolderId || undefined,
  });
}

/**
 * Salva o ID da pasta do Google Drive no cadastro de um cliente
 */
export async function vincularPastaClienteCRM(
  clienteId: string,
  googleDriveFolderId: string
): Promise<void> {
  const { error } = await supabase
    .from("clientes")
    .update({ google_drive_folder_id: googleDriveFolderId })
    .eq("id", clienteId);

  if (error) {
    throw new Error(`Erro ao salvar pasta no cliente: ${error.message}`);
  }
}

/**
 * Salva o ID da pasta do Google Drive no cadastro de um caso
 */
export async function vincularPastaCasoCRM(
  casoId: string,
  googleDriveFolderId: string
): Promise<void> {
  const { error } = await supabase
    .from("casos")
    .update({ google_drive_folder_id: googleDriveFolderId })
    .eq("id", casoId);

  if (error) {
    throw new Error(`Erro ao salvar pasta no caso: ${error.message}`);
  }
}

/**
 * Cadastra automaticamente um cliente novo no CRM a partir do nome da pasta do Drive
 */
export async function cadastrarClienteAPartirDePasta(
  folderName: string,
  folderId: string,
  areaName?: string,
  userId?: string
): Promise<{ id: string; nome: string }> {
  const nomeLimpo = folderName.trim();

  const { data, error } = await supabase
    .from("clientes")
    .insert({
      tipo_pessoa: "PF",
      nome_razao_social: nomeLimpo,
      telefone_whatsapp: "",
      google_drive_folder_id: folderId,
      criado_por: userId || null,
      anotacoes_gerais: areaName
        ? `Importado automaticamente da pasta do Google Drive (Área: ${areaName}).`
        : "Importado automaticamente da pasta do Google Drive.",
    })
    .select("id, nome_razao_social")
    .single();

  if (error) {
    throw new Error(`Erro ao criar cliente para "${folderName}": ${error.message}`);
  }

  return { id: data.id, nome: data.nome_razao_social };
}
