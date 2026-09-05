import { VisibilidadeRegistro, PapelUsuario } from './cliente';

export type TipoDemanda = 'judicial' | 'extrajudicial' | 'consultivo';

export type StatusCaso =
  | 'analise'
  | 'em_andamento'
  | 'aguardando_documentos'
  | 'concluido'
  | 'arquivado';

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
  papelUsuario: PapelUsuario,
  colaboradoresDelegadosIds: string[] = []
): boolean {
  // 1. Casos com visibilidade colegiada são acessíveis a toda a equipe
  if (caso.visibilidade === 'colegiado') {
    return true;
  }

  // 2. Se for privado:
  // - O responsável direto sempre acessa
  if (caso.responsavel_id === usuarioId) {
    return true;
  }

  // - Sócios advogados têm acesso de governança técnica da banca
  if (papelUsuario === 'advogado') {
    return true;
  }

  // - Colaboradores expressamente delegados ao caso têm acesso
  if (colaboradoresDelegadosIds.includes(usuarioId)) {
    return true;
  }

  return false;
}
