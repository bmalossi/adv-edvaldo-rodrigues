export type PapelUsuario = 'advogado' | 'estagiario' | 'secretaria';

export type StatusCicloCliente = 'lead' | 'consulta' | 'ativo' | 'encerrado';

export type TipoPessoa = 'PF' | 'PJ';

export type VisibilidadeRegistro = 'colegiado' | 'privado';

export interface PerfilUsuario {
  id: string;
  nome: string;
  email: string;
  papel: PapelUsuario;
  oab: string | null;
  telefone: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Cliente {
  id: string;
  tipo_pessoa: TipoPessoa;
  nome_razao_social: string;
  nome_fantasia?: string | null;
  cpf_cnpj?: string | null;
  rg_ie?: string | null;
  nacionalidade?: string | null;
  estado_civil?: string | null;
  profissao?: string | null;
  email?: string | null;
  telefone_whatsapp: string;
  endereco_logradouro?: string | null;
  endereco_numero?: string | null;
  endereco_complemento?: string | null;
  endereco_bairro?: string | null;
  endereco_cidade?: string | null;
  endereco_uf?: string | null;
  endereco_cep?: string | null;
  status_ciclo: StatusCicloCliente;
  origem_contato?: string | null;
  observacoes_iniciais?: string | null;
  visibilidade: VisibilidadeRegistro;
  responsavel_id?: string | null;
  google_drive_folder_id?: string | null;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ResultadoValidacao {
  valido: boolean;
  erros: string[];
}

export interface ResultadoTransicao {
  permitido: boolean;
  erros: string[];
}

export function validarQualificacaoJuridica(
  cliente: Partial<Cliente>,
  statusDestino: StatusCicloCliente
): ResultadoValidacao {
  const erros: string[] = [];

  // Se o destino for 'lead' ou 'consulta', apenas dados de contato básicos são requeridos
  if (statusDestino === 'lead' || statusDestino === 'consulta') {
    if (!cliente.nome_razao_social?.trim()) {
      erros.push('Nome ou Razão Social é obrigatório');
    }
    if (!cliente.telefone_whatsapp?.trim()) {
      erros.push('Telefone / WhatsApp é obrigatório');
    }
    return { valido: erros.length === 0, erros };
  }

  // Se o status for 'ativo' (contrato assinado ou demanda iniciada), exige qualificação jurídica completa
  if (cliente.tipo_pessoa === 'PF') {
    if (!cliente.cpf_cnpj?.trim()) {
      erros.push('CPF é obrigatório para qualificação de Pessoa Física');
    }
    if (!cliente.rg_ie?.trim()) {
      erros.push('RG é obrigatório para qualificação de Pessoa Física');
    }
    if (!cliente.nacionalidade?.trim()) {
      erros.push('Nacionalidade é obrigatória para qualificação');
    }
    if (!cliente.estado_civil?.trim()) {
      erros.push('Estado civil é obrigatório para qualificação');
    }
    if (!cliente.profissao?.trim()) {
      erros.push('Profissão é obrigatória para qualificação');
    }
  } else if (cliente.tipo_pessoa === 'PJ') {
    if (!cliente.cpf_cnpj?.trim()) {
      erros.push('CNPJ é obrigatório para qualificação de Pessoa Jurídica');
    }
  }

  // Endereço completo obrigatório para qualificação em procurações/contratos
  const enderecoIncompleto =
    !cliente.endereco_logradouro?.trim() ||
    !cliente.endereco_numero?.trim() ||
    !cliente.endereco_cidade?.trim() ||
    !cliente.endereco_uf?.trim();

  if (enderecoIncompleto) {
    erros.push('Endereço completo é obrigatório para qualificação');
  }

  return { valido: erros.length === 0, erros };
}

export function podeTransicionarCiclo(
  cliente: Partial<Cliente>,
  novoStatus: StatusCicloCliente
): ResultadoTransicao {
  if (novoStatus === 'ativo') {
    const validacao = validarQualificacaoJuridica(cliente, 'ativo');
    return {
      permitido: validacao.valido,
      erros: validacao.erros,
    };
  }

  return { permitido: true, erros: [] };
}
