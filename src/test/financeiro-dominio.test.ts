import { describe, it, expect } from 'vitest';
import {
  ContratoFinanceiro,
  TipoHonorario,
  validarContratoFinanceiro,
  podeVisualizarHonorarios,
} from '@/domain/crm/financeiro';

describe('Domínio de CRM: Isolamento Financeiro e Contratos de Honorários', () => {
  it('valida que um contrato de honorários requer tipo de honorário e caso_id', () => {
    const contratoValido: Partial<ContratoFinanceiro> = {
      caso_id: 'caso-123',
      tipo_honorario: 'fixo',
      valor_total: 5000,
      valor_entrada: 1500,
      numero_parcelas: 3,
    };

    const resultado = validarContratoFinanceiro(contratoValido);
    expect(resultado.valido).toBe(true);
    expect(resultado.erros).toHaveLength(0);
  });

  it('exige percentual de êxito quando o tipo de honorário for "exito" ou "misto"', () => {
    const contratoInvalido: Partial<ContratoFinanceiro> = {
      caso_id: 'caso-123',
      tipo_honorario: 'exito',
      percentual_exito: undefined,
    };

    const resultado = validarContratoFinanceiro(contratoInvalido);
    expect(resultado.valido).toBe(false);
    expect(resultado.erros).toContain('Percentual de êxito é obrigatório para honorários no êxito ou mistos');
  });

  it('permite acesso a honorários estritamente para o papel "advogado"', () => {
    // Advogados têm acesso
    expect(podeVisualizarHonorarios('advogado')).toBe(true);

    // Estagiários e Secretárias são bloqueados
    expect(podeVisualizarHonorarios('estagiario')).toBe(false);
    expect(podeVisualizarHonorarios('secretaria')).toBe(false);
  });
});
