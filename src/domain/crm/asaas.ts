export type TipoCobrancaAsaas = 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'UNDEFINED';

export type StatusCobrancaAsaas =
  | 'PENDING'
  | 'RECEIVED'
  | 'CONFIRMED'
  | 'OVERDUE'
  | 'REFUNDED'
  | 'CANCELLED'
  | 'CHARGEBACK';

export interface ClienteAsaasPayload {
  name: string;
  cpfCnpj: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  postalCode?: string;
  externalReference?: string;
  notificationDisabled?: boolean;
}

export interface CobrancaAsaas {
  id: string;
  cliente_id: string;
  caso_id?: string | null;
  contrato_financeiro_id?: string | null;
  asaas_payment_id?: string | null;
  asaas_subscription_id?: string | null;
  tipo_cobranca: TipoCobrancaAsaas;
  forma: 'avista' | 'parcelado' | 'assinatura';
  status: StatusCobrancaAsaas;
  valor: number;
  valor_liquido?: number | null;
  data_vencimento: string;
  data_pagamento?: string | null;
  invoice_url?: string | null;
  bank_slip_url?: string | null;
  pix_qrcode_image?: string | null;
  pix_copia_cola?: string | null;
  linha_digitavel?: string | null;
  external_reference?: string | null;
  numero_parcela?: number;
  total_parcelas?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ResultadoValidacaoDocumento {
  valido: boolean;
  tipo?: 'CPF' | 'CNPJ';
  erro?: string;
  documentoLimpo?: string;
}

/**
 * Remove qualquer caractere não numérico
 */
export function apenasNumeros(valor?: string | null): string {
  if (!valor) return '';
  return valor.replace(/\D/g, '');
}

/**
 * Validação algorítmica rigorosa de CPF e CNPJ (dígitos verificadores)
 */
export function validarCpfCnpj(doc?: string | null): ResultadoValidacaoDocumento {
  const limpo = apenasNumeros(doc);

  if (limpo.length === 11) {
    // Validação de CPF
    if (/^(\d)\1{10}$/.test(limpo)) {
      return { valido: false, tipo: 'CPF', erro: 'CPF com dígitos repetidos é inválido' };
    }

    let soma = 0;
    for (let i = 0; i < 9; i++) {
      soma += parseInt(limpo.charAt(i), 10) * (10 - i);
    }
    let resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(limpo.charAt(9), 10)) {
      return { valido: false, tipo: 'CPF', erro: 'Primeiro dígito verificador inválido' };
    }

    soma = 0;
    for (let i = 0; i < 10; i++) {
      soma += parseInt(limpo.charAt(i), 10) * (11 - i);
    }
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(limpo.charAt(10), 10)) {
      return { valido: false, tipo: 'CPF', erro: 'Segundo dígito verificador inválido' };
    }

    return { valido: true, tipo: 'CPF', documentoLimpo: limpo };
  }

  if (limpo.length === 14) {
    // Validação de CNPJ
    if (/^(\d)\1{13}$/.test(limpo)) {
      return { valido: false, tipo: 'CNPJ', erro: 'CNPJ com dígitos repetidos é inválido' };
    }

    const pesosPrimeiro = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let i = 0; i < 12; i++) {
      soma += parseInt(limpo.charAt(i), 10) * pesosPrimeiro[i];
    }
    let resto = soma % 11;
    const digito1 = resto < 2 ? 0 : 11 - resto;
    if (digito1 !== parseInt(limpo.charAt(12), 10)) {
      return { valido: false, tipo: 'CNPJ', erro: 'Primeiro dígito verificador do CNPJ inválido' };
    }

    const pesosSegundo = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    soma = 0;
    for (let i = 0; i < 13; i++) {
      soma += parseInt(limpo.charAt(i), 10) * pesosSegundo[i];
    }
    resto = soma % 11;
    const digito2 = resto < 2 ? 0 : 11 - resto;
    if (digito2 !== parseInt(limpo.charAt(13), 10)) {
      return { valido: false, tipo: 'CNPJ', erro: 'Segundo dígito verificador do CNPJ inválido' };
    }

    return { valido: true, tipo: 'CNPJ', documentoLimpo: limpo };
  }

  return {
    valido: false,
    erro: `Documento deve conter 11 dígitos (CPF) ou 14 dígitos (CNPJ), recebidos: ${limpo.length}`,
  };
}

