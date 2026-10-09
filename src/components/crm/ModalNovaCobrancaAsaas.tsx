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
  Clock,
  Check,
  Layers
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
  const [copiadoPix, setCopiadoPix] = useState(false);
  const [copiadoLinha, setCopiadoLinha] = useState(false);
  const [copiadoLink, setCopiadoLink] = useState(false);

  const resetForm = () => {
    setCobrancaCriada(null);
    setLoading(false);
    setValorStr('');
    setCopiadoPix(false);
    setCopiadoLinha(false);
    setCopiadoLink(false);
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

  const copiarParaTransferencia = (texto: string, tipo: 'pix' | 'linha' | 'link') => {
    navigator.clipboard.writeText(texto);
    if (tipo === 'pix') {
      setCopiadoPix(true);
      setTimeout(() => setCopiadoPix(false), 2500);
    } else if (tipo === 'linha') {
      setCopiadoLinha(true);
      setTimeout(() => setCopiadoLinha(false), 2500);
    } else {
      setCopiadoLink(true);
      setTimeout(() => setCopiadoLink(false), 2500);
    }
    toast.success('Copiado para a área de transferência!');
  };

  return (
    <Dialog
      open={aberto}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      <DialogContent className="dark sm:max-w-xl !bg-[#0D1B30] text-slate-100 border border-white/10 shadow-2xl rounded-2xl max-h-[92vh] overflow-hidden flex flex-col p-0">
        {/* Header Elegante */}
        <DialogHeader className="p-6 pb-4 border-b border-white/10 bg-[#091322] flex flex-row items-center justify-between text-left space-y-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-secondary/15 border border-secondary/30 flex items-center justify-center text-secondary shrink-0 shadow-inner">
              <DollarSign className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <DialogTitle className="font-serif text-lg font-bold text-white tracking-wide">
                {cobrancaCriada ? 'Cobrança Gerada no Asaas' : 'Emitir Cobrança de Honorários'}
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs mt-0.5">
                {cobrancaCriada
                  ? 'Fatura pronta para envio e compartilhamento com o cliente.'
                  : `Geração automática vinculada a ${clienteNome}.`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {cobrancaCriada ? (
          /* ─── Resultado da Emissão ─── */
          <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(92vh-130px)]">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-300">Fatura emitida com sucesso!</p>
                <p className="text-xs text-slate-300">
                  Identificador Asaas: <span className="font-mono text-white font-bold">{cobrancaCriada.asaas_payment_id || cobrancaCriada.cobranca_id}</span>
                </p>
              </div>
            </div>

            {/* Resultado PIX */}
            {cobrancaCriada.pix_copia_cola && (
              <div className="p-5 rounded-2xl bg-[#091322] border border-white/10 space-y-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-emerald-400" /> Pix Instantâneo
                  </span>
                  <Button
                    size="sm"
                    onClick={() => copiarParaTransferencia(cobrancaCriada.pix_copia_cola, 'pix')}
                    className="h-8 text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg shadow-sm"
                  >
                    {copiadoPix ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1" /> Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 mr-1" /> Copiar Código Pix
                      </>
                    )}
                  </Button>
                </div>

                {cobrancaCriada.pix_qrcode_image && (
                  <div className="flex justify-center p-3.5 bg-white rounded-xl w-fit mx-auto shadow-2xl ring-4 ring-emerald-500/20">
                    <img
                      src={cobrancaCriada.pix_qrcode_image}
                      alt="QR Code Pix"
                      className="w-44 h-44 object-contain"
                    />
                  </div>
                )}

                <div className="bg-[#060D17] p-3 rounded-xl border border-white/10">
                  <p className="text-[11px] font-mono text-slate-300 break-all select-all leading-relaxed">
                    {cobrancaCriada.pix_copia_cola}
                  </p>
                </div>
              </div>
            )}

            {/* Resultado Boleto */}
            {cobrancaCriada.linha_digitavel && (
              <div className="p-5 rounded-2xl bg-[#091322] border border-white/10 space-y-3.5 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Barcode className="w-4 h-4 text-secondary" /> Boleto Bancário
                  </span>
                  <Button
                    size="sm"
                    onClick={() => copiarParaTransferencia(cobrancaCriada.linha_digitavel, 'linha')}
                    className="h-8 text-xs bg-secondary hover:bg-secondary/90 text-primary font-bold rounded-lg shadow-sm"
                  >
                    {copiadoLinha ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1" /> Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 mr-1" /> Copiar Linha Digitável
                      </>
                    )}
                  </Button>
                </div>

                <div className="bg-[#060D17] p-3 rounded-xl border border-white/10">
                  <p className="text-xs font-mono text-white tracking-wider select-all">
                    {cobrancaCriada.linha_digitavel}
                  </p>
                </div>

                {cobrancaCriada.bank_slip_url && (
                  <Button
                    asChild
                    variant="outline"
                    className="w-full h-10 border-white/15 hover:bg-white/5 text-slate-200 text-xs font-bold rounded-xl"
                  >
                    <a href={cobrancaCriada.bank_slip_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Abrir Boleto Bancário (PDF)
                    </a>
                  </Button>
                )}
              </div>
            )}

            {/* Link de Cartão / Fatura Segura */}
            {cobrancaCriada.invoice_url && (
              <div className="p-5 rounded-2xl bg-[#091322] border border-white/10 space-y-3.5 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-sky-400" /> Cartão / Checkout Seguro Asaas
                  </span>
                  <Button
                    size="sm"
                    onClick={() => copiarParaTransferencia(cobrancaCriada.invoice_url, 'link')}
                    className="h-8 text-xs bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-lg shadow-sm"
                  >
                    {copiadoLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1" /> Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 mr-1" /> Copiar Link
                      </>
                    )}
                  </Button>
                </div>

                <Button
                  asChild
                  className="w-full h-10 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-xs shadow-md"
                >
                  <a href={cobrancaCriada.invoice_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Abrir Tela de Pagamento do Cliente
                  </a>
                </Button>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-white/15 bg-transparent text-white hover:bg-white/10 rounded-xl text-xs px-5 h-9"
              >
                Concluir e Fechar
              </Button>
            </div>
          </div>
        ) : (
          /* ─── Formulário de Emissão ─── */
          <form onSubmit={handleEmitir} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(92vh-140px)]">
              {/* Seletor de Tipo de Cobrança */}
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Forma de Pagamento
                </Label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setTipoCobranca('PIX')}
                    className={cn(
                      'flex flex-col items-center justify-center p-3.5 rounded-xl border text-xs font-semibold transition-all gap-2',
                      tipoCobranca === 'PIX'
                        ? 'border-emerald-500/80 bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40 shadow-lg shadow-emerald-950/40'
                        : 'border-white/10 bg-[#091322] text-slate-400 hover:border-white/20 hover:text-slate-200'
                    )}
                  >
                    <QrCode className="w-5 h-5 text-emerald-400" />
                    Pix Instantâneo
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipoCobranca('BOLETO')}
                    className={cn(
                      'flex flex-col items-center justify-center p-3.5 rounded-xl border text-xs font-semibold transition-all gap-2',
                      tipoCobranca === 'BOLETO'
                        ? 'border-secondary bg-secondary/15 text-secondary ring-1 ring-secondary/40 shadow-lg shadow-amber-950/40'
                        : 'border-white/10 bg-[#091322] text-slate-400 hover:border-white/20 hover:text-slate-200'
                    )}
                  >
                    <Barcode className="w-5 h-5 text-secondary" />
                    Boleto Bancário
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipoCobranca('CREDIT_CARD')}
                    className={cn(
                      'flex flex-col items-center justify-center p-3.5 rounded-xl border text-xs font-semibold transition-all gap-2',
                      tipoCobranca === 'CREDIT_CARD'
                        ? 'border-sky-500/80 bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/40 shadow-lg shadow-sky-950/40'
                        : 'border-white/10 bg-[#091322] text-slate-400 hover:border-white/20 hover:text-slate-200'
                    )}
                  >
                    <CreditCard className="w-5 h-5 text-sky-400" />
                    Cartão de Crédito
                  </button>
                </div>
              </div>

              {/* Modalidade: Cobrança Única vs Parcelado vs Partido Mensal */}
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Modalidade do Faturamento
                </Label>
                <div className="grid grid-cols-3 gap-1.5 bg-[#091322] p-1.5 rounded-xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setForma('avista');
                      setNumeroParcelas(1);
                    }}
                    className={cn(
                      'py-2 px-3 rounded-lg text-xs font-bold transition-all text-center',
                      forma === 'avista'
                        ? 'bg-secondary text-primary shadow-md'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
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
                      'py-2 px-3 rounded-lg text-xs font-bold transition-all text-center',
                      forma === 'parcelado'
                        ? 'bg-secondary text-primary shadow-md'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
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
                      'py-2 px-3 rounded-lg text-xs font-bold transition-all text-center',
                      forma === 'assinatura'
                        ? 'bg-secondary text-primary shadow-md'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    )}
                  >
                    Partido Mensal
                  </button>
                </div>
              </div>

              {/* Grid Valor e Vencimento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    {forma === 'parcelado' ? 'Valor Total dos Honorários' : forma === 'assinatura' ? 'Mensalidade Recorrente' : 'Valor dos Honorários'}
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-xs text-secondary font-mono font-bold">R$</span>
                    <Input
                      type="text"
                      required
                      placeholder="0,00"
                      value={valorStr}
                      onChange={(e) => setValorStr(e.target.value)}
                      className="h-11 pl-10 bg-[#091322] border-white/10 text-white placeholder:text-slate-500 focus:border-secondary focus:ring-1 focus:ring-secondary rounded-xl text-sm font-mono font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-secondary" />
                    {forma === 'assinatura' ? '1º Vencimento Recorrente' : 'Data de Vencimento'}
                  </Label>
                  <Input
                    type="date"
                    required
                    value={dataVencimento}
                    onChange={(e) => setDataVencimento(e.target.value)}
                    className="h-11 bg-[#091322] border-white/10 text-white rounded-xl text-sm focus:border-secondary focus:ring-1 focus:ring-secondary"
                  />
                </div>
              </div>

              {/* Parcelamento */}
              {forma === 'parcelado' && (
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Número de Parcelas
                  </Label>
                  <select
                    value={numeroParcelas}
                    onChange={(e) => setNumeroParcelas(parseInt(e.target.value, 10))}
                    className="w-full h-11 bg-[#091322] border border-white/10 text-white rounded-xl px-3 text-sm focus:border-secondary focus:ring-1 focus:ring-secondary"
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

              {/* Descrição na Fatura */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Descrição Exibida na Fatura
                </Label>
                <Input
                  type="text"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Honorários advocatícios"
                  className="h-11 bg-[#091322] border-white/10 text-white placeholder:text-slate-500 rounded-xl text-sm focus:border-secondary focus:ring-1 focus:ring-secondary"
                />
              </div>

              {/* Informações da Automação */}
              <div className="p-4 rounded-xl bg-secondary/10 border border-secondary/20 flex items-start gap-3 text-xs text-slate-300">
                <Sparkles className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-secondary">Automação de Funil & Webhook</p>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Assim que a fatura for quitada pelo cliente via Asaas, o pagamento é conciliado instantaneamente, o cliente é promovido a <strong>Ativo</strong> e o processo avança para a etapa <strong>Fechamento</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Fixo */}
            <div className="p-4 px-6 border-t border-white/10 bg-[#091322] flex items-center justify-end gap-3 shrink-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="h-10 border border-white/10 bg-transparent text-slate-300 hover:text-white hover:bg-white/5 rounded-xl text-xs font-semibold px-4"
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                disabled={loading}
                className="h-10 bg-cta-gold hover:opacity-90 text-primary font-bold rounded-xl text-xs shadow-lg shadow-cta-gold/15 px-6 flex items-center gap-2"
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
