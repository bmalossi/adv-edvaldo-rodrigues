import { describe, it, expect } from 'vitest';
import {
  validarCpfCnpj,
  sanitizarDadosClienteAsaas,
  gerarExternalReference,
  validarDadosCobranca,
  montarPayloadCobrancaAsaas,
  montarPayloadAssinaturaAsaas,
  processarEventoWebhookAsaas,
  mascaraCpfCnpj,
  mascaraTelefone,
  mascaraCep,
  traduzirErroAsaas,
  mascaraDataBrasileira,
  converterDataBrParaIso,
  converterDataIsoParaBr,
  validarDataBrasileira,
  mascaraMoeda,
  converterMoedaParaNumero,
  formatarMoedaBrl,
  ClienteAsaasPayload,
} from '@/domain/crm/asaas';

describe('Domínio Asaas: Validações, Sanitização e Idempotência', () => {
  describe('Validação algorítmica de CPF e CNPJ', () => {
    it('valida CPF correto com formatação e dígitos válidos', () => {
      // CPF matematicamente válido conhecido
      const cpfValido = '52998224725';
      const formatado = '529.982.247-25';
      expect(validarCpfCnpj(cpfValido).valido).toBe(true);
      expect(validarCpfCnpj(formatado).valido).toBe(true);
      expect(validarCpfCnpj(formatado).tipo).toBe('CPF');
    });

    it('rejeita CPF com todos os dígitos repetidos', () => {
      expect(validarCpfCnpj('111.111.111-11').valido).toBe(false);
      expect(validarCpfCnpj('00000000000').valido).toBe(false);
    });

    it('rejeita CPF com dígitos verificadores incorretos', () => {
      expect(validarCpfCnpj('52998224726').valido).toBe(false);
    });

    it('valida CNPJ correto com dígitos válidos', () => {
      // CNPJ matematicamente válido
      const cnpjValido = '11222333000181';
      const formatado = '11.222.333/0001-81';
      expect(validarCpfCnpj(cnpjValido).valido).toBe(true);
      expect(validarCpfCnpj(formatado).valido).toBe(true);
      expect(validarCpfCnpj(formatado).tipo).toBe('CNPJ');
    });

    it('rejeita CNPJ com dígitos inválidos', () => {
      expect(validarCpfCnpj('11.222.333/0001-99').valido).toBe(false);
      expect(validarCpfCnpj('00000000000000').valido).toBe(false);
    });
  });

  describe('Sanitização e Preparação de Dados para o Asaas', () => {
    it('formata payload do cliente com telefones e documentos higienizados', () => {
      const clienteOrigem = {
        nome_razao_social: 'Dr. João da Silva Santos',
        cpf_cnpj: '529.982.247-25',
        email: 'joao.silva@exemplo.com.br',
        telefone_whatsapp: '(11) 98765-4321',
        endereco_cep: '01310-100',
        endereco_logradouro: 'Avenida Paulista',
        endereco_numero: '1000',
        endereco_complemento: 'Apto 42',
        endereco_bairro: 'Bela Vista',
      };

      const payload: ClienteAsaasPayload = sanitizarDadosClienteAsaas(clienteOrigem);

      expect(payload.name).toBe('Dr. João da Silva Santos');
      expect(payload.cpfCnpj).toBe('52998224725');
      expect(payload.email).toBe('joao.silva@exemplo.com.br');
      expect(payload.mobilePhone).toBe('11987654321');
      expect(payload.postalCode).toBe('01310100');
      expect(payload.address).toBe('Avenida Paulista');
      expect(payload.addressNumber).toBe('1000');
      expect(payload.province).toBe('Bela Vista');
    });
  });

  describe('Geração de Chave de Idempotência (External Reference)', () => {
    it('gera chave determinística para contrato e parcela', () => {
      const ref = gerarExternalReference({
        casoId: 'caso-uuid-1',
        contratoId: 'contrato-uuid-2',
        parcela: 1,
      });

      expect(ref).toBe('caso_caso-uuid-1_contrato_contrato-uuid-2_p1');
    });
  });

  describe('Validação e Montagem de Cobrança no Asaas', () => {
    it('rejeita cobrança com valor menor ou igual a zero', () => {
      const res = validarDadosCobranca({
        valor: 0,
        data_vencimento: '2026-11-01',
        tipo_cobranca: 'PIX',
      });
      expect(res.valido).toBe(false);
      expect(res.erro).toContain('Valor');
    });

    it('rejeita cobrança com valor menor que R$ 5,00 (mínimo do Asaas)', () => {
      const res = validarDadosCobranca({
        valor: 1.0,
        data_vencimento: '2026-11-01',
        tipo_cobranca: 'PIX',
      });
      expect(res.valido).toBe(false);
      expect(res.erro).toContain('5,00');
    });

    it('rejeita cobrança sem data de vencimento', () => {
      const res = validarDadosCobranca({
        valor: 1500,
        data_vencimento: '',
        tipo_cobranca: 'BOLETO',
      });
      expect(res.valido).toBe(false);
      expect(res.erro).toContain('vencimento');
    });

    it('monta payload de cobrança à vista no Pix', () => {
      const payload = montarPayloadCobrancaAsaas({
        customer: 'cus_12345',
        tipo_cobranca: 'PIX',
        forma: 'avista',
        valor: 2500,
        data_vencimento: '2026-11-10',
        descricao: 'Honorários advocatícios - Consulta inicial',
        externalReference: 'caso_123_contrato_456_p1',
      });

      expect(payload.customer).toBe('cus_12345');
      expect(payload.billingType).toBe('PIX');
      expect(payload.value).toBe(2500);
      expect(payload.dueDate).toBe('2026-11-10');
      expect(payload.description).toBe('Honorários advocatícios - Consulta inicial');
      expect(payload.externalReference).toBe('caso_123_contrato_456_p1');
    });

    it('monta payload de cobrança parcelada com cálculo correto', () => {
      const payload = montarPayloadCobrancaAsaas({
        customer: 'cus_12345',
        tipo_cobranca: 'BOLETO',
        forma: 'parcelado',
        valor: 3000,
        data_vencimento: '2026-11-10',
        numero_parcelas: 3,
        descricao: 'Honorários parcelados',
      });

      expect(payload.billingType).toBe('BOLETO');
      expect(payload.installmentCount).toBe(3);
      expect(payload.totalValue).toBe(3000);
    });

    it('monta payload de assinatura de partido mensal com ciclo MONTHLY', () => {
      const payload = montarPayloadAssinaturaAsaas({
        customer: 'cus_12345',
        tipo_cobranca: 'PIX',
        valor: 1500,
        nextDueDate: '2026-11-05',
        descricao: 'Assessoria Jurídica Mensal',
        externalReference: 'sub_caso_123',
      });

      expect(payload.cycle).toBe('MONTHLY');
      expect(payload.value).toBe(1500);
      expect(payload.nextDueDate).toBe('2026-11-05');
      expect(payload.billingType).toBe('PIX');
      expect(payload.externalReference).toBe('sub_caso_123');
    });
  });

  describe('Reducer de Processamento de Webhook do Asaas', () => {
    it('promove cliente para ativo e avança caso para Fechamento em PAYMENT_CONFIRMED', () => {
      const evento = {
        event: 'PAYMENT_CONFIRMED',
        payment: {
          id: 'pay_123',
          customer: 'cus_123',
          value: 2000,
          netValue: 1950,
          billingType: 'PIX',
          status: 'CONFIRMED',
          clientPaymentDate: '2026-10-08',
        },
        clienteAtual: {
          id: 'cli_1',
          status_ciclo: 'lead' as const,
        },
        casoAtual: {
          id: 'caso_1',
          fase_funil: 'negociacao',
        },
      };

      const resultado = processarEventoWebhookAsaas(evento);

      expect(resultado.novoStatusCobranca).toBe('CONFIRMED');
      expect(resultado.devePromoverCliente).toBe(true);
      expect(resultado.novoStatusCicloCliente).toBe('ativo');
      expect(resultado.deveAvancarCaso).toBe(true);
      expect(resultado.novaEtapaNomeCaso).toBe('Fechamento');
      expect(resultado.descricaoInteracao).toContain('PIX');
      expect(resultado.descricaoInteracao).toContain('2000');
    });

    it('gera alerta sem avançar caso nem regredir cliente em PAYMENT_OVERDUE', () => {
      const evento = {
        event: 'PAYMENT_OVERDUE',
        payment: {
          id: 'pay_123',
          customer: 'cus_123',
          value: 500,
          billingType: 'BOLETO',
          status: 'OVERDUE',
        },
        clienteAtual: {
          id: 'cli_1',
          status_ciclo: 'ativo' as const,
        },
      };

      const resultado = processarEventoWebhookAsaas(evento);

      expect(resultado.novoStatusCobranca).toBe('OVERDUE');
      expect(resultado.devePromoverCliente).toBe(false);
      expect(resultado.deveAvancarCaso).toBe(false);
      expect(resultado.descricaoInteracao).toContain('vencida');
    });

    it('processa PAYMENT_UPDATED registrando novo valor e vencimento', () => {
      const evento = {
        event: 'PAYMENT_UPDATED',
        payment: {
          id: 'pay_upd',
          customer: 'cus_1',
          value: 750,
          dueDate: '2026-11-20',
          billingType: 'BOLETO',
          status: 'PENDING',
        },
        clienteAtual: { id: 'cli_1', status_ciclo: 'ativo' as const },
      };

      const resultado = processarEventoWebhookAsaas(evento);
      expect(resultado.novoStatusCobranca).toBe('PENDING');
      expect(resultado.descricaoInteracao).toContain('750.00');
      expect(resultado.descricaoInteracao).toContain('2026-11-20');
    });

    it('processa PAYMENT_DELETED alterando status para CANCELLED', () => {
      const evento = {
        event: 'PAYMENT_DELETED',
        payment: {
          id: 'pay_del',
          customer: 'cus_1',
          value: 300,
          billingType: 'PIX',
          status: 'DELETED',
        },
        clienteAtual: { id: 'cli_1', status_ciclo: 'ativo' as const },
      };

      const resultado = processarEventoWebhookAsaas(evento);
      expect(resultado.novoStatusCobranca).toBe('CANCELLED');
      expect(resultado.descricaoInteracao).toContain('cancelada');
    });

    it('processa PAYMENT_REFUNDED alterando status para REFUNDED com alerta', () => {
      const evento = {
        event: 'PAYMENT_REFUNDED',
        payment: {
          id: 'pay_ref',
          customer: 'cus_1',
          value: 1200,
          billingType: 'CREDIT_CARD',
          status: 'REFUNDED',
        },
        clienteAtual: { id: 'cli_1', status_ciclo: 'ativo' as const },
      };

      const resultado = processarEventoWebhookAsaas(evento);
      expect(resultado.novoStatusCobranca).toBe('REFUNDED');
      expect(resultado.descricaoInteracao).toContain('ESTORNO');
    });

    it('processa PAYMENT_CHARGEBACK_REQUESTED com status CHARGEBACK e alerta crítico', () => {
      const evento = {
        event: 'PAYMENT_CHARGEBACK_REQUESTED',
        payment: {
          id: 'pay_chg',
          customer: 'cus_1',
          value: 2500,
          billingType: 'CREDIT_CARD',
          status: 'CHARGEBACK_REQUESTED',
        },
        clienteAtual: { id: 'cli_1', status_ciclo: 'ativo' as const },
      };

      const resultado = processarEventoWebhookAsaas(evento);
      expect(resultado.novoStatusCobranca).toBe('CHARGEBACK');
      expect(resultado.descricaoInteracao).toContain('CRÍTICO CHARGEBACK');
    });
  });

  describe('Formatação de Máscaras e Hardening de Interface', () => {
    it('formata CPF com máscara progressiva', () => {
      expect(mascaraCpfCnpj('52998224725')).toBe('529.982.247-25');
    });

    it('formata CNPJ com máscara progressiva', () => {
      expect(mascaraCpfCnpj('11222333000181')).toBe('11.222.333/0001-81');
    });

    it('formata celular brasileiro com DDD', () => {
      expect(mascaraTelefone('11987654321')).toBe('(11) 98765-4321');
      expect(mascaraTelefone('1133334444')).toBe('(11) 3333-4444');
    });

    it('formata CEP brasileiro', () => {
      expect(mascaraCep('01310100')).toBe('01310-100');
    });

    it('traduz erros técnicos comuns da API Asaas para orientações claras', () => {
      const erroCpf = {
        errors: [{ code: 'invalid_cpf', description: 'O CPF informado é inválido' }],
      };
      expect(traduzirErroAsaas(erroCpf)).toContain('CPF');

      const erroArray = [
        { code: 'invalid_object', description: 'O valor da cobrança (R$ 1,00) menos o valor do desconto (R$ 0,00) não pode ser menor que R$ 5,00.' }
      ];
      expect(traduzirErroAsaas(erroArray)).toContain('não pode ser menor que R$ 5,00');

      const erroGenerico = 'Unauthorized';
      expect(traduzirErroAsaas(erroGenerico)).toContain('Chave de API');

      const erroEdgeHttp = 'FunctionsHttpError: Edge Function returned a non-2xx status code';
      expect(traduzirErroAsaas(erroEdgeHttp)).toContain('comunicação com a API do Asaas');
    });

    it('aplica máscara de data brasileira progressiva DD/MM/AAAA', () => {
      expect(mascaraDataBrasileira('14')).toBe('14');
      expect(mascaraDataBrasileira('1410')).toBe('14/10');
      expect(mascaraDataBrasileira('14102026')).toBe('14/10/2026');
      expect(mascaraDataBrasileira('14/10/2026')).toBe('14/10/2026');
    });

    it('converte corretamente entre DD/MM/AAAA e ISO YYYY-MM-DD', () => {
      expect(converterDataBrParaIso('14/10/2026')).toBe('2026-10-14');
      expect(converterDataIsoParaBr('2026-10-14')).toBe('14/10/2026');
      expect(validarDataBrasileira('14/10/2026')).toBe(true);
      expect(validarDataBrasileira('31/02/2026')).toBe(false);
      expect(validarDataBrasileira('99/99/9999')).toBe(false);
    });

    it('monta payload com Pergunte ao Cliente (UNDEFINED), juros, multa, desconto e correios', () => {
      const payload = montarPayloadCobrancaAsaas({
        customer: 'cus_1',
        tipo_cobranca: 'UNDEFINED',
        forma: 'avista',
        valor: 1500,
        data_vencimento: '2026-10-25',
        descricao: 'Honorários com juros e desconto',
        postalService: true,
        interest: { value: 1, type: 'PERCENTAGE' },
        fine: { value: 2, type: 'PERCENTAGE' },
        discount: { value: 50, type: 'FIXED', dueDateLimitDays: 5 },
      });

      expect(payload.billingType).toBe('UNDEFINED');
      expect(payload.postalService).toBe(true);
      expect(payload.interest?.value).toBe(1);
      expect(payload.fine?.value).toBe(2);
      expect(payload.discount?.value).toBe(50);
      expect(payload.discount?.dueDateLimitDays).toBe(5);
    });

    it('aplica máscara monetária brasileira progressiva com ponto e vírgula', () => {
      expect(mascaraMoeda('')).toBe('');
      expect(mascaraMoeda('1')).toBe('0,01');
      expect(mascaraMoeda('15')).toBe('0,15');
      expect(mascaraMoeda('150')).toBe('1,50');
      expect(mascaraMoeda('1500')).toBe('15,00');
      expect(mascaraMoeda('15000')).toBe('150,00');
      expect(mascaraMoeda('150000')).toBe('1.500,00');
      expect(mascaraMoeda('100000000')).toBe('1.000.000,00');
      // Aceita também número já existente
      expect(mascaraMoeda(1500)).toBe('1.500,00');
      expect(mascaraMoeda(250.5)).toBe('250,50');
    });

    it('converte string de moeda brasileira formatada para número float', () => {
      expect(converterMoedaParaNumero('')).toBe(0);
      expect(converterMoedaParaNumero(undefined)).toBe(0);
      expect(converterMoedaParaNumero('0,01')).toBe(0.01);
      expect(converterMoedaParaNumero('15,00')).toBe(15);
      expect(converterMoedaParaNumero('1.500,00')).toBe(1500);
      expect(converterMoedaParaNumero('1.000.000,50')).toBe(1000000.5);
      expect(converterMoedaParaNumero(1500)).toBe(1500);
    });

    it('formata número float para padrão de moeda brasileira BRL', () => {
      const formatado = formatarMoedaBrl(1500);
      // Contém 1.500,00 e o símbolo R$ (podendo ter non-breaking space)
      expect(formatado).toMatch(/1\.500,00/);
      expect(formatado).toMatch(/R\$/);
    });
  });
});




