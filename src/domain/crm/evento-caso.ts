export type TipoEvento =
  | 'prazo'
  | 'audiencia'
  | 'movimentacao'
  | 'documento'
  | 'nota';

export interface EventoCaso {
  id: string;
  caso_id: string;
  tipo: TipoEvento;
  descricao: string;
  data_evento: string;
  criado_por?: string | null;
  created_at?: string;
}

export interface PendenciasCaso {
  prazosVencendo: number;  // data_prazo <= hoje + 3 dias
  documentosPendentes: number;
  compromissosSemConfirmacao: number;
  total: number;
}

const DIAS_ALERTA_PRAZO = 3;

export function calcularPendencias(
  dataPrazo: string | null | undefined,
  eventosAbertos: EventoCaso[],
  compromissosPendentes: number
): PendenciasCaso {
  let prazosVencendo = 0;

  if (dataPrazo) {
    const prazo = new Date(dataPrazo);
    const hoje = new Date();
    const diffMs = prazo.getTime() - hoje.getTime();
    const diffDias = diffMs / (1000 * 60 * 60 * 24);
    if (diffDias <= DIAS_ALERTA_PRAZO) {
      prazosVencendo = 1;
    }
  }

  const documentosPendentes = eventosAbertos.filter(
    (e) => e.tipo === 'documento'
  ).length;

  const total = prazosVencendo + documentosPendentes + compromissosPendentes;

  return {
    prazosVencendo,
    documentosPendentes,
    compromissosSemConfirmacao: compromissosPendentes,
    total,
  };
}

const ICONES_TIPO: Record<TipoEvento, string> = {
  prazo: '⏰',
  audiencia: '🏛️',
  movimentacao: '🔄',
  documento: '📄',
  nota: '📝',
};

const LABELS_TIPO: Record<TipoEvento, string> = {
  prazo: 'Prazo',
  audiencia: 'Audiência',
  movimentacao: 'Movimentação',
  documento: 'Documento',
  nota: 'Nota',
};

export function formatarEventoParaLinha(evento: EventoCaso): {
  icone: string;
  label: string;
  descricao: string;
  data: string;
} {
  const data = new Date(evento.data_evento).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    icone: ICONES_TIPO[evento.tipo],
    label: LABELS_TIPO[evento.tipo],
    descricao: evento.descricao,
    data,
  };
}

export const RESULTADO_LABELS: Record<string, string> = {
  procedente: 'Procedente',
  improcedente: 'Improcedente',
  parcialmente_procedente: 'Parcialmente procedente',
  acordo: 'Acordo',
  desistencia: 'Desistência',
  extincao_sem_resolucao: 'Extinção sem resolução',
  outro: 'Outro',
};
