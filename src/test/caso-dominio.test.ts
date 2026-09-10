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

  it('garante que apenas o Administrador ou o responsável/compartilhado acessam o caso', () => {
    const casoIndividual: Caso = {
      id: 'caso-1',
      cliente_id: 'cli-1',
      titulo: 'Inventário Judicial',
      area_direito: 'Família e Sucessões',
      tipo_demanda: 'judicial',
      status: 'em_andamento',
      visibilidade: 'privado',
      responsavel_id: 'adv-1',
      compartilhado_com: ['user-compartilhado'],
    };

    // Administrador tem acesso geral irrestrito
    expect(podeAcessarCaso(casoIndividual, 'admin-id', 'Administrador', [], 'Administrador')).toBe(true);

    // Responsável direto sempre acessa
    expect(podeAcessarCaso(casoIndividual, 'adv-1', 'advogado', [])).toBe(true);

    // Usuário na lista de compartilhamento pontual acessa
    expect(podeAcessarCaso(casoIndividual, 'user-compartilhado', 'assistente', [])).toBe(true);

    // Colaborador expressamente delegado acessa
    expect(podeAcessarCaso(casoIndividual, 'colaborador-delegado', 'advogado', ['colaborador-delegado'])).toBe(true);

    // Outro usuário não delegado nem compartilhado NÃO acessa
    expect(podeAcessarCaso(casoIndividual, 'outro-advogado', 'advogado', [])).toBe(false);
    expect(podeAcessarCaso(casoIndividual, 'estagiario-99', 'estagiario', [])).toBe(false);
  });

  it('restringe acesso a casos privados apenas ao responsável, colaboradores delegados, compartilhados ou administrador', () => {
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

    // Administrador acessa
    expect(podeAcessarCaso(casoPrivado, 'admin-1', 'Administrador', [], 'Administrador')).toBe(true);

    // Outro advogado NÃO acessa sem permissão explícita
    expect(podeAcessarCaso(casoPrivado, 'adv-socio', 'advogado', [])).toBe(false);

    // Estagiário NÃO delegado -> NÃO acessa
    expect(podeAcessarCaso(casoPrivado, 'estag-1', 'estagiario', [])).toBe(false);

    // Estagiário expressamente delegado -> ACESSA
    expect(podeAcessarCaso(casoPrivado, 'estag-1', 'estagiario', ['estag-1'])).toBe(true);

    // Secretária não delegada -> NÃO acessa
    expect(podeAcessarCaso(casoPrivado, 'sec-1', 'secretaria', [])).toBe(false);
  });

  it('permite acesso a qualquer caso para perfis com escopo "geral" (ex: Estagiário/Assistente configurado como geral)', () => {
    const casoOutroAdvogado: Caso = {
      id: 'caso-outro',
      cliente_id: 'cli-2',
      titulo: 'Ação de Alimentos',
      area_direito: 'Família',
      tipo_demanda: 'judicial',
      status: 'em_andamento',
      visibilidade: 'privado',
      responsavel_id: 'adv-principal',
    };

    // Usuário com escopo individual e não responsável -> NÃO acessa
    expect(podeAcessarCaso(casoOutroAdvogado, 'user-individual', undefined, [], 'Advogado Associado', 'individual')).toBe(false);

    // Usuário com escopo geral (ex: Estagiário com Visualização Geral habilitada) -> ACESSA
    expect(podeAcessarCaso(casoOutroAdvogado, 'estagiario-geral', undefined, [], 'Estagiário / Assistente', 'geral')).toBe(true);

    // Sócio com escopo geral -> ACESSA
    expect(podeAcessarCaso(casoOutroAdvogado, 'socio-1', undefined, [], 'Sócio', 'geral')).toBe(true);
  });
});
