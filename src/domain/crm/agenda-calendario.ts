import type { PendenciaCRM } from './agenda';

export interface DiaCalendario {
  ano: number;
  mes: number; // 0-indexed (0 = Jan, 11 = Dez)
  dia: number;
  dataChave: string; // 'YYYY-MM-DD'
  diaSemana: number; // 0 = Domingo, 6 = Sábado
  pertenceAoMesAtual: boolean;
  eHoje: boolean;
}

export type StatusVisualEvento = 'pendente' | 'concluido' | 'atrasado';

export function formatarDataChave(ano: number, mes: number, dia: number): string {
  const m = (mes + 1).toString().padStart(2, '0');
  const d = dia.toString().padStart(2, '0');
  return `${ano}-${m}-${d}`;
}

/**
 * Gera a grade do mês (semanas completas de domingo a sábado)
 * incluindo dias do mês anterior e posterior para completar as semanas.
 */
export function obterDiasDoMes(ano: number, mes: number): DiaCalendario[] {
  const primeiroDiaDoMes = new Date(ano, mes, 1);
  const ultimoDiaDoMes = new Date(ano, mes + 1, 0);

  const hoje = new Date();
  const hojeChave = formatarDataChave(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  const dias: DiaCalendario[] = [];

  // Dias do mês anterior para completar o início da primeira semana (começando no domingo)
  const diaSemanaInicio = primeiroDiaDoMes.getDay(); // 0 = Dom
  if (diaSemanaInicio > 0) {
    const ultimoDiaMesAnterior = new Date(ano, mes, 0).getDate();
    const mesAnterior = mes === 0 ? 11 : mes - 1;
    const anoMesAnterior = mes === 0 ? ano - 1 : ano;

    for (let i = diaSemanaInicio - 1; i >= 0; i--) {
      const diaNum = ultimoDiaMesAnterior - i;
      const chave = formatarDataChave(anoMesAnterior, mesAnterior, diaNum);
      const dataObj = new Date(anoMesAnterior, mesAnterior, diaNum);
      dias.push({
        ano: anoMesAnterior,
        mes: mesAnterior,
        dia: diaNum,
        dataChave: chave,
        diaSemana: dataObj.getDay(),
        pertenceAoMesAtual: false,
        eHoje: chave === hojeChave,
      });
    }
  }

  // Dias do mês corrente
  const totalDias = ultimoDiaDoMes.getDate();
  for (let d = 1; d <= totalDias; d++) {
    const chave = formatarDataChave(ano, mes, d);
    const dataObj = new Date(ano, mes, d);
    dias.push({
      ano,
      mes,
      dia: d,
      dataChave: chave,
      diaSemana: dataObj.getDay(),
      pertenceAoMesAtual: true,
      eHoje: chave === hojeChave,
    });
  }

  // Dias do próximo mês para completar a última semana
  const diasRestantes = (7 - (dias.length % 7)) % 7;
  if (diasRestantes > 0) {
    const proximoMes = mes === 11 ? 0 : mes + 1;
    const anoProximoMes = mes === 11 ? ano + 1 : ano;
    for (let p = 1; p <= diasRestantes; p++) {
      const chave = formatarDataChave(anoProximoMes, proximoMes, p);
      const dataObj = new Date(anoProximoMes, proximoMes, p);
      dias.push({
        ano: anoProximoMes,
        mes: proximoMes,
        dia: p,
        dataChave: chave,
        diaSemana: dataObj.getDay(),
        pertenceAoMesAtual: false,
        eHoje: chave === hojeChave,
      });
    }
  }

  return dias;
}

/**
 * Retorna os 7 dias da semana contendo a data de referência (começando no domingo)
 */
export function obterDiasDaSemana(dataReferencia: Date): DiaCalendario[] {
  const diaSemana = dataReferencia.getDay(); // 0 = Dom
  const domingo = new Date(dataReferencia);
  domingo.setDate(dataReferencia.getDate() - diaSemana);

  const hoje = new Date();
  const hojeChave = formatarDataChave(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  const dias: DiaCalendario[] = [];
  for (let i = 0; i < 7; i++) {
    const diaAtual = new Date(domingo);
    diaAtual.setDate(domingo.getDate() + i);

    const ano = diaAtual.getFullYear();
    const mes = diaAtual.getMonth();
    const dia = diaAtual.getDate();
    const chave = formatarDataChave(ano, mes, dia);

    dias.push({
      ano,
      mes,
      dia,
      dataChave: chave,
      diaSemana: diaAtual.getDay(),
      pertenceAoMesAtual: true,
      eHoje: chave === hojeChave,
    });
  }

  return dias;
}

/**
 * Agrupa itens por data ('YYYY-MM-DD')
 */
export function agruparPendenciasPorData(pendencias: PendenciaCRM[]): Record<string, PendenciaCRM[]> {
  const mapa: Record<string, PendenciaCRM[]> = {};

  for (const p of pendencias) {
    if (!p.data_vencimento) continue;
    const dataObj = new Date(p.data_vencimento);
    const chave = formatarDataChave(
      dataObj.getFullYear(),
      dataObj.getMonth(),
      dataObj.getDate()
    );
    if (!mapa[chave]) {
      mapa[chave] = [];
    }
    mapa[chave].push(p);
  }

  return mapa;
}

/**
 * Classifica um evento como 'concluido', 'atrasado' ou 'pendente'
 */
export function classificarStatusEvento(pendencia: PendenciaCRM): StatusVisualEvento {
  if (pendencia.status === 'concluido') return 'concluido';
  if (pendencia.data_vencimento) {
    const vencimento = new Date(pendencia.data_vencimento).getTime();
    if (vencimento < Date.now()) {
      return 'atrasado';
    }
  }
  return 'pendente';
}
