import { supabase } from '@/lib/supabase';
import { TipoCobrancaAsaas } from '@/domain/crm/asaas';

export interface SincronizacaoClienteResult {
  success: boolean;
  asaas_customer_id?: string;
  environment?: string;
  error?: string;
}

export interface CriarCobrancaPayload {
  cliente_id: string;
  caso_id?: string | null;
  contrato_id?: string | null;
  tipo_cobranca: TipoCobrancaAsaas;
  forma: 'avista' | 'parcelado' | 'assinatura';
  valor: number;
  data_vencimento: string;
  numero_parcelas?: number;
  descricao?: string;
  postal_service?: boolean;
  postalService?: boolean;
  discount?: {
    value: number;
    dueDateLimitDays?: number;
    type?: 'PERCENTAGE' | 'FIXED';
  };
  fine?: {
    value: number;
    type?: 'PERCENTAGE' | 'FIXED';
  };
  interest?: {
    value: number;
    type?: 'PERCENTAGE' | 'FIXED';
  };
}

export interface CriarCobrancaResult {
  success: boolean;
  cobranca_id?: string;
  asaas_payment_id?: string;
  asaas_subscription_id?: string;
  invoice_url?: string;
  bank_slip_url?: string;
  pix_qrcode_image?: string;
  pix_copia_cola?: string;
  linha_digitavel?: string;
  error?: string;
}

/**
 * Dispara a sincronização de cliente no Asaas via Edge Function.
 * Garante idempotência e reaproveitamento por CPF/CNPJ.
 */
export async function sincronizarClienteAsaas(clienteId: string): Promise<SincronizacaoClienteResult> {
  try {
    const { data, error } = await supabase.functions.invoke('asaas-sync-customer', {
      body: { cliente_id: clienteId },
    });

    if (error) {
      console.error('Erro na chamada da Edge Function asaas-sync-customer:', error);
      return { success: false, error: error.message || 'Falha na comunicação com o servidor' };
    }

    if (data?.error) {
      return { success: false, error: data.error };
    }

    return {
      success: true,
      asaas_customer_id: data?.asaas_customer_id,
      environment: data?.environment,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao sincronizar com Asaas';
    return { success: false, error: msg };
  }
}

/**
 * Cria cobrança (Pix, Boleto, Cartão Zero-PCI ou Assinatura) no Asaas via Edge Function.
 */
export async function criarCobrancaAsaas(payload: CriarCobrancaPayload): Promise<CriarCobrancaResult> {
  try {
    const { data, error } = await supabase.functions.invoke('asaas-criar-cobranca', {
      body: payload,
    });

    if (error) {
      console.error('Erro na chamada da Edge Function asaas-criar-cobranca:', error);
      return { success: false, error: error.message || 'Falha na criação de cobrança' };
    }

    if (data?.error) {
      return { success: false, error: data.error };
    }

    return {
      success: true,
      cobranca_id: data?.cobranca?.id,
      asaas_payment_id: data?.cobranca?.asaas_payment_id,
      asaas_subscription_id: data?.cobranca?.asaas_subscription_id,
      invoice_url: data?.cobranca?.invoice_url,
      bank_slip_url: data?.cobranca?.bank_slip_url,
      pix_qrcode_image: data?.cobranca?.pix_qrcode_image,
      pix_copia_cola: data?.cobranca?.pix_copia_cola,
      linha_digitavel: data?.cobranca?.linha_digitavel,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao emitir cobrança no Asaas';
    return { success: false, error: msg };
  }
}
