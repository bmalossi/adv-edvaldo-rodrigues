import { describe, it, expect } from 'vitest';
import {
  Caso,
  podeAcessarCaso,
  validarNovoCaso,
  TipoDemanda,
} from '@/domain/crm/caso';

describe('Domínio de CRM: Dossiê de Casos e Carteira Híbrida', () => {
  it('valida que um novo caso requer cliente, título, área do direito e responsável', () => {
    const casoValido: Partial<Caso> = {
      cliente_id: 'cli-1',
      titulo: 'Reclamação Trabalhista - Horas Extras e Intervalo',
      area_direito: 'Trabalhista',
      tipo_demanda: 'judicial',
      responsavel_id: 'adv-1',
    };

    const resultado = validarNovoCaso(casoValido);
    expect(resultado.valido).toBe(true);
    expect(resultado.erros).toHaveLength(0);
  });

  it('rejeita casos sem cliente_id ou título', () => {
    const casoInvalido: Partial<Caso> = {
      area_direito: 'Cível',
      tipo_demanda: 'consultivo',
    };

    const resultado = validarNovoCaso(casoInvalido);
    expect(resultado.valido).toBe(false);
    expect(resultado.erros).toContain('O caso precisa estar vinculado a um cliente');
    expect(resultado.erros).toContain('O título do caso é obrigatório');
  });

  it('permite acesso a qualquer membro da equipe quando a visibilidade é colegiada', () => {
    const casoColegiado: Caso = {
      id: 'caso-1',
      cliente_id: 'cli-1',
      titulo: 'Inventário Judicial',
      area_direito: 'Família e Sucessões',
      tipo_demanda: 'judicial',
      status: 'em_andamento',
      visibilidade: 'colegiado',
      responsavel_id: 'adv-1',
    };

    // Estagiário não responsável
    expect(podeAcessarCaso(casoColegiado, 'estagiario-99', 'estagiario', [])).toBe(true);
    // Secretária
    expect(podeAcessarCaso(casoColegiado, 'sec-1', 'secretaria', [])).toBe(true);
  });

  it('restringe acesso a casos privados apenas ao responsável, colaboradores delegados ou sócios advogados', () => {
    const casoPrivado: Caso = {
      id: 'caso-privado',
      cliente_id: 'cli-1',
      titulo: 'Acordo Confidencial de Sócios',
      area_direito: 'Empresarial',
      tipo_demanda: 'consultivo',
      status: 'em_andamento',
      visibilidade: 'privado',
      responsavel_id: 'adv-titular',
    };

    // Responsável direto
    expect(podeAcessarCaso(casoPrivado, 'adv-titular', 'advogado', [])).toBe(true);

    // Outro advogado (tem prerrogativa colegiada no escritório)
    expect(podeAcessarCaso(casoPrivado, 'adv-socio', 'advogado', [])).toBe(true);

    // Estagiário NÃO delegado -> NÃO acessa
    expect(podeAcessarCaso(casoPrivado, 'estag-1', 'estagiario', [])).toBe(false);

    // Estagiário expressamente delegado -> ACESSA
    expect(podeAcessarCaso(casoPrivado, 'estag-1', 'estagiario', ['estag-1'])).toBe(true);

    // Secretária não delegada -> NÃO acessa
    expect(podeAcessarCaso(casoPrivado, 'sec-1', 'secretaria', [])).toBe(false);
  });
});