/**
 * Higieniza dados de cadastro do cliente interno para o formato esperado pelo Asaas v3
 */
export function sanitizarDadosClienteAsaas(cliente: {
  nome_razao_social: string;
  cpf_cnpj?: string | null;
  email?: string | null;
  telefone_whatsapp?: string | null;
  endereco_cep?: string | null;
  endereco_logradouro?: string | null;
  endereco_numero?: string | null;
  endereco_complemento?: string | null;
  endereco_bairro?: string | null;
  id?: string;
}): ClienteAsaasPayload {
  const docLimpo = apenasNumeros(cliente.cpf_cnpj);
  const telLimpo = apenasNumeros(cliente.telefone_whatsapp);
  const cepLimpo = apenasNumeros(cliente.endereco_cep);

  return {
    name: cliente.nome_razao_social.trim(),
    cpfCnpj: docLimpo,
    email: cliente.email?.trim() || undefined,
    mobilePhone: telLimpo || undefined,
    phone: telLimpo || undefined,
    postalCode: cepLimpo || undefined,
    address: cliente.endereco_logradouro?.trim() || undefined,
    addressNumber: cliente.endereco_numero?.trim() || undefined,
    complement: cliente.endereco_complemento?.trim() || undefined,
    province: cliente.endereco_bairro?.trim() || undefined,
    externalReference: cliente.id ? `cliente_${cliente.id}` : undefined,
    notificationDisabled: false,
  };
}

/**
 * Gera chave determinística de idempotência para cobranças
 */
export function gerarExternalReference(params: {
  casoId?: string | null;
  contratoId?: string | null;
  parcela?: number;
  clienteId?: string | null;
}): string {
  const parts: string[] = [];
  if (params.casoId) parts.push(`caso_${params.casoId}`);
  if (params.contratoId) parts.push(`contrato_${params.contratoId}`);
  if (params.clienteId && !params.casoId) parts.push(`cliente_${params.clienteId}`);
  if (params.parcela) parts.push(`p${params.parcela}`);

  return parts.join('_') || `ref_${Date.now()}`;
}

export interface ValidarCobrancaInput {
  valor: number;
  data_vencimento: string;
  tipo_cobranca: TipoCobrancaAsaas;
}

export function validarDadosCobranca(input: ValidarCobrancaInput): { valido: boolean; erro?: string } {
  if (!input.valor || input.valor <= 0) {
    return { valido: false, erro: 'Valor da cobrança deve ser maior que zero (R$ 0,00).' };
  }
  if (!input.data_vencimento || !input.data_vencimento.trim()) {
    return { valido: false, erro: 'Data de vencimento é obrigatória.' };
  }
  return { valido: true };
}

export interface RegraDescontoAsaas {
  value: number;
  dueDateLimitDays?: number;
  type?: 'PERCENTAGE' | 'FIXED';
}

export interface RegraJurosAsaas {
  value: number;
  type?: 'PERCENTAGE' | 'FIXED';
}

export interface RegraMultaAsaas {
  value: number;
  type?: 'PERCENTAGE' | 'FIXED';
}

export interface MontarCobrancaParams {
  customer: string;
  tipo_cobranca: TipoCobrancaAsaas;
  forma: 'avista' | 'parcelado' | 'assinatura';
  valor: number;
  data_vencimento: string;
  descricao?: string;
  numero_parcelas?: number;
  externalReference?: string;
  postalService?: boolean;
  discount?: RegraDescontoAsaas;
  fine?: RegraMultaAsaas;
  interest?: RegraJurosAsaas;
}

export interface AsaasPaymentPayload {
  customer: string;
  billingType: TipoCobrancaAsaas;
  value?: number;
  totalValue?: number;
  installmentCount?: number;
  installmentValue?: number;
  dueDate: string;
  description?: string;
  externalReference?: string;
  postalService?: boolean;
  discount?: RegraDescontoAsaas;
  fine?: RegraMultaAsaas;
  interest?: RegraJurosAsaas;
}

