import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildContrato,
  buildProcuracao,
  buildHipossuficiencia,
  buildIrpf,
  buildRecibo,
  buildResidencia,
  obterTextoPadraoProcuracao,
  obterTextoPadraoHipossuficiencia,
  obterTextoPadraoIrpf,
  obterTextoPadraoRecibo,
  obterTextoPadraoResidencia,
} from '@/domain/crm/documentos/templates';
import { estilosDocumentoCss } from '@/domain/crm/documentos/exportacao';
import {
  carregarPadroesDocumentosLocal,
  salvarPadraoDocumentoLocal,
  restaurarPadraoDocumentoFabrica,
  DEFAULTS_FORM_DOCUMENTO,
  CLAUSULAS_PADRAO_CONTRATO,
  salvarPadraoDocumento,
  restaurarPadraoDocumento,
  carregarDadosDocumentosCompletos,
  salvarLogoEscritorio,
  removerLogoEscritorio,
  carregarLogoLocal,
  salvarPadraoUsuarioLocal,
  carregarPadroesUsuarioLocal,
  restaurarPadraoUsuarioLocal,
  carregarHistoricoLocal,
  salvarHistoricoDocumento,
  carregarHistoricoCompleto,
  excluirHistoricoDocumento,
} from '@/domain/crm/documentos/config-local';
import {
  extrairTiposDocumentoEmitido,
  formatarNomesDocumentosEmitidos,
} from '@/domain/crm/documentos/formatacao';
import { supabase } from '@/lib/supabase';
import { vi } from 'vitest';
import type { Cliente } from '@/domain/crm/cliente';
import type { ConfigDocumentos, AdvogadoConfigDoc, OpcaoContrato, OpcaoProcuracao } from '@/domain/crm/documentos/tipos';

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
  it('deve conter o título visual "CONTRATO DE PRESTAÇÃO DE SERVIÇOS E HONORÁRIOS ADVOCATÍCIOS" na primeira página', () => {
    const html = buildContrato(mockCliente, mockAdv, mockConfig, null, {
      ...baseOpcaoContrato,
      incluirTestemunhas: false,
    });

    expect(html).toContain('<div class="doc-title">CONTRATO DE PRESTAÇÃO DE SERVIÇOS E HONORÁRIOS ADVOCATÍCIOS</div>');
  });

  it('deve exibir o rodapé geral e institucional do escritório em todas as páginas, independentemente do usuário/advogado logado', () => {
    const advogadoDiferente: AdvogadoConfigDoc = {
      nome: 'Bruno Fernandes Malossi Silva',
      oab: 'Estagiário/Assistente',
      telefone: '(11) 99999-0000',
      email: 'bruno@email.com',
      endereco: 'Rua Aleatória, 123'
    };

    const html = buildContrato(mockCliente, advogadoDiferente, mockConfig, null, {
      ...baseOpcaoContrato,
      incluirTestemunhas: false,
    });

    // O rodapé deve sempre apresentar exclusivamente os dados do escritório
    expect(html).toContain('EDVALDO RODRIGUES FERREIRA | OAB/SP 465.818');
    expect(html).toContain('Avenida Presidente Costa e Silva, nº 733, sala 21, 2º andar – Office Brasil, Boqueirão, Praia Grande/SP – CEP 11700-007');
    expect(html).toContain('edvaldorodrigues.advocacia@gmail.com · (13) 99682-4364');
    // Não deve conter o nome do usuário/advogado avulso no rodapé
    expect(html).not.toContain('<div class="doc-footer"><strong>Bruno Fernandes Malossi Silva');
  });

  it('deve distribuir o contrato padrão oficial de forma compacta e sem grandes espaços vazios em exatamente 4 páginas', () => {
    const html = buildContrato(mockCliente, mockAdv, mockConfig, null, {
      ...baseOpcaoContrato,
      incluirTestemunhas: true,
      testemunha1Nome: 'Carlos Alberto',
      testemunha1Cpf: '222.333.444-55',
      testemunha2Nome: 'Ana Paula',
      testemunha2Cpf: '555.666.777-88',
    });
    const paginas = (html.match(/<div class="doc-page"/g) || []).length;
    expect(paginas).toBe(4);
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

  it('deve refletir no documento final as alterações feitas em cláusulas padrão existentes (sem ignorar as edições)', () => {
    // Cláusulas padrão modificadas pelo usuário (mantendo 10 cláusulas)
    const clausulasEditadas = CLAUSULAS_PADRAO_CONTRATO.map(c => {
      if (c.id === 'clausula-1') {
        return {
          ...c,
          titulo: 'CLÁUSULA 1ª – OBJETO ESPECÍFICO REVISADO',
          conteudo: '1.1. Prestação exclusiva de consultoria em direito administrativo.\n\n1.2. Atos específicos definidos pelo cliente.',
        };
      }
      return c;
    });

    const html = buildContrato(mockCliente, mockAdv, mockConfig, null, {
      ...baseOpcaoContrato,
      clausulas: clausulasEditadas,
    });

    expect(html).toContain('CLÁUSULA 1ª – OBJETO ESPECÍFICO REVISADO');
    expect(html).toContain('Prestação exclusiva de consultoria em direito administrativo');
  });
});

