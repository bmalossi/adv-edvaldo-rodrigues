import { describe, it, expect } from 'vitest';
import {
  validarNovoTemplate,
  extrairVariaveisDoTexto,
  filtrarTemplatesAtivos,
  CATEGORIAS_TEMPLATE,
} from '@/domain/crm/template-minuta';

// ─── validarNovoTemplate ─────────────────────────────────────────────────────

describe('validarNovoTemplate', () => {
  it('aceita template com nome e categoria válidos', () => {
    const res = validarNovoTemplate({ nome: 'Contrato Padrão', categoria: 'contrato' });
    expect(res.valido).toBe(true);
    expect(res.erros).toHaveLength(0);
  });

  it('rejeita template sem nome', () => {
    const res = validarNovoTemplate({ nome: '', categoria: 'contrato' });
    expect(res.valido).toBe(false);
    expect(res.erros).toContain('Nome do modelo é obrigatório');
  });

  it('rejeita template com nome apenas com espaços', () => {
    const res = validarNovoTemplate({ nome: '   ', categoria: 'declaracao' });
    expect(res.valido).toBe(false);
    expect(res.erros).toContain('Nome do modelo é obrigatório');
  });

  it('rejeita template sem categoria', () => {
    const res = validarNovoTemplate({ nome: 'Minuta X', categoria: '' as any });
    expect(res.valido).toBe(false);
    expect(res.erros).toContain('Categoria é obrigatória');
  });

  it('rejeita template com categoria inválida', () => {
    const res = validarNovoTemplate({ nome: 'Minuta X', categoria: 'invalida' as any });
    expect(res.valido).toBe(false);
    expect(res.erros.some((e) => e.includes('Categoria inválida'))).toBe(true);
  });

  it('rejeita template com nome muito curto (< 3 chars)', () => {
    const res = validarNovoTemplate({ nome: 'AB', categoria: 'outro' });
    expect(res.valido).toBe(false);
    expect(res.erros.some((e) => e.includes('caracteres'))).toBe(true);
  });

  it('retorna múltiplos erros quando nome e categoria são inválidos simultaneamente', () => {
    const res = validarNovoTemplate({ nome: '', categoria: '' as any });
    expect(res.valido).toBe(false);
    expect(res.erros.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── extrairVariaveisDoTexto ──────────────────────────────────────────────────

describe('extrairVariaveisDoTexto', () => {
  it('extrai tags únicas de um texto com variáveis', () => {
    const texto = 'Olá, {nome_cliente}. Seu CPF é {cpf_cnpj}.';
    const vars = extrairVariaveisDoTexto(texto);
    expect(vars).toContain('nome_cliente');
    expect(vars).toContain('cpf_cnpj');
    expect(vars).toHaveLength(2);
  });

  it('retorna lista sem duplicatas', () => {
    const texto = '{nome_cliente} e novamente {nome_cliente} e {email}.';
    const vars = extrairVariaveisDoTexto(texto);
    expect(vars.filter((v) => v === 'nome_cliente')).toHaveLength(1);
    expect(vars).toHaveLength(2);
  });

  it('retorna array vazio quando não há variáveis', () => {
    const texto = 'Texto sem nenhuma variável especial.';
    expect(extrairVariaveisDoTexto(texto)).toHaveLength(0);
  });

  it('retorna array vazio para string vazia', () => {
    expect(extrairVariaveisDoTexto('')).toHaveLength(0);
  });

  it('extrai variáveis com underscore e letras', () => {
    const texto = '{endereco_completo} na cidade de {endereco_cidade}/{endereco_uf}';
    const vars = extrairVariaveisDoTexto(texto);
    expect(vars).toContain('endereco_completo');
    expect(vars).toContain('endereco_cidade');
    expect(vars).toContain('endereco_uf');
    expect(vars).toHaveLength(3);
  });

  it('ignora tags com espaços dentro (não são variáveis válidas)', () => {
    const texto = '{ nome invalido } e {nome_valido}';
    const vars = extrairVariaveisDoTexto(texto);
    expect(vars).toHaveLength(1);
    expect(vars).toContain('nome_valido');
  });
});

// ─── filtrarTemplatesAtivos ───────────────────────────────────────────────────

describe('filtrarTemplatesAtivos', () => {
  const templates = [
    { id: '1', nome: 'Procuração', categoria: 'procuracao' as const, arquivo_url: '', exige_qualificacao_completa: true, ativo: true },
    { id: '2', nome: 'Declaração', categoria: 'declaracao' as const, arquivo_url: '', exige_qualificacao_completa: true, ativo: false },
    { id: '3', nome: 'Contrato', categoria: 'contrato' as const, arquivo_url: '', exige_qualificacao_completa: false, ativo: true },
  ];

  it('retorna apenas templates com ativo=true', () => {
    const ativos = filtrarTemplatesAtivos(templates);
    expect(ativos).toHaveLength(2);
    expect(ativos.every((t) => t.ativo)).toBe(true);
  });

  it('retorna array vazio se todos inativos', () => {
    const todos = templates.map((t) => ({ ...t, ativo: false }));
    expect(filtrarTemplatesAtivos(todos)).toHaveLength(0);
  });

  it('filtra por categoria quando informada', () => {
    const proc = filtrarTemplatesAtivos(templates, 'procuracao');
    expect(proc).toHaveLength(1);
    expect(proc[0].categoria).toBe('procuracao');
  });

  it('retorna todos ativos quando categoria não informada', () => {
    expect(filtrarTemplatesAtivos(templates)).toHaveLength(2);
  });
});

// ─── CATEGORIAS_TEMPLATE ──────────────────────────────────────────────────────

describe('CATEGORIAS_TEMPLATE', () => {
  it('contém todas as categorias esperadas', () => {
    const esperadas = ['procuracao', 'contrato', 'notificacao', 'declaracao', 'outro'];
    esperadas.forEach((cat) => {
      expect(CATEGORIAS_TEMPLATE.some((c) => c.valor === cat)).toBe(true);
    });
  });

  it('cada categoria tem label legível', () => {
    CATEGORIAS_TEMPLATE.forEach((c) => {
      expect(c.label.length).toBeGreaterThan(0);
    });
  });
});
