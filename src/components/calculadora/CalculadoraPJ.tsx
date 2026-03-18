import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calcularAnalisePJ, type DadosCalculoPJ, type ResultadoPJ } from "@/lib/calculadora/pj";
import { ArrowLeft, ArrowRight, FileText, Info, RotateCcw } from "lucide-react";

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
    const [resultado, setResultado] = useState<ResultadoPJ | null>(null);

    const handleCalculate = () => {
        const res = calcularAnalisePJ(dados);
        setResultado(res);
        setStep(3); // Result Step
    };

    const handleReset = () => {
        setResultado(null);
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

    return (
        <div className="mx-auto w-full max-w-4xl rounded-xl border border-border bg-card shadow-sm">
            {/* Progress Bar */}
            <div className="flex border-b border-border bg-muted/40">
                {[1, 2, 3].map((s) => (
                    <div
                        key={s}
                        className={`flex-1 px-4 py-3 text-center text-sm font-medium transition-colors ${step >= s ? "border-b-2 border-primary text-primary" : "text-muted-foreground"
                            }`}
                    >
                        {s === 1 && "1. Período e Ganhos"}
                        {s === 2 && "2. Despesas e Risco"}
                        {s === 3 && "3. Relatório"}
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
                                <Label htmlFor="notaMedia">Valor Médio Menos da Nota Fiscal (R$)</Label>
                                <Input
                                    id="notaMedia"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={dados.notaMedia || ""}
                                    onChange={(e) => setDados({ ...dados, notaMedia: parseFloat(e.target.value) || 0 })}
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
                                <Label htmlFor="contador">Custo Mensal com Contador (R$)</Label>
                                <Input
                                    id="contador"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={dados.contador || ""}
                                    onChange={(e) => setDados({ ...dados, contador: parseFloat(e.target.value) || 0 })}
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
                                <Label htmlFor="outrasDespesas">Outras Despesas Mensais (Ex: Vale, Transporte)</Label>
                                <Input
                                    id="outrasDespesas"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={dados.outrasDespesas || ""}
                                    onChange={(e) => setDados({ ...dados, outrasDespesas: parseFloat(e.target.value) || 0 })}
                                />
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
                            <Button onClick={handleCalculate} className="bg-cta-gold text-foreground hover:bg-cta-gold/90">
                                <FileText className="mr-2 h-4 w-4" /> Calcular Vínculo
                            </Button>
                        </div>
                    </div>
                )}

                {/* STEP 3: Relatório */}
                {step === 3 && resultado && (
                    <div className="space-y-8 animate-in zoom-in-95">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-serif font-semibold tracking-tight">Avaliação de Vínculo</h2>
                                <p className="text-sm text-muted-foreground">Relatório baseado no período de {resultado.meses} meses informados.</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => window.print()}>
                                Imprimir
                            </Button>
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

                        <div className="flex justify-end pt-4 border-t">
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
