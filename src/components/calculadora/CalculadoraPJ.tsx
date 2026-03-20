import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LabelTooltip } from "@/components/calculadora/LabelTooltip";
import { calcularAnalisePJ, type DadosCalculoPJ, type ResultadoPJ } from "@/lib/calculadora/pj";
import { CurrencyInput } from "@/components/calculadora/CurrencyInput";
import { PhoneInput } from "@/components/calculadora/PhoneInput";
import { DateInput } from "@/components/calculadora/DateInput";
import { ArrowLeft, ArrowRight, FileText, Info, Loader2, MessageCircle, Printer, RotateCcw, User } from "lucide-react";
import { site } from "@/config/site";
import { toast } from "sonner";

const WEBHOOK_URL = "https://webhook.automab.dev/webhook/calculadora/notificacao";

export function CalculadoraPJ() {
    const [step, setStep] = useState(1);
    const [dados, setDados] = useState<DadosCalculoPJ>({
        dataInicio: "",
        dataFim: "",
        notaMedia: 0,
        contador: 0,
        imposto: 0,
        outrasDespesas: 0,
    });
    const [contato, setContato] = useState({ nome: "", whatsapp: "" });
    const [enviando, setEnviando] = useState(false);
    const [resultado, setResultado] = useState<ResultadoPJ | null>(null);



    const handleSubmitContato = async () => {
        if (!contato.nome.trim()) {
            toast.error("Por favor, informe seu nome completo.");
            return;
        }
        if (contato.whatsapp.length < 10) {
            toast.error("Informe um número de WhatsApp válido.");
            return;
        }

        const res = calcularAnalisePJ(dados);

        const fmtDate = (d: string) => d.split("-").reverse().join("/");

        // Formatar mensagem estruturada para o advogado
        const resumoMensagem = [
            "👤 *Dados do Cliente*",
            `Nome: ${contato.nome}`,
            `WhatsApp: ${contato.whatsapp}\n`,
            "📋 *Dados da Simulação PJ*",
            `Período: ${fmtDate(dados.dataInicio)} a ${fmtDate(dados.dataFim)}`,
            `Faturamento Mensal: ${fmt(dados.notaMedia)}`,
            `Imposto: ${dados.imposto}%`,
            `Outras Despesas: ${fmt(dados.outrasDespesas)}\n`,
            "📄 *Análise Comparativa (PJ vs CLT)*",
            "🏢 *Visão como PJ*",
            `Faturamento Total: ${fmt(res.faturamentoTotal)}`,
            `Despesas Totais: - ${fmt(res.despesasTotais)}`,
            `Líquido PJ: ${fmt(res.liquidoPJ)}\n`,
            "⚖️ *Direitos CLT Perdidos*",
            `13º Salário: ${fmt(res.perda13)}`,
            `Férias + 1/3: ${fmt(res.perdaFerias)}`,
            `FGTS: ${fmt(res.perdaFGTS)}`,
            `Multa FGTS (40%): ${fmt(res.perdaMultaFGTS)}`,
            `Aviso Prévio: ${fmt(res.perdaAvisoPrevio)}`,
            `*Total Direitos CLT: ${fmt(res.totalDireitosCLT)}*`
        ].join("\n");

        setEnviando(true);
        try {
            await fetch(WEBHOOK_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nome: contato.nome,
                    whatsapp: contato.whatsapp,
                    tipo: "PJ",
                    resumo: resumoMensagem,
                    dados: {
                        dataInicio: dados.dataInicio,
                        dataFim: dados.dataFim,
                        notaMedia: dados.notaMedia,
                        contador: dados.contador,
                        imposto: dados.imposto,
                        outrasDespesas: dados.outrasDespesas,
                    },
                    resultado: {
                        faturamentoTotal: res.faturamentoTotal,
                        despesasTotais: res.despesasTotais,
                        liquidoPJ: res.liquidoPJ,
                        totalDireitosCLT: res.totalDireitosCLT,
                        perdas: {
                            decimo: res.perda13,
                            ferias: res.perdaFerias,
                            fgts: res.perdaFGTS,
                            multaFGTS: res.perdaMultaFGTS,
                            aviso: res.perdaAvisoPrevio
                        }
                    }
                }),
            });
        } catch {
            console.warn("[Webhook] Falha ao enviar dados de contato.");
        }

        setEnviando(false);
        setResultado(res);
        setStep(4);
    };

    const handleReset = () => {
        setResultado(null);
        setContato({ nome: "", whatsapp: "" });
        setStep(1);
        setDados({
            dataInicio: "",
            dataFim: "",
            notaMedia: 0,
            contador: 0,
            imposto: 0,
            outrasDespesas: 0,
        });
    };

    const fmt = (v: number) => `R$ ${v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

    const stepLabels = ["1. Período e Ganhos", "2. Despesas", "3. Contato", "4. Relatório"];

    return (
        <div className="mx-auto w-full max-w-4xl rounded-xl border border-border bg-card shadow-sm">
            {/* Progress Bar */}
            <div className="flex border-b border-border bg-muted/40 print:hidden">
                {stepLabels.map((label, idx) => (
                    <div
                        key={idx}
                        className={`flex-1 px-2 py-3 text-center text-xs sm:text-sm font-medium transition-colors ${step >= idx + 1 ? "border-b-2 border-primary text-primary" : "text-muted-foreground"
                            }`}
                    >
                        {label}
                    </div>
                ))}
            </div>

            <div className="p-6 md:p-8">
                {/* STEP 1: Período e Ganhos */}
                {step === 1 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-semibold tracking-tight">Período e Ganhos</h2>
                            <p className="text-sm text-muted-foreground">Informe os dados básicos do seu contrato PJ.</p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <LabelTooltip htmlFor="dataInicio" tooltip="A data em que você assinou o contrato PJ ou começou a trabalhar no local diariamente.">Data de Início</LabelTooltip>
                                <DateInput
                                    id="dataInicio"
                                    value={dados.dataInicio}
                                    onChange={(v) => setDados({ ...dados, dataInicio: v })}
                                />
                            </div>
                            <div className="space-y-2">
                                <LabelTooltip htmlFor="dataFim" tooltip="O último dia de trabalho, ou encerramento da sua prestação de serviços.">Data de Término</LabelTooltip>
                                <DateInput
                                    id="dataFim"
                                    value={dados.dataFim}
                                    onChange={(v) => setDados({ ...dados, dataFim: v })}
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <LabelTooltip htmlFor="notaMedia" tooltip="O valor mais comum ou a média dos valores das notas fiscais emitidas todo mês.">Valor Médio da Nota Fiscal</LabelTooltip>
                                <CurrencyInput
                                    id="notaMedia"
                                    value={dados.notaMedia}
                                    onChange={(v) => setDados({ ...dados, notaMedia: v })}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button onClick={() => setStep(2)}>
                                Próximo <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* STEP 2: Despesas e Risco */}
                {step === 2 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-semibold tracking-tight">Despesas Mensais</h2>
                            <p className="text-sm text-muted-foreground">Informe os custos mensais do seu contrato PJ.</p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <LabelTooltip htmlFor="contador" tooltip="O valor mensal da contabilidade necessária para manter a sua empresa (CNPJ) regularizada.">Custo Mensal com Contador</LabelTooltip>
                                <CurrencyInput
                                    id="contador"
                                    value={dados.contador}
                                    onChange={(v) => setDados({ ...dados, contador: v })}
                                />
                            </div>
                            <div className="space-y-2">
                                <LabelTooltip htmlFor="imposto" tooltip="A alíquota mensal de impostos retida na sua nota (exemplo: 6% no Simples Nacional).">Imposto Mensal (Média %)</LabelTooltip>
                                <Input
                                    id="imposto"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={dados.imposto || ""}
                                    onChange={(e) => setDados({ ...dados, imposto: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <LabelTooltip htmlFor="outrasDespesas" tooltip="Gastos diretamente relacionados ao trabalho que não são reembolsados: passagem, gasolina, alimentação, aluguel de equipamentos ou softwares.">Outras Despesas Mensais</LabelTooltip>
                                <CurrencyInput
                                    id="outrasDespesas"
                                    value={dados.outrasDespesas}
                                    onChange={(v) => setDados({ ...dados, outrasDespesas: v })}
                                />
                                <p className="text-xs text-muted-foreground">Vale, transporte, etc.</p>
                            </div>
                        </div>

                        <div className="flex justify-between pt-4">
                            <Button variant="outline" onClick={() => setStep(1)}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                            </Button>
                            <Button onClick={() => setStep(3)}>
                                Próximo <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* STEP 3: Contato (Lead Capture) */}
                {step === 3 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-semibold tracking-tight">Seus Dados de Contato</h2>
                            <p className="text-sm text-muted-foreground">
                                Informe seus dados para receber o resultado da simulação.
                            </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <LabelTooltip htmlFor="nomeContatoPJ" tooltip="Insira seu nome completo para que a nossa equipe possa te orientar.">Nome Completo</LabelTooltip>
                                <div className="relative">
                                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                        <User className="h-4 w-4" />
                                    </span>
                                    <Input
                                        id="nomeContatoPJ"
                                        type="text"
                                        className="pl-10"
                                        placeholder="Seu nome completo"
                                        value={contato.nome}
                                        onChange={(e) => setContato({ ...contato, nome: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <LabelTooltip htmlFor="whatsappContatoPJ" tooltip="Usado apenas para que o nosso sistema e nossos especialistas enviem a simulação para você.">WhatsApp</LabelTooltip>
                                <PhoneInput
                                    id="whatsappContatoPJ"
                                    value={contato.whatsapp}
                                    onChange={(v) => setContato({ ...contato, whatsapp: v })}
                                />
                            </div>
                        </div>

                        <div className="rounded-lg border bg-blue-50/50 p-4 dark:bg-blue-950/20">
                            <p className="text-xs text-muted-foreground">
                                Seus dados serão utilizados exclusivamente para envio do resultado da simulação via WhatsApp.
                            </p>
                        </div>

                        <div className="flex justify-between pt-4 border-t">
                            <Button variant="outline" onClick={() => setStep(2)}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                            </Button>
                            <Button
                                onClick={handleSubmitContato}
                                disabled={enviando}
                                className="bg-cta-gold text-foreground hover:bg-cta-gold/90"
                            >
                                {enviando ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...</>
                                ) : (
                                    <><FileText className="mr-2 h-4 w-4" /> Calcular Vínculo</>
                                )}
                            </Button>
                        </div>
                    </div>
                )}

                {/* STEP 4: Relatório */}
                {step === 4 && resultado && (
                    <div className="space-y-8 animate-in zoom-in-95">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-serif font-semibold tracking-tight">Avaliação de Vínculo</h2>
                                <p className="text-sm text-muted-foreground">Relatório baseado no período de {resultado.meses} meses informados.</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
                                <Printer className="mr-2 h-4 w-4" /> Imprimir
                            </Button>
                        </div>

                        {/* Print-Only: Ficha de Dados Informados */}
                        <div className="hidden print:block border rounded-lg p-4 mb-4">
                            <h3 className="font-semibold text-lg mb-3 border-b pb-2">Dados Informados</h3>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                                <div><strong>Nome:</strong> {contato.nome}</div>
                                <div><strong>WhatsApp:</strong> {contato.whatsapp}</div>
                                <div><strong>Período:</strong> {dados.dataInicio} a {dados.dataFim}</div>
                                <div><strong>Nota Fiscal (média):</strong> {fmt(dados.notaMedia)}</div>
                                <div><strong>Contador:</strong> {fmt(dados.contador)}</div>
                                <div><strong>Imposto (%):</strong> {dados.imposto}%</div>
                                <div><strong>Outras Despesas:</strong> {fmt(dados.outrasDespesas)}</div>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-lg border bg-blue-50/50 p-4 dark:bg-blue-950/20">
                                <div className="flex items-center gap-2 text-sm font-medium text-blue-800 dark:text-blue-300">
                                    <Info className="h-4 w-4" /> Visão como PJ
                                </div>
                                <div className="mt-3 space-y-2 text-sm">
                                    <div className="flex justify-between"><span>Faturamento Total:</span> <span className="font-semibold">{fmt(resultado.faturamentoTotal)}</span></div>
                                    <div className="flex justify-between text-red-600 dark:text-red-400"><span>Despesas Totais:</span> <span>-{fmt(resultado.despesasTotais)}</span></div>
                                    <div className="mt-2 border-t pt-2 flex justify-between font-bold text-lg">
                                        <span>Líquido:</span> <span>{fmt(resultado.liquidoPJ)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-lg border bg-amber-50/50 p-4 dark:bg-amber-950/20">
                                <div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
                                    <Info className="h-4 w-4" /> Direitos CLT Perdidos (Aprox.)
                                </div>
                                <div className="mt-3 space-y-2 text-sm">
                                    <div className="flex justify-between"><span>13º Salário:</span> <span>{fmt(resultado.perda13)}</span></div>
                                    <div className="flex justify-between"><span>Férias + 1/3:</span> <span>{fmt(resultado.perdaFerias)}</span></div>
                                    <div className="flex justify-between"><span>FGTS:</span> <span>{fmt(resultado.perdaFGTS)}</span></div>
                                    <div className="flex justify-between"><span>Multa FGTS (40%):</span> <span>{fmt(resultado.perdaMultaFGTS)}</span></div>
                                    <div className="flex justify-between"><span>Aviso Prévio:</span> <span>{fmt(resultado.perdaAvisoPrevio)}</span></div>
                                    <div className="mt-2 border-t pt-2 flex justify-between font-bold text-lg text-amber-900 dark:text-amber-100">
                                        <span>Total CLT:</span> <span>{fmt(resultado.totalDireitosCLT)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-lg border border-primary/20 bg-primary/5 p-6 text-center shadow-sm print:hidden">
                            <h3 className="text-lg font-semibold text-primary mb-2">Próximo Passo: Consulta Gratuita</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Estes valores são uma estimativa inicial. Para garantir seus direitos e entender as nuances do seu caso,
                                é fundamental falar com um advogado. <strong>O contato é totalmente gratuito.</strong>
                                Como você já preencheu a simulação, nosso advogado já recebeu seus dados e está pronto para te orientar.
                            </p>
                            <Button asChild size="lg" className="bg-green-600 hover:bg-green-700 text-white font-bold w-full sm:w-auto">
                                <a
                                    href={`https://wa.me/${site.contact.whatsappNumber}?text=${encodeURIComponent("Olá! Acabei de fazer uma simulação na análise de PJ vs CLT e gostaria de tirar algumas dúvidas sobre o meu caso.")}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <MessageCircle className="mr-2 h-5 w-5" /> Enviar Mensagem agora
                                </a>
                            </Button>
                        </div>

                        <div className="flex justify-end pt-4 border-t print:hidden">
                            <Button variant="outline" onClick={handleReset}>
                                <RotateCcw className="mr-2 h-4 w-4" /> Nova Simulação
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
