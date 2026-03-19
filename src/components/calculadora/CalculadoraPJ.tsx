import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calcularAnalisePJ, type DadosCalculoPJ, type ResultadoPJ } from "@/lib/calculadora/pj";
import { CurrencyInput } from "@/components/calculadora/CurrencyInput";
import { PhoneInput } from "@/components/calculadora/PhoneInput";
import { ArrowLeft, ArrowRight, FileText, Info, Loader2, Printer, RotateCcw, User } from "lucide-react";
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
        percRisco: 0,
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

        // Formatar mensagem estruturada para o advogado
        const resumoMensagem = [
            "👤 *Dados do Cliente*",
            `Nome: ${contato.nome}`,
            `WhatsApp: ${contato.whatsapp}\n`,
            "📋 *Dados da Simulação PJ*",
            `Período: ${dados.dataInicio} a ${dados.dataFim}`,
            `Faturamento Mensal: ${fmt(dados.notaMedia)}`,
            `Imposto: ${dados.imposto}%`,
            `Outras Despesas: ${fmt(dados.outrasDespesas)}`,
            `Risco Informado: ${dados.percRisco}%\n`,
            "📄 *Análise Comparativa (PJ vs CLT)*",
            "🏢 *Visão como PJ*",
            `Faturamento Total: ${fmt(res.faturamentoTotal)}`,
            `Despesas Totais: ${fmt(res.despesasTotais)}`,
            `Líquido PJ: ${fmt(res.liquidoPJ)}\n`,
            "⚖️ *Direitos CLT Perdidos*",
            `13º Salário: ${fmt(res.perda13)}`,
            `Férias + 1/3: ${fmt(res.perdaFerias)}`,
            `FGTS: ${fmt(res.perdaFGTS)}`,
            `Multa FGTS (40%): ${fmt(res.perdaMultaFGTS)}`,
            `Aviso Prévio: ${fmt(res.perdaAvisoPrevio)}`,
            `*Total Direitos CLT: ${fmt(res.totalDireitosCLT)}*\n`,
            `🚩 *Valor em Risco Estimado: ${fmt(res.valorRisco)}*`
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
                        percRisco: dados.percRisco,
                    },
                    resultado: {
                        faturamentoTotal: res.faturamentoTotal,
                        despesasTotais: res.despesasTotais,
                        liquidoPJ: res.liquidoPJ,
                        totalDireitosCLT: res.totalDireitosCLT,
                        valorRisco: res.valorRisco,
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
            percRisco: 0,
        });
    };

    const fmt = (v: number) => `R$ ${v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

    const stepLabels = ["1. Período e Ganhos", "2. Despesas e Risco", "3. Contato", "4. Relatório"];

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
                                <Label htmlFor="dataInicio">Mês/Ano Início</Label>
                                <Input
                                    id="dataInicio"
                                    type="month"
                                    value={dados.dataInicio}
                                    onChange={(e) => setDados({ ...dados, dataInicio: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="dataFim">Mês/Ano Fim</Label>
                                <Input
                                    id="dataFim"
                                    type="month"
                                    value={dados.dataFim}
                                    onChange={(e) => setDados({ ...dados, dataFim: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="notaMedia">Valor Médio da Nota Fiscal</Label>
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
                            <h2 className="text-2xl font-semibold tracking-tight">Despesas e Risco</h2>
                            <p className="text-sm text-muted-foreground">Informe os custos mensais e a estimativa de risco.</p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="contador">Custo Mensal com Contador</Label>
                                <CurrencyInput
                                    id="contador"
                                    value={dados.contador}
                                    onChange={(v) => setDados({ ...dados, contador: v })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="imposto">Imposto Mensal (Média %)</Label>
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
                                <Label htmlFor="outrasDespesas">Outras Despesas Mensais</Label>
                                <CurrencyInput
                                    id="outrasDespesas"
                                    value={dados.outrasDespesas}
                                    onChange={(v) => setDados({ ...dados, outrasDespesas: v })}
                                />
                                <p className="text-xs text-muted-foreground">Vale, transporte, etc.</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="percRisco">Espectro de Risco (%)</Label>
                                <Input
                                    id="percRisco"
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="1"
                                    value={dados.percRisco || ""}
                                    onChange={(e) => setDados({ ...dados, percRisco: parseFloat(e.target.value) || 0 })}
                                />
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
                                <Label htmlFor="nomeContatoPJ">Nome Completo</Label>
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
                                <Label htmlFor="whatsappContatoPJ">WhatsApp</Label>
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
                                <div><strong>Risco (%):</strong> {dados.percRisco}%</div>
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

                        <div className="rounded-lg border bg-card p-4">
                            <h3 className="font-medium mb-2">Análise de Risco</h3>
                            <p className="text-sm text-muted-foreground mb-4">Se este contrato for reconhecido como vínculo empregatício na justiça do trabalho, abaixo está uma estimativa do valor da causa, considerando o seu fator de risco informado ({dados.percRisco}%).</p>

                            <div className="flex justify-between items-center rounded bg-red-50 p-3 dark:bg-red-950/30 text-red-900 dark:text-red-200">
                                <span className="font-semibold">Valor em Risco Estimado:</span>
                                <span className="font-bold text-xl">{fmt(resultado.valorRisco)}</span>
                            </div>
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