describe('Atuação Conjunta com Outro Advogado e Preâmbulo Editável', () => {
  it('deve incluir advogado em atuação conjunta no preâmbulo, outorgados da procuração e bloco de assinaturas', () => {
    const htmlContrato = buildContrato(mockCliente, mockAdv, mockConfig, null, {
      ...baseOpcaoContrato,
      atuacaoConjunta: true,
      advogadoConjuntoNome: 'VANIA VIEIRA BRAZIL NASCIMENTO',
      advogadoConjuntoTratamento: 'advogada',
      advogadoConjuntoOab: 'OAB/SP 387.405',
      advogadoConjuntoEndereco: 'Avenida Presidente Costa e Silva, nº 733, sala 21 - Praia Grande/SP',
    });

    // Preâmbulo com Dr. Edvaldo e atuação conjunta de Dra. Vânia
    expect(htmlContrato).toContain('Dr. EDVALDO RODRIGUES FERREIRA, OAB/SP 465.818');
    expect(htmlContrato).toContain('com atuação conjunta de <strong>VANIA VIEIRA BRAZIL NASCIMENTO, advogada, OAB/SP 387.405</strong>');

    // Assinaturas das partes com contratante, Dr. Edvaldo e Dra. Vânia
    expect(htmlContrato).toContain('CONTRATANTE:');
    expect(htmlContrato).toContain('EDVALDO RODRIGUES FERREIRA');
    expect(htmlContrato).toContain('VANIA VIEIRA BRAZIL NASCIMENTO');
    expect(htmlContrato).toContain('OAB/SP 387.405');

    // Procuração também deve listar nos outorgados
    const htmlProc = buildProcuracao(mockCliente, mockAdv, mockConfig, null, {
      receber: true,
      transigir: true,
      hipossuf: true,
      substabelecer: true,
      inss: false,
      receita: false,
      atuacaoConjunta: true,
      advogadoConjuntoNome: 'VANIA VIEIRA BRAZIL NASCIMENTO',
      advogadoConjuntoTratamento: 'advogada',
      advogadoConjuntoOab: 'OAB/SP 387.405',
      advogadoConjuntoEndereco: 'Avenida Presidente Costa e Silva, nº 733, sala 21 - Praia Grande/SP',
    });

    expect(htmlProc).toContain('OUTORGADOS:');
    expect(htmlProc).toContain('VANIA VIEIRA BRAZIL NASCIMENTO');
    expect(htmlProc).toContain('OAB/SP 387.405');
  });

  it('deve utilizar o preâmbulo totalmente personalizado quando informado pelo usuário', () => {
    const preambuloCustom = 'Pelo presente contrato particular, as partes acordam nos exatos termos desta minuta sob medida.';
    const html = buildContrato(mockCliente, mockAdv, mockConfig, null, {
      ...baseOpcaoContrato,
      preambuloPersonalizado: preambuloCustom,
    });

    expect(html).toContain(preambuloCustom);
  });
});

describe('Personalização de Cabeçalho, Rodapé e Numeração de Páginas', () => {
  it('deve renderizar cabeçalho customizado e rodapé personalizado', () => {
    const html = buildContrato(mockCliente, mockAdv, mockConfig, null, {
      ...baseOpcaoContrato,
      cabecalhoPersonalizado: 'ESCRITÓRIO ASSOCIADO DE ADVOCACIA BRASIL',
      rodapeLinha1: 'BANCA DE ADVOGADOS ASSOCIADOS | OAB/SP 123.456',
      rodapeLinha2: 'Rua das Flores, nº 100 - Santos/SP',
      rodapeLinha3: 'contato@banca.adv.br · (13) 3333-4444',
      numerarPaginas: true,
    });

    expect(html).toContain('ESCRITÓRIO ASSOCIADO DE ADVOCACIA BRASIL');
    expect(html).toContain('BANCA DE ADVOGADOS ASSOCIADOS | OAB/SP 123.456');
    expect(html).toContain('Rua das Flores, nº 100 - Santos/SP');
    expect(html).toContain('contato@banca.adv.br · (13) 3333-4444');
    expect(html).toContain('Página 1 de 4');
  });

  it('deve centralizar os títulos das cláusulas quando a opção centralizarTitulos estiver ativa', () => {
    const html = buildContrato(mockCliente, mockAdv, mockConfig, null, {
      ...baseOpcaoContrato,
      centralizarTitulos: true,
    });

    expect(html).toContain('class="clause-title centered"');
    expect(html).toContain('style="text-align:center;"');
  });

  it('deve gerar campo de assinaturas espaçoso e sem achatamento de largura', () => {
    const html = buildContrato(mockCliente, mockAdv, mockConfig, null, {
      ...baseOpcaoContrato,
      atuacaoConjunta: true,
      advogadoConjuntoNome: 'VANIA VIEIRA BRAZIL NASCIMENTO',
      advogadoConjuntoTratamento: 'advogada',
      advogadoConjuntoOab: 'OAB/SP 387.405',
    });

    // Deve conter containers flex de 48% e colunas sem duplo aninhamento restritivo
    expect(html).toContain('class="party-signatures"');
    expect(html).toContain('width:48%');
    expect(html).toContain('class="sigbox"');
    expect(html).toContain('class="line"');
    expect(html).toContain('EDVALDO RODRIGUES FERREIRA');
    expect(html).toContain('VANIA VIEIRA BRAZIL NASCIMENTO');
    expect(estilosDocumentoCss()).toContain('width: 75mm');
  });

  it('deve transferir todas as assinaturas para a página seguinte quando houver risco de colisão com o rodapé', () => {
    // Simula a adição de cláusulas extras/extensas e advogada conjunta que fariam as assinaturas ultrapassarem o rodapé
    const html = buildContrato(mockCliente, mockAdv, mockConfig, null, {
      ...baseOpcaoContrato,
      atuacaoConjunta: true,
      advogadoConjuntoNome: 'VANIA VIEIRA BRAZIL NASCIMENTO',
      advogadoConjuntoTratamento: 'advogada',
      advogadoConjuntoOab: 'OAB/SP 387.405',
      clausulaExtra: 'Parágrafo suplementar extenso para validação de margens e transbordamento controlado de assinaturas sem tocar o rodapé institucional da folha.',
    });

    const paginas = html.split('<div class="doc-page">').slice(1);
    // A última página deve conter o bloco completo de assinaturas
    const ultimaPagina = paginas[paginas.length - 1];
    expect(ultimaPagina).toContain('class="party-signatures"');
    expect(ultimaPagina).toContain('VANIA VIEIRA BRAZIL NASCIMENTO');
    expect(ultimaPagina).toContain('EDVALDO RODRIGUES FERREIRA');
    // Nenhuma página anterior deve ter assinatura isolada ou fragmentada
    for (let i = 0; i < paginas.length - 1; i++) {
      expect(paginas[i]).not.toContain('class="party-signatures"');
    }
  });
});

