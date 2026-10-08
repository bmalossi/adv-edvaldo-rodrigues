import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  QrCode,
  Barcode,
  CreditCard,
  Copy,
  ExternalLink,
  CheckCircle2,
  Calendar,
  Sparkles,
  DollarSign,
  AlertCircle,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { TipoCobrancaAsaas, CobrancaAsaas, traduzirErroAsaas } from '@/domain/crm/asaas';
import { criarCobrancaAsaas } from '@/lib/asaas';
import { cn } from '@/lib/utils';

interface ModalNovaCobrancaAsaasProps {
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  clienteId: string;
  clienteNome: string;
  casoId?: string | null;
  casoTitulo?: string | null;
  contratoId?: string | null;
  onCobrancaCriada?: (cobranca: CobrancaAsaas) => void;
}

export function ModalNovaCobrancaAsaas({
  aberto,
  onOpenChange,
  clienteId,
  clienteNome,
  casoId,
  casoTitulo,
  contratoId,
  onCobrancaCriada,
}: ModalNovaCobrancaAsaasProps) {
  const [tipoCobranca, setTipoCobranca] = useState<TipoCobrancaAsaas>('PIX');
  const [forma, setForma] = useState<'avista' | 'parcelado' | 'assinatura'>('avista');
  const [valorStr, setValorStr] = useState('');
  const [dataVencimento, setDataVencimento] = useState(() => {
    const data = new Date();
    data.setDate(data.getDate() + 5);
    return data.toISOString().substring(0, 10);
  });
  const [numeroParcelas, setNumeroParcelas] = useState(1);
  const [descricao, setDescricao] = useState(() =>
    casoTitulo ? `Honorários advocatícios - ${casoTitulo}` : 'Honorários advocatícios'
  );

  const [loading, setLoading] = useState(false);
  const [cobrancaCriada, setCobrancaCriada] = useState<any | null>(null);

  const resetForm = () => {
    setCobrancaCriada(null);
    setLoading(false);
    setValorStr('');
  };

  const handleEmitir = async (e: React.FormEvent) => {
    e.preventDefault();
    const valorNumerico = parseFloat(valorStr.replace(',', '.'));
    if (!valorNumerico || valorNumerico <= 0) {
      toast.error('Informe um valor válido maior que zero.');
      return;
    }
    if (!dataVencimento) {
      toast.error('Informe a data de vencimento.');
      return;
    }

    setLoading(true);
    try {
      const res = await criarCobrancaAsaas({
        cliente_id: clienteId,
        caso_id: casoId || null,
        contrato_id: contratoId || null,
        tipo_cobranca: tipoCobranca,
        forma,
        valor: valorNumerico,
        data_vencimento: dataVencimento,
        numero_parcelas: forma === 'parcelado' ? numeroParcelas : 1,
        descricao,
      });

      if (!res.success) {
        toast.error(traduzirErroAsaas(res.error));
        setLoading(false);
        return;
      }

      toast.success('Cobrança gerada com sucesso no Asaas!');
      setCobrancaCriada(res);
      if (onCobrancaCriada) {
        onCobrancaCriada(res as any);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar cobrança';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const copiarParaTransferencia = (texto: string, label: string) => {
    navigator.clipboard.writeText(texto);
    toast.success(`${label} copiado para a área de transferência!`);
  };

  return (
    <Dialog
      open={aberto}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-xl bg-card border-white/10 text-white rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl flex items-center gap-2 text-white">
            <DollarSign className="w-5 h-5 text-secondary" />
            {cobrancaCriada ? 'Cobrança Gerada com Sucesso' : 'Emitir Cobrança de Honorários (Asaas)'}
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            {cobrancaCriada
              ? 'Dados de pagamento e faturas geradas disponíveis para compartilhamento.'
              : `Geração automática de cobrança vinculada a ${clienteNome}.`}
          </DialogDescription>
        </DialogHeader>

        {cobrancaCriada ? (
          <div className="space-y-5 pt-2">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-300">Fatura emitida com sucesso!</p>
                <p className="text-xs text-slate-300">
                  ID Asaas: <span className="font-mono text-white">{cobrancaCriada.asaas_payment_id || cobrancaCriada.cobranca_id}</span>
                </p>
              </div>
            </div>

            {/* Resultado PIX */}
            {cobrancaCriada.pix_copia_cola && (
              <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-emerald-400" /> Pix Instantâneo
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copiarParaTransferencia(cobrancaCriada.pix_copia_cola, 'Código Pix Copia e Cola')}
                    className="h-7 text-xs border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
                  >
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copiar Código Pix
                  </Button>
                </div>

                {cobrancaCriada.pix_qrcode_image && (
                  <div className="flex justify-center p-3 bg-white rounded-lg w-fit mx-auto shadow-inner">
                    <img
                      src={cobrancaCriada.pix_qrcode_image}
                      alt="QR Code Pix"
                      className="w-48 h-48 object-contain"
                    />
                  </div>
                )}

                <div className="bg-slate-950 p-2.5 rounded-lg border border-white/5">
                  <p className="text-[11px] font-mono text-slate-400 break-all select-all">
                    {cobrancaCriada.pix_copia_cola}
                  </p>
                </div>
              </div>
            )}

            {/* Resultado Boleto */}
            {cobrancaCriada.linha_digitavel && (
              <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Barcode className="w-4 h-4 text-secondary" /> Boleto Bancário
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copiarParaTransferencia(cobrancaCriada.linha_digitavel, 'Linha digitável')}
                    className="h-7 text-xs border-white/20 text-slate-200 hover:bg-white/10"
                  >
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copiar Linha Digitável
                  </Button>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-lg border border-white/5">
                  <p className="text-xs font-mono text-white tracking-wider select-all">
                    {cobrancaCriada.linha_digitavel}
                  </p>
                </div>

                {cobrancaCriada.bank_slip_url && (
                  <Button
                    asChild
                    variant="secondary"
                    className="w-full text-xs font-bold rounded-xl"
                  >
                    <a href={cobrancaCriada.bank_slip_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Abrir Boleto em PDF
                    </a>
                  </Button>
                )}
              </div>
            )}

            {/* Link de Cartão / Fatura Segura */}
            {cobrancaCriada.invoice_url && (
              <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-cyan-400" /> Link de Pagamento (Cartão / Checkout)
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copiarParaTransferencia(cobrancaCriada.invoice_url, 'Link da Fatura')}
                    className="h-7 text-xs border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10"
                  >
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copiar Link
                  </Button>
                </div>

                <Button
                  asChild
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs"
                >
                  <a href={cobrancaCriada.invoice_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Abrir Fatura Segura do Asaas
                  </a>
                </Button>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-white/10 text-white rounded-xl text-xs"
              >
                Concluir e Fechar
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleEmitir} className="space-y-4 pt-2">
            {/* Seletor de Tipo de Cobrança */}
            <div className="space-y-2">
              <Label className="text-xs text-slate-300 font-medium">Forma de Pagamento</Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTipoCobranca('PIX')}
                  className={cn(
                    'flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all gap-1.5',
                    tipoCobranca === 'PIX'
                      ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300 shadow-sm'
                      : 'border-white/10 bg-slate-900/50 text-slate-400 hover:border-white/20'
                  )}
                >
                  <QrCode className="w-5 h-5 text-emerald-400" />
                  Pix Instantâneo
                </button>

                <button
                  type="button"
                  onClick={() => setTipoCobranca('BOLETO')}
                  className={cn(
                    'flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all gap-1.5',
                    tipoCobranca === 'BOLETO'
                      ? 'border-secondary bg-secondary/15 text-secondary shadow-sm'
                      : 'border-white/10 bg-slate-900/50 text-slate-400 hover:border-white/20'
                  )}
                >
                  <Barcode className="w-5 h-5 text-secondary" />
                  Boleto Bancário
                </button>

                <button
                  type="button"
                  onClick={() => setTipoCobranca('CREDIT_CARD')}
                  className={cn(
                    'flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all gap-1.5',
                    tipoCobranca === 'CREDIT_CARD'
                      ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-300 shadow-sm'
                      : 'border-white/10 bg-slate-900/50 text-slate-400 hover:border-white/20'
                  )}
                >
                  <CreditCard className="w-5 h-5 text-cyan-400" />
                  Cartão de Crédito
                </button>
              </div>
            </div>

            {/* Modalidade: À Vista vs Parcelado vs Assinatura */}
            <div className="space-y-2">
              <Label className="text-xs text-slate-300 font-medium">Modalidade</Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setForma('avista');
                    setNumeroParcelas(1);
                  }}
                  className={cn(
                    'py-2 px-3 rounded-xl border text-xs font-medium transition-all text-center',
                    forma === 'avista'
                      ? 'border-white/30 bg-white/10 text-white'
                      : 'border-white/10 bg-slate-900/40 text-slate-400 hover:text-slate-200'
                  )}
                >
                  Cobrança Única
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setForma('parcelado');
                    if (numeroParcelas <= 1) setNumeroParcelas(2);
                  }}
                  className={cn(
                    'py-2 px-3 rounded-xl border text-xs font-medium transition-all text-center',
                    forma === 'parcelado'
                      ? 'border-white/30 bg-white/10 text-white'
                      : 'border-white/10 bg-slate-900/40 text-slate-400 hover:text-slate-200'
                  )}
                >
                  Parcelado
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setForma('assinatura');
                    setNumeroParcelas(1);
                  }}
                  className={cn(
                    'py-2 px-3 rounded-xl border text-xs font-medium transition-all text-center',
                    forma === 'assinatura'
                      ? 'border-white/30 bg-white/10 text-white'
                      : 'border-white/10 bg-slate-900/40 text-slate-400 hover:text-slate-200'
                  )}
                >
                  Partido Mensal
                </button>
              </div>
            </div>

            {/* Grid Valor e Vencimento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300 font-medium">
                  {forma === 'parcelado' ? 'Valor Total (R$)' : 'Valor (R$)'}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">R$</span>
                  <Input
                    type="text"
                    required
                    placeholder="0,00"
                    value={valorStr}
                    onChange={(e) => setValorStr(e.target.value)}
                    className="pl-9 bg-slate-900 border-white/10 text-white rounded-xl text-sm font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300 font-medium flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-secondary" />
                  {forma === 'assinatura' ? '1º Vencimento' : 'Data de Vencimento'}
                </Label>
                <Input
                  type="date"
                  required
                  value={dataVencimento}
                  onChange={(e) => setDataVencimento(e.target.value)}
                  className="bg-slate-900 border-white/10 text-white rounded-xl text-sm"
                />
              </div>
            </div>

            {forma === 'parcelado' && (
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300 font-medium">Número de Parcelas</Label>
                <select
                  value={numeroParcelas}
                  onChange={(e) => setNumeroParcelas(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-900 border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-secondary"
                >
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                    <option key={n} value={n}>
                      {n} parcelas de R${' '}
                      {valorStr && parseFloat(valorStr.replace(',', '.')) > 0
                        ? (parseFloat(valorStr.replace(',', '.')) / n).toFixed(2).replace('.', ',')
                        : '0,00'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 font-medium">Descrição na Fatura</Label>
              <Input
                type="text"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: Honorários advocatícios"
                className="bg-slate-900 border-white/10 text-white rounded-xl text-sm"
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 text-xs text-slate-400 space-y-1">
              <p className="flex items-center gap-1.5 text-slate-300 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-secondary" />
                Automação Integrada
              </p>
              <p>
                Assim que a fatura for quitada pelo cliente, o status será atualizado via Webhook e o cliente avançará automaticamente no Funil do CRM.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="rounded-xl text-slate-300 hover:text-white text-xs"
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                disabled={loading}
                className="bg-cta-gold hover:opacity-90 text-primary font-bold rounded-xl text-xs shadow-md"
              >
                {loading ? 'Emitindo cobrança...' : 'Gerar Cobrança Asaas'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
