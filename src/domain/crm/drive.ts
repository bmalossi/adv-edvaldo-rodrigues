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