describe('Personalização de Minuta, Cabeçalho e Rodapé nos Demais Documentos', () => {
  const customHeader = 'SOCIEDADE INDIVIDUAL DE ADVOCACIA - EDVALDO RODRIGUES';
  const customFooter1 = 'RODAPÉ PERSONALIZADO LINHA 1 | OAB/SP 465.818';
  const customFooter2 = 'Av. Presidente Costa e Silva, 733 - Sala 21';
  const customFooter3 = 'contato@personalizado.adv.br · (13) 99682-4364';

  describe('Procuração Ad Judicia et Extra', () => {
    it('deve renderizar o texto padrão dinâmico quando não houver texto personalizado', () => {
      const html = buildProcuracao(mockCliente, mockAdv, mockConfig, null, {
        receber: true,
        transigir: true,
        hipossuf: true,
        substabelecer: true,
      });

      expect(html).toContain('OUTORGANTE:');
      expect(html).toContain('MARIA DAS DORES');
      expect(html).toContain('AD JUDICIA ET EXTRA');
      expect(html).toContain('OUTORGADO:');
      expect(html).toContain('EDVALDO RODRIGUES FERREIRA');
    });

    it('deve renderizar minuta customizada, cabeçalho e rodapé quando informados', () => {
      const customMinuta = 'OUTORGANTE: MARIA DAS DORES.\n\nOUTORGADO: EDVALDO RODRIGUES FERREIRA.\n\nPelo presente, confere poderes amplos para atuação em acordos extrajudiciais bancários.';
      const html = buildProcuracao(mockCliente, mockAdv, mockConfig, null, {
        receber: true,
        transigir: true,
        hipossuf: true,
        substabelecer: true,
        textoPersonalizado: customMinuta,
        cabecalhoPersonalizado: customHeader,
        rodapeLinha1: customFooter1,
        rodapeLinha2: customFooter2,
        rodapeLinha3: customFooter3,
        numerarPaginas: true,
      });

      expect(html).toContain('acordos extrajudiciais bancários');
      expect(html).toContain(customHeader);
      expect(html).toContain(customFooter1);
      expect(html).toContain(customFooter2);
      expect(html).toContain(customFooter3);
      expect(html).toContain('Página 1 de 1');
    });
  });

  describe('Declaração de Hipossuficiência', () => {
    it('deve renderizar o texto dinâmico padrão', () => {
      const html = buildHipossuficiencia(mockCliente, mockAdv, mockConfig, null, {
        situacao: 'autônoma',
        rendaMensal: '1 salário mínimo',
        dependentes: '2',
      });

      expect(html).toContain('DECLARAÇÃO DE HIPOSSUFICIÊNCIA');
      expect(html).toContain('MARIA DAS DORES');
      expect(html).toContain('pobre na expressão jurídica da palavra');
      expect(html).toContain('autônoma');
    });

    it('deve aceitar texto customizado com cabeçalho e rodapé', () => {
      const customMinuta = 'MARIA DAS DORES, brasileira, DECLARA expressamente para fins de justiça gratuita que seus rendimentos são inteiramente comprometidos com despesas médicas essenciais.';
      const html = buildHipossuficiencia(mockCliente, mockAdv, mockConfig, null, {
        textoPersonalizado: customMinuta,
        cabecalhoPersonalizado: customHeader,
        rodapeLinha1: customFooter1,
        rodapeLinha2: customFooter2,
        rodapeLinha3: customFooter3,
        numerarPaginas: true,
      });

      expect(html).toContain('despesas médicas essenciais');
      expect(html).toContain(customHeader);
      expect(html).toContain(customFooter1);
      expect(html).toContain('Página 1 de 1');
    });
  });

  describe('Declaração de Isenção de IRPF', () => {
    it('deve renderizar texto dinâmico padrão com exercícios informados', () => {
      const html = buildIrpf(mockCliente, mockAdv, mockConfig, null, {
        exercicios: '2024 e 2025',
        finalidade: 'comprovação perante instituição de ensino',
      });

      expect(html).toContain('DECLARAÇÃO DE ISENÇÃO DO IMPOSTO DE RENDA PESSOA FÍSICA (IRPF)');
      expect(html).toContain('2024 e 2025');
      expect(html).toContain('comprovação perante instituição de ensino');
      expect(html).toContain('Lei nº 7.115/1983');
    });

    it('deve aceitar texto personalizado de isenção de imposto de renda', () => {
      const customMinuta = 'Eu, MARIA DAS DORES, DECLARO sob as penas da lei que não tive rendimentos tributáveis no exercício 2025 superiores ao teto de obrigatoriedade.';
      const html = buildIrpf(mockCliente, mockAdv, mockConfig, null, {
        exercicios: '2025',
        textoPersonalizado: customMinuta,
        cabecalhoPersonalizado: customHeader,
        rodapeLinha1: customFooter1,
      });

      expect(html).toContain('não tive rendimentos tributáveis no exercício 2025');
      expect(html).toContain(customHeader);
      expect(html).toContain(customFooter1);
    });
  });

  describe('Recibo de Honorários Advocatícios', () => {
    it('deve renderizar recibo com dados financeiros e de serviços', () => {
      const html = buildRecibo(mockCliente, mockAdv, mockConfig, null, {
        valorRecibo: '1.500,00',
        valorExtenso: 'um mil e quinhentos reais',
        referenciaRecibo: 'elaboração de parecer técnico trabalhista',
        formaPagamento: 'PIX',
      });

      expect(html).toContain('RECIBO DE PAGAMENTO');
      expect(html).toContain('1.500,00 (um mil e quinhentos reais)');
      expect(html).toContain('elaboração de parecer técnico trabalhista');
      expect(html).toContain('PIX');
    });

    it('deve renderizar minuta personalizada do recibo com cabeçalho e rodapé', () => {
      const customMinuta = 'MARIA DAS DORES efetuou o pagamento no valor de R$ 1.500,00 a título de quitação integral da assessoria consultiva.';
      const html = buildRecibo(mockCliente, mockAdv, mockConfig, null, {
        valorRecibo: '1.500,00',
        textoPersonalizado: customMinuta,
        cabecalhoPersonalizado: customHeader,
        rodapeLinha1: customFooter1,
      });

      expect(html).toContain('quitação integral da assessoria consultiva');
      expect(html).toContain(customHeader);
      expect(html).toContain(customFooter1);
    });
  });

  describe('Declaração de Residência', () => {
    it('deve renderizar declaração residencial padrão (próprio cliente)', () => {
      const html = buildResidencia(mockCliente, mockAdv, mockConfig, null, {
        tipoResidencia: 'proprio',
        destinoResidencia: 'Banco do Brasil S.A.',
      });

      expect(html).toContain('DECLARAÇÃO DE RESIDÊNCIA');
      expect(html).toContain('MARIA DAS DORES');
      expect(html).toContain('Banco do Brasil S.A.');
      expect(html).toContain('Lei nº 7.115/1983');
    });

    it('deve renderizar minuta personalizada com cabeçalho e rodapé', () => {
      const customMinuta = 'Eu, MARIA DAS DORES, DECLARO sob as penas da lei que resido permanentemente no imóvel da Av. Brasil, 500.';
      const html = buildResidencia(mockCliente, mockAdv, mockConfig, null, {
        tipoResidencia: 'proprio',
        textoPersonalizado: customMinuta,
        cabecalhoPersonalizado: customHeader,
        rodapeLinha1: customFooter1,
      });

      expect(html).toContain('resido permanentemente no imóvel da Av. Brasil, 500');
      expect(html).toContain(customHeader);
      expect(html).toContain(customFooter1);
    });
  });
});

