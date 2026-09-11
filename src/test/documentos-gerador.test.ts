import { describe, it, expect, beforeEach } from 'vitest';
import { buildContrato } from '@/domain/crm/documentos/templates';
import {
  carregarPadroesDocumentosLocal,
  salvarPadraoDocumentoLocal,
  restaurarPadraoDocumentoFabrica,
  DEFAULTS_FORM_DOCUMENTO,
} from '@/domain/crm/documentos/config-local';
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

describe('Gerenciamento de Modelos Padrão do Escritório (Opção A)', () => {
  beforeEach(() => {
    restaurarPadraoDocumentoFabrica();
  });

  it('deve carregar objeto vazio quando nenhum padrão customizado estiver salvo', () => {
    const padroes = carregarPadroesDocumentosLocal();
    expect(padroes).toEqual({});
  });

  it('deve salvar e carregar personalizações de contrato como padrão do escritório', () => {
    const customContrato = {
      ...DEFAULTS_FORM_DOCUMENTO.contrato,
      valorFixo: '7.500,00',
      valorExtenso: 'sete mil e quinhentos reais',
      percentualExito: '25',
      incluirTestemunhas: true,
      testemunha1Nome: 'Testemunha Padrão Escritório',
    };

    salvarPadraoDocumentoLocal('contrato', customContrato);

    const padroes = carregarPadroesDocumentosLocal();
    expect(padroes.contrato).toBeDefined();
    expect(padroes.contrato?.valorFixo).toBe('7.500,00');
    expect(padroes.contrato?.percentualExito).toBe('25');
    expect(padroes.contrato?.incluirTestemunhas).toBe(true);
    expect(padroes.contrato?.testemunha1Nome).toBe('Testemunha Padrão Escritório');
  });

  it('deve restaurar padrão de fábrica de um documento específico sem afetar os demais', () => {
    salvarPadraoDocumentoLocal('contrato', {
      ...DEFAULTS_FORM_DOCUMENTO.contrato,
      valorFixo: '9.000,00',
    });

    salvarPadraoDocumentoLocal('recibo', {
      ...DEFAULTS_FORM_DOCUMENTO.recibo,
      referenciaRecibo: 'honorários iniciais de consultoria',
    });

    // Restaura apenas o contrato
    restaurarPadraoDocumentoFabrica('contrato');

    const padroes = carregarPadroesDocumentosLocal();
    expect(padroes.contrato).toBeUndefined();
    expect(padroes.recibo?.referenciaRecibo).toBe('honorários iniciais de consultoria');
  });

  it('deve compilar e renderizar cláusulas estruturadas com interpolação de tags dinâmicas', () => {
    const customClausulas = [
      {
        id: 'c1',
        titulo: 'CLÁUSULA 1ª – OBJETO DO CONTRATO',
        conteudo: '1.1. O presente contrato visa {objeto}.',
      },
      {
        id: 'c2',
        titulo: 'CLÁUSULA 4ª – VALOR E FORMA DE PAGAMENTO',
        conteudo: '4.1. Fica ajustado o valor de {honorarios_fixos} iniciando em {primeiro_vencimento}.',
      },
    ];

    const html = buildContrato(mockCliente, mockAdv, mockConfig, null, {
      ...baseOpcaoContrato,
      objeto: 'assessoria jurídica tributária especializada',
      valorFixo: '8.000,00',
      primeiroVencimento: '2026-11-20',
      clausulas: customClausulas,
    });

    expect(html).toContain('CLÁUSULA 1ª – OBJETO DO CONTRATO');
    expect(html).toContain('assessoria jurídica tributária especializada');
    expect(html).toContain('CLÁUSULA 4ª – VALOR E FORMA DE PAGAMENTO');
    expect(html).toContain('R$ 8.000,00');
    expect(html).toContain('20/11/2026');
  });

  it('deve incluir nova cláusula personalizada (ex: Cláusula 11ª – LGPD) no documento final', () => {
    const clausulaExtra = {
      id: 'c11',
      titulo: 'CLÁUSULA 11ª – PRIVACIDADE E PROTEÇÃO DE DADOS (LGPD)',
      conteudo: '11.1. O CONTRATANTE autoriza expressamente a CONTRATADA a realizar o tratamento de dados pessoais para execução deste contrato.',
    };

    const clausulasComNova = [
      ...DEFAULTS_FORM_DOCUMENTO.contrato.clausulas!,
      clausulaExtra,
    ];

    const html = buildContrato(mockCliente, mockAdv, mockConfig, null, {
      ...baseOpcaoContrato,
      clausulas: clausulasComNova,
    });

    expect(html).toContain('CLÁUSULA 11ª – PRIVACIDADE E PROTEÇÃO DE DADOS (LGPD)');
    expect(html).toContain('tratamento de dados pessoais para execução deste contrato');
  });

  it('deve permitir salvar novas cláusulas no padrão do escritório e recarregá-las', () => {
    const clausulaNova = {
      id: 'c-nova-arbitragem',
      titulo: 'CLÁUSULA 11ª – JUÍZO ARBITRAL',
      conteudo: '11.1. As partes elegem câmara arbitral para dirimir litígios.',
    };

    const contratoPersonalizado = {
      ...DEFAULTS_FORM_DOCUMENTO.contrato,
      clausulas: [
        ...(DEFAULTS_FORM_DOCUMENTO.contrato.clausulas || []),
        clausulaNova,
      ],
    };

    salvarPadraoDocumentoLocal('contrato', contratoPersonalizado);

    const padroes = carregarPadroesDocumentosLocal();
    expect(padroes.contrato?.clausulas).toHaveLength(11);
    expect(padroes.contrato?.clausulas?.[10].titulo).toBe('CLÁUSULA 11ª – JUÍZO ARBITRAL');
  });
});
