// ─── Tipos ───────────────────────────────────────────────────────────────────

export type TipoDocumentoCaso =
  | 'procuracao_contrato'
  | 'documento_pessoal'
  | 'prova_documental'
  | 'peca_processual'
  | 'decisao_sentenca'
  | 'outros';

export const TIPOS_DOCUMENTO_CASO: Record<TipoDocumentoCaso, { label: string; descricao: string }> = {
  procuracao_contrato: {
    label: 'Procuração & Contrato',
    descricao: 'Mandatos, contratos de honorários e declarações de hipossuficiência',
  },
  documento_pessoal: {
    label: 'Documentos Pessoais',
    descricao: 'RG, CNH, CPF, certidões de nascimento/casamento e comprovantes de residência',
  },
  prova_documental: {
    label: 'Provas Documentais',
    descricao: 'Extratos, notas fiscais, contratos com a parte adversa, recibos e prints',
  },
  peca_processual: {
    label: 'Peças Processuais',
    descricao: 'Petições iniciais, contestações, recursos e réplicas protocoladas',
  },
  decisao_sentenca: {
    label: 'Decisões & Sentenças',
    descricao: 'Despachos judiciais, liminares, acórdãos e sentenças proferidas',
  },
  outros: {
    label: 'Outros Documentos',
    descricao: 'Correspondências, relatórios periciais e arquivos diversos',
  },
};

export interface DocumentoCaso {
  id: string;
  caso_id: string;
  nome_arquivo: string;
  tipo_documento: TipoDocumentoCaso;
  tamanho_bytes?: number | null;
  mime_type?: string | null;
  google_drive_file_id?: string | null;
  google_drive_view_link?: string | null;
  criado_por?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentoCasoInput {
  caso_id: string;
  nome_arquivo: string;
  tipo_documento: TipoDocumentoCaso;
  tamanho_bytes?: number | null;
  mime_type?: string | null;
}

export interface HierarquiaDriveInput {
  clienteNome: string;
  clienteId: string;
  casoTitulo: string;
  casoId: string;
}

export interface HierarquiaDriveResultado {
  pastaCliente: string;
  pastaCaso: string;
  caminhoCompleto: string;
}

// ─── Sanitização de Nomes e Pastas ────────────────────────────────────────────

/**
 * Remove acentuação e caracteres impróprios para sistemas de arquivos e Google Drive
 */
function sanitizarNomePasta(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-zA-Z0-9\s_-]/g, '') // remove pontuações, barras e caracteres especiais
    .replace(/\s+/g, ' ') // agrupa espaços
    .trim();
}

/**
 * Formata o nome padronizado da pasta de um cliente: "{NomeSanitizado}_{ClienteID}"
 */
export function formatarNomePastaCliente(nome: string, clienteId: string): string {
  const limpo = sanitizarNomePasta(nome || 'Cliente');
  return `${limpo}_${clienteId}`;
}

/**
 * Formata o nome padronizado da pasta de um caso: "{TituloSanitizado}_{CasoID}"
 */
export function formatarNomePastaCaso(titulo: string, casoId: string): string {
  const limpo = sanitizarNomePasta(titulo || 'Caso');
  return `${limpo}_${casoId}`;
}

/**
 * Monta o caminho estruturado /{pastaCliente}/{pastaCaso}
 */
export function gerarCaminhoHierarquicoDrive(input: HierarquiaDriveInput): HierarquiaDriveResultado {
  const pastaCliente = formatarNomePastaCliente(input.clienteNome, input.clienteId);
  const pastaCaso = formatarNomePastaCaso(input.casoTitulo, input.casoId);
  return {
    pastaCliente,
    pastaCaso,
    caminhoCompleto: `${pastaCliente}/${pastaCaso}`,
  };
}

// ─── Validação de Documento do Caso ──────────────────────────────────────────

export function validarNovoDocumentoCaso(input: DocumentoCasoInput): { valido: boolean; erros: string[] } {
  const erros: string[] = [];

  if (!input.caso_id || input.caso_id.trim().length === 0) {
    erros.push('caso_id é obrigatório');
  }

  if (!input.nome_arquivo || input.nome_arquivo.trim().length === 0) {
    erros.push('nome do arquivo é obrigatório');
  }

  if (!input.tipo_documento || !(input.tipo_documento in TIPOS_DOCUMENTO_CASO)) {
    erros.push('tipo de documento inválido');
  }

  return {
    valido: erros.length === 0,
    erros,
  };
}

// ─── Tipos e Utilitários do Google Drive Explorer ─────────────────────────────

export interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  size?: number | null;
  webViewLink?: string | null;
  webContentLink?: string | null;
  createdTime?: string | null;
  modifiedTime?: string | null;
  iconLink?: string | null;
  isFolder: boolean;
}

export interface DriveBreadcrumb {
  id: string;
  name: string;
}

export interface DriveFolderContent {
  currentFolder: { id: string; name: string };
  breadcrumbs: DriveBreadcrumb[];
  folders: DriveItem[];
  files: DriveItem[];
}

export interface ScanClienteFolderMatch {
  folderId: string;
  folderName: string;
  areaName: string;
  matchedClienteId?: string;
  matchedClienteNome?: string;
  score: number;
  status: 'matched' | 'unmatched' | 'created';
}

export interface AreaScanSummary {
  areaName: string;
  areaFolderId: string;
  clientFoldersCount: number;
}

/**
 * Normaliza nomes de pessoas/empresas para cruzamento tolerante a variações,
 * removendo acentos, títulos jurídicos comuns (Dr., Dra., Espólio etc.) e pontuações.
 */
