import { describe, it, expect } from 'vitest';
import { buildContrato } from '@/domain/crm/documentos/templates';
import type { Cliente } from '@/domain/crm/cliente';
import type { ConfigDocumentos, AdvogadoConfigDoc, OpcaoContrato } from '@/domain/crm/documentos/tipos';

const mockCliente: Partial<Cliente> = {
  id: 'cli-test-1',
  nome_razao_social: 'MARIA DAS DORES',
  cpf_cnpj: '111.222.333-44',
  rg_ie: '12.345.678-9',
  nacionalidade: 'brasileira',
  estado_civil: 'solteira',
  profissao: 'Professora',
  endereco_logradouro: 'Av. Brasil',
  endereco_numero: '500',
  endereco_bairro: 'Centro',
  endereco_cidade: 'Praia Grande',
  endereco_uf: 'SP',
  endereco_cep: '11700-000',
  telefone_whatsapp: '(13) 99999-8888',
  email: 'maria@teste.com',
};

const mockAdv: AdvogadoConfigDoc = {
  nome: 'EDVALDO RODRIGUES FERREIRA',
  oab: 'OAB/SP 465.818',
  telefone: '(13) 99682-4364',
  email: 'contato@edvaldorodrigues.adv.br',
  endereco: 'Av. Costa e Silva, 733, sala 21 - Praia Grande/SP',
};

const mockConfig: ConfigDocumentos = {
  prefixo: 'ER',
  empresa: 'Edvaldo Rodrigues Sociedade Individual de Advocacia',
  socOab: '12345',
  cnpj: '12.345.678/0001-90',
  foro: 'Comarca de Praia Grande/SP',
  lawyerCpf: '000.000.000-00',
  pix: '13996824364',
};

const baseOpcaoContrato: OpcaoContrato = {
  objeto: 'ajuizamento de ação cível',
  incluidos: 'todos os atos processuais',
  excluidos: 'recursos aos tribunais superiores',
  valorFixo: '3.000,00',
  valorExtenso: 'três mil reais',
  entrada: '1.000,00',
  parcelas: '2',
  valorParcela: '1.000,00',
  diaVencimento: '10',
  primeiroVencimento: '2026-10-10',
  percentualExito: '20',
  multa: '10',
  foro: 'Comarca de Praia Grande/SP',
};

describe('Gerador de Documentos: Contrato de Honorários', () => {
  it('deve conter o título visual "CONTRATO DE HONORÁRIOS ADVOCATÍCIOS" na primeira página', () => {
    const html = buildContrato(mockCliente, mockAdv, mockConfig, null, {
      ...baseOpcaoContrato,
      incluirTestemunhas: false,
    });

    expect(html).toContain('<div class="doc-title">CONTRATO DE HONORÁRIOS ADVOCATÍCIOS</div>');
  });

  it('não deve incluir bloco de testemunhas quando incluirTestemunhas for falso', () => {
    const html = buildContrato(mockCliente, mockAdv, mockConfig, null, {
      ...baseOpcaoContrato,
      incluirTestemunhas: false,
    });

    expect(html).not.toContain('TESTEMUNHA 1');
    expect(html).not.toContain('TESTEMUNHA 2');
    expect(html).toContain('Este contrato constitui título executivo extrajudicial nos termos do art. 24 da Lei nº 8.906/1994.');
    expect(html).not.toContain('com duas testemunhas, também do art. 784');
  });

  it('deve incluir bloco de testemunhas quando incluirTestemunhas for verdadeiro', () => {
    const html = buildContrato(mockCliente, mockAdv, mockConfig, null, {
      ...baseOpcaoContrato,
      incluirTestemunhas: true,
      testemunha1Nome: 'Carlos Alberto',
      testemunha1Cpf: '222.333.444-55',
      testemunha2Nome: 'Ana Paula',
      testemunha2Cpf: '555.666.777-88',
    });

    expect(html).toContain('TESTEMUNHA 1');
    expect(html).toContain('TESTEMUNHA 2');
    expect(html).toContain('Carlos Alberto');
    expect(html).toContain('222.333.444-55');
    expect(html).toContain('Ana Paula');
    expect(html).toContain('555.666.777-88');
    expect(html).toContain('com duas testemunhas, também do art. 784, III, do CPC');
  });

  it('deve renderizar linhas em branco quando incluir testemunhas sem dados preenchidos', () => {
    const html = buildContrato(mockCliente, mockAdv, mockConfig, null, {
      ...baseOpcaoContrato,
      incluirTestemunhas: true,
    });

    expect(html).toContain('TESTEMUNHA 1');
    expect(html).toContain('TESTEMUNHA 2');
    expect(html).toContain('Nome:<br>');
    expect(html).toContain('CPF:');
  });

  it('deve formatar a data do primeiro vencimento no padrão brasileiro dd/MM/yyyy na Cláusula 4ª', () => {
    const html = buildContrato(mockCliente, mockAdv, mockConfig, null, {
      ...baseOpcaoContrato,
      primeiroVencimento: '2026-10-15',
    });

    expect(html).toContain('iniciando-se em 15/10/2026');
    expect(html).not.toContain('iniciando-se em 2026-10-15');
  });
});
