import { VisibilidadeRegistro, PapelUsuario } from './cliente';
import { FaseFunil } from './etapa-funil';

export type TipoDemanda = 'judicial' | 'extrajudicial' | 'consultivo';

export type StatusCaso =
  | 'analise'
  | 'em_andamento'
  | 'aguardando_documentos'
  | 'concluido'
  | 'arquivado';

export type ResultadoCaso =
  | 'procedente'
  | 'improcedente'
  | 'parcialmente_procedente'
  | 'acordo'
  | 'desistencia'
  | 'extincao_sem_resolucao'
  | 'outro';

export interface Caso {
  id: string;
  cliente_id: string;
  cliente_nome?: string;
  titulo: string;
  descricao?: string | null;
  area_direito: string;
  tipo_demanda: TipoDemanda;
  status: StatusCaso;
  visibilidade: VisibilidadeRegistro;
  responsavel_id: string;
  responsavel_nome?: string;
  google_drive_folder_id?: string | null;

  // Funil processual
  fase_funil: FaseFunil;
  etapa_id?: string | null;
  etapa_nome?: string | null; // join via etapas_funil

  // Campos críticos de datas
  data_prazo?: string | null;
  data_audiencia?: string | null;
  data_fechamento?: string | null;
  data_transito_julgado?: string | null;

  // Resultado e valor
  resultado_final?: ResultadoCaso | null;
  valor_causa?: number | null;
  numero_processo?: string | null;

  // Campos complementares do processo
  numero_protocolo?: string | null;
  processo_originario?: string | null;
  identificacao_pasta?: string | null;
  data_requerimento?: string | null;

  // Compartilhamento pontual
  compartilhado_com?: string[];

  created_at?: string;
  updated_at?: string;
}

export interface CasoColaborador {
  id: string;
  caso_id: string;
  perfil_id: string;
  permissao: 'leitor' | 'editor';
}

export const AREAS_DIREITO_PADRAO = [
  'Trabalhista',
  'Cível e Contratos',
  'Direito de Família e Sucessões',
  'Previdenciário',
  'Direito do Consumidor',
  'Empresarial e Societário',
  'Direito Imobiliário',
  'Tributário',
  'Outros',
];

export const RESULTADO_LABELS: Record<ResultadoCaso, string> = {
  procedente: 'Procedente',
  improcedente: 'Improcedente',
  parcialmente_procedente: 'Parcialmente procedente',
  acordo: 'Acordo',
  desistencia: 'Desistência',
  extincao_sem_resolucao: 'Extinção sem resolução',
  outro: 'Outro',
};

export function validarNovoCaso(caso: Partial<Caso>): {
  valido: boolean;
  erros: string[];
} {
  const erros: string[] = [];

  if (!caso.cliente_id) {
    erros.push('O caso precisa estar vinculado a um cliente');
  }

  if (!caso.titulo || !caso.titulo.trim()) {
    erros.push('O título do caso é obrigatório');
  }

  if (!caso.area_direito || !caso.area_direito.trim()) {
    erros.push('A área do direito é obrigatória');
  }

  return {
    valido: erros.length === 0,
    erros,
  };
}

export function podeAcessarCaso(
  caso: Caso,
  usuarioId: string,
  papelUsuario?: string,
  colaboradoresDelegadosIds: string[] = [],
  roleNome?: string,
  escopo?: 'individual' | 'geral'
): boolean {
  // 1. Administrador do escritório ou perfil com escopo geral tem acesso a todos os casos
  if (
    roleNome === 'Administrador' ||
    papelUsuario === 'Administrador' ||
    papelUsuario === 'admin' ||
    escopo === 'geral'
  ) {
    return true;
  }

  // 2. O responsável direto sempre acessa
  if (caso.responsavel_id === usuarioId) {
    return true;
  }

  // 3. Compartilhamento pontual: usuário na lista compartilhado_com
  if (caso.compartilhado_com?.includes(usuarioId)) {
    return true;
  }

  // 4. Colaboradores expressamente delegados ao caso têm acesso
  if (colaboradoresDelegadosIds.includes(usuarioId)) {
    return true;
  }

  return false;
}
