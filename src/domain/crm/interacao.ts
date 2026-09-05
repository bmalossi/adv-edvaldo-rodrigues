export type TipoInteracao = 'ligacao' | 'reuniao' | 'whatsapp' | 'email' | 'nota_interna';

export interface InteracaoCliente {
  id: string;
  cliente_id: string;
  autor_id: string;
  autor_nome?: string;
  tipo: TipoInteracao;
  descricao: string;
  data_interacao: string;
  created_at?: string;
}

export const TIPOS_INTERACAO_CONFIG: Record<
  TipoInteracao,
  { label: string; iconName: string; corBadge: string }
> = {
  whatsapp: {
    label: 'WhatsApp',
    iconName: 'MessageSquare',
    corBadge: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  ligacao: {
    label: 'Ligação',
    iconName: 'PhoneCall',
    corBadge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  reuniao: {
    label: 'Reunião Presencial',
    iconName: 'Users',
    corBadge: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  },
  email: {
    label: 'E-mail',
    iconName: 'Mail',
    corBadge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
  nota_interna: {
    label: 'Nota Interna',
    iconName: 'FileText',
    corBadge: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  },
};

export function validarNovaInteracao(interacao: Partial<InteracaoCliente>): {
  valido: boolean;
  erros: string[];
} {
  const erros: string[] = [];

  const tiposValidos: TipoInteracao[] = [
    'ligacao',
    'reuniao',
    'whatsapp',
    'email',
    'nota_interna',
  ];

  if (!interacao.tipo || !tiposValidos.includes(interacao.tipo)) {
    erros.push('Tipo de canal de interação inválido');
  }

  if (!interacao.descricao || !interacao.descricao.trim()) {
    erros.push('A descrição da interação não pode estar vazia');
  }

  return {
    valido: erros.length === 0,
    erros,
  };
}

export function ordenarInteracoesCronologicamente(
  interacoes: InteracaoCliente[]
): InteracaoCliente[] {
  return [...interacoes].sort((a, b) => {
    const dataA = new Date(a.data_interacao || a.created_at || '').getTime();
    const dataB = new Date(b.data_interacao || b.created_at || '').getTime();
    return dataB - dataA;
  });
}
