import { useEffect, useState } from 'react';
import {
  DollarSign,
  Plus,
  QrCode,
  Barcode,
  CreditCard,
  Copy,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  FileText
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CobrancaAsaas, StatusCobrancaAsaas, TipoCobrancaAsaas } from '@/domain/crm/asaas';
import { Button } from '@/components/ui/button';
import { ModalNovaCobrancaAsaas } from './ModalNovaCobrancaAsaas';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PainelFinanceiroAsaasProps {
  clienteId: string;
  clienteNome: string;
  casoId?: string | null;
  casoTitulo?: string | null;
  contratoId?: string | null;
}

const STATUS_COBRANCA_CONFIG: Record<
  string,
  { label: string; container: string; dot: string; icon: React.ComponentType<{ className?: string }> }
> = {
  CONFIRMED: {
    label: 'Pago / Confirmado',
    container: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/25',
    dot: 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]',
    icon: CheckCircle2,
  },
  RECEIVED: {
    label: 'Recebido',
    container: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/25',
    dot: 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]',
    icon: CheckCircle2,
  },
  PENDING: {
    label: 'Aguardando Pagamento',
    container: 'bg-amber-950/40 text-amber-300 border-amber-500/25',
    dot: 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]',
    icon: Clock,
  },
  OVERDUE: {
    label: 'Vencido',
    container: 'bg-rose-950/40 text-rose-300 border-rose-500/25',
    dot: 'bg-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.6)]',
    icon: AlertCircle,
  },
  REFUNDED: {
    label: 'Estornado',
    container: 'bg-purple-950/40 text-purple-300 border-purple-500/25',
    dot: 'bg-purple-400 shadow-[0_0_6px_rgba(192,132,252,0.6)]',
    icon: AlertCircle,
  },
  CANCELLED: {
    label: 'Cancelado',
    container: 'bg-slate-800/40 text-slate-400 border-white/10',
    dot: 'bg-slate-500',
    icon: AlertCircle,
  },
  CHARGEBACK: {
    label: 'Chargeback / Disputa',
    container: 'bg-rose-950/50 text-rose-300 border-rose-500/35 font-semibold',
    dot: 'bg-rose-400',
    icon: AlertCircle,
  },
};

