import type { CategoriaTemplate } from './minuta';

export interface CategoriaTemplateInfo {
  valor: CategoriaTemplate;
  label: string;
  descricao: string;
}

export const CATEGORIAS_TEMPLATE: CategoriaTemplateInfo[] = [
  { valor: 'procuracao', label: 'Procuração', descricao: 'Procurações ad judicia, et extra e poderes específicos' },
  { valor: 'contrato', label: 'Contrato', descricao: 'Contratos de honorários e prestação de serviços' },
  { valor: 'declaracao', label: 'Declaração', descricao: 'Declarações de hipossuficiência e residência' },
  { valor: 'notificacao', label: 'Notificação', descricao: 'Notificações extrajudiciais e interpelações' },
  { valor: 'outro', label: 'Outro', descricao: 'Petições simples, termos de renúncia e minutas diversas' },
];

export interface NovoTemplateInput {
  nome: string;
  categoria: CategoriaTemplate;
  descricao?: string;
  exige_qualificacao_completa?: boolean;
  conteudo_texto?: string;
  arquivo_url?: string;
}

export interface ValidacaoTemplateResultado {
  valido: boolean;
  erros: string[];
}

export function validarNovoTemplate(input: Partial<NovoTemplateInput>): ValidacaoTemplateResultado {
  const erros: string[] = [];

  const nome = input.nome?.trim();
  if (!nome) {
    erros.push('Nome do modelo é obrigatório');
  } else if (nome.length < 3) {
    erros.push('O nome deve ter no mínimo 3 caracteres');
  }

  if (!input.categoria) {
    erros.push('Categoria é obrigatória');
  } else {
    const categoriasValidas = CATEGORIAS_TEMPLATE.map((c) => c.valor);
    if (!categoriasValidas.includes(input.categoria)) {
      erros.push(`Categoria inválida: ${input.categoria}. Deve ser uma de: ${categoriasValidas.join(', ')}`);
    }
  }

  return {
    valido: erros.length === 0,
    erros,
  };
}

/**
 * Extrai todas as variáveis no padrão {nome_variavel} presentes em um texto.
 * Retorna uma lista de strings únicas sem as chaves.
 */
export function extrairVariaveisDoTexto(texto: string): string[] {
  if (!texto) return [];

  // Captura apenas identificadores válidos sem espaços
  const regex = /\{([a-zA-Z0-9_]+)\}/g;
  const encontrados = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = regex.exec(texto)) !== null) {
    encontrados.add(match[1]);
  }

  return Array.from(encontrados);
}

/**
 * Filtra templates ativos e opcionalmente por categoria
 */
export function filtrarTemplatesAtivos<T extends { ativo?: boolean; categoria: CategoriaTemplate }>(
  templates: T[],
  categoria?: CategoriaTemplate
): T[] {
  return templates.filter((t) => {
    if (t.ativo === false) return false;
    if (categoria && t.categoria !== categoria) return false;
    return true;
  });
}