describe('Geradores de Texto Padrão para Preenchimento Inicial', () => {
  it('obterTextoPadraoProcuracao deve gerar texto com dados qualificados', () => {
    const texto = obterTextoPadraoProcuracao(mockCliente, mockAdv, mockConfig, {
      receber: true,
      transigir: true,
      hipossuf: true,
      substabelecer: true,
    });
    expect(texto).toContain('OUTORGANTE:');
    expect(texto).toContain('MARIA DAS DORES');
    expect(texto).toContain('OUTORGADO: EDVALDO RODRIGUES FERREIRA');
    expect(texto).toContain('AD JUDICIA ET EXTRA');
  });

  it('obterTextoPadraoHipossuficiencia deve gerar texto com qualificações e declarações', () => {
    const texto = obterTextoPadraoHipossuficiencia(mockCliente, {
      situacao: 'aposentada',
      rendaMensal: 'R$ 1.800,00',
    });
    expect(texto).toContain('MARIA DAS DORES');
    expect(texto).toContain('pobre na expressão jurídica da palavra');
    expect(texto).toContain('aposentada');
    expect(texto).toContain('R$ 1.800,00');
  });

  it('obterTextoPadraoIrpf deve gerar texto com exercício e menção à Lei 7.115/1983', () => {
    const texto = obterTextoPadraoIrpf(mockCliente, {
      exercicios: '2024 e 2025',
    });
    expect(texto).toContain('MARIA DAS DORES');
    expect(texto).toContain('2024 e 2025');
    expect(texto).toContain('Lei nº 7.115/1983');
  });

  it('obterTextoPadraoRecibo deve gerar texto com valor formatado e referência', () => {
    const texto = obterTextoPadraoRecibo(mockCliente, mockAdv, mockConfig, {
      valorRecibo: '2.500,00',
      valorExtenso: 'dois mil e quinhentos reais',
      referenciaRecibo: 'honorários iniciais',
    });
    expect(texto).toContain('MARIA DAS DORES');
    expect(texto).toContain('2.500,00 (dois mil e quinhentos reais)');
    expect(texto).toContain('honorários iniciais');
  });

  it('obterTextoPadraoResidencia deve gerar texto próprio e de terceiros', () => {
    const textoProprio = obterTextoPadraoResidencia(mockCliente, {
      tipoResidencia: 'proprio',
      destinoResidencia: 'INSS',
    });
    expect(textoProprio).toContain('MARIA DAS DORES');
    expect(textoProprio).toContain('INSS');

    const textoTerceiro = obterTextoPadraoResidencia(mockCliente, {
      tipoResidencia: 'terceiro',
      titularResidencia: 'JOÃO DAS DORES',
      cpfTitular: '999.888.777-66',
      vinculoTitular: 'mãe',
      destinoResidencia: 'Receita Federal',
    });
    expect(textoTerceiro).toContain('JOÃO DAS DORES');
    expect(textoTerceiro).toContain('999.888.777-66');
    expect(textoTerceiro).toContain('sendo meu/minha mãe');
  });
});

describe('Persistência Local dos Demais Documentos (Opção A)', () => {
  beforeEach(() => {
    restaurarPadraoDocumentoFabrica();
  });

  it('deve salvar e restaurar padrão do escritório para procuracao', () => {
    salvarPadraoDocumentoLocal('procuracao', {
      ...DEFAULTS_FORM_DOCUMENTO.procuracao,
      finalidadeProc: 'Defesa em ação de execução de alimentos',
      textoPersonalizado: 'Texto de minuta padrão do escritório para procuração',
      cabecalhoPersonalizado: 'Cabeçalho OAB Regional',
      rodapeLinha1: 'Rodapé OAB Regional',
    });

    const padroes = carregarPadroesDocumentosLocal();
    expect(padroes.procuracao).toBeDefined();
    expect(padroes.procuracao?.finalidadeProc).toBe('Defesa em ação de execução de alimentos');
    expect(padroes.procuracao?.textoPersonalizado).toBe('Texto de minuta padrão do escritório para procuração');
    expect(padroes.procuracao?.cabecalhoPersonalizado).toBe('Cabeçalho OAB Regional');
    expect(padroes.procuracao?.rodapeLinha1).toBe('Rodapé OAB Regional');

    restaurarPadraoDocumentoFabrica('procuracao');
    const aposRestaurar = carregarPadroesDocumentosLocal();
    expect(aposRestaurar.procuracao).toBeUndefined();
  });

  it('deve salvar e restaurar padrão do escritório para hipossuficiencia, irpf, recibo e residencia', () => {
    salvarPadraoDocumentoLocal('hipossuficiencia', {
      ...DEFAULTS_FORM_DOCUMENTO.hipossuficiencia,
      situacao: 'desempregado(a)',
    });
    salvarPadraoDocumentoLocal('irpf', {
      ...DEFAULTS_FORM_DOCUMENTO.irpf,
      exercicios: 'Últimos 5 exercícios',
    });
    salvarPadraoDocumentoLocal('recibo', {
      ...DEFAULTS_FORM_DOCUMENTO.recibo,
      formaPagamento: 'Transferência Bancária TED',
    });
    salvarPadraoDocumentoLocal('residencia', {
      ...DEFAULTS_FORM_DOCUMENTO.residencia,
      destinoResidencia: 'Poder Judiciário do Estado de São Paulo',
    });

    const padroes = carregarPadroesDocumentosLocal();
    expect(padroes.hipossuficiencia?.situacao).toBe('desempregado(a)');
    expect(padroes.irpf?.exercicios).toBe('Últimos 5 exercícios');
    expect(padroes.recibo?.formaPagamento).toBe('Transferência Bancária TED');
    expect(padroes.residencia?.destinoResidencia).toBe('Poder Judiciário do Estado de São Paulo');
  });
});