export function normalizarNomeComparacao(texto: string): string {
  if (!texto) return '';

  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .replace(/\b(dr|dra|doutor|doutora|sr|sra|senhor|senhora|espolio\s+de|herdeiros?\s+de|inventariante)\b\.?/gi, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOPWORDS_COMPARACAO = new Set([
  'de', 'da', 'do', 'das', 'dos', 'e', 'para', 'com', 'em', 'por', 'a', 'o',
  'processo', 'processos', 'pasta', 'pastas', 'acao', 'acoes', 'documento', 'documentos',
  'cliente', 'clientes', 'geral', 'comum', 'novo', 'nova'
]);

/**
 * Extrai somente dígitos de um texto para busca de CPF ou CNPJ
 */
export function extrairDigitos(texto: string): string {
  return (texto || '').replace(/\D/g, '');
}

/**
 * Compara o nome da pasta do Google Drive com a lista de clientes cadastrados no CRM
 * e pontua a melhor correspondência com proteção estrita contra colisões e falsos positivos.
 */
export function encontrarMelhorCorrespondenciaCliente(
  folderName: string,
  clientes: Array<{ id: string; nome_razao_social: string; cpf_cnpj?: string | null }>
): { clienteId?: string; clienteNome?: string; score: number } {
  if (!folderName || !clientes || clientes.length === 0) {
    return { score: 0 };
  }

  const digitsInFolder = extrairDigitos(folderName);
  const normFolder = normalizarNomeComparacao(folderName);
  if (!normFolder) return { score: 0 };

  const tokensFolder = normFolder.split(' ').filter((t) => t.length > 2 && !STOPWORDS_COMPARACAO.has(t));

  let bestMatch: { clienteId?: string; clienteNome?: string; score: number } = { score: 0 };

  for (const c of clientes) {
    // 1. Busca por CPF/CNPJ no nome da pasta (precisão máxima)
    const digitsInCpf = extrairDigitos(c.cpf_cnpj || '');
    if (digitsInCpf.length >= 11 && digitsInFolder.includes(digitsInCpf)) {
      return { clienteId: c.id, clienteNome: c.nome_razao_social, score: 1.0 };
    }

    const normCliente = normalizarNomeComparacao(c.nome_razao_social);
    if (!normCliente) continue;

    // 2. Correspondência exata após normalização
    if (normFolder === normCliente) {
      return { clienteId: c.id, clienteNome: c.nome_razao_social, score: 0.95 };
    }

    const tokensCliente = normCliente.split(' ').filter((t) => t.length > 2 && !STOPWORDS_COMPARACAO.has(t));

    // 3. Contém nome completo do cliente dentro do nome da pasta (ex: "Dr. Ivan Teodoro Damasceno - Inventário")
    if (normFolder.includes(normCliente) && normCliente.length >= 6) {
      const score = 0.88;
      if (score > bestMatch.score) {
        bestMatch = { clienteId: c.id, clienteNome: c.nome_razao_social, score };
      }
      continue;
    }

    // 3b. Contém nome da pasta no nome do cliente (apenas se a pasta tiver 2+ termos e >= 8 caracteres)
    if (tokensFolder.length >= 2 && normFolder.length >= 8 && normCliente.includes(normFolder)) {
      const score = 0.80;
      if (score > bestMatch.score) {
        bestMatch = { clienteId: c.id, clienteNome: c.nome_razao_social, score };
      }
      continue;
    }

    // 4. Correspondência de múltiplos termos significativos (exige >= 2 termos coincidentes)
    if (tokensFolder.length >= 2 && tokensCliente.length >= 2) {
      let hits = 0;
      for (const tf of tokensFolder) {
        if (tokensCliente.includes(tf)) hits++;
      }
      if (hits >= 2) {
        const ratio = hits / Math.max(tokensFolder.length, tokensCliente.length);
        if (ratio >= 0.6) {
          const score = parseFloat((ratio * 0.8).toFixed(2));
          if (score > bestMatch.score) {
            bestMatch = { clienteId: c.id, clienteNome: c.nome_razao_social, score };
          }
        }
      }
    }
  }

  return bestMatch;
}


/**
 * Sanitiza o nome de uma categoria para criação de subpasta no Google Drive.
 * Converte barras e caracteres proibidos em conectivos seguros e remove espaços extras.
 */
export function sanitizarNomeCategoriaDrive(categoria?: string | null): string {
  if (!categoria || !categoria.trim()) {
    return 'Geral';
  }

  let limpo = categoria.trim();
  // Substitui barras e pipes por ' & '
  limpo = limpo.replace(/[/\\|]/g, ' & ');
  // Remove caracteres proibidos no Google Drive e sistemas de arquivos (* ? : " < >)
  limpo = limpo.replace(/[*?:"<>]/g, '');
  // Normaliza espaços múltiplos
  limpo = limpo.replace(/\s+/g, ' ').trim();

  return limpo || 'Geral';
}

/**
 * Localiza uma subpasta existente por categoria de forma insensível a maiúsculas/minúsculas e acentos.
 */
export function encontrarSubpastaPorCategoria(
  folders: Array<{ id: string; name: string }>,
  categoria: string
): { id: string; name: string } | null {
  if (!folders || folders.length === 0 || !categoria) {
    return null;
  }

  const catSanitizada = sanitizarNomeCategoriaDrive(categoria);
  const catNorm = normalizarNomeComparacao(catSanitizada);

  for (const f of folders) {
    const folderNorm = normalizarNomeComparacao(f.name);
    if (folderNorm === catNorm) {
      return f;
    }
  }

  return null;
}
