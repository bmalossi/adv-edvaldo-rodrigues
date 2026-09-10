import { PapelUsuario } from './cliente';

export type TipoHonorario = 'fixo' | 'exito' | 'misto' | 'mensal';

export interface ContratoFinanceiro {
  id: string;
  caso_id: string;
  tipo_honorario: TipoHonorario;
  valor_total?: number | null;
  valor_entrada?: number | null;
  numero_parcelas: number;
  percentual_exito?: number | null;
  condicoes_pagamento?: string | null;
  dados_bancarios?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const TIPOS_HONORARIO_CONFIG: Record<
  TipoHonorario,
  { label: string; descricao: string }
> = {
  fixo: {
    label: 'Valor Fixo (Pró-labore)',
    descricao: 'Valor determinado parcelado ou à vista na contratação',
  },
  exito: {
    label: 'Quota-Litis (Êxito)',
    descricao: 'Percentual incidente sobre o proveito econômico obtido',
  },
  misto: {
    label: 'Misto (Fixo + Êxito)',
    descricao: 'Entrada/parcelas fixas acrescidas de percentual de êxito final',
  },
  mensal: {
    label: 'Partido Mensal (Assessoria)',
    descricao: 'Honorários advocatícios recorrentes mensais',
  },
};

export function validarContratoFinanceiro(
  contrato: Partial<ContratoFinanceiro>
): {
  valido: boolean;
  erros: string[];
} {
  const erros: string[] = [];

  if (!contrato.caso_id) {
    erros.push('O contrato financeiro precisa estar vinculado a um caso');
  }

  if (!contrato.tipo_honorario) {
    erros.push('O tipo de honorário é obrigatório');
  }

  if (
    (contrato.tipo_honorario === 'exito' || contrato.tipo_honorario === 'misto') &&
    (contrato.percentual_exito === undefined || contrato.percentual_exito === null)
  ) {
    erros.push('Percentual de êxito é obrigatório para honorários no êxito ou mistos');
  }

  return {
    valido: erros.length === 0,
    erros,
  };
}

export function podeVisualizarHonorarios(papel?: string | null): boolean {
  if (!papel) return false;
  const p = papel.toLowerCase().trim();
  // Advogados e administradores têm autorização de acesso e visualização a dados pecuniários e honorários
  return p === 'advogado' || p === 'admin' || p === 'administrador' || p.includes('admin');
}