describe('Suporte a Múltiplos Clientes (Multi-contratantes / Co-clientes)', () => {
  const mockCliente2: Partial<Cliente> = {
    id: 'cli-test-2',
    nome_razao_social: 'JOÃO PEREIRA DA SILVA',
    cpf_cnpj: '999.888.777-00',
    rg_ie: '98.765.432-1',
    nacionalidade: 'brasileiro',
    estado_civil: 'casado',
    profissao: 'Engenheiro',
    endereco_logradouro: 'Rua das Flores',
    endereco_numero: '120',
    endereco_bairro: 'Canto do Forte',
    endereco_cidade: 'Praia Grande',
    endereco_uf: 'SP',
    endereco_cep: '11700-001',
    telefone_whatsapp: '(13) 98888-7777',
    email: 'joao@teste.com',
  };

  it('deve gerar Contrato com qualificação plural e campo de assinatura para cada cliente', () => {
    const html = buildContrato([mockCliente, mockCliente2], mockAdv, mockConfig, null, {
      ...baseOpcaoContrato,
      incluirTestemunhas: false,
    });

    // Preâmbulo com CONTRATANTES e ambos os nomes
    expect(html).toContain('CONTRATANTES');
    expect(html).toContain('MARIA DAS DORES');
    expect(html).toContain('JOÃO PEREIRA DA SILVA');
    expect(html).toContain('1)');
    expect(html).toContain('2)');

    // Campos de assinatura dos contratantes
    expect(html).toContain('CONTRATANTE 1:');
    expect(html).toContain('CONTRATANTE 2:');
    expect(html).toContain('111.222.333-44');
    expect(html).toContain('999.888.777-00');

    // Assinatura do advogado contratado
    expect(html).toContain('CONTRATADA');
    expect(html).toContain('EDVALDO RODRIGUES FERREIRA');
  });

  it('deve gerar Contrato com múltiplos clientes passados via clientesAdicionais', () => {
    const html = buildContrato(mockCliente, mockAdv, mockConfig, null, {
      ...baseOpcaoContrato,
      clientesAdicionais: [mockCliente2],
      incluirTestemunhas: false,
    });

    expect(html).toContain('CONTRATANTES');
    expect(html).toContain('MARIA DAS DORES');
    expect(html).toContain('JOÃO PEREIRA DA SILVA');
    expect(html).toContain('CONTRATANTE 1:');
    expect(html).toContain('CONTRATANTE 2:');
  });

  it('deve suportar simultaneamente múltiplos clientes e atuação conjunta de advogados no Contrato', () => {
    const html = buildContrato([mockCliente, mockCliente2], mockAdv, mockConfig, null, {
      ...baseOpcaoContrato,
      atuacaoConjunta: true,
      advogadoConjuntoNome: 'Dra. Vania Regina Malossi',
      advogadoConjuntoTratamento: 'advogada',
      advogadoConjuntoOab: 'OAB/SP 387.405',
      incluirTestemunhas: false,
    });

    // Clientes
    expect(html).toContain('CONTRATANTE 1:');
    expect(html).toContain('CONTRATANTE 2:');

    // Advogados
    expect(html).toContain('EDVALDO RODRIGUES FERREIRA');
    expect(html).toContain('Dra. Vania Regina Malossi');
    expect(html).toContain('OAB/SP 387.405');
  });

  it('deve gerar Procuração com OUTORGANTES e caixas de assinatura individuais', () => {
    const html = buildProcuracao([mockCliente, mockCliente2], mockAdv, mockConfig, null, {
      transigir: true,
      receber: true,
      substabelecer: true,
      hipossuf: true,
    });

    expect(html).toContain('OUTORGANTES:');
    expect(html).toContain('MARIA DAS DORES');
    expect(html).toContain('JOÃO PEREIRA DA SILVA');
    expect(html).toContain('111.222.333-44');
    expect(html).toContain('999.888.777-00');
  });

  it('deve gerar Declaração de Hipossuficiência no plural com assinaturas individuais', () => {
    const html = buildHipossuficiencia([mockCliente, mockCliente2], mockAdv, mockConfig, null, {
      situacao: 'assalariados',
    });

    expect(html).toContain('DECLARAM CONJUNTAMENTE');
    expect(html).toContain('são pessoas pobres na expressão jurídica da palavra');
    expect(html).toContain('MARIA DAS DORES');
    expect(html).toContain('JOÃO PEREIRA DA SILVA');
  });

  it('deve gerar Declaração de IRPF no plural com assinaturas individuais', () => {
    const html = buildIrpf([mockCliente, mockCliente2], mockAdv, mockConfig, null, {
      exercicios: '2024 e 2025',
    });

    expect(html).toContain('DECLARAMOS');
    expect(html).toContain('MARIA DAS DORES');
    expect(html).toContain('JOÃO PEREIRA DA SILVA');
  });

  it('deve gerar Recibo no plural mencionando pagamento conjunto', () => {
    const html = buildRecibo([mockCliente, mockCliente2], mockAdv, mockConfig, null, {
      valorRecibo: 2500,
      valorExtenso: 'dois mil e quinhentos reais',
      referenciaRecibo: 'honorários iniciais',
      formaPagamento: 'PIX',
    });

    expect(html).toContain('efetuaram conjuntamente o pagamento');
    expect(html).toContain('MARIA DAS DORES');
    expect(html).toContain('JOÃO PEREIRA DA SILVA');
  });

  it('deve gerar Declaração de Residência no plural com assinaturas individuais', () => {
    const html = buildResidencia([mockCliente, mockCliente2], mockAdv, mockConfig, null, {
      tipoResidencia: 'proprio',
      destinoResidencia: 'Banco do Brasil',
    });

    expect(html).toContain('DECLARAMOS que somos residentes e domiciliados');
    expect(html).toContain('MARIA DAS DORES');
    expect(html).toContain('JOÃO PEREIRA DA SILVA');
  });
});

