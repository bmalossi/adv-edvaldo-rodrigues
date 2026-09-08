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
    cor: 'secondary',
    corBorda: 'border-white/10 hover:border-secondary/40',
    corHeader: 'text-white',
    corBadge: 'bg-secondary/15 text-secondary border-secondary/30',
    descricao: 'Captação e análise inicial do caso',
  },
  {
    id: 'consultoria',
    label: 'Consultoria',
    cor: 'secondary',
    corBorda: 'border-white/10 hover:border-secondary/40',
    corHeader: 'text-white',
    corBadge: 'bg-secondary/15 text-secondary border-secondary/30',
    descricao: 'Pareceres, contratos e acordos extrajudiciais',
  },
  {
    id: 'administrativo',
    label: 'Administrativo',
    cor: 'secondary',
    corBorda: 'border-white/10 hover:border-secondary/40',
    corHeader: 'text-white',
    corBadge: 'bg-secondary/15 text-secondary border-secondary/30',
    descricao: 'Requerimentos e recursos administrativos',
  },
  {
    id: 'judicial',
    label: 'Judicial',
    cor: 'secondary',
    corBorda: 'border-white/10 hover:border-secondary/40',
    corHeader: 'text-white',
    corBadge: 'bg-secondary/15 text-secondary border-secondary/30',
    descricao: 'Processos em primeira instância',
  },
  {
    id: 'recursal',
    label: 'Recursal',
    cor: 'secondary',
    corBorda: 'border-white/10 hover:border-secondary/40',
    corHeader: 'text-white',
    corBadge: 'bg-secondary/15 text-secondary border-secondary/30',
    descricao: 'Recursos e segunda instância',
  },
  {
    id: 'execucao',
    label: 'Execução',
    cor: 'secondary',
    corBorda: 'border-white/10 hover:border-secondary/40',
    corHeader: 'text-white',
    corBadge: 'bg-secondary/15 text-secondary border-secondary/30',
    descricao: 'Cumprimento de sentença e execução',
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    cor: 'secondary',
    corBorda: 'border-white/10 hover:border-secondary/40',
    corHeader: 'text-white',
    corBadge: 'bg-secondary/15 text-secondary border-secondary/30',
    descricao: 'Honorários e acordos financeiros',
  },
  {
    id: 'arquivamento',
    label: 'Arquivamento',
    cor: 'secondary',
    corBorda: 'border-white/10 hover:border-secondary/40',
    corHeader: 'text-white',
    corBadge: 'bg-secondary/15 text-secondary border-secondary/30',
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