export function montarPayloadCobrancaAsaas(params: MontarCobrancaParams): AsaasPaymentPayload {
  const isParcelado = params.forma === 'parcelado' && (params.numero_parcelas || 1) > 1;

  const payload: AsaasPaymentPayload = {
    customer: params.customer,
    billingType: params.tipo_cobranca,
    dueDate: params.data_vencimento,
    description: params.descricao,
    externalReference: params.externalReference,
    postalService: Boolean(params.postalService),
  };

  if (isParcelado) {
    payload.installmentCount = params.numero_parcelas;
    payload.totalValue = params.valor;
  } else {
    payload.value = params.valor;
  }

  if (params.discount && params.discount.value > 0) {
    payload.discount = {
      value: params.discount.value,
      dueDateLimitDays: params.discount.dueDateLimitDays ?? 0,
      type: params.discount.type || 'PERCENTAGE',
    };
  }

  if (params.fine && params.fine.value > 0) {
    payload.fine = {
      value: params.fine.value,
      type: params.fine.type || 'PERCENTAGE',
    };
  }

  if (params.interest && params.interest.value > 0) {
    payload.interest = {
      value: params.interest.value,
      type: params.interest.type || 'PERCENTAGE',
    };
  }

  return payload;
}

export interface MontarAssinaturaParams {
  customer: string;
  tipo_cobranca: TipoCobrancaAsaas;
  valor: number;
  nextDueDate: string;
  descricao?: string;
  externalReference?: string;
}

export interface AsaasSubscriptionPayload {
  customer: string;
  billingType: TipoCobrancaAsaas;
  value: number;
  nextDueDate: string;
  cycle: 'MONTHLY';
  description?: string;
  externalReference?: string;
}

export function montarPayloadAssinaturaAsaas(params: MontarAssinaturaParams): AsaasSubscriptionPayload {
  return {
    customer: params.customer,
    billingType: params.tipo_cobranca,
    value: params.valor,
    nextDueDate: params.nextDueDate,
    cycle: 'MONTHLY',
    description: params.descricao || 'Partido Mensal - Assessoria Jurídica',
    externalReference: params.externalReference,
  };
}

export interface WebhookEventoInput {
  event: string;
  payment: {
    id: string;
    customer: string;
    value: number;
    netValue?: number;
    billingType: string;
    status: string;
    dueDate?: string;
    paymentDate?: string;
    clientPaymentDate?: string;
    description?: string;
  };
  clienteAtual: {
    id: string;
    status_ciclo: 'lead' | 'consulta' | 'ativo' | 'encerrado';
  };
  casoAtual?: {
    id: string;
    fase_funil: string;
    etapa_id?: string;
    etapa_nome?: string;
  } | null;
}

export interface ResultadoProcessamentoWebhook {
  novoStatusCobranca: StatusCobrancaAsaas;
  dataPagamento?: string | null;
  devePromoverCliente: boolean;
  novoStatusCicloCliente?: 'lead' | 'consulta' | 'ativo' | 'encerrado';
  deveAvancarCaso: boolean;
  novaEtapaNomeCaso?: string;
  descricaoInteracao: string;
  tipoInteracao: 'whatsapp' | 'ligacao' | 'reuniao' | 'email' | 'nota_interna';
}