describe('Controle de Permissões e Escopo: Administrador vs Usuário Comum', () => {
  const mockDb = new Map<string, any>();

  beforeEach(() => {
    localStorage.clear();
    mockDb.clear();
    vi.restoreAllMocks();

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      return {
        select: vi.fn().mockImplementation((_cols?: string) => ({
          eq: vi.fn().mockImplementation((col: string, val: string) => ({
            maybeSingle: vi.fn().mockImplementation(async () => {
              const row = mockDb.get(`${table}:${val}`);
              return { data: row || null, error: null };
            }),
          })),
          in: vi.fn().mockImplementation((col: string, vals: string[]) => ({
            then: (resolve: any) => {
              const results = vals.map(v => mockDb.get(`${table}:${v}`)).filter(Boolean);
              return Promise.resolve(resolve({ data: results, error: null }));
            },
          })),
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(async () => {
              const rows = Array.from(mockDb.entries())
                .filter(([k]) => k.startsWith(`${table}:`))
                .map(([, v]) => v);
              return { data: rows, error: null };
            }),
          }),
        })),
        upsert: vi.fn().mockImplementation((row: any) => {
          mockDb.set(`${table}:${row.chave}`, row);
          return Promise.resolve({ data: row, error: null });
        }),
        insert: vi.fn().mockImplementation((row: any) => {
          const key = row.id || row.chave || `row-${mockDb.size}`;
          mockDb.set(`${table}:${key}`, row);
          return {
            select: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
              single: vi.fn().mockResolvedValue({ data: row, error: null }),
            }),
          };
        }),
        delete: vi.fn().mockImplementation(() => ({
          eq: vi.fn().mockImplementation((col: string, val: string) => {
            mockDb.delete(`${table}:${val}`);
            return Promise.resolve({ error: null });
          }),
        })),
      } as any;
    });
  });

  it('quando Administrador altera cláusulas e salva, deve salvar no padrão do escritório e refletir para outros usuários', async () => {
    const adminId = 'admin-user-1';
    const comumId = 'comum-user-2';

    const contratoCustomAdmin = {
      ...DEFAULTS_FORM_DOCUMENTO.contrato,
      valorFixo: '12.000,00',
      clausulas: [
        {
          id: 'clausula-admin',
          titulo: 'CLÁUSULA ESPECIAL ESCRITÓRIO ADMIN',
          conteudo: 'Conteúdo padrão determinado pelo administrador para todos os contratos.',
        },
      ],
    };

    // Administrador salva para o escritório
    const resAdmin = await salvarPadraoDocumento({
      tipo: 'contrato',
      valor: contratoCustomAdmin,
      isAdm: true,
      userId: adminId,
    });

    expect(resAdmin.escopo).toBe('escritorio');

    // Usuário comum carrega os padrões: deve receber o modelo do escritório configurado pelo admin
    const padroesUsuarioComum = carregarPadroesDocumentosLocal(comumId, false);
    expect(padroesUsuarioComum.contrato?.valorFixo).toBe('12.000,00');
    expect(padroesUsuarioComum.contrato?.clausulas?.[0].titulo).toBe('CLÁUSULA ESPECIAL ESCRITÓRIO ADMIN');
  });

  it('quando Usuário Comum altera cláusulas e salva, deve salvar apenas para sua conta sem alterar o escritório', async () => {
    const adminId = 'admin-user-1';
    const comumId = 'comum-user-2';
    const outroComumId = 'comum-user-3';

    // Primeiro, define um padrão de escritório via Admin
    await salvarPadraoDocumento({
      tipo: 'contrato',
      valor: {
        ...DEFAULTS_FORM_DOCUMENTO.contrato,
        objeto: 'objeto definido pelo escritório',
      },
      isAdm: true,
      userId: adminId,
    });

    // Usuário comum altera apenas para sua conta
    const resComum = await salvarPadraoDocumento({
      tipo: 'contrato',
      valor: {
        ...DEFAULTS_FORM_DOCUMENTO.contrato,
        objeto: 'objeto personalizado do usuário comum',
      },
      isAdm: false,
      userId: comumId,
    });

    expect(resComum.escopo).toBe('usuario');

    // Usuário comum vê sua própria customização
    const padroesComum = carregarPadroesDocumentosLocal(comumId, false);
    expect(padroesComum.contrato?.objeto).toBe('objeto personalizado do usuário comum');

    // O padrão do escritório continua intacto
    const padroesEscritorio = carregarPadroesDocumentosLocal(undefined, true);
    expect(padroesEscritorio.contrato?.objeto).toBe('objeto definido pelo escritório');

    // Outro usuário comum continua vendo o padrão do escritório, sem ser afetado
    const padroesOutroComum = carregarPadroesDocumentosLocal(outroComumId, false);
    expect(padroesOutroComum.contrato?.objeto).toBe('objeto definido pelo escritório');
  });

  it('quando Usuário Comum restaura padrão, deve remover sua personalização e voltar a usar o padrão do escritório', async () => {
    const adminId = 'admin-user-1';
    const comumId = 'comum-user-2';

    // Escritório tem modelo customizado pelo admin
    await salvarPadraoDocumento({
      tipo: 'procuracao',
      valor: {
        ...DEFAULTS_FORM_DOCUMENTO.procuracao,
        varaJuizado: '1ª Vara Cível da Comarca de Santos',
      },
      isAdm: true,
      userId: adminId,
    });

    // Usuário comum salva override próprio
    await salvarPadraoDocumento({
      tipo: 'procuracao',
      valor: {
        ...DEFAULTS_FORM_DOCUMENTO.procuracao,
        varaJuizado: 'Juizado Especial Cível de Praia Grande',
      },
      isAdm: false,
      userId: comumId,
    });

    // Verifica que o override pessoal está ativo
    let padroes = carregarPadroesDocumentosLocal(comumId, false);
    expect(padroes.procuracao?.varaJuizado).toBe('Juizado Especial Cível de Praia Grande');

    // Usuário comum clica em restaurar padrão do escritório
    const resRestaurar = await restaurarPadraoDocumento({
      tipo: 'procuracao',
      isAdm: false,
      userId: comumId,
    });

    expect(resRestaurar.escopo).toBe('usuario');
    expect(resRestaurar.valorRestaurado.varaJuizado).toBe('1ª Vara Cível da Comarca de Santos');

    // Ao carregar novamente, deve ver o padrão do escritório
    padroes = carregarPadroesDocumentosLocal(comumId, false);
    expect(padroes.procuracao?.varaJuizado).toBe('1ª Vara Cível da Comarca de Santos');
  });

  it('quando Administrador altera o logotipo, deve refletir em carregarLogoLocal e aparecer em todos os documentos', async () => {
    const adminId = 'admin-user-1';
    const mockLogoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    await salvarLogoEscritorio(mockLogoBase64, adminId);

    // O logo agora deve estar disponível no cache do escritório
    expect(carregarLogoLocal()).toBe(mockLogoBase64);

    // Gera contrato usando o logo: deve conter a imagem do logotipo no cabeçalho
    const htmlContrato = buildContrato(mockCliente, mockAdv, mockConfig, mockLogoBase64, baseOpcaoContrato);
    expect(htmlContrato).toContain('<div class="letterhead"><img src="data:image/png;base64,');

    // Gera procuração usando o logo
    const htmlProc = buildProcuracao(mockCliente, mockAdv, mockConfig, mockLogoBase64, { transigir: true });
    expect(htmlProc).toContain('<div class="letterhead"><img src="data:image/png;base64,');

    // Remove logo
    await removerLogoEscritorio(adminId);
    expect(carregarLogoLocal()).toBeNull();

    const htmlSemLogo = buildContrato(mockCliente, mockAdv, mockConfig, null, baseOpcaoContrato);
    expect(htmlSemLogo).not.toContain('<div class="letterhead"><img');
  });

  it('carregarDadosDocumentosCompletos integra dados do Supabase e mescla conforme o papel', async () => {
    const logoMock = 'https://exemplo.com/logo-escritorio.png';
    const dadosEscritorio = {
      chave: 'escritorio',
      tipo_escopo: 'escritorio',
      logo_url: logoMock,
      config_institucional: { empresa: 'Advocacia Edvaldo Rodrigues Associados' },
      padroes_json: {
        contrato: {
          ...DEFAULTS_FORM_DOCUMENTO.contrato,
          multa: '20',
        },
      },
    };

    const dadosUsuario = {
      chave: 'usuario_user-999',
      tipo_escopo: 'usuario',
      padroes_json: {
        contrato: {
          ...DEFAULTS_FORM_DOCUMENTO.contrato,
          multa: '15',
        },
      },
    };

    // Mock do Supabase
    vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: [dadosEscritorio, dadosUsuario],
          error: null,
        }),
      }),
    } as any);

    // 1. Usuário comum: recebe multa: '15' (sua sobreposição) e o logotipo do escritório
    const dadosComum = await carregarDadosDocumentosCompletos('user-999', false);
    expect(dadosComum.logo).toBe(logoMock);
    expect(dadosComum.config.empresa).toBe('Advocacia Edvaldo Rodrigues Associados');
    expect(dadosComum.padroes.contrato?.multa).toBe('15');

    // 2. Administrador: opera sobre os padrões oficiais do escritório (multa: '20')
    const dadosAdmin = await carregarDadosDocumentosCompletos('user-999', true);
    expect(dadosAdmin.logo).toBe(logoMock);
    expect(dadosAdmin.padroes.contrato?.multa).toBe('20');
  });
});

