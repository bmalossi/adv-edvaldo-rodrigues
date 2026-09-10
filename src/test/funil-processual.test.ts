import { describe, it, expect } from 'vitest';
import {
  podeDeletarEtapa,
  validarNovaEtapa,
  EtapaFunil,
} from '@/domain/crm/etapa-funil';
import { calcularPendencias } from '@/domain/crm/evento-caso';
import { podeAcessarCaso, Caso } from '@/domain/crm/caso';

// ── podeDeletarEtapa ───────────────────────────────────────────────────────────

describe('podeDeletarEtapa', () => {
  const etapaPadrao: EtapaFunil = {
    id: 'e1',
    fase: 'negociacao',
    nome: 'Análise do caso',
    ordem: 1,
    eh_padrao: true,
  };

  const etapaCustom: EtapaFunil = {
    id: 'e2',
    fase: 'negociacao',
    nome: 'Minha etapa',
    ordem: 10,
    eh_padrao: false,
  };

  it('bloqueia exclusão de etapa padrão', () => {
    const { pode } = podeDeletarEtapa(etapaPadrao, 0);
    expect(pode).toBe(false);
  });

  it('bloqueia exclusão de etapa custom com processos ativos', () => {
    const { pode } = podeDeletarEtapa(etapaCustom, 3);
    expect(pode).toBe(false);
  });

  it('permite exclusão de etapa custom sem processos', () => {
    const { pode } = podeDeletarEtapa(etapaCustom, 0);
    expect(pode).toBe(true);
  });
});

// ── validarNovaEtapa ───────────────────────────────────────────────────────────

describe('validarNovaEtapa', () => {
  const etapasExistentes: EtapaFunil[] = [
    { id: 'e1', fase: 'negociacao', nome: 'Análise do caso', ordem: 1, eh_padrao: true },
  ];

  it('rejeita nome vazio', () => {
    const { valido } = validarNovaEtapa('', 'negociacao', etapasExistentes);
    expect(valido).toBe(false);
  });

  it('rejeita nome duplicado na mesma fase (case-insensitive)', () => {
    const { valido } = validarNovaEtapa('análise do caso', 'negociacao', etapasExistentes);
    expect(valido).toBe(false);
  });

  it('aceita nome duplicado em fase diferente', () => {
    const { valido } = validarNovaEtapa('Análise do caso', 'judicial', etapasExistentes);
    expect(valido).toBe(true);
  });

  it('aceita nome novo na mesma fase', () => {
    const { valido } = validarNovaEtapa('Nova etapa especial', 'negociacao', etapasExistentes);
    expect(valido).toBe(true);
  });
});

// ── calcularPendencias ─────────────────────────────────────────────────────────

describe('calcularPendencias', () => {
  it('retorna zero quando não há pendências', () => {
    const p = calcularPendencias(null, [], 0);
    expect(p.total).toBe(0);
  });

  it('detecta prazo vencendo em <= 3 dias', () => {
    const amanha = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString();
    const p = calcularPendencias(amanha, [], 0);
    expect(p.prazosVencendo).toBe(1);
    expect(p.total).toBeGreaterThan(0);
  });

  it('nao alerta prazo distante', () => {
    const semanaQueVem = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    const p = calcularPendencias(semanaQueVem, [], 0);
    expect(p.prazosVencendo).toBe(0);
  });

  it('soma compromissos pendentes ao total', () => {
    const p = calcularPendencias(null, [], 4);
    expect(p.compromissosSemConfirmacao).toBe(4);
    expect(p.total).toBe(4);
  });
});

// ── podeAcessarCaso — compartilhado_com ───────────────────────────────────────

describe('podeAcessarCaso com compartilhado_com', () => {
  const casoPrivado: Caso = {
    id: 'c1',
    cliente_id: 'cli1',
    titulo: 'Teste',
    area_direito: 'Trabalhista',
    tipo_demanda: 'judicial',
    status: 'em_andamento',
    visibilidade: 'privado',
    responsavel_id: 'adv1',
    fase_funil: 'judicial',
    compartilhado_com: ['user_convidado'],
  };

  it('usuário convidado via compartilhado_com pode acessar', () => {
    const pode = podeAcessarCaso(casoPrivado, 'user_convidado', 'assistente', []);
    expect(pode).toBe(true);
  });

  it('usuário não convidado não pode acessar caso privado', () => {
    const pode = podeAcessarCaso(casoPrivado, 'user_desconhecido', 'assistente', []);
    expect(pode).toBe(false);
  });

  it('responsável direto sempre acessa', () => {
    const pode = podeAcessarCaso(casoPrivado, 'adv1', 'assistente', []);
    expect(pode).toBe(true);
  });
});

// ── Campos Complementares e Inclusão de Processos no Funil ─────────────────────────────

describe('Campos Complementares no Caso e Funil', () => {
  it('permite instanciar caso com todos os campos complementares (protocolo, originario, pasta, requerimento)', () => {
    const casoComplementar: Caso = {
      id: 'caso-complementar-1',
      cliente_id: 'cliente-123',
      titulo: 'NULIDADE DE LICITAÇÃO',
      area_direito: 'Administrativo',
      tipo_demanda: 'judicial',
      status: 'em_andamento',
      visibilidade: 'colegiado',
      responsavel_id: 'adv-1',
      fase_funil: 'administrativo',
      etapa_id: 'etapa-1',
      numero_processo: '9999999-99.9999.9.99.9999',
      numero_protocolo: '123456789-0',
      processo_originario: '8888888-88.8888.8.88.8888',
      identificacao_pasta: 'PASTA-2026/01',
      data_requerimento: '2026-09-04T12:00:00Z',
      valor_causa: 999999.99,
      resultado_final: 'procedente',
    };

    expect(casoComplementar.numero_protocolo).toBe('123456789-0');
    expect(casoComplementar.identificacao_pasta).toBe('PASTA-2026/01');
    expect(casoComplementar.fase_funil).toBe('administrativo');
    expect(casoComplementar.valor_causa).toBe(999999.99);
  });
});
