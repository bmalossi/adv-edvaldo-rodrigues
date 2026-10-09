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
  HelpCircle,
  Copy,
  ExternalLink,
  CheckCircle2,
  Calendar,
  Sparkles,
  DollarSign,
  Printer,
  Truck,
  Check,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Percent
} from 'lucide-react';
import { toast } from 'sonner';
import {
  TipoCobrancaAsaas,
  CobrancaAsaas,
  traduzirErroAsaas,
  mascaraDataBrasileira,
  converterDataBrParaIso,
  converterDataIsoParaBr,
  validarDataBrasileira,
} from '@/domain/crm/asaas';
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
  
  // Data de vencimento no formato brasileiro DD/MM/AAAA
  const [dataVencimentoBr, setDataVencimentoBr] = useState(() => {
    const data = new Date();
    data.setDate(data.getDate() + 5);
    return converterDataIsoParaBr(data.toISOString().substring(0, 10));
  });

  const [numeroParcelas, setNumeroParcelas] = useState(1);
  const [descricao, setDescricao] = useState(() =>
    casoTitulo ? `Honorários advocatícios - ${casoTitulo}` : 'Honorários advocatícios'
  );

  // Opções avançadas (Juros, Multa, Desconto e Correios)
  const [mostrarAvancado, setMostrarAvancado] = useState(false);
  const [jurosTipo, setJurosTipo] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [jurosValor, setJurosValor] = useState('');
  const [multaTipo, setMultaTipo] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [multaValor, setMultaValor] = useState('');
  const [descontoTipo, setDescontoTipo] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [descontoValor, setDescontoValor] = useState('');
  const [descontoPrazo, setDescontoPrazo] = useState<number>(0);
  const [queroImprimir, setQueroImprimir] = useState(false);
  const [queroEnviarCorreios, setQueroEnviarCorreios] = useState(false);

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
    setQueroImprimir(false);
    setQueroEnviarCorreios(false);
    setJurosValor('');
    setMultaValor('');
    setDescontoValor('');
  };

  const handleEmitir = async (e: React.FormEvent) => {
    e.preventDefault();
    const valorNumerico = parseFloat(valorStr.replace(',', '.'));
    if (!valorNumerico || valorNumerico <= 0) {
      toast.error('Informe um valor válido maior que zero.');
      return;
    }

    if (!validarDataBrasileira(dataVencimentoBr)) {
      toast.error('Informe uma data de vencimento válida no formato DD/MM/AAAA.');
      return;
    }

    const dataVencimentoIso = converterDataBrParaIso(dataVencimentoBr);
    if (!dataVencimentoIso) {
      toast.error('Data de vencimento inválida.');
      return;
    }

    setLoading(true);
    try {
      const payloadEnvio: any = {
        cliente_id: clienteId,
        caso_id: casoId || null,
        contrato_id: contratoId || null,
        tipo_cobranca: tipoCobranca,
        forma,
        valor: valorNumerico,
        data_vencimento: dataVencimentoIso,
        numero_parcelas: forma === 'parcelado' ? numeroParcelas : 1,
        descricao,
        postal_service: queroEnviarCorreios,
      };

      // Juros
      const jurosNum = parseFloat(jurosValor.replace(',', '.'));
      if (jurosNum > 0) {
        payloadEnvio.interest = {
          value: jurosNum,
          type: jurosTipo,
        };
      }

      // Multa
      const multaNum = parseFloat(multaValor.replace(',', '.'));
      if (multaNum > 0) {
        payloadEnvio.fine = {
          value: multaNum,
          type: multaTipo,
        };
      }

      // Desconto
      const descontoNum = parseFloat(descontoValor.replace(',', '.'));
      if (descontoNum > 0) {
        payloadEnvio.discount = {
          value: descontoNum,
          type: descontoTipo,
          dueDateLimitDays: descontoPrazo,
        };
      }

      const res = await criarCobrancaAsaas(payloadEnvio);

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

      // Se o usuário selecionou a opção de imprimir, abre o boleto ou fatura automaticamente
      if (queroImprimir && (res.bank_slip_url || res.invoice_url)) {
        window.open(res.bank_slip_url || res.invoice_url, '_blank');
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

            {/* Resultado "Pergunte ao Cliente" ou Link de Checkout */}
            {cobrancaCriada.invoice_url && (
              <div className="p-5 rounded-2xl bg-[#091322] border border-white/10 space-y-3.5 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-sky-400" /> Link de Pagamento (Fatura / Checkout Asaas)
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button
                    asChild
                    className="w-full h-10 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-xs shadow-md"
                  >
                    <a href={cobrancaCriada.invoice_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Abrir Checkout do Cliente
                    </a>
                  </Button>

                  {cobrancaCriada.bank_slip_url && (
                    <Button
                      asChild
                      variant="outline"
                      className="w-full h-10 border-white/15 hover:bg-white/5 text-slate-200 text-xs font-bold rounded-xl"
                    >
                      <a href={cobrancaCriada.bank_slip_url} target="_blank" rel="noopener noreferrer">
                        <Printer className="w-3.5 h-3.5 mr-1.5 text-secondary" /> Imprimir Boleto (PDF)
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            )}

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
              {/* Seletor de Tipo de Cobrança (Incluindo "Pergunte ao Cliente") */}
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Forma de Pagamento
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* Pix */}
                  <button
                    type="button"
                    onClick={() => setTipoCobranca('PIX')}
                    className={cn(
                      'flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all gap-1.5 text-center',
                      tipoCobranca === 'PIX'
                        ? 'border-emerald-500/80 bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40 shadow-lg shadow-emerald-950/40'
                        : 'border-white/10 bg-[#091322] text-slate-400 hover:border-white/20 hover:text-slate-200'
                    )}
                  >
                    <QrCode className="w-5 h-5 text-emerald-400" />
                    <span>Pix Instantâneo</span>
                  </button>

                  {/* Boleto */}
                  <button
                    type="button"
                    onClick={() => setTipoCobranca('BOLETO')}
                    className={cn(
                      'flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all gap-1.5 text-center',
                      tipoCobranca === 'BOLETO'
                        ? 'border-secondary bg-secondary/15 text-secondary ring-1 ring-secondary/40 shadow-lg shadow-amber-950/40'
                        : 'border-white/10 bg-[#091322] text-slate-400 hover:border-white/20 hover:text-slate-200'
                    )}
                  >
                    <Barcode className="w-5 h-5 text-secondary" />
                    <span>Boleto Bancário</span>
                  </button>

                  {/* Cartão */}
                  <button
                    type="button"
                    onClick={() => setTipoCobranca('CREDIT_CARD')}
                    className={cn(
                      'flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all gap-1.5 text-center',
                      tipoCobranca === 'CREDIT_CARD'
                        ? 'border-sky-500/80 bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/40 shadow-lg shadow-sky-950/40'
                        : 'border-white/10 bg-[#091322] text-slate-400 hover:border-white/20 hover:text-slate-200'
                    )}
                  >
                    <CreditCard className="w-5 h-5 text-sky-400" />
                    <span>Cartão de Crédito</span>
                  </button>

                  {/* Pergunte ao Cliente (UNDEFINED) */}
                  <button
                    type="button"
                    onClick={() => setTipoCobranca('UNDEFINED')}
                    className={cn(
                      'flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all gap-1.5 text-center',
                      tipoCobranca === 'UNDEFINED'
                        ? 'border-purple-500/80 bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/40 shadow-lg shadow-purple-950/40'
                        : 'border-white/10 bg-[#091322] text-slate-400 hover:border-white/20 hover:text-slate-200'
                    )}
                  >
                    <HelpCircle className="w-5 h-5 text-purple-400" />
                    <span>Pergunte ao Cliente</span>
                  </button>
                </div>
                {tipoCobranca === 'UNDEFINED' && (
                  <p className="text-[11px] text-purple-300/80 italic mt-1">
                    * O cliente receberá o checkout do Asaas e poderá escolher entre Pix, Boleto ou Cartão de Crédito na hora de pagar.
                  </p>
                )}
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

              {/* Grid Valor e Vencimento (em formato brasileiro DD/MM/AAAA) */}
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
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-secondary" />
                      {forma === 'assinatura' ? '1º Vencimento Recorrente' : 'Data de Vencimento'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">DD/MM/AAAA</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type="text"
                      required
                      maxLength={10}
                      placeholder="DD/MM/AAAA"
                      value={dataVencimentoBr}
                      onChange={(e) => setDataVencimentoBr(mascaraDataBrasileira(e.target.value))}
                      className={cn(
                        "h-11 bg-[#091322] border-white/10 text-white font-mono rounded-xl text-sm focus:border-secondary focus:ring-1 focus:ring-secondary",
                        dataVencimentoBr.length === 10 && !validarDataBrasileira(dataVencimentoBr) && "border-rose-500/60 text-rose-300"
                      )}
                    />
                  </div>
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

              {/* Descrição na Fatura e Boleto */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Descrição na Fatura / Boleto
                </Label>
                <Input
                  type="text"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Honorários advocatícios contratuais"
                  className="h-11 bg-[#091322] border-white/10 text-white placeholder:text-slate-500 rounded-xl text-sm focus:border-secondary focus:ring-1 focus:ring-secondary"
                />
                <p className="text-[11px] text-slate-500">
                  * A descrição informada será impressa no boleto bancário e na fatura digital do cliente.
                </p>
              </div>

              {/* ─── Seção Avançada: Juros, Multa, Desconto e Correios ─── */}
              <div className="border border-white/10 rounded-2xl bg-[#091322]/80 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setMostrarAvancado(!mostrarAvancado)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <SlidersHorizontal className="w-4 h-4 text-secondary" />
                    <div>
                      <span className="text-xs font-bold text-white uppercase tracking-wider block">
                        Juros, Multa, Desconto e Impressão
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {mostrarAvancado ? 'Clique para recolher configurações adicionais' : 'Configurar regras de atraso, pontualidade e envio postal'}
                      </span>
                    </div>
                  </div>
                  {mostrarAvancado ? (
                    <ChevronUp className="w-4 h-4 text-secondary" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {mostrarAvancado && (
                  <div className="p-4 pt-2 border-t border-white/10 space-y-4 text-xs animate-in fade-in duration-200">
                    {/* Bloco 1: Juros e Multa */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-2 border-b border-white/5">
                      {/* Juros ao Mês */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-[11px] font-bold text-slate-300">Juros ao mês</Label>
                          <div className="flex items-center bg-[#060D17] rounded-md p-0.5 border border-white/10">
                            <button
                              type="button"
                              onClick={() => setJurosTipo('PERCENTAGE')}
                              className={cn(
                                "px-1.5 py-0.5 text-[10px] rounded font-bold transition-all",
                                jurosTipo === 'PERCENTAGE' ? "bg-secondary text-primary" : "text-slate-400"
                              )}
                            >
                              % Mês
                            </button>
                            <button
                              type="button"
                              onClick={() => setJurosTipo('FIXED')}
                              className={cn(
                                "px-1.5 py-0.5 text-[10px] rounded font-bold transition-all",
                                jurosTipo === 'FIXED' ? "bg-secondary text-primary" : "text-slate-400"
                              )}
                            >
                              R$ Fixo
                            </button>
                          </div>
                        </div>
                        <Input
                          type="text"
                          placeholder="0,00"
                          value={jurosValor}
                          onChange={(e) => setJurosValor(e.target.value)}
                          className="h-9 bg-[#060D17] border-white/10 text-white font-mono rounded-lg text-xs"
                        />
                        <span className="text-[10px] text-slate-500">
                          {jurosTipo === 'PERCENTAGE' ? 'Percentual cobrado proporcionalmente ao mês' : 'Valor fixo cobrado por mês de atraso'}
                        </span>
                      </div>

                      {/* Multa por Atraso */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-[11px] font-bold text-slate-300">Multa por atraso</Label>
                          <div className="flex items-center bg-[#060D17] rounded-md p-0.5 border border-white/10">
                            <button
                              type="button"
                              onClick={() => setMultaTipo('PERCENTAGE')}
                              className={cn(
                                "px-1.5 py-0.5 text-[10px] rounded font-bold transition-all",
                                multaTipo === 'PERCENTAGE' ? "bg-secondary text-primary" : "text-slate-400"
                              )}
                            >
                              % Multa
                            </button>
                            <button
                              type="button"
                              onClick={() => setMultaTipo('FIXED')}
                              className={cn(
                                "px-1.5 py-0.5 text-[10px] rounded font-bold transition-all",
                                multaTipo === 'FIXED' ? "bg-secondary text-primary" : "text-slate-400"
                              )}
                            >
                              R$ Fixo
                            </button>
                          </div>
                        </div>
                        <Input
                          type="text"
                          placeholder="0,00"
                          value={multaValor}
                          onChange={(e) => setMultaValor(e.target.value)}
                          className="h-9 bg-[#060D17] border-white/10 text-white font-mono rounded-lg text-xs"
                        />
                        <span className="text-[10px] text-slate-500">
                          {multaTipo === 'PERCENTAGE' ? 'Percentual único aplicado após o vencimento' : 'Valor fixo único por atraso'}
                        </span>
                      </div>
                    </div>

                    {/* Bloco 2: Desconto */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-2 border-b border-white/5">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-[11px] font-bold text-slate-300">Desconto</Label>
                          <div className="flex items-center bg-[#060D17] rounded-md p-0.5 border border-white/10">
                            <button
                              type="button"
                              onClick={() => setDescontoTipo('PERCENTAGE')}
                              className={cn(
                                "px-1.5 py-0.5 text-[10px] rounded font-bold transition-all",
                                descontoTipo === 'PERCENTAGE' ? "bg-secondary text-primary" : "text-slate-400"
                              )}
                            >
                              % Desconto
                            </button>
                            <button
                              type="button"
                              onClick={() => setDescontoTipo('FIXED')}
                              className={cn(
                                "px-1.5 py-0.5 text-[10px] rounded font-bold transition-all",
                                descontoTipo === 'FIXED' ? "bg-secondary text-primary" : "text-slate-400"
                              )}
                            >
                              R$ Fixo
                            </button>
                          </div>
                        </div>
                        <Input
                          type="text"
                          placeholder="0,00"
                          value={descontoValor}
                          onChange={(e) => setDescontoValor(e.target.value)}
                          className="h-9 bg-[#060D17] border-white/10 text-white font-mono rounded-lg text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-bold text-slate-300 block">
                          Prazo máximo do desconto
                        </Label>
                        <select
                          value={descontoPrazo}
                          onChange={(e) => setDescontoPrazo(Number(e.target.value))}
                          className="w-full h-9 bg-[#060D17] border border-white/10 text-white rounded-lg px-2.5 text-xs focus:border-secondary"
                        >
                          <option value={0}>Até o dia do vencimento</option>
                          <option value={1}>Até 1 dia antes do vencimento</option>
                          <option value={2}>Até 2 dias antes do vencimento</option>
                          <option value={5}>Até 5 dias antes do vencimento</option>
                          <option value={10}>Até 10 dias antes do vencimento</option>
                          <option value={15}>Até 15 dias antes do vencimento</option>
                          <option value={30}>Até 30 dias antes do vencimento</option>
                        </select>
                        <span className="text-[10px] text-slate-500">
                          Regra de pontualidade antes do vencimento
                        </span>
                      </div>
                    </div>

                    {/* Bloco 3: Opções de Impressão e Envio Postal */}
                    <div className="space-y-2 pt-1">
                      <Label className="text-[11px] font-bold text-slate-300 block uppercase tracking-wider">
                        Opções de Impressão e Envio
                      </Label>

                      <label className="flex items-center gap-2.5 p-2 rounded-lg bg-[#060D17] border border-white/5 cursor-pointer hover:border-white/15 transition-all">
                        <input
                          type="checkbox"
                          checked={queroImprimir}
                          onChange={(e) => setQueroImprimir(e.target.checked)}
                          className="w-4 h-4 rounded text-secondary bg-slate-900 border-white/20 focus:ring-secondary"
                        />
                        <div className="flex items-center gap-2">
                          <Printer className="w-3.5 h-3.5 text-secondary" />
                          <span className="text-xs text-white font-medium">Quero imprimir esta cobrança</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-2.5 p-2 rounded-lg bg-[#060D17] border border-white/5 cursor-pointer hover:border-white/15 transition-all">
                        <input
                          type="checkbox"
                          checked={queroEnviarCorreios}
                          onChange={(e) => setQueroEnviarCorreios(e.target.checked)}
                          className="w-4 h-4 rounded text-secondary bg-slate-900 border-white/20 focus:ring-secondary"
                        />
                        <div className="flex items-center gap-2">
                          <Truck className="w-3.5 h-3.5 text-secondary" />
                          <span className="text-xs text-white font-medium">Quero enviar esta cobrança via Correios</span>
                        </div>
                      </label>
                    </div>
                  </div>
                )}
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