describe('Histórico de Emissões: Persistência Robusta com Múltiplos Clientes e Fallback', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('deve salvar documento emitido com múltiplos clientes mesmo se advogado_id for nulo', async () => {
    const adminUserId = 'admin-user-sem-adv-id';
    const titulo = 'Pacote (2 docs) - MARIA DAS DORES e JOÃO PEREIRA DA SILVA';
    const clienteNomes = 'MARIA DAS DORES e JOÃO PEREIRA DA SILVA';

    const item = await salvarHistoricoDocumento({
      advogado_id: null,
      user_id: adminUserId,
      cliente_id: mockCliente.id,
      cliente_nome: clienteNomes,
      tipo: 'lote',
      numero: 'ERF-0001/2026',
      titulo,
      html_content: '<div class="package-document">teste</div>',
      opcoes_json: { contrato: { valorFixo: '5.000,00' } },
    });

    expect(item).toBeDefined();
    expect(item.id).toBeDefined();
    expect(item.cliente_nome).toBe('MARIA DAS DORES e JOÃO PEREIRA DA SILVA');
    expect(item.titulo).toBe(titulo);
    expect(item.advogado_id).toBeNull();
    expect(item.user_id).toBe(adminUserId);

    // Deve estar no cache local imediatamente
    const historicoLocal = carregarHistoricoLocal();
    expect(historicoLocal).toHaveLength(1);
    expect(historicoLocal[0].numero).toBe('ERF-0001/2026');
    expect(historicoLocal[0].cliente_nome).toBe('MARIA DAS DORES e JOÃO PEREIRA DA SILVA');
  });

  it('deve carregar histórico com fallback local caso o Supabase falhe ou tabela não exista', async () => {
    // Simula erro de tabela inexistente no Supabase (PGRST205)
    vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST205', message: "Could not find the table 'public.documentos_emitidos' in the schema cache" },
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST205', message: "Could not find the table 'public.documentos_emitidos' in the schema cache" },
          }),
        }),
      }),
    } as any);

    // Salva item local
    await salvarHistoricoDocumento({
      cliente_nome: 'MARIA DAS DORES',
      tipo: 'contrato',
      numero: 'ERF-0002/2026',
      titulo: 'Contrato de Honorários - MARIA DAS DORES',
      html_content: '<div>contrato</div>',
    });

    // carregarHistoricoCompleto deve retornar com sucesso o item salvo no cache local
    const historico = await carregarHistoricoCompleto('admin-123', true);
    expect(historico).toHaveLength(1);
    expect(historico[0].numero).toBe('ERF-0002/2026');
  });

  it('deve mesclar documentos remotos do Supabase com o cache local sem duplicação', async () => {
    const docRemoto = {
      id: 'doc-remoto-1',
      user_id: 'user-1',
      advogado_id: null,
      cliente_id: 'cli-1',
      cliente_nome: 'CLIENTE REMOTO SUPABASE',
      tipo: 'procuracao',
      numero: 'ERF-0010/2026',
      titulo: 'Procuração - CLIENTE REMOTO SUPABASE',
      html_content: '<div>proc</div>',
      opcoes_json: null,
      emitido_em: '2026-10-02T10:00:00.000Z',
      updated_at: '2026-10-02T10:00:00.000Z',
    };

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: [docRemoto],
            error: null,
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }),
    } as any);

    // Salva documento local
    await salvarHistoricoDocumento({
      id: 'doc-local-2',
      cliente_nome: 'CLIENTE LOCAL',
      tipo: 'contrato',
      numero: 'ERF-0011/2026',
      titulo: 'Contrato - CLIENTE LOCAL',
      html_content: '<div>contrato</div>',
    });

    const consolidado = await carregarHistoricoCompleto('user-1', false);
    expect(consolidado).toHaveLength(2);
    expect(consolidado.some(d => d.numero === 'ERF-0010/2026')).toBe(true);
    expect(consolidado.some(d => d.numero === 'ERF-0011/2026')).toBe(true);
  });

  it('deve remover documento emitido tanto do cache local quanto enviar exclusão ao banco', async () => {
    const deleteMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    vi.spyOn(supabase, 'from').mockReturnValue({
      delete: deleteMock,
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }),
    } as any);

    const doc = await salvarHistoricoDocumento({
      id: 'doc-a-excluir',
      cliente_nome: 'CLIENTE PARA EXCLUSÃO',
      tipo: 'recibo',
      numero: 'ERF-0099/2026',
      titulo: 'Recibo - CLIENTE PARA EXCLUSÃO',
      html_content: '<div>recibo</div>',
    });

    expect(carregarHistoricoLocal()).toHaveLength(1);

    await excluirHistoricoDocumento(doc.id);

    expect(carregarHistoricoLocal()).toHaveLength(0);
    expect(deleteMock).toHaveBeenCalled();
  });

  describe('Discriminação de Documentos Emitidos e Retomada de Configurações do Histórico', () => {
    it('deve extrair e discriminar nomes amigáveis de documentos a partir de opcoes_json.tipos_documentos', () => {
      const doc = {
        tipo: 'lote',
        titulo: 'Pacote (2 docs: Contrato de honorários, Procuração) - Teste',
        opcoes_json: {
          tipos_documentos: ['contrato', 'procuracao'],
          docs_selecionados: { contrato: true, procuracao: true, hipossuficiencia: false },
        },
      };

      const tipos = extrairTiposDocumentoEmitido(doc);
      expect(tipos).toEqual(['contrato', 'procuracao']);

      const nomes = formatarNomesDocumentosEmitidos(doc);
      expect(nomes).toEqual(['Contrato de honorários', 'Procuração']);
    });

    it('deve discriminar documentos em lote por inferência de html_content para documentos legados', () => {
      const docLegadoSemOpcoes = {
        tipo: 'lote',
        titulo: 'Pacote (2 docs) - Teste Legado',
        html_content: '<div class="contrato-body">CONTRATO DE PRESTAÇÃO DE SERVIÇOS</div><div class="proc">PROCURAÇÃO AD JUDICIA</div>',
      };

      const nomes = formatarNomesDocumentosEmitidos(docLegadoSemOpcoes);
      expect(nomes).toContain('Contrato de honorários');
      expect(nomes).toContain('Procuração');
    });

    it('deve discriminar documento único corretamente pelo tipo', () => {
      const docUnico = {
        tipo: 'recibo',
        titulo: 'Recibo de Pagamento - Maria',
      };

      const nomes = formatarNomesDocumentosEmitidos(docUnico);
      expect(nomes).toEqual(['Recibo de pagamento']);
    });

    it('deve persistir dados completos de múltiplos clientes e cláusulas em opcoes_json para retomada', async () => {
      const clientePrincipal = {
        id: 'cli-princ',
        nome_razao_social: 'Cliente Titular',
        cpf_cnpj: '111.111.111-11',
      };

      const clienteAdicional = {
        id: 'cli-adic',
        nome_razao_social: 'Cliente Co-contratante',
        cpf_cnpj: '222.222.222-22',
      };

      const clausulasCustomizadas = [
        { id: 'c1', titulo: 'CLÁUSULA PRIMEIRA - OBJETO', texto: 'Texto personalizado do contrato' },
      ];

      const docEmitido = await salvarHistoricoDocumento({
        cliente_id: clientePrincipal.id,
        cliente_nome: `${clientePrincipal.nome_razao_social} e ${clienteAdicional.nome_razao_social}`,
        tipo: 'lote',
        numero: 'ERF-0077/2026',
        titulo: 'Pacote (2 docs: Contrato de honorários, Procuração) - Titular e Co-contratante',
        html_content: '<div>HTML</div>',
        opcoes_json: {
          tipos_documentos: ['contrato', 'procuracao'],
          docs_selecionados: { contrato: true, procuracao: true, hipossuficiencia: false, irpf: false, residencia: false, recibo: false },
          cliente_principal: clientePrincipal,
          clientes_adicionais: [clienteAdicional],
          contrato: {
            objeto: 'Defesa trabalhista específica',
            valorFixo: '5.000,00',
            clausulas: clausulasCustomizadas,
          },
        },
      });

      expect(docEmitido.opcoes_json).toBeDefined();
      const opts = docEmitido.opcoes_json as any;
      expect(opts.tipos_documentos).toEqual(['contrato', 'procuracao']);
      expect(opts.cliente_principal.nome_razao_social).toBe('Cliente Titular');
      expect(opts.clientes_adicionais).toHaveLength(1);
      expect(opts.clientes_adicionais[0].nome_razao_social).toBe('Cliente Co-contratante');
      expect(opts.contrato.clausulas[0].texto).toBe('Texto personalizado do contrato');
    });
  });
});




