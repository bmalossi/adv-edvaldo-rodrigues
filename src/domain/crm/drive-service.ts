import { supabase } from "@/lib/supabase";
import {
  DriveFolderContent,
  DriveItem,
  sanitizarNomeCategoriaDrive,
  encontrarSubpastaPorCategoria,
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
 * Obtém a pasta raiz de processos do Google Drive configurada no CRM ou no ambiente
 */
export async function obterPastaRaizProcessosDrive(): Promise<string> {
  // 1. LocalStorage (salvo anteriormente pelo operador)
  try {
    const localRoot = localStorage.getItem("erf_drive_root_area_id");
    if (localRoot && localRoot.trim()) return localRoot.trim();
  } catch {}

  // 2. Configurações de backup/drive no Supabase
  try {
    const { data } = await supabase
      .from("configuracoes_backup_drive")
      .select("google_drive_folder_id")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data?.google_drive_folder_id && data.google_drive_folder_id.trim()) {
      return data.google_drive_folder_id.trim();
    }
  } catch (err) {
    console.warn("Aviso ao buscar pasta raiz de backup:", err);
  }

  // 3. Fallback: "root" (raiz padrão do Google Drive)
  return "root";
}

/**
 * Verifica se uma pasta do Google Drive ainda existe e é acessível pela conta configurada.
 * Retorna true se acessível, false se o Drive retornar 404/403.
 */
async function verificarPastaExisteDrive(folderId: string): Promise<boolean> {
  try {
    await buscarConteudoPastaDrive(folderId);
    return true;
  } catch (err: any) {
    const msg: string = err?.message ?? "";
    // 404 = pasta deletada; 403 = sem acesso — ambos devem forçar recriação
    if (msg.includes("404") || msg.includes("notFound") || msg.includes("403")) {
      return false;
    }
    // Outros erros (rede, auth) propagam para cima
    throw err;
  }
}

/**
 * Obtém a pasta existente do cliente ou cria uma nova na raiz de processos do Google Drive,
 * persistindo o vínculo na tabela clientes do Supabase.
 * Se o folder_id gravado no banco não for mais acessível no Drive (404/403),
 * limpa o vínculo e cria uma nova pasta automaticamente.
 */
export async function obterOuCriarPastaClienteDrive(
  clienteId: string,
  nomeCliente: string,
  googleDriveFolderIdExistente?: string | null
): Promise<string> {
  // 1. Candidato a partir do parâmetro ou do banco
  let candidatoId = googleDriveFolderIdExistente?.trim() || null;

  if (!candidatoId) {
    // Consulta banco se não veio pelo parâmetro
    const { data: cliente, error: cliError } = await supabase
      .from("clientes")
      .select("id, nome_razao_social, google_drive_folder_id")
      .eq("id", clienteId)
      .single();

    if (cliError) {
      throw new Error(`Erro ao consultar dados do cliente: ${cliError.message}`);
    }

    candidatoId = cliente?.google_drive_folder_id?.trim() || null;

    if (!candidatoId) {
      // Não tem pasta cadastrada: cria uma nova
      const nomePasta = (nomeCliente || cliente?.nome_razao_social || "Cliente Sem Nome").trim();
      const rootFolderId = await obterPastaRaizProcessosDrive();
      const pastaCriada = await criarSubpastaDrive(rootFolderId, nomePasta);
      if (!pastaCriada?.id) {
        throw new Error(`Falha ao obter ID da pasta criada para o cliente "${nomePasta}".`);
      }
      await vincularPastaClienteCRM(clienteId, pastaCriada.id);
      return pastaCriada.id;
    }
  }

  // 2. Verifica se o candidato ainda existe no Drive
  const existe = await verificarPastaExisteDrive(candidatoId);
  if (existe) {
    return candidatoId;
  }

  // 3. Pasta não encontrada: limpa o vínculo antigo e recria
  console.warn(
    `[obterOuCriarPastaClienteDrive] Pasta "${candidatoId}" não encontrada no Drive (404/403). Recriando e atualizando vínculo no CRM.`
  );

  // Busca nome do cliente para nomear a pasta
  const { data: clienteDb } = await supabase
    .from("clientes")
    .select("nome_razao_social")
    .eq("id", clienteId)
    .single();

  const nomePasta = (nomeCliente || clienteDb?.nome_razao_social || "Cliente Sem Nome").trim();
  const rootFolderId = await obterPastaRaizProcessosDrive();
  const pastaCriada = await criarSubpastaDrive(rootFolderId, nomePasta);
  if (!pastaCriada?.id) {
    throw new Error(`Falha ao recriar pasta para o cliente "${nomePasta}".`);
  }

  await vincularPastaClienteCRM(clienteId, pastaCriada.id);
  return pastaCriada.id;
}

/**
 * Localiza ou cria de forma idempotente uma subpasta por categoria (ex.: Criminal, Previdenciário)
 * dentro da pasta pai do cliente no Google Drive.
 */
export async function obterOuCriarSubpastaCategoria(
  parentFolderId: string,
  categoria: string
): Promise<{ id: string; name: string }> {
  const nomeCategoriaSanitizada = sanitizarNomeCategoriaDrive(categoria);

  // 1. Busca conteúdo atual da pasta pai
  const conteudo = await buscarConteudoPastaDrive(parentFolderId);
  const subpastaExistente = encontrarSubpastaPorCategoria(
    conteudo.folders,
    nomeCategoriaSanitizada
  );

  if (subpastaExistente) {
    return subpastaExistente;
  }

  // 2. Se não existir, cria a nova subpasta
  const novaSubpasta = await criarSubpastaDrive(
    parentFolderId,
    nomeCategoriaSanitizada
  );

  return {
    id: novaSubpasta.id,
    name: novaSubpasta.name || nomeCategoriaSanitizada,
  };
}

/**
 * Orquestra o salvamento e arquivamento de um documento PDF gerado na subpasta temática do cliente no Google Drive
 */
export async function salvarDocumentoGeradoNoDrive(params: {
  clienteId: string;
  nomeCliente: string;
  googleDriveFolderId?: string | null;
  categoria: string;
  pdfBlob: Blob;
  nomeArquivo: string;
}): Promise<{ fileId: string; folderId: string; subpastaId: string }> {
  const { clienteId, nomeCliente, googleDriveFolderId, categoria, pdfBlob, nomeArquivo } = params;

  // 1. Garante a pasta principal do cliente
  const clientFolderId = await obterOuCriarPastaClienteDrive(
    clienteId,
    nomeCliente,
    googleDriveFolderId
  );

  // 2. Garante a subpasta da categoria
  const subpasta = await obterOuCriarSubpastaCategoria(clientFolderId, categoria);

  // 3. Converte Blob em File se necessário e faz upload
  const file = new File([pdfBlob], nomeArquivo, { type: "application/pdf" });
  const uploaded = await uploadArquivoDrive(subpasta.id, file, nomeArquivo);

  return {
    fileId: uploaded.id,
    folderId: clientFolderId,
    subpastaId: subpasta.id,
  };
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