export function PainelFinanceiroAsaas({
  clienteId,
  clienteNome,
  casoId,
  casoTitulo,
  contratoId,
}: PainelFinanceiroAsaasProps) {
  const [cobrancas, setCobrancas] = useState<CobrancaAsaas[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalNovaAberto, setModalNovaAberto] = useState(false);

  const carregarCobrancas = async () => {
    setLoading(true);
    let query = supabase
      .from('cobrancas_asaas')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false });

    if (casoId) {
      query = query.eq('caso_id', casoId);
    }

    const { data, error } = await query;
    if (!error && data) {
      setCobrancas(data as CobrancaAsaas[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    carregarCobrancas();
  }, [clienteId, casoId]);

  const copiarTexto = (texto: string, label: string) => {
    navigator.clipboard.writeText(texto);
    toast.success(`${label} copiado!`);
  };

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  };

  const formatarData = (dataStr?: string | null) => {
    if (!dataStr) return '—';
    const partes = dataStr.substring(0, 10).split('-');
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
    return dataStr;
  };

  return (
    <div className="bg-card border border-white/10 rounded-2xl p-6 shadow-sm space-y-5">
      {/* Header do Painel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 gap-3">
        <div className="flex items-center gap-2.5">
          <DollarSign className="w-5 h-5 text-secondary shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Honorários & Cobranças Asaas
              </h2>
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider bg-amber-500/10 text-amber-300/90 border border-amber-500/25 select-none"
                title="Ambiente de Testes / Sandbox do Asaas ativo"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)] shrink-0" />
                Sandbox
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-0.5">
              Faturas, conciliação Pix/Boleto/Cartão e controle financeiro sincronizado.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={carregarCobrancas}
            disabled={loading}
            className="rounded-xl text-slate-300 hover:text-white text-xs h-8"
            title="Atualizar faturas"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          </Button>

          <Button
            onClick={() => setModalNovaAberto(true)}
            size="sm"
            className="bg-cta-gold hover:opacity-90 text-primary font-bold rounded-xl text-xs gap-1.5 shadow-md h-8"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova Cobrança
          </Button>
        </div>
      </div>

      {/* Lista de Cobranças */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 text-xs italic animate-pulse">
          Consultando histórico financeiro...
        </div>
      ) : cobrancas.length === 0 ? (
        <div className="p-8 text-center rounded-xl border border-dashed border-white/10 bg-slate-900/30 space-y-3">
          <DollarSign className="w-8 h-8 text-slate-500 mx-auto opacity-50" />
          <p className="text-slate-300 text-xs font-medium">Nenhuma cobrança emitida para este registro.</p>
          <p className="text-slate-500 text-[11px] max-w-sm mx-auto">
            Gere links de pagamento no Pix, Boleto ou Cartão de Crédito integrados ao Asaas em segundos.
          </p>
          <Button
            onClick={() => setModalNovaAberto(true)}
            variant="outline"
            size="sm"
            className="text-xs border-white/10 text-white rounded-xl mt-2"
          >
            Emitir primeira fatura
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {cobrancas.map((cob) => {
            const statusConfig = STATUS_COBRANCA_CONFIG[cob.status] || STATUS_COBRANCA_CONFIG.PENDING;

            return (
              <div
                key={cob.id}
                className="p-4 rounded-xl border border-white/10 bg-slate-900/50 hover:border-white/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-serif text-base font-bold text-white">
                      {formatarValor(cob.valor)}
                    </span>

                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium border tracking-tight select-none',
                        statusConfig.container
                      )}
                    >
                      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', statusConfig.dot)} />
                      {statusConfig.label}
                    </span>

                    <span className="px-2 py-0.5 rounded-md text-[10px] bg-white/[0.04] text-slate-300 border border-white/10 uppercase font-mono">
                      {cob.tipo_cobranca}
                    </span>

                    {cob.forma === 'parcelado' && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({cob.total_parcelas}x)
                      </span>
                    )}

                    {cob.forma === 'assinatura' && (
                      <span className="text-[10px] text-cyan-300 font-medium bg-cyan-950/40 border border-cyan-500/25 px-2 py-0.5 rounded-md">
                        Partido Mensal
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span>
                      Vencimento: <strong className="text-slate-200">{formatarData(cob.data_vencimento)}</strong>
                    </span>

                    {cob.data_pagamento && (
                      <span>
                        Pago em: <strong className="text-emerald-300">{formatarData(cob.data_pagamento)}</strong>
                      </span>
                    )}

                    {cob.asaas_payment_id && (
                      <span className="font-mono text-[11px] text-slate-500">
                        Ref: {cob.asaas_payment_id}
                      </span>
                    )}
                  </div>
                </div>

                {/* Botões de Ação Rápida */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {cob.pix_copia_cola && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copiarTexto(cob.pix_copia_cola!, 'Código Pix')}
                      className="h-8 text-xs border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 rounded-xl"
                      title="Copiar código Pix copia e cola"
                    >
                      <QrCode className="w-3.5 h-3.5 mr-1" /> Copiar Pix
                    </Button>
                  )}

                  {cob.linha_digitavel && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copiarTexto(cob.linha_digitavel!, 'Linha digitável do Boleto')}
                      className="h-8 text-xs border-white/20 text-slate-200 hover:bg-white/10 rounded-xl"
                      title="Copiar linha digitável do boleto"
                    >
                      <Barcode className="w-3.5 h-3.5 mr-1" /> Copiar Boleto
                    </Button>
                  )}

                  {cob.bank_slip_url && (
                    <Button
                      asChild
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs text-slate-300 hover:text-white rounded-xl"
                      title="Visualizar boleto"
                    >
                      <a href={cob.bank_slip_url} target="_blank" rel="noopener noreferrer">
                        <FileText className="w-3.5 h-3.5 mr-1" /> PDF
                      </a>
                    </Button>
                  )}

                  {cob.invoice_url && (
                    <Button
                      asChild
                      size="sm"
                      className="h-8 text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-xl gap-1 shadow-sm"
                      title="Abrir fatura de checkout segura do Asaas"
                    >
                      <a href={cob.invoice_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3.5 h-3.5" /> Fatura
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Nova Cobrança */}
      <ModalNovaCobrancaAsaas
        aberto={modalNovaAberto}
        onOpenChange={setModalNovaAberto}
        clienteId={clienteId}
        clienteNome={clienteNome}
        casoId={casoId}
        casoTitulo={casoTitulo}
        contratoId={contratoId}
        onCobrancaCriada={() => carregarCobrancas()}
      />
    </div>
  );
}
