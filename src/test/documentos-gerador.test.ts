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
} from '@/domain/crm/documentos/config-local';
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