export function processarEventoWebhookAsaas(input: WebhookEventoInput): ResultadoProcessamentoWebhook {
  const isConfirmado = input.event === 'PAYMENT_RECEIVED' || input.event === 'PAYMENT_CONFIRMED';
  const isVencido = input.event === 'PAYMENT_OVERDUE';
  const isAtualizado = input.event === 'PAYMENT_UPDATED';
  const isCancelado = input.event === 'PAYMENT_DELETED';
  const isRestaurado = input.event === 'PAYMENT_RESTORED';
  const isEstornado = input.event === 'PAYMENT_REFUNDED' || input.event === 'PAYMENT_PARTIALLY_REFUNDED';
  const isChargeback = input.event === 'PAYMENT_CHARGEBACK_REQUESTED' || input.event === 'PAYMENT_CHARGEBACK_DISPUTE';
  const dataPgto = input.payment.clientPaymentDate || input.payment.paymentDate || new Date().toISOString();

  if (isConfirmado) {
    const devePromover = input.clienteAtual.status_ciclo === 'lead' || input.clienteAtual.status_ciclo === 'consulta';
    const deveAvancar = input.casoAtual?.fase_funil === 'negociacao';

    return {
      novoStatusCobranca: 'CONFIRMED',
      dataPagamento: dataPgto,
      devePromoverCliente: devePromover,
      novoStatusCicloCliente: devePromover ? 'ativo' : undefined,
      deveAvancarCaso: deveAvancar,
      novaEtapaNomeCaso: deveAvancar ? 'Fechamento' : undefined,
      descricaoInteracao: `Pagamento de honorários confirmado via Asaas (${input.payment.billingType}): R$ ${input.payment.value.toFixed(2)}. Fatura ref: ${input.payment.id}.`,
      tipoInteracao: 'nota_interna',
    };
  }

  if (isVencido) {
    return {
      novoStatusCobranca: 'OVERDUE',
      devePromoverCliente: false,
      deveAvancarCaso: false,
      descricaoInteracao: `Alerta financeiro Asaas: Fatura de honorários de R$ ${input.payment.value.toFixed(2)} (${input.payment.billingType}) vencida sem liquidação. Ref: ${input.payment.id}.`,
      tipoInteracao: 'nota_interna',
    };
  }

  if (isAtualizado) {
    return {
      novoStatusCobranca: (input.payment.status as StatusCobrancaAsaas) || 'PENDING',
      devePromoverCliente: false,
      deveAvancarCaso: false,
      descricaoInteracao: `Atualização de fatura Asaas: Fatura ref: ${input.payment.id} atualizada para R$ ${input.payment.value.toFixed(2)}${input.payment.dueDate ? ` (novo vencimento: ${input.payment.dueDate})` : ''}.`,
      tipoInteracao: 'nota_interna',
    };
  }

  if (isCancelado) {
    return {
      novoStatusCobranca: 'CANCELLED',
      devePromoverCliente: false,
      deveAvancarCaso: false,
      descricaoInteracao: `Fatura de honorários cancelada/removida no Asaas: R$ ${input.payment.value.toFixed(2)}. Ref: ${input.payment.id}.`,
      tipoInteracao: 'nota_interna',
    };
  }

  if (isRestaurado) {
    return {
      novoStatusCobranca: 'PENDING',
      devePromoverCliente: false,
      deveAvancarCaso: false,
      descricaoInteracao: `Fatura de honorários restaurada no Asaas: R$ ${input.payment.value.toFixed(2)}. Ref: ${input.payment.id}.`,
      tipoInteracao: 'nota_interna',
    };
  }

  if (isEstornado) {
    return {
      novoStatusCobranca: 'REFUNDED',
      devePromoverCliente: false,
      deveAvancarCaso: false,
      descricaoInteracao: `[ALERTA ESTORNO] Fatura de honorários de R$ ${input.payment.value.toFixed(2)} foi estornada/reembolsada no Asaas. Ref: ${input.payment.id}.`,
      tipoInteracao: 'nota_interna',
    };
  }

  if (isChargeback) {
    return {
      novoStatusCobranca: 'CHARGEBACK',
      devePromoverCliente: false,
      deveAvancarCaso: false,
      descricaoInteracao: `[ALERTA CRÍTICO CHARGEBACK] Notificação de contestação/chargeback recebida para a fatura ref: ${input.payment.id} no valor de R$ ${input.payment.value.toFixed(2)}.`,
      tipoInteracao: 'nota_interna',
    };
  }

  return {
    novoStatusCobranca: (input.payment.status as StatusCobrancaAsaas) || 'PENDING',
    devePromoverCliente: false,
    deveAvancarCaso: false,
    descricaoInteracao: `Atualização de cobrança Asaas: Evento ${input.event} recebido para fatura ${input.payment.id}.`,
    tipoInteracao: 'nota_interna',
  };
}

/**
 * Aplica máscara de CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00) dinamicamente
 */
