export type FaseFunil =
  | 'negociacao'
  | 'consultoria'
  | 'administrativo'
  | 'judicial'
  | 'recursal'
  | 'execucao'
  | 'financeiro'
  | 'arquivamento';

export interface EtapaFunil {
  id: string;
  fase: FaseFunil;
  nome: string;
  ordem: number;
  eh_padrao: boolean;
  criada_por?: string | null;
  created_at?: string;
}

export interface FaseConfig {
  id: FaseFunil;
  label: string;
  cor: string;
  corBorda: string;
  corHeader: string;
  corBadge: string;
  descricao: string;
}

export const FASES_FUNIL_CONFIG: FaseConfig[] = [
  {
    id: 'negociacao',
    label: 'Negociação',
    cor: 'amber',
    corBorda: 'border-amber-500/30',
    corHeader: 'text-amber-400',
    corBadge: 'bg-amber-500/20 text-amber-300',
    descricao: 'Captação e análise inicial do caso',
  },
  {
    id: 'consultoria',
    label: 'Consultoria',
    cor: 'sky',
    corBorda: 'border-sky-500/30',
    corHeader: 'text-sky-400',
    corBadge: 'bg-sky-500/20 text-sky-300',
    descricao: 'Pareceres, contratos e acordos extrajudiciais',
  },
  {
    id: 'administrativo',
    label: 'Administrativo',
    cor: 'violet',
    corBorda: 'border-violet-500/30',
    corHeader: 'text-violet-400',
    corBadge: 'bg-violet-500/20 text-violet-300',
    descricao: 'Requerimentos e recursos administrativos',
  },
  {
    id: 'judicial',
    label: 'Judicial',
    cor: 'blue',
    corBorda: 'border-blue-500/30',
    corHeader: 'text-blue-400',
    corBadge: 'bg-blue-500/20 text-blue-300',
    descricao: 'Processos em primeira instância',
  },
  {
    id: 'recursal',
    label: 'Recursal',
    cor: 'orange',
    corBorda: 'border-orange-500/30',
    corHeader: 'text-orange-400',
    corBadge: 'bg-orange-500/20 text-orange-300',
    descricao: 'Recursos e segunda instância',
  },
  {
    id: 'execucao',
    label: 'Execução',
    cor: 'rose',
    corBorda: 'border-rose-500/30',
    corHeader: 'text-rose-400',
    corBadge: 'bg-rose-500/20 text-rose-300',
    descricao: 'Cumprimento de sentença e execução',
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    cor: 'green',
    corBorda: 'border-green-500/30',
    corHeader: 'text-green-400',
    corBadge: 'bg-green-500/20 text-green-300',
    descricao: 'Honorários e acordos financeiros',
  },
  {
    id: 'arquivamento',
    label: 'Arquivamento',
    cor: 'slate',
    corBorda: 'border-slate-500/30',
    corHeader: 'text-slate-400',
    corBadge: 'bg-slate-500/20 text-slate-300',
    descricao: 'Casos encerrados e arquivados',
  },
];

export function podeDeletarEtapa(
  etapa: EtapaFunil,
  quantidadeCasosNaEtapa: number
): { pode: boolean; motivo?: string } {
  if (etapa.eh_padrao) {
    return { pode: false, motivo: 'Etapas padrão não podem ser excluídas.' };
  }
  if (quantidadeCasosNaEtapa > 0) {
    return {
      pode: false,
      motivo: `Esta etapa possui ${quantidadeCasosNaEtapa} processo(s) ativo(s). Mova-os antes de excluir.`,
    };
  }
  return { pode: true };
}

export function validarNovaEtapa(
  nome: string,
  fase: FaseFunil,
  etapasExistentes: EtapaFunil[]
): { valido: boolean; erros: string[] } {
  const erros: string[] = [];
  if (!nome || !nome.trim()) {
    erros.push('O nome da etapa é obrigatório.');
  }
  const nomeLower = nome.trim().toLowerCase();
  const duplicata = etapasExistentes.some(
    (e) => e.fase === fase && e.nome.toLowerCase() === nomeLower
  );
  if (duplicata) {
    erros.push(`Já existe uma etapa chamada "${nome}" na fase selecionada.`);
  }
  return { valido: erros.length === 0, erros };
}