export function mascaraCpfCnpj(valor?: string | null): string {
  const limpo = apenasNumeros(valor);
  if (!limpo) return '';

  if (limpo.length <= 11) {
    return limpo
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }

  return limpo
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

/**
 * Aplica máscara de telefone fixo ou celular com DDD: (00) 00000-0000 ou (00) 0000-0000
 */
export function mascaraTelefone(valor?: string | null): string {
  const limpo = apenasNumeros(valor);
  if (!limpo) return '';

  if (limpo.length <= 10) {
    return limpo
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }

  return limpo
    .slice(0, 11)
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

/**
 * Aplica máscara de CEP: 00000-000
 */
export function mascaraCep(valor?: string | null): string {
  const limpo = apenasNumeros(valor);
  if (!limpo) return '';
  return limpo.slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2');
}

/**
 * Converte erros técnicos e códigos do Asaas em mensagens amigáveis em português
 */
export function traduzirErroAsaas(err: any): string {
  if (!err) return 'Erro desconhecido na integração com o Asaas.';

  if (typeof err === 'string') {
    if (err.includes('Unauthorized') || err.includes('401')) {
      return 'Chave de API do Asaas não autorizada ou token expirado. Verifique a ASAAS_API_KEY.';
    }
    return err;
  }

  if (err.errors && Array.isArray(err.errors) && err.errors.length > 0) {
    const mensagens = err.errors.map((e: any) => {
      const desc = e.description || '';
      if (e.code === 'invalid_cpf' || desc.toLowerCase().includes('cpf')) {
        return 'O CPF informado é inválido perante a Receita Federal.';
      }
      if (e.code === 'invalid_cnpj' || desc.toLowerCase().includes('cnpj')) {
        return 'O CNPJ informado é inválido.';
      }
      if (e.code === 'invalid_action') {
        return 'Ação não permitida para o estado atual da cobrança.';
      }
      return desc;
    });
    return mensagens.join(' ');
  }

  if (err.error) {
    return typeof err.error === 'string' ? err.error : JSON.stringify(err.error);
  }

  return 'Ocorreu um erro no processamento junto ao Asaas.';
}

/**
 * Aplica máscara de Data Brasileira: DD/MM/AAAA
 */
export function mascaraDataBrasileira(valor?: string | null): string {
  const limpo = apenasNumeros(valor);
  if (!limpo) return '';
  return limpo
    .slice(0, 8)
    .replace(/^(\d{2})(\d)/, '$1/$2')
    .replace(/^(\d{2})\/(\d{2})(\d)/, '$1/$2/$3');
}

/**
 * Converte data DD/MM/AAAA para formato ISO YYYY-MM-DD
 */
export function converterDataBrParaIso(dataBr?: string | null): string | null {
  if (!dataBr) return null;
  const partes = dataBr.trim().split('/');
  if (partes.length !== 3) return null;
  const [dia, mes, ano] = partes;
  if (!dia || !mes || !ano || dia.length !== 2 || mes.length !== 2 || ano.length !== 4) return null;
  return `${ano}-${mes}-${dia}`;
}

/**
 * Converte data ISO YYYY-MM-DD para formato brasileiro DD/MM/AAAA
 */
export function converterDataIsoParaBr(dataIso?: string | null): string {
  if (!dataIso) return '';
  const partes = dataIso.substring(0, 10).split('-');
  if (partes.length !== 3) return dataIso;
  const [ano, mes, dia] = partes;
  return `${dia}/${mes}/${ano}`;
}

/**
 * Valida se uma string DD/MM/AAAA é uma data de calendário válida
 */
export function validarDataBrasileira(dataBr?: string | null): boolean {
  if (!dataBr) return false;
  const iso = converterDataBrParaIso(dataBr);
  if (!iso) return false;
  const data = new Date(iso + 'T12:00:00Z');
  if (isNaN(data.getTime())) return false;
  const [ano, mes, dia] = iso.split('-').map(Number);
  return (
    data.getUTCFullYear() === ano &&
    data.getUTCMonth() + 1 === mes &&
    data.getUTCDate() === dia
  );
}





